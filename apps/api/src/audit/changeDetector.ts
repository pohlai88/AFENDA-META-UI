/**
 * Change Detector
 * ===============
 * Orchestrates audit entry creation from CRUD operations.
 * Combines diff building with metadata resolution.
 */

import type { AuditEntry, AuditOperation, AuditSource, MetaField } from "@afenda/meta-types";
import { buildDiff } from "./diffBuilder.js";

let idCounter = 0;

function generateAuditId(): string {
  idCounter += 1;
  return `audit_${Date.now()}_${idCounter}`;
}

/**
 * Detect changes between old and new record states and build an AuditEntry.
 *
 * @param entity       - Model/entity name
 * @param entityId     - Record identifier
 * @param operation    - What CRUD operation occurred
 * @param actor        - User ID or system principal
 * @param oldRecord    - Previous state ({} for creates)
 * @param newRecord    - Current state ({} for deletes)
 * @param fields       - MetaField definitions (for sensitivity lookup)
 * @param source       - Origin of the change
 * @param reason       - Optional change reason (compliance)
 * @returns AuditEntry with detected changes, or null if no changes
 */
export function detectChanges(
  entity: string,
  entityId: string,
  operation: AuditOperation,
  actor: string,
  oldRecord: Record<string, unknown>,
  newRecord: Record<string, unknown>,
  fields: MetaField[],
  source: AuditSource = "api",
  reason?: string
): AuditEntry | null {
  const changes = buildDiff(oldRecord, newRecord, fields);

  // For updates with no actual changes, skip audit entry
  if (operation === "update" && changes.length === 0) {
    return null;
  }

  return {
    id: generateAuditId(),
    entity,
    entityId,
    timestamp: new Date().toISOString(),
    actor,
    operation,
    changes,
    source,
    reason,
  };
}

/**
 * Track a record creation — all field values become "new" changes.
 */
export function trackCreate(
  entity: string,
  entityId: string,
  record: Record<string, unknown>,
  actor: string,
  fields: MetaField[],
  source: AuditSource = "api",
  reason?: string
): AuditEntry {
  return detectChanges(entity, entityId, "create", actor, {}, record, fields, source, reason)!;
}

/**
 * Track a record deletion — all field values become "old" changes.
 */
export function trackDelete(
  entity: string,
  entityId: string,
  record: Record<string, unknown>,
  actor: string,
  fields: MetaField[],
  source: AuditSource = "api",
  reason?: string
): AuditEntry {
  return detectChanges(entity, entityId, "delete", actor, record, {}, fields, source, reason)!;
}
