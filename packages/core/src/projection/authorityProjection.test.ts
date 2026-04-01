import { describe, expect, it } from "vitest";
import type { InvariantFailurePayload } from "../runtime/types.js";
import { buildFinancialAuthorityProjection } from "./authorityProjection.js";

function makeFailure(name: string): InvariantFailurePayload {
  return {
    invariantName: name,
    severity: "critical",
    failurePolicy: "block",
    doctrine: {
      doctrineRef: "d",
      family: "Accounting-Control",
      standard: "s",
      section: "sec",
      title: "sum",
      interpretation: "strict",
    },
    evidence: {
      summary: "failed",
      facts: { name },
    },
  };
}

describe("buildFinancialAuthorityProjection", () => {
  it("returns authoritative when there are no failures", () => {
    const result = buildFinancialAuthorityProjection({
      tenantId: "tenant_a",
      scopeId: "financial_authority",
      failures: [],
      replayMatchesCurrentProjection: true,
    });

    expect(result.authorityStatus).toBe("authoritative");
    expect(result.blockedReasons).toEqual([]);
    expect(result.blockingInvariantKeys).toEqual([]);
    expect(result.blockingDoctrineKeys).toEqual([]);
  });

  it("returns blocked when at least one failure exists", () => {
    const result = buildFinancialAuthorityProjection({
      tenantId: "tenant_a",
      scopeId: "financial_authority",
      failures: [makeFailure("x")],
      replayMatchesCurrentProjection: true,
    });

    expect(result.authorityStatus).toBe("blocked");
    expect(result.blockedReasons).toHaveLength(1);
  });

  it("sorts blocked reasons and dedupes blocking keys", () => {
    const failureA = makeFailure("a");
    const failureB = makeFailure("b");
    failureB.severity = "major";
    const duplicateA = makeFailure("a");
    const result = buildFinancialAuthorityProjection({
      tenantId: "tenant_a",
      scopeId: "financial_authority",
      failures: [failureA, failureB, duplicateA],
      replayMatchesCurrentProjection: true,
    });

    expect(result.blockedReasons.map((x) => x.invariantName)).toEqual(["a", "a", "b"]);
    expect(result.blockingInvariantKeys).toEqual(["a", "b"]);
    expect(result.blockingDoctrineKeys).toEqual(["d"]);
  });

  it("returns provisional when replay mismatches without failures", () => {
    const result = buildFinancialAuthorityProjection({
      tenantId: "tenant_a",
      scopeId: "financial_authority",
      failures: [],
      replayMatchesCurrentProjection: false,
    });

    expect(result.authorityStatus).toBe("provisional");
  });
});
