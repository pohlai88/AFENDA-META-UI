import { formatDateOnlyUtc } from "@afenda/db";
import {
  parsePostalCodeToZipNumeric,
  resolveTerritoryFromRules,
} from "@afenda/db/queries/sales";
import { and, desc, eq, gte, isNull, lte, or, sql } from "drizzle-orm";

import { db } from "../../db/index.js";
import {
  commissionEntries,
  commissionPlans,
  commissionPlanTiers,
  partnerAddresses,
  partners,
  salesOrders,
  salesTeamMembers,
  territories,
  territoryRules,
} from "../../db/schema/index.js";
import { ConflictError, NotFoundError, ValidationError } from "../../middleware/errorHandler.js";
import {
  approveCommissionEntry,
  buildCommissionEntryDraft,
  calculateCommission,
  markCommissionEntryPaid,
  type CommissionCalculationResult,
  type CommissionMetrics,
  summarizeCommissionEntries,
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
  assignment: CommissionAssignmentResolution;
}

export interface PreparedCommissionGeneration {
  persistence: "created" | "updated";
  existingEntry:
    | {
        id: string;
        status: (typeof commissionEntries.$inferSelect)["status"];
        createdBy: number | null;
        notes: string | null;
        entryVersion: number;
        lockedAt: Date | null;
      }
    | undefined;
  draft: typeof commissionEntries.$inferInsert;
  calculation: CommissionCalculationResult;
  order: typeof salesOrders.$inferSelect;
  plan: typeof commissionPlans.$inferSelect;
  metrics: CommissionMetrics;
  assignment: CommissionAssignmentResolution;
}

export interface CommissionTerritoryMatch {
  /** Set when a `territory_rules` row won; null when the tenant default territory (`is_default_fallback`) was used. */
  ruleId: string | null;
  priority: number;
  territoryId: string;
  territoryCode: string;
  teamId: string | null;
  defaultSalespersonId: number | null;
}

export interface CommissionAssignmentResolution {
  salespersonId: number;
  selectedBy: "explicit" | "order_user" | "territory_default" | "team_leader" | "actor_fallback";
  territoryMatch: CommissionTerritoryMatch | null;
}

export interface ApproveCommissionEntriesInput {
  tenantId: number;
  actorId: number;
  entryIds?: string[];
  salespersonId?: number;
  periodStart?: Date;
  periodEnd?: Date;
}

export interface ApproveCommissionEntriesResult {
  updatedCount: number;
  unchangedCount: number;
  entries: Array<typeof commissionEntries.$inferSelect>;
}

export interface PayCommissionEntriesInput {
  tenantId: number;
  actorId: number;
  entryIds?: string[];
  salespersonId?: number;
  periodStart?: Date;
  periodEnd?: Date;
  paidDate?: Date;
}

export interface PayCommissionEntriesResult {
  updatedCount: number;
  unchangedCount: number;
  entries: Array<typeof commissionEntries.$inferSelect>;
}

export interface RemoveCommissionEntryInput {
  tenantId: number;
  actorId: number;
  entryId: string;
}

export interface RemoveCommissionEntryResult {
  deletedCount: number;
  entry: typeof commissionEntries.$inferSelect;
}

export interface CommissionReportInput {
  tenantId: number;
  salespersonId?: number;
  status?: (typeof commissionEntries.$inferSelect)["status"];
  periodStart?: Date;
  periodEnd?: Date;
  limit?: number;
  offset?: number;
}

export interface CommissionReportResult {
  entries: Array<typeof commissionEntries.$inferSelect>;
  summary: ReturnType<typeof summarizeCommissionEntries>;
}

export async function generateCommissionForOrder(
  input: GenerateCommissionForOrderInput
): Promise<GenerateCommissionForOrderResult> {
  const prepared = await prepareCommissionGeneration(input);

  return persistPreparedCommissionGeneration(prepared);
}

export async function prepareCommissionGeneration(
  input: GenerateCommissionForOrderInput & { entryId?: string }
): Promise<PreparedCommissionGeneration> {
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
  const assignment = await resolveCommissionAssignment({
    tenantId: input.tenantId,
    order,
    explicitSalespersonId: input.salespersonId,
    actorId: input.actorId,
  });
  const salespersonId = assignment.salespersonId;

  const existingEntry = await db
    .select({
      id: commissionEntries.id,
      status: commissionEntries.status,
      createdBy: commissionEntries.createdBy,
      notes: commissionEntries.notes,
      entryVersion: commissionEntries.entryVersion,
      lockedAt: commissionEntries.lockedAt,
    })
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
    .orderBy(desc(commissionEntries.entryVersion), desc(commissionEntries.createdAt))
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

  if (entry?.lockedAt) {
    throw new ConflictError(
      "Locked commission entries cannot be recomputed; they are financial truth."
    );
  }

  const { periodStart, periodEnd } = resolveCommissionPeriod(
    order.orderDate,
    input.periodStart,
    input.periodEnd
  );

  const draft = buildCommissionEntryDraft({
    id: input.entryId,
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
    currencyId: order.currencyId,
    entryVersion: entry?.entryVersion ?? 1,
  });

  return {
    persistence: entry ? "updated" : "created",
    existingEntry: entry,
    draft,
    calculation,
    order,
    plan,
    metrics,
    assignment,
  };
}

export async function persistPreparedCommissionGeneration(
  prepared: PreparedCommissionGeneration
): Promise<GenerateCommissionForOrderResult> {
  if (prepared.existingEntry) {
    const [updated] = await db
      .update(commissionEntries)
      .set({
        ...prepared.draft,
        createdBy: prepared.existingEntry.createdBy ?? prepared.draft.createdBy,
      })
      .where(eq(commissionEntries.id, prepared.existingEntry.id))
      .returning();

    return {
      persistence: "updated",
      calculation: prepared.calculation,
      entry: updated,
      order: prepared.order,
      plan: prepared.plan,
      metrics: prepared.metrics,
      assignment: prepared.assignment,
    };
  }

  const [created] = await db.insert(commissionEntries).values(prepared.draft).returning();

  return {
    persistence: "created",
    calculation: prepared.calculation,
    entry: created,
    order: prepared.order,
    plan: prepared.plan,
    metrics: prepared.metrics,
    assignment: prepared.assignment,
  };
}

export async function approveCommissionEntries(
  input: ApproveCommissionEntriesInput
): Promise<ApproveCommissionEntriesResult> {
  const entries = await loadCommissionEntriesForMutation({
    tenantId: input.tenantId,
    entryIds: input.entryIds,
    salespersonId: input.salespersonId,
    periodStart: input.periodStart,
    periodEnd: input.periodEnd,
  });

  const updatedEntries: Array<typeof commissionEntries.$inferSelect> = [];
  let unchangedCount = 0;

  for (const entry of entries) {
    if (entry.status !== "draft") {
      unchangedCount += 1;
      continue;
    }

    const transitioned = approveCommissionEntry(entry);
    const [updated] = await db
      .update(commissionEntries)
      .set({
        status: transitioned.status,
        paidDate: transitioned.paidDate,
        updatedBy: input.actorId,
      })
      .where(eq(commissionEntries.id, entry.id))
      .returning();

    if (updated) {
      updatedEntries.push(updated);
    }
  }

  return {
    updatedCount: updatedEntries.length,
    unchangedCount,
    entries: updatedEntries,
  };
}

export async function payCommissionEntries(
  input: PayCommissionEntriesInput
): Promise<PayCommissionEntriesResult> {
  const entries = await loadCommissionEntriesForMutation({
    tenantId: input.tenantId,
    entryIds: input.entryIds,
    salespersonId: input.salespersonId,
    periodStart: input.periodStart,
    periodEnd: input.periodEnd,
  });

  const draftEntryIds = entries
    .filter((entry) => entry.status === "draft")
    .map((entry) => entry.id);
  if (draftEntryIds.length > 0) {
    throw new ValidationError(
      `Draft commission entries must be approved before payment: ${draftEntryIds.join(", ")}`
    );
  }

  const paidAt = input.paidDate ?? new Date();
  const updatedEntries: Array<typeof commissionEntries.$inferSelect> = [];
  let unchangedCount = 0;

  for (const entry of entries) {
    if (entry.status === "paid") {
      unchangedCount += 1;
      continue;
    }

    const transitioned = markCommissionEntryPaid(entry, paidAt);
    const [updated] = await db
      .update(commissionEntries)
      .set({
        status: transitioned.status,
        paidDate: transitioned.paidDate,
        updatedBy: input.actorId,
      })
      .where(eq(commissionEntries.id, entry.id))
      .returning();

    if (updated) {
      updatedEntries.push(updated);
    }
  }

  return {
    updatedCount: updatedEntries.length,
    unchangedCount,
    entries: updatedEntries,
  };
}

export async function removeCommissionEntry(
  input: RemoveCommissionEntryInput
): Promise<RemoveCommissionEntryResult> {
  const [current] = await db
    .select({ lockedAt: commissionEntries.lockedAt })
    .from(commissionEntries)
    .where(
      and(
        eq(commissionEntries.tenantId, input.tenantId),
        eq(commissionEntries.id, input.entryId),
        isNull(commissionEntries.deletedAt)
      )
    )
    .limit(1);

  if (!current) {
    throw new NotFoundError(
      `Commission entry ${input.entryId} was not found for tenant ${input.tenantId}.`
    );
  }

  if (current.lockedAt) {
    throw new ConflictError("Locked commission entries cannot be removed.");
  }

  const [entry] = await db
    .update(commissionEntries)
    .set({
      deletedAt: new Date(),
      updatedBy: input.actorId,
    })
    .where(
      and(
        eq(commissionEntries.tenantId, input.tenantId),
        eq(commissionEntries.id, input.entryId),
        isNull(commissionEntries.deletedAt)
      )
    )
    .returning();

  if (!entry) {
    throw new NotFoundError(
      `Commission entry ${input.entryId} was not found for tenant ${input.tenantId}.`
    );
  }

  return {
    deletedCount: 1,
    entry,
  };
}

export async function getCommissionReport(
  input: CommissionReportInput
): Promise<CommissionReportResult> {
  // Build SQL WHERE conditions for filtering
  const conditions = [
    eq(commissionEntries.tenantId, input.tenantId),
    isNull(commissionEntries.deletedAt),
  ];

  if (input.salespersonId !== undefined) {
    conditions.push(eq(commissionEntries.salespersonId, input.salespersonId));
  }

  if (input.status) {
    conditions.push(eq(commissionEntries.status, input.status));
  }

  if (input.periodStart) {
    conditions.push(gte(commissionEntries.periodEnd, formatDateOnlyUtc(input.periodStart)));
  }

  if (input.periodEnd) {
    conditions.push(lte(commissionEntries.periodStart, formatDateOnlyUtc(input.periodEnd)));
  }

  // Fetch total count for summary (separate query)
  const [countResult] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(commissionEntries)
    .where(and(...conditions));

  const totalCount = countResult?.count ?? 0;

  // Fetch paginated entries
  const offset = Math.max(0, input.offset ?? 0);
  const limit = input.limit ? Math.max(1, input.limit) : totalCount;

  const entries = await db
    .select()
    .from(commissionEntries)
    .where(and(...conditions))
    .orderBy(desc(commissionEntries.periodStart), desc(commissionEntries.createdAt))
    .limit(limit)
    .offset(offset);

  // Fetch all entries for summary calculation
  const allEntriesForSummary = await db
    .select()
    .from(commissionEntries)
    .where(and(...conditions))
    .orderBy(desc(commissionEntries.periodStart), desc(commissionEntries.createdAt));

  return {
    entries,
    summary: summarizeCommissionEntries(allEntriesForSummary),
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

async function resolveCommissionAssignment(input: {
  tenantId: number;
  order: typeof salesOrders.$inferSelect;
  explicitSalespersonId?: number;
  actorId: number;
}): Promise<CommissionAssignmentResolution> {
  const territoryMatch = await resolveTerritoryMatch(input.tenantId, input.order);

  if (input.explicitSalespersonId) {
    return {
      salespersonId: input.explicitSalespersonId,
      selectedBy: "explicit",
      territoryMatch,
    };
  }

  if (input.order.userId) {
    return {
      salespersonId: input.order.userId,
      selectedBy: "order_user",
      territoryMatch,
    };
  }

  if (territoryMatch?.defaultSalespersonId) {
    return {
      salespersonId: territoryMatch.defaultSalespersonId,
      selectedBy: "territory_default",
      territoryMatch,
    };
  }

  if (territoryMatch?.teamId) {
    const teamLeader = await resolveTeamLeader(input.tenantId, territoryMatch.teamId);
    if (teamLeader) {
      return {
        salespersonId: teamLeader,
        selectedBy: "team_leader",
        territoryMatch,
      };
    }
  }

  return {
    salespersonId: input.actorId,
    selectedBy: "actor_fallback",
    territoryMatch,
  };
}

async function resolveTerritoryMatch(
  tenantId: number,
  order: typeof salesOrders.$inferSelect
): Promise<CommissionTerritoryMatch | null> {
  if (!order.partnerId) {
    return null;
  }

  const geography = await resolveOrderGeography(tenantId, order);
  const asOf = order.orderDate;

  const conditions = [
    eq(territoryRules.tenantId, tenantId),
    isNull(territoryRules.deletedAt),
    lte(territoryRules.effectiveFrom, asOf),
    or(isNull(territoryRules.effectiveTo), gte(territoryRules.effectiveTo, asOf))!,
  ];

  if (geography.countryId) {
    conditions.push(
      or(isNull(territoryRules.countryId), eq(territoryRules.countryId, geography.countryId))!
    );
  }

  if (geography.stateId) {
    conditions.push(
      or(isNull(territoryRules.stateId), eq(territoryRules.stateId, geography.stateId))!
    );
  }

  const rules = await db
    .select()
    .from(territoryRules)
    .where(and(...conditions));

  const [defaultTerritoryRow] = await db
    .select({ id: territories.id })
    .from(territories)
    .where(
      and(
        eq(territories.tenantId, tenantId),
        eq(territories.isDefaultFallback, true),
        eq(territories.isActive, true),
        isNull(territories.deletedAt)
      )
    )
    .limit(1);

  const zipNumeric = parsePostalCodeToZipNumeric(geography.zip);

  const outcome = resolveTerritoryFromRules({
    asOf,
    geo: {
      countryId: geography.countryId,
      stateId: geography.stateId,
      zipNumeric,
    },
    rules: rules.map((r) => ({
      id: r.id,
      territoryId: r.territoryId,
      countryId: r.countryId,
      stateId: r.stateId,
      zipFrom: r.zipFrom,
      zipTo: r.zipTo,
      matchType: r.matchType,
      priority: r.priority,
      effectiveFrom: r.effectiveFrom,
      effectiveTo: r.effectiveTo,
      createdAt: r.createdAt,
    })),
    defaultTerritoryId: defaultTerritoryRow?.id ?? null,
  });

  if (outcome.resolutionStrategy === "none" || outcome.resolvedTerritoryId == null) {
    return null;
  }

  const [territory] = await db
    .select()
    .from(territories)
    .where(
      and(
        eq(territories.tenantId, tenantId),
        eq(territories.id, outcome.resolvedTerritoryId),
        eq(territories.isActive, true),
        isNull(territories.deletedAt)
      )
    )
    .limit(1);

  if (!territory) {
    throw new ValidationError(
      `Territory ${outcome.resolvedTerritoryId} resolved for tenant ${tenantId} but is not active or was removed.`
    );
  }

  return {
    ruleId: outcome.matchedRuleId,
    priority:
      outcome.matchedRuleId != null
        ? (rules.find((r) => r.id === outcome.matchedRuleId)?.priority ?? 0)
        : 0,
    territoryId: territory.id,
    territoryCode: territory.code,
    teamId: territory.teamId,
    defaultSalespersonId: territory.defaultSalespersonId,
  };
}

async function resolveOrderGeography(
  tenantId: number,
  order: typeof salesOrders.$inferSelect
): Promise<{ countryId: number | null; stateId: number | null; zip: string | null }> {
  const addressId = order.deliveryAddressId ?? order.invoiceAddressId;

  if (addressId) {
    const [address] = await db
      .select()
      .from(partnerAddresses)
      .where(
        and(
          eq(partnerAddresses.tenantId, tenantId),
          eq(partnerAddresses.id, addressId),
          isNull(partnerAddresses.deletedAt)
        )
      )
      .limit(1);

    if (address) {
      return {
        countryId: address.countryId,
        stateId: address.stateId,
        zip: address.zip,
      };
    }
  }

  if (!order.partnerId) {
    return {
      countryId: null,
      stateId: null,
      zip: null,
    };
  }

  const [partner] = await db
    .select()
    .from(partners)
    .where(
      and(
        eq(partners.tenantId, tenantId),
        eq(partners.id, order.partnerId),
        isNull(partners.deletedAt)
      )
    )
    .limit(1);

  return {
    countryId: partner?.countryId ?? null,
    stateId: partner?.stateId ?? null,
    zip: null,
  };
}

async function resolveTeamLeader(tenantId: number, teamId: string): Promise<number | null> {
  const members = await db
    .select()
    .from(salesTeamMembers)
    .where(
      and(
        eq(salesTeamMembers.tenantId, tenantId),
        eq(salesTeamMembers.teamId, teamId),
        eq(salesTeamMembers.isActive, true),
        isNull(salesTeamMembers.deletedAt)
      )
    )
    .orderBy(desc(salesTeamMembers.isLeader), desc(salesTeamMembers.startDate));

  return members[0]?.userId ?? null;
}

export async function loadCommissionEntriesForMutation(input: {
  tenantId: number;
  entryIds?: string[];
  salespersonId?: number;
  periodStart?: Date;
  periodEnd?: Date;
}): Promise<Array<typeof commissionEntries.$inferSelect>> {
  const entries = await db
    .select()
    .from(commissionEntries)
    .where(and(eq(commissionEntries.tenantId, input.tenantId), isNull(commissionEntries.deletedAt)))
    .orderBy(desc(commissionEntries.createdAt));

  const ids = input.entryIds && input.entryIds.length > 0 ? new Set(input.entryIds) : null;

  return entries.filter((entry) => {
    if (ids && !ids.has(entry.id)) {
      return false;
    }

    if (input.salespersonId !== undefined && entry.salespersonId !== input.salespersonId) {
      return false;
    }

    if (input.periodStart) {
      const ps = formatDateOnlyUtc(input.periodStart);
      if (entry.periodEnd < ps) {
        return false;
      }
    }

    if (input.periodEnd) {
      const pe = formatDateOnlyUtc(input.periodEnd);
      if (entry.periodStart > pe) {
        return false;
      }
    }

    return true;
  });
}

