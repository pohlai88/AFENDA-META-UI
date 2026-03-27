#!/usr/bin/env tsx
/**
 * Automated Archival Runner
 *
 * CLI tool for managing database partition lifecycle:
 * - Hot → Warm: Promote old partitions to archive schema
 * - Warm → Cold: Export archived partitions to Cloudflare R2
 * - Cold → Warm: Restore partitions from R2 for queries
 *
 * Usage:
 *   pnpm --filter @afenda/db archival promote --dry-run
 *   pnpm --filter @afenda/db archival archive --dry-run
 *   pnpm --filter @afenda/db archival restore --key=sales_orders/2020/sales_orders_2020_01.parquet
 *   pnpm --filter @afenda/db archival health
 *
 * @module archival/runner
 * @version 1.0.0
 */

import { parseArgs } from 'node:util';
import { db } from '../client';
import { sql } from 'drizzle-orm';
import {
  R2Client,
  batchArchiveToR2,
  restorePartitionFromR2,
  type ArchivalResult,
  type RestorationResult,
} from './r2-integration';

// =====================================================================
// ENVIRONMENT VALIDATION
// =====================================================================

function validateEnvironment(): void {
  const required = ['DATABASE_URL', 'R2_ACCOUNT_ID', 'R2_ACCESS_KEY_ID', 'R2_SECRET_ACCESS_KEY', 'R2_BUCKET_NAME'];
  const missing = required.filter(key => !process.env[key]);

  if (missing.length > 0) {
    console.error('❌ Missing required environment variables:');
    missing.forEach(key => console.error(`   - ${key}`));
    console.error('\nSet these in .env or .env.local:');
    console.error('   DATABASE_URL=postgresql://user:pass@host:5432/db');
    console.error('   R2_ACCOUNT_ID=your_cloudflare_account_id');
    console.error('   R2_ACCESS_KEY_ID=your_r2_access_key_id');
    console.error('   R2_SECRET_ACCESS_KEY=your_r2_secret_access_key');
    console.error('   R2_BUCKET_NAME=afenda-archive');
    process.exit(1);
  }
}

function getR2Client(): R2Client {
  return new R2Client({
    accountId: process.env.R2_ACCOUNT_ID!,
    accessKeyId: process.env.R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
    bucketName: process.env.R2_BUCKET_NAME!,
    jurisdiction: process.env.R2_JURISDICTION as 'eu' | 'fedramp' | undefined,
  });
}

// =====================================================================
// COMMAND: PROMOTE (Hot → Warm)
// =====================================================================

async function commandPromote(dryRun: boolean, vacuumFull: boolean, retentionMonths: number): Promise<void> {
  console.log('🔄 Running Hot → Warm Promotion');
  console.log(`   Retention: ${retentionMonths} months`);
  console.log(`   Dry run: ${dryRun}`);
  console.log(`   VACUUM FULL: ${vacuumFull}`);
  console.log('');

  const result = await db.execute(sql`
    SELECT * FROM sales.promote_to_warm_storage(
      ${retentionMonths},
      ${dryRun},
      ${vacuumFull},
      TRUE -- drop_optional_indexes
    )
  `);

  // Print results
  console.log('📊 Promotion Results:\n');
  console.table(result.rows);

  const promotedCount = result.rows.filter((r: any) => r.action === 'PROMOTED').length;
  const totalSpaceSaved = result.rows
    .filter((r: any) => r.space_saved)
    .reduce((sum: number, r: any) => {
      const match = r.space_saved?.match(/(\d+)\s*(\w+)/);
      if (match) {
        const value = parseFloat(match[1]);
        const unit = match[2];
        // Convert to bytes for aggregation
        const multiplier = unit === 'GB' ? 1e9 : unit === 'MB' ? 1e6 : unit === 'kB' ? 1e3 : 1;
        return sum + (value * multiplier);
      }
      return sum;
    }, 0);

  console.log(`\n✅ Promoted ${promotedCount} partitions`);
  if (totalSpaceSaved > 0) {
    console.log(`💾 Total space saved: ${(totalSpaceSaved / 1e9).toFixed(2)} GB`);
  }

  if (dryRun) {
    console.log('\n⚠️  This was a dry run. Run without --dry-run to execute.');
  }
}

// =====================================================================
// COMMAND: ARCHIVE (Warm → Cold)
// =====================================================================

async function commandArchive(dryRun: boolean, limit: number): Promise<void> {
  console.log('❄️  Running Warm → Cold Archival (R2 Export)');
  console.log(`   Limit: ${limit} partitions`);
  console.log(`   Dry run: ${dryRun}`);
  console.log('');

  // Identify candidates
  console.log('🔍 Identifying archival candidates...');
  const candidates = await db.execute(sql`
    SELECT * FROM archive.identify_cold_candidates(7, 10)
    LIMIT ${limit}
  `);

  if (candidates.rows.length === 0) {
    console.log('✅ No partitions eligible for cold archival');
    return;
  }

  console.log(`📋 Found ${candidates.rows.length} candidates:\n`);
  console.table(candidates.rows);

  if (dryRun) {
    console.log('\n⚠️  This was a dry run. Run without --dry-run to archive to R2.');
    return;
  }

  // Execute archival
  validateEnvironment();
  const r2Client = getR2Client();

  const partitions = candidates.rows.map((row: any) => ({
    tableName: row.table_name,
    partitionName: row.partition_name,
  }));

  console.log('\n📤 Starting R2 archival...\n');
  const results = await batchArchiveToR2(db, r2Client, partitions);

  // Summary
  const successCount = results.filter(r => r.success).length;
  const failedCount = results.length - successCount;

  console.log('\n' + '='.repeat(60));
  console.log('📊 Archival Summary:');
  console.log('='.repeat(60));
  console.log(`   Total partitions: ${results.length}`);
  console.log(`   ✅ Success: ${successCount}`);
  console.log(`   ❌ Failed: ${failedCount}`);

  if (failedCount > 0) {
    console.log('\n❌ Failed partitions:');
    results.filter(r => !r.success).forEach(r => {
      console.log(`   - ${r.partitionName}: ${r.error}`);
    });
  }
}

// =====================================================================
// COMMAND: RESTORE (Cold → Warm)
// =====================================================================

async function commandRestore(r2ObjectKey: string, attachAsPartition: boolean): Promise<void> {
  console.log('♻️  Restoring partition from R2 cold storage');
  console.log(`   R2 key: ${r2ObjectKey}`);
  console.log(`   Attach as partition: ${attachAsPartition}`);
  console.log('');

  validateEnvironment();
  const r2Client = getR2Client();

  // Fetch metadata from catalog
  const catalogEntry = await db.execute(sql`
    SELECT * FROM cold_storage.r2_archive_catalog
    WHERE r2_object_key = ${r2ObjectKey}
  `);

  if (catalogEntry.rows.length === 0) {
    console.error(`❌ R2 object not found in catalog: ${r2ObjectKey}`);
    process.exit(1);
  }

  const metadata = catalogEntry.rows[0] as any;

  // Restore
  console.log('📥 Downloading from R2...');
  const result = await restorePartitionFromR2(db, r2Client, {
    r2ObjectKey,
    targetSchema: 'archive',
    attachAsPartition,
    parentTableName: metadata.table_name,
  });

  if (result.success) {
    console.log('\n✅ Restoration complete:');
    console.log(`   Target table: ${result.targetTable}`);
    console.log(`   Rows restored: ${result.rowCount.toLocaleString()}`);
    console.log(`   Downloaded: ${(result.downloadedSizeBytes / 1024 / 1024).toFixed(2)} MB`);
    console.log(`   Duration: ${result.durationSeconds.toFixed(2)}s`);
    console.log(`   Attached as partition: ${result.attachedAsPartition ? 'Yes' : 'No'}`);
  } else {
    console.error(`\n❌ Restoration failed: ${result.error}`);
    process.exit(1);
  }
}

// =====================================================================
// COMMAND: HEALTH CHECK
// =====================================================================

async function commandHealth(): Promise<void> {
  console.log('🏥 Running Archive Health Check\n');

  const result = await db.execute(sql`
    SELECT * FROM sales.check_archive_health()
  `);

  console.table(result.rows);

  const criticalCount = result.rows.filter((r: any) => r.status?.includes('CRITICAL')).length;
  const warningCount = result.rows.filter((r: any) => r.status?.includes('WARNING')).length;

  console.log('\n' + '='.repeat(60));
  if (criticalCount > 0) {
    console.log(`❌ CRITICAL: ${criticalCount} issues require immediate attention`);
  } else if (warningCount > 0) {
    console.log(`⚠️  WARNING: ${warningCount} issues detected`);
  } else {
    console.log('✅ All systems healthy');
  }
  console.log('='.repeat(60));
}

// =====================================================================
// COMMAND: LIST INVENTORY
// =====================================================================

async function commandList(tier: 'hot' | 'warm' | 'cold'): Promise<void> {
  console.log(`📋 Listing ${tier.toUpperCase()} storage inventory\n`);

  if (tier === 'hot') {
    const result = await db.execute(sql`
      SELECT
        tablename AS partition_name,
        pg_size_pretty(pg_total_relation_size('sales.' || tablename)) AS size,
        (SELECT COUNT(*) FROM sales.sales_orders WHERE tablename LIKE 'sales_orders_%') AS row_count_est
      FROM pg_tables
      WHERE schemaname = 'sales'
        AND (tablename LIKE 'sales_orders_%' OR tablename LIKE 'accounting_postings_%')
        AND tablename NOT LIKE '%_default'
      ORDER BY tablename DESC
      LIMIT 50
    `);
    console.table(result.rows);
  } else if (tier === 'warm') {
    const result = await db.execute(sql`
      SELECT * FROM archive.list_warm_storage_inventory()
    `);
    console.table(result.rows);
  } else if (tier === 'cold') {
    const result = await db.execute(sql`
      SELECT
        table_name,
        partition_name,
        r2_object_key,
        row_count,
        pg_size_pretty(r2_object_size_bytes) AS r2_size,
        ROUND((compression_ratio * 100)::NUMERIC, 1) || '%' AS compression,
        archived_at::DATE AS archived_date,
        restored_count
      FROM cold_storage.r2_archive_catalog
      ORDER BY archived_at DESC
    `);
    console.table(result.rows);

    const totalRows = result.rows.reduce((sum: number, r: any) => sum + Number(r.row_count), 0);
    const totalSize = await db.execute(sql`
      SELECT pg_size_pretty(SUM(r2_object_size_bytes)) AS total_size
      FROM cold_storage.r2_archive_catalog
    `);

    console.log(`\n📊 Cold Storage Summary:`);
    console.log(`   Total partitions: ${result.rows.length}`);
    console.log(`   Total rows: ${totalRows.toLocaleString()}`);
    console.log(`   Total size: ${totalSize.rows[0]?.total_size || 'N/A'}`);
  }
}

// =====================================================================
// CLI ARGUMENT PARSING
// =====================================================================

async function main() {
  const { values, positionals } = parseArgs({
    args: process.argv.slice(2),
    options: {
      'dry-run': { type: 'boolean', default: true },
      'vacuum-full': { type: 'boolean', default: false },
      'retention-months': { type: 'string', default: '24' },
      'limit': { type: 'string', default: '10' },
      'key': { type: 'string' },
      'attach': { type: 'boolean', default: false },
      'tier': { type: 'string', default: 'warm' },
    },
    allowPositionals: true,
  });

  const command = positionals[0];

  if (!command || command === 'help') {
    printUsage();
    return;
  }

  try {
    switch (command) {
      case 'promote':
        await commandPromote(
          values['dry-run'] as boolean,
          values['vacuum-full'] as boolean,
          parseInt(values['retention-months'] as string)
        );
        break;

      case 'archive':
        await commandArchive(
          values['dry-run'] as boolean,
          parseInt(values['limit'] as string)
        );
        break;

      case 'restore':
        if (!values.key) {
          console.error('❌ --key is required for restore command');
          process.exit(1);
        }
        await commandRestore(values.key as string, values.attach as boolean);
        break;

      case 'health':
        await commandHealth();
        break;

      case 'list':
        await commandList(values.tier as 'hot' | 'warm' | 'cold');
        break;

      default:
        console.error(`❌ Unknown command: ${command}`);
        printUsage();
        process.exit(1);
    }
  } catch (error) {
    console.error('\n❌ Error:', error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}

function printUsage(): void {
  console.log(`
📦 Database Archival Runner

USAGE:
  pnpm --filter @afenda/db archival <command> [options]

COMMANDS:
  promote    Promote hot partitions to warm storage (archive schema)
  archive    Archive warm partitions to cold storage (Cloudflare R2)
  restore    Restore partition from cold storage back to PostgreSQL
  health     Run archive health check across all tiers
  list       List partition inventory by tier

OPTIONS:
  --dry-run              Simulate without making changes (default: true)
  --vacuum-full          Run VACUUM FULL during promotion (slow, saves space)
  --retention-months     Hot storage retention in months (default: 24)
  --limit                Max partitions to archive per run (default: 10)
  --key                  R2 object key for restoration (required for restore)
  --attach               Attach restored partition to parent table (default: false)
  --tier                 Storage tier to list: hot, warm, cold (default: warm)

EXAMPLES:
  # Dry run: see what would be promoted
  pnpm --filter @afenda/db archival promote --dry-run

  # Promote partitions older than 24 months
  pnpm --filter @afenda/db archival promote --dry-run=false

  # Dry run: see what would be archived to R2
  pnpm --filter @afenda/db archival archive --dry-run

  # Archive up to 5 partitions to R2
  pnpm --filter @afenda/db archival archive --dry-run=false --limit=5

  # Restore partition from R2 (query-only)
  pnpm --filter @afenda/db archival restore --key=sales_orders/2020/sales_orders_2020_01.parquet

  # Restore and attach as partition (seamless queries)
  pnpm --filter @afenda/db archival restore --key=sales_orders/2020/sales_orders_2020_01.parquet --attach

  # Check archive health
  pnpm --filter @afenda/db archival health

  # List warm storage inventory
  pnpm --filter @afenda/db archival list --tier=warm

  # List cold storage inventory (R2)
  pnpm --filter @afenda/db archival list --tier=cold

ENVIRONMENT VARIABLES (required for R2 operations):
  DATABASE_URL               PostgreSQL connection string
  R2_ACCOUNT_ID             Cloudflare Account ID
  R2_ACCESS_KEY_ID          R2 API access key ID
  R2_SECRET_ACCESS_KEY      R2 API secret access key
  R2_BUCKET_NAME            R2 bucket name (e.g., afenda-archive)
  R2_JURISDICTION           Optional: 'eu' or 'fedramp'

DOCUMENTATION:
  - ARCHIVAL_STRATEGY.md: Comprehensive archival strategy
  - PARTITION_STRATEGY.md: Partitioning implementation details
  `);
}

// =====================================================================
// EXECUTION
// =====================================================================

main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
