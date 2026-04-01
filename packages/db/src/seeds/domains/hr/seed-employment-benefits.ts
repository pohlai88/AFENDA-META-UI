/**
 * HR employment contracts + benefits catalog (employment.ts + benefits.ts).
 * Extends people seed; keep insert order FK-safe.
 */

import { and, isNull, sql } from "drizzle-orm";

import {
  benefitClaims,
  benefitDependentCoverage,
  benefitEnrollments,
  benefitPlanBenefits,
  benefitPlans,
  benefitProviders,
  currencies,
  employeeBenefits,
  employmentContracts,
} from "../../../schema/index.js";
import { SEED_IDS } from "../../seed-ids.js";
import { type SeedAuditScope, type Tx } from "../../seed-types.js";

export async function seedHrEmploymentAndBenefitsCatalog(tx: Tx, seedAuditScope: SeedAuditScope): Promise<void> {
  const [usd] = await tx
    .select({ currencyId: currencies.currencyId })
    .from(currencies)
    .where(and(isNull(currencies.deletedAt), sql`upper(${currencies.code}) = 'USD'`))
    .limit(1);

  if (!usd?.currencyId) {
    throw new Error("HR employment/benefits seed requires USD");
  }

  await tx
    .insert(benefitPlans)
    .values({
      ...seedAuditScope,
      id: SEED_IDS.hrBenefitPlanEmploymentHealth,
      planCode: "PLAN-HEALTH-01",
      name: "Demo Health Plan",
      description: "Canonical seed health plan",
      benefitType: "health_insurance",
      provider: "Acme Insurance",
      monthlyCost: "500.00",
      employeeContribution: "100.00",
      employerContribution: "400.00",
      currencyId: usd.currencyId,
      effectiveFrom: "2023-01-01",
      effectiveTo: null,
      isActive: true,
    })
    .execute();

  await tx
    .insert(employmentContracts)
    .values({
      ...seedAuditScope,
      id: SEED_IDS.hrEmploymentContractAlex,
      contractNumber: "CTR-2023-0001",
      employeeId: SEED_IDS.hrEmployeeAlexChen,
      contractType: "permanent",
      contractStatus: "active",
      startDate: "2023-01-15",
      endDate: null,
      probationPeriodMonths: 3,
      noticePeriodDays: 30,
      workingHoursPerWeek: "40.00",
      annualLeaveEntitlement: 20,
      signedDate: "2023-01-15",
      amendmentNumber: 1,
    })
    .execute();

  await tx
    .insert(employeeBenefits)
    .values({
      ...seedAuditScope,
      id: SEED_IDS.hrEmployeeBenefitAlexHealth,
      employeeId: SEED_IDS.hrEmployeeAlexChen,
      benefitPlanId: SEED_IDS.hrBenefitPlanEmploymentHealth,
      benefitStatus: "active",
      enrollmentDate: "2023-01-15",
      effectiveDate: "2023-02-01",
      endDate: null,
    })
    .execute();

  await tx
    .insert(benefitProviders)
    .values({
      ...seedAuditScope,
      id: SEED_IDS.hrBenefitProviderAcmeInsurance,
      name: "Acme Insurance Co.",
      email: "benefits@acme-insurance.demo",
      phone: "+1-555-0300",
      status: "active",
    })
    .execute();

  await tx
    .insert(benefitPlanBenefits)
    .values({
      ...seedAuditScope,
      id: SEED_IDS.hrBenefitPlanBenefitPpoMedical,
      benefitProviderId: SEED_IDS.hrBenefitProviderAcmeInsurance,
      planName: "PPO Medical",
      description: "Preferred provider medical",
      coverageType: "medical",
      deductible: "500.00",
      monthlyPremium: "350.00",
      currencyId: usd.currencyId,
      status: "active",
    })
    .execute();

  await tx
    .insert(benefitEnrollments)
    .values({
      ...seedAuditScope,
      id: SEED_IDS.hrBenefitEnrollmentJordanPending,
      employeeId: SEED_IDS.hrEmployeeJordanLee,
      benefitProviderId: SEED_IDS.hrBenefitProviderAcmeInsurance,
      planName: "PPO Medical",
      enrollmentDate: "2024-01-10",
      expiryDate: null,
      status: "pending",
    })
    .execute();

  await tx
    .insert(benefitDependentCoverage)
    .values({
      ...seedAuditScope,
      id: SEED_IDS.hrBenefitDependentSpouse,
      benefitEnrollmentId: SEED_IDS.hrBenefitEnrollmentJordanPending,
      name: "Taylor Lee",
      relationship: "spouse",
      dateOfBirth: "1992-04-20",
      status: "active",
    })
    .execute();

  await tx
    .insert(benefitClaims)
    .values({
      ...seedAuditScope,
      id: SEED_IDS.hrBenefitClaimJordan,
      benefitEnrollmentId: SEED_IDS.hrBenefitEnrollmentJordanPending,
      claimDate: "2024-06-01",
      claimAmount: "250.00",
      approvedAmount: null,
      claimStatus: "submitted",
      description: "Dental checkup (seed)",
      reviewedAt: null,
      reviewedBy: null,
    })
    .execute();

  console.log("✓ Seeded HR employment contracts + benefits catalog (8 tables)");
}
