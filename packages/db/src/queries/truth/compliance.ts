import { and, eq } from "drizzle-orm";

import type { Database } from "../../client/index.js";
import { documentAttachments, documentPreDecisionBlocks } from "../../schema/reference/tables.js";

import { hasActivePreDecisionBlock } from "./persistence.js";

export async function setAttachmentLegalHold(
  db: Database,
  params: { tenantId: number; attachmentId: string; active: boolean }
): Promise<void> {
  await db
    .update(documentAttachments)
    .set({
      legalHoldActive: params.active,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(documentAttachments.tenantId, params.tenantId),
        eq(documentAttachments.attachmentId, params.attachmentId)
      )
    );

  if (params.active) {
    if (
      !(await hasActivePreDecisionBlock(db, {
        tenantId: params.tenantId,
        attachmentId: params.attachmentId,
        blockType: "DELETE",
      }))
    ) {
      await db.insert(documentPreDecisionBlocks).values({
        tenantId: params.tenantId,
        attachmentId: params.attachmentId,
        blockType: "DELETE",
        blockReasonCode: "R006_LEGAL_HOLD",
        active: true,
      });
    }
  } else {
    await db
      .update(documentPreDecisionBlocks)
      .set({
        active: false,
        clearedAt: new Date(),
      })
      .where(
        and(
          eq(documentPreDecisionBlocks.tenantId, params.tenantId),
          eq(documentPreDecisionBlocks.attachmentId, params.attachmentId),
          eq(documentPreDecisionBlocks.blockType, "DELETE"),
          eq(documentPreDecisionBlocks.active, true)
        )
      );
  }
}

export async function setAttachmentRetentionExpiresAt(
  db: Database,
  params: { tenantId: number; attachmentId: string; retentionExpiresAt: Date | null }
): Promise<void> {
  await db
    .update(documentAttachments)
    .set({
      retentionExpiresAt: params.retentionExpiresAt,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(documentAttachments.tenantId, params.tenantId),
        eq(documentAttachments.attachmentId, params.attachmentId)
      )
    );

  const now = new Date();
  const shouldBlockDelete = params.retentionExpiresAt != null && params.retentionExpiresAt > now;
  if (shouldBlockDelete) {
    if (
      !(await hasActivePreDecisionBlock(db, {
        tenantId: params.tenantId,
        attachmentId: params.attachmentId,
        blockType: "DELETE",
      }))
    ) {
      await db.insert(documentPreDecisionBlocks).values({
        tenantId: params.tenantId,
        attachmentId: params.attachmentId,
        blockType: "DELETE",
        blockReasonCode: "R007_RETENTION_NOT_EXPIRED",
        active: true,
      });
    }
    return;
  }

  await db
    .update(documentPreDecisionBlocks)
    .set({
      active: false,
      clearedAt: new Date(),
    })
    .where(
      and(
        eq(documentPreDecisionBlocks.tenantId, params.tenantId),
        eq(documentPreDecisionBlocks.attachmentId, params.attachmentId),
        eq(documentPreDecisionBlocks.blockType, "DELETE"),
        eq(documentPreDecisionBlocks.active, true)
      )
    );
}

export async function setMalwareScanStatus(
  db: Database,
  params: {
    tenantId: number;
    attachmentId: string;
    status: (typeof documentAttachments.$inferSelect)["malwareScanStatus"];
  }
): Promise<void> {
  await db
    .update(documentAttachments)
    .set({
      malwareScanStatus: params.status,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(documentAttachments.tenantId, params.tenantId),
        eq(documentAttachments.attachmentId, params.attachmentId)
      )
    );

  const shouldBlockWorkflow =
    params.status === "pending" || params.status === "quarantined" || params.status === "failed";
  if (shouldBlockWorkflow) {
    if (
      !(await hasActivePreDecisionBlock(db, {
        tenantId: params.tenantId,
        attachmentId: params.attachmentId,
        blockType: "WORKFLOW_ADVANCE",
      }))
    ) {
      await db.insert(documentPreDecisionBlocks).values({
        tenantId: params.tenantId,
        attachmentId: params.attachmentId,
        blockType: "WORKFLOW_ADVANCE",
        blockReasonCode: "R008_MALWARE_QUARANTINE",
        active: true,
      });
    }
    return;
  }

  await db
    .update(documentPreDecisionBlocks)
    .set({
      active: false,
      clearedAt: new Date(),
    })
    .where(
      and(
        eq(documentPreDecisionBlocks.tenantId, params.tenantId),
        eq(documentPreDecisionBlocks.attachmentId, params.attachmentId),
        eq(documentPreDecisionBlocks.blockType, "WORKFLOW_ADVANCE"),
        eq(documentPreDecisionBlocks.active, true)
      )
    );
}
