# Legacy HRM Schema Gap Analysis — Executive Summary

**Analysis Date:** March 29, 2026
**Comparison:** [afenda-hybrid@4c66d3f](https://github.com/pohlai88/afenda-hybrid/tree/4c66d3f487aac21698ae1d5e82ce12985a3f1cc0/packages/db/src/schema-hrm) vs AFENDA-META-UI

---

## 🎯 Key Findings

### 1. MAJOR Architectural Difference

| Aspect | Legacy | Current | Impact |
|--------|--------|---------|--------|
| **pgSchema Strategy** | 6 separate schemas | 1 consolidated schema | ⚠️ **CRITICAL** |
| **Schema Names** | `hr`, `payroll`, `benefits`, `learning`, `recruitment`, `talent` | `hr` (all domains) | Breaking change to align |

**Decision Point:** Continue with single schema (fast) or migrate to multi-schema (legacy pattern, weeks of work)?

---

### 2. Missing Domains & Tables

| Domain | Tables Missing | Priority | Estimated Effort |
|--------|---------------|----------|------------------|
| **Benefits** | 5 tables (providers, enrollments, dependents, claims) | 🔴 High | 3-4 days |
| **Learning** | 11 tables (vs current 3 "training" tables) | 🔴 High | 5-6 days |
| **Payroll** | 5 tables (tax, statutory, adjustments, payslips, payments) | 🟡 Medium | 3-4 days |
| **Recruitment** | 3 tables (documents, feedback, offers) | 🟡 Medium | 2-3 days |

**Total Missing:** 24 tables
**Total Effort:** 2-3 weeks (incremental, low-risk)

---

### 3. Missing Core Features

#### Benefits Domain ❌
- ✅ Current: Basic `hr.benefit_plans` + `hr.employee_benefits`
- ❌ Missing: Benefit providers, dependent coverage, claims processing
- **Business Impact:** Cannot handle dependent benefits or insurance claims

#### Learning Domain ⚠️
- ✅ Current: Simplified 3-table "training" (programs, attendance, certs)
- ❌ Missing: Course modules, learning paths, assessments, enrollments, progress tracking, feedback, cost tracking
- **Business Impact:** No structured LMS, no career path management

#### Payroll Domain ⚠️
- ✅ Current: Basic 5-table payroll (components, periods, entries, lines)
- ❌ Missing: Tax brackets, statutory deductions, adjustments, payslips, payment distributions
- **Business Impact:** Cannot handle tax compliance or payment tracking

#### Recruitment Domain ⚠️
- ✅ Current: 4-table recruitment pipeline
- ❌ Missing: Applicant documents, interview feedback, offer letters
- **Business Impact:** No document management or offer generation

---

### 4. Structural Differences

| Feature | Legacy | Current | Gap |
|---------|--------|---------|-----|
| **Subdirectory Organization** | `fundamentals/` + `operations/` | Flat domain files | ⚠️ Medium |
| **Schema Diagrams** | ✅ SCHEMA_DIAGRAM.md (Mermaid) | ❌ None | ⚠️ Medium |
| **Per-Domain READMEs** | ✅ Each domain documented | ❌ Only hr/ has README | ⚠️ Low |
| **Zod Validation Richness** | ✅ Extensive (29KB in learning) | ❌ Minimal | ⚠️ Medium |
| **Domain Helpers** | ✅ `_shared/` per domain | ❌ None | ⚠️ Low |

---

### 5. Current System Strengths ✅

**We're doing better than legacy in these areas:**
- ✅ **SCHEMA_LOCKDOWN.md** — Governance doc (legacy has none)
- ✅ **CUSTOM_SQL_REGISTRY.json** — Audit trail for custom SQL (legacy has none)
- ✅ **ADR-001, ADR-002** — Architecture decision records (legacy has none)
- ✅ **Composite FKs** — Proper tenant isolation (legacy inconsistent)
- ✅ **Soft-delete partial indexes** — Performance optimization (legacy basic)

---

## 📋 Recommendations

### Option A: Incremental Enhancement (RECOMMENDED)
**Timeline:** 2-3 weeks
**Risk:** Low
**Approach:** Add 24 missing tables to existing `hr` schema

**Pros:**
- ✅ No breaking changes
- ✅ Can ship incrementally (Benefits → Learning → Payroll → Recruitment)
- ✅ Low migration risk
- ✅ Fast time to value

**Cons:**
- ❌ Does not match legacy multi-schema architecture
- ❌ Weaker domain boundaries at database level

**Recommended Sequence:**
1. **Week 1:** Benefits domain (5 tables) + Learning enhancement (11 tables)
2. **Week 2:** Payroll enhancement (5 tables) + Recruitment enhancement (3 tables)
3. **Week 3:** Documentation (SCHEMA_DIAGRAM.md), testing, polish

---

### Option B: Multi-Schema Migration (DEFER)
**Timeline:** 6-8 weeks
**Risk:** HIGH
**Approach:** Restructure to match legacy (6 separate schemas)

**Pros:**
- ✅ Matches proven legacy pattern
- ✅ Stronger domain boundaries
- ✅ Better long-term scalability

**Cons:**
- ❌ MAJOR breaking change across all packages
- ❌ Complex cross-schema FK migrations
- ❌ High risk of data issues
- ❌ Requires coordinated API/app layer changes

**Recommendation:** Defer to Phase 2 (post-MVP) or when scale demands it

---

## 🚀 Immediate Action Items

### This Sprint (Next 2-3 Weeks)
1. **Review** [IMPLEMENTATION-PROPOSAL.md](IMPLEMENTATION-PROPOSAL.md) with team
2. **Prioritize** which domains are MVP-critical (Benefits? Learning?)
3. **Allocate** 1-2 developers for implementation
4. **Start** with highest-priority domain (recommend: Benefits → Learning)

### Documentation Tasks
- [ ] Create **SCHEMA_DIAGRAM.md** with Mermaid ERDs (2-3 hours)
- [ ] Create **ADR-003** documenting legacy feature adoption rationale (1 hour)
- [ ] Update **README.md** with new table catalog as features ship

---

## 📊 Impact Assessment

### Business Value
| Feature | Current | With Change | Value |
|---------|---------|-------------|-------|
| **Dependent Benefits** | ❌ Not supported | ✅ Full coverage | 🔴 High |
| **Insurance Claims** | ❌ Not supported | ✅ Full workflow | 🔴 High |
| **Learning Paths** | ❌ Not supported | ✅ Career mgmt | 🔴 High |
| **Course Enrollments** | ❌ Not supported | ✅ Full LMS | 🔴 High |
| **Tax Compliance** | ⚠️ Manual | ✅ Automated | 🟡 Medium |
| **Payslip Generation** | ❌ Not supported | ✅ Automated | 🟡 Medium |
| **Offer Letters** | ❌ Not supported | ✅ Automated | 🟡 Medium |

### Technical Debt
- **Current System:** Simple but incomplete (45 tables)
- **Legacy System:** Comprehensive but complex (70+ tables)
- **Proposed:** Best of both — comprehensive features, single schema simplicity

---

## 📄 Related Documents

1. **[LEGACY-COMPARISON-ANALYSIS.md](LEGACY-COMPARISON-ANALYSIS.md)** — Full detailed comparison (20+ pages)
2. **[IMPLEMENTATION-PROPOSAL.md](IMPLEMENTATION-PROPOSAL.md)** — Detailed implementation plan with code samples
3. **[SCHEMA_LOCKDOWN.md](SCHEMA_LOCKDOWN.md)** — Current governance conventions
4. **[CIRCULAR_FKS.md](CIRCULAR_FKS.md)** — Circular FK documentation
5. **[ADR-001-domain-file-split.md](ADR-001-domain-file-split.md)** — Table splitting rationale
6. **[ADR-002-circular-fk-handling.md](ADR-002-circular-fk-handling.md)** — FK handling pattern

---

## 🤔 Decision Required

**Question for Product/Architecture Team:**

> "Should we invest 2-3 weeks to add the 24 missing tables from the legacy system (Benefits, Learning enhancements, Payroll enhancements, Recruitment enhancements) to unlock dependent benefits, full LMS, tax compliance, and offer letter automation?"

**Option 1 (Recommended):** ✅ Yes — Implement incrementally in existing `hr` schema (2-3 weeks, low risk)
**Option 2:** ⏸️ Defer — Focus on other priorities this quarter, revisit in Q3
**Option 3:** 🔄 Multi-Schema First — Restructure to match legacy before adding features (6-8 weeks, high risk)

---

**Next Meeting Agenda Items:**
1. Review missing domain priorities
2. Assess MVP vs post-MVP feature classification
3. Developer allocation & sprint planning
4. Risk acceptance for incremental approach

---

**Contact:** @database-team or @architecture for questions
