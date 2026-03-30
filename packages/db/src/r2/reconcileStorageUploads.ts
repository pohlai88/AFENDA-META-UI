import type { R2ObjectRepo } from "./objectRepo.types.js";

export type ReconcileStorageRow = {
  rowId: string;
  /** Logical key as stored in DB (repo applies keyPrefix). */
  storageKey: string;
};

export type ReconcileUploadDeps = {
  repo: R2ObjectRepo;
  /** Rows still marked pending_upload or failed after client retries. */
  fetchStaleRows: () => Promise<ReconcileStorageRow[]>;
  /**
   * Persist new `storage_status` (e.g. uploaded, verified, failed) and optional checksum from head.
   */
  applyOutcome: (
    row: ReconcileStorageRow,
    outcome: "uploaded" | "verified" | "still_missing"
  ) => Promise<void>;
};

/**
 * Best-effort reconciliation: `headObject` each stale row and transition DB state.
 * Run on a schedule (cron / queue). Does not delete R2 objects.
 */
export async function reconcilePendingStorageUploads(
  deps: ReconcileUploadDeps
): Promise<{ examined: number; resolved: number }> {
  const rows = await deps.fetchStaleRows();
  let resolved = 0;

  for (const row of rows) {
    const head = await deps.repo.headObject(row.storageKey);
    if (!head) {
      await deps.applyOutcome(row, "still_missing");
    } else {
      await deps.applyOutcome(row, "uploaded");
    }
    resolved += 1;
  }

  return { examined: rows.length, resolved };
}
