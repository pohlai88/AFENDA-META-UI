/**
 * Tenant Isolation Validation
 * ============================
 * Validates that FK relationships respect tenant boundaries
 * (no cross-tenant data leaks via foreign keys).
 */

import { sql } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import type { FkRelationship } from "./fk-catalog.js";

export interface TenantLeakResult {
  childTable: string;
  parentTable: string;
  fkColumn: string;
  leakCount: number;
  sampleViolations: {
    childId: string;
    childTenantId: number;
    parentId: string;
    parentTenantId: number;
  }[];
}

export interface TenantIsolationResults {
  totalLeaks: number;
  byTable: Map<string, TenantLeakResult[]>;
  allViolations: TenantLeakResult[];
  isSecure: boolean; // true if totalLeaks === 0
}

/**
 * Generate tenant isolation validation query for a single FK
 */
function generateTenantLeakQuery(relationship: FkRelationship): string | null {
  if (!relationship.tenantIsolated) {
    return null; // Skip relationships where one or both tables don't have tenant_id
  }

  const {
    childTableSchema,
    childTableName,
    childColumnName,
    parentTableSchema,
    parentTableName,
    parentColumnName,
  } = relationship;

  return `
    SELECT
      '${childTableName}' AS child_table,
      '${parentTableName}' AS parent_table,
      '${childColumnName}' AS fk_column,
      COUNT(*) AS leak_count,
      JSON_AGG(
        JSON_BUILD_OBJECT(
          'childId', c.id,
          'childTenantId', c.tenant_id,
          'parentId', p.id,
          'parentTenantId', p.tenant_id
        ) ORDER BY c.created_at DESC LIMIT 10
      ) AS sample_violations
    FROM ${childTableSchema}.${childTableName} c
    JOIN ${parentTableSchema}.${parentTableName} p
      ON c.${childColumnName} = p.${parentColumnName}
    WHERE c.tenant_id != p.tenant_id  -- Cross-tenant violation
    GROUP BY child_table, parent_table, fk_column
    HAVING COUNT(*) > 0
  `.trim();
}

/**
 * Detect tenant isolation violations for a single FK
 */
async function detectTenantLeaksForFK(
  db: PostgresJsDatabase<any>,
  relationship: FkRelationship
): Promise<TenantLeakResult | null> {
  const query = generateTenantLeakQuery(relationship);

  if (!query) {
    return null; // Not applicable (one table doesn't have tenant_id)
  }

  try {
    const result = await db.execute(sql.raw(query));

    if (result.rows.length === 0) {
      return null; // No violations found
    }

    const row = result.rows[0] as any;
    return {
      childTable: row.child_table,
      parentTable: row.parent_table,
      fkColumn: row.fk_column,
      leakCount: Number(row.leak_count),
      sampleViolations: row.sample_violations || [],
    };
  } catch (error) {
    console.error(`❌ Error detecting tenant leaks for ${relationship.childTableName}.${relationship.childColumnName}:`, error);
    return null;
  }
}

/**
 * Detect tenant isolation violations across all tenant-isolated FKs
 */
export async function detectTenantLeaks(
  db: PostgresJsDatabase<any>,
  relationships: FkRelationship[]
): Promise<TenantIsolationResults> {
  console.log(`🔒 Validating tenant isolation...`);

  const tenantIsolatedRels = relationships.filter((r) => r.tenantIsolated);
  console.log(`   Checking ${tenantIsolatedRels.length} tenant-isolated FK relationships...`);

  const results: TenantLeakResult[] = [];
  const byTable = new Map<string, TenantLeakResult[]>();

  // Execute in batches
  const batchSize = 10;
  for (let i = 0; i < tenantIsolatedRels.length; i += batchSize) {
    const batch = tenantIsolatedRels.slice(i, i + batchSize);

    const batchResults = await Promise.all(
      batch.map((rel) => detectTenantLeaksForFK(db, rel))
    );

    for (const result of batchResults) {
      if (result) {
        results.push(result);

        const tableResults = byTable.get(result.childTable) || [];
        tableResults.push(result);
        byTable.set(result.childTable, tableResults);
      }
    }

    console.log(`   Progress: ${Math.min(i + batchSize, tenantIsolatedRels.length)}/${tenantIsolatedRels.length}`);
  }

  const totalLeaks = results.reduce((sum, r) => sum + r.leakCount, 0);
  const isSecure = totalLeaks === 0;

  if (isSecure) {
    console.log(`✅ Tenant isolation: SECURE (0 violations)`);
  } else {
    console.log(`🚨 Tenant isolation: CRITICAL (${totalLeaks} violations detected)`);
    console.log(`   This is a SECURITY INCIDENT. Immediate action required.`);
  }

  return {
    totalLeaks,
    byTable,
    allViolations: results,
    isSecure,
  };
}

/**
 * Generate security incident report for tenant leaks
 */
export function generateSecurityIncidentReport(results: TenantIsolationResults): string {
  if (results.isSecure) {
    return "✅ No tenant isolation violations detected. System is secure.";
  }

  let report = `
🚨 SECURITY INCIDENT: Cross-Tenant Data Leak Detected
======================================================

SEVERITY: CRITICAL (P0)
TOTAL VIOLATIONS: ${results.totalLeaks}
TABLES AFFECTED: ${results.byTable.size}

Details:
--------
`;

  for (const violation of results.allViolations) {
    report += `
● ${violation.childTable} → ${violation.parentTable} (${violation.fkColumn})
  Leak Count: ${violation.leakCount}
  Sample Violations:
`;
    for (const sample of violation.sampleViolations.slice(0, 3)) {
      report += `    - Child ${sample.childId} (Tenant ${sample.childTenantId}) → Parent ${sample.parentId} (Tenant ${sample.parentTenantId})\n`;
    }
  }

  report += `
Immediate Actions Required:
---------------------------
1. Escalate to security team (Slack: #security-incidents)
2. Quarantine affected records (DO NOT delete without approval)
3. Run forensic analysis: When did leaks occur?
4. Check for data exfiltration attempts
5. Audit recent migrations and bulk import jobs
6. Review RLS (Row Level Security) policy enforcement

Remediation Query (RUN AFTER SECURITY TEAM APPROVAL):
------------------------------------------------------
-- Generate cleanup SQL for each violation
-- Example for sales_orders → partners leak:
-- UPDATE sales.sales_orders
-- SET partner_id = NULL
-- WHERE id IN (...); -- Affected IDs

Contact: security-team@afenda.com | PagerDuty: Security On-Call
  `;

  return report.trim();
}
