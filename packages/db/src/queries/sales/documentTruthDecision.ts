/**
 * Pure sales-order truth decision contracts — deterministic inputs → deterministic outputs.
 * Side effects (DB writes, events) belong in the truth pipeline, not here.
 */

import type { OrderStatus } from "../../schema/sales/_enums.js";

export type ApprovalGateStatus = "pending" | "approved" | "rejected";

export type SalesOrderTruthPolicy = {
  /**
   * When > 0, levels `1..requiredApprovalDepth` must each have exactly one approval row
   * and all must be `approved` before financial truth can commit. Sequence is enforced:
   * level N cannot be satisfied before N−1.
   */
  requiredApprovalDepth: number;
  /**
   * When true, `credit.checkPassed` must be true. Default false (opt in; production APIs
   * should enable once credit checks populate `sales_orders.credit_check_passed`).
   */
  requireCreditCheck?: boolean;
  /**
   * When true, `inventory.reservationSucceeded` must be true — `confirmSalesOrderTruth` must
   * supply `reserveInventory` and run it before evaluation. Default false.
   */
  requireInventoryReservation?: boolean;
};

/** Credit facts at evaluation time (same object is hashed into `truth_decision_locks` for `credit`). */
export type SalesOrderTruthCreditInput = {
  checkPassed: boolean;
  checkedAtIso: string | null;
  limitAtCheck: string | null;
};

export type SalesOrderTruthInventoryInput = {
  reservationSucceeded: boolean;
};

export type SalesOrderDocumentTruthInput = {
  orderStatus: OrderStatus;
  pricelistId: string | null;
  currencyId: number | null;
  /** True when exchange rate + source are both set or both absent (pair rule). */
  exchangeRatePairValid: boolean;
  approvals: ReadonlyArray<{ level: number; status: ApprovalGateStatus }>;
  policy: SalesOrderTruthPolicy;
  /** Latest known blocking invariant failures for this document (pre-filtered in the pipeline). */
  blockingInvariantFailures: ReadonlyArray<{ invariantCode: string }>;
  credit: SalesOrderTruthCreditInput;
  inventory: SalesOrderTruthInventoryInput;
};

export type SalesOrderDocumentTruthDecision = {
  readonly canCommitFinancialTruth: boolean;
  readonly reasons: readonly string[];
  readonly segments: {
    readonly pricing: { ok: boolean; detail?: string };
    readonly approvals: {
      ok: boolean;
      pendingLevels: readonly number[];
      rejected: boolean;
      sequenceOk: boolean;
    };
    readonly invariants: { ok: boolean; blockingCodes: readonly string[] };
    readonly credit: { ok: boolean; detail?: string };
    readonly inventory: { ok: boolean; detail?: string };
  };
};

export type AccountingPostingTruthInput = {
  postingStatus: "draft" | "posted" | "reversed";
  truthBindingId: string | null;
  debitAccountCode: string | null;
  creditAccountCode: string | null;
};

export type AccountingPostingTruthDecision = {
  readonly allowed: boolean;
  readonly reasons: readonly string[];
};

const defaultPolicy: SalesOrderTruthPolicy = {
  requiredApprovalDepth: 0,
  requireCreditCheck: false,
  requireInventoryReservation: false,
};

function evaluateApprovalChain(
  approvals: SalesOrderDocumentTruthInput["approvals"],
  depth: number
): SalesOrderDocumentTruthDecision["segments"]["approvals"] {
  if (depth <= 0) {
    return { ok: true, pendingLevels: [], rejected: false, sequenceOk: true };
  }

  const byLevel = new Map<number, ApprovalGateStatus>();
  for (const row of approvals) {
    if (row.level >= 1 && row.level <= depth) {
      byLevel.set(row.level, row.status);
    }
  }

  let sequenceOk = true;
  for (const row of approvals) {
    if (row.level < 1 || row.level > depth) continue;
    if (row.status === "approved" || row.status === "rejected") {
      for (let below = 1; below < row.level; below++) {
        if (byLevel.get(below) !== "approved") {
          sequenceOk = false;
        }
      }
    }
  }

  const pendingLevels: number[] = [];
  let rejected = false;
  for (let level = 1; level <= depth; level++) {
    const st = byLevel.get(level);
    if (st === "rejected") rejected = true;
    if (st !== "approved") {
      pendingLevels.push(level);
    }
  }

  const ok = !rejected && sequenceOk && pendingLevels.length === 0;

  return { ok, pendingLevels, rejected, sequenceOk };
}

/**
 * Deterministic gate for confirming a sales order into financial truth (`sale` + binding).
 */
export function resolveSalesOrderDocumentTruth(
  input: SalesOrderDocumentTruthInput
): SalesOrderDocumentTruthDecision {
  const policy = input.policy ?? defaultPolicy;
  const reasons: string[] = [];

  const pricingOk =
    input.orderStatus === "draft" || input.orderStatus === "sent"
      ? input.pricelistId != null && input.currencyId != null && input.exchangeRatePairValid
      : false;

  if (!pricingOk) {
    if (input.pricelistId == null || input.currencyId == null) {
      reasons.push("pricing_context_incomplete");
    } else if (!input.exchangeRatePairValid) {
      reasons.push("exchange_rate_pair_invalid");
    } else {
      reasons.push("order_not_in_confirmable_status");
    }
  }

  const approvals = evaluateApprovalChain(input.approvals, policy.requiredApprovalDepth);
  if (!approvals.ok) {
    if (approvals.rejected) reasons.push("approval_rejected");
    if (!approvals.sequenceOk) reasons.push("approval_sequence_violation");
    if (approvals.pendingLevels.length > 0) {
      reasons.push(`approvals_pending:${approvals.pendingLevels.join(",")}`);
    }
  }

  const invCodes = input.blockingInvariantFailures.map((f) => f.invariantCode);
  const invariantsOk = invCodes.length === 0;
  if (!invariantsOk) {
    reasons.push(`blocking_invariants:${invCodes.join(",")}`);
  }

  const requireCredit = policy.requireCreditCheck === true;
  const creditOk = !requireCredit || input.credit.checkPassed;
  if (!creditOk) {
    reasons.push("credit_check_failed");
  }

  const requireInv = policy.requireInventoryReservation === true;
  const inventoryOk = !requireInv || input.inventory.reservationSucceeded;
  if (!inventoryOk) {
    reasons.push("inventory_reservation_not_satisfied");
  }

  const canCommitFinancialTruth =
    pricingOk && approvals.ok && invariantsOk && creditOk && inventoryOk;

  return {
    canCommitFinancialTruth,
    reasons,
    segments: {
      pricing: {
        ok: pricingOk,
        detail: pricingOk ? undefined : reasons[0],
      },
      approvals,
      invariants: { ok: invariantsOk, blockingCodes: invCodes },
      credit: {
        ok: creditOk,
        detail: requireCredit && !creditOk ? "credit_check_failed" : requireCredit ? undefined : "credit_gate_off",
      },
      inventory: {
        ok: inventoryOk,
        detail:
          requireInv && !inventoryOk
            ? "inventory_reservation_not_satisfied"
            : requireInv
              ? undefined
              : "inventory_gate_off",
      },
    },
  };
}

/**
 * Validates a single accounting posting row before insert/update (mirrors DB checks; use for early errors).
 */
export function resolveAccountingPostingTruth(
  input: AccountingPostingTruthInput
): AccountingPostingTruthDecision {
  const reasons: string[] = [];
  if (input.postingStatus === "posted") {
    if (input.truthBindingId == null) {
      reasons.push("posted_requires_truth_binding_id");
    }
    if (input.debitAccountCode == null || input.creditAccountCode == null) {
      reasons.push("posted_requires_debit_and_credit");
    }
    if (
      input.debitAccountCode != null &&
      input.creditAccountCode != null &&
      input.debitAccountCode === input.creditAccountCode
    ) {
      reasons.push("debit_and_credit_must_differ");
    }
  }
  return { allowed: reasons.length === 0, reasons };
}

export class TruthPipelineBlockedError extends Error {
  constructor(
    readonly code: "SALES_ORDER_TRUTH_BLOCKED" | "ACCOUNTING_POSTING_BLOCKED",
    readonly reasons: readonly string[],
    message?: string
  ) {
    super(message ?? reasons.join("; "));
    this.name = "TruthPipelineBlockedError";
  }
}

export function assertSalesOrderTruthCommitAllowed(decision: SalesOrderDocumentTruthDecision): void {
  if (!decision.canCommitFinancialTruth) {
    throw new TruthPipelineBlockedError("SALES_ORDER_TRUTH_BLOCKED", decision.reasons);
  }
}

export function assertAccountingPostingAllowed(decision: AccountingPostingTruthDecision): void {
  if (!decision.allowed) {
    throw new TruthPipelineBlockedError("ACCOUNTING_POSTING_BLOCKED", decision.reasons);
  }
}
