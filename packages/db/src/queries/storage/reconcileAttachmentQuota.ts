import type { Database } from "../../drizzle/client/index.js";
import {
  completeTenantAttachmentUploadFailure,
  completeTenantAttachmentUploadSuccess,
} from "./tenantUploadQuota.js";

/**
 * Apply {@link reconcilePendingStorageUploads} outcomes while keeping quota counters aligned.
 * Call from `applyOutcome` when the row maps to `reference.document_attachments`.
 */
export async function applyAttachmentReconcileOutcome(
  db: Database,
  input: {
    tenantId: number;
    attachmentId: string;
    byteSize: number;
    outcome: "uploaded" | "verified" | "still_missing";
  }
): Promise<void> {
  if (input.outcome === "still_missing") {
    await completeTenantAttachmentUploadFailure(db, {
      tenantId: input.tenantId,
      attachmentId: input.attachmentId,
      byteSize: input.byteSize,
    });
    return;
  }

  await completeTenantAttachmentUploadSuccess(db, {
    tenantId: input.tenantId,
    attachmentId: input.attachmentId,
    byteSize: input.byteSize,
  });
}
