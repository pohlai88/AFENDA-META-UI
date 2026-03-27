# Sales Orders Partition Preflight Runbook

Date: March 27, 2026
Scope: Environment-level proof for `sales.sales_orders` partition readiness and execution evidence

---

## Objective

Provide a repeatable, auditable procedure to prove whether `sales.sales_orders` is partitioned in a target environment and, if needed, execute partition creation safely using existing maintenance scripts.

This runbook is the operational close-out path for the remaining partition execution proof gap.

---

## Source of Truth and Existing Tooling

- Planner logic: `packages/db/src/_maintenance/sales-partition-plan.ts`
- Runner logic: `packages/db/src/_maintenance/run-sales-partition-plan.ts`
- Package scripts: `packages/db/package.json`
  - `ops:partition:plan`
  - `ops:partition:apply`
- CI dry-run workflow: `.github/workflows/db-maintenance-dry-run.yml`

---

## Preconditions

1. Target environment is identified (`staging`, `preprod`, or `prod`).
2. Database credentials are available for read/write maintenance operations.
3. Maintenance window and rollback owner are assigned.
4. A writable evidence file is prepared from `.ideas/sales-partition-preflight-evidence-template.md`.

---

## Step 1: Generate Partition Plan (Dry Run)

Run from repo root:

```bash
pnpm --filter @afenda/db ops:partition:plan -- --years-ahead=3
```

Expected result:

1. Plan prints `generatedAt`, parent table, and action list.
2. Output includes `preflight-parent-partitioned` and yearly `ensure-partition-YYYY` actions.
3. No SQL is executed in dry-run mode.

Record command output path in evidence log.

---

## Step 2: SQL Preflight Checks (Target DB)

Run the following SQL with `psql` or approved DB client.

### 2.1 Check if parent is partitioned

```sql
SELECT EXISTS (
  SELECT 1
  FROM pg_partitioned_table pt
  JOIN pg_class c ON c.oid = pt.partrelid
  JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'sales'
    AND c.relname = 'sales_orders'
) AS is_partitioned;
```

### 2.2 List existing partitions

```sql
SELECT
  n.nspname AS schema_name,
  c.relname AS parent_table,
  c_child.relname AS partition_table,
  pg_get_expr(c_child.relpartbound, c_child.oid) AS partition_bound
FROM pg_inherits i
JOIN pg_class c ON c.oid = i.inhparent
JOIN pg_namespace n ON n.oid = c.relnamespace
JOIN pg_class c_child ON c_child.oid = i.inhrelid
WHERE n.nspname = 'sales'
  AND c.relname = 'sales_orders'
ORDER BY c_child.relname;
```

### 2.3 Validate default partition exists

```sql
SELECT EXISTS (
  SELECT 1
  FROM pg_inherits i
  JOIN pg_class c ON c.oid = i.inhparent
  JOIN pg_namespace n ON n.oid = c.relnamespace
  JOIN pg_class c_child ON c_child.oid = i.inhrelid
  WHERE n.nspname = 'sales'
    AND c.relname = 'sales_orders'
    AND c_child.relname = 'sales_orders_default'
) AS has_default_partition;
```

Decision:

1. If `is_partitioned = true`, skip Step 3 and move to Step 4 (evidence + verification).
2. If `is_partitioned = false`, proceed to Step 3.

---

## Step 3: Execute Partition Actions (If Needed)

Run from repo root:

```bash
pnpm --filter @afenda/db ops:partition:apply -- --years-ahead=3
```

Expected behavior from runner:

1. Executes actions in a single transaction.
2. Uses `CREATE TABLE IF NOT EXISTS ... PARTITION OF ...` statements.
3. Creates yearly partitions plus default partition when parent is partitioned.

Important note:

- Conversion is now explicit opt-in. By default, apply fails with an actionable error if parent is not partitioned.
- To allow controlled conversion of an empty/no-inbound-FK parent table, run:

```bash
pnpm --filter @afenda/db ops:partition:apply -- --years-ahead=3 --allow-parent-conversion
```

- If parent has data or inbound foreign keys, conversion is blocked and must follow a dedicated migration playbook.

---

## Step 4: Post-Execution Verification

Re-run Step 2 SQL checks and confirm:

1. `is_partitioned = true`.
2. Expected yearly partitions are present.
3. `sales_orders_default` exists.

Optional integrity check:

```sql
SELECT relname AS partition_name, reltuples::bigint AS est_rows
FROM pg_class
WHERE relname LIKE 'sales_orders_%'
ORDER BY relname;
```

---

## Step 5: Rollback Guidance

Use rollback only if Step 3 introduced unintended partitions and change window requires revert.

Safety checks before rollback:

1. Confirm each target partition is empty.
2. Confirm no production routing depends on newly created partition names.

Example rollback SQL (adjust table names to actual created partitions):

```sql
-- Only if partition is empty and approved for removal
DROP TABLE IF EXISTS sales.sales_orders_2026;
DROP TABLE IF EXISTS sales.sales_orders_2027;
DROP TABLE IF EXISTS sales.sales_orders_2028;
```

Do not drop `sales_orders_default` without explicit DBA approval.

---

## Evidence Artifacts Required

1. Dry-run plan output.
2. Preflight SQL results (before apply).
3. Apply command output (if executed).
4. Post-verification SQL results (after apply).
5. Completed evidence log document.

Use template: `.ideas/sales-partition-preflight-evidence-template.md`.
