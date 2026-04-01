# Database client runbook (Neon + `pg` + Drizzle)

Operational reference for [`src/drizzle/client/index.ts`](../src/drizzle/client/index.ts). Keep in sync with [ARCHITECTURE.md](../ARCHITECTURE.md) Layer 1.

## Neon MCP (Cursor `user-Neon`)

Use for live project context and docs, not as a substitute for staging verification:

1. `list_docs_resources` → `get_doc_resource` (index: `https://neon.com/docs/llms.txt`).
2. `get_connection_string` / `describe_project` / `describe_branch` when validating pooled vs direct URLs.
3. `list_slow_queries`, `explain_sql_statement`, or tuning tools when investigating pool wait or timeouts.
4. `compare_database_schema` / migration helpers when client changes interact with deploy pipelines.

Also load the **`neon-postgres`** agent skill for connection-method choice and serverless driver notes.

## GitHub MCP (Cursor `user-github`)

Read-only upstream signals before changing pool options or drivers:

| Query (examples) | Repositories |
| ---------------- | ------------ |
| `search_issues`: pool, pgbouncer, statement_timeout, Neon | `brianc/node-postgres` |
| `search_issues`: serverless, terminate, WebSocket | `neondatabase/serverless` |
| `search_code`: `neon-http`, `node-postgres` | `drizzle-team/drizzle-orm` |

Notable discussions: [node-postgres#3604](https://github.com/brianc/node-postgres/issues/3604) (timeouts on Neon — verify with `SHOW`), [node-postgres#2327](https://github.com/brianc/node-postgres/issues/2327) (transaction pooling + prepared statements).

## Pooled vs direct connection strings (Neon)

| URL | Use |
| --- | --- |
| Hostname contains **`-pooler`** | App traffic, bursty workloads, many short connections. |
| **Direct** (no `-pooler`) | Long sessions, some migrations, tools needing session stickiness, `pg_dump`. |

Set `DATABASE_URL` for the app to the **pooled** string when running behind PgBouncer. Use a separate direct URL for migration jobs if required (e.g. `DATABASE_URL_MIGRATIONS` in Drizzle config).

## Read replicas (optional)

| Variable | Effect |
| -------- | ------ |
| `DATABASE_READ_URL` | Read-replica connection string (required for `createReadReplicaDatabase` unless you pass `connectionString`). |
| `DB_READ_POOL_MAX` | Optional: override **only** `max` for the read pool (defaults to same as primary via `resolvePoolConfigFromEnv()`). |

Use `createReadReplicaDatabase()` from `@afenda/db/client` for read-heavy paths. **RLS still applies** — run tenant-scoped reads inside `withTenantContext` like on the primary. Prefer replica URLs that match your pooling policy (often pooled hostname for many short reads).

## Environment variables (`createDatabase`)

Names must match `resolvePoolConfigFromEnv()` in `src/drizzle/client/index.ts`. Legacy examples sometimes used `DB_IDLE_TIMEOUT_MS` / `DB_STATEMENT_TIMEOUT_MS` without the `DB_POOL_` prefix — those are **ignored**.

| Variable | Effect |
| -------- | ------ |
| `DATABASE_URL` | Primary connection string (required outside `VITEST`). |
| `VITEST` | When set, falls back to local test DB URL if `DATABASE_URL` is unset. |
| `DB_POOL_MAX` | Overrides default pool `max` (default `10`). |
| `DB_POOL_IDLE_TIMEOUT_MS` | `idleTimeoutMillis`. |
| `DB_POOL_CONNECTION_TIMEOUT_MS` | `connectionTimeoutMillis`. |
| `DB_POOL_STATEMENT_TIMEOUT_MS` | `statement_timeout` (ms). |
| `DB_POOL_IDLE_IN_TX_TIMEOUT_MS` | `idle_in_transaction_session_timeout` (ms). |
| `DB_POOL_LOCK_TIMEOUT_MS` | Optional `lock_timeout` (ms; `0` = off). Omit to use server default. |
| `DB_POOL_DEBUG` | `true` — `console.warn` pool stats on each new connection (verbose). |
| `DB_POOL_VERIFY_TIMEOUTS` | `true` in **`apps/api`** — after connectivity check, log `SHOW statement_timeout` / `lock_timeout` / `idle_in_transaction_session_timeout` (Neon / pooler sanity). |

Size **`DB_POOL_MAX`** against **process replica count** and Neon compute `default_pool_size` / `max_connections` (see [Neon connection pooling](https://neon.com/docs/connect/connection-pooling.md)).

## Session context + PgBouncer (RLS GUCs)

[`setSessionContext`](../src/pg-session/set-session-context.ts) uses `set_config(..., true)` (**SET LOCAL** semantics). Session variables are **transaction-scoped**, which matches Neon’s PgBouncer **transaction** pooling. Keep tenant-scoped work inside the same transaction as `setSessionContext` (already the typical Drizzle transaction pattern).

## Serverless / HTTP driver

`createServerlessDatabase()` uses `@neondatabase/serverless` + `drizzle-orm/neon-http`. The Neon serverless driver v1+ expects **Node.js 19+** (see package `engines`).

Options:

```ts
createServerlessDatabase(); // env DATABASE_URL
createServerlessDatabase({ connectionString: url, logger: myLogger });
```

## Serverless / WebSocket driver (interactive transactions)

`createServerlessWebSocketDatabase()` uses `drizzle-orm/neon-serverless` with Neon’s **`Pool`** (WebSocket). Use when you need **`db.transaction()`**-style flows in serverless; call `close()` to drain the pool on shutdown. Runtime must support Neon’s WebSocket pool (see Neon serverless driver docs); for strict HTTP-only edge, keep using `createServerlessDatabase()`.

```ts
const { db, pool, close } = createServerlessWebSocketDatabase({
  connectionString: process.env.DATABASE_URL,
  logger: myLogger,
  onPoolError: (err) => log.error({ err }, "neon pool error"),
});
```

## Observability

- **App ↔ Neon:** Compare `getPoolStats()` (`totalCount`, `idleCount`, `waitingCount`) with Neon Console pooler graphs — rising `waitingCount` often means insufficient server-side pool capacity or too many app connections.
- **Traces:** Neon documents [OpenTelemetry](https://neon.com/docs/guides/opentelemetry) export from the control plane; pair with your app’s OTel service so DB wait and HTTP latency share trace IDs where possible.
- **Third-party APM:** Neon’s Datadog integration (Console → Integrations) complements app-level metrics; keep query text out of high-cardinality metric labels.
- **`apps/api`:** `getPoolStats` on `/health`; optional `DB_POOL_VERIFY_TIMEOUTS` for `SHOW` timeout alignment (see table above).

## Graceful shutdown

`createDatabase()` returns `close()` which calls `pool.end()`. In `apps/api`, use the exported `closeDatabase` from `./db/index.js` on `SIGTERM` / `SIGINT` (wired in the API entrypoint).
