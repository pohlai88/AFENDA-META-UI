export { buildDiff } from "./diffBuilder.js";
export { detectChanges, trackCreate, trackDelete } from "./changeDetector.js";
export { logAuditEntry, queryAuditLog, getAuditLogForEntity, clearAuditLog } from "./auditLogger.js";
export { maskValue, formatTimeline } from "./timelineFormatter.js";

// Decision audit (Phase 4)
export {
  logDecisionAudit,
  logDecisionAuditBatch,
  linkToChain,
  queryDecisionAuditLog,
  getDecisionChain,
  getDecisionsForScope,
  getLatestDecision,
  getDecisionStats,
  getSlowDecisions,
  getAuditFailures,
  getDecisionChainForRequest,
  verifyDecisionCompliance,
  getUserAuditTrail,
  clearDecisionAuditLog,
  getDecisionAuditStoreSize,
  pruneOldDecisions,
} from "./decisionAuditLogger.js";
