import { and, eq, sql } from "drizzle-orm";

import type { Database } from "../../drizzle/client/index.js";
import { parseTenantStyleObjectKey } from "../../r2/objectKey.js";
import {
  documentAttachments,
  tenantStoragePolicies,
  tenantStorageUsage,
} from "../../schema/reference/tables.js";
import { defaultHardQuotaBytesFromEnv } from "./defaults.js";
import {
  StorageIdempotencyInvalidError,
  StorageQuotaExceededError,
  StorageUploadAlreadyCompletedError,
  StorageUploadBlockedError,
} from "./errors.js";

export function assertStorageKeyBelongsToTenant(storageKey: string, tenantId: number): void {
  const parsed = parseTenantStyleObjectKey(storageKey);
  if (!parsed || parsed.tenantId !== String(tenantId)) {
    const err = new Error("storage_key does not match tenant layout");
    (err as Error & { code?: string }).code = "STORAGE_KEY_TENANT_MISMATCH";
    throw err;
  }
}

async function ensurePolicyRow(
  tx: Parameters<Parameters<Database["transaction"]>[0]>[0],
  tenantId: number
): Promise<void> {
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
}

async function ensureUsageRow(
  tx: Parameters<Parameters<Database["transaction"]>[0]>[0],
  tenantId: number
): Promise<void> {
  await tx
    .insert(tenantStorageUsage)
    .values({
      tenantId,
      reservedBytes: 0n,
      committedBytes: 0n,
    })
    .onConflictDoNothing();
}

export type ClaimTenantAttachmentUploadInput = {
  tenantId: number;
  byteSize: number;
  idempotencyKey?: string | null;
  attachmentId: string;
  storageKey: string;
  filename: string;
  contentType: string;
  uploadedBy?: number | null;
};

export type ClaimTenantAttachmentUploadResult =
  | { outcome: "created"; attachmentId: string; storageKey: string }
  | { outcome: "resume_pending"; attachmentId: string; storageKey: string };

/**
 * Transactional: lock policy + usage (fixed order), enforce quota, reserve bytes, insert or resume attachment row.
 */
export async function claimTenantAttachmentUpload(
  db: Database,
  input: ClaimTenantAttachmentUploadInput
): Promise<ClaimTenantAttachmentUploadResult> {
  const size = input.byteSize;
  if (!Number.isFinite(size) || size < 0 || !Number.isInteger(size)) {
    throw new Error("byteSize must be a non-negative integer");
  }
  const incoming = BigInt(size);
  assertStorageKeyBelongsToTenant(input.storageKey, input.tenantId);

  return db.transaction(async (tx) => {
    await ensurePolicyRow(tx, input.tenantId);
    await ensureUsageRow(tx, input.tenantId);

    const [policy] = await tx
      .select()
      .from(tenantStoragePolicies)
      .where(eq(tenantStoragePolicies.tenantId, input.tenantId))
      .for("update")
      .limit(1);

    const [usage] = await tx
      .select()
      .from(tenantStorageUsage)
      .where(eq(tenantStorageUsage.tenantId, input.tenantId))
      .for("update")
      .limit(1);

    if (!policy || !usage) {
      throw new Error("tenant storage policy or usage row missing after ensure");
    }

    if (policy.isUploadBlocked) {
      throw new StorageUploadBlockedError();
    }

    const effectiveLimit = policy.hardQuotaBytes + policy.graceQuotaBytes;

    if (input.idempotencyKey) {
      const [existing] = await tx
        .select()
        .from(documentAttachments)
        .where(
          and(
            eq(documentAttachments.tenantId, input.tenantId),
            eq(documentAttachments.idempotencyKey, input.idempotencyKey)
          )
        )
        .for("update")
        .limit(1);

      if (existing) {
        if (existing.storageStatus === "uploaded" || existing.storageStatus === "verified") {
          throw new StorageUploadAlreadyCompletedError(
            "Upload already completed for this idempotency key",
            existing.attachmentId,
            existing.storageKey
          );
        }

        if (existing.storageStatus === "tombstone") {
          throw new StorageIdempotencyInvalidError();
        }

        const prevSize = BigInt(existing.byteSize);
        const delta = incoming - prevSize;

        if (existing.storageStatus === "failed") {
          const projected = usage.reservedBytes + usage.committedBytes + incoming;
          if (projected > effectiveLimit) {
            throw new StorageQuotaExceededError(
              "Storage quota exceeded",
              effectiveLimit - usage.reservedBytes - usage.committedBytes,
              incoming,
              effectiveLimit
            );
          }
          await tx
            .update(tenantStorageUsage)
            .set({
              reservedBytes: sql`${tenantStorageUsage.reservedBytes} + ${incoming}`,
              updatedAt: new Date(),
            })
            .where(eq(tenantStorageUsage.tenantId, input.tenantId));

          await tx
            .update(documentAttachments)
            .set({
              byteSize: size,
              storageKey: input.storageKey,
              filename: input.filename,
              contentType: input.contentType,
              storageStatus: "pending_upload",
              updatedAt: new Date(),
            })
            .where(eq(documentAttachments.attachmentId, existing.attachmentId));

          return {
            outcome: "resume_pending",
            attachmentId: existing.attachmentId,
            storageKey: input.storageKey,
          };
        }

        if (existing.storageStatus === "pending_upload") {
          if (delta !== 0n) {
            const projected = usage.reservedBytes + usage.committedBytes + delta;
            if (projected > effectiveLimit) {
              throw new StorageQuotaExceededError(
                "Storage quota exceeded",
                effectiveLimit - usage.reservedBytes - usage.committedBytes,
                delta,
                effectiveLimit
              );
            }
            await tx
              .update(tenantStorageUsage)
              .set({
                reservedBytes: sql`${tenantStorageUsage.reservedBytes} + ${delta}`,
                updatedAt: new Date(),
              })
              .where(eq(tenantStorageUsage.tenantId, input.tenantId));
          }

          if (
            existing.storageKey !== input.storageKey ||
            existing.filename !== input.filename ||
            existing.contentType !== input.contentType
          ) {
            await tx
              .update(documentAttachments)
              .set({
                storageKey: input.storageKey,
                filename: input.filename,
                contentType: input.contentType,
                byteSize: size,
                updatedAt: new Date(),
              })
              .where(eq(documentAttachments.attachmentId, existing.attachmentId));
          }

          return {
            outcome: "resume_pending",
            attachmentId: existing.attachmentId,
            storageKey: input.storageKey,
          };
        }
      }
    }

    const projected = usage.reservedBytes + usage.committedBytes + incoming;
    if (projected > effectiveLimit) {
      const remaining = effectiveLimit - usage.reservedBytes - usage.committedBytes;
      throw new StorageQuotaExceededError(
        "Storage quota exceeded",
        remaining > 0n ? remaining : 0n,
        incoming,
        effectiveLimit
      );
    }

    await tx
      .update(tenantStorageUsage)
      .set({
        reservedBytes: sql`${tenantStorageUsage.reservedBytes} + ${incoming}`,
        updatedAt: new Date(),
      })
      .where(eq(tenantStorageUsage.tenantId, input.tenantId));

    await tx.insert(documentAttachments).values({
      attachmentId: input.attachmentId,
      tenantId: input.tenantId,
      entityType: "generic_upload",
      entityId: input.attachmentId,
      filename: input.filename,
      contentType: input.contentType,
      byteSize: size,
      storageKey: input.storageKey,
      uploadedBy: input.uploadedBy ?? null,
      idempotencyKey: input.idempotencyKey ?? null,
      storageStatus: "pending_upload",
      truthResolutionState: "AMBIGUOUS",
      updatedAt: new Date(),
    });

    return {
      outcome: "created",
      attachmentId: input.attachmentId,
      storageKey: input.storageKey,
    };
  });
}

export async function completeTenantAttachmentUploadSuccess(
  db: Database,
  input: { tenantId: number; attachmentId: string; byteSize: number; checksum?: string | null }
): Promise<void> {
  const size = input.byteSize;
  if (!Number.isFinite(size) || size < 0 || !Number.isInteger(size)) {
    throw new Error("byteSize must be a non-negative integer");
  }
  const b = BigInt(size);

  await db.transaction(async (tx) => {
    const [row] = await tx
      .select()
      .from(documentAttachments)
      .where(
        and(
          eq(documentAttachments.tenantId, input.tenantId),
          eq(documentAttachments.attachmentId, input.attachmentId)
        )
      )
      .for("update")
      .limit(1);

    if (!row) {
      throw new Error("attachment not found");
    }
    if (row.storageStatus !== "pending_upload") {
      return;
    }

    await ensureUsageRow(tx, input.tenantId);
    await tx
      .select()
      .from(tenantStorageUsage)
      .where(eq(tenantStorageUsage.tenantId, input.tenantId))
      .for("update")
      .limit(1);

    await tx
      .update(tenantStorageUsage)
      .set({
        reservedBytes: sql`GREATEST(0::bigint, ${tenantStorageUsage.reservedBytes} - ${b})`,
        committedBytes: sql`${tenantStorageUsage.committedBytes} + ${b}`,
        updatedAt: new Date(),
      })
      .where(eq(tenantStorageUsage.tenantId, input.tenantId));

    await tx
      .update(documentAttachments)
      .set({
        storageStatus: "uploaded",
        ...(input.checksum !== undefined && input.checksum !== null && input.checksum.length > 0
          ? { checksum: input.checksum }
          : {}),
        updatedAt: new Date(),
      })
      .where(eq(documentAttachments.attachmentId, input.attachmentId));
  });
}

export async function completeTenantAttachmentUploadFailure(
  db: Database,
  input: { tenantId: number; attachmentId: string; byteSize: number }
): Promise<void> {
  const size = input.byteSize;
  if (!Number.isFinite(size) || size < 0 || !Number.isInteger(size)) {
    throw new Error("byteSize must be a non-negative integer");
  }
  const b = BigInt(size);

  await db.transaction(async (tx) => {
    const [row] = await tx
      .select()
      .from(documentAttachments)
      .where(
        and(
          eq(documentAttachments.tenantId, input.tenantId),
          eq(documentAttachments.attachmentId, input.attachmentId)
        )
      )
      .for("update")
      .limit(1);

    if (!row) {
      return;
    }
    if (row.storageStatus !== "pending_upload") {
      return;
    }

    await ensureUsageRow(tx, input.tenantId);
    await tx
      .select()
      .from(tenantStorageUsage)
      .where(eq(tenantStorageUsage.tenantId, input.tenantId))
      .for("update")
      .limit(1);

    await tx
      .update(tenantStorageUsage)
      .set({
        reservedBytes: sql`GREATEST(0::bigint, ${tenantStorageUsage.reservedBytes} - ${b})`,
        updatedAt: new Date(),
      })
      .where(eq(tenantStorageUsage.tenantId, input.tenantId));

    await tx
      .update(documentAttachments)
      .set({
        storageStatus: "failed",
        updatedAt: new Date(),
      })
      .where(eq(documentAttachments.attachmentId, input.attachmentId));
  });
}

/** Decrement committed bytes when a stored object is permanently removed (e.g. tombstone purge). */
export async function decrementCommittedBytes(
  db: Database,
  input: { tenantId: number; byteSize: number }
): Promise<void> {
  const size = input.byteSize;
  if (!Number.isFinite(size) || size < 0 || !Number.isInteger(size)) {
    throw new Error("byteSize must be a non-negative integer");
  }
  const b = BigInt(size);

  await db.transaction(async (tx) => {
    await ensureUsageRow(tx, input.tenantId);
    await tx
      .select()
      .from(tenantStorageUsage)
      .where(eq(tenantStorageUsage.tenantId, input.tenantId))
      .for("update")
      .limit(1);

    await tx
      .update(tenantStorageUsage)
      .set({
        committedBytes: sql`GREATEST(0::bigint, ${tenantStorageUsage.committedBytes} - ${b})`,
        updatedAt: new Date(),
      })
      .where(eq(tenantStorageUsage.tenantId, input.tenantId));
  });
}

/** Release reservation when reconcile marks a pending row as still missing / abandoned. */
export async function releaseReservedBytes(
  db: Database,
  input: { tenantId: number; byteSize: number }
): Promise<void> {
  const size = input.byteSize;
  if (!Number.isFinite(size) || size < 0 || !Number.isInteger(size)) {
    throw new Error("byteSize must be a non-negative integer");
  }
  const b = BigInt(size);

  await db.transaction(async (tx) => {
    await ensureUsageRow(tx, input.tenantId);
    await tx
      .select()
      .from(tenantStorageUsage)
      .where(eq(tenantStorageUsage.tenantId, input.tenantId))
      .for("update")
      .limit(1);

    await tx
      .update(tenantStorageUsage)
      .set({
        reservedBytes: sql`GREATEST(0::bigint, ${tenantStorageUsage.reservedBytes} - ${b})`,
        updatedAt: new Date(),
      })
      .where(eq(tenantStorageUsage.tenantId, input.tenantId));
  });
}
