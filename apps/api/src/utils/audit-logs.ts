/**
 * Domain audit logging utilities for invariant verification and event tracking.
 *
 * Provides functions to record business rule validation outcomes and domain events
 * to persistent audit logs for compliance, debugging, and business intelligence.
 */

import { db } from "../db/index.js";
import { domainEventLogs, domainInvariantLogs } from "../db/schema/index.js";
import type { DomainEventType, InvariantSeverity, InvariantStatus } from "@afenda/db/schema/sales";

export interface RecordInvariantCheckParams {
  tenantId: number;
  invariantCode: string;
  entityType: string;
  entityId: string;
  status: InvariantStatus;
  severity: InvariantSeverity;
  /** When true, truth pipeline and similar gates must stop on failure (default: error→true, else false). */
  blocking?: boolean;
  expectedValue?: string;
  actualValue?: string;
  context?: Record<string, unknown>;
  evaluatedAt?: Date;
  actorId: number;
}

export interface RecordDomainEventParams {
  tenantId: number;
  eventType: DomainEventType | string; // Allow string for extensibility beyond enum
  entityType: string;
  entityId: string;
  payload?: Record<string, unknown>;
  triggeredBy?: number;
  causedByEventId?: string | null;
  correlationId?: string | null;
  actorId: number;
}

/**
 * Record a domain invariant check result.
 *
 * Logs the outcome of a business rule validation for audit trail and analytics.
 *
 * @example
 * ```ts
 * await recordInvariantCheck({
 *   tenantId: 1,
 *   invariantCode: "STOCK_BALANCE_MISMATCH",
 *   entityType: "consignment_stock_report_line",
 *   entityId: lineId,
 *   status: "fail",
 *   severity: "error",
 *   expectedValue: "10.0000",
 *   actualValue: "8.0000",
 *   context: { opening: "5", received: "10", sold: "7" },
 *   actorId: userId,
 * });
 * ```
 */
export async function recordInvariantCheck(params: RecordInvariantCheckParams): Promise<void> {
  const blocking =
    params.blocking ??
    (params.severity === "error" && params.status === "fail");
  await db.insert(domainInvariantLogs).values({
    tenantId: params.tenantId,
    invariantCode: params.invariantCode,
    entityType: params.entityType,
    entityId: params.entityId,
    status: params.status,
    severity: params.severity,
    blocking,
    expectedValue: params.expectedValue ?? null,
    actualValue: params.actualValue ?? null,
    context: params.context ? JSON.stringify(params.context) : null,
    evaluatedAt: params.evaluatedAt ?? new Date(),
    createdBy: params.actorId,
    updatedBy: params.actorId,
  });
}

/**
 * Record multiple invariant checks in a single transaction.
 *
 * More efficient than individual calls when validating multiple rules.
 */
export async function recordInvariantChecks(checks: RecordInvariantCheckParams[]): Promise<void> {
  if (checks.length === 0) return;

  await db.insert(domainInvariantLogs).values(
    checks.map((check) => ({
      tenantId: check.tenantId,
      invariantCode: check.invariantCode,
      entityType: check.entityType,
      entityId: check.entityId,
      status: check.status,
      severity: check.severity,
      expectedValue: check.expectedValue ?? null,
      actualValue: check.actualValue ?? null,
      context: check.context ? JSON.stringify(check.context) : null,
      evaluatedAt: check.evaluatedAt ?? new Date(),
      createdBy: check.actorId,
      updatedBy: check.actorId,
    }))
  );
}

/**
 * Record a domain event.
 *
 * Logs significant business actions for event sourcing, audit trail, and integration.
 *
 * @example
 * ```ts
 * await recordDomainEvent({
 *   tenantId: 1,
 *   eventType: "REPORT_VALIDATED",
 *   entityType: "consignment_stock_report",
 *   entityId: reportId,
 *   payload: { valid: true, issueCount: 0 },
 *   triggeredBy: userId,
 *   actorId: userId,
 * });
 * ```
 */
export async function recordDomainEvent(params: RecordDomainEventParams): Promise<void> {
  await db.insert(domainEventLogs).values({
    tenantId: params.tenantId,
    eventType: params.eventType as DomainEventType,
    entityType: params.entityType,
    entityId: params.entityId,
    payload: params.payload ?? {},
    triggeredBy: params.triggeredBy ?? null,
    causedByEventId: params.causedByEventId ?? null,
    correlationId: params.correlationId ?? null,
    createdBy: params.actorId,
    updatedBy: params.actorId,
  });
}

/**
 * Record invariant checks from validation issues.
 *
 * Convenience function to convert engine validation issues into audit logs.
 */
export async function recordValidationIssues(params: {
  tenantId: number;
  entityType: string;
  entityId: string;
  issues: Array<{
    code: string;
    severity: "error" | "warning" | "info";
    message: string;
    context?: Record<string, unknown>;
  }>;
  actorId: number;
}): Promise<void> {
  const checks: RecordInvariantCheckParams[] = params.issues.map((issue) => ({
    tenantId: params.tenantId,
    invariantCode: issue.code,
    entityType: params.entityType,
    entityId: params.entityId,
    status: issue.severity === "error" ? ("fail" as const) : ("pass" as const),
    severity: issue.severity as InvariantSeverity,
    context: issue.context,
    actorId: params.actorId,
  }));

  await recordInvariantChecks(checks);
}
