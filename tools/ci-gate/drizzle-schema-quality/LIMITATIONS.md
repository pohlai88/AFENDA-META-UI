# drizzle-schema-quality — known limitations

## RLS counting

- **Literal calls only:** `tenantIsolationPolicies("table_name")` and `serviceBypassPolicy("table_name")` are matched with regex. Dynamic forms such as `tenantIsolationPolicies(someVariable)` or computed spreads are **not** counted correctly.
- **Convention:** Keep schema files using **string-literal** table names inside these helpers so CI stays deterministic.
- **Allowlisted paths** (`RLS_OPTIONAL_PATH_PREFIXES` in `config.mjs`): files may define **no** RLS helpers, or RLS on **some** tables only (e.g. global reference tables without `tenant_id` plus tenant-scoped tables). The gate still requires **equal** counts of `tenantIsolationPolicies(...)` and `serviceBypassPolicy(...)` when any appear.
- **Future:** A TypeScript AST pass (e.g. `ts-morph`) could resolve simple identifiers; not implemented here.

## `foreignKey` extraction (`FK_TENANT_ORDER`)

- The gate finds `foreignKey({ ... })` with brace-depth matching, then parses `columns: [ ... ]` and `foreignColumns: [ ... ]` with bracket-depth matching. String literals containing `{` / `[` can still confuse the naive matcher (rare).
- Column lists are split on top-level commas (nested `()`, `[]`, `{}` respected). Composite **employees** FKs must use `foreignColumns: [employees.tenantId, employees.id]` in that order; local `columns` must lead with `table.tenantId`.

## Index naming

- Non-literal detection flags a **single** identifier: `index(foo).on`. It does not fully analyze `index(expr)` or `` index(`...`) `` with complex expressions.

## Extractor (`TABLE_PARSE_ERROR`)

- The shared regex-based `extractSchema` can miss semantic errors; `_parseError` is set only on thrown parse failures.

## Relations drift (`RELATIONS_DRIFT`)

- HR only; compares `packages/db/src/schema/hr/_relations.ts` to `foreignKey()` in scanned HR modules. **Single-column** FKs and **composite** `[tenantId, id]` second-column legs only (cross-table **or** same-table self-FK when both `foreignColumns` use `table.tenantId` and `table.id`).
- Catalog fields must match **Drizzle SQL names** (`leave_type_config_id` vs `leave_type_id` will drift).
- No edge for deferred / commented-out FKs; logical-only catalog rows will look “missing” in schema.

## Zod parity (`ZOD_PARITY`)

- HR only; pairs `insert{Singular}Schema` to table export by naming heuristic (`costCenters` → `insertCostCenterSchema`). Tables without a matching insert export are skipped.
- Does not understand `createInsertSchema(table)` or cross-file Zod.
