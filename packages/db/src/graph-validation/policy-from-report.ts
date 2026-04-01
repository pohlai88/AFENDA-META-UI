/**
 * Parse and validate minimal fields from a persisted graph-validation report JSON.
 * Used by CI and optional runtime guardrails.
 */

import type {
  AdjunctCheckResult,
  GraphValidationPolicy,
  GraphValidationReportJson,
  PolicyAction,
  PolicySeverity,
} from "./types.js";
import { GRAPH_VALIDATION_REPORT_VERSION } from "./types.js";

const HEALTH_GRADES = new Set(["A+", "A", "B", "C", "D", "F"]);
const HEALTH_STATUSES = new Set(["HEALTHY", "WARNING", "CRITICAL"]);

function validateStringArray(path: string, value: unknown): string[] {
  if (!Array.isArray(value)) {
    throw new GraphValidationReportParseError(`${path} must be an array`);
  }
  for (let i = 0; i < value.length; i++) {
    if (typeof value[i] !== "string") {
      throw new GraphValidationReportParseError(`${path}[${i}] must be a string`);
    }
  }
  return value as string[];
}

function validatePriorityCounts(path: string, value: unknown): void {
  if (!isRecord(value)) {
    throw new GraphValidationReportParseError(`${path} must be an object`);
  }
  for (const k of ["P0", "P1", "P2", "P3"] as const) {
    if (typeof value[k] !== "number" || !Number.isFinite(value[k])) {
      throw new GraphValidationReportParseError(`${path}.${k} must be a finite number`);
    }
  }
}

function validateHealthScoreObject(path: string, h: Record<string, unknown>): void {
  if (typeof h.overall !== "number" || !Number.isFinite(h.overall)) {
    throw new GraphValidationReportParseError(`${path}.overall must be a finite number`);
  }
  if (!isRecord(h.dimensions)) {
    throw new GraphValidationReportParseError(`${path}.dimensions must be an object`);
  }
  const d = h.dimensions;
  for (const key of ["orphanScore", "indexScore", "tenantScore", "cascadeScore"] as const) {
    if (typeof d[key] !== "number" || !Number.isFinite(d[key])) {
      throw new GraphValidationReportParseError(`${path}.dimensions.${key} must be a finite number`);
    }
  }
  if (typeof h.grade !== "string" || !HEALTH_GRADES.has(h.grade)) {
    throw new GraphValidationReportParseError(`${path}.grade invalid`);
  }
  if (typeof h.status !== "string" || !HEALTH_STATUSES.has(h.status)) {
    throw new GraphValidationReportParseError(`${path}.status invalid`);
  }
  if (!Array.isArray(h.recommendations)) {
    throw new GraphValidationReportParseError(`${path}.recommendations must be an array`);
  }
  for (let i = 0; i < h.recommendations.length; i++) {
    if (typeof h.recommendations[i] !== "string") {
      throw new GraphValidationReportParseError(`${path}.recommendations[${i}] must be a string`);
    }
  }
}

function validateIndexCoverage(path: string, value: unknown): void {
  if (!isRecord(value)) {
    throw new GraphValidationReportParseError(`${path} must be an object`);
  }
  for (const k of ["covered", "total", "missing"] as const) {
    if (typeof value[k] !== "number" || !Number.isFinite(value[k])) {
      throw new GraphValidationReportParseError(`${path}.${k} must be a finite number`);
    }
  }
}

function validateOrphansReport(path: string, value: unknown): void {
  if (!isRecord(value)) {
    throw new GraphValidationReportParseError(`${path} must be an object`);
  }
  if (typeof value.total !== "number" || !Number.isFinite(value.total)) {
    throw new GraphValidationReportParseError(`${path}.total must be a finite number`);
  }
  validatePriorityCounts(`${path}.byPriority`, value.byPriority);
  if (!Array.isArray(value.details)) {
    throw new GraphValidationReportParseError(`${path}.details must be an array`);
  }
  for (let i = 0; i < value.details.length; i++) {
    const row = value.details[i];
    if (!isRecord(row)) {
      throw new GraphValidationReportParseError(`${path}.details[${i}] must be an object`);
    }
    if (typeof row.table !== "string") {
      throw new GraphValidationReportParseError(`${path}.details[${i}].table must be a string`);
    }
    if (!Array.isArray(row.violations)) {
      throw new GraphValidationReportParseError(`${path}.details[${i}].violations must be an array`);
    }
  }
}

function validateTenantLeaksReport(path: string, value: unknown): void {
  if (!isRecord(value)) {
    throw new GraphValidationReportParseError(`${path} must be an object`);
  }
  if (typeof value.totalLeaks !== "number" || !Number.isFinite(value.totalLeaks)) {
    throw new GraphValidationReportParseError(`${path}.totalLeaks must be a finite number`);
  }
  if (typeof value.isSecure !== "boolean") {
    throw new GraphValidationReportParseError(`${path}.isSecure must be boolean`);
  }
  if (!Array.isArray(value.details)) {
    throw new GraphValidationReportParseError(`${path}.details must be an array`);
  }
}

function validateCatalogSummary(path: string, value: unknown): void {
  if (!isRecord(value)) {
    throw new GraphValidationReportParseError(`${path} must be an object`);
  }
  validateStringArray(`${path}.schemasCovered`, value.schemasCovered);
  if (typeof value.totalRelationships !== "number" || !Number.isFinite(value.totalRelationships)) {
    throw new GraphValidationReportParseError(`${path}.totalRelationships must be a finite number`);
  }
  validatePriorityCounts(`${path}.byPriority`, value.byPriority);
}

const ADJUNCT_IDS = new Set<AdjunctCheckResult["id"]>([
  "migration_sql_lint",
  "fk_catalog_drift",
  "schema_observability",
]);
const ADJUNCT_STATUSES = new Set<AdjunctCheckResult["status"]>([
  "passed",
  "failed",
  "skipped",
  "warning",
]);

function validateAdjunctsDto(path: string, value: unknown): void {
  if (!isRecord(value)) {
    throw new GraphValidationReportParseError(`${path} must be an object`);
  }
  if (!Array.isArray(value.checks)) {
    throw new GraphValidationReportParseError(`${path}.checks must be an array`);
  }
  for (let i = 0; i < value.checks.length; i++) {
    const c = value.checks[i];
    if (!isRecord(c)) {
      throw new GraphValidationReportParseError(`${path}.checks[${i}] must be an object`);
    }
    if (typeof c.id !== "string" || !ADJUNCT_IDS.has(c.id as AdjunctCheckResult["id"])) {
      throw new GraphValidationReportParseError(`${path}.checks[${i}].id invalid`);
    }
    if (typeof c.status !== "string" || !ADJUNCT_STATUSES.has(c.status as AdjunctCheckResult["status"])) {
      throw new GraphValidationReportParseError(`${path}.checks[${i}].status invalid`);
    }
    if (typeof c.message !== "string") {
      throw new GraphValidationReportParseError(`${path}.checks[${i}].message must be a string`);
    }
  }
}

export class GraphValidationReportParseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "GraphValidationReportParseError";
  }
}

function isRecord(x: unknown): x is Record<string, unknown> {
  return x !== null && typeof x === "object" && !Array.isArray(x);
}

const POLICY_SEVERITIES = new Set<PolicySeverity>([
  "P0_SECURITY",
  "P1_DATA_CORRUPTION",
  "P2_INCONSISTENCY",
  "P3_OBSERVABILITY",
]);
const POLICY_ACTIONS = new Set<PolicyAction>(["BLOCK", "WARN", "ALLOW"]);

function validatePolicyDecision(d: unknown, path: string): void {
  if (!isRecord(d)) {
    throw new GraphValidationReportParseError(`${path} must be an object`);
  }
  if (typeof d.severity !== "string" || !POLICY_SEVERITIES.has(d.severity as PolicySeverity)) {
    throw new GraphValidationReportParseError(`${path}.severity invalid`);
  }
  if (typeof d.action !== "string" || !POLICY_ACTIONS.has(d.action as PolicyAction)) {
    throw new GraphValidationReportParseError(`${path}.action invalid`);
  }
  if (d.ttlSeconds !== undefined) {
    if (typeof d.ttlSeconds !== "number" || !Number.isFinite(d.ttlSeconds) || d.ttlSeconds < 0) {
      throw new GraphValidationReportParseError(`${path}.ttlSeconds must be a non-negative finite number`);
    }
  }
}

/**
 * Parse unknown JSON into a report shape; throws on missing required v1 fields.
 */
function validatePolicyObject(p: unknown, path: string): GraphValidationPolicy {
  if (!isRecord(p)) {
    throw new GraphValidationReportParseError(`${path} must be an object`);
  }
  if (typeof p.isSecurityBlocking !== "boolean") {
    throw new GraphValidationReportParseError(`${path}.isSecurityBlocking must be boolean`);
  }
  if (typeof p.isOperationalWarning !== "boolean") {
    throw new GraphValidationReportParseError(`${path}.isOperationalWarning must be boolean`);
  }
  if (p.confidenceLevel !== "high" && p.confidenceLevel !== "medium" && p.confidenceLevel !== "low") {
    throw new GraphValidationReportParseError(`${path}.confidenceLevel invalid`);
  }
  const out: GraphValidationPolicy = {
    isSecurityBlocking: p.isSecurityBlocking,
    isOperationalWarning: p.isOperationalWarning,
    confidenceLevel: p.confidenceLevel,
  };
  if (typeof p.securityReason === "string") {
    out.securityReason = p.securityReason;
  }
  if (p.decision !== undefined) {
    validatePolicyDecision(p.decision, `${path}.decision`);
    const dec = p.decision as Record<string, unknown>;
    out.decision = {
      severity: dec.severity as PolicySeverity,
      action: dec.action as PolicyAction,
      ...(typeof dec.ttlSeconds === "number" ? { ttlSeconds: dec.ttlSeconds } : {}),
    };
  }
  if (typeof p.policyGeneratedAt === "string") {
    out.policyGeneratedAt = p.policyGeneratedAt;
  }
  return out;
}

/**
 * Parse full v1 report JSON (strict). Use for contract tests and CI artifact validation.
 */
export function parseGraphValidationReportJson(raw: unknown): GraphValidationReportJson {
  if (!isRecord(raw)) {
    throw new GraphValidationReportParseError("Report root must be an object");
  }
  if (raw.reportVersion !== GRAPH_VALIDATION_REPORT_VERSION) {
    throw new GraphValidationReportParseError(
      `Unsupported reportVersion: ${String(raw.reportVersion)} (expected ${GRAPH_VALIDATION_REPORT_VERSION})`
    );
  }
  if (typeof raw.generatedAt !== "string") {
    throw new GraphValidationReportParseError("Missing generatedAt");
  }
  if (!isRecord(raw.policy)) {
    throw new GraphValidationReportParseError("Missing policy");
  }
  validatePolicyObject(raw.policy, "policy");
  if (!isRecord(raw.healthScore)) {
    throw new GraphValidationReportParseError("Missing healthScore");
  }
  validateHealthScoreObject("healthScore", raw.healthScore);
  validateStringArray("schemasCovered", raw.schemasCovered);
  validateIndexCoverage("indexCoverage", raw.indexCoverage);
  validateOrphansReport("orphans", raw.orphans);
  validateTenantLeaksReport("tenantLeaks", raw.tenantLeaks);
  validateCatalogSummary("catalog", raw.catalog);
  if (raw.adjuncts !== undefined) {
    validateAdjunctsDto("adjuncts", raw.adjuncts);
  }
  const pol = raw.policy as Record<string, unknown>;
  if (typeof pol.policyGeneratedAt !== "string" && typeof raw.generatedAt === "string") {
    pol.policyGeneratedAt = raw.generatedAt;
  }
  return raw as unknown as GraphValidationReportJson;
}

/**
 * Extract policy from either a full report or a standalone `policy` object (env injection).
 */
export function extractPolicyFromEnvelope(raw: unknown): GraphValidationPolicy {
  if (!isRecord(raw)) {
    throw new GraphValidationReportParseError("Envelope must be an object");
  }
  if (isRecord(raw.policy)) {
    const pol = validatePolicyObject(raw.policy, "policy");
    if (!pol.policyGeneratedAt && typeof raw.generatedAt === "string") {
      return { ...pol, policyGeneratedAt: raw.generatedAt };
    }
    return pol;
  }
  return validatePolicyObject(raw, "root");
}

export function policyFromReportJson(report: GraphValidationReportJson): GraphValidationPolicy {
  return { ...report.policy };
}
