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
    const result = buildFinancialAuthorityProjection({ failures: [] });

    expect(result.authorityStatus).toBe("authoritative");
    expect(result.blockedReasons).toEqual([]);
  });

  it("returns blocked when at least one failure exists", () => {
    const result = buildFinancialAuthorityProjection({ failures: [makeFailure("x")] });

    expect(result.authorityStatus).toBe("blocked");
    expect(result.blockedReasons).toHaveLength(1);
  });

  it("returns blocked reasons unchanged", () => {
    const failures = [makeFailure("a"), makeFailure("b")];
    const result = buildFinancialAuthorityProjection({ failures });

    expect(result.blockedReasons).toEqual(failures);
  });
});
