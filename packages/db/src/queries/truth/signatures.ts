import { and, desc, eq } from "drizzle-orm";

import type { Database } from "../../client/index.js";
import { documentAttachments, documentSignatureAttestations } from "../../schema/reference/tables.js";

export async function setAttachmentSignatureWorkflowStatus(
  db: Database,
  params: {
    tenantId: number;
    attachmentId: string;
    status: (typeof documentAttachments.$inferSelect)["signatureWorkflowStatus"];
  }
): Promise<void> {
  await db
    .update(documentAttachments)
    .set({
      signatureWorkflowStatus: params.status,
      signatureWorkflowUpdatedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(documentAttachments.tenantId, params.tenantId),
        eq(documentAttachments.attachmentId, params.attachmentId)
      )
    );
}

export async function createSignatureAttestationRequest(
  db: Database,
  params: {
    tenantId: number;
    attachmentId: string;
    signerEmail: string;
    signerUserId?: number | null;
    signerName?: string | null;
    notes?: string | null;
    evidenceRefs?: Record<string, unknown>;
  }
) {
  const [row] = await db
    .insert(documentSignatureAttestations)
    .values({
      tenantId: params.tenantId,
      attachmentId: params.attachmentId,
      signerEmail: params.signerEmail,
      signerUserId: params.signerUserId ?? null,
      signerName: params.signerName ?? null,
      attestationStatus: "REQUESTED",
      notes: params.notes ?? null,
      evidenceRefs: params.evidenceRefs ?? {},
    })
    .returning();
  return row;
}

export async function updateSignatureAttestationStatus(
  db: Database,
  params: {
    tenantId: number;
    attestationId: string;
    status: (typeof documentSignatureAttestations.$inferSelect)["attestationStatus"];
    notes?: string | null;
    evidenceRefs?: Record<string, unknown>;
  }
): Promise<void> {
  await db
    .update(documentSignatureAttestations)
    .set({
      attestationStatus: params.status,
      attestedAt: params.status === "SIGNED" ? new Date() : null,
      notes: params.notes,
      evidenceRefs: params.evidenceRefs,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(documentSignatureAttestations.tenantId, params.tenantId),
        eq(documentSignatureAttestations.attestationId, params.attestationId)
      )
    );
}

export async function listSignatureAttestations(
  db: Database,
  params: { tenantId: number; attachmentId: string }
) {
  return db
    .select()
    .from(documentSignatureAttestations)
    .where(
      and(
        eq(documentSignatureAttestations.tenantId, params.tenantId),
        eq(documentSignatureAttestations.attachmentId, params.attachmentId)
      )
    )
    .orderBy(desc(documentSignatureAttestations.createdAt));
}

export async function getAttachmentSignatureSummary(
  db: Database,
  params: { tenantId: number; attachmentId: string }
) {
  const [attachment] = await db
    .select({
      attachmentId: documentAttachments.attachmentId,
      signatureWorkflowStatus: documentAttachments.signatureWorkflowStatus,
      signatureWorkflowUpdatedAt: documentAttachments.signatureWorkflowUpdatedAt,
    })
    .from(documentAttachments)
    .where(
      and(
        eq(documentAttachments.tenantId, params.tenantId),
        eq(documentAttachments.attachmentId, params.attachmentId)
      )
    )
    .limit(1);
  if (!attachment) return null;

  const attestations = await listSignatureAttestations(db, params);
  return {
    attachment,
    attestations,
  };
}
