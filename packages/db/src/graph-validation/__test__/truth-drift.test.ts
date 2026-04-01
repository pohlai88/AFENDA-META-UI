/**
 * Truth drift: policy envelope + guard behavior under stale/malformed/stress inputs.
 */

import { afterEach, describe, expect, it } from "vitest";
import {
  assertGraphGuardrailAllowsRead,
  GraphGuardrailSecurityError,
  graphGuardHasOperationalSignal,
  resetGraphGuardrailCache,
} from "../../queries/_shared/graph-guardrail.js";
import {
  resetGraphGuardrailTelemetrySink,
  setGraphGuardrailTelemetrySink,
  type GraphGuardTelemetryEvent,
} from "../../queries/_shared/guard-telemetry.js";

describe("truth drift — graph guard", () => {
  afterEach(() => {
    delete process.env.GRAPH_VALIDATION_POLICY_JSON;
    delete process.env.GRAPH_VALIDATION_POLICY_STALE_MODE;
    resetGraphGuardrailCache();
    resetGraphGuardrailTelemetrySink();
  });

  it("blocks when policy decision.action is BLOCK without tenant flag (graded enforcement)", async () => {
    process.env.GRAPH_VALIDATION_POLICY_JSON = JSON.stringify({
      isSecurityBlocking: false,
      isOperationalWarning: true,
      confidenceLevel: "high",
      policyGeneratedAt: new Date().toISOString(),
      decision: { severity: "P0_SECURITY", action: "BLOCK", ttlSeconds: 3600 },
    });
    await expect(assertGraphGuardrailAllowsRead()).rejects.toBeInstanceOf(GraphGuardrailSecurityError);
  });

  it("fail-closed stale policy when GRAPH_VALIDATION_POLICY_STALE_MODE unset (block)", async () => {
    const old = new Date(Date.now() - 10 * 24 * 3600 * 1000).toISOString();
    process.env.GRAPH_VALIDATION_POLICY_JSON = JSON.stringify({
      isSecurityBlocking: false,
      isOperationalWarning: false,
      confidenceLevel: "high",
      policyGeneratedAt: old,
      decision: { severity: "P3_OBSERVABILITY", action: "ALLOW", ttlSeconds: 60 },
    });
    await expect(assertGraphGuardrailAllowsRead()).rejects.toBeInstanceOf(GraphGuardrailSecurityError);
  });

  it("allows stale policy when GRAPH_VALIDATION_POLICY_STALE_MODE=allow", async () => {
    const old = new Date(Date.now() - 10 * 24 * 3600 * 1000).toISOString();
    process.env.GRAPH_VALIDATION_POLICY_STALE_MODE = "allow";
    process.env.GRAPH_VALIDATION_POLICY_JSON = JSON.stringify({
      isSecurityBlocking: false,
      isOperationalWarning: false,
      confidenceLevel: "high",
      policyGeneratedAt: old,
      decision: { severity: "P3_OBSERVABILITY", action: "ALLOW", ttlSeconds: 60 },
    });
    await expect(assertGraphGuardrailAllowsRead()).resolves.toBeUndefined();
  });

  it("emits telemetry when sink is registered", async () => {
    const events: GraphGuardTelemetryEvent[] = [];
    setGraphGuardrailTelemetrySink((e) => events.push(e));
    process.env.GRAPH_VALIDATION_POLICY_JSON = JSON.stringify({
      isSecurityBlocking: false,
      isOperationalWarning: true,
      confidenceLevel: "medium",
      policyGeneratedAt: new Date().toISOString(),
      decision: { severity: "P3_OBSERVABILITY", action: "WARN", ttlSeconds: 604800 },
    });
    await assertGraphGuardrailAllowsRead({ route: "test.route", tenantId: "t1" });
    expect(events.some((e) => e.outcome === "allow" && e.route === "test.route")).toBe(true);
  });

  it("graphGuardHasOperationalSignal is true for WARN decision", () => {
    process.env.GRAPH_VALIDATION_POLICY_JSON = JSON.stringify({
      isSecurityBlocking: false,
      isOperationalWarning: false,
      confidenceLevel: "high",
      decision: { severity: "P2_INCONSISTENCY", action: "WARN", ttlSeconds: 604800 },
    });
    expect(graphGuardHasOperationalSignal()).toBe(true);
  });
});
