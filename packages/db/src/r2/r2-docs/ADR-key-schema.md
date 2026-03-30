# ADR: Application object key schema

## Status

Accepted

## Context

Blob references in Postgres use an opaque `storage_key`. The R2 module builds keys with `tenantObjectKey`, `coldArchiveKey`, and `versionedObjectKey`.

## Decision

1. **Tenant-style keys** (uploads, HR attachments): `{optionalPrefix}/{tenantId}/{domain}/{kind}/{objectId}` with segments sanitized via `sanitizeKeySegment`.
2. **Cold-archive keys** (partition exports): `{dataset}/{year}/{fileName}` via `coldArchiveKey`.
3. **Validation**: `applicationStorageKeySchema` (Zod) enforces at least three `/`-separated segments and safe characters `[a-zA-Z0-9._-]`. Alias: `storageKeySchema`.
4. **Parsing**: `parseTenantStyleObjectKey` recovers tenant/domain/kind/objectId when the key matches the tenant layout (4 segments without prefix, or 5+ with one prefix segment). Alias: `parseObjectKey` (tenant-style only; returns `null` for cold-archive keys).

## Consequences

- Callers must not persist raw URLs or presigned URLs as `storage_key`.
- Changing the layout requires a migration path for existing keys and coordinated updates to parsers.
