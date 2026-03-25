/**
 * Audit Logger
 * ============
 * Abstract audit persistence layer.
 * Stores and retrieves AuditEntry records.
 *
 * Default implementation: in-memory (for development/testing).
 * Production: replace with DB-backed implementation.
 */

import type { AuditEntry, AuditQuery } from "@afenda/meta-types";

// ---------------------------------------------------------------------------
// In-Memory Store (swap for DB in production)
// ---------------------------------------------------------------------------

const store: AuditEntry[] = [];

export function logAuditEntry(entry: AuditEntry): void {
  store.push(entry);
}

export function queryAuditLog(query: AuditQuery): AuditEntry[] {
  let results = store;

  if (query.entity) {
    results = results.filter((e) => e.entity === query.entity);
  }
  if (query.entityId) {
    results = results.filter((e) => e.entityId === query.entityId);
  }
  if (query.actor) {
    results = results.filter((e) => e.actor === query.actor);
  }
  if (query.operation) {
    results = results.filter((e) => e.operation === query.operation);
  }
  if (query.source) {
    results = results.filter((e) => e.source === query.source);
  }
  if (query.fromTimestamp) {
    results = results.filter((e) => e.timestamp >= query.fromTimestamp!);
  }
  if (query.toTimestamp) {
    results = results.filter((e) => e.timestamp <= query.toTimestamp!);
  }

  // Sort newest-first
  results = [...results].sort((a, b) => b.timestamp.localeCompare(a.timestamp));

  const offset = query.offset ?? 0;
  const limit = query.limit ?? 100;

  return results.slice(offset, offset + limit);
}

export function getAuditLogForEntity(entity: string, entityId: string): AuditEntry[] {
  return queryAuditLog({ entity, entityId });
}

export function clearAuditLog(): void {
  store.length = 0;
}
