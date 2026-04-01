import type {
  TerritoryResolutionStrategy,
  TerritoryResolutionTrace,
  TerritoryRuleMatchType,
} from "../../schema/index.js";

/** Documented sort key for replay: lower `priority` wins; then higher `specificity`; then older `createdAt`. */
export const TERRITORY_RULE_SORT_SPEC =
  "priority ASC, specificity DESC, createdAt ASC" as const;

export type TerritoryRuleMatchInput = {
  countryId: number | null;
  stateId: number | null;
  /** Normalized numeric postal bucket (e.g. US ZIP5 as integer). */
  zipNumeric: number | null;
};

/** Minimal rule row shape for pure resolution (map from DB / cache). */
export type TerritoryRuleCandidate = {
  id: string;
  territoryId: string;
  countryId: number | null;
  stateId: number | null;
  zipFrom: number | null;
  zipTo: number | null;
  matchType: TerritoryRuleMatchType;
  priority: number;
  effectiveFrom: Date;
  effectiveTo: Date | null;
  createdAt: Date;
};

export type TerritoryResolutionOutcome = {
  resolvedTerritoryId: string | null;
  matchedRuleId: string | null;
  resolutionStrategy: TerritoryResolutionStrategy;
  trace: TerritoryResolutionTrace;
};

function ruleSpecificity(rule: TerritoryRuleCandidate): number {
  let s = 0;
  if (rule.countryId != null) s += 100;
  if (rule.stateId != null) s += 50;
  if (rule.zipFrom != null && rule.zipTo != null) {
    s += rule.matchType === "exact" ? 25 : 10;
  }
  return s;
}

function isEffectiveAt(rule: TerritoryRuleCandidate, asOf: Date): boolean {
  if (asOf.getTime() < rule.effectiveFrom.getTime()) return false;
  if (rule.effectiveTo != null && asOf.getTime() > rule.effectiveTo.getTime()) return false;
  return true;
}

/**
 * Returns whether the rule matches the input at `asOf`.
 * Semantics: null `country_id` / `state_id` = wildcard on that dimension; null zip bounds = any ZIP.
 * When zip bounds are set, `zipNumeric` must lie in `[zipFrom, zipTo]` (inclusive).
 */
export function territoryRuleMatches(
  rule: TerritoryRuleCandidate,
  input: TerritoryRuleMatchInput,
  asOf: Date
): { ok: boolean; reason: string } {
  if (!isEffectiveAt(rule, asOf)) {
    return { ok: false, reason: "outside_effective_window" };
  }

  if (rule.countryId != null) {
    if (input.countryId == null || input.countryId !== rule.countryId) {
      return { ok: false, reason: "country_mismatch" };
    }
  }

  if (rule.stateId != null) {
    if (input.stateId == null || input.stateId !== rule.stateId) {
      return { ok: false, reason: "state_mismatch" };
    }
  }

  const zipOpen = rule.zipFrom == null && rule.zipTo == null;
  if (zipOpen) {
    return { ok: true, reason: "match" };
  }

  if (input.zipNumeric == null) {
    return { ok: false, reason: "zip_required_for_rule" };
  }

  if (rule.zipFrom == null || rule.zipTo == null) {
    return { ok: false, reason: "invalid_rule_zip_bounds" };
  }

  if (input.zipNumeric < rule.zipFrom || input.zipNumeric > rule.zipTo) {
    return { ok: false, reason: "zip_out_of_range" };
  }

  if (rule.matchType === "exact" && rule.zipFrom !== rule.zipTo) {
    return { ok: false, reason: "exact_rule_invariant_violation" };
  }

  return { ok: true, reason: "match" };
}

function compareRules(a: TerritoryRuleCandidate, b: TerritoryRuleCandidate): number {
  if (a.priority !== b.priority) return a.priority - b.priority;
  const sb = ruleSpecificity(b);
  const sa = ruleSpecificity(a);
  if (sb !== sa) return sb - sa;
  return a.createdAt.getTime() - b.createdAt.getTime();
}

/**
 * Deterministic territory resolution: ordered rule pass, then optional tenant default territory.
 * Does not persist; callers store rows in `sales.territory_resolutions` when needed.
 */
export function resolveTerritoryFromRules(input: {
  asOf: Date;
  geo: TerritoryRuleMatchInput;
  rules: TerritoryRuleCandidate[];
  /** `territories.id` where `is_default_fallback` for the tenant, if any. */
  defaultTerritoryId: string | null;
}): TerritoryResolutionOutcome {
  const ordered = [...input.rules].sort(compareRules);

  const candidatesOrdered = ordered.map((r) => ({
    ruleId: r.id,
    priority: r.priority,
    specificity: ruleSpecificity(r),
    createdAt: r.createdAt.toISOString(),
  }));

  const steps: TerritoryResolutionTrace["steps"] = [];

  for (const rule of ordered) {
    const { ok, reason } = territoryRuleMatches(rule, input.geo, input.asOf);
    steps.push({ ruleId: rule.id, matched: ok, reason });
    if (ok) {
      return {
        resolvedTerritoryId: rule.territoryId,
        matchedRuleId: rule.id,
        resolutionStrategy: "priority",
        trace: {
          sortOrder: TERRITORY_RULE_SORT_SPEC,
          candidatesOrdered,
          steps,
        },
      };
    }
  }

  if (input.defaultTerritoryId != null) {
    return {
      resolvedTerritoryId: input.defaultTerritoryId,
      matchedRuleId: null,
      resolutionStrategy: "default",
      trace: {
        sortOrder: TERRITORY_RULE_SORT_SPEC,
        candidatesOrdered,
        steps: [
          ...steps,
          {
            ruleId: "__default__",
            matched: true,
            reason: "tenant_default_territory",
          },
        ],
      },
    };
  }

  return {
    resolvedTerritoryId: null,
    matchedRuleId: null,
    resolutionStrategy: "none",
    trace: {
      sortOrder: TERRITORY_RULE_SORT_SPEC,
      candidatesOrdered,
      steps: [
        ...steps,
        { ruleId: "__none__", matched: false, reason: "no_rule_or_default" },
      ],
    },
  };
}

const NON_DIGIT = /\D/g;

/**
 * Best-effort normalization for US-style postal strings into a single integer bucket (ZIP5).
 * Returns null if no digits found.
 */
export function parsePostalCodeToZipNumeric(raw: string | null | undefined): number | null {
  if (raw == null || raw === "") return null;
  const digits = raw.replace(NON_DIGIT, "");
  if (digits.length === 0) return null;
  const zip5 = digits.length > 5 ? digits.slice(0, 5) : digits;
  const n = Number.parseInt(zip5, 10);
  return Number.isFinite(n) ? n : null;
}
