import { and, desc, eq, isNull } from "drizzle-orm";

import { db } from "../../db/index.js";
import {
  commissionEntries,
  commissionPlans,
  commissionPlanTiers,
  salesOrders,
} from "../../db/schema/index.js";
import { ConflictError, NotFoundError, ValidationError } from "../../middleware/errorHandler.js";
import {
  buildCommissionEntryDraft,
  calculateCommission,
  type CommissionCalculationResult,
  type CommissionMetrics,
} from "./logic/commission-engine.js";

type DraftStatus = "draft" | "approved";

export interface GenerateCommissionForOrderInput {
  tenantId: number;
  orderId: string;
  actorId: number;
  planId?: string;
  salespersonId?: number;
  status?: DraftStatus;
  notes?: string | null;
  replaceExisting?: boolean;
  periodStart?: Date;
  periodEnd?: Date;
  metricsOverrides?: CommissionMetrics;
}

export interface GenerateCommissionForOrderResult {
  persistence: "created" | "updated";
  calculation: CommissionCalculationResult;
  entry: typeof commissionEntries.$inferSelect;
  order: typeof salesOrders.$inferSelect;
  plan: typeof commissionPlans.$inferSelect;
  metrics: CommissionMetrics;
}

export async function generateCommissionForOrder(
  input: GenerateCommissionForOrderInput
): Promise<GenerateCommissionForOrderResult> {
  const order = await loadOrder(input.tenantId, input.orderId);
  const plan = await loadPlan(input.tenantId, input.planId);
  const tiers = await db
    .select()
    .from(commissionPlanTiers)
    .where(
      and(eq(commissionPlanTiers.tenantId, input.tenantId), eq(commissionPlanTiers.planId, plan.id))
    )
    .orderBy(commissionPlanTiers.sequence, commissionPlanTiers.minAmount);

  const metrics = resolveCommissionMetrics(plan.base, order, input.metricsOverrides);
  const calculation = calculateCommission({ plan, tiers, metrics });

  const salespersonId = input.salespersonId ?? order.userId ?? input.actorId;
  if (!salespersonId) {
    throw new ValidationError(
      "A salespersonId is required. Provide one explicitly or assign the sales order to a user."
    );
  }

  const existingEntry = await db
    .select()
    .from(commissionEntries)
    .where(
      and(
        eq(commissionEntries.tenantId, input.tenantId),
        eq(commissionEntries.orderId, order.id),
        eq(commissionEntries.planId, plan.id),
        eq(commissionEntries.salespersonId, salespersonId),
        isNull(commissionEntries.deletedAt)
      )
    )
    .orderBy(desc(commissionEntries.createdAt))
    .limit(1);

  const [entry] = existingEntry;
  if (entry && !input.replaceExisting) {
    throw new ConflictError(
      "A commission entry already exists for this order, plan, and salesperson. Set replaceExisting=true to update it."
    );
  }

  if (entry?.status === "paid") {
    throw new ConflictError("Paid commission entries cannot be regenerated.");
  }

  const { periodStart, periodEnd } = resolveCommissionPeriod(
    order.orderDate,
    input.periodStart,
    input.periodEnd
  );

  const draft = buildCommissionEntryDraft({
    tenantId: input.tenantId,
    orderId: order.id,
    salespersonId,
    createdBy: entry?.createdBy ?? input.actorId,
    updatedBy: input.actorId,
    plan,
    tiers,
    metrics,
    periodStart,
    periodEnd,
    notes: input.notes ?? entry?.notes ?? null,
    status: input.status ?? "draft",
  });

  if (entry) {
    const [updated] = await db
      .update(commissionEntries)
      .set({
        ...draft,
        createdBy: entry.createdBy,
      })
      .where(eq(commissionEntries.id, entry.id))
      .returning();

    return {
      persistence: "updated",
      calculation,
      entry: updated,
      order,
      plan,
      metrics,
    };
  }

  const [created] = await db.insert(commissionEntries).values(draft).returning();

  return {
    persistence: "created",
    calculation,
    entry: created,
    order,
    plan,
    metrics,
  };
}

async function loadOrder(tenantId: number, orderId: string) {
  const [order] = await db
    .select()
    .from(salesOrders)
    .where(
      and(
        eq(salesOrders.tenantId, tenantId),
        eq(salesOrders.id, orderId),
        isNull(salesOrders.deletedAt)
      )
    )
    .limit(1);

  if (!order) {
    throw new NotFoundError(`Sales order ${orderId} was not found for tenant ${tenantId}.`);
  }

  return order;
}

async function loadPlan(tenantId: number, planId?: string) {
  if (planId) {
    const [plan] = await db
      .select()
      .from(commissionPlans)
      .where(
        and(
          eq(commissionPlans.tenantId, tenantId),
          eq(commissionPlans.id, planId),
          isNull(commissionPlans.deletedAt)
        )
      )
      .limit(1);

    if (!plan) {
      throw new NotFoundError(`Commission plan ${planId} was not found for tenant ${tenantId}.`);
    }

    return plan;
  }

  const plans = await db
    .select()
    .from(commissionPlans)
    .where(
      and(
        eq(commissionPlans.tenantId, tenantId),
        eq(commissionPlans.isActive, true),
        isNull(commissionPlans.deletedAt)
      )
    )
    .orderBy(commissionPlans.name)
    .limit(2);

  if (plans.length === 0) {
    throw new NotFoundError(`No active commission plan was found for tenant ${tenantId}.`);
  }

  if (plans.length > 1) {
    throw new ValidationError(
      "Multiple active commission plans exist. Provide planId explicitly to generate a commission entry."
    );
  }

  return plans[0];
}

function resolveCommissionMetrics(
  base: (typeof commissionPlans.$inferSelect)["base"],
  order: typeof salesOrders.$inferSelect,
  overrides?: CommissionMetrics
): CommissionMetrics {
  const revenue = overrides?.revenue ?? order.amountUntaxed;
  const profit = overrides?.profit ?? order.amountProfit;
  const derivedMargin =
    overrides?.margin ??
    order.marginPercent ??
    (profit !== undefined && toNumber(revenue) > 0
      ? ((toNumber(profit) / toNumber(revenue)) * 100).toFixed(4)
      : undefined);

  if (base === "profit" && profit === undefined) {
    throw new ValidationError(
      "Profit-based commissions need metricsOverrides.profit or a populated sales_orders.amount_profit value."
    );
  }

  if (base === "margin" && derivedMargin === undefined) {
    throw new ValidationError(
      "Margin-based commissions need metricsOverrides.margin, metricsOverrides.profit, or a populated sales_orders.margin_percent value."
    );
  }

  return {
    revenue,
    profit,
    margin: derivedMargin,
  };
}

function resolveCommissionPeriod(
  orderDate: Date,
  periodStart?: Date,
  periodEnd?: Date
): { periodStart: Date; periodEnd: Date } {
  if (periodStart && periodEnd) {
    if (periodEnd < periodStart) {
      throw new ValidationError("periodEnd must be greater than or equal to periodStart.");
    }

    return { periodStart, periodEnd };
  }

  const start =
    periodStart ?? new Date(Date.UTC(orderDate.getUTCFullYear(), orderDate.getUTCMonth(), 1));
  const end =
    periodEnd ??
    new Date(Date.UTC(orderDate.getUTCFullYear(), orderDate.getUTCMonth() + 1, 0, 23, 59, 59, 999));

  if (end < start) {
    throw new ValidationError("periodEnd must be greater than or equal to periodStart.");
  }

  return {
    periodStart: start,
    periodEnd: end,
  };
}

function toNumber(value: string | number): number {
  return typeof value === "number" ? value : Number(value);
}
