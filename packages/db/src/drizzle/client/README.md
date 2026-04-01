# `@afenda/db/client`

PostgreSQL connection factories for Drizzle: pooled `pg` (primary and read replica), Neon HTTP serverless, and Neon WebSocket serverless — with env-driven pool tuning, optional structured pool errors, and graceful shutdown hooks.

Source: `src/drizzle/client/index.ts` (with `src/drizzle/db.ts` and `src/drizzle/relations.ts` as sibling Drizzle runtime modules).

**Infrastructure tier** — depends on `pg`, `@neondatabase/serverless`, and Drizzle; consumed by `apps/api`, workers, and scripts that need a typed DB handle without importing the whole `@afenda/db` surface.

---

## Quick Start

### Installation (within monorepo)

```json
{
  "dependencies": {
    "@afenda/db": "workspace:*"
  }
}
```

### Import Strategies

#### Strategy A — Subpath (recommended)

```typescript
import {
  createDatabase,
  createReadReplicaDatabase,
  createServerlessDatabase,
  createServerlessWebSocketDatabase,
  getEffectiveSessionTimeouts,
  resolvePoolConfigFromEnv,
  resolveReadReplicaPoolConfigFromEnv,
} from "@afenda/db/client";
```

**Use when:** You only need factories, pool helpers, and types — clearer dependency intent and a smaller conceptual import than the full package barrel.

#### Strategy B — Barrel / alternative

```typescript
import {
  createDatabase,
  createReadReplicaDatabase,
  createServerlessDatabase,
  createServerlessWebSocketDatabase,
  getEffectiveSessionTimeouts,
  resolvePoolConfigFromEnv,
  resolveReadReplicaPoolConfigFromEnv,
} from "@afenda/db";
```

**Use when:** The module already imports other `@afenda/db` symbols (schema re-exports, truth-compiler, etc.) and you prefer a single import path.

---

## Public Surface (summary)

| Export | Kind | Purpose |
| ------ | ---- | ------- |
| `createDatabase` | function | Primary pooled `pg` `Pool` + Drizzle (`node-postgres`). |
| `createReadReplicaDatabase` | function | Read replica pool + Drizzle; requires `DATABASE_READ_URL` or `connectionString`. |
| `createServerlessDatabase` | function | Neon HTTP + `drizzle-orm/neon-http`. |
| `createServerlessWebSocketDatabase` | function | Neon `Pool` (WebSocket) + `drizzle-orm/neon-serverless` (interactive transactions). |
| `resolvePoolConfigFromEnv` | function | Merge defaults with `DB_POOL_*` env vars. |
| `resolveReadReplicaPoolConfigFromEnv` | function | Same as above, optional `DB_READ_POOL_MAX` for `max`. |
| `getEffectiveSessionTimeouts` | async function | `SHOW` effective timeouts from a live `pg` pool (Neon/pooler diagnostics). |
| `DatabaseOptions` | type | `connectionString`, `logger`, `poolConfig`, `onPoolError`. |
| `DatabaseInstance` | type | `db`, `pool`, `getPoolStats`, `checkDatabaseConnection`, `close`. |
| `ServerlessDatabaseOptions` | type | HTTP serverless factory options. |
| `ServerlessWebSocketDatabaseOptions` | type | WebSocket pool + Drizzle options. |
| `ServerlessWebSocketDatabaseInstance` | type | `db`, Neon `pool`, `close`. |
| `DrizzleLogger`, `Database`, `PoolStats`, `ServerlessDatabase`, `SessionTimeoutDiagnostics` | types | Supporting types for consumers and logging. |

Full barrel: `@afenda/db` (re-exports the same client symbols from `drizzle/client/index.js`).

---

## Feature Guides

### 1. Pooled primary (`createDatabase`)

**Default URL:** `DATABASE_URL`, or under Vitest only a local test URL if unset.

**Neon:** Prefer a pooled hostname (`-pooler`) for app traffic; use a direct (non-pooler) URL for migrations and long-lived sessions when your runbook requires it.

```typescript
const { db, pool, checkDatabaseConnection, close } = createDatabase({
  onPoolError: (err) => {
    /* e.g. Pino */
  },
  logger: true,
  poolConfig: { max: 20 },
});

await checkDatabaseConnection();
// on shutdown:
await close();
```

Env tuning: `DB_POOL_MAX`, `DB_POOL_IDLE_TIMEOUT_MS`, `DB_POOL_CONNECTION_TIMEOUT_MS`, `DB_POOL_STATEMENT_TIMEOUT_MS`, `DB_POOL_IDLE_IN_TX_TIMEOUT_MS`, optional `DB_POOL_LOCK_TIMEOUT_MS`, `DB_POOL_DEBUG`, `DB_POOL_VERIFY_TIMEOUTS` (verified at the app layer when enabled).

### 2. Read replica (`createReadReplicaDatabase`)

Requires `DATABASE_READ_URL` or an explicit `connectionString`. Pool `max` can be overridden with `DB_READ_POOL_MAX`. RLS and tenant session behavior match the primary — use the same tenant-context helpers as elsewhere in `@afenda/db`.

### 3. Serverless HTTP (`createServerlessDatabase`)

Neon serverless over HTTP. Suitable when you do not need interactive `db.transaction()` over a single backend connection; see Neon and Drizzle docs for limits.

```typescript
const db = createServerlessDatabase();
// or
const db = createServerlessDatabase({ connectionString: process.env.DATABASE_URL });
```

### 4. Serverless WebSocket (`createServerlessWebSocketDatabase`)

Use when you need interactive transactions from serverless-style runtimes. Returns `{ db, pool, close }`; call `close()` on shutdown.

```typescript
const { db, close } = createServerlessWebSocketDatabase({
  onPoolError: (err) => {
    /* structured log */
  },
});
```

### 5. Session timeout diagnostics (`getEffectiveSessionTimeouts`)

Pass your `pg` `Pool` instance to read effective `statement_timeout`, `lock_timeout`, and `idle_in_transaction_session_timeout` as PostgreSQL reports them — useful on Neon when pooler behavior makes client-side options hard to reason about.

---

## Local Development

- **Canonical env:** Maintain variables in repo-root `.env.config`, then run `pnpm env:sync` so `DATABASE_URL` and mirrors stay aligned (see root `package.json` scripts).
- **Import side effect:** This module preloads repo-root (and package) `.env` via `../../env/load-repo-root-dotenv.js` on first import so `DATABASE_URL` resolves regardless of process working directory.
- **Vitest:** When `VITEST` is set and `DATABASE_URL` is missing, the client falls back to a local test URL — do not rely on that outside tests.

---

## Testing

```bash
pnpm --filter @afenda/db test
pnpm --filter @afenda/db typecheck
pnpm --filter @afenda/db build
```

After changing exported types or options in this package, rebuild `@afenda/db` so `dist/*.d.ts` matches source before consumers typecheck.

---

## ADRs (Decisions)

None dedicated to this folder — connection and Neon pooling decisions are documented in the runbook and package architecture (see below).

---

## Related Documentation

- [DB client runbook](../../../docs/DB_CLIENT_RUNBOOK.md) — Env vars, Neon pooling, shutdown, observability notes
- [ARCHITECTURE.md](../../../ARCHITECTURE.md) — Full `@afenda/db` design, boundaries, consumers
- [TYPESCRIPT_EXPORTS.md](../../../../docs/TYPESCRIPT_EXPORTS.md) — Monorepo export conventions

---

## Stability Policy

1. Treat `createDatabase`, `createReadReplicaDatabase`, and env helpers as stable for app wiring; prefer additive options on `DatabaseOptions` / `ServerlessWebSocketDatabaseOptions` over breaking renames.
2. If a factory signature must change, keep a deprecated overload or named export for at least one minor cycle when feasible.
3. Serverless factories follow Neon and Drizzle upstream semantics — major driver upgrades may require release notes even when this file’s API is unchanged.

---

## Checklist (optional)

| Task | When |
| ---- | ---- |
| Run `pnpm --filter @afenda/db build` | After editing exported types or public options |
| Confirm pooled vs direct `DATABASE_URL` | Before production deploy (Neon pooler vs migrations) |
| Call `close()` / `pool.end()` | On process shutdown in long-lived servers |
