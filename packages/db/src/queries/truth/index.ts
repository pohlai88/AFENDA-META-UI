export {
  TRUTH_POLICY_VERSION_V1,
  type DocumentTruthFactSet,
  type TruthDecisionEnvelope,
  type TruthDuplicateRisk,
  type TruthRecommendedAction,
  type TruthResolutionState,
} from "./contracts.js";
export { compileDocumentTruth } from "./compiler.js";
export {
  insertTruthDecisionRow,
  updateAttachmentTruthState,
  createTruthResolutionTaskIfNeeded,
  upsertPreDecisionBlocksFromEnvelope,
  hasActivePreDecisionBlock,
  countDuplicateChecksumPeers,
} from "./persistence.js";
export { runDocumentTruthCompiler, type RunTruthCompilerOptions } from "./pipeline.js";
export {
  getLatestTruthDecision,
  getAttachmentTruthSummary,
  listOpenTruthResolutionTasks,
  listActivePreDecisionBlocks,
  exportAttachmentChainOfCustody,
  queryTruthDecisionsByIntent,
} from "./decisionRetrieval.js";
export {
  setAttachmentLegalHold,
  setAttachmentRetentionExpiresAt,
  setMalwareScanStatus,
} from "./compliance.js";
export {
  setAttachmentSignatureWorkflowStatus,
  createSignatureAttestationRequest,
  updateSignatureAttestationStatus,
  listSignatureAttestations,
  getAttachmentSignatureSummary,
} from "./signatures.js";
export { getTruthGuardrailMetrics, getTruthGuardrailTimeSeries } from "./metrics.js";
export { listAttachmentTruthOverrides, resolveTruthResolutionTaskWithOverride } from "./overrides.js";
export { evaluateAndLogPreDecisionGuardrail, listAttachmentGuardrailEvents } from "./guardrails.js";
