import type { RetentionArchiveRule, RetentionRule, SqlAction } from "../policies/types.js";

export type RetentionPlan = {
  generatedAt: string;
  tenantId: number;
  actorId: number;
  cutoffs: Record<string, string>;
  actions: SqlAction[];
};

export type RetentionPlanOptions = {
  tenantId: number;
  actorId: number;
  rules: RetentionRule[];
  now?: Date;
};

function subtractYears(from: Date, years: number): Date {
  const next = new Date(from);
  next.setUTCFullYear(next.getUTCFullYear() - years);
  return next;
}

function quoteTimestamp(date: Date): string {
  return `'${date.toISOString()}'::timestamptz`;
}

function buildArchiveRuleActions(
  rule: RetentionArchiveRule,
  tenantId: number,
  actorId: number,
  cutoffSql: string
): SqlAction[] {
  const source = `${rule.sourceSchema}.${rule.sourceTable}`;
  const archive = `${rule.archiveSchema}.${rule.archiveTable}`;
  const updateSet = [
    `${rule.softDeleteColumn} = now()`,
    rule.updatedAtColumn ? `${rule.updatedAtColumn} = now()` : undefined,
    rule.updatedByColumn ? `${rule.updatedByColumn} = ${actorId}` : undefined,
  ]
    .filter(Boolean)
    .join(",\n    ");

  return [
    {
      id: `ensure-schema-${rule.archiveSchema}`,
      description: `Ensure ${rule.archiveSchema} schema exists before archival copy operations.`,
      statement: `CREATE SCHEMA IF NOT EXISTS ${rule.archiveSchema};`,
    },
    {
      id: `ensure-archive-table-${rule.id}`,
      description: `Ensure archive table exists for ${rule.id}.`,
      statement: `CREATE TABLE IF NOT EXISTS ${archive} (LIKE ${source} INCLUDING ALL);`,
    },
    {
      id: `archive-${rule.id}`,
      description: `Copy records older than retention cutoff into ${archive}.`,
      statement: `
INSERT INTO ${archive}
SELECT s.*
FROM ${source} AS s
WHERE s.${rule.tenantColumn} = ${tenantId}
  AND s.${rule.dateColumn} < ${cutoffSql}
  AND s.${rule.softDeleteColumn} IS NULL
  AND NOT EXISTS (
    SELECT 1
    FROM ${archive} AS a
    WHERE a.${rule.dedupeKeyColumn} = s.${rule.dedupeKeyColumn}
  );`.trim(),
    },
    {
      id: `soft-delete-${rule.id}`,
      description: `Soft-delete aged records in ${source} after archive copy.`,
      statement: `
UPDATE ${source}
SET ${updateSet}
WHERE ${rule.tenantColumn} = ${tenantId}
  AND ${rule.dateColumn} < ${cutoffSql}
  AND ${rule.softDeleteColumn} IS NULL;`.trim(),
    },
  ];
}

export function buildRetentionPlan(options: RetentionPlanOptions): RetentionPlan {
  const now = options.now ?? new Date();
  const cutoffs: Record<string, string> = {};
  const actions: SqlAction[] = [];

  for (const rule of options.rules) {
    const cutoff = subtractYears(now, rule.retentionYears);
    const cutoffSql = quoteTimestamp(cutoff);
    cutoffs[rule.id] = cutoff.toISOString();

    if (rule.type === "archive-and-soft-delete") {
      actions.push(...buildArchiveRuleActions(rule, options.tenantId, options.actorId, cutoffSql));
      continue;
    }

    actions.push({
      id: `purge-${rule.id}`,
      description: `Purge records older than retention cutoff for ${rule.id}.`,
      statement: `
DELETE FROM ${rule.schemaName}.${rule.tableName}
WHERE ${rule.tenantColumn} = ${options.tenantId}
  AND ${rule.dateColumn} < ${cutoffSql};`.trim(),
    });
  }

  return {
    generatedAt: now.toISOString(),
    tenantId: options.tenantId,
    actorId: options.actorId,
    cutoffs,
    actions,
  };
}
