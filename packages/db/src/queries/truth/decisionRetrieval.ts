import { and, desc, eq, ilike, inArray, or } from "drizzle-orm";

import type { Database } from "../../drizzle/client/index.js";
import {
  documentAttachments,
  documentGuardrailEvents,
  documentPreDecisionBlocks,
  documentTruthOverrides,
  documentSignatureAttestations,
  documentTruthDecisions,
  documentTruthResolutionTasks,
} from "../../schema/reference/tables.js";

export async function getLatestTruthDecision(
  db: Database,
  params: { tenantId: number; attachmentId: string }
) {
  const [row] = await db
    .select()
    .from(documentTruthDecisions)
    .where(
      and(
        eq(documentTruthDecisions.tenantId, params.tenantId),
        eq(documentTruthDecisions.attachmentId, params.attachmentId)
      )
    )
    .orderBy(desc(documentTruthDecisions.compiledAt))
    .limit(1);
  return row ?? null;
}

export async function getAttachmentTruthSummary(
  db: Database,
  params: { tenantId: number; attachmentId: string }
) {
  const [att] = await db
    .select()
    .from(documentAttachments)
    .where(
      and(
        eq(documentAttachments.tenantId, params.tenantId),
        eq(documentAttachments.attachmentId, params.attachmentId)
      )
    )
    .limit(1);
  if (!att) return null;

  const decision = await getLatestTruthDecision(db, params);
  const [openTask] = await db
    .select()
    .from(documentTruthResolutionTasks)
    .where(
      and(
        eq(documentTruthResolutionTasks.tenantId, params.tenantId),
        eq(documentTruthResolutionTasks.attachmentId, params.attachmentId),
        inArray(documentTruthResolutionTasks.taskStatus, ["OPEN", "IN_REVIEW"])
      )
    )
    .orderBy(desc(documentTruthResolutionTasks.openedAt))
    .limit(1);

  return {
    attachment: att,
    latestDecision: decision,
    latestTask: openTask ?? null,
  };
}

export async function listOpenTruthResolutionTasks(
  db: Database,
  params: { tenantId: number; limit?: number }
) {
  const lim = params.limit ?? 50;
  return db
    .select()
    .from(documentTruthResolutionTasks)
    .where(
      and(
        eq(documentTruthResolutionTasks.tenantId, params.tenantId),
        inArray(documentTruthResolutionTasks.taskStatus, ["OPEN", "IN_REVIEW"])
      )
    )
    .orderBy(desc(documentTruthResolutionTasks.openedAt))
    .limit(lim);
}

export async function listActivePreDecisionBlocks(
  db: Database,
  params: { tenantId: number; attachmentId: string }
) {
  return db
    .select()
    .from(documentPreDecisionBlocks)
    .where(
      and(
        eq(documentPreDecisionBlocks.tenantId, params.tenantId),
        eq(documentPreDecisionBlocks.attachmentId, params.attachmentId),
        eq(documentPreDecisionBlocks.active, true)
      )
    )
    .orderBy(desc(documentPreDecisionBlocks.createdAt));
}

export async function exportAttachmentChainOfCustody(
  db: Database,
  params: { tenantId: number; attachmentId: string; decisionLimit?: number }
) {
  const decisionLimit = params.decisionLimit ?? 200;
  const [attachment] = await db
    .select()
    .from(documentAttachments)
    .where(
      and(
        eq(documentAttachments.tenantId, params.tenantId),
        eq(documentAttachments.attachmentId, params.attachmentId)
      )
    )
    .limit(1);
  if (!attachment) return null;

  const decisions = await db
    .select()
    .from(documentTruthDecisions)
    .where(
      and(
        eq(documentTruthDecisions.tenantId, params.tenantId),
        eq(documentTruthDecisions.attachmentId, params.attachmentId)
      )
    )
    .orderBy(desc(documentTruthDecisions.compiledAt))
    .limit(decisionLimit);

  const tasks = await db
    .select()
    .from(documentTruthResolutionTasks)
    .where(
      and(
        eq(documentTruthResolutionTasks.tenantId, params.tenantId),
        eq(documentTruthResolutionTasks.attachmentId, params.attachmentId)
      )
    )
    .orderBy(desc(documentTruthResolutionTasks.openedAt))
    .limit(100);

  const blocks = await db
    .select()
    .from(documentPreDecisionBlocks)
    .where(
      and(
        eq(documentPreDecisionBlocks.tenantId, params.tenantId),
        eq(documentPreDecisionBlocks.attachmentId, params.attachmentId)
      )
    )
    .orderBy(desc(documentPreDecisionBlocks.createdAt))
    .limit(200);

  const signatures = await db
    .select()
    .from(documentSignatureAttestations)
    .where(
      and(
        eq(documentSignatureAttestations.tenantId, params.tenantId),
        eq(documentSignatureAttestations.attachmentId, params.attachmentId)
      )
    )
    .orderBy(desc(documentSignatureAttestations.createdAt))
    .limit(200);

  const overrides = await db
    .select()
    .from(documentTruthOverrides)
    .where(
      and(
        eq(documentTruthOverrides.tenantId, params.tenantId),
        eq(documentTruthOverrides.attachmentId, params.attachmentId)
      )
    )
    .orderBy(desc(documentTruthOverrides.createdAt))
    .limit(200);

  const guardrailEvents = await db
    .select()
    .from(documentGuardrailEvents)
    .where(
      and(
        eq(documentGuardrailEvents.tenantId, params.tenantId),
        eq(documentGuardrailEvents.attachmentId, params.attachmentId)
      )
    )
    .orderBy(desc(documentGuardrailEvents.createdAt))
    .limit(200);

  return { attachment, decisions, tasks, blocks, signatures, overrides, guardrailEvents };
}

export async function queryTruthDecisionsByIntent(
  db: Database,
  params: { tenantId: number; query: string; limit?: number }
) {
  const lim = params.limit ?? 20;
  const q = `%${params.query.trim()}%`;
  if (params.query.trim().length < 2) return [];

  return db
    .select({
      attachmentId: documentAttachments.attachmentId,
      filename: documentAttachments.filename,
      contentType: documentAttachments.contentType,
      entityType: documentAttachments.entityType,
      truthResolutionState: documentAttachments.truthResolutionState,
      truthDecisionAt: documentAttachments.truthDecisionAt,
      truthDecisionSummary: documentAttachments.truthDecisionSummary,
    })
    .from(documentAttachments)
    .where(
      and(
        eq(documentAttachments.tenantId, params.tenantId),
        or(
          ilike(documentAttachments.filename, q),
          ilike(documentAttachments.contentType, q),
          ilike(documentAttachments.entityType, q),
          ilike(documentAttachments.storageKey, q)
        )
      )
    )
    .orderBy(desc(documentAttachments.updatedAt))
    .limit(lim);
}
