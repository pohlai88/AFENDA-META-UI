/**
 * Tenant Isolation Validation
 * ============================
 * Validates that FK relationships respect tenant boundaries
 * (no cross-tenant data leaks via foreign keys).
 *
 * Sample rows use FK/parent key values as text — no assumption of a surrogate `id` column.
 */

import { sql } from "drizzle-orm";
import type { GraphValidationDb } from "./db-types.js";
import type { FkRelationship } from "./fk-catalog.js";

export interface TenantLeakSample {
  childKey: string;
  childTenantId: number;
  parentKey: string;
  parentTenantId: number;
}

export interface TenantLeakResult {
  childTable: string;
  parentTable: string;
  fkColumn: string;
  leakCount: number;
  sampleViolations: TenantLeakSample[];
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
    return null;
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
    WITH leaks AS (
      SELECT
        c.${childColumnName} AS ck,
        c.tenant_id AS ct,
        p.${parentColumnName} AS pk,
        p.tenant_id AS pt
      FROM ${childTableSchema}.${childTableName} c
      JOIN ${parentTableSchema}.${parentTableName} p
        ON c.${childColumnName} = p.${parentColumnName}
      WHERE c.tenant_id IS DISTINCT FROM p.tenant_id
    )
    SELECT *
    FROM (
      SELECT
        '${childTableName}' AS child_table,
        '${parentTableName}' AS parent_table,
        '${childColumnName}' AS fk_column,
        (SELECT COUNT(*)::bigint FROM leaks) AS leak_count,
        COALESCE(
          (
            SELECT json_agg(x.obj)
            FROM (
              SELECT json_build_object(
                'childKey', l.ck::text,
                'childTenantId', l.ct,
                'parentKey', l.pk::text,
                'parentTenantId', l.pt
              ) AS obj
              FROM leaks l
              LIMIT 10
            ) x
          ),
          '[]'::json
        ) AS sample_violations
    ) sub
    WHERE sub.leak_count > 0
  `.trim();
}

/**
 * Detect tenant isolation violations for a single FK
 */
async function detectTenantLeaksForFK(
  db: GraphValidationDb,
  relationship: FkRelationship
): Promise<TenantLeakResult | null> {
  const query = generateTenantLeakQuery(relationship);

  if (!query) {
    return null;
  }

  try {
    const result = await db.execute(sql.raw(query));

    if (result.rows.length === 0) {
      return null;
    }

    const row = result.rows[0] as Record<string, unknown>;
    let sampleViolations: TenantLeakSample[] = [];
    const raw = row.sample_violations;
    if (Array.isArray(raw)) {
      sampleViolations = raw as TenantLeakSample[];
    } else if (raw && typeof raw === "string") {
      try {
        const parsed = JSON.parse(raw) as unknown;
        if (Array.isArray(parsed)) {
          sampleViolations = parsed as TenantLeakSample[];
        }
      } catch {
        sampleViolations = [];
      }
    }

    return {
      childTable: String(row.child_table),
      parentTable: String(row.parent_table),
      fkColumn: String(row.fk_column),
      leakCount: Number(row.leak_count),
      sampleViolations,
    };
  } catch (error) {
    const ctx = `${relationship.childTableSchema}.${relationship.childTableName}.${relationship.childColumnName} → ${relationship.parentTableSchema}.${relationship.parentTableName}`;
    const msg = error instanceof Error ? error.message : String(error);
    throw new Error(`Tenant isolation check failed (FK ${ctx}): ${msg}`, { cause: error });
  }
}

/**
 * Detect tenant isolation violations across all tenant-isolated FKs
 */
export async function detectTenantLeaks(
  db: GraphValidationDb,
  relationships: FkRelationship[]
): Promise<TenantIsolationResults> {
  console.log(`🔒 Validating tenant isolation...`);

  const tenantIsolatedRels = relationships.filter((r) => r.tenantIsolated);
  console.log(`   Checking ${tenantIsolatedRels.length} tenant-isolated FK relationships...`);

  const results: TenantLeakResult[] = [];
  const byTable = new Map<string, TenantLeakResult[]>();

  const batchSize = 10;
  for (let i = 0; i < tenantIsolatedRels.length; i += batchSize) {
    const batch = tenantIsolatedRels.slice(i, i + batchSize);

    const batchResults = await Promise.all(batch.map((rel) => detectTenantLeaksForFK(db, rel)));

    for (const result of batchResults) {
      if (result) {
        results.push(result);

        const tableResults = byTable.get(result.childTable) || [];
        tableResults.push(result);
        byTable.set(result.childTable, tableResults);
      }
    }

    console.log(
      `   Progress: ${Math.min(i + batchSize, tenantIsolatedRels.length)}/${tenantIsolatedRels.length}`
    );
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
      report += `    - Child FK ${sample.childKey} (Tenant ${sample.childTenantId}) → Parent ${sample.parentKey} (Tenant ${sample.parentTenantId})\n`;
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
