# Legacy HRM Schema Comparison Analysis

**Date:** March 29, 2026
**Source:** [afenda-hybrid@4c66d3f](https://github.com/pohlai88/afenda-hybrid/tree/4c66d3f487aac21698ae1d5e82ce12985a3f1cc0/packages/db/src/schema-hrm)
**Target:** AFENDA-META-UI (current workspace)

## Executive Summary

The legacy system (`afenda-hybrid`) uses a **multi-schema architecture** with 6 separate PostgreSQL schemas, while the current system consolidates everything into a **single `hr` schema**. This analysis identifies architectural differences, missing domains, and implementation gaps.

---

## 1. Architecture Comparison

### 1.1 Schema Organization

| Aspect | Legacy (afenda-hybrid) | Current (AFENDA-META-UI) | Gap? |
|--------|----------------------|--------------------------|------|
| **pgSchema Count** | 6 separate schemas | 1 consolidated schema | ⚠️ MAJOR |
| **Schema Names** | `hr`, `payroll`, `benefits`, `learning`, `recruitment`, `talent` | `hr` (all-in-one) | ⚠️ MAJOR |
| **Directory Structure** | `schema-hrm/<domain>/` | `schema/hr/` | ⚠️ MAJOR |
| **Subdirectory Organization** | `fundamentals/` + `operations/` | Flat domain files | ⚠️ HIGH |
| **File Organization** | Domain-based files within subdirs | Domain-based files (flat) | ✅ Similar |

### 1.2 pgSchema Definitions

**Legacy:**
```typescript
// packages/db/src/schema-hrm/benefits/_schema.ts
export const benefitsSchema = pgSchema("benefits");

// packages/db/src/schema-hrm/learning/_schema.ts
export const learningSchema = pgSchema("learning");

// packages/db/src/schema-hrm/payroll/_schema.ts
export const payrollSchema = pgSchema("payroll");

// packages/db/src/schema-hrm/recruitment/_schema.ts
export const recruitmentSchema = pgSchema("recruitment");

// packages/db/src/schema-hrm/talent/_schema.ts
export const talentSchema = pgSchema("talent");

// packages/db/src/schema-hrm/hr/_schema.ts
export const hrSchema = pgSchema("hr");
```

**Current:**
```typescript
// packages/db/src/schema/hr/_schema.ts
export const hrSchema = pgSchema("hr");  // Contains ALL tables
```

**Impact:**
- ⚠️ **Breaking Change Required** — Moving tables between schemas requires full migration regeneration
- ⚠️ **Cross-Schema FK Complexity** — Legacy carefully manages FKs across schemas via custom SQL
- ⚠️ **Ownership & Boundaries** — Separate schemas provide clearer domain ownership

---

## 2. Missing Domains

### 2.1 Benefits Domain

**Legacy Structure:**
```
schema-hrm/benefits/
├── README.md (4.5KB)
├── _schema.ts (benefitsSchema)
├── _enums.ts (BenefitType, EnrollmentStatus, ClaimStatus)
├── _zodShared.ts (831 bytes)
├── _relations.ts (5.6KB)
├── fundamentals/
│   ├── benefitsProviders.ts
│   └── benefitPlans.ts
└── operations/
    ├── benefitEnrollments.ts
    ├── benefitDependentCoverages.ts
    └── benefitClaims.ts
```

**Current Status:** ❌ **NOT IMPLEMENTED**

**Tables Missing:**
- `benefits.benefits_providers` — Insurance/benefit providers catalog
- `benefits.benefit_plans` — Per-provider benefit plan definitions *(Note: Current has `hr.benefit_plans` but simplified)*
- `benefits.benefit_enrollments` — Employee enrollment records
- `benefits.benefit_dependent_coverages` — Dependent coverage tracking
- `benefits.benefit_claims` — Claims processing and approval

**Enums Missing:**
- `BenefitType` — health_insurance, life_insurance, dental, vision, retirement, etc.
- `EnrollmentStatus` — pending, active, cancelled, expired
- `ClaimStatus` — submitted, under_review, approved, rejected, paid

**Business Impact:**
- ⚠️ **High** — No dependent coverage, no claims processing, limited provider management

---

### 2.2 Learning Domain (vs Current "Training")

**Legacy Structure:**
```
schema-hrm/learning/
├── README.md (15.6KB — extensive!)
├── _schema.ts (learningSchema)
├── _enums.ts (CourseType)
├── _zodShared.ts (29.8KB — massive Zod validations!)
├── _relations.ts (10.2KB)
├── fundamentals/
│   ├── courses.ts
│   ├── courseModules.ts
│   ├── learningPaths.ts
│   └── assessments.ts
└── operations/
    ├── courseSessions.ts
    ├── courseEnrollments.ts
    ├── learningPathAssignments.ts
    ├── learningPathProgress.ts
    ├── certificationAwards.ts
    ├── courseFeedback.ts
    └── trainingCosts.ts
```

**Current Structure:**
```
schema/hr/training.ts (3 tables)
├── trainingPrograms
├── trainingAttendance
└── trainingCertifications
```

**Gap Analysis:**

| Feature | Legacy | Current | Gap |
|---------|--------|---------|-----|
| **Course Catalog** | ✅ courses + modules | ❌ Only trainingPrograms | ⚠️ HIGH |
| **Learning Paths** | ✅ Full path system with progress tracking | ❌ None | ⚠️ HIGH |
| **Assessments** | ✅ Dedicated assessment system | ❌ None | ⚠️ MEDIUM |
| **Session Management** | ✅ courseSessions with schedules | ❌ Only attendance records | ⚠️ HIGH |
| **Enrollment Tracking** | ✅ courseEnrollments (session + sessionless) | ❌ None | ⚠️ HIGH |
| **Certification Awards** | ✅ certificationAwards linked to talent | ❌ Simple trainingCertifications | ⚠️ MEDIUM |
| **Feedback System** | ✅ courseFeedback | ❌ None | ⚠️ LOW |
| **Cost Tracking** | ✅ trainingCosts | ❌ None | ⚠️ MEDIUM |

**Tables Missing:**
- `learning.courses` — Course catalog with metadata
- `learning.course_modules` — Course content modules
- `learning.learning_paths` — Career development paths
- `learning.assessments` — Assessment definitions
- `learning.course_sessions` — Scheduled training sessions
- `learning.course_enrollments` — Student enrollment records
- `learning.learning_path_assignments` — Assigned career paths
- `learning.learning_path_progress` — Per-course progress tracking
- `learning.certification_awards` — Certification issuance
- `learning.course_feedback` — Session feedback
- `learning.training_costs` — Training expense tracking

**Zod Richness:** Legacy has 29.8KB of domain-specific Zod schemas vs current's minimal validation

---

### 2.3 Payroll Domain Separation

**Legacy:** Separate `payroll` schema with dedicated pgSchema
**Current:** Payroll tables live in `hr` schema under `payroll.ts`

**Tables (Current vs Legacy Naming):**

| Current (hr schema) | Legacy (payroll schema) | Match? |
|---------------------|-------------------------|--------|
| `hr.salary_components` | `payroll.salary_components` | ✅ Same concept, different schema |
| `hr.employee_salaries` | `payroll.employee_salary_mappings` | ✅ Same concept |
| `hr.payroll_periods` | `payroll.payroll_periods` | ✅ Match |
| `hr.payroll_entries` | `payroll.payroll_runs` | ⚠️ **Naming differs** |
| `hr.payroll_lines` | `payroll.payroll_line_items` | ✅ Same concept |

**Additional Legacy Tables:**
- `payroll.tax_brackets` — Tax calculation rules
- `payroll.statutory_deductions` — Mandatory deductions configuration
- `payroll.payroll_adjustments` — Manual pay adjustments
- `payroll.payslips` — PDF/metadata for employee payslips
- `payroll.payment_distributions` — Bank transfer records

**Gap:** ⚠️ **MEDIUM** — Missing 5 critical payroll tables + schema separation

---

### 2.4 Recruitment Domain Separation

**Legacy:** Separate `recruitment` schema
**Current:** Recruitment tables in `hr` schema under `recruitment.ts`

**Tables Comparison:**

| Current (hr schema) | Legacy (recruitment schema) | Match? |
|---------------------|----------------------------|--------|
| `hr.job_requisitions` | `recruitment.job_requisitions` | ✅ Same |
| `hr.job_applicants` | `recruitment.job_applicants` | ✅ Same |
| `hr.job_applications` | `recruitment.job_applications` | ✅ Same |
| `hr.application_interviews` | `recruitment.interview_schedules` | ✅ Similar |

**Additional Legacy Tables:**
- `recruitment.applicant_documents` — Resume/CV attachments
- `recruitment.interview_feedback` — Structured interview evaluations
- `recruitment.offer_letters` — Offer generation and acceptance

**Gap:** ⚠️ **MEDIUM** — Missing 3 tables + schema separation

---

### 2.5 Talent Domain Separation

**Legacy:** Separate `talent` schema with domain-scoped `_shared/` helpers
**Current:** Talent tables in `hr` schema under `talent.ts`

**Tables Comparison:**

| Current (hr schema) | Legacy (talent schema) | Match? |
|---------------------|------------------------|--------|
| `hr.performance_reviews` | `talent.performance_reviews` | ✅ Same |
| `hr.performance_goals` | `talent.performance_goals` | ✅ Same |
| `hr.employee_skills` | `talent.employee_skills` | ✅ Same |
| `hr.skill_assessments` | `talent.skill_assessments` | ✅ Same |
| `hr.succession_plans` | `talent.succession_plans` | ✅ Same |
| `hr.development_plans` | `talent.development_plans` | ✅ Same |
| `hr.competency_frameworks` | `talent.competency_frameworks` | ✅ Same |

**Additional Legacy Features:**
- `talent/_shared/proficiency.ts` — Domain-scoped helper utilities
- More granular `_relations.ts` (14.5KB vs current's combined relations)

**Gap:** ⚠️ **LOW** — Tables exist, but schema separation + domain helpers missing

---

## 3. Structural Differences

### 3.1 Subdirectory Organization

**Legacy Pattern:**
```
<domain>/
├── fundamentals/      ← Master data (catalogs, configurations)
│   ├── <table1>.ts
│   └── <table2>.ts
└── operations/        ← Transactional data (enrollments, requests, records)
    ├── <table3>.ts
    └── <table4>.ts
```

**Current Pattern:**
```
hr/
├── people.ts          ← All people tables (5 tables)
├── payroll.ts         ← All payroll tables (5 tables)
├── attendance.ts      ← All attendance tables (10 tables)
└── ...
```

**Comparison:**

| Aspect | Legacy | Current | Gap |
|--------|--------|---------|-----|
| **Master vs Transactional Separation** | ✅ Clear via subdirs | ❌ Mixed in domain files | ⚠️ MEDIUM |
| **File Size** | Smaller, focused files | Larger domain files | ⚠️ LOW |
| **Conceptual Clarity** | ✅ fundamentals vs operations | ❌ Domain grouping only | ⚠️ LOW |

**Example:** Legacy `learning/fundamentals/courses.ts` + `learning/operations/courseEnrollments.ts` makes it obvious which is config vs runtime data. Current mixes both in same file.

---

### 3.2 Documentation

| Document | Legacy | Current | Gap |
|----------|--------|---------|-----|
| **README.md** | ✅ 21KB in hr/, 15KB in learning, 6.6KB in payroll | ✅ 11KB in hr/ | ⚠️ MEDIUM |
| **SCHEMA_DIAGRAM.md** | ✅ Mermaid ERDs in hr/ | ❌ None | ⚠️ MEDIUM |
| **CIRCULAR_FKS.md** | ✅ In hr/ | ✅ In hr/ | ✅ Match |
| **SCHEMA_LOCKDOWN.md** | ❌ None | ✅ Present | ✅ Current Better |
| **CUSTOM_SQL_REGISTRY.json** | ❌ None | ✅ Present | ✅ Current Better |
| **ADR-001, ADR-002** | ❌ None | ✅ Present | ✅ Current Better |
| **Domain READMEs** | ✅ Each domain has own README | ❌ Only hr/ has README | ⚠️ MEDIUM |

**Current Advantage:** SCHEMA_LOCKDOWN.md, CUSTOM_SQL_REGISTRY.json, ADRs are superior to legacy
**Legacy Advantage:** Mermaid diagrams, per-domain READMEs

---

### 3.3 Zod Validation Richness

**File Size Comparison:**

| Domain | Legacy _zodShared.ts | Current _zodShared.ts | Ratio |
|--------|---------------------|----------------------|-------|
| **learning** | 29.8KB | N/A (training.ts has minimal) | 30x richer |
| **recruitment** | 14.5KB | Inline in recruitment.ts | 15x richer |
| **talent** | 10.7KB | Inline in talent.ts | 10x richer |
| **payroll** | 6.3KB | Inline in payroll.ts | 6x richer |
| **hr** | Combined in current | 3.7KB (with new refinements) | Mixed |

**Legacy Advantage:** Dedicated, comprehensive Zod schemas with:
- Wire format schemas for API input/output
- Extensive cross-field refinements
- Domain-specific business rule validations
- Reusable schema building blocks

**Current Status:** Minimal Zod — primarily branded IDs + 5 basic refinements

---

### 3.4 Relations

**Legacy:**
- Separate `_relations.generated.ts` (auto-generated)
- Separate `_relations.ts` (hand-curated)
- Larger, more granular (e.g., payroll 21KB, hr 33KB)

**Current:**
- Single `_relations.ts` combining all HR domains
- String-based relation catalog approach (manual)

**Gap:** ⚠️ **LOW** — Current approach is functional, legacy is more granular

---

## 4. Missing Tables Summary

### 4.1 High-Priority Missing Tables

**Benefits Domain (5 tables):**
- ❌ `benefits.benefits_providers`
- ❌ `benefits.benefit_plans` (*current has simplified version*)
- ❌ `benefits.benefit_enrollments`
- ❌ `benefits.benefit_dependent_coverages`
- ❌ `benefits.benefit_claims`

**Learning Domain (11 tables):**
- ❌ `learning.courses`
- ❌ `learning.course_modules`
- ❌ `learning.learning_paths`
- ❌ `learning.assessments`
- ❌ `learning.course_sessions`
- ❌ `learning.course_enrollments`
- ❌ `learning.learning_path_assignments`
- ❌ `learning.learning_path_progress`
- ❌ `learning.certification_awards`
- ❌ `learning.course_feedback`
- ❌ `learning.training_costs`

**Payroll Domain (5 tables):**
- ❌ `payroll.tax_brackets`
- ❌ `payroll.statutory_deductions`
- ❌ `payroll.payroll_adjustments`
- ❌ `payroll.payslips`
- ❌ `payroll.payment_distributions`

**Recruitment Domain (3 tables):**
- ❌ `recruitment.applicant_documents`
- ❌ `recruitment.interview_feedback`
- ❌ `recruitment.offer_letters`

**Total Missing:** 24 tables

---

### 4.2 Missing Enums

**Benefits:**
- `BenefitType`
- `EnrollmentStatus`
- `ClaimStatus`

**Learning:**
- `CourseType` (and likely more in the 388-byte _enums.ts)

**Payroll:**
- Additional deduction/earning type enums

---

## 5. Implementation Recommendations

### 5.1 Schema Separation Strategy

**Option A: Multi-Schema Migration (Matches Legacy)**

**Pros:**
- ✅ Clear domain boundaries
- ✅ Better ownership and team alignment
- ✅ Matches proven legacy pattern
- ✅ Easier to scale per-domain

**Cons:**
- ❌ MAJOR breaking change — requires full migration rewrite
- ❌ Cross-schema FK complexity
- ❌ Migration risk is HIGH
- ❌ Weeks of work

**Timeline:** 6-8 weeks

---

**Option B: Single-Schema Enhancement (Current + Additions)**

**Pros:**
- ✅ No breaking changes
- ✅ Can implement incrementally
- ✅ Lower risk
- ✅ Faster to deliver

**Cons:**
- ❌ Does not match legacy architecture
- ❌ Weaker domain boundaries
- ❌ Less scalable long-term

**Timeline:** 2-3 weeks

---

**Recommendation:** **Option B** for immediate needs, **Option A** for Phase 2 refactor

---

### 5.2 Incremental Implementation Plan (Option B)

**Phase 1: Benefits Domain (Week 1)**
- Create `benefits.ts` in current `hr/` directory
- Add 5 benefits tables to `hr` schema
- Add benefits enums to `_enums.ts`
- Update `_relations.ts`
- Add benefits Zod schemas to `_zodShared.ts` or inline

**Phase 2: Learning Domain Enhancement (Week 1-2)**
- Rename `training.ts` → `learning.ts`
- Add 11 learning tables to `hr` schema
- Add comprehensive Zod validations (leverage legacy 29.8KB patterns)
- Add learning enums
- Update relations

**Phase 3: Payroll Enhancement (Week 2)**
- Add 5 missing payroll tables to `payroll.ts`
- Add tax/statutory schemas
- Add Zod validations

**Phase 4: Recruitment Enhancement (Week 2-3)**
- Add 3 missing recruitment tables to `recruitment.ts`
- Add applicant document handling
- Add offer letter generation

**Phase 5: Documentation (Week 3)**
- Create SCHEMA_DIAGRAM.md with Mermaid ERDs
- Create per-domain README stubs (or consolidate into main README)
- Enhance existing documentation

**Phase 6: Subdirectory Reorganization (Optional — Week 3)**
- Consider splitting large files (e.g., `attendance.ts` with 10 tables) into `attendance/fundamentals/` and `attendance/operations/`
- Defer if not critical

---

### 5.3 Multi-Schema Migration Plan (Option A — Phase 2)

**Prerequisites:**
- Database backup strategy
- Rollback plan
- API/app layer migration coordination
- Full test coverage

**Steps:**
1. Create new pgSchema definitions (benefits, learning, payroll, recruitment, talent)
2. Generate new tables in new schemas
3. Data migration scripts (move data between schemas)
4. Update all imports across `api/`, `web/`, `db/` packages
5. Update RLS policies with new schema names
6. Regenerate all migrations
7. Test end-to-end

**Risk:** ⚠️ **VERY HIGH** — This is a MAJOR refactor

**Defer Until:** Post-MVP or when scaling demands require it

---

## 6. Conclusion

### Current System Strengths
✅ Consolidated schema is simpler for MVP
✅ Superior governance docs (SCHEMA_LOCKDOWN, CUSTOM_SQL_REGISTRY, ADRs)
✅ Clean domain file organization
✅ Effective soft-delete + tenant isolation patterns

### Legacy System Strengths
✅ Separate schemas provide stronger domain boundaries
✅ fundamentals/ + operations/ organization is conceptually clearer
✅ Richer Zod validations (especially learning: 29.8KB)
✅ More comprehensive table coverage (24 additional tables)
✅ Mermaid schema diagrams

### Recommended Action Plan
1. **Immediate (Weeks 1-3):** Implement missing tables in current `hr` schema (Option B)
2. **Post-MVP (Months 2-3):** Consider multi-schema migration if team size/scale demands it (Option A)
3. **Documentation:** Add SCHEMA_DIAGRAM.md with Mermaid ERDs
4. **Validation:** Enhance Zod schemas, especially for learning/benefits domains

---

**Next Steps:** Review with architecture team and prioritize which missing tables/domains are critical for upcoming milestones.
