# @afenda/db/r2

Bounded **object-storage port** for Cloudflare R2 (S3-compatible API): key helpers, `R2ObjectRepo`, presigned URLs, multipart uploads, checksums, SSE-C, observability events, GC helpers, and typed R2 → Queues notification parsing.

**Data-layer submodule** — ships inside `@afenda/db`; consumers import `@afenda/db/r2`. Postgres stores **generic** blob references only (`storage_key`, `checksum`, `storage_status`); this module + env interpret keys.

**Tenant quota governance** (Neon control plane) lives in `@afenda/db/queries/storage`: per-tenant `hard_quota_bytes` / `grace_quota_bytes`, `reserved_bytes` / `committed_bytes`, quota-increase requests, and helpers for upload + reconcile. R2 remains the byte store; Neon enforces limits and workflow state.

---

## Quick start

### Installation (within monorepo)

```json
// apps/api or packages/db consumers — depend on db package
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
  createR2ObjectRepo,
  loadR2RepoCredentialsFromEnv,
  tenantObjectKey,
  presignR2PutUrl,
  type R2ObjectRepo,
  type R2Event,
} from "@afenda/db/r2";
```

**Use when:** Any server-side upload, archival, or storage job. Keeps the storage boundary explicit.

#### Strategy B — Barrel from `@afenda/db` (avoid for R2)

The root `@afenda/db` barrel does **not** re-export `r2`; always use `@afenda/db/r2` so storage code stays discoverable and tree-shakeable.

---

## Public surface (summary)

| Area | Symbols / files |
| ---- | ---------------- |
| **Repo factory** | `createR2ObjectRepo`, `createR2ObjectRepoWithObservability`, `createR2S3Client`, `loadR2RepoCredentialsFromEnv` |
| **Object I/O** | `R2ObjectRepo`: `putObject`, `uploadLargeObject`, `getObjectStream`, `headObject`, `deleteObject`, `deleteObjects`, `listObjectsByPrefix`, `copyObjectTransitionStorageClass` |
| **Keys** | `tenantObjectKey`, `coldArchiveKey`, `versionedObjectKey`, `applicationStorageKeySchema`, `storageKeySchema`, `parseTenantStyleObjectKey`, `parseObjectKey`, `resolveFullObjectKey`, `resolveListPrefix` |
| **Presign** | `presignR2GetUrl`, `presignR2PutUrl` |
| **SSE-C** | `sseCustomerKeyFromRaw256BitKey` |
| **Checksums** | `hexToBase64` (wire encoding for SDK) |
| **Queues** | `parseR2BucketEventNotification`, `R2BucketEventNotificationMessage` |
| **GC** | `purgeTombstonedStorageRows`, `findOrphanObjectKeys` |
| **Quota (Neon)** | Import `@afenda/db/queries/storage` — `claimTenantAttachmentUpload`, `decrementCommittedBytes`, `applyAttachmentReconcileOutcome`, usage summaries, quota requests |
| **Types** | `R2RepoCredentials`, `PutObjectInput`, `R2Event`, … (`objectRepo.types.ts`) |

Full barrel: [`index.ts`](./index.ts).

### Quota + tombstone GC

After R2 delete succeeds in `purgeTombstonedStorageRows`, decrement Neon counters for the tenant (`decrementCommittedBytes` from `@afenda/db/queries/storage`) using the row’s `byte_size`. Reconciliation jobs should use `applyAttachmentReconcileOutcome` so pending rows transition without leaking `reserved_bytes`.

### Operator runbooks (short)

- **Quota escalation:** Temporarily raise `grace_quota_bytes`, bump `hard_quota_bytes`, or clear `is_upload_blocked` via `PATCH /api/admin/storage/policies/:tenantId` (or direct SQL on `reference.tenant_storage_policies`). Prefer an audited quota request when tenants need a durable increase.
- **Counter repair:** If `reserved_bytes` / `committed_bytes` drift from reality, pause uploads, run a reconciliation pass (`reconcilePendingStorageUploads` + `applyAttachmentReconcileOutcome`), then optionally recompute from `reference.document_attachments` for the tenant (sum `byte_size` by `storage_status`) and patch `tenant_storage_usage` in a maintenance window.

---

## Feature guides

### 1. Repository with observability

```typescript
const repo = createR2ObjectRepo(
  loadR2RepoCredentialsFromEnv(process.env),
  {
    onEvent: (e) => {
      /* pino / metrics / outbox */
    },
    retry: { maxRetries: 3, baseDelayMs: 250, maxDelayMs: 4000 },
  }
);

await repo.putObject({
  key: tenantObjectKey({
    tenantId: 42,
    domain: "hr",
    kind: "export",
    objectId: "run-2026-03-30.parquet",
  }),
  body: buffer,
  contentType: "application/vnd.apache.parquet",
});
```

### 2. Large objects (multipart)

```typescript
await repo.uploadLargeObject({
  key: "…",
  body: readableStream,
  contentType: "application/octet-stream",
  partSize: 8 * 1024 * 1024,
});
```

### 3. Presigned client upload

Server generates URL; browser PUTs directly to R2. Configure bucket **CORS** for `Content-Type` and any checksum headers you require.

```typescript
import { presignR2PutUrl } from "@afenda/db/r2";

const url = await presignR2PutUrl(creds, logicalKey, contentType, 3600);
```

See [Cloudflare: Presigned URLs](https://developers.cloudflare.com/r2/api/s3/presigned-urls/).

### 4. Postgres alignment (generic)

- Insert `storage_key` validated with `applicationStorageKeySchema` (see `reference.document_attachments`).
- Drive lifecycle with `storage_status`; use `purgeTombstonedStorageRows` after your job selects tombstoned rows.

**Neon:** apply migrations for `storage_status` / indexes only — R2 credentials stay in runtime env.

---

## Local development (CLI + SDK)

**SDK:** `@aws-sdk/client-s3`, `@aws-sdk/lib-storage`, `@aws-sdk/s3-request-presigner` (declared on `@afenda/db`).

**Wrangler** (devDependency on `@afenda/db`):

```bash
pnpm --filter @afenda/db exec wrangler login
pnpm --filter @afenda/db exec wrangler r2 bucket list
pnpm --filter @afenda/db exec wrangler r2 object put my-bucket/path/file.txt --file ./file.txt
```

**Tokens:** Cloudflare Dashboard → R2 → Manage API Tokens (S3-compatible access key + secret).

**OSS patterns:** Re-run GitHub code search, e.g. `language:TypeScript r2.cloudflarestorage.com NOT fork:true`.

---

## Testing

```bash
pnpm --filter @afenda/db exec vitest run src/r2/__test__
pnpm --filter @afenda/db typecheck
pnpm --filter @afenda/db build
pnpm --filter @afenda/db r2:health
pnpm --filter @afenda/db r2:health -- --write
```

---

## ADRs (decisions)

- [ADR-key-schema.md](./r2-docs/ADR-key-schema.md) — key layout and validation
- [ADR-object-versioning.md](./r2-docs/ADR-object-versioning.md) — immutable vs overwrite
- [ADR-r2-data-catalog.md](./r2-docs/ADR-r2-data-catalog.md) — Iceberg / data catalog evaluation

---

## Related documentation

- [ARCHITECTURE.md](./r2-docs/ARCHITECTURE.md) — Full design, boundary, consumers, governance
- [../data-lifecycle/README.md](../data-lifecycle/README.md) — Data lifecycle runner (uses this module)
- [../../README.md](../../README.md) — `@afenda/db` package overview
- [../../../meta-types/README.md](../../../meta-types/README.md) — Foundation layer (analogous doc structure)
- [../../../meta-types/ARCHITECTURE.md](../../../meta-types/ARCHITECTURE.md) — Reference for “how we write package docs”
- [../../../../docs/TYPESCRIPT_EXPORTS.md](../../../../docs/TYPESCRIPT_EXPORTS.md) — Monorepo export conventions

---

## Stability policy

1. Treat `R2ObjectRepo` and barrel exports as **stable API**; breaking changes belong in a coordinated `@afenda/db` release.
2. Prefer `@deprecated` + one minor cycle before removing symbols.
3. ADR updates should accompany semantic changes to key layout or lifecycle rules.

---

## Enterprise checklist

| Practice | Status |
| -------- | ------ |
| Sig V4 via AWS SDK v3 | Done |
| Injected config at factory | Done |
| Key layout + Zod + ADRs | Done |
| Multipart / presign / checksums / SSE-C | Done |
| Observability `onEvent` | Done |
| Batch delete + storage class copy | Done |
| GC / orphan helpers | Done |
| Queue notification parser | Done |
| Archival + API wired to repo | Done |
| Vitest unit tests | Done |
