import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

type ProfileName =
  | "mutable"
  | "mutableLean"
  | "appendOnly"
  | "appendOnlyNoActor"
  | "readModel";
type MandatoryColumn = "createdAt" | "updatedAt";
type RecommendedColumn = "deletedAt" | "createdBy" | "updatedBy";

interface MatrixProfile {
  readonly mandatory: readonly MandatoryColumn[];
  readonly recommended: readonly RecommendedColumn[];
}

interface MatrixRuleTable {
  readonly kind: "table";
  readonly table: string;
  readonly profile: ProfileName;
  readonly reason: string;
}

interface MatrixRulePattern {
  readonly kind: "pattern";
  readonly match: string;
  readonly profile: ProfileName;
  readonly reason: string;
}

type MatrixRule = MatrixRuleTable | MatrixRulePattern;

interface GovernanceMatrixFile {
  readonly version: number;
  readonly failOnUnclassified: boolean;
  readonly profiles: Record<ProfileName, MatrixProfile>;
  readonly rules: readonly MatrixRule[];
}

interface CompiledRuleTable {
  readonly kind: "table";
  readonly table: string;
  readonly profile: ProfileName;
  readonly reason: string;
}

interface CompiledRulePattern {
  readonly kind: "pattern";
  readonly regex: RegExp;
  readonly profile: ProfileName;
  readonly reason: string;
}

type CompiledRule = CompiledRuleTable | CompiledRulePattern;

export interface CompiledGovernanceMatrix {
  readonly failOnUnclassified: boolean;
  readonly profiles: Record<ProfileName, MatrixProfile>;
  readonly rules: readonly CompiledRule[];
}

export interface ResolvedGovernanceProfile {
  readonly profile: ProfileName;
  readonly reason: string;
  readonly source: "table" | "pattern";
}

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
const DEFAULT_MATRIX_PATH = resolve(SCRIPT_DIR, "governance-matrix.json");

export type CoverageViolationForMatrix =
  | { readonly kind: "missingMandatory"; readonly column: string }
  | { readonly kind: "missingRecommended"; readonly column: string };

export function loadGovernanceMatrix(matrixPath = DEFAULT_MATRIX_PATH): CompiledGovernanceMatrix {
  const raw = readFileSync(matrixPath, "utf8");
  const parsed = JSON.parse(raw) as GovernanceMatrixFile;
  if (!parsed?.profiles?.mutable || !parsed?.profiles?.appendOnly) {
    throw new Error("invalid governance matrix: missing mutable/appendOnly profiles");
  }
  if (!parsed?.profiles?.mutableLean || !parsed?.profiles?.appendOnlyNoActor) {
    throw new Error("invalid governance matrix: missing mutableLean/appendOnlyNoActor profiles");
  }
  const rules = parsed.rules.map((rule) => {
    if (rule.kind === "table") {
      return {
        kind: "table",
        table: rule.table.toLowerCase(),
        profile: rule.profile,
        reason: rule.reason,
      } as const;
    }
    return {
      kind: "pattern",
      regex: new RegExp(rule.match, "i"),
      profile: rule.profile,
      reason: rule.reason,
    } as const;
  });
  return {
    failOnUnclassified: parsed.failOnUnclassified !== false,
    profiles: parsed.profiles,
    rules: Object.freeze(rules),
  };
}

export function resolveGovernanceProfile(
  matrix: CompiledGovernanceMatrix,
  table: string
): ResolvedGovernanceProfile | null {
  const normalized = table.toLowerCase();
  for (const rule of matrix.rules) {
    if (rule.kind === "table" && rule.table === normalized) {
      return { profile: rule.profile, reason: rule.reason, source: "table" };
    }
    if (rule.kind === "pattern" && rule.regex.test(normalized)) {
      return { profile: rule.profile, reason: rule.reason, source: "pattern" };
    }
  }
  return null;
}

export function matrixExemptsCoverageViolation(
  matrix: CompiledGovernanceMatrix,
  profile: ProfileName,
  violation: CoverageViolationForMatrix
): boolean {
  const policy = matrix.profiles[profile];
  if (violation.kind === "missingMandatory") {
    if (violation.column !== "createdAt" && violation.column !== "updatedAt") return false;
    return !policy.mandatory.includes(violation.column);
  }
  if (
    violation.column !== "deletedAt" &&
    violation.column !== "createdBy" &&
    violation.column !== "updatedBy"
  ) {
    return false;
  }
  return !policy.recommended.includes(violation.column);
}
