/**
 * HR domain seed.
 *
 * - **Clear:** entire `hr` schema is truncated in `clearExistingData` (no table omitted).
 * - **Seed:** grows module-by-module; start with people + employment/benefits catalog.
 */

import { and, eq, isNull, sql } from "drizzle-orm";

import { seedHrEmploymentAndBenefitsCatalog } from "./seed-employment-benefits.js";

import {
  costCenters,
  countries,
  currencies,
  departments,
  employees,
  jobPositions,
  jobTitles,
  states,
} from "../../../schema/index.js";
import { SEED_IDS } from "../../seed-ids.js";
import { type SeedAuditScope, type Tx } from "../../seed-types.js";

async function hasHrPeopleTables(tx: Tx): Promise<boolean> {
  const result = await tx.execute(
    sql`
      select 1
      from information_schema.tables
      where table_schema = 'hr'
        and table_name = 'cost_centers'
      limit 1
    `
  );
  return Array.isArray((result as { rows?: unknown[] }).rows) && (result as { rows: unknown[] }).rows.length > 0;
}

export async function seedHrPeople(tx: Tx, seedAuditScope: SeedAuditScope): Promise<void> {
  const [usd] = await tx
    .select({ currencyId: currencies.currencyId })
    .from(currencies)
    .where(and(isNull(currencies.deletedAt), sql`upper(${currencies.code}) = 'USD'`))
    .limit(1);

  if (!usd?.currencyId) {
    throw new Error("HR seed requires USD currency from reference data");
  }

  const [caState] = await tx
    .select({ stateId: states.stateId })
    .from(states)
    .where(eq(states.code, "CA"))
    .limit(1);

  const [nyState] = await tx
    .select({ stateId: states.stateId })
    .from(states)
    .where(eq(states.code, "NY"))
    .limit(1);

  const [usCountryRow] = await tx
    .select({ countryId: countries.countryId })
    .from(countries)
    .where(sql`upper(${countries.code}) = 'US'`)
    .limit(1);

  const usCountryId = usCountryRow?.countryId ?? null;

  await tx
    .insert(costCenters)
    .values({
      ...seedAuditScope,
      id: SEED_IDS.hrCostCenterHq,
      costCenterCode: "CC-HQ",
      name: "Corporate HQ",
      description: "Primary cost center for demo tenant",
      costCenterType: "function",
      parentCostCenterId: null,
      managerId: null,
      isActive: true,
    })
    .execute();

  await tx
    .insert(departments)
    .values([
      {
        ...seedAuditScope,
        id: SEED_IDS.hrDepartmentEngineering,
        departmentCode: "ENG",
        name: "Engineering",
        description: "Product engineering",
        departmentType: "operational",
        parentDepartmentId: null,
        managerId: null,
        costCenterId: SEED_IDS.hrCostCenterHq,
        hierarchyPath: "/ENG",
        treeDepth: 0,
        isActive: true,
      },
      {
        ...seedAuditScope,
        id: SEED_IDS.hrDepartmentPlatform,
        departmentCode: "PLAT",
        name: "Platform",
        description: "Platform & infrastructure",
        departmentType: "operational",
        parentDepartmentId: SEED_IDS.hrDepartmentEngineering,
        managerId: null,
        costCenterId: SEED_IDS.hrCostCenterHq,
        hierarchyPath: "/ENG/PLAT",
        treeDepth: 1,
        isActive: true,
      },
    ])
    .execute();

  await tx
    .insert(jobTitles)
    .values([
      {
        ...seedAuditScope,
        id: SEED_IDS.hrJobTitleSoftwareEngineer,
        titleCode: "SWE",
        name: "Software Engineer",
        description: "Individual contributor engineering role",
        departmentId: SEED_IDS.hrDepartmentPlatform,
        levelCode: "L4",
        minSalary: "120000.00",
        maxSalary: "180000.00",
        currencyId: usd.currencyId,
        isActive: true,
      },
      {
        ...seedAuditScope,
        id: SEED_IDS.hrJobTitleEngineeringLead,
        titleCode: "ENG-LEAD",
        name: "Engineering Lead",
        description: "Technical leadership",
        departmentId: SEED_IDS.hrDepartmentEngineering,
        levelCode: "L6",
        minSalary: "160000.00",
        maxSalary: "220000.00",
        currencyId: usd.currencyId,
        isActive: true,
      },
    ])
    .execute();

  await tx
    .insert(jobPositions)
    .values([
      {
        ...seedAuditScope,
        id: SEED_IDS.hrJobPositionIc,
        positionCode: "POS-SWE-PLAT-01",
        name: "Platform Software Engineer",
        description: "IC role on Platform",
        jobTitleId: SEED_IDS.hrJobTitleSoftwareEngineer,
        departmentId: SEED_IDS.hrDepartmentPlatform,
        reportsToPositionId: null,
        employmentType: "full_time",
        isActive: true,
        maxHeadcount: 5,
        currentHeadcount: 1,
      },
      {
        ...seedAuditScope,
        id: SEED_IDS.hrJobPositionLead,
        positionCode: "POS-LEAD-ENG-01",
        name: "Engineering Lead — Platform",
        description: "Lead position",
        jobTitleId: SEED_IDS.hrJobTitleEngineeringLead,
        departmentId: SEED_IDS.hrDepartmentPlatform,
        reportsToPositionId: null,
        employmentType: "full_time",
        isActive: true,
        maxHeadcount: 1,
        currentHeadcount: 1,
      },
    ])
    .execute();

  const systemUserId = seedAuditScope.createdBy;

  await tx
    .insert(employees)
    .values([
      {
        ...seedAuditScope,
        id: SEED_IDS.hrEmployeeAlexChen,
        employeeNumber: "EMP-0001",
        userId: systemUserId,
        firstName: "Alex",
        lastName: "Chen",
        email: "alex.chen@afenda.demo",
        phoneNumber: "+1-555-0101",
        jobPositionId: SEED_IDS.hrJobPositionLead,
        departmentId: SEED_IDS.hrDepartmentPlatform,
        managerId: null,
        employmentType: "full_time",
        employmentStatus: "active",
        statusChangeDate: "2023-01-15",
        employeeCategory: "regular",
        hireDate: "2023-01-15",
        workLocationType: "office",
        addressLine1: "1 Market St",
        city: "San Francisco",
        stateId: caState?.stateId ?? null,
        countryId: usCountryId ?? null,
        postalCode: "94105",
        isActive: true,
      },
      {
        ...seedAuditScope,
        id: SEED_IDS.hrEmployeeJordanLee,
        employeeNumber: "EMP-0002",
        userId: null,
        firstName: "Jordan",
        lastName: "Lee",
        email: "jordan.lee@afenda.demo",
        phoneNumber: "+1-555-0102",
        jobPositionId: SEED_IDS.hrJobPositionIc,
        departmentId: SEED_IDS.hrDepartmentPlatform,
        managerId: null,
        employmentType: "full_time",
        employmentStatus: "active",
        statusChangeDate: "2023-06-01",
        employeeCategory: "probation",
        hireDate: "2023-06-01",
        workLocationType: "remote",
        addressLine1: "200 Broadway",
        city: "New York",
        stateId: nyState?.stateId ?? null,
        countryId: usCountryId ?? null,
        postalCode: "10038",
        isActive: true,
      },
    ])
    .execute();

  console.log("✓ Seeded HR people & org (cost center, departments, titles, positions, 2 employees)");
}

/** Full HR seed entry used by the Truth Engine (extend with additional modules over time). */
export async function seedHrDomain(tx: Tx, seedAuditScope: SeedAuditScope): Promise<void> {
  if (!(await hasHrPeopleTables(tx))) {
    console.warn("⚠ Skipping HR seed domain: required hr schema tables are not present in current DB.");
    return;
  }
  await seedHrPeople(tx, seedAuditScope);
  await seedHrEmploymentAndBenefitsCatalog(tx, seedAuditScope);
}
