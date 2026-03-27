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

export interface CommissionTerritoryMatch {
  ruleId: string;
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
    .select({ id: commissionEntries.id, status: commissionEntries.status, createdBy: commissionEntries.createdBy, notes: commissionEntries.notes })
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
      assignment,
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
    assignment,
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
    conditions.push(gte(commissionEntries.periodEnd, input.periodStart));
  }

  if (input.periodEnd) {
    conditions.push(lte(commissionEntries.periodStart, input.periodEnd));
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

  // Build SQL WHERE conditions for territory rule filtering
  const conditions = [
    eq(territoryRules.tenantId, tenantId),
    eq(territoryRules.isActive, true),
    isNull(territoryRules.deletedAt),
  ];

  if (geography.countryId) {
    conditions.push(
      or(
        isNull(territoryRules.countryId),
        eq(territoryRules.countryId, geography.countryId)
      )!
    );
  }

  if (geography.stateId) {
    conditions.push(
      or(
        isNull(territoryRules.stateId),
        eq(territoryRules.stateId, geography.stateId)
      )!
    );
  }

  const rules = await db
    .select()
    .from(territoryRules)
    .where(and(...conditions))
    .orderBy(desc(territoryRules.priority), territoryRules.id);

  const matchedRules = rules.filter((rule) => {
    if (rule.countryId !== null && geography.countryId !== rule.countryId) {
      return false;
    }

    if (rule.stateId !== null && geography.stateId !== rule.stateId) {
      return false;
    }

    if (!isZipMatch(geography.zip, rule.zipFrom, rule.zipTo)) {
      return false;
    }

    return true;
  });

  if (matchedRules.length === 0) {
    return null;
  }

  const highestPriority = matchedRules[0]!.priority;
  const topMatches = matchedRules.filter((rule) => rule.priority === highestPriority);
  if (topMatches.length > 1) {
    throw new ValidationError(
      `Multiple territory rules matched with priority ${highestPriority}. Resolve rule overlap before commission generation.`
    );
  }

  const selectedRule = topMatches[0]!;

  const [territory] = await db
    .select()
    .from(territories)
    .where(
      and(
        eq(territories.tenantId, tenantId),
        eq(territories.id, selectedRule.territoryId),
        eq(territories.isActive, true),
        isNull(territories.deletedAt)
      )
    )
    .limit(1);

  if (!territory) {
    throw new ValidationError(
      `Territory ${selectedRule.territoryId} is referenced by rule ${selectedRule.id} but not active for tenant ${tenantId}.`
    );
  }

  return {
    ruleId: selectedRule.id,
    priority: selectedRule.priority,
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

async function loadCommissionEntriesForMutation(input: {
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

    if (input.periodStart && entry.periodEnd < input.periodStart) {
      return false;
    }

    if (input.periodEnd && entry.periodStart > input.periodEnd) {
      return false;
    }

    return true;
  });
}

function isZipMatch(zip: string | null, zipFrom: string | null, zipTo: string | null): boolean {
  if (zipFrom === null && zipTo === null) {
    return true;
  }

  if (!zip) {
    return false;
  }

  const value = normalizeZip(zip);
  if (!value) {
    return false;
  }

  const from = zipFrom ? normalizeZip(zipFrom) : null;
  const to = zipTo ? normalizeZip(zipTo) : null;

  if (from === null && to === null) {
    return true;
  }

  const maxLength = Math.max(value.length, from?.length ?? 0, to?.length ?? 0);
  const normalizedValue = value.padStart(maxLength, "0");
  const normalizedFrom = from ? from.padStart(maxLength, "0") : null;
  const normalizedTo = to ? to.padStart(maxLength, "0") : null;

  if (normalizedFrom !== null && normalizedValue < normalizedFrom) {
    return false;
  }

  if (normalizedTo !== null && normalizedValue > normalizedTo) {
    return false;
  }

  return true;
}

function normalizeZip(value: string): string | null {
  const digits = value.replace(/\D+/g, "");
  return digits.length > 0 ? digits : null;
}
