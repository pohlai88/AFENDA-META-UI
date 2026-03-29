# HR Domain Upgrade — Quick Reference

**Status:** Ready for Implementation
**Timeline:** 3-4 weeks
**Team Size:** 1-2 senior developers

---

## 🎯 Strategic Goals

1. **Type Safety:** Integrate `@afenda/meta-types` for business validation
2. **Feature Completeness:** Add 24 missing tables from legacy
3. **Validation Excellence:** 30KB+ Zod schemas with workflow state machines
4. **Architectural Superiority:** Maintain governance while adding diagrams

---

## 📦 Key meta-types Integrations

### Business Type Validators (from meta-types/schema)
```typescript
// Replace basic validators with meta-types-aligned schemas
businessEmailSchema         // RFC 5322 + disposable domain check
internationalPhoneSchema    // E.164 format validation
currencyAmountSchema()      // Configurable decimal precision
taxIdSchemaFactory()        // Country-specific patterns (US, MY, SG, ID, GB, AU)
bankAccountSchema           // IBAN or account number (8-18 digits)
ssnSchema                   // Social security / national ID
boundedPercentageSchema     // 0-100 with 2 decimal max
```

### Workflow State Machines (from meta-types/workflow)
```typescript
// Define valid state transitions
leaveRequestWorkflow    // draft → pending → approved/rejected → completed
recruitmentWorkflow     // applied → screening → interview → offer → accepted/declined
payrollWorkflow         // draft → calculating → review → approved → processing → completed
```

### Runtime Guards (from meta-types/core)
```typescript
isJsonObject()   // Type-safe JSON metadata field validation
isJsonArray()    // Array type guards
assertNever()    // Exhaustiveness checking for enums
```

---

## 🏗️ Implementation Phases

### Phase 0: Foundation (2 days)
**File:** `_zodShared.ts`
- Import meta-types utilities
- Add business type validators
- Create workflow state schemas
- Add enhanced cross-field refinements

### Phase 1: Benefits Domain (3 days)
**File:** `benefits.ts` (new)
**Tables:** 5
- `benefitProviders`
- `benefitPlans`
- `benefitEnrollments` (with workflow)
- `benefitDependentCoverages`
- `benefitClaims` (with workflow)

### Phase 2: Learning Enhancement (4 days)
**File:** `training.ts` → `learning.ts`
**Tables:** +11 (total 14)
- `courses`, `courseModules`, `learningPaths`
- `assessments`, `assessmentQuestions`
- `courseSessions`, `courseEnrollments` (enhanced)
- `learningProgress`, `trainingFeedback`
- `trainingCosts`, `learningPathEnrollments`

### Phase 3: Payroll Enhancement (3 days)
**File:** `payroll.ts`
**Tables:** +5
- `taxBrackets` (country-specific)
- `statutoryDeductions`
- `payrollAdjustments`
- `payslips` (generated documents)
- `paymentDistributions` (bank transfers)

### Phase 4: Recruitment Enhancement (2 days)
**File:** `recruitment.ts`
**Tables:** +3
- `applicantDocuments` (resume, cover letter, etc.)
- `interviewFeedback` (structured feedback forms)
- `offerLetters` (generated offers with workflow)

### Phase 5: Documentation (2 days)
**Create:** `SCHEMA_DIAGRAM.md`
- Mermaid ERD for each domain (6 diagrams)
- Workflow state diagrams (3 diagrams)
- Update README with table catalog
- Create ADR-003 (meta-types integration rationale)

---

## 🎯 Success Metrics

### Type Safety (Target: 100%)
- ✅ All IDs use branded types with entity metadata
- ✅ All business fields use appropriate validators
- ✅ All workflow states use meta-types schemas
- ✅ Zero `any` types in schema definitions

### Feature Completeness (Target: 24 tables)
- Benefits: 5 tables
- Learning: +11 tables
- Payroll: +5 tables
- Recruitment: +3 tables

### Validation Richness (Target: 30KB+)
- 15+ workflow state machines
- 50+ business rule checks
- Cross-field refinements
- Currency/date/enum validators

### Documentation Quality
- 6 Mermaid ERDs
- 3 workflow diagrams
- JSDoc for all entities
- Updated governance docs

---

## 🚀 Advantages Over Legacy

| Dimension | Legacy | Current + Upgrade | Winner |
|-----------|--------|-------------------|--------|
| **Type Safety** | Basic branded IDs | Enhanced with meta-types | 🏆 **Current** |
| **Business Types** | Inline regex | meta-types/schema | 🏆 **Current** |
| **Workflow States** | Manual strings | meta-types/workflow | 🏆 **Current** |
| **Governance** | None | SCHEMA_LOCKDOWN, ADRs | 🏆 **Current** |
| **Validation Size** | 29KB (learning) | 30KB+ (enhanced) | 🏆 **Current** |
| **Schema Separation** | 6 pgSchemas | 1 consolidated | 🏆 Legacy* |
| **Diagrams** | Mermaid ERDs | Will add (Phase 5) | 🤝 Tie |

\* Schema separation deferred to future phase (requires org-wide coordination)

---

## 📋 Phase 0 Checklist (START HERE)

### Day 1: meta-types Integration
- [ ] Read `packages/meta-types/src/schema/field-types.schema.ts` (full file)
- [ ] Read `packages/meta-types/src/workflow/index.ts`
- [ ] Update `_zodShared.ts`:
  - [ ] Add meta-types imports
  - [ ] Add business type validators (email, phone, currency, tax ID, bank account, SSN)
  - [ ] Add workflow state schemas (leave, recruitment, payroll)
  - [ ] Add enhanced cross-field refinements
  - [ ] Add comprehensive JSDoc

### Day 2: Foundation Testing
- [ ] Create unit tests for new validators
- [ ] Test workflow state transitions
- [ ] Verify tax ID factory for all countries
- [ ] Test currency amount precision handling
- [ ] Run full schema validation

---

## 💡 Key Design Decisions

### 1. Why meta-types Over Inline Validation?
**Rationale:** Centralized business type definitions ensure consistency across:
- Database schema validation
- API request/response validation
- UI form validation
- Background job validation

**Benefits:**
- Single source of truth for business rules
- Type-safe refinements
- Reusable across all layers
- Better developer experience

### 2. Why Workflow State Machines?
**Rationale:** Complex business processes (leave approval, recruitment pipeline, payroll cycles) require:
- Valid state transitions
- Audit trails
- Integration points
- Error handling

**Benefits:**
- Prevents invalid state transitions
- Self-documenting workflows
- Type-safe state checks
- Easy to visualize

### 3. Why Single Consolidated Schema?
**Rationale:** Current architecture uses 1 `hr` pgSchema vs legacy's 6 schemas.

**Current Advantages:**
- Simplified RLS policies
- Easier cross-domain queries
- Reduced FK complexity
- Better for small/medium deployments

**Legacy Advantages:**
- Better logical separation
- Easier to scale to dedicated databases
- Clearer domain boundaries

**Decision:** Maintain current consolidated approach for now. Defer multi-schema migration to Phase 2 (Wave 5) when we have sufficient scale to justify the complexity.

### 4. Why 30KB+ Validation Target?
**Rationale:** Legacy has 29.8KB in learning domain alone. Our target of 30KB+ **total** might seem low, but:

**Current Strategy:**
- Reusable validator factories (not duplicated inline)
- meta-types business type integration (centralized)
- Generic cross-field refinements (not per-table)
- Workflow state schemas (shared across domains)

**Effective Validation Coverage:**
- 30KB of HR-specific schemas
- + meta-types/schema business types (25+ validators)
- + meta-types/workflow state machines (15+ workflows)
- + Reusable refinement functions (10+ factories)
- = **Equivalent to 60KB+ of inline validation**

---

## 🔍 Code Quality Standards

### Drizzle Table Definition
```typescript
/**
 * [Entity Name] — [Brief description]
 *
 * [Extended description with business context]
 *
 * Business Rules:
 * - [Rule 1]
 * - [Rule 2]
 *
 * @see [Related documentation]
 */
export const tableName = hrSchema.table(
  "table_name",
  {
    // Columns with inline JSDoc
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: integer("tenant_id").notNull(),
    // ... other columns
    ...timestampColumns,
    ...auditColumns,
    ...softDeleteColumns,
  },
  (table) => [
    // Foreign keys with composite constraints
    foreignKey({ columns: [table.tenantId], foreignColumns: [tenants.tenantId] }),
    // CHECK constraints for business rules
    check("table_name_constraint", sql`...`),
    // Indexes (tenant isolation + query optimization)
    index("table_name_tenant_idx").on(table.tenantId),
    // RLS policies
    ...tenantIsolationPolicies("table_name"),
    serviceBypassPolicy("table_name"),
  ]
);
```

### Zod Schema Definition
```typescript
/**
 * Insert schema for [Entity Name]
 *
 * Validation Rules:
 * - [Rule 1]
 * - [Rule 2]
 */
export const insertEntitySchema = z
  .object({
    // Fields with appropriate validators
    tenantId: z.number().int().positive(),
    email: businessEmailSchema,
    phone: internationalPhoneSchema,
    amount: currencyAmountSchema(2),
    // ... other fields
  })
  // Cross-field refinements
  .refine(refineDateRange("startDate", "endDate"), {
    message: "End date must be after start date",
  })
  // Conditional requirements
  .refine(
    refineConditionalRequired("field", (data) => data.condition === true),
    { message: "Field required when condition is met" }
  );
```

---

## 🛠️ Development Workflow

### For Each Phase:
1. **Design:** Review table definitions in IMPLEMENTATION-PROPOSAL.md
2. **Code:** Create/update domain file with proper JSDoc
3. **Validate:** Add Zod schemas with business rules
4. **Relate:** Update `_relations.ts`
5. **Migrate:** Generate and review migration SQL
6. **Test:** Unit tests for validators and business rules
7. **Document:** Update README and diagrams
8. **Review:** Code review focusing on type safety and governance
9. **Deploy:** Run migration in staging → production

### Migration Safety Checklist
- [ ] All CHECK constraints tested
- [ ] RLS policies verified
- [ ] Foreign keys match composite constraints
- [ ] Indexes cover common query patterns
- [ ] No breaking changes to existing tables
- [ ] Soft-delete partial indexes correct
- [ ] Tenant isolation policies applied

---

## 📚 Related Documentation

- **Full Plan:** [UPGRADE-PLAN.md](./UPGRADE-PLAN.md)
- **Legacy Analysis:** [LEGACY-COMPARISON-ANALYSIS.md](./LEGACY-COMPARISON-ANALYSIS.md)
- **Implementation Details:** [IMPLEMENTATION-PROPOSAL.md](./IMPLEMENTATION-PROPOSAL.md)
- **Gap Summary:** [LEGACY-GAP-SUMMARY.md](./LEGACY-GAP-SUMMARY.md)
- **Governance:** [SCHEMA_LOCKDOWN.md](./SCHEMA_LOCKDOWN.md)
- **ADR-001:** Domain Split Rationale
- **ADR-002:** Circular FK Handling

---

## Next Action

Start with Phase 0 (Foundation Enhancement):
```bash
# Open the shared validation file
code packages/db/src/schema/hr/_zodShared.ts

# Review current validators
# Add meta-types imports
# Implement business type validators
# Add workflow state schemas
# Write comprehensive tests
```

**Questions?** Review [UPGRADE-PLAN.md](./UPGRADE-PLAN.md) for detailed implementation guidance.
