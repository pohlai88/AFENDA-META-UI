# Test Generation Strategy

**Last Updated:** March 28, 2026
**Purpose:** Define which tests should be auto-generated vs manually written

---

## Core Principle: Behavior vs Structure

> **"Test behavior, not implementation."** — Martin Fowler

- **Auto-generate:** Tests that verify code structure and contracts
- **Manual write:** Tests that verify business behavior and intent

---

## Auto-Generable Tests ✅

### 1. **Structural Validation** (Current Implementation)

**What:** Truth-config state machines, invariants, policies
**Why:** Configuration defines structure deterministically
**Coverage:** 156 tests from 14 definitions
**Location:** `packages/truth-test/src/__test__/auto-generated.test.ts`

**Rationale:**

- State transitions are defined in `truth-config.ts`
- A machine can enumerate all transitions and check validity
- No human judgment needed about what's "correct"

**Example:**

```typescript
// From truth-config
consignmentStateMachine = {
  initial: "draft",
  states: { draft: { on: { send: "sent" } } },
};

// Auto-generated test
test("consignment_agreement: draft -[send]-> sent", () => {
  expect(canTransition("draft", "send")).toBe("sent");
});
```

---

### 2. **Schema Contracts** (Should Remove)

**What:** Column existence checks (e.g., `expect(table.id).toBeDefined()`)
**Why:** TypeScript + Drizzle already validate at compile time
**Status:** ❌ **REMOVE** 4 files (963 lines) — redundant with TypeScript

**Files to remove:**

- `packages/db/src/__test__/domain-schema-contracts.test.ts`
- `packages/db/src/__test__/platform-schema-contracts.test.ts`
- `packages/db/src/__test__/phase4-schema-contracts.test.ts`
- `packages/db/src/__test__/meta-schema-contracts.test.ts`

**Why redundant:**

```typescript
// This test:
expect(getTableColumns(partners).id).toBeDefined();

// Is redundant with TypeScript:
const p = partners.id; // Type error if 'id' doesn't exist!
```

---

### 3. **API Response Snapshots** (Proposed — New)

**What:** Capture API response shapes and validate they don't change
**Why:** Response contracts are deterministic
**Method:** Vitest `toMatchSnapshot()`

**Example:**

```typescript
// Auto-generate for all API routes
test("GET /sales/orders/:id returns expected shape", async () => {
  const response = await api.get("/sales/orders/test-id");
  expect(response.body).toMatchSnapshot();
});
```

**Coverage estimate:** ~30 API endpoints → 30 auto-generated tests

**Benefits:**

- Catches accidental API breaking changes
- Zero maintenance (auto-updates with `--update`)
- Fast feedback on contract violations

**Limitations:**

- Doesn't verify correctness — only consistency
- Requires human review when snapshots change

---

### 4. **Property-Based Tests** (Proposed — New)

**What:** Generate random inputs and verify properties hold
**Why:** Pure functions have verifiable mathematical properties
**Method:** fast-check library

**Example:**

```typescript
// Auto-generate for pure calculation functions
import fc from "fast-check";

test("computeLineTaxes: tax is always positive", () => {
  fc.assert(
    fc.property(
      fc.double({ min: 0, max: 10000 }), // amount
      fc.double({ min: 0, max: 1 }), // tax rate
      (amount, rate) => {
        const result = computeLineTaxes(amount, rate);
        expect(result.tax).toBeGreaterThanOrEqual(0);
      }
    )
  );
});
```

**Auto-generable properties:**

- **Commutativity:** `f(a, b) === f(b, a)`
- **Idempotence:** `f(f(x)) === f(x)`
- **Bounds:** Output always within valid range
- **Inverse:** `decode(encode(x)) === x`

**Coverage estimate:** ~40 pure functions → 80 property tests

---

### 5. **Zod Schema Validation** (Proposed — New)

**What:** Generate test cases from Zod schemas
**Why:** Schemas already define valid/invalid shapes
**Method:** Parse Zod schema and generate edge cases

**Example:**

```typescript
// Given Zod schema
const OrderSchema = z.object({
  total: z.number().positive(),
  status: z.enum(["draft", "confirmed"]),
});

// Auto-generate tests
test("OrderSchema: accepts valid input", () => {
  expect(OrderSchema.parse({ total: 100, status: "draft" })).toBeDefined();
});

test("OrderSchema: rejects negative total", () => {
  expect(() => OrderSchema.parse({ total: -1, status: "draft" })).toThrow(z.ZodError);
});

test("OrderSchema: rejects invalid status", () => {
  expect(() => OrderSchema.parse({ total: 100, status: "invalid" })).toThrow(z.ZodError);
});
```

**Coverage estimate:** ~150 Zod schemas → 450 validation tests

---

## Manually-Written Tests ❌ (Cannot Auto-Generate)

### 1. **Business Logic Calculations**

**What:** Tax engines, commission rules, subscription billing
**Why:** Expected values come from domain expertise

**Example:**

```typescript
// apps/api/src/modules/sales/logic/__test__/tax-engine.test.ts
test("GST 18% + SGST 21.5% compound tax on ₹100", () => {
  const result = computeLineTaxes({
    amount: 100,
    taxes: [gstTax, sgstTax],
  });

  expect(result.total).toBe(139.5); // WHERE DOES 139.50 COME FROM?
  // Answer: Human domain expert calculated it
});
```

**Why not auto-generate:**

- A machine doesn't know that 139.50 is the correct answer
- Only a tax accountant or domain expert knows compound tax rules
- Business rules change (VAT rates, formula adjustments)

**Keep manual:** 28 test files in `apps/api/src/modules/*/logic/__test__/`

---

### 2. **Security & Multi-Tenant Isolation**

**What:** RLS policies, tenant data separation
**Why:** Security requirements come from threat models

**Example:**

```typescript
// packages/truth-test/src/__test__/truth-engine.tenant-isolation.test.ts
test("tenant A cannot see tenant B orders", async () => {
  const orderA = await createOrder({ tenant_id: "tenant-a" });
  const orderB = await createOrder({ tenant_id: "tenant-b" });

  const resultsA = await queryOrders({ tenant_id: "tenant-a" });

  expect(resultsA).toContain(orderA);
  expect(resultsA).not.toContain(orderB); // CRITICAL SECURITY BOUNDARY
});
```

**Why not auto-generate:**

- Security requirements are defined by humans (RBAC policies, data isolation)
- False negative = critical security vulnerability
- Requires understanding threat model and access control intent

**Keep manual:** 12 integration tests for security

---

### 3. **User Experience & UI Behavior**

**What:** Store state, form validation, navigation flows
**Why:** UX specifications come from designers/product owners

**Example:**

```typescript
// apps/web/src/stores/ui/__test__/sidebar-store.test.ts
test("toggling module expands/collapses it", () => {
  useSidebarStore.getState().toggleModule("inventory");
  expect(useSidebarStore.getState().expandedModules).toContain("inventory");

  useSidebarStore.getState().toggleModule("inventory");
  expect(useSidebarStore.getState().expandedModules).not.toContain("inventory");
});
```

**Why not auto-generate:**

- A machine doesn't know the desired UX behavior
- Product requirements define what "expand" means
- User expectations vary by context

**Keep manual:** 3 UI store tests

---

### 4. **Edge Cases & Error Handling**

**What:** Zero amounts, null partners, concurrent updates
**Why:** Edge cases discovered through experience

**Example:**

```typescript
test("commission calculation handles zero order total", () => {
  const result = calculateCommission({
    orderTotal: 0,
    rate: 0.05,
  });

  expect(result.commission).toBe(0);
  expect(result.eligibleForPayment).toBe(false); // BUSINESS RULE
});
```

**Why not auto-generate:**

- Requires understanding what "zero" means in business context
- Edge cases often discovered through production incidents
- Behavior is policy decision, not technical fact

**Keep manual:** Edge case tests throughout codebase

---

### 5. **Integration & End-to-End Workflows**

**What:** Multi-step business processes
**Why:** Workflow definition comes from business process analysis

**Example:**

```typescript
// apps/api/src/routes/__test__/sales.route.test.ts
test("complete order lifecycle: draft → confirm → fulfill → invoice", async () => {
  const order = await createOrder({ status: "draft" });

  await POST(`/orders/${order.id}/confirm`);
  expect(order.status).toBe("confirmed");

  await POST(`/orders/${order.id}/fulfill`);
  expect(inventoryService.deductStock).toHaveBeenCalled();

  await POST(`/orders/${order.id}/invoice`);
  expect(accountingService.createEntry).toHaveBeenCalled();
});
```

**Why not auto-generate:**

- Workflow steps are defined by business process
- Side effects (inventory deduction) are business decisions
- Orchestration logic requires understanding system architecture

**Keep manual:** 8 route integration tests

---

## Decision Matrix

| Test Type                           | Auto-Generate? | Reason                                |
| ----------------------------------- | -------------- | ------------------------------------- |
| **State machine transitions**       | ✅ YES         | Config-driven, deterministic          |
| **API response shapes**             | ✅ YES         | Snapshot testing (consistency)        |
| **Property-based (pure functions)** | ✅ YES         | Mathematical properties               |
| **Zod schema validation**           | ✅ YES         | Schema defines valid inputs           |
| **Schema column existence**         | ⚠️ DELETE      | TypeScript already does this          |
| **Tax calculations**                | ❌ NO          | Domain expert defines expected values |
| **Security isolation**              | ❌ NO          | Threat model defines requirements     |
| **UI behavior**                     | ❌ NO          | UX specs define desired behavior      |
| **Edge cases**                      | ❌ NO          | Experience reveals these              |
| **Business workflows**              | ❌ NO          | Process analysis defines steps        |

---

## Coverage Impact Analysis

### Current State

- **Total tests:** 123 files
- **Auto-generated:** 1 file (156 tests)
- **Manual:** 122 files
- **Auto-generation coverage:** ~0.8%

### Proposed State (After Optimization)

- **Auto-generated:**
  - State machines: 156 tests ✅ (existing)
  - API snapshots: 30 tests 🆕
  - Property-based: 80 tests 🆕
  - Zod validation: 450 tests 🆕
  - **Total auto-generated: ~716 tests**
- **Manual:**
  - Business logic: 28 files
  - Security: 12 files
  - UI: 3 files
  - Integration: 8 files
  - **Total manual: ~51 files**
- **Removed:** 4 schema contract files (redundant)
- **Auto-generation coverage:** ~58%

---

## Implementation Priority

### Phase 1: Cleanup ⚡ (15 min)

1. Remove 4 schema contract test files (963 lines)
2. Document why they're redundant

### Phase 2: API Snapshots 📸 (2 hours)

1. Auto-generate snapshot tests for all API routes
2. Run once to create baseline snapshots
3. Add to CI pipeline

### Phase 3: Property-Based Tests 🔢 (4 hours)

1. Identify pure functions (tax, pricing, calculations)
2. Generate property tests (commutativity, bounds, etc.)
3. Integrate fast-check library

### Phase 4: Zod Validation 🛡️ (6 hours)

1. Parse all Zod schemas
2. Generate valid/invalid test cases
3. Auto-update when schemas change

---

## Verification Strategy

After implementing, measure:

1. **Test count:** Auto-generated vs manual
2. **Coverage:** V8 line coverage before/after
3. **Build time:** Impact of new tests on CI duration
4. **Maintenance:** How often tests need manual updates

**Success criteria:**

- ✅ 50%+ tests auto-generated
- ✅ 80%+ V8 line coverage
- ✅ <5% test maintenance burden
- ✅ <10 min CI build time

---

## References

- [Martin Fowler - Practical Test Pyramid](https://martinfowler.com/articles/practical-test-pyramid.html)
- [Martin Fowler - Test Shapes](https://martinfowler.com/articles/2021-test-shapes.html)
- [Vitest Snapshot Testing](https://vitest.dev/guide/snapshot)
- [Mark Seemann - Property-Based Testing](https://blog.ploeh.dk/2015/01/10/diamond-kata-with-fscheck/)
- [Enterprise Architecture Patterns](d:\AFENDA-META-UI.agents\skills\enterprise-architecture-patterns\SKILL.md)
