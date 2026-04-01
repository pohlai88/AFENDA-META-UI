import { eq, inArray, sql } from "drizzle-orm";

import {
  commissionEntries,
  commissionPlanTiers,
  commissionPlans,
  countries,
  salesOrders,
  salesTeamMembers,
  salesTeams,
  states,
  territories,
  territoryRules,
} from "../../../schema/index.js";
import { money } from "../../money.js";
import { SEED_IDS } from "../../seed-ids.js";
import { type SeedAuditScope, type Tx } from "../../seed-types.js";

export async function seedCommissionsAndTeamsPhase10(
  tx: Tx,
  seedAuditScope: SeedAuditScope
): Promise<void> {
  const [usCountry] = await tx
    .select({ countryId: countries.countryId })
    .from(countries)
    .where(eq(countries.code, "US"))
    .limit(1);

  const [caState] = await tx
    .select({ stateId: states.stateId })
    .from(states)
    .where(eq(states.code, "CA"))
    .limit(1);

  const ordersForCommissions = await tx
    .select({
      id: salesOrders.id,
      amountTotal: salesOrders.amountTotal,
      currencyId: salesOrders.currencyId,
    })
    .from(salesOrders)
    .where(
      inArray(salesOrders.id, [SEED_IDS.orderOne, SEED_IDS.orderTwo, SEED_IDS.orderThree])
    );

  const amountByOrderId = new Map(
    ordersForCommissions.map((row) => [row.id, row.amountTotal] as const)
  );
  const currencyByOrderId = new Map(
    ordersForCommissions.map((row) => [row.id, row.currencyId] as const)
  );

  if (!usCountry?.countryId || !caState?.stateId) {
    throw new Error("Geography records missing; cannot seed territory rules");
  }

  const orderOneTotal = amountByOrderId.get(SEED_IDS.orderOne);
  const orderTwoTotal = amountByOrderId.get(SEED_IDS.orderTwo);
  const orderThreeTotal = amountByOrderId.get(SEED_IDS.orderThree);

  if (orderOneTotal == null || orderTwoTotal == null || orderThreeTotal == null) {
    throw new Error("Orders one–three must exist; cannot seed commission entries");
  }

  const tierRate = "5.0000";
  const baseAmountOne = money(Number(orderOneTotal));
  const commissionAmountOne = money(Number(baseAmountOne) * (Number(tierRate) / 100));
  const baseAmountTwo = money(Number(orderTwoTotal));
  const commissionAmountTwo = money(Number(baseAmountTwo) * (Number(tierRate) / 100));
  const baseAmountThree = money(Number(orderThreeTotal));
  const commissionAmountThree = money(Number(baseAmountThree) * (Number(tierRate) / 100));

  await tx
    .insert(salesTeams)
    .values([
      {
        ...seedAuditScope,
        id: SEED_IDS.salesTeamNorthAmerica,
        name: "North America Sales",
        code: "NA-SALES",
        managerId: seedAuditScope.createdBy,
        isActive: true,
        notes: "Primary team for North America territory coverage.",
      },
    ])
    .execute();

  await tx
    .insert(salesTeamMembers)
    .values([
      {
        ...seedAuditScope,
        id: SEED_IDS.salesTeamMemberPrimary,
        teamId: SEED_IDS.salesTeamNorthAmerica,
        userId: seedAuditScope.createdBy,
        role: "account_executive",
        isLeader: true,
        startDate: new Date("2024-01-01T00:00:00Z"),
        endDate: null,
        isActive: true,
      },
    ])
    .execute();

  await tx
    .insert(territories)
    .values([
      {
        ...seedAuditScope,
        id: SEED_IDS.territoryNorthAmericaWest,
        name: "North America West",
        code: "NA-WEST",
        parentId: null,
        defaultSalespersonId: seedAuditScope.createdBy,
        teamId: SEED_IDS.salesTeamNorthAmerica,
        isDefaultFallback: true,
        isActive: true,
        notes: "Covers western US opportunities.",
      },
    ])
    .execute();

  await tx
    .insert(territoryRules)
    .values([
      {
        ...seedAuditScope,
        id: SEED_IDS.territoryRuleCalifornia,
        territoryId: SEED_IDS.territoryNorthAmericaWest,
        countryId: usCountry.countryId,
        stateId: caState.stateId,
        zipFrom: 90_000,
        zipTo: 96_999,
        matchType: "range",
        priority: 10,
        effectiveFrom: new Date("2020-01-01T00:00:00Z"),
        effectiveTo: null,
      },
    ])
    .execute();

  await tx
    .insert(commissionPlans)
    .values([
      {
        ...seedAuditScope,
        id: SEED_IDS.commissionPlanRevenueStandard,
        name: "Revenue Standard Plan",
        type: "tiered",
        base: "revenue",
        calculationMode: "tiered_cumulative",
        isActive: true,
        notes: "Tiered plan for closed-won sales order revenue.",
      },
    ])
    .execute();

  await tx
    .insert(commissionPlanTiers)
    .values([
      {
        ...seedAuditScope,
        id: SEED_IDS.commissionPlanTierRevenueStandard,
        planId: SEED_IDS.commissionPlanRevenueStandard,
        minAmount: "0.00",
        maxAmount: null,
        rate: tierRate,
        sequence: 10,
      },
    ])
    .execute();

  await tx.insert(commissionEntries).values({
    ...seedAuditScope,
    id: SEED_IDS.commissionEntryOrderOneDraft,
    orderId: SEED_IDS.orderTwo,
    salespersonId: seedAuditScope.createdBy,
    planId: SEED_IDS.commissionPlanRevenueStandard,
    currencyId: currencyByOrderId.get(SEED_IDS.orderTwo) ?? null,
    baseAmount: baseAmountTwo,
    commissionAmount: commissionAmountTwo,
    status: "draft",
    paidDate: null,
    periodStart: "2024-03-01",
    periodEnd: "2024-03-31",
    notes: "Draft commission queued for manager approval.",
  });

  await tx.insert(commissionEntries).values({
    ...seedAuditScope,
    id: SEED_IDS.commissionEntryOrderOne,
    orderId: SEED_IDS.orderOne,
    salespersonId: seedAuditScope.createdBy,
    planId: SEED_IDS.commissionPlanRevenueStandard,
    currencyId: currencyByOrderId.get(SEED_IDS.orderOne) ?? null,
    baseAmount: baseAmountOne,
    commissionAmount: commissionAmountOne,
    status: "approved",
    paidDate: null,
    periodStart: "2024-04-01",
    periodEnd: "2024-04-30",
    notes: "Commission generated from confirmed order SO-2024-0001.",
  });

  await tx.insert(commissionEntries).values({
    ...seedAuditScope,
    id: SEED_IDS.commissionEntryOrderOnePaid,
    orderId: SEED_IDS.orderThree,
    salespersonId: seedAuditScope.createdBy,
    planId: SEED_IDS.commissionPlanRevenueStandard,
    currencyId: currencyByOrderId.get(SEED_IDS.orderThree) ?? null,
    baseAmount: baseAmountThree,
    commissionAmount: commissionAmountThree,
    status: "paid",
    paidDate: "2024-05-31",
    periodStart: "2024-05-01",
    periodEnd: "2024-05-31",
    notes: "Commission paid through payroll batch.",
  });

  console.log("✓ Seeded Phase 10 commissions and sales team entities");
}

export async function validateCommissionsPhase10Invariants(tx: Tx): Promise<void> {
  const [team] = await tx
    .select({ id: salesTeams.id, managerId: salesTeams.managerId })
    .from(salesTeams)
    .where(eq(salesTeams.id, SEED_IDS.salesTeamNorthAmerica))
    .limit(1);

  if (!team?.id || !team.managerId) {
    throw new Error("Sales team invariant mismatch: team and manager must exist");
  }

  const [memberStats] = await tx
    .select({ memberCount: sql<number>`count(*)` })
    .from(salesTeamMembers)
    .where(eq(salesTeamMembers.teamId, SEED_IDS.salesTeamNorthAmerica));

  if (!memberStats || Number(memberStats.memberCount) < 1) {
    throw new Error("Sales team member coverage mismatch: expected at least one team member");
  }

  const [territoryRule] = await tx
    .select({
      id: territoryRules.id,
      priority: territoryRules.priority,
      zipFrom: territoryRules.zipFrom,
      zipTo: territoryRules.zipTo,
      matchType: territoryRules.matchType,
    })
    .from(territoryRules)
    .where(eq(territoryRules.id, SEED_IDS.territoryRuleCalifornia))
    .limit(1);

  if (!territoryRule || territoryRule.priority < 0) {
    throw new Error("Territory rule invariant mismatch: expected valid non-negative priority");
  }

  if (
    territoryRule.zipFrom == null ||
    territoryRule.zipTo == null ||
    territoryRule.zipFrom > territoryRule.zipTo ||
    territoryRule.matchType !== "range"
  ) {
    throw new Error(
      "Territory rule invariant mismatch: expected numeric ZIP range with match_type range"
    );
  }

  const [commissionEntry] = await tx
    .select({
      baseAmount: commissionEntries.baseAmount,
      commissionAmount: commissionEntries.commissionAmount,
      status: commissionEntries.status,
    })
    .from(commissionEntries)
    .where(eq(commissionEntries.id, SEED_IDS.commissionEntryOrderOne))
    .limit(1);

  const [tier] = await tx
    .select({ rate: commissionPlanTiers.rate })
    .from(commissionPlanTiers)
    .where(eq(commissionPlanTiers.id, SEED_IDS.commissionPlanTierRevenueStandard))
    .limit(1);

  if (!commissionEntry || !tier) {
    throw new Error("Commission coverage mismatch: expected commission entry and tier");
  }

  if (commissionEntry.status !== "approved") {
    throw new Error("Commission status invariant mismatch: seeded commission should be approved");
  }

  const expectedCommission = Number(commissionEntry.baseAmount) * (Number(tier.rate) / 100);
  if (Math.abs(expectedCommission - Number(commissionEntry.commissionAmount)) > 0.01) {
    throw new Error(
      `Commission amount mismatch: expected ${expectedCommission.toFixed(2)}, got ${Number(commissionEntry.commissionAmount).toFixed(2)}`
    );
  }

  const [statusCoverage] = await tx
    .select({
      draftCount: sql<number>`count(*) filter (where ${commissionEntries.status} = 'draft')`,
      approvedCount: sql<number>`count(*) filter (where ${commissionEntries.status} = 'approved')`,
      paidCount: sql<number>`count(*) filter (where ${commissionEntries.status} = 'paid')`,
    })
    .from(commissionEntries)
    .where(eq(commissionEntries.planId, SEED_IDS.commissionPlanRevenueStandard));

  if (!statusCoverage || statusCoverage.draftCount < 1) {
    throw new Error("Commission lifecycle coverage mismatch: expected at least one draft entry");
  }

  if (statusCoverage.approvedCount < 1) {
    throw new Error("Commission lifecycle coverage mismatch: expected at least one approved entry");
  }

  if (statusCoverage.paidCount < 1) {
    throw new Error("Commission lifecycle coverage mismatch: expected at least one paid entry");
  }

  console.log("✓ Verified Phase 10 commissions and sales team invariants");
}
