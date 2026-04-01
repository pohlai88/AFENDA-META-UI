import type { Database } from "../../drizzle/client/index.js";
import { documentAttachments } from "../../schema/reference/tables.js";
import { eq, and } from "drizzle-orm";

import type { DocumentTruthFactSet } from "./contracts.js";
import { compileDocumentTruth } from "./compiler.js";
import {
  countDuplicateChecksumPeers,
  createTruthResolutionTaskIfNeeded,
  insertTruthDecisionRow,
  updateAttachmentTruthState,
  upsertPreDecisionBlocksFromEnvelope,
} from "./persistence.js";

export type RunTruthCompilerOptions = {
  /** When true, only persist decision log row; do not mutate attachment or blocks. */
  shadowMode?: boolean;
  /** Override facts.partial fields after auto-build from DB row. */
  factOverrides?: Partial<DocumentTruthFactSet>;
};

/**
 * Load attachment row, build default facts, compile, persist. Call after successful R2 upload.
 */
export async function runDocumentTruthCompiler(
  db: Database,
  params: { tenantId: number; attachmentId: string },
  options: RunTruthCompilerOptions = {}
): Promise<void> {
  const [row] = await db
    .select()
    .from(documentAttachments)
    .where(
      and(
        eq(documentAttachments.tenantId, params.tenantId),
        eq(documentAttachments.attachmentId, params.attachmentId)
      )
    )
    .limit(1);

  if (!row) {
    return;
  }

  const dupPeers = await countDuplicateChecksumPeers(db, {
    tenantId: params.tenantId,
    checksum: row.checksum,
    excludeAttachmentId: params.attachmentId,
  });

  const now = new Date();
  const baseFacts: DocumentTruthFactSet = {
    tenantId: params.tenantId,
    attachmentId: params.attachmentId,
    entityType: row.entityType,
    storageKey: row.storageKey,
    checksum: row.checksum,
    byteSize: row.byteSize,
    contentType: row.contentType,
    filename: row.filename,
    duplicateChecksumMatch: dupPeers > 0,
    nearDuplicateSignal: dupPeers > 0,
    extractedInvoiceAmount: null,
    matchedPayableAmount: null,
    previousPaymentDetected: false,
    invoiceBoundToPayableContext: row.entityType !== "generic_upload",
    isLatestApprovedContractVersion: true,
    strictInvoicePayableBinding: false,
    documentClass: "generic",
    malwareScanStatus: row.malwareScanStatus,
    legalHoldActive: row.legalHoldActive,
    retentionExpiresAt: row.retentionExpiresAt,
    now,
    ...options.factOverrides,
  };

  const envelope = compileDocumentTruth(baseFacts);

  await insertTruthDecisionRow(db, {
    tenantId: params.tenantId,
    attachmentId: params.attachmentId,
    envelope,
  });

  if (options.shadowMode) {
    return;
  }

  await updateAttachmentTruthState(db, {
    tenantId: params.tenantId,
    attachmentId: params.attachmentId,
    envelope,
  });

  await createTruthResolutionTaskIfNeeded(db, {
    tenantId: params.tenantId,
    attachmentId: params.attachmentId,
    envelope,
  });

  await upsertPreDecisionBlocksFromEnvelope(db, {
    tenantId: params.tenantId,
    attachmentId: params.attachmentId,
    envelope,
  });
}
