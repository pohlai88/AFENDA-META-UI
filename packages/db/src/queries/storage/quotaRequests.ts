import { desc, eq, inArray } from "drizzle-orm";

import type { Database } from "../../client/index.js";
import {
  tenantStoragePolicies,
  tenantStorageQuotaRequests,
} from "../../schema/reference/tables.js";
import { defaultHardQuotaBytesFromEnv } from "./defaults.js";

export async function createTenantStorageQuotaRequest(
  db: Database,
  input: {
    tenantId: number;
    requestedHardQuotaBytes: bigint;
    reason?: string | null;
  }
): Promise<{ requestId: string }> {
  const [row] = await db
    .insert(tenantStorageQuotaRequests)
    .values({
      tenantId: input.tenantId,
      requestedHardQuotaBytes: input.requestedHardQuotaBytes,
      reason: input.reason ?? null,
      status: "submitted",
    })
    .returning({ requestId: tenantStorageQuotaRequests.requestId });

  if (!row) {
    throw new Error("failed to create quota request");
  }
  return { requestId: row.requestId };
}

export async function listTenantStorageQuotaRequestsForTenant(
  db: Database,
  tenantId: number,
  opts?: { limit?: number }
): Promise<(typeof tenantStorageQuotaRequests.$inferSelect)[]> {
  const limit = opts?.limit ?? 50;
  return db
    .select()
    .from(tenantStorageQuotaRequests)
    .where(eq(tenantStorageQuotaRequests.tenantId, tenantId))
    .orderBy(desc(tenantStorageQuotaRequests.createdAt))
    .limit(limit);
}

export async function listTenantStorageQuotaRequestsByStatus(
  db: Database,
  statuses: readonly (typeof tenantStorageQuotaRequests.$inferSelect.status)[],
  opts?: { limit?: number }
): Promise<(typeof tenantStorageQuotaRequests.$inferSelect)[]> {
  const limit = opts?.limit ?? 100;
  return db
    .select()
    .from(tenantStorageQuotaRequests)
    .where(inArray(tenantStorageQuotaRequests.status, statuses))
    .orderBy(desc(tenantStorageQuotaRequests.createdAt))
    .limit(limit);
}

export async function listRecentTenantStorageQuotaRequests(
  db: Database,
  opts?: { limit?: number }
): Promise<(typeof tenantStorageQuotaRequests.$inferSelect)[]> {
  const limit = opts?.limit ?? 100;
  return db
    .select()
    .from(tenantStorageQuotaRequests)
    .orderBy(desc(tenantStorageQuotaRequests.createdAt))
    .limit(limit);
}

export async function approveTenantStorageQuotaRequest(
  db: Database,
  input: {
    requestId: string;
    reviewerUserId: number;
    decisionNote?: string | null;
  }
): Promise<void> {
  await db.transaction(async (tx) => {
    const [req] = await tx
      .select()
      .from(tenantStorageQuotaRequests)
      .where(eq(tenantStorageQuotaRequests.requestId, input.requestId))
      .for("update")
      .limit(1);

    if (!req) {
      throw new Error("quota request not found");
    }
    if (req.status !== "submitted" && req.status !== "under_review") {
      throw new Error("quota request is not pending approval");
    }

    const now = new Date();

    await tx
      .insert(tenantStoragePolicies)
      .values({
        tenantId: req.tenantId,
        hardQuotaBytes: req.requestedHardQuotaBytes,
        graceQuotaBytes: 0n,
        defaultStorageClass: "STANDARD",
        isUploadBlocked: false,
      })
      .onConflictDoUpdate({
        target: tenantStoragePolicies.tenantId,
        set: {
          hardQuotaBytes: req.requestedHardQuotaBytes,
          updatedAt: now,
        },
      });

    await tx
      .update(tenantStorageQuotaRequests)
      .set({
        status: "applied",
        reviewedBy: input.reviewerUserId,
        reviewedAt: now,
        decisionNote: input.decisionNote ?? null,
        appliedAt: now,
      })
      .where(eq(tenantStorageQuotaRequests.requestId, input.requestId));
  });
}

export async function rejectTenantStorageQuotaRequest(
  db: Database,
  input: {
    requestId: string;
    reviewerUserId: number;
    decisionNote?: string | null;
  }
): Promise<void> {
  await db.transaction(async (tx) => {
    const [req] = await tx
      .select()
      .from(tenantStorageQuotaRequests)
      .where(eq(tenantStorageQuotaRequests.requestId, input.requestId))
      .for("update")
      .limit(1);

    if (!req) {
      throw new Error("quota request not found");
    }
    if (req.status !== "submitted" && req.status !== "under_review") {
      throw new Error("quota request is not pending approval");
    }

    const now = new Date();
    await tx
      .update(tenantStorageQuotaRequests)
      .set({
        status: "rejected",
        reviewedBy: input.reviewerUserId,
        reviewedAt: now,
        decisionNote: input.decisionNote ?? null,
      })
      .where(eq(tenantStorageQuotaRequests.requestId, input.requestId));
  });
}

export async function updateTenantStoragePolicyByAdmin(
  db: Database,
  input: {
    tenantId: number;
    hardQuotaBytes?: bigint;
    graceQuotaBytes?: bigint;
    isUploadBlocked?: boolean;
    defaultStorageClass?: "STANDARD" | "STANDARD_IA";
  }
): Promise<void> {
  const now = new Date();
  const insertHard = input.hardQuotaBytes ?? defaultHardQuotaBytesFromEnv();
  await db.transaction(async (tx) => {
    await tx
      .insert(tenantStoragePolicies)
      .values({
        tenantId: input.tenantId,
        hardQuotaBytes: insertHard,
        graceQuotaBytes: input.graceQuotaBytes ?? 0n,
        defaultStorageClass: input.defaultStorageClass ?? "STANDARD",
        isUploadBlocked: input.isUploadBlocked ?? false,
      })
      .onConflictDoUpdate({
        target: tenantStoragePolicies.tenantId,
        set: {
          ...(input.hardQuotaBytes !== undefined
            ? { hardQuotaBytes: input.hardQuotaBytes }
            : {}),
          ...(input.graceQuotaBytes !== undefined
            ? { graceQuotaBytes: input.graceQuotaBytes }
            : {}),
          ...(input.isUploadBlocked !== undefined
            ? { isUploadBlocked: input.isUploadBlocked }
            : {}),
          ...(input.defaultStorageClass !== undefined
            ? { defaultStorageClass: input.defaultStorageClass }
            : {}),
          updatedAt: now,
        },
      });
  });
}

export async function getTenantStorageQuotaRequest(
  db: Database,
  requestId: string
): Promise<typeof tenantStorageQuotaRequests.$inferSelect | undefined> {
  const [row] = await db
    .select()
    .from(tenantStorageQuotaRequests)
    .where(eq(tenantStorageQuotaRequests.requestId, requestId))
    .limit(1);
  return row;
}
