# Sales Seed Scenario Coverage Matrix

Date: March 27, 2026
Scope: Scenario DSL coverage mapped to checklist categories and validation tests

---

## Purpose

This document maps scenario-based seed/test assets to checklist categories so reviewers can quickly verify what behavior is exercised and where evidence lives.

Primary sources:

- `packages/db/src/_seeds/scenarios.ts`
- `packages/db/src/_seeds/__tests__/scenarios.test.ts`

---

## Scenario Matrix

| Scenario Key                 | Scenario Name                 | Tags                                     | Checklist Coverage                                                                                        | Core Rules Exercised                                                                                                      | Evidence                                                                                                              |
| ---------------------------- | ----------------------------- | ---------------------------------------- | --------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| `highValueOrder`             | High Value Order              | `sales`, `discount`, `tax`               | 3 Business Rule Enforcement; 4 Financial and Numerical Integrity; 10 Seed and Test Coverage               | Recomputed line and order totals remain non-negative; order total equals untaxed plus tax; line sum equals untaxed amount | `TestScenario.highValueOrder()` and test case `highValueOrder keeps order totals internally consistent`               |
| `discountEdgeCase`           | Discount Edge Case            | `discount`, `edge`                       | 3 Business Rule Enforcement; 4 Financial and Numerical Integrity; 10 Seed and Test Coverage               | Discount edge behavior clamps subtotal at zero and avoids negative line outcomes                                          | `TestScenario.discountEdgeCase()` and shared non-negative monetary assertions                                         |
| `overdueDelivery`            | Overdue Delivery              | `delivery`, `logistics`                  | 5 State and Workflow Truth; 10 Seed and Test Coverage                                                     | Past delivery date representation for SLA and alerting paths                                                              | `TestScenario.overdueDelivery()` and test case `overdueDelivery sets a delivery date in the past`                     |
| `creditCheckedPriceOverride` | Credit-Checked Price Override | `sales`, `credit`, `pricing`, `approval` | 3 Business Rule Enforcement; 5 State and Workflow Truth; 6 Audit and Forensics; 10 Seed and Test Coverage | Credit-check governance fields are populated; override below list requires reason plus approver linkage                   | `TestScenario.creditCheckedPriceOverride()` and test case `creditCheckedPriceOverride enforces governance invariants` |

---

## Meta-Coverage Assertions

The scenario test suite also enforces cross-scenario quality gates:

1. Shared metadata contract validation for every scenario
2. Non-negative monetary assertions on known monetary fields
3. Tag-based filtering behavior for targeted execution paths

Evidence:

- `satisfies shared metadata contract`
- `keeps known monetary fields non-negative`
- `filters scenarios by tag for targeted execution`
- `runs only filtered scenarios and preserves metadata contract`

---

## Known Boundaries

1. This matrix covers scenario DSL and scenario tests, not every domain seed module.
2. Partition/retention execution proof remains tracked separately in the performance hardening gap.
3. As new scenarios are added, this matrix should be updated in the same change set.
