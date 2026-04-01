import type { GraphHealthScore } from "./health-scoring.js";

/**
 * Versioned machine contract for graph-validation JSON output.
 * Bump `GRAPH_VALIDATION_REPORT_VERSION` when breaking shape changes.
 */
export const GRAPH_VALIDATION_REPORT_VERSION = 1 as const;

/** Confidence in scores: full dimensions measured vs partial / adjunct-only */
export type GraphValidationConfidenceLevel = "high" | "medium" | "low";

/** Graded enforcement for runtime guardrails (supersedes booleans for UX; guards still honor legacy flags). */
export type PolicySeverity =
  | "P0_SECURITY"
  | "P1_DATA_CORRUPTION"
  | "P2_INCONSISTENCY"
  | "P3_OBSERVABILITY";

export type PolicyAction = "BLOCK" | "WARN" | "ALLOW";

export interface PolicyDecision {
  severity: PolicySeverity;
  action: PolicyAction;
  /** Max age of this policy snapshot in seconds (with policyGeneratedAt). */
  ttlSeconds?: number;
}

/**
 * Policy flags for runtime guardrails and CI.
 * - isSecurityBlocking: cross-tenant FK leaks (must hard-block reads when wired)
 * - isOperationalWarning: health degraded but not a security incident
 * - decision: graded severity/action for telemetry and future UX
 * - policyGeneratedAt: ISO-8601; required for TTL enforcement when ttlSeconds is set
 */
export interface GraphValidationPolicy {
  isSecurityBlocking: boolean;
  isOperationalWarning: boolean;
  confidenceLevel: GraphValidationConfidenceLevel;
  /** Human-readable reason for blocking (if any) */
  securityReason?: string;
  decision?: PolicyDecision;
  /** When the policy was derived (typically report.generatedAt). */
  policyGeneratedAt?: string;
}

export interface GraphValidationIndexCoverageDto {
  covered: number;
  total: number;
  missing: number;
}

export interface OrphanViolationDto {
  childTableSchema: string;
  childTableName: string;
  parentTableSchema: string;
  parentTableName: string;
  childTable: string;
  parentTable: string;
  fkColumn: string;
  parentColumn: string;
  orphanCount: number;
  sampleIds: string[];
}

export interface OrphansReportDto {
  total: number;
  byPriority: { P0: number; P1: number; P2: number; P3: number };
  details: Array<{ table: string; violations: OrphanViolationDto[] }>;
}

export interface TenantLeakSampleDto {
  childKey: string;
  childTenantId: number;
  parentKey: string;
  parentTenantId: number;
}

export interface TenantLeakViolationDto {
  childTable: string;
  parentTable: string;
  fkColumn: string;
  leakCount: number;
  sampleViolations: TenantLeakSampleDto[];
}

export interface TenantLeaksReportDto {
  totalLeaks: number;
  isSecure: boolean;
  details: TenantLeakViolationDto[];
}

export interface CatalogSummaryDto {
  schemasCovered: string[];
  totalRelationships: number;
  byPriority: { P0: number; P1: number; P2: number; P3: number };
}

export type AdjunctStatus = "passed" | "failed" | "skipped" | "warning";

export interface AdjunctCheckResult {
  id: "migration_sql_lint" | "fk_catalog_drift" | "schema_observability";
  status: AdjunctStatus;
  message: string;
  details?: Record<string, unknown>;
}

export interface GraphValidationAdjunctsDto {
  checks: AdjunctCheckResult[];
}

/** Top-level JSON report (v1) — stable field names for consumers */
export interface GraphValidationReportJson {
  reportVersion: typeof GRAPH_VALIDATION_REPORT_VERSION;
  generatedAt: string;
  schemasCovered: string[];
  policy: GraphValidationPolicy;
  healthScore: GraphHealthScore;
  indexCoverage: GraphValidationIndexCoverageDto;
  orphans: OrphansReportDto;
  tenantLeaks: TenantLeaksReportDto;
  catalog: CatalogSummaryDto;
  adjuncts?: GraphValidationAdjunctsDto;
}
