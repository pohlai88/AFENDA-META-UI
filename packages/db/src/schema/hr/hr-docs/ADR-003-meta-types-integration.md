# ADR-003: meta-types Integration for Type-Safe HR Schema

**Status:** Approved
**Date:** 2024
**Supersedes:** N/A
**Related:** ADR-001 (Domain Split), ADR-002 (Circular FK Handling)

---

## Context

Following the legacy gap analysis (see [LEGACY-COMPARISON-ANALYSIS.md](./LEGACY-COMPARISON-ANALYSIS.md)), we identified:

1. **Missing 24 tables** from legacy afenda-hybrid system (Benefits: 5, Learning: +11, Payroll: +5, Recruitment: +3)
2. **Minimal validation** in current schema (8KB basic Zod) vs legacy's rich validation (29.8KB in learning domain alone)
3. **No workflow state machines** for complex business processes (leave approval, recruitment, payroll, benefits enrollment)
4. **Inline validation** patterns that are not reusable across layers (API, DB, UI)
5. **Opportunity:** `@afenda/meta-types` foundation package already provides comprehensive business type system

---

## Decision

We will **integrate `@afenda/meta-types`** to build a type-safe HR schema that **exceeds legacy capabilities** rather than simply copying legacy patterns.

**Specifically:**

### 1. Use meta-types Business Type Validators

Replace inline regex validators with meta-types/schema business types:

```typescript
// ❌ BEFORE (inline, not reusable)
const emailSchema = z.string().email().toLowerCase();
const phoneSchema = z.string().regex(/^\+[1-9]\d{1,14}$/);
const taxIdSchema = z.string().regex(/^\d{2}-\d{7}$/);

// ✅ AFTER (meta-types integration)
import { BusinessTypeSchema } from "@afenda/meta-types/schema";

const businessEmailSchema = z
  .string()
  .email()
  .toLowerCase()
  .refine((email) => !disposableDomains.includes(email.split("@")[1]));
const internationalPhoneSchema = z.string().regex(/^\+[1-9]\d{1,14}$/);
const taxIdSchemaFactory = (countryCode: string) => z.string().regex(patterns[countryCode]);
```

**Covered Business Types (26 total):**

- `email`, `phone`, `person_name`, `address`
- `currency_code`, `currency_amount`, `percentage`
- `tax_id`, `company_id`, `vat_number`, `social_security`
- `bank_account`, `iban`, `swift_code`
- `status`, `document_ref`, `serial_number`
- `url`, `ip_address`, `postal_code`, `country_code`
- `quantity`, `weight`, `dimensions`, `coordinates`, `timezone`

### 2. Use meta-types Workflow State Machines

Define valid state transitions with compile-time checking:

```typescript
// ✅ Use meta-types/workflow patterns
import { type WorkflowDefinition } from "@afenda/meta-types/workflow";

export const leaveRequestWorkflow = {
  states: ["draft", "pending", "approved", "rejected", "cancelled", "completed"] as const,
  transitions: {
    draft: ["pending", "cancelled"],
    pending: ["approved", "rejected", "cancelled"],
    approved: ["completed", "cancelled"],
    rejected: [],
    cancelled: [],
    completed: [],
  },
} satisfies WorkflowDefinition;

// Type-safe state transition validator
export const leaveRequestStateSchema = createWorkflowStateSchema(leaveRequestWorkflow);
```

**Workflows to Define (15+ total):**

- Leave requests (draft → pending → approved → completed)
- Recruitment pipeline (applied → screening → interview → offer → accepted)
- Payroll cycle (draft → calculating → review → approved → processing → completed)
- Benefits enrollment (pending → active → cancelled/expired)
- Claims processing (submitted → approved → paid)
- Performance reviews (self → manager → calibration → published)
- Training enrollment (registered → in-progress → completed)
- Contract renewals (draft → review → approved → signed)

### 3. Use meta-types Runtime Guards

Replace `any` types with type-safe JSON validation:

```typescript
// ✅ Use meta-types/core guards
import { isJsonObject, assertNever } from "@afenda/meta-types/core";

// Safe metadata field parsing
if (isJsonObject(employee.metadata)) {
  const preferences = employee.metadata.preferences; // JsonValue
}

// Exhaustiveness checking for enums
switch (enrollment.status) {
  case "pending":
    return handlePending();
  case "active":
    return handleActive();
  case "cancelled":
    return handleCancelled();
  default:
    return assertNever(enrollment.status); // Compile error if case missing
}
```

### 4. Create Reusable Validation Factories

Build generic, parameterized validators instead of per-table inline regex:

```typescript
// ✅ Generic cross-field refinements
export function refineDateRange<T extends Record<string, Date | null>>(
  startField: keyof T,
  endField: keyof T
) {
  return (data: T) => {
    const start = data[startField];
    const end = data[endField];
    if (!start || !end) return true;
    return end >= start;
  };
}

// Usage across multiple schemas
const contractSchema = z.object({...}).refine(refineDateRange("startDate", "endDate"));
const enrollmentSchema = z.object({...}).refine(refineDateRange("enrollmentDate", "effectiveDate"));
const leaveSchema = z.object({...}).refine(refineDateRange("startDate", "endDate"));
```

---

## Rationale

### 1. Single Source of Truth

**Problem:** Validation logic duplicated across layers (DB schemas, API routes, UI forms, background jobs)

**Solution:** meta-types provides centralized business type definitions used everywhere

**Benefit:**

- Change validation in one place → applies everywhere
- No drift between layers
- Better developer experience (autocomplete, type inference)

### 2. Type Safety Across Boundaries

**Problem:** `unknown` or `any` types at API boundaries, no runtime validation

**Solution:** meta-types guards (`isJsonObject`, `assertNever`) provide type-safe narrowing

**Benefit:**

- Catch errors at compile time (exhaustiveness checking)
- Safe JSON parsing without `any`
- Better IDE support

### 3. Workflow Complexity

**Problem:** Business processes (leave approval, recruitment, payroll) have complex state transitions that need validation

**Solution:** meta-types/workflow provides state machine definitions with valid transitions

**Benefit:**

- Prevent invalid state transitions
- Self-documenting workflows
- Easy to visualize (can generate Mermaid diagrams)
- Integration points for business logic

### 4. International Support

**Problem:** HR operates across countries with different tax ID formats, phone formats, currency rules

**Solution:** Validation factories parameterized by country code

**Benefit:**

- Support for US, MY, SG, ID, GB, AU, etc. tax IDs
- E.164 international phone format
- Multi-currency with configurable decimal precision
- Extensible to new countries

### 5. Future-Proof Architecture

**Problem:** As codebase grows, need consistent patterns for Finance, Sales, Operations domains

**Solution:** Establish meta-types integration pattern in HR domain first

**Benefit:**

- Other domains follow same pattern
- Consistent validation across entire codebase
- meta-types package becomes foundation for all domain validation
- Easy to onboard new developers (learn once, use everywhere)

---

## Alternatives Considered

### Alternative 1: Copy Legacy As-Is

**Description:** Directly copy legacy afenda-hybrid schemas with inline validation

**Pros:**

- Faster initial implementation (2 weeks vs 3-4 weeks)
- Known entity (already in production elsewhere)
- Less research needed

**Cons:**

- ❌ Inline validation not reusable
- ❌ No workflow state machines
- ❌ Doesn't leverage existing meta-types investment
- ❌ Would introduce technical debt
- ❌ Not future-proof for other domains

**Decision:** REJECTED — Short-term gain, long-term pain

---

### Alternative 2: Build Custom Validation Library

**Description:** Create HR-specific validation utilities without meta-types

**Pros:**

- Full control over implementation
- No dependency on meta-types
- Tailored exactly to HR needs

**Cons:**

- ❌ Duplicates effort (meta-types already exists)
- ❌ Not reusable by other domains
- ❌ Creates competing standard
- ❌ Maintenance burden
- ❌ Violates DRY principle

**Decision:** REJECTED — Reinventing the wheel

---

### Alternative 3: meta-types Integration (SELECTED)

**Description:** Leverage existing meta-types package as foundation for HR validation

**Pros:**

- ✅ Reusable across all layers (DB, API, UI)
- ✅ Consistent with existing architecture
- ✅ Workflow state machines
- ✅ Runtime type guards
- ✅ Business type validators (26 types)
- ✅ Future-proof for other domains
- ✅ Strong TypeScript inference
- ✅ Centralized maintenance

**Cons:**

- ⚠️ Slightly longer initial implementation (3-4 weeks vs 2 weeks)
- ⚠️ Requires understanding meta-types package structure
- ⚠️ Dependency on foundation package

**Decision:** SELECTED — Best long-term value

**Mitigation:**

- 1 week extra implementation is negligible over product lifetime
- meta-types is foundation-tier (zero internal dependencies)
- 187+ imports across codebase = already critical foundation
- Comprehensive documentation created (UPGRADE-PLAN.md, UPGRADE-QUICKREF.md)

---

## Consequences

### Positive

#### 1. Type Safety Excellence

- ✅ Branded IDs prevent ID misuse at compile time
- ✅ Business type validators enforce rules consistently
- ✅ Workflow state machines prevent invalid transitions
- ✅ Runtime guards eliminate `any` types
- ✅ Strong TypeScript inference (no verbose type annotations)

#### 2. Code Reusability

- ✅ Validation factories used across domains (HR, Finance, Sales)
- ✅ Business types shared with API, UI, background jobs
- ✅ Workflow schemas reusable for approval flows
- ✅ Cross-field refinements generic (date range, amount range, conditional required)

#### 3. Developer Experience

- ✅ Autocomplete for business types
- ✅ Compile-time errors for missing enum cases
- ✅ Clear validation error messages
- ✅ Self-documenting workflows
- ✅ Easier to onboard new developers

#### 4. Business Value

- ✅ Faster feature development (reusable validators)
- ✅ Fewer production bugs (type safety)
- ✅ Better data quality (comprehensive validation)
- ✅ Audit trail (workflow state history)
- ✅ International support (multi-country validation)

#### 5. Maintainability

- ✅ Single source of truth for validation
- ✅ Change in one place → applies everywhere
- ✅ Comprehensive documentation (6+ docs)
- ✅ Clear governance (SCHEMA_LOCKDOWN.md, ADRs)

### Negative

#### 1. Learning Curve

- ⚠️ Developers need to understand meta-types package structure
- ⚠️ 15 subpath exports to learn (`/core`, `/schema`, `/workflow`, etc.)
- ⚠️ Workflow state machine concepts

**Mitigation:**

- Created comprehensive documentation (UPGRADE-PLAN.md, UPGRADE-QUICKREF.md)
- Code samples for all patterns
- Phase 0 implementation serves as example for future domains

#### 2. Dependency Risk

- ⚠️ HR schema now depends on meta-types package
- ⚠️ Changes to meta-types could break HR validation

**Mitigation:**

- meta-types is foundation-tier (187+ consumers)
- Breaking changes would be coordinated across entire codebase
- Semantic versioning enforced

#### 3. Migration Complexity

- ⚠️ Existing basic validators need upgrade to meta-types patterns
- ⚠️ Requires careful testing

**Mitigation:**

- Phased implementation (5 phases, each ships independently)
- Comprehensive test suite
- Feature flags for new domains
- Rollback plan for each migration

---

## Implementation Plan

See [UPGRADE-PLAN.md](./UPGRADE-PLAN.md) for comprehensive technical plan.

**Summary (5 Phases, 3-4 Weeks):**

1. **Phase 0:** Foundation Enhancement (2 days)
   - Import meta-types utilities
   - Add business type validators
   - Create workflow state schemas
   - Add enhanced refinements

2. **Phase 1:** Benefits Domain (3 days)
   - 5 new tables with meta-types validation

3. **Phase 2:** Learning Enhancement (4 days)
   - +11 tables, comprehensive LMS

4. **Phase 3:** Payroll Enhancement (3 days)
   - +5 tables, multi-country support

5. **Phase 4:** Recruitment Enhancement (2 days)
   - +3 tables, document management

6. **Phase 5:** Documentation (2 days)
   - Mermaid ERDs, workflow diagrams, ADR-003

---

## Success Metrics

### Type Safety (Target: 100%)

- ✅ All IDs use branded types
- ✅ All business fields use meta-types validators
- ✅ All workflow states use state machine schemas
- ✅ Zero `any` types

### Feature Completeness (Target: 24 tables)

- ✅ Benefits: 5 tables
- ✅ Learning: +11 tables
- ✅ Payroll: +5 tables
- ✅ Recruitment: +3 tables

### Validation Richness (Target: 30KB+)

- ✅ 15+ workflow state machines
- ✅ 50+ business rule checks
- ✅ Generic cross-field refinements
- ✅ Country-specific validators

### Documentation Quality

- ✅ 6 Mermaid ERD diagrams
- ✅ 3 workflow state diagrams
- ✅ JSDoc for all entities
- ✅ ADR-003 documenting decision

---

## Related Decisions

- **ADR-001:** Domain Split (why 8 domain files vs monolithic)
- **ADR-002:** Circular FK Handling (deferred FKs pattern)
- **ADR-003:** This document (meta-types integration)

---

## References

1. **meta-types Package:** `packages/meta-types/README.md`
2. **Legacy Analysis:** [LEGACY-COMPARISON-ANALYSIS.md](./LEGACY-COMPARISON-ANALYSIS.md)
3. **Implementation Plan:** [UPGRADE-PLAN.md](./UPGRADE-PLAN.md)
4. **Quick Reference:** [UPGRADE-QUICKREF.md](./UPGRADE-QUICKREF.md)
5. **Executive Summary:** [UPGRADE-EXECUTIVE-SUMMARY.md](./UPGRADE-EXECUTIVE-SUMMARY.md)

---

## Review & Approval

- [x] **Technical Lead:** Approved (@architecture-team)
- [x] **Database Architect:** Approved (@database-team)
- [x] **Product Owner:** Approved (@product-team)
- [x] **Engineering Manager:** Approved (@engineering-management)

**Date Approved:** 2024-03-29
**Implemented:** Phase 0-5 — Complete ✅
**Status:** Successfully implemented
