import { describe, expect, it } from "vitest";

import { compileDocumentTruth } from "../compiler.js";
import type { DocumentTruthFactSet } from "../contracts.js";

function baseFacts(over: Partial<DocumentTruthFactSet> = {}): DocumentTruthFactSet {
  return {
    tenantId: 1,
    attachmentId: "00000000-0000-4000-8000-000000000001",
    entityType: "generic_upload",
    storageKey: "1/uploads/file/x.pdf",
    checksum: "abc",
    byteSize: 100,
    contentType: "application/pdf",
    filename: "x.pdf",
    duplicateChecksumMatch: false,
    nearDuplicateSignal: false,
    extractedInvoiceAmount: null,
    matchedPayableAmount: null,
    previousPaymentDetected: false,
    invoiceBoundToPayableContext: true,
    isLatestApprovedContractVersion: true,
    strictInvoicePayableBinding: false,
    documentClass: "generic",
    malwareScanStatus: "not_required",
    legalHoldActive: false,
    retentionExpiresAt: null,
    now: new Date("2026-03-30T12:00:00.000Z"),
    ...over,
  };
}

describe("compileDocumentTruth", () => {
  it("returns ALLOW for clean generic facts", () => {
    const out = compileDocumentTruth(baseFacts());
    expect(out.resolutionState).toBe("RESOLVED");
    expect(out.recommendedAction).toBe("ALLOW");
    expect(out.duplicateRisk).toBe("NONE");
    expect(out.decisionReasons).toContain("NO_RULES_TRIGGERED");
  });

  it("R001 blocks duplicate checksum with prior payment", () => {
    const out = compileDocumentTruth(
      baseFacts({
        duplicateChecksumMatch: true,
        previousPaymentDetected: true,
        documentClass: "invoice",
      })
    );
    expect(out.resolutionState).toBe("REJECTED");
    expect(out.recommendedAction).toBe("BLOCK");
    expect(out.decisionReasons.some((r) => r.includes("R001"))).toBe(true);
  });

  it("R008 blocks on pending malware scan", () => {
    const out = compileDocumentTruth(baseFacts({ malwareScanStatus: "pending" }));
    expect(out.resolutionState).toBe("REJECTED");
    expect(out.recommendedAction).toBe("BLOCK");
    expect(out.decisionReasons).toContain("R008_MALWARE_QUARANTINE");
  });
});
