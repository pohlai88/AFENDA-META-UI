import { and, eq, inArray, ne, sql } from "drizzle-orm";

import type { Database } from "../../drizzle/client/index.js";
import {
  documentAttachments,
  documentPreDecisionBlocks,
  documentTruthDecisions,
  documentTruthResolutionTasks,
} from "../../schema/reference/tables.js";

import type { TruthDecisionEnvelope } from "./contracts.js";

export async function insertTruthDecisionRow(
  db: Database,
  params: {
    tenantId: number;
    attachmentId: string;
    envelope: TruthDecisionEnvelope;
  }
): Promise<void> {
  await db.insert(documentTruthDecisions).values({
    tenantId: params.tenantId,
    attachmentId: params.attachmentId,
    resolutionState: params.envelope.resolutionState,
    recommendedAction: params.envelope.recommendedAction,
    duplicateRisk: params.envelope.duplicateRisk,
    financialImpactAmount: params.envelope.financialImpactAmount,
    requiresHumanReview: params.envelope.requiresHumanReview,
    decisionReasons: params.envelope.decisionReasons,
    evidenceRefs: params.envelope.evidenceRefs,
    policyVersion: params.envelope.policyVersion,
  });
}

export async function updateAttachmentTruthState(
  db: Database,
  params: {
    tenantId: number;
    attachmentId: string;
    envelope: TruthDecisionEnvelope;
  }
): Promise<void> {
  await db
    .update(documentAttachments)
    .set({
      truthResolutionState: params.envelope.resolutionState,
      truthPolicyVersion: params.envelope.policyVersion,
      truthDecisionAt: new Date(),
      truthDecisionSummary: {
        recommendedAction: params.envelope.recommendedAction,
        decisionReasons: params.envelope.decisionReasons,
        duplicateRisk: params.envelope.duplicateRisk,
      },
      truthRequiresReview: params.envelope.requiresHumanReview,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(documentAttachments.tenantId, params.tenantId),
        eq(documentAttachments.attachmentId, params.attachmentId)
      )
    );
}

export async function createTruthResolutionTaskIfNeeded(
  db: Database,
  params: {
    tenantId: number;
    attachmentId: string;
    envelope: TruthDecisionEnvelope;
  }
): Promise<void> {
  if (params.envelope.resolutionState !== "AMBIGUOUS") {
    return;
  }
  const [existing] = await db
    .select({ taskId: documentTruthResolutionTasks.taskId })
    .from(documentTruthResolutionTasks)
    .where(
      and(
        eq(documentTruthResolutionTasks.tenantId, params.tenantId),
        eq(documentTruthResolutionTasks.attachmentId, params.attachmentId),
        inArray(documentTruthResolutionTasks.taskStatus, ["OPEN", "IN_REVIEW"])
      )
    )
    .limit(1);
  if (existing) {
    return;
  }
  const blockedEffects = ["PAYMENT", "WORKFLOW_ADVANCE"] as const;
  await db.insert(documentTruthResolutionTasks).values({
    tenantId: params.tenantId,
    attachmentId: params.attachmentId,
    taskStatus: "OPEN",
    openedReasonCodes: params.envelope.decisionReasons,
    blockedEffects: [...blockedEffects],
  });
}

export async function upsertPreDecisionBlocksFromEnvelope(
  db: Database,
  params: {
    tenantId: number;
    attachmentId: string;
    envelope: TruthDecisionEnvelope;
  }
): Promise<void> {
  const managedBlockTypes = ["PAYMENT", "CONTRACT_EXECUTION", "DELETE", "WORKFLOW_ADVANCE"] as const;
  const desired = new Set<(typeof managedBlockTypes)[number]>();
  const codes = params.envelope.decisionReasons;

  // Guardrail: ambiguous truth should block downstream workflow progression.
  if (params.envelope.resolutionState === "AMBIGUOUS") {
    desired.add("WORKFLOW_ADVANCE");
  }

  if (
    params.envelope.recommendedAction === "BLOCK" &&
    codes.some((c) => c.includes("DUPLICATE") || c.includes("R001") || c.includes("R004"))
  ) {
    desired.add("PAYMENT");
  }
  if (params.envelope.recommendedAction === "BLOCK" && codes.some((c) => c.includes("R005"))) {
    desired.add("CONTRACT_EXECUTION");
  }
  if (codes.some((c) => c.includes("R006") || c.includes("R007"))) {
    desired.add("DELETE");
  }
  if (codes.some((c) => c.includes("R008"))) {
    desired.add("WORKFLOW_ADVANCE");
  }

  for (const blockType of desired) {
    if (
      !(await hasActivePreDecisionBlock(db, {
        tenantId: params.tenantId,
        attachmentId: params.attachmentId,
        blockType,
      }))
    ) {
      const defaultReasonCode: Record<(typeof managedBlockTypes)[number], string> = {
        PAYMENT: "BLOCK_PAYMENT",
        CONTRACT_EXECUTION: "R005_STALE_CONTRACT_VERSION",
        DELETE: "R006_OR_R007_DELETE_GUARD",
        WORKFLOW_ADVANCE: "R009_OR_R008_WORKFLOW_BLOCK",
      };
      await db.insert(documentPreDecisionBlocks).values({
        tenantId: params.tenantId,
        attachmentId: params.attachmentId,
        blockType,
        blockReasonCode: codes.find((c) => c.startsWith("R")) ?? defaultReasonCode[blockType],
        active: true,
      });
    }
  }

  const removeBlockTypes = managedBlockTypes.filter((type) => !desired.has(type));
  if (removeBlockTypes.length > 0) {
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
          inArray(documentPreDecisionBlocks.blockType, removeBlockTypes),
          eq(documentPreDecisionBlocks.active, true)
        )
      );
  }
}

export async function hasActivePreDecisionBlock(
  db: Database,
  params: {
    tenantId: number;
    attachmentId: string;
    blockType: "PAYMENT" | "CONTRACT_EXECUTION" | "DELETE" | "WORKFLOW_ADVANCE";
  }
): Promise<boolean> {
  const [row] = await db
    .select({ c: sql<number>`count(*)::int` })
    .from(documentPreDecisionBlocks)
    .where(
      and(
        eq(documentPreDecisionBlocks.tenantId, params.tenantId),
        eq(documentPreDecisionBlocks.attachmentId, params.attachmentId),
        eq(documentPreDecisionBlocks.blockType, params.blockType),
        eq(documentPreDecisionBlocks.active, true)
      )
    );
  return (row?.c ?? 0) > 0;
}

/** Count other non-tombstone attachments with same checksum (duplicate signal). */
export async function countDuplicateChecksumPeers(
  db: Database,
  params: { tenantId: number; checksum: string | null; excludeAttachmentId: string }
): Promise<number> {
  if (!params.checksum) return 0;
  const [row] = await db
    .select({ c: sql<number>`count(*)::int` })
    .from(documentAttachments)
    .where(
      and(
        eq(documentAttachments.tenantId, params.tenantId),
        eq(documentAttachments.checksum, params.checksum),
        ne(documentAttachments.attachmentId, params.excludeAttachmentId),
        ne(documentAttachments.storageStatus, "tombstone")
      )
    );
  return row?.c ?? 0;
}
