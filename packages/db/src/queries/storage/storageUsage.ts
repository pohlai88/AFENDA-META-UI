import { eq } from "drizzle-orm";

import type { Database } from "../../client/index.js";
import {
  tenantStoragePolicies,
  tenantStorageUsage,
} from "../../schema/reference/tables.js";
import { defaultHardQuotaBytesFromEnv } from "./defaults.js";

export type TenantStorageUsageSummary = {
  tenantId: number;
  hardQuotaBytes: string;
  graceQuotaBytes: string;
  reservedBytes: string;
  committedBytes: string;
  effectiveLimitBytes: string;
  effectiveUsedBytes: string;
  remainingBytes: string;
  isUploadBlocked: boolean;
  defaultStorageClass: string;
  lastReconciledAt: string | null;
};

function bi(n: bigint): string {
  return n.toString();
}

/**
 * Read policy + usage for a tenant. Ensures default policy/usage rows exist (same defaults as upload path).
 */
export async function getTenantStorageUsageSummary(
  db: Database,
  tenantId: number
): Promise<TenantStorageUsageSummary> {
  return db.transaction(async (tx) => {
    const def = defaultHardQuotaBytesFromEnv();
    await tx
      .insert(tenantStoragePolicies)
      .values({
        tenantId,
        hardQuotaBytes: def,
        graceQuotaBytes: 0n,
        defaultStorageClass: "STANDARD",
        isUploadBlocked: false,
      })
      .onConflictDoNothing();

    await tx
      .insert(tenantStorageUsage)
      .values({
        tenantId,
        reservedBytes: 0n,
        committedBytes: 0n,
      })
      .onConflictDoNothing();

    const [policy] = await tx
      .select()
      .from(tenantStoragePolicies)
      .where(eq(tenantStoragePolicies.tenantId, tenantId))
      .limit(1);

    const [usage] = await tx
      .select()
      .from(tenantStorageUsage)
      .where(eq(tenantStorageUsage.tenantId, tenantId))
      .limit(1);

    if (!policy || !usage) {
      throw new Error("tenant storage policy or usage missing");
    }

    const effectiveLimit = policy.hardQuotaBytes + policy.graceQuotaBytes;
    const effectiveUsed = usage.reservedBytes + usage.committedBytes;
    const remaining = effectiveLimit - effectiveUsed;

    return {
      tenantId,
      hardQuotaBytes: bi(policy.hardQuotaBytes),
      graceQuotaBytes: bi(policy.graceQuotaBytes),
      reservedBytes: bi(usage.reservedBytes),
      committedBytes: bi(usage.committedBytes),
      effectiveLimitBytes: bi(effectiveLimit),
      effectiveUsedBytes: bi(effectiveUsed),
      remainingBytes: bi(remaining > 0n ? remaining : 0n),
      isUploadBlocked: policy.isUploadBlocked,
      defaultStorageClass: policy.defaultStorageClass,
      lastReconciledAt: usage.lastReconciledAt?.toISOString() ?? null,
    };
  });
}
