import { and, desc, eq } from "drizzle-orm";

import type { Database } from "../../drizzle/client/index.js";
import { documentAttachments, documentGuardrailEvents, documentPreDecisionBlocks } from "../../schema/reference/tables.js";

type GuardrailAction = "PAYMENT" | "CONTRACT_EXECUTION" | "DELETE" | "WORKFLOW_ADVANCE";

export async function evaluateAndLogPreDecisionGuardrail(
  db: Database,
  params: {
    tenantId: number;
    attachmentId: string;
    attemptedAction: GuardrailAction;
    actorUserId?: number | null;
    context?: Record<string, unknown>;
  }
) {
  const [attachment] = await db
    .select({
      attachmentId: documentAttachments.attachmentId,
      truthResolutionState: documentAttachments.truthResolutionState,
      legalHoldActive: documentAttachments.legalHoldActive,
      retentionExpiresAt: documentAttachments.retentionExpiresAt,
    })
    .from(documentAttachments)
    .where(
      and(
        eq(documentAttachments.tenantId, params.tenantId),
        eq(documentAttachments.attachmentId, params.attachmentId)
      )
    )
    .limit(1);

  if (!attachment) {
    return {
      blocked: true,
      reasonCodes: ["ATTACHMENT_NOT_FOUND"],
      activeBlocks: [],
    };
  }

  const activeBlocks = await db
    .select()
    .from(documentPreDecisionBlocks)
    .where(
      and(
        eq(documentPreDecisionBlocks.tenantId, params.tenantId),
        eq(documentPreDecisionBlocks.attachmentId, params.attachmentId),
        eq(documentPreDecisionBlocks.blockType, params.attemptedAction),
        eq(documentPreDecisionBlocks.active, true)
      )
    );

  const reasons = new Set<string>(activeBlocks.map((b) => b.blockReasonCode));

  if (
    params.attemptedAction !== "DELETE" &&
    attachment.truthResolutionState !== "RESOLVED"
  ) {
    reasons.add("TRUTH_NOT_RESOLVED");
  }
  if (params.attemptedAction === "DELETE") {
    if (attachment.legalHoldActive) reasons.add("R006_LEGAL_HOLD_ACTIVE");
    if (attachment.retentionExpiresAt && attachment.retentionExpiresAt > new Date()) {
      reasons.add("R007_RETENTION_NOT_EXPIRED");
    }
  }

  const reasonCodes = [...reasons];
  const blocked = reasonCodes.length > 0;

  await db.insert(documentGuardrailEvents).values({
    tenantId: params.tenantId,
    attachmentId: params.attachmentId,
    attemptedAction: params.attemptedAction,
    blocked,
    reasonCodes,
    actorUserId: params.actorUserId ?? null,
    context: params.context ?? {},
  });

  return {
    blocked,
    reasonCodes,
    activeBlocks,
  };
}

export async function listAttachmentGuardrailEvents(
  db: Database,
  params: { tenantId: number; attachmentId: string; limit?: number }
) {
  return db
    .select()
    .from(documentGuardrailEvents)
    .where(
      and(
        eq(documentGuardrailEvents.tenantId, params.tenantId),
        eq(documentGuardrailEvents.attachmentId, params.attachmentId)
      )
    )
    .orderBy(desc(documentGuardrailEvents.createdAt))
    .limit(params.limit ?? 100);
}
