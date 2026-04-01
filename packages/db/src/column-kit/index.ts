export {
  appendOnlyTimestampColumns,
  softDeleteColumns,
  timestampColumns,
} from "./drizzle-mixins/timestamps.js";
export { auditColumns } from "./drizzle-mixins/audit.js";
export { nameColumn } from "./drizzle-mixins/name.js";
export { TIMESTAMP_FINGERPRINTS } from "./fingerprints/timestamps.js";
export { AUDIT_FINGERPRINTS } from "./fingerprints/audit.js";
export { NAME_FINGERPRINTS } from "./fingerprints/name.js";
export {
  ALL_SHARED_FINGERPRINTS,
  COLUMN_KIT_FINGERPRINTS,
  type ColumnKitColumnName,
  type ColumnKitFingerprint,
  type IntegerColumnFingerprint,
  MANDATORY_SHARED_COLUMNS,
  RECOMMENDED_SHARED_COLUMNS,
  type SharedColumnFingerprint,
  type TextColumnFingerprint,
  type TimestampFingerprint,
} from "./fingerprints/shared.js";
export {
  columnNameMatchesSharedColumnPattern,
  sharedColumnPatternSeverity,
  SHARED_COLUMN_ALLOWLIST,
  SHARED_COLUMN_PATTERN_REGEXES,
  SHARED_COLUMN_PATTERNS,
  type SharedColumnPattern,
  type SharedColumnPatternSeverity,
} from "./fingerprints/patterns.js";
export {
  matrixExemptsCoverageViolation,
  resolveColumnKitGovernanceProfile,
  type ColumnKitGovernanceProfile,
  type TableLifecycleClass,
} from "./governance-matrix.js";
export {
  columnKitFingerprintNameFromColumnName,
  columnKitSqlColumnNameFromFingerprintName,
  evaluateSharedColumnCoverage,
  evaluateSharedColumnCoverageWithShapes,
  isColumnKitSqlColumnName,
  isColumnKitFingerprintName,
  isSharedColumnName,
  sharedColumnShapeCandidateFromFingerprint,
  sharedColumnShapeCandidatesFromColumnKitCatalog,
  sharedColumnShapeMatches,
  type ColumnCoverageViolation,
  type ColumnCoverageViolationKind,
  type EvaluateSharedColumnCoverageOptions,
  type SharedColumnCoverageReport,
  type SharedColumnGovernanceReport,
  type SharedColumnName,
  type SharedColumnShapeCandidate,
  type SharedColumnShapeViolation,
} from "./governance.js";
