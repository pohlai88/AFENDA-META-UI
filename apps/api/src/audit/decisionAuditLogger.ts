/**
 * Decision Audit Logger
 * ====================
 * Captures every deterministic decision the platform makes:
 * - Metadata resolution (which layers applied)
 * - Rule evaluations (did expression fire?)
 * - Policy enforcement (violations detected?)
 * - Workflow transitions (step executed?)
 * - Event propagation (published where?)
 *
 * This creates a complete trace of business logic execution,
 * enabling replay, debugging, compliance verification, and audit trails.
 *
 * Default implementation: in-memory (for development/testing).
 * Production: replace with DB-backed implementation.
 */

import type { DecisionAuditEntry, DecisionAuditQuery, DecisionAuditChain } from "@afenda/meta-types/audit";
import * as auditRepo from "./decisionAuditRepository.js";

// ---------------------------------------------------------------------------
// Persistence flag — enabled explicitly after startup DB check passes
// ---------------------------------------------------------------------------

let dbPersistEnabled = false;

export function enableAuditPersistence(): void {
  dbPersistEnabled = true;
}

// ---------------------------------------------------------------------------
// In-Memory Store (swap for DB in production)
// ---------------------------------------------------------------------------

const store: DecisionAuditEntry[] = [];
const chains: Map<string, DecisionAuditChain> = new Map();

// ---------------------------------------------------------------------------
// Write Operations
// ---------------------------------------------------------------------------

/**
 * Log a single decision audit entry
 */
export function logDecisionAudit(entry: DecisionAuditEntry): void {
  store.push(entry);
  if (dbPersistEnabled) auditRepo.dbLogDecisionAudit(entry);
}

/**
 * Log multiple decision entries (batch operation)
 */
export function logDecisionAuditBatch(entries: DecisionAuditEntry[]): void {
  store.push(...entries);
  if (dbPersistEnabled) auditRepo.dbLogDecisionAuditBatch(entries);
}

/**
 * Link a decision entry to a chain (for tracing parent-child relationships)
 * @example
 * const rootId = generateId();
 * linkToChain(rootId, entry1);  // Metadata resolution
 * linkToChain(rootId, entry2);  // Rule evaluation
 * linkToChain(rootId, entry3);  // Policy enforcement
 * const chain = getDecisionChain(rootId);
 */
export function linkToChain(chainId: string, entry: DecisionAuditEntry): void {
  logDecisionAudit(entry);

  if (!chains.has(chainId)) {
    chains.set(chainId, {
      rootId: chainId,
      entries: [],
      totalDurationMs: 0,
      errors: [],
    });
  }

  const chain = chains.get(chainId)!;
  chain.entries.push(entry);
  chain.totalDurationMs += entry.durationMs;

  if (entry.status === "error" && entry.error) {
    chain.errors.push(entry.error);
  }

  // DB chain tracking happens inside dbLogDecisionAudit + linkToChain repo
  if (dbPersistEnabled) void auditRepo.dbLinkToChain(chainId, entry);
}

// ---------------------------------------------------------------------------
// Query Operations
// ---------------------------------------------------------------------------

/**
 * Query decision audit logs by filters
 * Returns newest entries first
 */
export function queryDecisionAuditLog(query: DecisionAuditQuery): DecisionAuditEntry[] {
  let results = [...store];

  // Filter by tenant (required)
  results = results.filter((e) => e.tenantId === query.tenantId);

  // Filter by event type (optional)
  if (query.eventType) {
    results = results.filter((e) => e.eventType === query.eventType);
  }

  // Filter by scope (optional, supports wildcard)
  if (query.scope) {
    const pattern = query.scope.replace(/\*/g, ".*");
    const regex = new RegExp(`^${pattern}$`);
    results = results.filter((e) => regex.test(e.scope));
  }

  // Filter by userId (optional)
  if (query.userId) {
    results = results.filter((e) => e.userId === query.userId);
  }

  // Filter by timestamp range (optional)
  if (query.fromTimestamp) {
    results = results.filter((e) => e.timestamp >= query.fromTimestamp!);
  }
  if (query.toTimestamp) {
    results = results.filter((e) => e.timestamp <= query.toTimestamp!);
  }

  // Sort newest-first
  results = results.sort((a, b) => b.timestamp.localeCompare(a.timestamp));

  // Apply pagination
  const offset = query.offset || 0;
  const limit = query.limit || 100;
  return results.slice(offset, offset + limit);
}

/**
 * Retrieve a complete decision chain by root ID
 * Shows the full sequence of decisions from request start to finish
 */
export function getDecisionChain(chainId: string): DecisionAuditChain | null {
  return chains.get(chainId) || null;
}

/**
 * Get all decision entries for a specific scope
 * @example
 * const invoiceMetadataDecisions = getDecisionsForScope("invoice", "metadata_resolved");
 */
export function getDecisionsForScope(
  tenantId: string,
  scope: string,
  eventType?: string
): DecisionAuditEntry[] {
  let results = store.filter((e) => e.tenantId === tenantId && e.scope.startsWith(scope));

  if (eventType) {
    results = results.filter((e) => e.eventType === eventType);
  }

  return results.sort((a, b) => b.timestamp.localeCompare(a.timestamp));
}

/**
 * Get most recent decision for a scope
 */
export function getLatestDecision(tenantId: string, scope: string): DecisionAuditEntry | null {
  const entries = getDecisionsForScope(tenantId, scope);
  return entries[0] || null;
}

// ---------------------------------------------------------------------------
// Analytics & Insights
// ---------------------------------------------------------------------------

/**
 * Get performance statistics for a given decision type
 * Useful for identifying performance bottlenecks
 */
export function getDecisionStats(
  tenantId: string,
  eventType: string,
  timeWindowMs: number = 3600000 // 1 hour default
): {
  count: number;
  avgDurationMs: number;
  minDurationMs: number;
  maxDurationMs: number;
  errorRate: number; // 0-1
} {
  const now = new Date();
  const cutoff = new Date(now.getTime() - timeWindowMs).toISOString();

  const entries = store.filter(
    (e) => e.tenantId === tenantId && e.eventType === eventType && e.timestamp >= cutoff
  );

  if (entries.length === 0) {
    return {
      count: 0,
      avgDurationMs: 0,
      minDurationMs: 0,
      maxDurationMs: 0,
      errorRate: 0,
    };
  }

  const durations = entries.map((e) => e.durationMs);
  const errors = entries.filter((e) => e.status === "error");

  return {
    count: entries.length,
    avgDurationMs: durations.reduce((a, b) => a + b, 0) / durations.length,
    minDurationMs: Math.min(...durations),
    maxDurationMs: Math.max(...durations),
    errorRate: errors.length / entries.length,
  };
}

/**
 * Identify decisions that exceeded a duration threshold
 * (Useful for performance optimization)
 */
export function getSlowDecisions(
  tenantId: string,
  thresholdMs: number,
  limit: number = 10
): DecisionAuditEntry[] {
  return store
    .filter((e) => e.tenantId === tenantId && e.durationMs > thresholdMs)
    .sort((a, b) => b.durationMs - a.durationMs)
    .slice(0, limit);
}

/**
 * Get audit decision events that resulted in violations or errors
 */
export function getAuditFailures(tenantId: string, limit: number = 50): DecisionAuditEntry[] {
  return store
    .filter(
      (e) =>
        e.tenantId === tenantId &&
        (e.status === "error" || (e.decision.violations && e.decision.violations.length > 0))
    )
    .sort((a, b) => b.timestamp.localeCompare(a.timestamp))
    .slice(0, limit);
}

// ---------------------------------------------------------------------------
// Debugging & Inspection
// ---------------------------------------------------------------------------

/**
 * Retrieve the decision chain for a specific request
 * @example
 * const chain = getDecisionChainForRequest("req-12345");
 * Shows: metadata resolution → rule evaluation → policy enforcement → workflow transition
 */
export function getDecisionChainForRequest(
  requestId: string,
  tenantId: string
): DecisionAuditEntry[] {
  const entries = store.filter(
    (e) =>
      e.tenantId === tenantId &&
      e.context &&
      (e.context.eventId === requestId || e.id.startsWith(requestId))
  );
  return entries.sort((a, b) => a.timestamp.localeCompare(b.timestamp));
}

// ---------------------------------------------------------------------------
// Compliance & Verification
// ---------------------------------------------------------------------------

/**
 * Verify that a decision was made with all expected tenant layers applied
 * Used for compliance verification
 */
export function verifyDecisionCompliance(
  entry: DecisionAuditEntry,
  expectedLayers: string[]
): boolean {
  if (!entry.decision.appliedLayers) {
    return false;
  }

  return expectedLayers.every((layer) => entry.decision.appliedLayers!.includes(layer));
}

/**
 * Get audit trail for a specific user's decisions
 * (GDPR/compliance: user data access/modification requests)
 */
export function getUserAuditTrail(
  tenantId: string,
  userId: string,
  limit: number = 100
): DecisionAuditEntry[] {
  return store
    .filter((e) => e.tenantId === tenantId && e.userId === userId)
    .sort((a, b) => b.timestamp.localeCompare(a.timestamp))
    .slice(0, limit);
}

// ---------------------------------------------------------------------------
// Maintenance
// ---------------------------------------------------------------------------

/**
 * Clear all decision audit logs (for testing only!)
 */
export function clearDecisionAuditLog(): void {
  store.length = 0;
  chains.clear();
}

/**
 * Flush any buffered audit entries to DB and stop the background flusher.
 * Call during graceful shutdown to avoid data loss.
 */
export async function flushAndStopAuditPersistence(): Promise<void> {
  if (!dbPersistEnabled) return;
  await auditRepo.flushBuffer();
  auditRepo.stopFlusher();
}

/**
 * Get store size (for debugging)
 */
export function getDecisionAuditStoreSize(): number {
  return store.length;
}

/**
 * Clean up old audit entries (retention policy)
 * @param olderThanMs - Delete entries older than this (e.g., 90 days)
 */
export function pruneOldDecisions(olderThanMs: number): number {
  const cutoff = new Date(Date.now() - olderThanMs).toISOString();
  const before = store.length;

  store.splice(
    0,
    store.findIndex((e) => e.timestamp > cutoff)
  );

  // Also prune chains that no longer have entries
  for (const [id, chain] of chains) {
    chain.entries = chain.entries.filter((e) => e.timestamp > cutoff);
    if (chain.entries.length === 0) {
      chains.delete(id);
    }
  }

  return before - store.length;
}
