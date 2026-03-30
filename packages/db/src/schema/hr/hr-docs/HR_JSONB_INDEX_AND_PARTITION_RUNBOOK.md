# HR JSONB: GIN indexes and partitioning (runbook)

Operational follow-up for native `jsonb` columns (see [HR_JSONB_GOVERNANCE_PLAN.md](./HR_JSONB_GOVERNANCE_PLAN.md)). Use this when **telemetry** shows index bloat, slow writes, or large-table scans—not as a default change.

## 1. When to act

- **Writes** regressing on tables with GIN on `jsonb` (high `idx_tup_fetch` / `idx_scan` imbalance, or noticeable insert latency).
- **Planner** choosing sequential scans on JSON containment queries you expected to use GIN.
- **Table size** pushing single-partition heap limits for high-volume fact tables (tenant + time growth).

## 2. Inspect GIN usage (PostgreSQL)

Run in a maintenance window or read-only replica:

```sql
-- Index scans vs size (adjust schema if needed)
SELECT
  schemaname,
  relname AS table_name,
  indexrelname AS index_name,
  idx_scan,
  pg_size_pretty(pg_relation_size(indexrelid)) AS index_size
FROM pg_stat_user_indexes
WHERE schemaname = 'hr'
  AND indexrelname LIKE '%gin%'
ORDER BY pg_relation_size(indexrelid) DESC;
```

Pair with `pg_stat_all_tables` / `n_live_tup` on the same tables to spot **write-heavy** tables carrying large GIN indexes.

## 3. `jsonb_ops` vs `jsonb_path_ops`

- **Default GIN opclass** (`jsonb_ops`): supports a broad set of `@>`, `?`, `?&`, `?|` operators. Use when queries need **key existence** and **containment** flexibly.
- **`jsonb_path_ops`**: smaller index, faster for **`@>` containment**-style queries; **does not** support `?` / `?&` / `?|` key-existence operators on the same index definition.

Changing opclass is a **migration**: `DROP INDEX` + `CREATE INDEX ... USING gin (col jsonb_path_ops)` (or expression), then validate query plans. Document the change in [HR_SCHEMA_UPGRADE_GUIDE.md](./HR_SCHEMA_UPGRADE_GUIDE.md) if you ship it.

## 4. Partial GIN indexes

Prefer a **partial** index when:

- Only non-null JSON is queried (many schemas already use `WHERE (col IS NOT NULL)` in Drizzle).
- Only a **subset** of rows needs containment (e.g. active tenants, open workflows).

Example pattern (illustrative SQL only—adapt table/column/predicate names):

```sql
CREATE INDEX CONCURRENTLY IF NOT EXISTS my_table_payload_gin
  ON hr.my_table USING gin (payload jsonb_path_ops)
  WHERE deleted_at IS NULL AND payload IS NOT NULL;
```

Adjust predicates to match real filters; avoid overly narrow partials that confuse the planner.

## 5. Partitioning checklist (before DDL)

1. **Document** the candidate table (row growth, query patterns, retention) in this folder or the upgrade guide—**why** partition and **what** dimension (time range, hash of `tenant_id`, etc.).
2. **Confirm** FK and RLS behavior: declarative partitioning changes maintenance and sometimes constraint naming; re-validate `tenantIsolationPolicies` / composite FKs with your Postgres version.
3. **Choose** strategy: **range** on time for append-only facts; **hash** on `tenant_id` only if the product explicitly needs tenant-level partition pruning and accepts operational complexity.
4. **Plan** cutover: new partitioned table + backfill + swap, or native `ATTACH PARTITION` sequence—prefer minimal downtime procedures agreed with ops.
5. **Re-run** repo gates: `pnpm exec tsc --noEmit -p packages/db`, `pnpm ci:gate:schema-quality:hr`, `pnpm ci:gate:hr-enums-schema`, `pnpm ci:gate:db-access:generate`, `pnpm db:test`.

## 6. Operational guardrails (application layer)

- **Zod caps (repo defaults):** `HR_JSONB_DEFAULT_MAX_BYTES` and helpers `addIssueIfSerializedJsonExceeds`, `hrSurveyQuestionSchema`, `hrSurveyResponseItemSchema`, `recruitmentAutoAdvanceCriteriaSchema`, `biometricDevicePayloadSchema` in [`_zodShared.ts`](../_zodShared.ts). Tune constants per tenant tier or product; document changes in the upgrade guide if you raise limits materially.
- Cap or validate **maximum serialized size** before insert (defense in depth; see §7 for TOAST).
- Log or metric **rejected** JSON at validation boundaries (Zod) to catch contract drift early.
- Prefer **typed** Zod (`record` + refinements, shared schemas) over bare `z.json()` wherever a stable product contract exists; keep `z.json()` only for truly open-ended blobs until an OpenAPI/ADR defines shape.

## 7. PostgreSQL TOAST and large `jsonb`

- **`jsonb` is stored like `text` for TOAST purposes:** values larger than ~2 KB (default `TOAST_TUPLE_THRESHOLD`) are often compressed and stored out-of-line. Very large documents increase I/O and vacuum/TOAST churn.
- **Implications:** bounding payload size in the app (Zod + API limits) reduces surprise latency and bloat. It does not remove TOAST; it keeps most rows “reasonable.”
- **Monitoring:** watch table bloat (`pg_stat_all_tables`, autovacuum), and `pg_column_size(jsonb_col)` samples in staging for worst-case tenants.

## 8. Index health beyond `idx_scan`

- Track **`idx_blks_read` / `idx_blks_hit`** (buffer cache) for hot GIN indexes; sustained read-heavy GIN may mean cache pressure or need for `jsonb_path_ops` / partial index (§3–4).
- After major releases, re-check **`pg_stat_user_indexes.idx_tup_read`** vs **`idx_tup_fetch`** for unused indexes (candidates to drop or make partial).

## 9. Partitioning reminder (tenant / time)

- **Document first:** candidate table, growth model, query pattern, retention, and FK/RLS impact (see §5). Prefer **time range** for append-only facts; **hash on `tenant_id`** only with explicit product need and ops buy-in.
- **Do not** partition speculatively: measure row counts and scan cost first.

## 10. ESS domain events and outbox (`hr.ess_domain_events`, `hr.ess_outbox`)

- **`ess_domain_events.payload`** is `jsonb` (bounded by app/Zod). Default B-tree indexes are on `(tenant_id, aggregate_type, aggregate_id, occurred_at)` and `(tenant_id, event_type_id)` — not GIN. Add **partial GIN** on `payload` only if containment queries justify write cost.
- **Volume path:** both tables are append-heavy. When `n_live_tup` or sequential scans on time windows hurt, plan **range partition on `occurred_at`** (events) and mirror retention for **outbox** on `created_at` / `published_at` (archive `delivery_status = delivered` off hot storage).
- **FK note:** outbox rows reference domain events; partition design must keep **child partitions aligned** or use a **global** events parent table with monthly children — follow PostgreSQL declarative partitioning constraints before shipping.

## Related

- [HR_SCHEMA_UPGRADE_GUIDE.md](./HR_SCHEMA_UPGRADE_GUIDE.md) — migration registry and CI commands; “Next steps” GIN note.
- [SCHEMA_LOCKDOWN.md](./SCHEMA_LOCKDOWN.md) — §6 enums vs `jsonb` vs `text`.
- [HR_JSONB_GOVERNANCE_PLAN.md](./HR_JSONB_GOVERNANCE_PLAN.md) — audit matrix and phased migrations.
