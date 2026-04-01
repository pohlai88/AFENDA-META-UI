/**
 * Truth pipeline — loads facts from the database, runs pure decision functions, throws before mutations.
 */

import { and, asc, eq } from "drizzle-orm";

import type { Database } from "../../drizzle/db.js";
import { documentApprovals, domainInvariantLogs } from "../../schema/sales/governance.js";
import type { SalesOrder } from "../../schema/sales/orders.js";

import {
  assertSalesOrderTruthCommitAllowed,
  type SalesOrderDocumentTruthInput,
  type SalesOrderTruthCreditInput,
  type SalesOrderTruthPolicy,
  resolveSalesOrderDocumentTruth,
} from "./documentTruthDecision.js";

export type EvaluateSalesOrderTruthCommitParams = {
  tenantId: number;
  orderId: string;
  order: SalesOrder;
  policy?: SalesOrderTruthPolicy;
  /** Effective pricing context (e.g. `confirmSalesOrderTruth` overrides win over header). */
  pricing?: {
    pricelistId: string | null;
    currencyId: number | null;
    exchangeRatePairValid: boolean;
  };
  /**
   * When set, overrides `sales_orders` credit columns for the pure decision + lock hash.
   * Use when an external credit hook validated the order but the row was not updated in the same transaction.
   */
  creditOverride?: SalesOrderTruthCreditInput;
  /**
   * When `policy.requireInventoryReservation`, must be true after `reserveInventory` succeeds.
   * When not required, defaults to true.
   */
  inventoryReservationSucceeded?: boolean;
};

function exchangePairValid(order: SalesOrder): boolean {
  const hasRate = order.exchangeRateUsed != null;
  const hasSource = order.exchangeRateSource != null && order.exchangeRateSource !== "";
  return hasRate === hasSource;
}

function mergePolicy(policy?: SalesOrderTruthPolicy): SalesOrderTruthPolicy {
  return {
    requiredApprovalDepth: policy?.requiredApprovalDepth ?? 0,
    requireCreditCheck: policy?.requireCreditCheck ?? false,
    requireInventoryReservation: policy?.requireInventoryReservation ?? false,
  };
}

function creditFromOrder(order: SalesOrder): SalesOrderTruthCreditInput {
  return {
    checkPassed: order.creditCheckPassed,
    checkedAtIso: order.creditCheckAt?.toISOString() ?? null,
    limitAtCheck: order.creditLimitAtCheck != null ? String(order.creditLimitAtCheck) : null,
  };
}

/**
 * Loads approvals + blocking invariant failures and builds the exact input passed to {@link resolveSalesOrderDocumentTruth}.
 */
export async function assembleSalesOrderDocumentTruthInput(
  db: Database,
  params: EvaluateSalesOrderTruthCommitParams
): Promise<SalesOrderDocumentTruthInput> {
  const { tenantId, orderId, order, policy: policyArg, pricing } = params;
  const policy = mergePolicy(policyArg);

  const approvalRows = await db
    .select({
      level: documentApprovals.approvalLevel,
      status: documentApprovals.status,
    })
    .from(documentApprovals)
    .where(
      and(
        eq(documentApprovals.tenantId, tenantId),
        eq(documentApprovals.documentType, "sales_order"),
        eq(documentApprovals.documentId, orderId)
      )
    )
    .orderBy(asc(documentApprovals.approvalLevel));

  const approvals = approvalRows.map((r) => ({
    level: r.level,
    status: r.status as SalesOrderDocumentTruthInput["approvals"][number]["status"],
  }));

  const invariantRows = await db
    .select({ invariantCode: domainInvariantLogs.invariantCode })
    .from(domainInvariantLogs)
    .where(
      and(
        eq(domainInvariantLogs.tenantId, tenantId),
        eq(domainInvariantLogs.entityType, "sales_order"),
        eq(domainInvariantLogs.entityId, orderId),
        eq(domainInvariantLogs.status, "fail"),
        eq(domainInvariantLogs.severity, "error"),
        eq(domainInvariantLogs.blocking, true)
      )
    )
    .limit(100);

  const blockingInvariantFailures = invariantRows.map((r) => ({
    invariantCode: r.invariantCode,
  }));

  const credit = params.creditOverride ?? creditFromOrder(order);

  const inventoryReservationSucceeded =
    params.inventoryReservationSucceeded ??
    (policy.requireInventoryReservation ? false : true);

  const input: SalesOrderDocumentTruthInput = {
    orderStatus: order.status,
    pricelistId: pricing?.pricelistId ?? order.pricelistId,
    currencyId: pricing?.currencyId ?? order.currencyId,
    exchangeRatePairValid: pricing?.exchangeRatePairValid ?? exchangePairValid(order),
    approvals,
    policy,
    blockingInvariantFailures,
    credit,
    inventory: { reservationSucceeded: inventoryReservationSucceeded },
  };

  return input;
}

/**
 * Loads approvals + blocking invariant failures, then returns the pure decision (does not throw).
 */
export async function loadSalesOrderTruthCommitDecision(
  db: Database,
  params: EvaluateSalesOrderTruthCommitParams
): Promise<ReturnType<typeof resolveSalesOrderDocumentTruth>> {
  const input = await assembleSalesOrderDocumentTruthInput(db, params);
  return resolveSalesOrderDocumentTruth(input);
}

/**
 * Evaluates gates for `confirmSalesOrderTruth` — throws {@link import("./documentTruthDecision.js").TruthPipelineBlockedError} when blocked.
 * Returns the assembled truth input (for hashing into `truth_decision_locks` and persistence).
 */
export async function evaluateSalesOrderTruthCommitOrThrow(
  db: Database,
  params: EvaluateSalesOrderTruthCommitParams
): Promise<SalesOrderDocumentTruthInput> {
  const input = await assembleSalesOrderDocumentTruthInput(db, params);
  const decision = resolveSalesOrderDocumentTruth(input);
  assertSalesOrderTruthCommitAllowed(decision);
  return input;
}
