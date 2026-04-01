# @afenda/db/columns

Canonical shared Drizzle column mixins and governance fingerprints for AFENDA database schemas.

**Infrastructure tier** — schema composition primitives for `@afenda/db` domains.

---

## Quick start

### Installation (within monorepo)

```json
{
  "dependencies": {
    "@afenda/db": "workspace:*"
  }
}
```

### Import strategies

#### Strategy A — Subpath (recommended)

```typescript
import {
  timestampColumns,
  softDeleteColumns,
  auditColumns,
  nameColumn,
  evaluateSharedColumnCoverage,
} from "@afenda/db/columns";
```

**Use when:** Defining or validating table schemas with shared lifecycle/audit conventions.

#### Strategy B — Barrel / alternative

```typescript
// For compatibility in existing internals, prefer subpath in new code.
import { timestampColumns } from "@afenda/db/columns";
```

---

## Public surface (summary)

| Export | Type | Purpose |
| --- | --- | --- |
| `timestampColumns` | Drizzle mixin | Standard `createdAt`, `updatedAt` timestamptz columns |
| `appendOnlyTimestampColumns` | Drizzle mixin | `createdAt` only for append-only records |
| `softDeleteColumns` | Drizzle mixin | Optional `deletedAt` |
| `auditColumns(ref)` | Drizzle factory | `createdBy` / `updatedBy` integers FK to `ref()` (e.g. `users.userId`) |
| `nameColumn` | Drizzle mixin | Required display `name` as `varchar(255)` |
| `TIMESTAMP_FINGERPRINTS` | const map | Governance descriptors for timestamp mixins |
| `AUDIT_FINGERPRINTS` | const map | Governance descriptors for audit mixins |
| `NAME_FINGERPRINTS` | const map | `name`: text fingerprint with `maxLength: 255` |
| `ALL_SHARED_FINGERPRINTS` | const map | Unified fingerprint catalog for mandatory/recommended coverage |
| `COLUMN_KIT_FINGERPRINTS` | const map | All mixin shapes including `name` (for `evaluateSharedColumnCoverageWithShapes`) |
| `MANDATORY_SHARED_COLUMNS` | const tuple | Required baseline: `createdAt`, `updatedAt` |
| `RECOMMENDED_SHARED_COLUMNS` | const tuple | Recommended: `deletedAt`, `createdBy`, `updatedBy` |
| `isSharedColumnName()` | type guard | Checks whether a column is part of shared contract |
| `evaluateSharedColumnCoverage()` | analyzer | Returns missing/unknown shared-column governance report |
| `evaluateSharedColumnCoverageWithShapes()` | analyzer | Same as coverage plus fingerprint shape mismatches vs `ALL_SHARED_FINGERPRINTS` |

Full barrel: `packages/db/src/column-kit/index.ts`.

---

## Feature guides

### Compose standard lifecycle columns

```typescript
import { integer, pgTable, text } from "drizzle-orm/pg-core";
import { auditColumns, softDeleteColumns, timestampColumns } from "@afenda/db/columns";
import { users } from "./schema/security/index.js"; // your `security.users` table

export const customerProfiles = pgTable("customer_profiles", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  name: text("name").notNull(),
  ...timestampColumns,
  ...softDeleteColumns,
  ...auditColumns(() => users.userId),
});
```

### Run governance checks in tests/CI

```typescript
import { evaluateSharedColumnCoverage } from "@afenda/db/columns";

const report = evaluateSharedColumnCoverage(["createdAt", "updatedAt", "deletedAt"]);
// report.isCompliant === true (mandatory present + no critical unexpected columns)
// report.missingRecommended => ["createdBy", "updatedBy"]
// report.unexpectedInformational — warn-only in CI; report.unexpectedCritical fails isCompliant
```

---

## Local development

- Source: `packages/db/src/column-kit`
- Keep module free of domain table imports and request-layer concerns.
- Prefer additive exports; avoid symbol renames that break schema modules.

---

## Testing

```bash
pnpm --filter @afenda/db test:db
pnpm --filter @afenda/db exec tsc --noEmit
pnpm ci:gate:column-kit
```

---

## ADRs (decisions)

None yet (architecture captured in `ARCHITECTURE.md`).

---

## Related documentation

- [ARCHITECTURE.md](./ARCHITECTURE.md) — Full design, boundaries, consumer map, governance rules
- [../../README.md](../../README.md) — Package-level subpath exports
- [../../ARCHITECTURE.md](../../ARCHITECTURE.md) — Database architecture and boundary map

---

## CI governance

Local Drizzle introspection (no database):

- **Sales domain only:** `pnpm ci:gate:column-kit:local-ts:sales` (repo root), or `pnpm ci:gate --gate=column-kit-sales-domain`.
- **All domains:** `pnpm ci:gate:column-kit:local-ts`.

Details: `tools/ci-gate/column-kit-shared-columns/README.md` and `tools/ci-gate/column-kit-sales-domain/index.mjs`.

---

## Stability policy

- Use `@afenda/db/columns` subpath for all consumers.
- `MANDATORY_SHARED_COLUMNS` is a contract for schema governance checks.
- Breaking export changes require coordinated updates across `schema/*` and tests.

---

## Checklist (optional)

| Check | Status |
| --- | --- |
| Mixins avoid domain coupling | Yes |
| Governance fingerprints align with mixin fields | Yes |
| Shared-column coverage utility available for CI | Yes |
