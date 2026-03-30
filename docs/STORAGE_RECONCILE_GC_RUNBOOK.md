# Storage reconcile & GC runbook

Operational guidance for `reconcilePendingStorageUploads` and `purgeTombstonedStorageRows` in `@afenda/db/r2`.

## Purpose

| Job | Function | Outcome |
|-----|----------|---------|
| Reconcile | `reconcilePendingStorageUploads` | DB rows stuck in `pending_upload` / failed → `headObject` R2 → transition status |
| GC | `purgeTombstonedStorageRows` | Tombstoned attachments → delete R2 object → hard-delete row (respect legal hold / retention in `fetchEligibleRows`) |

## Scheduling

- **Reconcile:** every 5–15 minutes (tenant volume dependent). Low side-effect; safe to run frequently.
- **GC:** daily or weekly; batch via `batchSize` (default 50). Run off-peak.

Wire a worker (Cloudflare Cron, Vercel Cron, or internal queue) that:

1. Builds `R2ObjectRepo` from env (`loadR2RepoCredentialsFromEnv` + `createR2ObjectRepo`).
2. Implements `fetchStaleRows` / `applyOutcome` (or tombstone fetch + `hardDeleteRow`) against `reference.document_attachments` and quota helpers in `@afenda/db/queries/storage`.

## SLOs (targets from north-star plan)

- Upload success rate (client + server).
- P95 presign latency.
- **Reconciliation lag:** p95 time from client “upload done” to row `uploaded`/`verified` &lt; 15 min (tune threshold).
- GC error rate &lt; 0.1% of purged objects; alert on sustained failures.

## Incidents

- **Spike in `still_missing`:** R2 outage, wrong bucket, or key prefix mismatch — check repo config and sample `headObject`.
- **GC failures:** verify object still exists; retry; do not hard-delete DB row until R2 delete succeeds.
- **Truth compiler lag:** after reconcile marks upload complete, optionally enqueue `runDocumentTruthCompiler` for that attachment.

## References

- `packages/db/src/r2/reconcileStorageUploads.ts`
- `packages/db/src/r2/gc.ts`
- `packages/db/src/queries/truth/README.md`
