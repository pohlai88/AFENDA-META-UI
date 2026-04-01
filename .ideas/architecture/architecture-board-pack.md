# AFENDA Architecture Board Pack

**Version:** 3.3 (aligned with `architecture.md` Hardened v3.3)

## Purpose

This document is the board-level companion to [`architecture.md`](./architecture.md). It summarizes architecture decisions, control ownership, and go/no-go criteria for CTO, principal engineering, security, audit, and operations stakeholders.

**Alignment:** This pack is maintained in lockstep with the normative architecture document. Any change to `architecture.md` that affects controls, precedence, terminology, or evidence must be reflected here in the same release cycle.

---

## Normative terminology (summary)

The architecture document defines these terms; they are binding in reviews and contracts:

| Term                | Meaning                                                                             |
| ------------------- | ----------------------------------------------------------------------------------- |
| **mutation**        | Any state-changing operation                                                        |
| **economic effect** | Any mutation with financial or quantity impact                                      |
| **projection**      | Computed current-state view derived from memory and rules                           |
| **invariant**       | Rule evaluated and classified for a mutation or projection                          |
| **authoritative**   | Eligible for financial, operational, or compliance reliance                         |
| **memory**          | Append-oriented record of mutations and context                                     |
| **doctrine**        | Source of authority for why a rule exists (`doctrineSpec`); not structural identity |
| **resolution**      | Governed remediation path for resolvable failures (`resolutionSpec`)                |

Full definitions: see **Terminology (Normative)** in `architecture.md`. Do not redefine these terms in ADRs or runbooks without an architecture revision.

---

## A) Decision Record Summary

| ID      | Decision                                                                   | Why It Exists                                   | Mandatory Outcome                                                                                                                                                    | Owner                               |
| ------- | -------------------------------------------------------------------------- | ----------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------- |
| ADR-A01 | Canonical identity root (`identitySpec`)                                   | Prevent semantic drift across domains           | One meaning per business concept                                                                                                                                     | Architecture                        |
| ADR-A02 | Identity lifecycle operations are explicit (merge/split/alias/supersede)   | Resolve real-world ambiguity safely             | Every lifecycle transition is auditable and compensable                                                                                                              | Domain + Architecture               |
| ADR-A03 | Precedence order for conflicts                                             | Avoid undefined behavior in rule collisions     | Higher-precedence rules win; exceptions visible, not suppressed                                                                                                      | Security + Architecture             |
| ADR-A04 | Deterministic generation and version governance                            | Prevent contract/schema drift                   | Reproducible artifacts with compatibility class                                                                                                                      | Platform                            |
| ADR-A05 | Invariants as executable controls                                          | Turn policy into enforcement                    | Scope, timing, severity, failure policy, remediation owner are declared                                                                                              | Domain                              |
| ADR-A06 | Temporal memory with split future (`futureCommitted` vs `futurePredicted`) | Separate obligation from forecast               | No forecast treated as commitment without promotion flow                                                                                                             | Domain + Analytics                  |
| ADR-A07 | Command idempotency and concurrency guarantees                             | Prevent duplicate economic effects              | Retry-safe mutation semantics at economic-effect level                                                                                                               | Runtime                             |
| ADR-A08 | Multi-tenant trust boundaries                                              | Contain blast radius and enforce isolation      | Tenant context mandatory in all request paths                                                                                                                        | Security + Platform                 |
| ADR-A09 | Replayability as tested capability                                         | Recover from projection corruption              | Deterministic replay and checksum verification                                                                                                                       | Operations                          |
| ADR-A10 | Risk-first domain expansion                                                | Avoid breadth before control maturity           | Stage gates before expanding scope                                                                                                                                   | CTO + Architecture                  |
| ADR-A11 | Economic conservation, classification, valuation, and traceability         | Prevent value corruption and ambiguity          | Economic effects conserved, classed, valued under policy, and traceable                                                                                              | Domain + Finance Eng                |
| ADR-A12 | Invariant taxonomy with authority tiers                                    | Standardize invariant governance                | Every invariant declares class and authority source                                                                                                                  | Architecture + Security             |
| ADR-A13 | Supersession lineage is mandatory                                          | Prove meaning changes over time                 | No silent replacement of asserted meaning; mutation classification recorded                                                                                          | Runtime + Audit                     |
| ADR-A14 | Search and predict contracts are explicit                                  | Avoid hidden behavior and policy drift          | Freshness and boundary contracts enforced and evidenced                                                                                                              | Platform + Analytics                |
| ADR-A15 | Accounting truth contract + financial authority boundary                   | Define when outputs may be relied upon          | Authoritative projections only when critical invariants pass and provenance clear                                                                                    | Domain + Finance Eng                |
| ADR-A16 | Regulatory invariant instantiation per active financial domain             | Classified rules are not enough                 | Minimum active set, timing, failure policy, and evidence per domain                                                                                                  | Architecture + Compliance           |
| ADR-A17 | Economic flow, reversal, correction, and partial-state integrity           | Valid transitions and correction semantics      | No invalid flows; reversals and partials reconcilable without erasing history                                                                                        | Domain + Runtime                    |
| ADR-A18 | Legal erasure without destroying economic truth or replay validity         | Meet privacy law without breaking audit         | Anonymization preserves reconstructability; erasure emits governed memory                                                                                            | Platform + Compliance               |
| ADR-A19 | Regulatory doctrine layer (declared truth authority)                       | “Regulatory” without visible authority is weak  | `doctrineSpec`; per §8.5B–8.5F structure; catalog; per-invariant binding; UI/audit/projection visibility; traceability doctrine → invariant → execution → projection | Architecture + Compliance + Product |
| ADR-A20 | Resolution layer (structured remediation for resolvable failures)          | Explanation without operability blocks adoption | `resolutionSpec`; resolvable failures return resolution contract; §10.4–10.8; no bypass of enforcement or isolation                                                  | Architecture + Product + Domain     |

---

## B) Control Matrix (Design → Enforcement → Evidence)

| Control Domain               | Control Statement                                                                                                    | Enforcement Surface                                  | Evidence Artifact                                             | Gate Type               |
| ---------------------------- | -------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------- | ------------------------------------------------------------- | ----------------------- |
| Identity                     | No parallel semantic identity definitions                                                                            | CI semantic lint + review gate                       | CI report + ADR reference                                     | Hard fail               |
| Identity Lifecycle           | Merge/split/alias/supersede require authority and reason                                                             | Command admission + policy checks                    | Audit event with reason code                                  | Hard fail               |
| Precedence                   | Conflict resolution follows declared order; exceptions visible                                                       | Runtime policy engine                                | Decision trace + exception classification                     | Hard fail               |
| Contracts                    | Generated contracts are deterministic and versioned                                                                  | CI generation diff and hash checks                   | Build artifact hashes                                         | Hard fail               |
| Compatibility                | Breaking changes include migration/rollback plan                                                                     | Release checklist + CI policy check                  | Change classification record                                  | Hard fail               |
| Invariants                   | Critical invariants default to block where baseline requires                                                         | Runtime invariant engine                             | Violation logs + blocked command traces                       | Hard fail               |
| Invariant Authority          | Every invariant declares authority tier                                                                              | CI schema checks + policy compiler                   | Invariant catalog report                                      | Hard fail               |
| Accounting Truth Contract    | Authoritative financial projections only when critical invariants pass                                               | CI truth-contract tests + runtime gates              | Invariant status snapshot + projection attest                 | Hard fail               |
| Economic Conservation        | Material effects conserved, classified, valued, traceable                                                            | Runtime economic invariant checks                    | Reconciliation and conservation reports                       | Hard fail               |
| Recognition/Measurement      | Recognition, conversion, rounding, valuation rules explicit                                                          | Runtime policy checks + CI fixtures                  | Test evidence and conversion audit logs                       | Hard fail               |
| Reversal/Correction/Partial  | Reversals, compensating adjustments, partial states preserve lineage                                                 | Command + reconciliation pipeline                    | Linkage reports + remainder correctness                       | Hard fail               |
| Idempotency                  | External commands are retry-safe at economic-effect level                                                            | Runtime dedupe + key window enforcement              | Dedupe ledger entries                                         | Hard fail               |
| Concurrency                  | Conflict resolution is deterministic                                                                                 | Version checks/lock policy                           | Conflict metrics + retry traces                               | Hard fail               |
| Supersession Lineage         | Meaning-changing updates preserve lineage and mutation class                                                         | Mutation pipeline guard + audit writer               | Lineage graph + supersession classification                   | Hard fail               |
| Tenant Isolation             | No cross-tenant data leakage                                                                                         | Context propagation + query guardrails               | Isolation regression tests                                    | Hard fail               |
| Operator Access              | Elevated actions are bounded and attributable                                                                        | JIT elevation + time-box policies                    | Privileged session trail                                      | Hard fail               |
| Memory Governance            | Retention/deletion comply with legal + tenant policy                                                                 | Policy engine + scheduled enforcers                  | Retention reports + deletion proofs                           | Hard fail               |
| Search                       | Tenant scope, explainability, freshness contracts                                                                    | Search gateway + index policies                      | Query audits + freshness metrics                              | Hard fail               |
| Predict                      | Advisory default; promotion policy-gated; cannot weaken platform/regulatory rules                                    | Policy-gated automation path                         | Promotion records + threshold config                          | Hard fail               |
| Financial Authority Boundary | Non-authoritative when truth contract, valuation, or lineage fails                                                   | Runtime + API response classification                | Provenance + invariant status export                          | Hard fail               |
| Regulatory Instantiation     | Minimum active regulatory invariant set per financial domain                                                         | CI catalog + runtime enforcement                     | Domain evidence bundle                                        | Hard fail               |
| Regulatory Doctrine          | Declared doctrine sets; each regulatory invariant has doctrine binding; authoritative outputs carry doctrine context | Doctrine catalog CI + API/UI metadata gates          | Doctrine manifest + audit bundle + projection doctrine fields | Hard fail               |
| Doctrine Traceability        | Clause-level mapping where available; no generic “IFRS violation” when specific standard exists                      | Failure surfaces attach doctrine reference per §8.5D | Doctrine mapping export + invariant catalog                   | Hard fail               |
| Resolution Contract          | Resolvable failures return structured remediation per `resolutionSpec`                                               | Runtime resolution contract on resolvable class      | Remediation logs + resolution evidence                        | Hard fail               |
| Legal Erasure / Memory       | Erasure preserves economic reconstructability and replay validity                                                    | Governed erasure commands + replay fixtures          | Erasure audit trail + replay checksum attest                  | Hard fail               |
| Replayability                | Critical projections replay-testable                                                                                 | Scheduled replay drills                              | Replay checksums + drill reports                              | Hard fail               |
| Reliability                  | SLO targets measured and actionable                                                                                  | Observability stack + alerts                         | SLO dashboard and incident history                            | Soft → hard after grace |

---

## C) Acceptance Criteria for Production Readiness

All criteria must pass before broad rollout.

1. **Semantic correctness**
   - Identity uniqueness checks pass.
   - Lifecycle transitions validated end-to-end.

2. **Economic correctness**
   - No duplicate settlement/allocation under retries (economic-effect level).
   - Reconciliation invariants pass on seeded and replayed data.
   - Recognition, measurement, classification, and valuation invariants pass for governed cases.
   - Reversal, correction, and partial-state chains reconcile with explicit remainder and lineage.

3. **Isolation and security**
   - Tenant isolation regression suite passes.
   - Privileged action attribution coverage is complete.

4. **Operational resilience**
   - Replay drill RTO meets target.
   - Projection rebuild checksums match source-of-truth expectations.

5. **Governance readiness**
   - All breaking changes classified and approved.
   - Deprecation windows and rollback plans documented.
   - Invariant catalog includes class and authority source for all critical invariants.
   - Normative terminology used consistently in enforcement artifacts and dashboards.
   - Doctrine catalog exists; tenant/deployment doctrine sets declared; regulatory invariants include doctrine binding per `architecture.md` §8.5B–8.5F.
   - Resolution mapping completeness tests pass for resolvable invariant classes in scope; structured remediation present where architecture requires it (`architecture.md` §10.4–10.8).

6. **Financial authority**
   - No “authoritative” financial projection is emitted without passing accounting truth contract gates and declaring provenance, invariant status, and **governing doctrine context** where required by `architecture.md` §10.9 and §8.5B–8.5F.

---

## D) RACI Snapshot

| Area                                     | Responsible                         | Accountable      | Consulted                    | Informed    |
| ---------------------------------------- | ----------------------------------- | ---------------- | ---------------------------- | ----------- |
| Canonical semantics                      | Architecture                        | CTO              | Domain leads                 | Engineering |
| Normative terminology                    | Architecture                        | CTO              | Domain, Compliance           | Engineering |
| Invariant taxonomy/authority             | Architecture + Domain               | CTO              | Security, Compliance         | Engineering |
| Accounting truth / authority             | Domain + Finance Eng                | CTO/CFO delegate | Architecture, Compliance     | Engineering |
| Regulatory doctrine (catalog, UI, audit) | Architecture + Compliance + Product | CTO              | Domain, Finance Eng          | Engineering |
| Resolution contracts / remediation UX    | Architecture + Product + Domain     | CTO              | Compliance, Finance Eng      | Engineering |
| Runtime controls                         | Runtime team                        | VP/Head of Eng   | Security, Architecture       | Engineering |
| Tenant/security policy                   | Security + Platform                 | CISO/CTO         | Architecture                 | Engineering |
| Data governance                          | Platform + Compliance               | CISO/Legal owner | Security, Architecture       | Engineering |
| Economic control model                   | Domain + Finance Eng                | CTO/CFO delegate | Architecture, Compliance     | Engineering |
| Reliability/SLOs                         | Operations/SRE                      | VP/Head of Eng   | Runtime, Platform            | Engineering |
| Predict governance                       | Analytics                           | Product/CTO      | Domain, Security             | Engineering |
| Search contract/freshness                | Platform                            | VP/Head of Eng   | Runtime, Security, Analytics | Engineering |
| Supersession lineage assurance           | Runtime + Audit                     | CTO              | Architecture, Compliance     | Engineering |

---

## E) Minimum KPI/SLO Board View

| Metric                             | Target                                  | Breach Trigger                                                                     |
| ---------------------------------- | --------------------------------------- | ---------------------------------------------------------------------------------- |
| Command availability               | >= 99.9% monthly                        | Below target for any calendar month                                                |
| Critical invariant latency         | p95 within budget                       | Budget exceeded for 3 consecutive days                                             |
| Async invariant freshness          | <= 5 minutes (high severity classes)    | > 5 minutes sustained over defined window                                          |
| Replay RTO (critical projection)   | <= 60 minutes                           | Drill or incident exceeds target                                                   |
| Tenant isolation incidents         | 0                                       | Any confirmed cross-tenant leakage                                                 |
| Unattributed privileged actions    | 0                                       | Any privileged action without attribution trail                                    |
| Conservation breaches              | 0                                       | Any confirmed duplicate or orphan economic effect                                  |
| Supersession lineage coverage      | 100% (meaning-changing mutations)       | Any mutation without lineage metadata                                              |
| Search freshness SLO adherence     | >= 99% within class target              | Below target for 2 consecutive windows                                             |
| Authoritative projection integrity | 0 misclassified outputs                 | Authoritative label without truth-contract pass                                    |
| Doctrine binding completeness      | 100% for regulatory invariants in scope | Invariant missing doctrine source or authoritative output missing doctrine context |
| Resolution contract completeness   | 100% for resolvable classes in scope    | Resolvable failure without structured resolution metadata                          |

---

## F) Top Residual Risks and Mitigations

| Risk                                          | Impact                                         | Mitigation                                                  | Owner                |
| --------------------------------------------- | ---------------------------------------------- | ----------------------------------------------------------- | -------------------- |
| Over-design slows delivery                    | Missed milestones                              | Risk-first vertical stage gates                             | CTO + Architecture   |
| Spec complexity introduces change friction    | Slow domain onboarding                         | Compatibility classes and templates                         | Architecture         |
| Terminology drift across teams                | Inconsistent enforcement                       | Single glossary; lint review artifacts for terms            | Architecture         |
| Async invariant backlog during traffic spikes | Delayed trust signals                          | Priority queues, backpressure, SLA alerts                   | Runtime              |
| Search index staleness under heavy write load | Operator confusion                             | Freshness contracts + stale-result labeling                 | Platform             |
| Policy misconfiguration                       | Security/compliance exposure                   | Safe defaults + policy lint + approval workflow             | Security             |
| Invariant authority misclassification         | Governance and audit gaps                      | Authority-tier checks in invariant catalog gate             | Architecture         |
| Incomplete supersession lineage               | Weak historical explainability                 | Mutation pipeline hard-fail on missing lineage              | Runtime + Audit      |
| Financial authority mislabeling               | Wrong reliance on projections                  | Hard gate on §10.9 conditions + provenance exports          | Domain + Platform    |
| Doctrine invisibility                         | Users/auditors see “blocked” without authority | Doctrine on blockers; authoritative metadata; audit exports | Compliance + Product |

---

## G) Immediate Next 30 Days

1. Freeze and ratify ADR-A01 through ADR-A20 against `architecture.md` v3.3.
2. Implement hard-fail CI gates for identity, compatibility, invariant authority, doctrine catalog completeness, accounting truth contract smoke tests, and isolation.
3. Wire idempotency and concurrency control for one critical command family (economic-effect level).
4. Implement economic conservation, supersession-lineage, and financial-authority classification runtime guards.
5. Run first replay drill and publish checksum + RTO evidence.
6. Publish first board KPI baseline and breach playbook (conservation, lineage, authoritative projection integrity, doctrine binding).

---

## H) Decision for Board

**Recommended decision:** Approve conditional production advancement for one end-to-end vertical flow, with expansion contingent on passing all control gates and replay/SLO evidence for two consecutive review cycles. Evidence must use normative terminology and demonstrate ADR-A15 (accounting truth / financial authority), ADR-A16 (regulatory instantiation), **ADR-A19 (regulatory doctrine: `doctrineSpec`, §8.5B–8.5F)**, and **ADR-A20 (resolution: `resolutionSpec`, §10.4–10.8)** for that flow.

---

## Appendix A) Enforcement Map (Quick Scan)

Mirrors **Enforcement Map** in `architecture.md` v3.3. Use for first-pass audit; detailed controls live in the architecture document and Control Matrix (Section B above).

| Control Family           | CI Gate (Build-Time)                                  | Runtime Guard (Execution-Time)                          | Evidence Artifact                                      |
| ------------------------ | ----------------------------------------------------- | ------------------------------------------------------- | ------------------------------------------------------ |
| Identity semantics       | semantic lint + review gate                           | command admission rejects parallel semantics            | CI semantic report + rejected command traces           |
| Identity lifecycle       | lifecycle contract tests                              | merge/split/alias/supersede policy checks               | lifecycle audit events + reason codes                  |
| Compatibility/versioning | generation determinism + compatibility classification | migration-window and cutoff validation                  | artifact hashes + migration evidence bundle            |
| Economic conservation    | reconciliation and idempotency tests                  | duplicate/orphan/conversion-basis guards                | conservation reports + reconciliation deltas           |
| Invariant authority      | invariant catalog completeness checks                 | authority-tier enforcement and override blocks          | invariant catalog export + override logs               |
| Tenant isolation         | isolation regression suite                            | tenant context enforcement in every request path        | isolation test results + access decision traces        |
| Supersession lineage     | lineage schema and contract tests                     | mutation pipeline blocks missing lineage metadata       | lineage graph snapshots + supersession traces          |
| Search contract          | index freshness and scoping tests                     | tenant-scoped query execution + explainability metadata | search audit logs + freshness dashboards               |
| Predict boundary         | policy and promotion-rule tests                       | advisory-only default + policy-gated promotion flow     | promotion records + threshold decision logs            |
| Replayability            | replay drill pipeline checks                          | deterministic rebuild with checksum verification        | replay drill report + checksum attestations            |
| Regulatory instantiation | domain minimum invariant set in CI + catalog checks   | runtime enforcement per declared timing/failure policy  | invariant evidence bundle per domain                   |
| Financial authority      | truth-contract + valuation tests in CI                | block non-authoritative outputs when gates fail         | projection provenance + invariant status export        |
| Legal erasure/memory     | replay validity under anonymization fixtures          | governed erasure commands with memory emission          | erasure audit trail + replay checksum attest           |
| Regulatory doctrine      | doctrine catalog + binding completeness in CI         | projection/API attach doctrine context to authoritative | doctrine manifest + UI/audit doctrine references       |
| Doctrine traceability    | doctrine catalog completeness + reference validation  | doctrine reference on regulatory invariant failures     | doctrine mapping export + projection doctrine metadata |
| Resolution contract      | resolution mapping completeness tests                 | resolvable failures return structured remediation       | remediation logs + resolution suggestion evidence      |
