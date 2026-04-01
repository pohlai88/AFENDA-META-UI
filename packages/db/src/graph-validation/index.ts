/**
 * Graph validation — programmatic API for reports, policy, and adjunct metadata.
 * CLI remains in `runner.ts`.
 */

export { GRAPH_VALIDATION_REPORT_VERSION } from "./types.js";
export type {
  GraphValidationReportJson,
  GraphValidationPolicy,
  GraphValidationConfidenceLevel,
  AdjunctCheckResult,
  PolicySeverity,
  PolicyAction,
  PolicyDecision,
} from "./types.js";

export type { TruthSurface } from "./truth-surface.js";

export { buildGraphValidationReport, DEFAULT_ERP_SCHEMAS } from "./report-service.js";
export type { BuildGraphValidationReportOptions } from "./report-service.js";

export { stringifyReportDeterministic } from "./report-dto.js";

export {
  parseGraphValidationReportJson,
  extractPolicyFromEnvelope,
  policyFromReportJson,
  GraphValidationReportParseError,
} from "./policy-from-report.js";

export { calculateHealthScore, deriveGraphValidationPolicy, formatHealthReport } from "./health-scoring.js";
export type { GraphHealthScore, ValidationInputs } from "./health-scoring.js";

export { runGraphValidationAdjuncts, fingerprintFkCatalog } from "./adjuncts.js";
