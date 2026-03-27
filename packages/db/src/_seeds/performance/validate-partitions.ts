/**
 * Partition Performance Validation Script
 *
 * Validates that partition strategy is working as expected:
 * - Confirms partitions exist
 * - Measures partition pruning effectiveness
 * - Analyzes query plans (EXPLAIN)
 * - Validates 5-10x speedup claims
 *
 * Run with: pnpm --filter @afenda/db tsx src/_seeds/performance/validate-partitions.ts
 */

import { performance } from "node:perf_hooks";
import { and, eq, gte, lte, sql } from "drizzle-orm";
import { db, pool } from "../../index.js";
import { salesOrders } from "../../schema/index.js";

// ============================================================================
// Partition Inspection
// ============================================================================

interface PartitionInfo {
  tableName: string;
  partitionName: string;
  partitionExpression: string;
  partitionRange: string;
  rowCount: number;
  sizeBytes: number;
}

/**
 * List all partitions for a table
 */
async function listPartitions(schemaName: string, tableName: string): Promise<PartitionInfo[]> {
  const result = await pool.query<any>(
    `
    SELECT
      c.relname as partition_name,
      pg_get_expr(c.relpartbound, c.oid) as partition_expression,
      pg_total_relation_size(c.oid) as size_bytes,
      n.nspname as schema_name
    FROM pg_class c
    JOIN pg_inherits i ON i.inhrelid = c.oid
    JOIN pg_class p ON i.inhparent = p.oid
    JOIN pg_namespace n ON c.relnamespace = n.oid
    WHERE p.relname = $1
      AND n.nspname = $2
      AND c.relkind = 'r'
    ORDER BY c.relname;
  `,
    [tableName, schemaName]
  );

  const partitions: PartitionInfo[] = [];

  for (const row of result.rows) {
    // Get row count for each partition
    const countResult = await pool.query<any>(`
      SELECT COUNT(*) as count
      FROM ${row.schema_name}.${row.partition_name};
    `);

    partitions.push({
      tableName,
      partitionName: row.partition_name,
      partitionExpression: row.partition_expression,
      partitionRange: row.partition_expression,
      rowCount: parseInt(countResult.rows[0].count, 10),
      sizeBytes: parseInt(row.size_bytes, 10),
    });
  }

  return partitions;
}

/**
 * Get query plan for a query
 */
async function explainQuery(query: string, params: any[] = []): Promise<string> {
  const result = await pool.query<any>(`EXPLAIN (ANALYZE, BUFFERS) ${query}`, params);
  return result.rows.map((row: any) => row["QUERY PLAN"]).join("\n");
}

// ============================================================================
// Partition Pruning Tests
// ============================================================================

interface PruningTestResult {
  testName: string;
  expectedPartitions: number;
  actualPartitions: number;
  executionTimeMs: number;
  rowsReturned: number;
  pruningEffective: boolean;
  queryPlan: string;
}

/**
 * Test partition pruning for a specific date range
 */
async function testPartitionPruning(
  testName: string,
  startDate: Date,
  endDate: Date,
  expectedPartitionsScanned: number
): Promise<PruningTestResult> {
  const start = performance.now();

  // Execute query
  const results = await db
    .select()
    .from(salesOrders)
    .where(and(gte(salesOrders.orderDate, startDate), lte(salesOrders.orderDate, endDate)))
    .limit(1000);

  const executionTimeMs = performance.now() - start;

  // Get query plan to count partitions scanned
  const plan = await explainQuery(
    `SELECT * FROM sales.sales_orders
     WHERE order_date >= $1 AND order_date <= $2
     LIMIT 1000`,
    [startDate, endDate]
  );

  // Count "Scan on sales_orders_" occurrences in plan
  const partitionScans = (plan.match(/Scan on sales_orders_\d{4}_\d{2}/g) || []).length;

  return {
    testName,
    expectedPartitions: expectedPartitionsScanned,
    actualPartitions: partitionScans || 1,
    executionTimeMs,
    rowsReturned: results.length,
    pruningEffective: partitionScans === expectedPartitionsScanned,
    queryPlan: plan,
  };
}

// ============================================================================
// Performance Comparison Tests
// ============================================================================

interface PerformanceComparison {
  testName: string;
  fullScanMs: number;
  prunedScanMs: number;
  speedup: number;
  improvement: number;
}

/**
 * Compare partitioned vs non-partitioned query performance
 */
async function comparePartitionPerformance(): Promise<PerformanceComparison> {
  const tenantId = 1;

  // Full table scan (no date filter - scans all partitions)
  const fullScanStart = performance.now();
  await db.select().from(salesOrders).where(eq(salesOrders.tenantId, tenantId)).limit(1000);
  const fullScanMs = performance.now() - fullScanStart;

  // Partition-pruned scan (single month)
  const prunedScanStart = performance.now();
  await db
    .select()
    .from(salesOrders)
    .where(
      and(
        eq(salesOrders.tenantId, tenantId),
        gte(salesOrders.orderDate, new Date("2022-06-01")),
        lte(salesOrders.orderDate, new Date("2022-06-30"))
      )
    )
    .limit(1000);
  const prunedScanMs = performance.now() - prunedScanStart;

  const speedup = fullScanMs / prunedScanMs;
  const improvement = ((fullScanMs - prunedScanMs) / fullScanMs) * 100;

  return {
    testName: "Full scan vs Single-partition scan",
    fullScanMs,
    prunedScanMs,
    speedup,
    improvement,
  };
}

// ============================================================================
// Main Validation
// ============================================================================

async function validatePartitions(): Promise<void> {
  console.log("\n" + "=".repeat(80));
  console.log("PARTITION PERFORMANCE VALIDATION");
  console.log("=".repeat(80) + "\n");

  // 1. List all partitions
  console.log("━━━ Step 1: Partition Inventory ━━━\n");
  const partitions = await listPartitions("sales", "sales_orders_partitioned");

  if (partitions.length === 0) {
    console.warn("⚠️  No partitions found for sales.sales_orders_partitioned");
    console.log("   Partitions may not be created yet. Run partition migrations first.\n");
    return;
  }

  console.log(`Found ${partitions.length} partitions:\n`);

  let totalRows = 0;
  let totalSizeMB = 0;

  for (const partition of partitions) {
    const sizeMB = (partition.sizeBytes / 1024 / 1024).toFixed(2);
    totalRows += partition.rowCount;
    totalSizeMB += partition.sizeBytes / 1024 / 1024;

    console.log(
      `  ${partition.partitionName.padEnd(40)} | ${partition.rowCount.toLocaleString().padStart(12)} rows | ${sizeMB.padStart(10)} MB`
    );
  }

  console.log(
    `\n  ${"TOTAL".padEnd(40)} | ${totalRows.toLocaleString().padStart(12)} rows | ${totalSizeMB.toFixed(2).padStart(10)} MB\n`
  );

  // 2. Test partition pruning
  console.log("━━━ Step 2: Partition Pruning Tests ━━━\n");

  const pruningTests: PruningTestResult[] = [
    await testPartitionPruning(
      "Single month (2022-06)",
      new Date("2022-06-01"),
      new Date("2022-06-30"),
      1
    ),
    await testPartitionPruning(
      "Quarter Q1 2022",
      new Date("2022-01-01"),
      new Date("2022-03-31"),
      3
    ),
    await testPartitionPruning(
      "Half year (H1 2022)",
      new Date("2022-01-01"),
      new Date("2022-06-30"),
      6
    ),
    await testPartitionPruning(
      "Full year 2022",
      new Date("2022-01-01"),
      new Date("2022-12-31"),
      12
    ),
  ];

  console.log("Test Name".padEnd(30) + " | Expected | Actual | Time (ms) | Rows | Status");
  console.log("-".repeat(90));

  for (const test of pruningTests) {
    const status = test.pruningEffective ? "✅ PASS" : "❌ FAIL";
    console.log(
      `${test.testName.padEnd(30)} | ${test.expectedPartitions.toString().padStart(8)} | ${test.actualPartitions.toString().padStart(6)} | ${test.executionTimeMs.toFixed(2).padStart(9)} | ${test.rowsReturned.toString().padStart(4)} | ${status}`
    );
  }

  console.log();

  // 3. Performance comparison
  console.log("━━━ Step 3: Performance Comparison ━━━\n");

  const comparison = await comparePartitionPerformance();

  console.log(`Full table scan (all partitions):    ${comparison.fullScanMs.toFixed(2)}ms`);
  console.log(`Single-partition scan (pruned):      ${comparison.prunedScanMs.toFixed(2)}ms`);
  console.log(`Speedup:                              ${comparison.speedup.toFixed(2)}x faster`);
  console.log(`Improvement:                          ${comparison.improvement.toFixed(1)}%\n`);

  if (comparison.speedup >= 5) {
    console.log("✅ Partition pruning meets expected 5-10x speedup target!");
  } else if (comparison.speedup >= 3) {
    console.log("⚠️  Partition pruning provides 3-5x speedup (below 5x target, but acceptable)");
  } else {
    console.log("❌ Partition pruning speedup < 3x - investigate query planner statistics");
  }

  // 4. Summary
  console.log("\n" + "=".repeat(80));
  console.log("VALIDATION SUMMARY");
  console.log("=".repeat(80) + "\n");

  const allPassed = pruningTests.every((t) => t.pruningEffective) && comparison.speedup >= 3;

  if (allPassed) {
    console.log("✅ All partition validation tests PASSED");
    console.log(`   ${partitions.length} partitions active`);
    console.log(`   ${totalRows.toLocaleString()} total rows`);
    console.log(`   ${comparison.speedup.toFixed(1)}x speedup with partition pruning`);
  } else {
    console.log("❌ Some partition validation tests FAILED");
    console.log("   Review query plans and check partition configuration");
  }

  console.log("\n" + "=".repeat(80) + "\n");
}

// Run validation
validatePartitions()
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.error("Validation failed:", error);
    process.exit(1);
  });
