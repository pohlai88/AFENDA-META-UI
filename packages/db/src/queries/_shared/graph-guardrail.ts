/**
 * Optional hybrid guardrail for generated readonly access functions.
 * Set GRAPH_VALIDATION_POLICY_JSON to:
 * - the `policy` object from graph-validation report, or
 * - the full report JSON (must include `policy`).
 *
 * Hard-blocks when policy.isSecurityBlocking === true or policy.decision.action === "BLOCK".
 * Stale snapshots: GRAPH_VALIDATION_POLICY_STALE_MODE=block|warn|allow (default block when policyGeneratedAt + TTL exceeded).
 */

import {
  extractPolicyFromEnvelope,
  GraphValidationReportParseError,
} from "../../graph-validation/policy-from-report.js";
import type { GraphValidationPolicy } from "../../graph-validation/types.js";
import { emitGuardEvent, telemetryFromPolicy } from "./guard-telemetry.js";
import { isPolicySnapshotStale, resolvePolicyStaleMode } from "./policy-staleness.js";

export class GraphGuardrailSecurityError extends Error {
  readonly policy: GraphValidationPolicy;
  constructor(message: string, policy: GraphValidationPolicy) {
    super(message);
    this.name = "GraphGuardrailSecurityError";
    this.policy = policy;
  }
}

let cachedPolicy: GraphValidationPolicy | null | undefined;
/**
 * Cache key is raw env string; invalidate by changing GRAPH_VALIDATION_POLICY_JSON.
 * Policy JSON is not TTL-cached here—staleness uses `policyGeneratedAt` + `decision.ttlSeconds` (see policy-staleness.ts).
 */
let cachedSource = "";

/** Optional context for telemetry (route / tenant). */
export interface GraphGuardrailContext {
  readonly route?: string;
  readonly tenantId?: string;
}

/**
 * Clear cache (tests).
 */
export function resetGraphGuardrailCache(): void {
  cachedPolicy = undefined;
  cachedSource = "";
}

function parsePolicyFromEnv(): GraphValidationPolicy | null {
  const json = process.env.GRAPH_VALIDATION_POLICY_JSON?.trim();
  if (!json) return null;
  if (json === cachedSource && cachedPolicy !== undefined) {
    return cachedPolicy;
  }
  try {
    const parsed = JSON.parse(json) as unknown;
    cachedPolicy = extractPolicyFromEnvelope(parsed);
    cachedSource = json;
    return cachedPolicy;
  } catch (e) {
    const msg = e instanceof GraphValidationReportParseError ? e.message : String(e);
    throw new GraphGuardrailSecurityError(
      `Invalid GRAPH_VALIDATION_POLICY_JSON: ${msg}`,
      {
        isSecurityBlocking: true,
        isOperationalWarning: true,
        confidenceLevel: "low",
        securityReason: "Policy JSON parse failed — fail closed",
      }
    );
  }
}

function shouldHardBlock(policy: GraphValidationPolicy): boolean {
  return policy.isSecurityBlocking === true || policy.decision?.action === "BLOCK";
}

/**
 * Non-throwing read for UX banners: true when policy signals operational / graded WARN (ignores hard block path).
 */
export function graphGuardHasOperationalSignal(): boolean {
  try {
    const json = process.env.GRAPH_VALIDATION_POLICY_JSON?.trim();
    if (!json) return false;
    const parsed = JSON.parse(json) as unknown;
    const policy = extractPolicyFromEnvelope(parsed);
    return policy.isOperationalWarning === true || policy.decision?.action === "WARN";
  } catch {
    return false;
  }
}

/**
 * Throws GraphGuardrailSecurityError when security blocking is active.
 * No-op when env unset (guardrail disabled).
 */
export async function assertGraphGuardrailAllowsRead(ctx?: GraphGuardrailContext): Promise<void> {
  const policy = parsePolicyFromEnv();
  if (!policy) {
    emitGuardEvent({ type: "graph_guard", outcome: "noop", route: ctx?.route, tenantId: ctx?.tenantId });
    return;
  }

  if (isPolicySnapshotStale(policy)) {
    const mode = resolvePolicyStaleMode();
    if (mode === "block") {
      emitGuardEvent(telemetryFromPolicy(policy, "stale_block", ctx));
      throw new GraphGuardrailSecurityError(
        "Graph validation policy snapshot is stale (refresh GRAPH_VALIDATION_POLICY_JSON).",
        {
          isSecurityBlocking: true,
          isOperationalWarning: true,
          confidenceLevel: "low",
          securityReason: "Stale policy snapshot",
        }
      );
    }
    emitGuardEvent(telemetryFromPolicy(policy, "stale_allow", ctx));
  }

  if (shouldHardBlock(policy)) {
    emitGuardEvent(telemetryFromPolicy(policy, "block", ctx));
    throw new GraphGuardrailSecurityError(
      policy.securityReason ??
        "Graph validation policy blocks reads due to security status (e.g. tenant isolation breach).",
      policy
    );
  }

  emitGuardEvent({
    type: "graph_guard",
    outcome: "allow",
    route: ctx?.route,
    tenantId: ctx?.tenantId,
    severity: policy.decision?.severity,
    action: policy.decision?.action,
    isSecurityBlocking: policy.isSecurityBlocking,
  });
}
