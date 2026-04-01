import { describe, expect, it } from "vitest";
import { extractPolicyFromEnvelope } from "../policy-from-report.js";

describe("extractPolicyFromEnvelope", () => {
  it("extracts from nested policy", () => {
    const p = extractPolicyFromEnvelope({
      policy: {
        isSecurityBlocking: true,
        isOperationalWarning: true,
        confidenceLevel: "high",
        securityReason: "leak",
      },
    });
    expect(p.isSecurityBlocking).toBe(true);
    expect(p.securityReason).toBe("leak");
  });

  it("extracts standalone policy object", () => {
    const p = extractPolicyFromEnvelope({
      isSecurityBlocking: false,
      isOperationalWarning: true,
      confidenceLevel: "medium",
    });
    expect(p.isSecurityBlocking).toBe(false);
  });
});
