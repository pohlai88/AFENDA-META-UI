# Permission checks — runtime layer (outside `schema/security`)

**Schema** (`schema/security`) defines tables, Zod, RLS, and **pure** precedence in [`permission-precedence.ts`](../permission-precedence.ts). **Runtime** evaluation that hits the database lives in the queries package so the schema folder stays free of `Database` / transaction coupling.

## Entry points

| Export | Module | Role |
| ------ | ------ | ---- |
| `hasPermission` | [`queries/security/hasPermission.ts`](../../../queries/security/hasPermission.ts) | Single permission check (multiple queries per call) |
| `createPermissionResolver` | [`queries/security/permissionResolver.ts`](../../../queries/security/permissionResolver.ts) | Batch preload once per request; `has()` is in-memory |

Import path: `@afenda/db/queries/security` (see `packages/db/package.json` exports).

Both implementations call [`evaluatePermissionAccess`](../permission-precedence.ts) so semantics match the documented order: inactive permission → deny; user `DENY` → deny; user `GRANT` → allow; else role grant union; else deny.

## Testing

- **Pure logic:** [`__test__/permission-precedence.test.ts`](../__test__/permission-precedence.test.ts)
- **DB parity:** `queries/security/__test__/hasPermission.integration.test.ts`, `permissionResolver.integration.test.ts` with `DB_SECURITY_PERMISSION_TESTS=1`

## Projection / cache stance

Request-scoped **`createPermissionResolver`** is the default optimization for many checks per request. A denormalized `effective_user_permissions` table is **deferred** until profiling shows need; see team decision in architecture discussions (invalidation cost vs read gain).
