import type { GraphValidationPolicy } from "../../graph-validation/types.js";

const DEFAULT_TTL_SECONDS = 604800;
const DEFAULT_MAX_FUTURE_SKEW_SECONDS = 300;

/**
 * True when policy snapshot is older than decision.ttlSeconds (or default TTL when policyGeneratedAt is set).
 */
export function isPolicySnapshotStale(policy: GraphValidationPolicy): boolean {
  const gen = policy.policyGeneratedAt;
  if (!gen || typeof gen !== "string") return false;
  const t = Date.parse(gen);
  if (Number.isNaN(t)) return true;
  const ttl = policy.decision?.ttlSeconds ?? DEFAULT_TTL_SECONDS;
  const maxFutureSkew = resolveMaxFutureSkewSeconds();
  if (t - Date.now() > maxFutureSkew * 1000) {
    // Protect against clock skew / malformed future policy timestamps.
    return true;
  }
  return Date.now() - t > ttl * 1000;
}

export type PolicyStaleMode = "block" | "warn" | "allow";

export function resolvePolicyStaleMode(): PolicyStaleMode {
  const m = process.env.GRAPH_VALIDATION_POLICY_STALE_MODE?.trim().toLowerCase();
  if (m === "allow" || m === "warn") return m;
  return "block";
}

function resolveMaxFutureSkewSeconds(): number {
  const raw = process.env.GRAPH_VALIDATION_POLICY_MAX_FUTURE_SKEW_SECONDS?.trim();
  if (!raw) return DEFAULT_MAX_FUTURE_SKEW_SECONDS;
  const n = Number(raw);
  if (!Number.isFinite(n) || n < 0) return DEFAULT_MAX_FUTURE_SKEW_SECONDS;
  return n;
}
