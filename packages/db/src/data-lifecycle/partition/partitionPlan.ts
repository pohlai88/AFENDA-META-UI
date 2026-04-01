import type { SqlAction } from "../policies/types.js";

export type PartitionPlan = {
  generatedAt: string;
  schemaName: string;
  parentTable: string;
  partitionColumn: string;
  years: number[];
  actions: SqlAction[];
};

export type PartitionPlanOptions = {
  now?: Date;
  schemaName: string;
  parentTable: string;
  partitionColumn: string;
  yearsAhead?: number;
  allowParentConversion?: boolean;
};

function toSqlDateUtc(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function buildPartitionPlan(options: PartitionPlanOptions): PartitionPlan {
  const now = options.now ?? new Date();
  const schemaName = options.schemaName;
  const parentTable = options.parentTable;
  const partitionColumn = options.partitionColumn;
  const yearsAhead = options.yearsAhead ?? 2;
  const allowParentConversion = options.allowParentConversion ?? false;
  const baseYear = now.getUTCFullYear();

  const years = Array.from({ length: yearsAhead + 1 }, (_, offset) => baseYear + offset);

  const fqParent = `${schemaName}.${parentTable}`;
  const legacyParent = `${parentTable}_legacy_unpartitioned`;
  const actions: SqlAction[] = [
    {
      id: "preflight-parent-table-exists",
      description: "Check whether parent table exists.",
      statement: `
SELECT EXISTS (
  SELECT 1
  FROM pg_class c
  JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = '${schemaName}'
    AND c.relname = '${parentTable}'
) AS table_exists;`.trim(),
    },
    {
      id: "preflight-parent-partitioned",
      description: "Check whether parent table is declared as partitioned.",
      statement: `
SELECT EXISTS (
  SELECT 1
  FROM pg_partitioned_table pt
  JOIN pg_class c ON c.oid = pt.partrelid
  JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = '${schemaName}'
    AND c.relname = '${parentTable}'
) AS is_partitioned;`.trim(),
    },
    {
      id: "guard-parent-table-exists",
      description: "Fail apply if parent table does not exist.",
      statement: `
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = '${schemaName}'
      AND c.relname = '${parentTable}'
  ) THEN
    RAISE EXCEPTION 'Partition apply aborted: parent table %.% does not exist', '${schemaName}', '${parentTable}';
  END IF;
END $$;`.trim(),
    },
    {
      id: "ensure-parent-partitioned",
      description: allowParentConversion
        ? "Convert empty parent table to partitioned form when safe; fail with actionable error otherwise."
        : "Fail with actionable error when parent is not partitioned unless explicit conversion flag is enabled.",
      statement: allowParentConversion
        ? `
DO $$
DECLARE
  parent_oid OID;
  row_count BIGINT;
  inbound_fk_count INTEGER;
BEGIN
  SELECT c.oid
  INTO parent_oid
  FROM pg_class c
  JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = '${schemaName}'
    AND c.relname = '${parentTable}';

  IF parent_oid IS NULL THEN
    RETURN;
  END IF;

  IF EXISTS (SELECT 1 FROM pg_partitioned_table pt WHERE pt.partrelid = parent_oid) THEN
    RETURN;
  END IF;

  EXECUTE format('SELECT COUNT(*) FROM %I.%I', '${schemaName}', '${parentTable}') INTO row_count;

  SELECT COUNT(*)
  INTO inbound_fk_count
  FROM pg_constraint
  WHERE contype = 'f'
    AND confrelid = parent_oid;

  IF row_count > 0 OR inbound_fk_count > 0 THEN
    RAISE EXCEPTION
      'Partition conversion blocked for %.%: rows=% inbound_fks=%; run controlled migration playbook',
      '${schemaName}',
      '${parentTable}',
      row_count,
      inbound_fk_count;
  END IF;

  EXECUTE format(
    'ALTER TABLE %I.%I RENAME TO %I',
    '${schemaName}',
    '${parentTable}',
    '${legacyParent}'
  );

  EXECUTE format(
    'CREATE TABLE %I.%I (LIKE %I.%I INCLUDING ALL) PARTITION BY RANGE (${partitionColumn})',
    '${schemaName}',
    '${parentTable}',
    '${schemaName}',
    '${legacyParent}'
  );

  EXECUTE format('DROP TABLE %I.%I', '${schemaName}', '${legacyParent}');
END $$;`.trim()
        : `
DO $$
DECLARE
  parent_oid OID;
BEGIN
  SELECT c.oid
  INTO parent_oid
  FROM pg_class c
  JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = '${schemaName}'
    AND c.relname = '${parentTable}';

  IF parent_oid IS NULL THEN
    RETURN;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_partitioned_table pt WHERE pt.partrelid = parent_oid) THEN
    RAISE EXCEPTION
      'Parent %.% is not partitioned. Re-run with --allow-parent-conversion after maintenance approval.',
      '${schemaName}',
      '${parentTable}';
  END IF;
END $$;`.trim(),
    },
  ];

  for (const year of years) {
    const start = `${year}-01-01`;
    const end = `${year + 1}-01-01`;
    const partitionName = `${parentTable}_${year}`;

    actions.push({
      id: `ensure-partition-${year}`,
      description: `Ensure yearly partition exists for ${year}.`,
      statement: `
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_partitioned_table pt
    JOIN pg_class c ON c.oid = pt.partrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = '${schemaName}'
      AND c.relname = '${parentTable}'
  ) THEN
    EXECUTE format(
      'CREATE TABLE IF NOT EXISTS ${schemaName}.${partitionName} PARTITION OF ${fqParent} FOR VALUES FROM (%L) TO (%L)',
      '${start}',
      '${end}'
    );
  END IF;
END $$;`.trim(),
    });
  }

  actions.push({
    id: "ensure-default-partition",
    description: "Ensure a default partition exists for out-of-range rows.",
    statement: `
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_partitioned_table pt
    JOIN pg_class c ON c.oid = pt.partrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = '${schemaName}'
      AND c.relname = '${parentTable}'
  ) THEN
    EXECUTE 'CREATE TABLE IF NOT EXISTS ${schemaName}.${parentTable}_default PARTITION OF ${fqParent} DEFAULT';
  END IF;
END $$;`.trim(),
  });

  return {
    generatedAt: now.toISOString(),
    schemaName,
    parentTable,
    partitionColumn,
    years,
    actions,
  };
}

export function currentUtcDate(): string {
  return toSqlDateUtc(new Date());
}
