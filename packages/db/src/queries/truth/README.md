# Business Truth Storage Engine (`@afenda/db/queries/truth`)

Deterministic **Document Truth Compiler**, persistence, decision retrieval, and compliance hooks for `reference.document_attachments`.

## Runtime hook (today)

After a quota-tracked upload completes, `apps/api` calls `runDocumentTruthCompiler` (see `pipeline.ts`). This is the synchronous “event” boundary.

## Event-driven extension (next)

Wire **R2 bucket notifications** (Cloudflare Queues) to the same pipeline:

1. Parse payload with `parseR2BucketEventNotification` from `@afenda/db/r2`.
2. Resolve `attachment_id` / `tenant_id` from object key or metadata.
3. Call `runDocumentTruthCompiler(db, { tenantId, attachmentId })` or a variant that only refreshes facts.

Keep the compiler **idempotent**: append a new row to `document_truth_decisions` each run; attachment summary reflects latest policy version.

## Environment (API)

| Variable | Effect |
|----------|--------|
| `TRUTH_COMPILER_ENABLED` | When `false`, skip post-upload compile. |
| `TRUTH_COMPILER_SHADOW` | When `true`, append decision log only; do not mutate attachment or blocks. |
