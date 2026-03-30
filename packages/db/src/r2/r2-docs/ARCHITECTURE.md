# R2 Storage Abstraction — Architecture

> **Status:** Production module inside `@afenda/db`
> **Import path:** `@afenda/db/r2`
> **Tests:** `src/r2/__test__` (Vitest)
> **Runtime deps:** `@aws-sdk/client-s3`, `@aws-sdk/lib-storage`, `@aws-sdk/s3-request-presigner` (S3-compatible → Cloudflare R2)

---

## Design philosophy

| Old approach | New approach |
| ------------ | ------------ |
| R2/S3 calls scattered across apps | Single port: `createR2ObjectRepo` |
| Bucket/key logic in Drizzle columns | Opaque `storage_key` + generic `storage_status` / `checksum` in Postgres |
| Hand-rolled SigV4 or duplicate clients | AWS SDK v3 + shared `createR2S3Client` |

---

## Module role

`packages/db/src/r2` is the **object-storage port** for the monorepo: Cloudflare R2 via the **S3-compatible API**. It is **not** a second foundation tier (it lives under `@afenda/db` and may use Zod); it **must not** be imported by `@afenda/meta-types`.

- **Upstream consumers:** `apps/api`, `packages/db` archival CLI, future Workers (via shared types or duplicate thin wrapper).
- **Downstream:** Cloudflare R2 only (provider). **Postgres** stores generic blob references interpreted by callers + this module.
- **Boundary:** No Cloudflare-specific types in HR/reference schema; no `r2_bucket` / provider columns in domain tables.

### Boundary position

```
               ┌─────────────────┐
               │  apps/api       │ ──┐
               │  workers (future)│   │
               └─────────────────┘   │
                       │             │
               ┌─────────────────┐   │  import @afenda/db/r2
               │  packages/db    │ ←─┘  (archival, uploads)
               │  src/r2/        │
               └─────────────────┘
                       │
               ┌─────────────────┐
               │ Cloudflare R2   │  S3 API (HTTPS)
               │ (object bytes)  │
               └─────────────────┘

               ┌─────────────────┐
               │ Postgres (Neon) │  storage_key, checksum,
               │ reference.*     │  storage_status (generic)
               └─────────────────┘
```

### Multi-tenant storage governance (Neon)

R2 does not enforce per-tenant capacity. The platform does, in **Postgres**:

- `reference.tenant_storage_policies` — `hard_quota_bytes`, `grace_quota_bytes`, `is_upload_blocked`, default storage class.
- `reference.tenant_storage_usage` — `reserved_bytes` (in-flight uploads) and `committed_bytes` (verified blobs), one row per tenant; row-level locking for concurrency.
- `reference.tenant_storage_quota_requests` — tenant-submitted increases with reviewer audit columns (`reviewed_by`, `reviewed_at`, `decision_note`, `applied_at`).

Application code: **`@afenda/db/queries/storage`** (`claimTenantAttachmentUpload`, `completeTenantAttachmentUploadSuccess` / `Failure`, `decrementCommittedBytes`, `releaseReservedBytes`, `applyAttachmentReconcileOutcome`, usage and admin workflow helpers). Upload APIs should return **`STORAGE_QUOTA_EXCEEDED`** (see `StorageQuotaExceededError`) with numeric `remainingBytes` / `requiredBytes` for clients.

**Incident recovery (outline):** Stop or throttle uploads; run stale pending reconciliation; release reservations for abandoned rows; compare sums from `document_attachments` to `tenant_storage_usage` and correct in a controlled migration or one-off SQL. Document who may override `is_upload_blocked` and how approvals are audited.

---

## Package structure

```
packages/db/src/r2/
├── index.ts                 # Public barrel
├── credentials.ts           # Env → validated R2RepoCredentials
├── objectRepo.types.ts      # R2ObjectRepo port, inputs, R2Event, notification types
├── createR2ObjectRepo.ts    # S3 client + put/get/head/list/delete/multipart/copy
├── s3Client.ts              # createR2S3Client (shared with presign)
├── objectKey.ts             # Key builders, Zod applicationStorageKeySchema, resolvers
├── checksumWire.ts          # Hex → base64 for SDK checksum fields
├── sseCustomer.ts           # SSE-C helper from raw 256-bit key
├── presign.ts               # presignR2GetUrl / presignR2PutUrl
├── notificationMessage.ts   # parseR2BucketEventNotification (Queues payload)
├── observability.ts         # createR2ObjectRepoWithObservability
├── gc.ts                    # Tombstone purge + orphan key audit helpers
├── r2-docs/ADR-*.md         # Key schema, versioning, data catalog evaluation
├── __test__/                # Vitest: objectKey, checksumWire, notificationMessage
├── README.md                # Quick start, exports table, ops checklist
└── ARCHITECTURE.md          # This document
```

---

## Core architecture

### 1. Port pattern (`R2ObjectRepo`)

All object I/O goes through a **functional interface** implemented by `createR2ObjectRepo(credentials, options?)`:

- **Mutations:** `putObject`, `uploadLargeObject`, `deleteObject`, `deleteObjects`, `copyObjectTransitionStorageClass`
- **Reads:** `getObjectStream`, `headObject`, `listObjectsByPrefix`
- **Metadata:** `bucket`, `keyPrefix` (logical prefix for multi-tenant layouts)

**Immutability / versioning policy:** See `ADR-object-versioning.md`. Prefer **immutable keys** for audit-heavy blobs; overwrite only where product explicitly allows.

### 2. Key governance

- **Builders:** `tenantObjectKey`, `coldArchiveKey`, `versionedObjectKey`
- **Validation:** `applicationStorageKeySchema` (Zod) — used at API/insert boundaries (e.g. `documentAttachmentInsertSchema`)
- **Resolution:** `resolveFullObjectKey` / `resolveListPrefix` accept **logical** keys or **full** list keys (avoids double prefix bugs)

Formal rules: `ADR-key-schema.md`.

### 3. Postgres contract (generic, not R2-specific)

`reference.document_attachments` carries:

- `storage_key` — opaque application string (meaning owned by env + key helpers)
- `checksum` — optional content digest (e.g. SHA-256 hex) for dedup
- `storage_status` — `pending_upload` | `uploaded` | `verified` | `failed` | `tombstone`

Partial unique index on `(tenant_id, checksum)` when checksum present and status not `tombstone`. **Neon / migrations** apply DDL only; R2 credentials never live in the database.

### 4. Observability

`createR2ObjectRepo(creds, { onEvent })` emits `R2Event` discriminated unions (upload start/complete/fail, get, list, delete). Wire to Pino, metrics, or domain outbox — **outside** this folder.

### 5. Platform integration (Cloudflare)

| Concern | Where handled |
| ------- | ------------- |
| Presigned browser upload | `presignR2PutUrl` + bucket **CORS** (Dashboard / Wrangler) |
| Large objects | `uploadLargeObject` + R2 multipart lifecycle (abort stale uploads) |
| Post-upload workflows | **Event notifications** → Queues; parse with `parseR2BucketEventNotification` |
| Cost / IA | `storageClass` on put + `copyObjectTransitionStorageClass`; bucket lifecycle rules |
| Ops CLI | Wrangler `r2` commands (see `README.md`) |

---

## Design patterns

### 1. Opaque storage reference

```typescript
// Postgres row (conceptual)
// { storage_key: "42/hr/doc/uuid-filename.pdf", storage_status: "uploaded", checksum: "…" }

// App resolves to R2 using env keyPrefix + createR2ObjectRepo
await repo.putObject({ key: row.storage_key, body, contentType });
```

### 2. Event-shaped observability

```typescript
const repo = createR2ObjectRepo(creds, {
  onEvent: (e) => {
    if (e.type === "ObjectUploadFailed") {
      // log + alert
    }
  },
});
```

### 3. Queue consumer typing

```typescript
const msg = parseR2BucketEventNotification(JSON.parse(body));
if (msg?.action === "PutObject") {
  // scan / thumbnail / reconcile DB
}
```

---

## Consumer map

### `apps/api`

- `r2Storage.ts` — `createR2ObjectRepo`, `resolveFullObjectKey` for uploads and prune jobs.

### `packages/db` archival

- `archival/r2-integration.ts` — `archivePartitionToR2`, `restorePartitionFromR2` take `R2ObjectRepo`.
- `archival/runner.ts` — builds repo from env (`R2_*`).

### `packages/db` schema

- `schema/reference/tables.ts` — imports `applicationStorageKeySchema` from `r2` for insert validation (acceptable **inward** dependency: schema validates strings shaped by the storage module).

### `apps/web`

- Should **not** import `@afenda/db/r2` in the browser bundle; use API presign endpoints instead.

---

## Testing strategy

1. **Unit tests** (`src/r2/__test__`): key parsing, checksum encoding, notification JSON parsing.
2. **Contract tests (recommended next):** mock `S3Client` or MinIO for put/get/list/multipart/presign — not required to hit live R2 in CI.
3. **E2E:** manual smoke against a dev bucket with Wrangler or API.

```bash
pnpm --filter @afenda/db exec vitest run src/r2/__test__
```

---

## Build and typecheck

R2 sources compile with `@afenda/db`:

```bash
pnpm --filter @afenda/db build
pnpm --filter @afenda/db typecheck
```

Subpath `@afenda/db/r2` is declared in `packages/db/package.json` `exports`.

---

## Governance rules

1. **No reverse dependency:** `src/r2` must not import application routes or UI.
2. **No provider columns in domain tables:** keep R2/S3 as implementation detail; Postgres stays generic.
3. **Archival catalog:** `cold_storage.r2_archive_catalog` is ops/archival scope — **R2 remains authoritative** for object existence; catalog is index-only, not joined from core business queries.
4. **Breaking changes** to `R2ObjectRepo` or barrel exports: treat as semver for `@afenda/db` consumers; document in changelog / migration notes.

---

## Import strategy

Prefer the subpath (clear boundary, tree-shaking friendly):

```typescript
import { createR2ObjectRepo, tenantObjectKey } from "@afenda/db/r2";
```

Avoid re-implementing S3 clients in feature code.

---

## Summary

`packages/db/src/r2` is the **single S3-compatible port** to Cloudflare R2, with **key governance**, **lifecycle-friendly** Postgres references, **presign/multipart/checksum/SSE-C**, **observability hooks**, and **typed queue notifications**. It mirrors the **bounded-module** discipline used at the foundation layer (`@afenda/meta-types`) while remaining a **data-layer** concern.

**Related:** [README.md](../README.md) · [ADR-key-schema.md](./ADR-key-schema.md) · [ADR-object-versioning.md](./ADR-object-versioning.md) · [ADR-r2-data-catalog.md](./ADR-r2-data-catalog.md)
