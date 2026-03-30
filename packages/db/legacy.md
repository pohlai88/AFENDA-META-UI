## Honest Enterprise Architecture Assessment: Legacy vs Current

After deep-diving into both codebases and grounding this analysis in DDD, enterprise architecture patterns, and ERP best practices, I need to start with an important **correction**: the three documents previously created (LEGACY-GAP-ANALYSIS.md, LEGACY-BEST-PRACTICES.md, LEGACY-COMPARISON-SUMMARY.md) were written **without reading the actual current codebase** — they contain significant false negatives. Let me set the record straight.

---

## 1. The Current Codebase Is More Mature Than Previously Claimed

The prior analysis stated we're "missing" infrastructure layers. **That's wrong.** The current AFENDA-META-UI already has:

| Layer | Current AFENDA-META-UI | Legacy afenda-hybrid | Verdict |
|-------|----------------------|---------------------|---------|
| **Wire Format Schemas** | infra-utils/columns/wire/zodWire.ts — `nullableOptional()`, `dateStringSchema`, `timestamptzWireSchema`, `isoDateWireString()`, `parseUnknownToEpochMs()` | `_shared/zodWire.ts` — Same patterns | **Parity** — Current already has this |
| **Session Management** | infra-utils/session/setSessionContext.ts — **8 GUC params** (`tenant_id`, `user_id`, `actor_type`, `correlation_id`, `request_id`, `session_id`, `ip_address`, `user_agent`) | `_session/` — 2 params (`tenant_id`, `user_id`) | **Current is SUPERIOR** |
| **RLS Policies** | infra-utils/rls/tenant-policies.ts — `appUserRole` + `serviceRole` with per-operation policies + service bypass | `_rls/` — Similar pattern | **Parity** |
| **Seed Data** | infra-utils/seeds/ — 12 domain subdirectories + factories + scenarios + snapshot testing | `_seeds/` — Bootstrap data | **Current is SUPERIOR** |
| **Graph Validation** | graph-validation/ — FK catalog, health scoring, orphan detection, tenant isolation, index remediation | Not present | **Current only** |
| **Triggers** | triggers/ — `status-transitions.sql` | Custom SQL in migrations | **Parity** |
| **Maintenance** | maintenance/ — Partitioning, retention plans, status triggers | Not present | **Current only** |
| **Archival** | archival/ — R2 integration for long-term storage | Not present | **Current only** |
| **Truth Compiler** | truth-compiler/ — Business truth validation | Not present | **Current only** |
| **Meta-Types** | meta-types — 14 domain directories: schema, rbac, compiler, policy, audit, events, graph, mesh, workflow, platform | Not mentioned | **Current only** |

**Bottom line:** The current codebase has **richer infrastructure** than the legacy. The previous documents overstated the gap.

---

## 2. Where Legacy Genuinely Wins (Real Gaps)

Grounded in DDD Bounded Context principles and Enterprise Architecture modularity patterns:

### Gap A: Monolithic HR File — **Severity: High**

**DDD Principle Violated:** *Bounded Contexts*. Different subdomains (people identity, employment contracts, time management, payroll) are separate bounded contexts with different invariants, different change rates, and different domain experts.

**Current:** 1,398 lines in tables.ts — 48+ tables across 8+ subdomains mixed together.

**Legacy:** 6 separate subdirectories (`people/`, `employment/`, `time/`, `selfservice/`, `fundamentals/`, `operations/`) within `hr/`, plus 5 additional pgSchemas (`payroll`, `recruitment`, `talent`, `benefits`, `learning`).

**Enterprise Best Practice (Microsoft Azure Well-Architected, SAP Clean Core):** Large ERP modules decompose into subdomains with clear ownership. SAP uses "Business Objects" grouped by "Application Area." Oracle HCM uses "product families" (Core HR, Payroll, Recruiting, Talent, etc.) each with independent schemas.

**My opinion:** This is the **single highest-value change** to make. A 1,400-line file violates the Single Responsibility Principle and creates merge conflicts, cognitive overload, and ownership ambiguity. However, I'd argue **3 pgSchemas** (hr, payroll, recruitment) is sufficient for your current scale — not 6. Learning and Benefits can stay as submodules within `hr` until they grow enough to justify their own schema. **Don't over-split prematurely** — that's equally harmful per YAGNI.

### Gap B: No `_queries/` Layer — **Severity: Medium-High**

**Enterprise Pattern:** *Repository Pattern* (DDD). Domain queries should be encapsulated in purpose-named functions that speak the ubiquitous language: `getEmployeeWithFullProfile()`, not raw Drizzle queries scattered across API routes.

**Current:** API routes likely inline Drizzle queries. This works at small scale but creates:
- Copy-paste query drift (different endpoints query same data differently)
- No single place to optimize (N+1 problems hide across files)
- Harder to test (query logic tangled with HTTP handling)

**My opinion:** This layer matters most for **read operations with relations** (e.g., "get employee with department, position, manager, and pending leave"). Start with 3-5 critical queries, not a comprehensive layer. Per *Enterprise Architecture Patterns*: the Repository pattern is warranted when multiple consumers need the same data shape.

### Gap C: No `_services/` Layer — **Severity: Medium**

**Enterprise Pattern:** *Domain Services* (DDD). Cross-aggregate business logic that doesn't belong to a single entity lives in domain services.

**Example:** Recruitment lifecycle (Requisition → Application → Interview → Offer → Hired) involves state machine validation that spans multiple aggregates. Per DDD's *Aggregate Root* pattern, this cross-aggregate coordination belongs in a domain service, not scattered across API handlers.

**My opinion:** Don't build this speculatively. Build it **when you implement workflow enforcement** — which you may already be handling via the Truth Compiler and Workflow Engine in meta-types. Check if workflow already covers this use case before creating a parallel `_services/` layer.

### Gap D: Missing Governance Docs — **Severity: Medium**

**What's absent:** SCHEMA_LOCKDOWN.md, CIRCULAR_FKS.md, CUSTOM_SQL_REGISTRY.json, ADRs, domain READMEs.

**Enterprise Best Practice (TOGAF, C4 Model):** Architecture is documented in living documents that co-locate with the code they describe. Architecture Decision Records (ADRs) are widely accepted as best practice (ThoughtWorks Tech Radar: "Adopt").

**My opinion:** This is **low effort, high value**. A SCHEMA_LOCKDOWN.md takes 30 minutes to write and prevents weeks of debugging when someone modifies RLS policies via Drizzle instead of migrations. ADRs are cheap insurance. Prioritize these 3 docs:
1. **SCHEMA_LOCKDOWN.md** — Schema evolution rules (how to add tables, columns, enums, RLS changes)
2. **HR domain README.md** — Table catalog with business context
3. **One ADR** — Document your HR schema design decision (why single pgSchema vs multi)

---

## 3. Where Current Is Already Superior (Things NOT to Copy)

### Advantage A: Business Truth Architecture

The legacy has **no equivalent** to your Truth Compiler, Business Truth Graph, ERP Event Mesh, or Workflow Engine. This is architecturally significant — it's your platform's differentiator.

Per *Enterprise Architecture Patterns*: the Business Truth Graph pattern (metadata → behavior → policy) is a form of **Strategic Design** that the legacy completely lacks. The legacy is a traditional schema-first application; you're building a **metadata-driven platform**. These are different architectural paradigms.

**My opinion:** Don't regress to the legacy's "infrastructure layers" approach if it conflicts with your metadata-driven architecture. The `_services/recruitment/applicationGuards.ts` pattern from legacy is procedural business logic. Your workflow + `policy/` approach is **declarative** — which is the modern enterprise pattern (Salesforce Flow, SAP BTP, Oracle Fusion Cloud all moved to declarative workflow).

### Advantage B: Session Context Depth

Legacy: 2 GUC params (`tenant_id`, `user_id`)
Current: 8 GUC params (adds `actor_type`, `correlation_id`, `request_id`, `session_id`, `ip_address`, `user_agent`)

This supports requirements that the legacy can't:
- **Audit trails** with correlation IDs (traceability across microservices)
- **Service principal** vs user vs system actor distinction (fine-grained auth)
- **Security logging** with IP/user-agent (OWASP Top 10 compliance)

**Enterprise Best Practice (OWASP ASVS v4, SOC 2):** Session context should include correlation IDs and actor type for audit compliance.

### Advantage C: Operational Maturity

`graph-validation/`, `maintenance/`, `archival/` — these represent **Day 2 operations** readiness. The legacy has none of this. In enterprise deployments, Day 2 ops (monitoring, data lifecycle, archival) matter more than Day 1 schema design.

---

## 4. Specific Code Quality Observations

### 4a. Index Quality — **Needs Audit**

Looking at tables.ts, I see indexes like:

```typescript
index("interviews_application_idx").on(table.applicationId),
```

This is **not tenant-leading**. Per PostgreSQL best practice for multi-tenant (Citus Data, AWS Multi-Tenant SaaS guidance): indexes on tenant-scoped tables should lead with `tenantId` because the RLS policy always filters by tenant first. The planner can use `(tenantId, applicationId)` for both tenant-filtered and full scans, but `(applicationId)` alone forces a full index scan when RLS adds the tenant filter.

**Recommendation:** Audit all indexes. Pattern should be:
```typescript
index("interviews_tenant_application_idx").on(table.tenantId, table.applicationId),
```

### 4b. Unique Indexes — **Missing Soft-Delete Awareness**

Current:
```typescript
uniqueIndex("departments_tenant_code_unique").on(table.tenantId, table.departmentCode),
```

Missing `WHERE deletedAt IS NULL`. This means soft-deleted records block re-creation with the same code. This is a real production bug waiting to happen.

### 4c. CHECK Constraints — **Largely Absent**

The current HR tables lack CHECK constraints for obvious business rules (hire date >= 1900, end date >= start date, salary bounds). The Zod schemas may cover this at the API layer, but per **defense in depth** principle (OWASP), business rules should also be enforced at the database layer. Background jobs, data migrations, and manual SQL bypass Zod entirely.

### 4d. Foreign Key Design — **Inconsistent Tenant Scoping**

Current FK pattern:
```typescript
foreignKey({ columns: [table.tenantId], foreignColumns: [tenants.tenantId] }),
foreignKey({ columns: [table.applicationId], foreignColumns: [jobApplications.id] }),
```

The `applicationId` FK doesn't include `tenantId` in the composite key. This means the database can't prevent a bug where Employee in Tenant A references an Application in Tenant B. The legacy uses composite FKs: `(tenantId, applicationId)` → `(tenantId, applicationId)`.

**This is a multi-tenancy data integrity risk.** Per AWS SaaS Factory guidance: "Use composite keys that include the tenant identifier to enforce isolation at the database constraint level."

---

## 5. Actionable Recommendations (Prioritized)

Grounded in **impact × effort** and enterprise architecture maturity models:

### Tier 1: Do Now (High Impact, Low-Medium Effort)

1. **Split tables.ts into subdirectories** — Create `hr/people/`, `hr/employment/`, `hr/time/`, `hr/operations/`, `hr/recruitment/`, `hr/payroll/`. One file per table. This is a mechanical refactor (rename + move) with no logic changes.

2. **Add composite FKs** — Add `tenantId` to all cross-table FKs. This closes a real data integrity gap.

3. **Fix indexes to be tenant-leading** — Mechanical change: prepend `table.tenantId` to all indexes.

4. **Add `WHERE deletedAt IS NULL`** to all unique indexes on soft-delete tables.

5. **Write SCHEMA_LOCKDOWN.md** — 30-minute document that prevents costly mistakes.

### Tier 2: Do Next Sprint (High Impact, Medium Effort)

6. **Create `_queries/` layer** — Start with 5 critical read queries used by multiple API routes.

7. **Add CHECK constraints** — Mirror your Zod refinements as database CHECK constraints for defense in depth.

8. **Write HR domain README.md** — Table catalog, diagram, business context.

9. **Create one ADR** — Document the decision: "Why HR uses a single pgSchema today" with migration criteria for when to split.

### Tier 3: Plan for Later (Medium Impact, High Effort)

10. **Split HR into separate pgSchemas** — Only when payroll or recruitment reaches 10+ tables each and has a dedicated team/module.

11. **Create `_services/` layer** — Only when you identify cross-aggregate business logic not covered by the Workflow Engine.

### Tier 4: Do NOT Copy from Legacy

12. **Don't copy the `_services/` pattern blindly** — Your Truth Compiler + Workflow engine may already handle this declaratively. Procedural guards are a step backward from your architecture's direction.

13. **Don't copy `@db/*` path aliases** — Your subpath exports (`@afenda/db/schema/hr`) already solve this more cleanly via the package system.

14. **Don't create CUSTOM_SQL_REGISTRY.json yet** — You don't have enough custom SQL to justify a registry. This is governance overhead without current value.

---

## 6. Architecture Scorecard

| Dimension | Current AFENDA-META-UI | Legacy afenda-hybrid | Enterprise Best Practice |
|-----------|----------------------|---------------------|------------------------|
| **Multi-Tenant Isolation** | ⭐⭐⭐⭐ (RLS + session, but FKs not composite) | ⭐⭐⭐⭐ (RLS + session, but simpler context) | Composite FKs + RLS + session context |
| **Schema Modularity** | ⭐⭐ (9 domains but monolithic files within) | ⭐⭐⭐⭐⭐ (6 HRM subdomains with subdirectories) | DDD Bounded Contexts → separate schemas |
| **Type Safety** | ⭐⭐⭐⭐⭐ (Drizzle + branded IDs + Zod + meta-types) | ⭐⭐⭐⭐⭐ (Drizzle + branded IDs + Zod) | TypeScript-first with branded types |
| **Defense in Depth** | ⭐⭐ (Zod at API, no CHECK constraints) | ⭐⭐⭐⭐ (Zod + CHECK + composite FKs) | Zod + CHECK + composite FKs + RLS |
| **Day 2 Ops** | ⭐⭐⭐⭐⭐ (graph-validation, maintenance, archival) | ⭐ (tests only) | Monitoring + archival + retention + health scoring |
| **Metadata Architecture** | ⭐⭐⭐⭐⭐ (Truth Graph, Event Mesh, Workflow Engine) | ⭐ (standard schema-first) | Declarative metadata-driven |
| **Governance Docs** | ⭐ (none) | ⭐⭐⭐⭐ (lockdown, circular FKs, ADRs) | Living docs co-located with code |
| **Query Reuse** | ⭐⭐ (inline queries) | ⭐⭐⭐⭐ (_queries/ layer) | Repository pattern for shared queries |
| **Observability** | ⭐⭐⭐⭐ (8-param session, correlation IDs) | ⭐⭐ (2-param session) | Correlation IDs + actor type + structured logging |

**Overall:** Current = **stronger platform architecture**, Legacy = **stronger schema discipline**.
The ideal target takes the current platform + the legacy's schema modularity and data integrity patterns.

---

## 7. Key Takeaway

The legacy isn't "better" — it's **differently mature**. It invested heavily in **schema organization and data integrity patterns** (subdirectories, CHECK constraints, composite FKs, governance docs). The current codebase invested heavily in **platform architecture** (metadata engine, truth compiler, graph validation, operational tooling, rich session context).

The highest-ROI path is **not "adopt legacy patterns wholesale"** but rather: **cherry-pick the legacy's schema discipline** (file splitting, CHECK constraints, composite FKs, tenant-leading indexes, governance docs) **into the current platform's superior architecture**. Specifically items 1-9 from my Tier 1 and Tier 2 recommendations above.

https://github.com/pohlai88/afenda-hybrid/tree/4c66d3f487aac21698ae1d5e82ce12985a3f1cc0/packages/db/src/schema-hrm
