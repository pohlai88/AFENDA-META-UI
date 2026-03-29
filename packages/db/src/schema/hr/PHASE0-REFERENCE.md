# Phase 0 Quick Reference Guide

**Status:** ✅ Complete & Enhanced
**Last Updated:** 2026-03-29

---

## 📦 What's in \_zodShared.ts

### Branded ID Types (70+)

All HR entities have branded UUID types for type safety:

```ts
import { EmployeeIdSchema, type EmployeeId } from "./_zodShared";

const employeeId: EmployeeId = z.coerce.string().pipe(EmployeeIdSchema).parse(uuid());
```

### Business Type Validators (23)

| Validator                        | Use Case                         | Example                                          |
| -------------------------------- | -------------------------------- | ------------------------------------------------ |
| `businessEmailSchema`            | Work emails (no disposable)      | `.extend({ email: businessEmailSchema })`        |
| `internationalPhoneSchema`       | Phone numbers (E.164 format)     | `.extend({ phone: internationalPhoneSchema })`   |
| `currencyAmountSchema(decimals)` | Money amounts                    | `currencyAmountSchema(2)` for USD                |
| `boundedPercentageSchema`        | 0-100% values                    | `.extend({ workload: boundedPercentageSchema })` |
| `taxIdSchemaFactory(country)`    | Tax IDs (US, MY, SG, ID, GB, AU) | `taxIdSchemaFactory('US')`                       |
| `bankAccountSchema`              | IBAN or account numbers          | `.extend({ account: bankAccountSchema })`        |
| `ibanSchema`                     | Strict IBAN validation           | `.extend({ iban: ibanSchema })`                  |
| `swiftCodeSchema`                | SWIFT/BIC codes                  | `.extend({ swift: swiftCodeSchema })`            |
| `ssnSchema`                      | Social security numbers          | `.extend({ ssn: ssnSchema })`                    |
| `vatNumberSchema`                | VAT registration numbers         | `.extend({ vat: vatNumberSchema })`              |
| `personNameSchema`               | Full/first/last names            | `.extend({ firstName: personNameSchema })`       |
| `postalCodeSchema`               | ZIP/postal codes                 | `.extend({ zipCode: postalCodeSchema })`         |
| `documentRefSchema`              | Document references              | `.extend({ docRef: documentRefSchema })`         |
| `serialNumberSchema`             | Serial/asset numbers             | `.extend({ serial: serialNumberSchema })`        |
| `statusSchema`                   | Status fields                    | `.extend({ status: statusSchema })`              |
| `metadataSchema`                 | Flexible JSON metadata           | `.extend({ metadata: metadataSchema })`          |
| `strictMetadataSchema`           | Required metadata                | `.extend({ metadata: strictMetadataSchema })`    |

### Workflow State Machines (9)

| Workflow                | States                                                                                                            | Entry       | Exit                                       |
| ----------------------- | ----------------------------------------------------------------------------------------------------------------- | ----------- | ------------------------------------------ |
| **Leave Request**       | draft → submitted → approved/rejected → cancelled                                                                 | draft       | approved/rejected/cancelled                |
| **Recruitment**         | received → screening → shortlisted → interview_scheduled → interviewed → offer_extended → offer_accepted/rejected | received    | offer_accepted/rejected/rejected/withdrawn |
| **Payroll**             | draft → computed → approved → paid                                                                                | draft       | paid                                       |
| **Benefits Enrollment** | pending → active → cancelled/expired                                                                              | pending     | cancelled/expired                          |
| **Claims Processing**   | submitted → under_review → approved/rejected → paid                                                               | submitted   | paid                                       |
| **Performance Review**  | not_started → in_progress → submitted → reviewed → approved/rejected                                              | not_started | approved/rejected                          |
| **Training Enrollment** | registered → in_progress → completed/failed → (failed → registered)                                               | registered  | completed                                  |
| **Contract Lifecycle**  | draft → active → expired/terminated/renewed → (renewed → active)                                                  | draft       | terminated                                 |
| **Onboarding**          | not_started → in_progress → completed/cancelled                                                                   | not_started | completed/cancelled                        |

**Usage:**

```ts
import { leaveRequestWorkflow, leaveRequestStateSchema } from "./_zodShared";

const leaveSchema = createInsertSchema(leaveRequests)
  .extend({
    currentState: z.enum(leaveRequestWorkflow.states),
  })
  .superRefine(leaveRequestStateSchema);
```

### Cross-Field Refinements (15+)

| Refinement                                    | Purpose                     | Example                                                                           |
| --------------------------------------------- | --------------------------- | --------------------------------------------------------------------------------- |
| `refineEndDateOnOrAfterStartDate()`           | endDate >= startDate        | `.superRefine(refineEndDateOnOrAfterStartDate())`                                 |
| `refineDateRange(startField, endField)`       | Generic date range          | `.superRefine(refineDateRange("from", "to"))`                                     |
| `refineTerminationAfterHire()`                | terminationDate >= hireDate | `.superRefine(refineTerminationAfterHire())`                                      |
| `refineNonNegativeAmount(field)`              | Amount >= 0                 | `.superRefine(refineNonNegativeAmount("salary"))`                                 |
| `refinePositiveAmount(field)`                 | Amount > 0                  | `.superRefine(refinePositiveAmount("hours"))`                                     |
| `refineAmountRange(field, {min, max})`        | Amount in range             | `.superRefine(refineAmountRange("bonus", {min: 0, max: 10000}))`                  |
| `refineBoundedHours(field, min, max)`         | Hours validation            | `.superRefine(refineBoundedHours("dailyHours", 0, 24))`                           |
| `refineConditionalRequired(field, condition)` | Required if condition       | `.superRefine(refineConditionalRequired("reason", d => d.status === "rejected"))` |
| `refineEnumValue(field, values)`              | Enum check                  | `.superRefine(refineEnumValue("status", ["active", "inactive"]))`                 |
| `refineMutuallyExclusive(fields)`             | Only one field set          | `.superRefine(refineMutuallyExclusive(["cash", "check", "transfer"]))`            |
| `refineAtLeastOne(fields)`                    | At least one field set      | `.superRefine(refineAtLeastOne(["email", "phone"]))`                              |
| `refineUniqueArray(field)`                    | Array has unique values     | `.superRefine(refineUniqueArray("tags"))`                                         |

### Metadata Validators (NEW in Phase 0)

```ts
// Basic metadata (any JSON object)
const basicSchema = createInsertSchema(departments).extend({
  metadata: metadataSchema, // {} or {key: value, ...}
});

// Required metadata (non-empty)
const requiredSchema = createInsertSchema(employees).extend({
  metadata: strictMetadataSchema, // {key: value, ...}
});

// Structured metadata with type safety
const departmentMetadata = createTypedMetadataSchema(
  {
    budgetCode: z.string(),
    manager: z.string().optional(),
    tags: z.array(z.string()),
  },
  { required: true }
);

const typedSchema = createInsertSchema(departments).extend({
  metadata: departmentMetadata,
});
```

---

## 🎯 Common Patterns

### Pattern 1: Simple Business Types

```ts
const employeeSchema = createInsertSchema(employees).extend({
  email: businessEmailSchema,
  phone: internationalPhoneSchema,
  salary: currencyAmountSchema(2),
  taxId: taxIdSchemaFactory("US"),
});
```

### Pattern 2: Workflow States

```ts
const leaveRequestSchema = createInsertSchema(leaveRequests)
  .extend({
    currentState: z.enum(leaveRequestWorkflow.states),
  })
  .superRefine(leaveRequestStateSchema);
```

### Pattern 3: Complex Validation

```ts
const contractSchema = createInsertSchema(contracts)
  .extend({
    startDate: z.coerce.date(),
    endDate: z.coerce.date().optional(),
    salary: currencyAmountSchema(2),
  })
  .superRefine(refineDateRange("startDate", "endDate"))
  .superRefine(refineAmountRange("salary", { min: 0, max: 999999 }))
  .superRefine(refineConditionalRequired("endReason", (data) => data.status === "terminated"));
```

### Pattern 4: Metadata

```ts
const projectMetadata = createTypedMetadataSchema({
  budget: z.number(),
  owner: z.string(),
  tags: z.array(z.string()).optional(),
});

const projectSchema = createInsertSchema(projects).extend({
  metadata: projectMetadata,
});
```

---

## 🚀 Integration Checklist

When implementing Phase 1+ tables:

- [ ] Import branded IDs from `_zodShared` (e.g., `BenefitProviderIdSchema`)
- [ ] Use business type validators instead of `.text()` or `.numeric()`
- [ ] Add workflow state validator if table has workflow
- [ ] Use cross-field refinements for CHECK constraints
- [ ] Extend metadata with `createTypedMetadataSchema` for custom attributes
- [ ] Add JSDoc with workflow state diagram (if applicable)
- [ ] Test all validators in unit tests

---

## 📚 Related Documentation

- **Implementation Plan:** [UPGRADE-PLAN.md](./UPGRADE-PLAN.md)
- **Executive Summary:** [UPGRADE-EXECUTIVE-SUMMARY.md](./UPGRADE-EXECUTIVE-SUMMARY.md)
- **Meta-Types Package:** `packages/meta-types/src/`
- **Source File:** `packages/db/src/schema/hr/_zodShared.ts`

---

## ✅ Phase 0 Validation

All Phase 0 deliverables complete:

- ✅ meta-types imports (schema, workflow, core)
- ✅ 23 business type validators
- ✅ 9 workflow state machines
- ✅ 15+ cross-field refinements
- ✅ Runtime type guards utilized (isJsonObject)
- ✅ Comprehensive JSDoc with examples
- ✅ Zero TypeScript errors
- ✅ Production ready

Ready for Phase 1: Benefits Domain 🎯
