import {
  SHARED_COLUMN_ALLOWLIST,
  sharedColumnPatternSeverity,
} from "./fingerprints/patterns.js";
import type { SharedColumnPatternSeverity } from "./fingerprints/patterns.js";
import {
  ALL_SHARED_FINGERPRINTS,
  COLUMN_KIT_FINGERPRINTS,
  type ColumnKitFingerprint,
  MANDATORY_SHARED_COLUMNS,
  RECOMMENDED_SHARED_COLUMNS,
} from "./fingerprints/shared.js";
import type { ColumnKitColumnName } from "./fingerprints/shared.js";

export type { SharedColumnPatternSeverity };

export type SharedColumnName = keyof typeof ALL_SHARED_FINGERPRINTS;

export type ColumnCoverageViolation =
  | { readonly kind: "missingMandatory"; readonly column: string }
  | { readonly kind: "missingRecommended"; readonly column: string }
  | {
      readonly kind: "unexpectedSharedStyle";
      readonly column: string;
      readonly severity: SharedColumnPatternSeverity;
    };

export type ColumnCoverageViolationKind = ColumnCoverageViolation["kind"];

export interface EvaluateSharedColumnCoverageOptions {
  /** Merged with `SHARED_COLUMN_ALLOWLIST` (case-sensitive column names). */
  readonly allowlist?: Iterable<string>;
}

export interface SharedColumnCoverageReport {
  readonly violations: readonly ColumnCoverageViolation[];
  readonly missingMandatory: readonly (typeof MANDATORY_SHARED_COLUMNS)[number][];
  readonly missingRecommended: readonly (typeof RECOMMENDED_SHARED_COLUMNS)[number][];
  /** Sorted union of `unexpectedCritical` and `unexpectedInformational`. */
  readonly unexpectedSharedColumns: readonly string[];
  readonly unexpectedCritical: readonly string[];
  readonly unexpectedInformational: readonly string[];
  /**
   * True when mandatory shared columns are present and there are no critical-severity
   * unexpected shared-style columns (after allowlist). Informational unexpecteds do not fail compliance.
   */
  readonly isCompliant: boolean;
  /** True when no critical-severity unexpected shared-style columns remain (ignores mandatory gaps). */
  readonly isCriticalSharedStyleClean: boolean;
}

/** Declared column shape for fingerprint comparison (e.g. from schema introspection or codegen). */
export interface SharedColumnShapeCandidate {
  readonly name: string;
  readonly type: "timestamp" | "integer" | "text";
  readonly timezone?: boolean;
  readonly notNull?: boolean;
  readonly defaultNow?: boolean;
  readonly unique?: boolean;
  readonly maxLength?: number;
  /** Declared FK reference (e.g. from Drizzle `.references()`), compared when fingerprint sets `references`. */
  readonly references?: string;
}

export interface SharedColumnShapeViolation {
  readonly column: ColumnKitColumnName;
  readonly expected: ColumnKitFingerprint;
  readonly actual: SharedColumnShapeCandidate;
}

export interface SharedColumnGovernanceReport extends SharedColumnCoverageReport {
  readonly shapeViolations: readonly SharedColumnShapeViolation[];
  /** True when every declared column-kit fingerprint row matches its catalog shape. */
  readonly isShapeCompliant: boolean;
}

const SHARED_COLUMN_KEYS = Object.freeze(Object.keys(ALL_SHARED_FINGERPRINTS) as SharedColumnName[]);
const SHARED_COLUMN_SET: ReadonlySet<string> = Object.freeze(new Set<string>(SHARED_COLUMN_KEYS));

const COLUMN_KIT_KEYS = Object.freeze(Object.keys(COLUMN_KIT_FINGERPRINTS) as ColumnKitColumnName[]);
const COLUMN_KIT_NAME_SET: ReadonlySet<string> = Object.freeze(new Set<string>(COLUMN_KIT_KEYS));
const COLUMN_KIT_SQL_NAME_BY_FINGERPRINT = {
  createdAt: "created_at",
  updatedAt: "updated_at",
  deletedAt: "deleted_at",
  createdBy: "created_by",
  updatedBy: "updated_by",
  name: "name",
} as const satisfies Record<ColumnKitColumnName, string>;
const COLUMN_KIT_FINGERPRINT_BY_SQL_NAME: Readonly<Record<string, ColumnKitColumnName>> = Object.freeze(
  Object.fromEntries(
    (Object.entries(COLUMN_KIT_SQL_NAME_BY_FINGERPRINT) as [ColumnKitColumnName, string][]).map(
      ([fingerprintName, sqlName]) => [sqlName, fingerprintName]
    )
  ) as Record<string, ColumnKitColumnName>
);

export function isSharedColumnName(columnName: string): columnName is SharedColumnName {
  return SHARED_COLUMN_SET.has(columnName);
}

export function isColumnKitFingerprintName(columnName: string): columnName is ColumnKitColumnName {
  return COLUMN_KIT_NAME_SET.has(columnName);
}

/** Returns true when a name matches a known SQL-side column-kit name (snake_case). */
export function isColumnKitSqlColumnName(columnName: string): boolean {
  return COLUMN_KIT_FINGERPRINT_BY_SQL_NAME[columnName] !== undefined;
}

/** Maps a column-kit fingerprint key (camelCase) to its SQL column name (snake_case). */
export function columnKitSqlColumnNameFromFingerprintName(columnName: ColumnKitColumnName): string {
  return COLUMN_KIT_SQL_NAME_BY_FINGERPRINT[columnName];
}

/**
 * Normalizes a column name to column-kit fingerprint naming:
 * - known fingerprint keys stay unchanged (`createdAt`)
 * - known SQL names map to fingerprint keys (`created_at` -> `createdAt`)
 * - unknown names return `null`
 */
export function columnKitFingerprintNameFromColumnName(columnName: string): ColumnKitColumnName | null {
  if (isColumnKitFingerprintName(columnName)) return columnName;
  return COLUMN_KIT_FINGERPRINT_BY_SQL_NAME[columnName] ?? null;
}

function normalizeKnownColumnKitName(columnName: string): string {
  return columnKitFingerprintNameFromColumnName(columnName) ?? columnName;
}

/**
 * Builds the {@link SharedColumnShapeCandidate} that exactly matches a column-kit fingerprint
 * (baseline for tests, codegen, and introspection diffing).
 */
export function sharedColumnShapeCandidateFromFingerprint(
  name: ColumnKitColumnName,
  fp: ColumnKitFingerprint
): SharedColumnShapeCandidate {
  if (fp.kind === "timestamp") {
    return {
      name,
      type: "timestamp",
      timezone: fp.timezone,
      notNull: fp.notNull,
      defaultNow: fp.defaultNow,
    };
  }
  if (fp.kind === "integer") {
    return {
      name,
      type: "integer",
      notNull: fp.notNull,
      ...(fp.references !== undefined ? { references: fp.references } : {}),
    };
  }
  return {
    name,
    type: "text",
    notNull: fp.notNull,
    ...(fp.unique !== undefined ? { unique: fp.unique } : {}),
    ...(fp.maxLength !== undefined ? { maxLength: fp.maxLength } : {}),
  };
}

const COLUMN_KIT_CATALOG_SHAPE_CANDIDATES: readonly SharedColumnShapeCandidate[] = Object.freeze(
  (Object.entries(COLUMN_KIT_FINGERPRINTS) as [ColumnKitColumnName, ColumnKitFingerprint][]).map(([name, fp]) =>
    sharedColumnShapeCandidateFromFingerprint(name, fp)
  )
);

/**
 * Frozen rows derived from {@link COLUMN_KIT_FINGERPRINTS} — canonical “expected” shapes for
 * {@link evaluateSharedColumnCoverageWithShapes} when declarations should match the catalog exactly.
 */
export function sharedColumnShapeCandidatesFromColumnKitCatalog(): readonly SharedColumnShapeCandidate[] {
  return COLUMN_KIT_CATALOG_SHAPE_CANDIDATES;
}

interface ParsedReferenceIdentity {
  readonly schema?: string;
  readonly table: string;
  readonly column: string;
}
const USER_PK_REFERENCE_ALIASES: ReadonlySet<string> = Object.freeze(new Set(["id", "userid"]));

function normalizeIdentifierPart(part: string): string {
  return part.trim().replace(/^"+|"+$/g, "").toLowerCase();
}

function normalizeColumnToken(column: string): string {
  return normalizeIdentifierPart(column).replace(/_/g, "");
}

function parseReferenceIdentity(reference: string): ParsedReferenceIdentity | null {
  const parts = reference
    .split(".")
    .map((part) => normalizeIdentifierPart(part))
    .filter((part) => part.length > 0);

  if (parts.length === 2) {
    return { table: parts[0]!, column: parts[1]! };
  }
  if (parts.length === 3) {
    return { schema: parts[0]!, table: parts[1]!, column: parts[2]! };
  }
  return null;
}

function referencesPointToSameSemanticTarget(expected: string, actual: string): boolean {
  const expectedRef = parseReferenceIdentity(expected);
  const actualRef = parseReferenceIdentity(actual);
  if (!expectedRef || !actualRef) return false;
  if (expectedRef.table !== actualRef.table) return false;
  if (
    expectedRef.schema != null &&
    actualRef.schema != null &&
    expectedRef.schema !== actualRef.schema
  ) {
    return false;
  }

  const expectedColumn = normalizeColumnToken(expectedRef.column);
  const actualColumn = normalizeColumnToken(actualRef.column);
  if (expectedColumn === actualColumn) return true;

  // Canonicalize security.users PK aliases (`id`, `userId`, `user_id`) to semantic equivalence.
  if (expectedRef.table === "users") {
    return USER_PK_REFERENCE_ALIASES.has(expectedColumn) && USER_PK_REFERENCE_ALIASES.has(actualColumn);
  }
  return false;
}

/** Returns whether a declared column shape satisfies the column-kit fingerprint. */
export function sharedColumnShapeMatches(expected: ColumnKitFingerprint, actual: SharedColumnShapeCandidate): boolean {
  if (expected.kind === "timestamp") {
    return (
      actual.type === "timestamp" &&
      actual.timezone === expected.timezone &&
      actual.notNull === expected.notNull &&
      actual.defaultNow === expected.defaultNow
    );
  }
  if (expected.kind === "integer") {
    if (actual.type !== "integer" || actual.notNull !== expected.notNull) return false;
    if (expected.references != null) {
      if (actual.references == null) return false;
      if (!referencesPointToSameSemanticTarget(expected.references, actual.references)) return false;
    }
    return true;
  }
  if (expected.kind === "text") {
    if (actual.type !== "text" || actual.notNull !== expected.notNull) return false;
    if (expected.unique === true && actual.unique !== true) return false;
    if (expected.maxLength != null) {
      if (actual.maxLength == null || actual.maxLength > expected.maxLength) return false;
    }
    return true;
  }
  return false;
}

export function evaluateSharedColumnCoverage(
  columnNames: Iterable<string>,
  options?: EvaluateSharedColumnCoverageOptions
): SharedColumnCoverageReport {
  const suppliedColumns = new Set(Array.from(columnNames, normalizeKnownColumnKitName));
  const violations: ColumnCoverageViolation[] = [];

  const allowSet = new Set<string>([...SHARED_COLUMN_ALLOWLIST, ...(options?.allowlist ?? [])]);

  for (const column of MANDATORY_SHARED_COLUMNS) {
    if (!suppliedColumns.has(column)) {
      violations.push({ kind: "missingMandatory", column });
    }
  }

  for (const column of RECOMMENDED_SHARED_COLUMNS) {
    if (!suppliedColumns.has(column)) {
      violations.push({ kind: "missingRecommended", column });
    }
  }

  for (const columnName of suppliedColumns) {
    if (SHARED_COLUMN_SET.has(columnName) || allowSet.has(columnName)) continue;
    const severity = sharedColumnPatternSeverity(columnName);
    if (severity !== null) {
      violations.push({ kind: "unexpectedSharedStyle", column: columnName, severity });
    }
  }

  const missingMandatory = violations
    .filter((v): v is Extract<ColumnCoverageViolation, { kind: "missingMandatory" }> => v.kind === "missingMandatory")
    .map((v) => v.column) as (typeof MANDATORY_SHARED_COLUMNS)[number][];

  const missingRecommended = violations
    .filter((v): v is Extract<ColumnCoverageViolation, { kind: "missingRecommended" }> => v.kind === "missingRecommended")
    .map((v) => v.column) as (typeof RECOMMENDED_SHARED_COLUMNS)[number][];

  const unexpectedViolations = violations.filter(
    (v): v is Extract<ColumnCoverageViolation, { kind: "unexpectedSharedStyle" }> => v.kind === "unexpectedSharedStyle"
  );

  const unexpectedCritical = Object.freeze(
    unexpectedViolations.filter((v) => v.severity === "critical").map((v) => v.column).sort()
  );
  const unexpectedInformational = Object.freeze(
    unexpectedViolations.filter((v) => v.severity === "informational").map((v) => v.column).sort()
  );
  const unexpectedSharedColumns = Object.freeze(
    [...unexpectedCritical, ...unexpectedInformational].sort()
  );

  const isCriticalSharedStyleClean = unexpectedCritical.length === 0;
  const isCompliant = missingMandatory.length === 0 && isCriticalSharedStyleClean;

  return {
    violations: Object.freeze([...violations]),
    missingMandatory: Object.freeze(missingMandatory),
    missingRecommended: Object.freeze(missingRecommended),
    unexpectedSharedColumns,
    unexpectedCritical,
    unexpectedInformational,
    isCompliant,
    isCriticalSharedStyleClean,
  };
}

/**
 * Like `evaluateSharedColumnCoverage` but compares declared shapes to `COLUMN_KIT_FINGERPRINTS`
 * for every supplied column whose name is in that catalog (shared lifecycle + audit + `name`).
 */
export function evaluateSharedColumnCoverageWithShapes(
  columnDefs: Iterable<SharedColumnShapeCandidate>,
  options?: EvaluateSharedColumnCoverageOptions
): SharedColumnGovernanceReport {
  const defs = [...columnDefs];
  const normalizedDefs = defs.map((def) => ({
    ...def,
    name: normalizeKnownColumnKitName(def.name),
  }));
  const base = evaluateSharedColumnCoverage(
    normalizedDefs.map((d) => d.name),
    options
  );

  const shapeViolations: SharedColumnShapeViolation[] = [];
  for (const [idx, def] of normalizedDefs.entries()) {
    if (!isColumnKitFingerprintName(def.name)) continue;
    const expected = COLUMN_KIT_FINGERPRINTS[def.name];
    if (!sharedColumnShapeMatches(expected, def)) {
      shapeViolations.push({ column: def.name, expected, actual: defs[idx]! });
    }
  }

  const frozenShapes = Object.freeze([...shapeViolations]);
  const isShapeCompliant = frozenShapes.length === 0;

  return {
    ...base,
    shapeViolations: frozenShapes,
    isShapeCompliant,
    isCompliant: base.isCompliant && isShapeCompliant,
  };
}
