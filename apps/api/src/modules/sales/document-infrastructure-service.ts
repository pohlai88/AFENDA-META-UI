import type { SalesTruthDocumentType } from "@afenda/db/schema/sales";
import {
  assertAccountingPostingAllowed,
  resolveAccountingPostingTruth,
  TruthPipelineBlockedError,
} from "@afenda/db/queries/sales";

/** Must match {@link ORDER_CONFIRMATION_POSTING_ENTRY_TYPE} in `@afenda/db` (confirmation pipeline stub). */
const ORDER_CONFIRMATION_ACCRUAL_ENTRY_TYPE = "order_confirmation_accrual";
import { and, desc, eq, isNull, lt, lte, ne, or, sql } from "drizzle-orm";

import { db } from "../../db/index.js";
import {
  accountingPostings,
  documentApprovals,
  documentStatusHistory,
  roundingPolicies,
  salesDocumentAttachments,
} from "../../db/schema/index.js";
import { NotFoundError, ValidationError } from "../../middleware/errorHandler.js";
import { recordDomainEvent } from "../../utils/audit-logs.js";

export interface RecordDocumentStatusHistoryInput {
  tenantId: number;
  actorId: number;
  documentType: SalesTruthDocumentType;
  documentId: string;
  toStatus: string;
  fromStatus?: string | null;
  transitionedAt?: Date;
  reason?: string;
  notes?: string;
}

export interface RecordDocumentStatusHistoryResult {
  entry: typeof documentStatusHistory.$inferSelect;
}

export interface CreateDocumentApprovalRequestInput {
  tenantId: number;
  actorId: number;
  documentType: SalesTruthDocumentType;
  documentId: string;
  approvalLevel: number;
  approverUserId: number;
  approverRole?: string;
  comments?: string;
  documentAmount?: string;
}

export interface CreateDocumentApprovalRequestResult {
  approval: typeof documentApprovals.$inferSelect;
}

export interface ProcessDocumentApprovalInput {
  tenantId: number;
  actorId: number;
  approvalId: string;
  comments?: string;
}

export interface ProcessDocumentApprovalResult {
  approval: typeof documentApprovals.$inferSelect;
}

export interface RegisterDocumentAttachmentInput {
  tenantId: number;
  actorId: number;
  documentType: SalesTruthDocumentType;
  documentId: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  storageProvider: string;
  storagePath: string;
  storageUrl?: string;
  attachmentType?: string;
  description?: string;
  isPublic?: boolean;
}

export interface RegisterDocumentAttachmentResult {
  attachment: typeof salesDocumentAttachments.$inferSelect;
}

export interface PostAccountingEntryInput {
  tenantId: number;
  actorId: number;
  sourceDocumentType: SalesTruthDocumentType;
  sourceDocumentId: string;
  /** Required for `posted` rows — enforced in DB and by the posting truth gate. */
  truthBindingId: string;
  /**
   * Idempotency key with `truthBindingId` (partial unique index). Defaults to `general`.
   * Retries with the same binding + type return the existing **posted** row.
   */
  postingEntryType?: string;
  postingDate?: Date;
  debitAccountCode: string;
  creditAccountCode: string;
  amount: string;
  currencyCode: string;
  journalEntryId?: string;
}

export interface PostAccountingEntryResult {
  posting: typeof accountingPostings.$inferSelect;
  /** True when a prior posted row was returned instead of inserting. */
  idempotentReplay?: boolean;
}

export interface ReverseAccountingPostingInput {
  tenantId: number;
  actorId: number;
  postingId: string;
  reversalDate?: Date;
  reversalReason?: string;
}

export interface ReverseAccountingPostingResult {
  posting: typeof accountingPostings.$inferSelect;
  reversalPosting: typeof accountingPostings.$inferSelect;
}

export interface ResolveRoundingPolicyInput {
  tenantId: number;
  policyKey: string;
  appliesTo: string;
  currencyCode?: string;
  effectiveAt?: Date;
}

export interface ResolveRoundingPolicyResult {
  policy: typeof roundingPolicies.$inferSelect;
  resolution: "currency-match" | "default-currency";
}

export async function recordDocumentStatusHistory(
  input: RecordDocumentStatusHistoryInput
): Promise<RecordDocumentStatusHistoryResult> {
  const [entry] = await db
    .insert(documentStatusHistory)
    .values({
      tenantId: input.tenantId,
      documentType: input.documentType,
      documentId: input.documentId,
      fromStatus: input.fromStatus ?? null,
      toStatus: input.toStatus,
      transitionedAt: input.transitionedAt ?? new Date(),
      transitionedBy: input.actorId,
      reason: input.reason ?? null,
      notes: input.notes ?? null,
      createdBy: input.actorId,
      updatedBy: input.actorId,
    })
    .returning();

  if (!entry) {
    throw new ValidationError("Unable to record document status history entry.");
  }

  await recordDomainEvent({
    tenantId: input.tenantId,
    eventType: "DOCUMENT_STATUS_CHANGED",
    entityType: input.documentType,
    entityId: input.documentId,
    payload: {
      fromStatus: input.fromStatus ?? null,
      toStatus: input.toStatus,
      reason: input.reason ?? null,
    },
    triggeredBy: input.actorId,
    actorId: input.actorId,
  });

  return { entry };
}

export async function createDocumentApprovalRequest(
  input: CreateDocumentApprovalRequestInput
): Promise<CreateDocumentApprovalRequestResult> {
  if (input.approvalLevel < 1) {
    throw new ValidationError("approvalLevel must be >= 1.");
  }

  const [approval] = await db
    .insert(documentApprovals)
    .values({
      tenantId: input.tenantId,
      documentType: input.documentType,
      documentId: input.documentId,
      approvalLevel: input.approvalLevel,
      approverUserId: input.approverUserId,
      approverRole: input.approverRole ?? null,
      status: "pending",
      comments: input.comments ?? null,
      documentAmount: input.documentAmount ?? null,
      createdBy: input.actorId,
      updatedBy: input.actorId,
    })
    .returning();

  if (!approval) {
    throw new ValidationError("Unable to create approval request.");
  }

  await recordDomainEvent({
    tenantId: input.tenantId,
    eventType: "DOCUMENT_APPROVAL_REQUESTED",
    entityType: input.documentType,
    entityId: input.documentId,
    payload: {
      approvalId: approval.id,
      approvalLevel: input.approvalLevel,
      approverUserId: input.approverUserId,
    },
    triggeredBy: input.actorId,
    actorId: input.actorId,
  });

  return { approval };
}

export async function approveDocument(
  input: ProcessDocumentApprovalInput
): Promise<ProcessDocumentApprovalResult> {
  const approval = await loadDocumentApproval(input.tenantId, input.approvalId);

  if (approval.approverUserId !== input.actorId) {
    throw new ValidationError("Only the assigned approver can approve this request.");
  }

  if (approval.status !== "pending") {
    throw new ValidationError("Only pending approval requests can be approved.");
  }

  const [blockedByLower] = await db
    .select({ id: documentApprovals.id })
    .from(documentApprovals)
    .where(
      and(
        eq(documentApprovals.tenantId, input.tenantId),
        eq(documentApprovals.documentType, approval.documentType),
        eq(documentApprovals.documentId, approval.documentId),
        lt(documentApprovals.approvalLevel, approval.approvalLevel),
        ne(documentApprovals.status, "approved")
      )
    )
    .limit(1);

  if (blockedByLower) {
    throw new ValidationError(
      "Lower approval levels must be approved before this level can be approved."
    );
  }

  const [updatedApproval] = await db
    .update(documentApprovals)
    .set({
      status: "approved",
      approvedAt: new Date(),
      rejectedAt: null,
      comments: input.comments ?? approval.comments,
      updatedBy: input.actorId,
    })
    .where(
      and(
        eq(documentApprovals.tenantId, input.tenantId),
        eq(documentApprovals.id, input.approvalId)
      )
    )
    .returning();

  if (!updatedApproval) {
    throw new NotFoundError(
      `Approval request ${input.approvalId} was not found for tenant ${input.tenantId}.`
    );
  }

  await recordDomainEvent({
    tenantId: input.tenantId,
    eventType: "DOCUMENT_APPROVED",
    entityType: updatedApproval.documentType,
    entityId: updatedApproval.documentId,
    payload: {
      approvalId: updatedApproval.id,
      approvalLevel: updatedApproval.approvalLevel,
    },
    triggeredBy: input.actorId,
    actorId: input.actorId,
  });

  return { approval: updatedApproval };
}

export async function rejectDocument(
  input: ProcessDocumentApprovalInput
): Promise<ProcessDocumentApprovalResult> {
  const approval = await loadDocumentApproval(input.tenantId, input.approvalId);

  if (approval.approverUserId !== input.actorId) {
    throw new ValidationError("Only the assigned approver can reject this request.");
  }

  if (approval.status !== "pending") {
    throw new ValidationError("Only pending approval requests can be rejected.");
  }

  const [updatedApproval] = await db
    .update(documentApprovals)
    .set({
      status: "rejected",
      rejectedAt: new Date(),
      approvedAt: null,
      comments: input.comments ?? approval.comments,
      updatedBy: input.actorId,
    })
    .where(
      and(
        eq(documentApprovals.tenantId, input.tenantId),
        eq(documentApprovals.id, input.approvalId)
      )
    )
    .returning();

  if (!updatedApproval) {
    throw new NotFoundError(
      `Approval request ${input.approvalId} was not found for tenant ${input.tenantId}.`
    );
  }

  await recordDomainEvent({
    tenantId: input.tenantId,
    eventType: "DOCUMENT_REJECTED",
    entityType: updatedApproval.documentType,
    entityId: updatedApproval.documentId,
    payload: {
      approvalId: updatedApproval.id,
      approvalLevel: updatedApproval.approvalLevel,
      comments: updatedApproval.comments,
    },
    triggeredBy: input.actorId,
    actorId: input.actorId,
  });

  return { approval: updatedApproval };
}

export async function registerDocumentAttachment(
  input: RegisterDocumentAttachmentInput
): Promise<RegisterDocumentAttachmentResult> {
  if (input.fileSize < 0) {
    throw new ValidationError("fileSize must be >= 0.");
  }

  const [attachment] = await db
    .insert(salesDocumentAttachments)
    .values({
      tenantId: input.tenantId,
      documentType: input.documentType,
      documentId: input.documentId,
      fileName: input.fileName,
      fileSize: input.fileSize,
      mimeType: input.mimeType,
      storageProvider: input.storageProvider,
      storagePath: input.storagePath,
      storageUrl: input.storageUrl ?? null,
      attachmentType: input.attachmentType ?? null,
      description: input.description ?? null,
      isPublic: input.isPublic ?? false,
      createdBy: input.actorId,
      updatedBy: input.actorId,
    })
    .returning();

  if (!attachment) {
    throw new ValidationError("Unable to register document attachment.");
  }

  await recordDomainEvent({
    tenantId: input.tenantId,
    eventType: "DOCUMENT_ATTACHMENT_REGISTERED",
    entityType: input.documentType,
    entityId: input.documentId,
    payload: {
      attachmentId: attachment.id,
      fileName: attachment.fileName,
      storageProvider: attachment.storageProvider,
      isPublic: attachment.isPublic,
    },
    triggeredBy: input.actorId,
    actorId: input.actorId,
  });

  return { attachment };
}

export async function postAccountingEntry(
  input: PostAccountingEntryInput
): Promise<PostAccountingEntryResult> {
  const postedAt = input.postingDate ?? new Date();
  const postingEntryType = input.postingEntryType ?? "general";

  try {
    assertAccountingPostingAllowed(
      resolveAccountingPostingTruth({
        postingStatus: "posted",
        truthBindingId: input.truthBindingId,
        debitAccountCode: input.debitAccountCode,
        creditAccountCode: input.creditAccountCode,
      })
    );
  } catch (e) {
    if (e instanceof TruthPipelineBlockedError) {
      throw new ValidationError(e.message);
    }
    throw e;
  }

  const [existingPosted] = await db
    .select()
    .from(accountingPostings)
    .where(
      and(
        eq(accountingPostings.tenantId, input.tenantId),
        eq(accountingPostings.truthBindingId, input.truthBindingId),
        eq(accountingPostings.postingEntryType, postingEntryType),
        eq(accountingPostings.postingStatus, "posted")
      )
    )
    .limit(1);

  if (existingPosted) {
    return { posting: existingPosted, idempotentReplay: true };
  }

  const [posting] = await db
    .insert(accountingPostings)
    .values({
      tenantId: input.tenantId,
      truthBindingId: input.truthBindingId,
      postingEntryType,
      sourceDocumentType: input.sourceDocumentType,
      sourceDocumentId: input.sourceDocumentId,
      journalEntryId: input.journalEntryId ?? null,
      postingDate: postedAt,
      debitAccountCode: input.debitAccountCode,
      creditAccountCode: input.creditAccountCode,
      amount: input.amount,
      currencyCode: input.currencyCode,
      postingStatus: "posted",
      postedBy: input.actorId,
      postedAt,
      createdBy: input.actorId,
      updatedBy: input.actorId,
    })
    .returning();

  if (!posting) {
    throw new ValidationError("Unable to post accounting entry.");
  }

  await recordDomainEvent({
    tenantId: input.tenantId,
    eventType: "ACCOUNTING_POSTING_CREATED",
    entityType: input.sourceDocumentType,
    entityId: input.sourceDocumentId,
    payload: {
      postingId: posting.id,
      amount: posting.amount,
      currencyCode: posting.currencyCode,
      postingStatus: posting.postingStatus,
    },
    triggeredBy: input.actorId,
    actorId: input.actorId,
  });

  return { posting };
}

export async function reverseAccountingPosting(
  input: ReverseAccountingPostingInput
): Promise<ReverseAccountingPostingResult> {
  const posting = await loadAccountingPosting(input.tenantId, input.postingId);

  if (posting.postingStatus !== "posted") {
    throw new ValidationError("Only posted accounting entries can be reversed.");
  }

  if (posting.reversedAt) {
    throw new ValidationError("Accounting entry has already been reversed.");
  }

  const reversalAt = input.reversalDate ?? new Date();

  if (posting.truthBindingId == null) {
    throw new ValidationError("Cannot reverse a posting that is not anchored to a truth binding.");
  }

  const baseEntryType = posting.postingEntryType ?? "general";
  const reversalEntryType =
    baseEntryType === ORDER_CONFIRMATION_ACCRUAL_ENTRY_TYPE
      ? `${ORDER_CONFIRMATION_ACCRUAL_ENTRY_TYPE}_reversal`
      : `${baseEntryType}_reversal`;

  const [reversalPosting] = await db
    .insert(accountingPostings)
    .values({
      tenantId: input.tenantId,
      truthBindingId: posting.truthBindingId,
      postingEntryType: reversalEntryType,
      sourceDocumentType: posting.sourceDocumentType,
      sourceDocumentId: posting.sourceDocumentId,
      journalEntryId: posting.journalEntryId,
      postingDate: reversalAt,
      debitAccountCode: posting.creditAccountCode,
      creditAccountCode: posting.debitAccountCode,
      amount: posting.amount,
      currencyCode: posting.currencyCode,
      postingStatus: "posted",
      postedBy: input.actorId,
      postedAt: reversalAt,
      reversalReason: input.reversalReason ?? null,
      createdBy: input.actorId,
      updatedBy: input.actorId,
    })
    .returning();

  if (!reversalPosting) {
    throw new ValidationError("Unable to create reversal accounting entry.");
  }

  const [updatedPosting] = await db
    .update(accountingPostings)
    .set({
      postingStatus: "reversed",
      reversedAt: reversalAt,
      reversedBy: input.actorId,
      reversalReason: input.reversalReason ?? null,
      reversalEntryId: reversalPosting.id,
      updatedBy: input.actorId,
    })
    .where(
      and(
        eq(accountingPostings.tenantId, input.tenantId),
        eq(accountingPostings.id, input.postingId)
      )
    )
    .returning();

  if (!updatedPosting) {
    throw new NotFoundError(
      `Accounting posting ${input.postingId} was not found for tenant ${input.tenantId}.`
    );
  }

  await recordDomainEvent({
    tenantId: input.tenantId,
    eventType: "ACCOUNTING_POSTING_REVERSED",
    entityType: posting.sourceDocumentType,
    entityId: posting.sourceDocumentId,
    payload: {
      postingId: updatedPosting.id,
      reversalPostingId: reversalPosting.id,
      reason: input.reversalReason ?? null,
    },
    triggeredBy: input.actorId,
    actorId: input.actorId,
  });

  return {
    posting: updatedPosting,
    reversalPosting,
  };
}

export async function resolveRoundingPolicy(
  input: ResolveRoundingPolicyInput
): Promise<ResolveRoundingPolicyResult> {
  const effectiveAt = input.effectiveAt ?? new Date();

  const [currencySpecific] = await db
    .select()
    .from(roundingPolicies)
    .where(
      and(
        eq(roundingPolicies.tenantId, input.tenantId),
        eq(roundingPolicies.policyKey, input.policyKey),
        eq(roundingPolicies.appliesTo, input.appliesTo),
        eq(roundingPolicies.isActive, true),
        isNull(roundingPolicies.deletedAt),
        lte(roundingPolicies.effectiveFrom, effectiveAt),
        or(
          isNull(roundingPolicies.effectiveTo),
          sql`${roundingPolicies.effectiveTo} >= ${effectiveAt}`
        ),
        input.currencyCode
          ? eq(roundingPolicies.currencyCode, input.currencyCode)
          : isNull(roundingPolicies.currencyCode)
      )
    )
    .orderBy(desc(roundingPolicies.effectiveFrom))
    .limit(1);

  if (currencySpecific) {
    return {
      policy: currencySpecific,
      resolution: "currency-match",
    };
  }

  const [fallback] = await db
    .select()
    .from(roundingPolicies)
    .where(
      and(
        eq(roundingPolicies.tenantId, input.tenantId),
        eq(roundingPolicies.policyKey, input.policyKey),
        eq(roundingPolicies.appliesTo, input.appliesTo),
        eq(roundingPolicies.isActive, true),
        isNull(roundingPolicies.deletedAt),
        isNull(roundingPolicies.currencyCode),
        lte(roundingPolicies.effectiveFrom, effectiveAt),
        or(
          isNull(roundingPolicies.effectiveTo),
          sql`${roundingPolicies.effectiveTo} >= ${effectiveAt}`
        )
      )
    )
    .orderBy(desc(roundingPolicies.effectiveFrom))
    .limit(1);

  if (!fallback) {
    throw new NotFoundError(
      `No active rounding policy found for key '${input.policyKey}' (appliesTo='${input.appliesTo}') in tenant ${input.tenantId}.`
    );
  }

  return {
    policy: fallback,
    resolution: "default-currency",
  };
}

async function loadDocumentApproval(tenantId: number, approvalId: string) {
  const [approval] = await db
    .select()
    .from(documentApprovals)
    .where(and(eq(documentApprovals.tenantId, tenantId), eq(documentApprovals.id, approvalId)))
    .limit(1);

  if (!approval) {
    throw new NotFoundError(`Approval request ${approvalId} was not found for tenant ${tenantId}.`);
  }

  return approval;
}

async function loadAccountingPosting(tenantId: number, postingId: string) {
  const [posting] = await db
    .select()
    .from(accountingPostings)
    .where(and(eq(accountingPostings.tenantId, tenantId), eq(accountingPostings.id, postingId)))
    .limit(1);

  if (!posting) {
    throw new NotFoundError(
      `Accounting posting ${postingId} was not found for tenant ${tenantId}.`
    );
  }

  return posting;
}
