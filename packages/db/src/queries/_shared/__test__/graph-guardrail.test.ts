import { afterEach, describe, expect, it } from "vitest";
import {
  assertGraphGuardrailAllowsRead,
  GraphGuardrailSecurityError,
  resetGraphGuardrailCache,
} from "../graph-guardrail.js";
import { resetGraphGuardrailTelemetrySink, setGraphGuardrailTelemetrySink } from "../guard-telemetry.js";

describe("graph-guardrail", () => {
  afterEach(() => {
    delete process.env.GRAPH_VALIDATION_POLICY_JSON;
    delete process.env.GRAPH_VALIDATION_POLICY_STALE_MODE;
    delete process.env.GRAPH_VALIDATION_POLICY_MAX_FUTURE_SKEW_SECONDS;
    delete process.env.GRAPH_GUARD_ALLOW_EVENT_SAMPLE_RATE;
    resetGraphGuardrailCache();
    resetGraphGuardrailTelemetrySink();
  });

  it("no-op when env unset", async () => {
    await expect(assertGraphGuardrailAllowsRead()).resolves.toBeUndefined();
  });

  it("throws when security blocking", async () => {
    process.env.GRAPH_VALIDATION_POLICY_JSON = JSON.stringify({
      isSecurityBlocking: true,
      isOperationalWarning: true,
      confidenceLevel: "high",
      securityReason: "test",
    });
    await expect(assertGraphGuardrailAllowsRead()).rejects.toBeInstanceOf(GraphGuardrailSecurityError);
  });

  it("allows when policy not blocking", async () => {
    process.env.GRAPH_VALIDATION_POLICY_JSON = JSON.stringify({
      isSecurityBlocking: false,
      isOperationalWarning: true,
      confidenceLevel: "medium",
      policyGeneratedAt: new Date().toISOString(),
      decision: { severity: "P3_OBSERVABILITY", action: "WARN", ttlSeconds: 604800 },
    });
    await expect(assertGraphGuardrailAllowsRead()).resolves.toBeUndefined();
  });

  it("extracts policy from full report envelope", async () => {
    const generatedAt = new Date().toISOString();
    process.env.GRAPH_VALIDATION_POLICY_JSON = JSON.stringify({
      generatedAt,
      policy: {
        isSecurityBlocking: false,
        isOperationalWarning: false,
        confidenceLevel: "high",
        decision: { severity: "P3_OBSERVABILITY", action: "ALLOW", ttlSeconds: 604800 },
      },
    });
    await expect(assertGraphGuardrailAllowsRead()).resolves.toBeUndefined();
  });

  it("passes context to telemetry sink when set", async () => {
    const seen: string[] = [];
    setGraphGuardrailTelemetrySink((e) => {
      if (e.route) seen.push(e.route);
    });
    process.env.GRAPH_VALIDATION_POLICY_JSON = JSON.stringify({
      isSecurityBlocking: false,
      isOperationalWarning: false,
      confidenceLevel: "high",
      policyGeneratedAt: new Date().toISOString(),
      decision: { severity: "P3_OBSERVABILITY", action: "ALLOW", ttlSeconds: 604800 },
    });
    await assertGraphGuardrailAllowsRead({ route: "api.hr.list" });
    expect(seen).toContain("api.hr.list");
  });

  it("fails closed when policyGeneratedAt is too far in the future", async () => {
    const future = new Date(Date.now() + 60 * 60 * 1000).toISOString();
    process.env.GRAPH_VALIDATION_POLICY_JSON = JSON.stringify({
      isSecurityBlocking: false,
      isOperationalWarning: false,
      confidenceLevel: "high",
      policyGeneratedAt: future,
      decision: { severity: "P3_OBSERVABILITY", action: "ALLOW", ttlSeconds: 604800 },
    });
    await expect(assertGraphGuardrailAllowsRead()).rejects.toBeInstanceOf(GraphGuardrailSecurityError);
  });

  it("can sample out allow telemetry events", async () => {
    const seen: string[] = [];
    process.env.GRAPH_GUARD_ALLOW_EVENT_SAMPLE_RATE = "0";
    setGraphGuardrailTelemetrySink((e) => {
      if (e.route) seen.push(e.route);
    });
    process.env.GRAPH_VALIDATION_POLICY_JSON = JSON.stringify({
      isSecurityBlocking: false,
      isOperationalWarning: false,
      confidenceLevel: "high",
      policyGeneratedAt: new Date().toISOString(),
      decision: { severity: "P3_OBSERVABILITY", action: "ALLOW", ttlSeconds: 604800 },
    });
    await assertGraphGuardrailAllowsRead({ route: "api.hr.sampled" });
    expect(seen).toEqual([]);
  });
});
