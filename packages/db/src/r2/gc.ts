import type { R2ObjectRepo } from "./objectRepo.types.js";

export type TombstonePurgeRow = {
  /** Logical or full storage key to delete in R2 */
  storageKey: string;
  /** Row identifier for hard-delete after successful R2 delete */
  rowId: string;
};

export type TombstonePurgeDeps = {
  repo: R2ObjectRepo;
  /** Keys eligible for R2 delete + row removal (e.g. tombstone older than retention). */
  fetchEligibleRows: () => Promise<TombstonePurgeRow[]>;
  /** Called after R2 delete succeeds for each row. */
  hardDeleteRow: (rowId: string) => Promise<void>;
};

/**
 * Delete objects in R2 for tombstoned rows, then remove DB rows.
 * Schedule from a cron / queue; tune batch size for your SLA.
 */
export async function purgeTombstonedStorageRows(
  deps: TombstonePurgeDeps,
  opts?: { batchSize?: number }
): Promise<{ purged: number; errors: string[] }> {
  const batchSize = opts?.batchSize ?? 50;
  const rows = await deps.fetchEligibleRows();
  const errors: string[] = [];
  let purged = 0;

  for (let i = 0; i < rows.length; i += batchSize) {
    const batch = rows.slice(i, i + batchSize);
    for (const row of batch) {
      try {
        await deps.repo.deleteObject(row.storageKey);
        await deps.hardDeleteRow(row.rowId);
        purged += 1;
      } catch (e) {
        errors.push(
          `${row.rowId}: ${e instanceof Error ? e.message : String(e)}`
        );
      }
    }
  }

  return { purged, errors };
}

export type OrphanSweepResult = {
  /** Keys present in R2 under prefix but not in `knownLogicalKeys` */
  orphanKeys: string[];
};

/**
 * List R2 under a prefix and diff against known logical keys (e.g. from DB).
 * Does not delete — use for audits or manual cleanup workflows.
 */
export async function findOrphanObjectKeys(
  repo: R2ObjectRepo,
  listPrefix: string,
  knownLogicalKeys: ReadonlySet<string>
): Promise<OrphanSweepResult> {
  const orphans: string[] = [];
  let token: string | undefined;

  do {
    const page = await repo.listObjectsByPrefix({
      prefix: listPrefix,
      continuationToken: token,
    });
    for (const o of page.objects) {
      const logical = stripRepoPrefixFromFullKey(repo.keyPrefix, o.key);
      if (!knownLogicalKeys.has(logical)) {
        orphans.push(o.key);
      }
    }
    token = page.isTruncated ? page.nextContinuationToken : undefined;
  } while (token);

  return { orphanKeys: orphans };
}

function stripRepoPrefixFromFullKey(keyPrefix: string, fullKey: string): string {
  const p = keyPrefix.trim();
  if (!p) return fullKey;
  const prefixWithSlash = `${p}/`;
  if (fullKey === p) return "";
  if (fullKey.startsWith(prefixWithSlash)) {
    return fullKey.slice(prefixWithSlash.length);
  }
  return fullKey;
}
