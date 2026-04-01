import { and, desc, eq, inArray } from "drizzle-orm";

import type { Database } from "../../drizzle/client/index.js";
import {
  documentAttachments,
  documentPreDecisionBlocks,
  documentTruthDecisions,
  documentTruthOverrides,
  documentTruthResolutionTasks,
} from "../../schema/reference/tables.js";

const MANUAL_OVERRIDE_POLICY_VERSION = "manual-override-v1.0.0";

export async function listAttachmentTruthOverrides(
  db: Database,
  params: { tenantId: number; attachmentId: string }
) {
  return db
    .select()
    .from(documentTruthOverrides)
    .where(
      and(
        eq(documentTruthOverrides.tenantId, params.tenantId),
        eq(documentTruthOverrides.attachmentId, params.attachmentId)
      )
    )
    .orderBy(desc(documentTruthOverrides.createdAt));
}

export async function resolveTruthResolutionTaskWithOverride(
  db: Database,
  params: {
    tenantId: number;
    taskId: string;
    actorUserId?: number | null;
    resolutionStatus: "RESOLVED" | "REJECTED";
    overrideOutcome: "CONFIRMED_BLOCK" | "FALSE_BLOCK" | "WAIVED";
    overrideRecommendedAction: "ALLOW" | "ESCALATE" | "BLOCK";
    reason: string;
    evidenceRefs?: Record<string, unknown>;
  }
): Promise<void> {
  const [task] = await db
    .select()
    .from(documentTruthResolutionTasks)
    .where(
      and(
        eq(documentTruthResolutionTasks.tenantId, params.tenantId),
        eq(documentTruthResolutionTasks.taskId, params.taskId)
      )
    )
    .limit(1);
  if (!task) {
    return;
  }

  const [latestDecision] = await db
    .select()
    .from(documentTruthDecisions)
    .where(
      and(
        eq(documentTruthDecisions.tenantId, params.tenantId),
        eq(documentTruthDecisions.attachmentId, task.attachmentId)
      )
    )
    .orderBy(desc(documentTruthDecisions.compiledAt))
    .limit(1);
  if (!latestDecision) {
    return;
  }

  await db.insert(documentTruthOverrides).values({
    tenantId: params.tenantId,
    attachmentId: task.attachmentId,
    taskId: task.taskId,
    actorUserId: params.actorUserId ?? null,
    overrideOutcome: params.overrideOutcome,
    previousRecommendedAction: latestDecision.recommendedAction,
    overrideRecommendedAction: params.overrideRecommendedAction,
    reason: params.reason,
    evidenceRefs: params.evidenceRefs ?? {},
  });

  await db
    .update(documentTruthResolutionTasks)
    .set({
      taskStatus: params.resolutionStatus,
      resolvedAt: new Date(),
    })
    .where(
      and(
        eq(documentTruthResolutionTasks.tenantId, params.tenantId),
        eq(documentTruthResolutionTasks.taskId, params.taskId)
      )
    );

  const resolutionState =
    params.overrideRecommendedAction === "ALLOW"
      ? "RESOLVED"
      : params.overrideRecommendedAction === "ESCALATE"
        ? "AMBIGUOUS"
        : "REJECTED";

  await db.insert(documentTruthDecisions).values({
    tenantId: params.tenantId,
    attachmentId: task.attachmentId,
    resolutionState,
    recommendedAction: params.overrideRecommendedAction,
    duplicateRisk: latestDecision.duplicateRisk,
    financialImpactAmount: latestDecision.financialImpactAmount,
    requiresHumanReview: params.overrideRecommendedAction !== "ALLOW",
    decisionReasons: ["MANUAL_OVERRIDE", `OVERRIDE_${params.overrideOutcome}`],
    evidenceRefs: params.evidenceRefs ?? {},
    policyVersion: MANUAL_OVERRIDE_POLICY_VERSION,
  });

  await db
    .update(documentAttachments)
    .set({
      truthResolutionState: resolutionState,
      truthPolicyVersion: MANUAL_OVERRIDE_POLICY_VERSION,
      truthDecisionAt: new Date(),
      truthRequiresReview: params.overrideRecommendedAction !== "ALLOW",
      truthDecisionSummary: {
        recommendedAction: params.overrideRecommendedAction,
        decisionReasons: ["MANUAL_OVERRIDE", `OVERRIDE_${params.overrideOutcome}`],
        overrideReason: params.reason,
      },
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(documentAttachments.tenantId, params.tenantId),
        eq(documentAttachments.attachmentId, task.attachmentId)
      )
    );

  if (params.overrideRecommendedAction === "ALLOW") {
    await db
      .update(documentPreDecisionBlocks)
      .set({
        active: false,
        clearedAt: new Date(),
      })
      .where(
        and(
          eq(documentPreDecisionBlocks.tenantId, params.tenantId),
          eq(documentPreDecisionBlocks.attachmentId, task.attachmentId),
          eq(documentPreDecisionBlocks.active, true)
        )
      );
    return;
  }

  if (params.overrideRecommendedAction === "BLOCK") {
    await db
      .update(documentPreDecisionBlocks)
      .set({
        active: false,
        clearedAt: new Date(),
      })
      .where(
        and(
          eq(documentPreDecisionBlocks.tenantId, params.tenantId),
          eq(documentPreDecisionBlocks.attachmentId, task.attachmentId),
          inArray(documentPreDecisionBlocks.blockType, ["PAYMENT", "CONTRACT_EXECUTION", "WORKFLOW_ADVANCE"]),
          eq(documentPreDecisionBlocks.active, true)
        )
      );
  }
}
