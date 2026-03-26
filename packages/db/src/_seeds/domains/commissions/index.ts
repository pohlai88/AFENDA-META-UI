import { eq, sql } from "drizzle-orm";

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

  const [orderOne] = await tx
    .select({ amountTotal: salesOrders.amountTotal })
    .from(salesOrders)
    .where(eq(salesOrders.id, SEED_IDS.orderOne))
    .limit(1);

  if (!usCountry?.countryId || !caState?.stateId) {
    throw new Error("Geography records missing; cannot seed territory rules");
  }

  if (!orderOne?.amountTotal) {
    throw new Error("Order one not found; cannot seed commission entries");
  }

  const tierRate = "5.0000";
  const baseAmount = money(Number(orderOne.amountTotal));
  const commissionAmount = money(Number(baseAmount) * (Number(tierRate) / 100));

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
        zipFrom: "90000",
        zipTo: "96999",
        priority: 10,
        isActive: true,
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

  await tx
    .insert(commissionEntries)
    .values([
      {
        ...seedAuditScope,
        id: SEED_IDS.commissionEntryOrderOne,
        orderId: SEED_IDS.orderOne,
        salespersonId: seedAuditScope.createdBy,
        planId: SEED_IDS.commissionPlanRevenueStandard,
        baseAmount,
        commissionAmount,
        status: "approved",
        paidDate: null,
        periodStart: new Date("2024-04-01T00:00:00Z"),
        periodEnd: new Date("2024-04-30T23:59:59Z"),
        notes: "Commission generated from confirmed order SO-2024-0001.",
      },
    ])
    .execute();

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
    .select({ id: territoryRules.id, priority: territoryRules.priority })
    .from(territoryRules)
    .where(eq(territoryRules.id, SEED_IDS.territoryRuleCalifornia))
    .limit(1);

  if (!territoryRule || territoryRule.priority < 0) {
    throw new Error("Territory rule invariant mismatch: expected valid non-negative priority");
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

  console.log("✓ Verified Phase 10 commissions and sales team invariants");
}
