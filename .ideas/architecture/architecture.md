# AFENDA Architecture (Hardened v3.3)

## 1) Position

AFENDA is a multi-tenant ERP SaaS architecture designed to prevent semantic drift while scaling operational complexity.

It treats the enterprise as one connected system with:

- canonical identity and relation semantics
- deterministic generation of machine artifacts
- explicit runtime decision and invariant execution
- policy-governed temporal memory
- first-class search, audit, and forward consequence modeling

This document is normative for architecture decisions unless superseded by an approved ADR.
For executive and audit review, see `architecture-board-pack.md`.

## Terminology (Normative)

The following terms are used consistently:

- **mutation**: any state-changing operation
- **economic effect**: any mutation with financial or quantity impact
- **projection**: computed current-state view derived from memory and rules
- **invariant**: rule that must be evaluated and classified for a mutation or projection
- **authoritative**: eligible for financial, operational, or compliance reliance
- **memory**: append-oriented record of mutations and context
- **doctrine**: external or internal source of authority that defines **why** a rule exists (for example IFRS, IAS, tax law, tenant policy); encoded in `doctrineSpec` metadata, not in structural identity keys
- **resolution**: governed remediation path for a failed invariant, including permitted actions, target surfaces, retry conditions, and escalation; encoded in `resolutionSpec` metadata where applicable

These terms must not be redefined in downstream sections.

## Enforcement Map (Quick Scan)

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

Use this map as the first-pass review checklist; details are defined in sections 8 through 15.

---

## 2) Scope, Non-Goals, and Success Criteria

### 2.1 In Scope

- transactional ERP flows across domains (sales, accounting, inventory, procurement, workforce)
- cross-domain consistency guarantees
- tenant-safe runtime and platform controls
- auditable history and reconstructable decisions
- explicit invariants and recovery behavior

### 2.2 Non-Goals

- prescribing a specific UI framework or mobile stack
- defining full ML training lifecycle internals
- promising global active-active strong consistency
- replacing external BI tools or data-warehouse architecture

### 2.3 Success Criteria

Architecture is successful only when all are true:

1. The same business concept has one canonical identity meaning.
2. Every material state mutation is explainable and reconstructable.
3. Tenant isolation is enforceable and testable.
4. Spec evolution can occur without silent semantic breaks.
5. Incident recovery can rebuild projections from retained memory.

---

## 3) Core Tenets

1. Identity defines enterprise structure and meaning.
2. State is a projection derived from memory and invariants.
3. Memory is non-silent, policy-governed, and reconstructable.
4. Economic effects must be conserved, classified, valued, and traceable.
5. CRUD.SAP capabilities are first-class and independently governed.

### 3.5 Economic Effects Must Be Conserved, Classified, Valued, and Traceable

ERP mutations carry economic meaning, not only structural change.

AFENDA enforces economic truth through these non-negotiable rules:

- no duplicated economic effect under retries, replays, or concurrent command paths
- no orphan economic effect without originating identity, causal chain, and settlement linkage
- no silent reclassification of economically material meaning without explicit supersession record
- no value conversion without preserved basis (rate, source, timestamp, policy context)
- no committed obligation without originating authority, lifecycle state, and governing policy
- no economically material correction without reversal or compensating lineage where required

Economic effects must be:

- identity-linked
- temporally anchored
- classifiable
- valued under declared policy
- reconstructable from memory

Any mutation that violates these properties is invalid or must be explicitly classified as an exception.

---

## 4) Canonical Semantic Model

The canonical model defines enterprise semantics through six specifications:

- `identitySpec`: entities and lifecycle anchors
- `enumSpec`: bounded vocabularies
- `relationSpec`: non-hierarchical associations
- `invariantSpec`: evaluable business expectations
- `doctrineSpec`: source-of-authority metadata for regulatory and policy truth
- `resolutionSpec`: governed remediation metadata for resolvable invariant failures

`doctrineSpec` and `resolutionSpec` do not replace executable invariants. They make truth **attributable**, **explainable**, and **operable** under governance and audit.

No runtime or projection behavior may contradict these specifications.

### 4.1 Identity Integrity Rules

`identitySpec` is valid only when lifecycle cases are explicitly modeled:

- merge: duplicate entities resolve into one canonical identity
- split: one identity resolves into multiple successors
- alias: multiple references map to the same real-world identity
- supersede: replacement identity inherits controlled continuity

Each lifecycle operation must define:

- initiator authority
- required evidence and reason codes
- projection impact
- audit evidence requirements
- rollback or compensating behavior

### 4.2 Semantic Uniqueness Rule

If two domains need the same real-world concept, they must reuse or formally extend the canonical identity.  
Creating a parallel concept with overlapping meaning is prohibited.

### 4.3 Economic Primitives (Canonical)

The canonical model must represent and validate these primitives:

- amount: numeric value with precision policy
- currency: ISO or governed tenant currency profile
- quantity: numeric value with unit-of-measure context
- obligation: enforceable future commitment (`futureCommitted`)
- allocation: linkage of value/quantity across identities and documents
- settlement: closure event that satisfies obligations and allocations

Each primitive must have explicit invariants for rounding, conversion, and reconciliation.

### 4.4 Economic Flow Integrity (Mandatory)

Economic primitives must follow valid flow sequences:

- obligations must precede settlements
- allocations must reference valid source and target identities
- settlements must reduce or close obligations under governed rules
- no economically material effect may bypass required intermediate states

Invalid flows (for example settlement without obligation, or allocation without source context) are prohibited and must be blocked.

### 4.5 Economic Reversal and Correction Integrity (Mandatory)

Economically material corrections must preserve historical truth.

AFENDA distinguishes:

- supersession of asserted meaning
- reversal of economic effect
- compensating adjustment

Rules:

- original economically material effects remain historically reconstructable
- reversal must reference the original effect
- compensating adjustment must declare reason and scope
- net effect must be derivable without erasing prior economic reality
- supersession alone is not sufficient for financially material correction where reversal semantics are required

Examples of mandatory linkage:

- corrected settlement must reference prior settlement or obligation chain
- corrected allocation must reference source allocation lineage
- corrected valuation must preserve prior basis and replacement basis

### 4.6 Partial Economic State Integrity (Mandatory)

AFENDA must support partial economic states explicitly.

Partial state is not an exception; it is a normal enterprise condition.

The system must preserve correctness for:

- partial fulfillment
- partial allocation
- partial settlement
- partial recognition
- partial reversal

Rules:

- remaining obligation must be explicit after every partial settlement
- source, applied portion, and remainder must reconcile after every partial allocation
- partial fulfillment must not imply full recognition unless policy allows it
- partial reversal must preserve both reversed portion and unreversed remainder
- projections must distinguish full, partial, and pending states unambiguously

---

## 5) Precedence and Conflict Resolution

Conflicts are resolved in strict order:

1. legal and regulatory constraints
2. tenant isolation and security
3. invariant policy
4. command authorization and workflow
5. projection and UI behavior

Lower-precedence layers must not override higher-precedence rules.

All exceptions must be:

- explicitly classified
- attributable
- time-bounded or permanently recorded
- visible in projections and audit outputs

---

## 6) Spec Compilation, Versioning, and Compatibility

Canonical specs compile into machine artifacts (types, validators, graph metadata, table contracts, runtime helpers).

### 6.1 Determinism Requirements

Generation must be:

- deterministic (same input, same output ordering and hashes)
- diff-stable for CI review
- reproducible across environments

### 6.2 Versioning Policy

Spec changes are classified as:

- patch: additive or corrective, backward-compatible
- minor: additive with optional adoption work
- major: semantic break requiring migration plan and dual-read/write window

### 6.3 Migration Contract

Any breaking semantic change must provide:

- migration strategy (online/offline)
- replay/backfill strategy
- cutoff and rollback plan
- compatibility window and deprecation date

---

## 7) Runtime Execution Model

Runtime is partitioned by responsibility:

- graph: topology and dependency traversal
- decisions: lifecycle and authorization semantics
- invariants: business rule evaluation and classification
- workflows: orchestration and long-running coordination
- projections: optimized current-state materialization
- memory: append-oriented temporal records

### 7.1 Command Execution Pipeline

1. authenticate and bind tenant context
2. authorize command
3. validate canonical contract
4. evaluate pre-commit invariants
5. apply transactional mutation
6. append memory record
7. update projections
8. trigger post-commit checks and workflows

Each step must emit traceable telemetry.

### 7.2 Command Guarantees (Mandatory)

Every externally triggerable command requires:

- idempotency key semantics with bounded replay window
- deterministic duplicate detection behavior
- concurrency protection via version checks or lock strategy
- invariant re-evaluation on conflicted retries

Retries must not duplicate economic effects (double settlement, double allocation, double decrement).

---

## 8) Invariant Model

Invariants are executable rules.

Each invariant must define:

- scope
- timing
- severity
- failure policy
- remediation owner

### 8.1 Minimum Enforcement Rule

Financial correctness, tenant isolation, and legal integrity invariants default to `block` unless explicitly waived by approved policy.

### 8.2 Drift Monitoring

Invariants require freshness SLOs for async and batch checks; stale invariant status is treated as degraded trust.

### 8.3 Invariant Taxonomy and Source of Authority

AFENDA classifies invariants by:

- semantic class
- source of authority

#### 8.3.1 Semantic Classes

All invariants must be assigned to one or more of the following:

- identity invariants (uniqueness, lifecycle integrity, merge/split correctness)
- relational invariants (referential integrity, association validity)
- lifecycle invariants (allowed transitions, lock states, approval gates)
- economic invariants (conservation, allocation, settlement correctness)
- recognition invariants (when an economic effect is allowed to exist)
- measurement invariants (how value is calculated, converted, and rounded)
- classification invariants (obligation vs forecast, receivable vs settled)
- period invariants (cutoff correctness, closed periods, backdating policy)
- reconciliation invariants (cross-entity consistency of allocations and balances)
- valuation invariants (basis, revaluation, authoritative vs provisional projections)
- aggregation and statement support invariants (rollup reproducibility and cut-off correctness)
- reversal/correction integrity invariants (reversal, compensating adjustment, partial economic state)
- temporal memory invariants (causality completeness, supersession lineage, non-silent mutation)
- supersession invariants (every semantic mutation preserves prior assertion linkage)
- tenant isolation invariants (no cross-tenant leakage or inference)
- search integrity invariants (result correctness, tenant scoping, explainability)
- prediction boundary invariants (separation of forecast from commitment)

#### 8.3.2 Source of Authority

Each invariant must declare its governing source:

- Regulatory/standards-derived:
  - originates from accounting standards and legal/compliance requirements
  - non-negotiable under normal operation
  - any exception requires formal exception handling and audit evidence
- Platform-mandated:
  - originates from AFENDA architecture guarantees (for example tenant isolation, replayability, idempotency, memory integrity)
  - cannot be overridden by tenant configuration
- Tenant policy-derived:
  - originates from tenant-specific business policy (for example approval thresholds, tolerance limits, retention extensions)
  - configurable only within allowed bounds
  - must not violate higher-precedence invariants

#### 8.3.3 Override Policy

- regulatory invariants: no direct override; requires exception process
- platform invariants: no override allowed
- tenant invariants: configurable with full memory attribution

Any allowed override must record actor, reason code, duration/permanence, and linked review/approval.

### 8.4 Financial and Regulatory Invariant Classes

AFENDA must explicitly support invariant classes aligned with accounting and regulatory expectations.

#### 8.4.1 Recognition Invariants

Controls when economic effects may be created.

Examples:

- revenue-affecting events require defined recognition trigger
- obligations must exist before settlement
- adjustments must reference prior recognized context

#### 8.4.2 Measurement Invariants

Controls how economic values are calculated.

Examples:

- amount precision and rounding follow declared policy
- currency conversion preserves rate, source, and timestamp
- quantity-to-value relationships remain consistent

#### 8.4.2A Valuation Invariants

Controls how economically material positions are valued over time.

Examples:

- cost basis method must be declared for each valuation-relevant domain context
- valuation policy must identify allowed method classes (for example FIFO, weighted average, governed standard cost, or approved equivalent)
- revaluation must preserve historical basis, replacement basis, reason code, and effective time
- no valuation change may silently restate prior economically material effect
- valuation-sensitive projections must declare whether they are authoritative, provisional, or analytical

#### 8.4.3 Classification Invariants

Controls how economic facts are categorized.

Examples:

- obligation vs forecast remains distinct
- settled vs outstanding is unambiguous
- allocation references valid source and target classes

#### 8.4.4 Period (Cutoff) Invariants

Controls temporal correctness of recognition.

Examples:

- closed periods require controlled exception path for mutation
- backdated changes include reason code and audit linkage
- recognition and settlement align with governed periods

#### 8.4.5 Reconciliation Invariants

Ensures consistency across related records.

Examples:

- allocation totals reconcile with source and destination
- settlement reconciles with remaining open balance
- quantity and value reconcile across transformations

#### 8.4.6 Disclosure-Supporting Invariants

Ensures the system preserves facts required for downstream reporting and audit.

Examples:

- economically material events retain origin, transformation chain, and supersession history
- derived values preserve traceability to source records

#### 8.4.7 Aggregation and Financial Statement Support Invariants

Controls whether financially authoritative rollups can be produced and defended.

Examples:

- economically material records must map into governed classification hierarchies
- period aggregation must preserve cut-off correctness
- rollups must be reproducible from invariant-compliant projections and retained memory
- no financially authoritative statement may be produced from projections with unresolved critical invariant breaches
- statement-supporting outputs must retain provenance to underlying identities, effects, and transformation chains

### 8.5 Accounting Truth Contract

A projection is financially authoritative only if all applicable critical invariants pass:

- recognition
- measurement
- classification
- period correctness
- reconciliation
- valuation where applicable

If any critical invariant fails, the projection must not be presented as authoritative.

For blocked or exception-class authoritative outputs, AFENDA must expose:

- governing doctrine context
- failed invariant identity
- runtime evidence
- available resolution path, if resolution is permitted (see §10.4–10.8)

### 8.5A Regulatory Invariant Instantiation Requirement

Regulatory and standards-derived invariants must be instantiated, not merely classified.

For each supported financially material domain, AFENDA must provide:

- a minimum active invariant set
- declared enforcement timing
- declared failure policy
- evidence artifacts for audit and review
- doctrine linkage per §8.5B–8.5F for each such invariant

A system that classifies regulatory invariants but does not instantiate them for an active domain is non-compliant with this architecture.

### 8.5B Doctrine Layer (Mandatory)

AFENDA must explicitly declare the doctrine that governs regulatory and policy-derived truth.

Doctrine is distinct from executable invariants.

- doctrine defines **why** a rule exists
- invariant defines **what** rule is executed
- runtime defines **when and how** the rule is enforced
- projections and UI define **how the result is exposed**

Regulatory and policy-derived invariants must not exist without doctrine linkage.

### 8.5C Doctrine Structure

Each doctrine entry in `doctrineSpec` must define:

- **doctrine family** — for example IFRS, IAS, GAAP, tax, internal policy
- **standard or source name** — for example IFRS 15, IAS 2, IAS 21
- **section, clause, or governed concept reference** — exact clause where available, otherwise a controlled internal reference
- **doctrine title** — concise statement of what the doctrine governs
- **interpretation mode** — strict, policy-adjusted, or advisory
- **linked invariants** — one or more executable invariants derived from this doctrine
- **visibility class** — internal-only, operator-visible, audit-visible, customer-visible where applicable

Tenant or deployment **doctrine sets** (for example IFRS, regional GAAP, tax regimes, internal policy overlays) remain declared in configuration; stable doctrine identifiers must not live in `identitySpec`.

### 8.5D Doctrine Traceability Rule

Every regulatory invariant failure must be traceable across this chain:

**doctrine → invariant → runtime evaluation → memory → projection → user-visible explanation**

A financially authoritative output must be able to disclose the governing doctrine context for any blocking or exception-class invariant.

A doctrine reference must not be replaced by a generic label such as “IFRS violation” when a more specific standard or clause mapping exists in `doctrineSpec`.

### 8.5E Doctrine Visibility Rule

AFENDA must expose doctrine context in the following places where relevant:

- invariant catalog exports
- audit and evidence artifacts
- financially authoritative projection metadata
- user-facing blocking and exception surfaces
- operator and reviewer diagnostics

Doctrine visibility must distinguish:

- doctrine family
- standard
- section or concept reference
- linked invariant
- current runtime evidence

No financially authoritative output may be presented without declaring governing doctrine context for the relevant claim class.

### 8.5F Doctrine vs Executable Implementation

| Layer                     | Responsibility                                                                 |
| ------------------------- | ------------------------------------------------------------------------------ |
| Doctrine (`doctrineSpec`) | Names truth authority, alignment, and explainability                           |
| `invariantSpec`           | Defines executable rules, classes, and failure policy                          |
| Runtime                   | Enforces invariants and records memory                                         |
| Projections / UI          | Expose outcomes and attach authority, invariant, doctrine, resolution metadata |

Traceability chain (required): **doctrine → invariant → execution → memory → projection**.

Doctrine text must not be embedded in `identitySpec` or generator emitters. Doctrine references live in catalog, configuration, and metadata—not in structural identity keys.

### 8.6 Invariant Enforcement Baseline

The following invariant classes default to `block`:

- tenant isolation invariants
- economic conservation invariants
- recognition invariants
- period invariants involving closed or governed financial periods
- reconciliation invariants affecting financially authoritative state
- supersession invariants on meaning-changing mutations
- reversal/correction integrity invariants for economically material effects

The following may default to `allow-with-flag` or `quarantine` when policy permits:

- bounded measurement tolerance deviations
- non-critical classification inconsistencies
- disclosure-supporting gaps in non-authoritative projections
- prediction boundary alerts that do not mutate authoritative state

Tenant policy may tighten enforcement but must not weaken higher-precedence invariant classes.

---

## 9) Temporal Memory

AFENDA records mutations using 7W1H with temporal dimensions:

- past
- present
- futureCommitted
- futurePredicted

```ts
type TemporalTruthRecord = {
  who: ActorRef;
  what: ActionRef;
  when: Timestamp;
  where: ContextRef;
  which: EntityRef;
  why: ReasonRef;
  with: RelatedRefs;
  how: MechanismRef;
  past: PastContext;
  present: PresentProjection;
  futureCommitted?: ObligationContext;
  futurePredicted?: ForecastContext;
};
```

### 9.1 Future Split (Mandatory)

- `futureCommitted`: contractual obligations and enforceable commitments
- `futurePredicted`: probabilistic expectations and forecasts

These must never be stored or interpreted as the same semantic class.

### 9.2 Retention and Deletion Policy

Memory governance is policy-driven by data class:

| Class                     | Example                      | Default Retention                | Deletion Basis                         |
| ------------------------- | ---------------------------- | -------------------------------- | -------------------------------------- |
| Regulated financial trail | invoices, payments, postings | legal minimum + tenant extension | legal expiration and no active hold    |
| Operational trace         | workflow transitions         | bounded policy window            | policy expiration                      |
| Predictive artifacts      | forecast outputs             | short to medium window           | model lifecycle and policy             |
| Personal data references  | actor-linked context         | jurisdiction dependent           | legal erasure request where applicable |

“Permanent” means non-silent and policy-constrained, not infinite retention.

### 9.3 Supersession Lineage (Mandatory)

Any mutation that changes previously asserted business meaning must preserve supersession lineage.

This includes:

- reference to prior assertion
- actor responsible for change
- reason code for change
- timestamp of change
- downstream impact references (affected allocations, obligations, projections)

No mutation may silently replace prior meaning without lineage.

Supersession lineage enables:

- reconstruction of historical understanding
- comparison between prior and current assertions
- audit of decision evolution over time

Supersession lineage must also declare whether the mutation is:

- semantic correction only
- economically material correction
- reversal-linked correction
- policy-driven reclassification
- legal/compliance-driven exception mutation

This classification is mandatory for downstream audit, reconciliation, and reporting behavior.

---

## 10) CRUD.SAP Capability Contract

AFENDA defines seven governed capabilities:

- Create
- Read
- Update
- Delete
- Search
- Audit
- Predict

Each capability has distinct guarantees and prohibited anti-patterns.

| Capability | Required Guarantee                         | Anti-Pattern (Prohibited)              |
| ---------- | ------------------------------------------ | -------------------------------------- |
| Create     | canonical identity and contract validation | bypassing identity semantics           |
| Read       | explicit projection provenance             | returning un-attributed derived values |
| Update     | memory-backed mutation trail               | silent overwrite with no causality     |
| Delete     | visibility retirement policy               | hard delete without policy and audit   |
| Search     | cross-domain discovery with tenant filter  | tenant-leaking index behavior          |
| Audit      | causal reconstruction                      | plain log dumps marketed as audit      |
| Predict    | separated from commitments                 | mixing forecast with obligation        |

### 10.1 Clarifications

Audit = reconstructable causality plus supersession lineage.

Audit must support:

- full reconstruction of state at any point in time
- traceability of economically material transformations
- continuity between prior and current assertions
- attribution of actor, reason, and mechanism
- explanation of why current state differs from prior state

Audit is not log storage. Audit is the ability to prove system behavior over time.

Additional clarifications:

- Search is discovery across identity, relation, and time, not simple query endpoints.
- Predict is forward consequence modeling; ML is optional, not implied.
- Doctrine explains why a rule exists.
- Resolution explains how a permitted actor may remediate a failed rule.

### 10.2 Search Contract (Required)

Search must:

- enforce tenant isolation at query planning and result filtering stages
- support identity, relation, and temporal predicates
- distinguish current-state and historical-result intents
- declare freshness class per index/projection family
- provide explainability metadata for ranked or derived results

### 10.3 Predict Boundary (Required)

Prediction outputs are advisory by default.

A predicted output may influence automated action only when:

- the automation policy explicitly allows it
- confidence and risk thresholds are declared
- resulting action remains auditable and reversible (or compensable)

No predicted output may be persisted as a committed obligation without explicit promotion flow.

Prediction must declare:

- input sources (memory, analytics, external signals)
- evaluation cadence (real-time, batch, scheduled)
- confidence and risk thresholds
- promotion rules (when prediction becomes commitment)

Prediction outputs:

- must not mutate economic state directly
- may trigger actions only through explicit policy
- must remain distinguishable from committed obligations at all times

Prediction outputs may inform invariant thresholds and routing decisions, but may not override or downgrade regulatory/standards-derived or platform-mandated invariants.

### 10.4 Resolution Layer (Mandatory)

AFENDA must not stop at explaining failure.

For any invariant failure classified as resolvable, the system must provide structured remediation metadata that tells the user or operator:

- what must be corrected
- where it must be corrected
- whether they are authorized to correct it
- what workflow is required if they are not authorized
- when retry is allowed

Resolution is a first-class architectural concern, not a UI convenience.

### 10.5 Resolution Classification

Invariant failures must be classified as one of:

- **user-resolvable** — the current actor may resolve directly
- **role-resolvable** — a permitted operational role may resolve directly
- **workflow-resolvable** — resolution requires approval, request, or exception workflow
- **admin-only** — only privileged operators may resolve
- **non-resolvable** — no corrective path exists except rejection, escalation, or system intervention

### 10.6 Resolution Contract

A resolvable invariant failure must return a structured resolution contract (see `resolutionSpec`) containing:

- resolution identifier
- invariant name
- doctrine reference where applicable
- resolution class
- allowed actions
- responsible role or function
- target surface or workflow path
- retry condition
- escalation path if direct resolution is not allowed

### 10.7 Allowed Resolution Actions

AFENDA resolution actions are restricted to governed types:

- **navigate** — open the exact correction surface
- **instruction** — provide controlled human-readable remediation step
- **workflow** — initiate request, approval, or exception path
- **retry** — re-attempt execution after correction
- **reference** — open doctrine, policy, or explanation surface
- **contact** — route to responsible team or role
- **autofix** — system-permitted automatic remediation under policy

No resolution action may bypass invariant enforcement, tenant isolation, or authority rules.

### 10.8 User-Facing Failure and Resolution Surface

For blocking and exception-class invariant outcomes, AFENDA should expose four layers of explanation where relevant:

1. **doctrine** — which standard, section, or governed concept applies
2. **invariant** — which executable rule failed
3. **evidence** — what concrete runtime fact caused failure
4. **resolution** — what action is allowed next, where to perform it, and who may perform it

Example target experience:

- Blocked by IAS 21 — Foreign Currency Translation
- Rule: `fx_conversion_basis_required`
- Evidence: missing approved exchange rate for USD → VND on 2026-04-01
- Resolution: open FX Rate Maintenance or submit Finance Request

### 10.9 Financial Authority Boundary

No projection may be treated as financially authoritative when any of the following is true:

- critical accounting truth contract invariants are unresolved
- valuation basis is missing or invalid
- reconciliation state is stale beyond declared freshness target
- supersession lineage is incomplete for meaning-changing mutations
- reversal/correction linkage is missing for materially corrected effects

Financially authoritative outputs must declare:

- projection timestamp
- invariant status snapshot
- valuation basis status where applicable
- provenance and replayability reference
- **governing doctrine context** for the authoritative claim (see §8.5B–8.5F)

---

## 11) Multi-Tenant Security and Trust Boundaries

Tenant isolation is mandatory in all execution paths.

### 11.1 Isolation Guarantees

- every request is tenant-context bound by default
- cross-tenant access requires explicit, audited operator pathways
- tenant context must propagate through jobs, workflows, and integration callbacks

### 11.2 Operator Access Controls

Privileged actions require:

- just-in-time authorization
- time-boxed session elevation
- immutable attribution in memory records
- post-action review workflow

### 11.3 Integration Boundary

External integrations operate as untrusted inputs unless validated by canonical contracts and policy checks.

---

## 12) Data Architecture

Data stores are separated by responsibility:

- **transactional**: canonical operational projection and command-side state
- **memory**: append-oriented temporal records for reconstruction and replay
- **search**: discovery-optimized index with strict tenant scoping
- **analytics**: aggregate, model, and forecast workloads

### 12.1 Consistency Model

- command-side financial, identity-lifecycle, and isolation-critical operations require strong consistency
- economically material duplicate prevention must operate at the economic-effect level, not only request level
- projections and analytics may be eventually consistent only within declared freshness bounds
- financially authoritative projections must declare whether all required invariant classes are current
- replay and rebuild operations must preserve equivalence of authoritative outputs under approved policy assumptions

### 12.2 Replayability Rule

Projection rebuild from memory must be an intentional, tested capability, not an emergency-only assumption.

### 12.3 Projection Invalidation and Rebuild Strategy

Projection families must define:

- invalidation triggers (mutation class, invariant breach, schema/version change)
- rebuild scope (identity-scoped partial replay vs full-domain replay)
- freshness target (RPO/RTO or lag budget)
- consistency profile (strong, bounded-stale, eventually consistent)

Critical financial and isolation-sensitive projections require deterministic rebuild and checksum validation.

### 12.4 Legal Erasure and Memory Integrity

Legal deletion or anonymization must not destroy system truth.

Rules:

- personal identifiers may be anonymized or replaced according to legal policy
- economic effects, causality chains, and reconciliation structure must remain reconstructable
- deletion/anonymization must not orphan identities or invalidate authoritative rollups
- replay must remain valid under anonymized historical memory
- legal erasure actions must themselves emit governed memory records

---

## 13) Reliability, SLOs, and Failure Modes

Reliability is defined by enforceable SLOs and recovery guarantees.

### 13.1 Minimum SLOs (Baseline Targets)

- command success availability: 99.9% monthly
- critical invariant evaluation latency (pre-commit path): p95 < 150ms budget contribution
- async invariant freshness: <= 5 minutes for high-severity classes
- memory append durability: no acknowledged write loss
- projection replay RTO for critical flows: <= 60 minutes

### 13.2 Required Failure Playbooks

- bad deployment: controlled rollback and replay verification
- integration storm/backpressure: isolation, retry policy, dead-letter handling
- projection corruption: deterministic rebuild from memory
- tenant policy misconfiguration: safe defaults and policy validation gates

---

## 14) Governance and Change Control

### 14.1 ADR and Review Gates

Changes to canonical semantics require:

- ADR with impact statement
- compatibility classification (patch/minor/major)
- migration and rollback plan for major changes
- explicit sign-off from architecture and domain owners

### 14.2 Release Controls

No release may ship if any of these fail:

- deterministic generation checks
- critical invariant test suites
- tenant isolation regression tests
- policy and retention validation checks

### 14.3 Enforcement Surfaces (CI and Runtime)

Architecture controls are enforceable only when wired into execution surfaces:

- CI hard-fail gates: generation determinism, compatibility policy, critical invariants, isolation regression
- CI soft gates with expiration: non-critical drift alerts that become hard-fail after grace window
- runtime admission gates: command authorization, invariant block policies, tenant context validation
- runtime policy guards: override reason-code enforcement and audit-attribution checks

Any control defined in this document without an enforcement surface is treated as non-compliant.

### 14.4 Enforcement Priority and Stage Gates

Controls are enforced in this priority order:

1. legal/regulatory integrity
2. tenant isolation and security boundaries
3. economic correctness and idempotency
4. replayability and projection correctness
5. search/predict boundary controls
6. non-critical optimization and convenience controls

Stage gates are mandatory; lower-priority expansion cannot start until higher-priority controls pass.

When higher-precedence legal or regulatory requirements require exceptional mutation that would normally violate lower-precedence invariant rules:

- the lower-precedence violation must remain visible
- the exception must be classified and attributable
- downstream projections must reflect exception state rather than pretending ordinary validity

No precedence resolution may silently suppress invariant breach evidence.

### 14.5 Anti-Bypass Governance Rule

Delivery pressure is not a valid reason to bypass architecture controls.

Any temporary exception must:

- be time-boxed with explicit expiry
- include compensating controls
- include accountable approver and risk owner
- emit an audit event and follow-up remediation task

Expired exceptions fail release gates automatically.

### 14.6 Operator-Safe Override Workflow

Override workflows must be strict enough to preserve trust and fast enough for operational reality.

Minimum workflow requirements:

- pre-approved reason code taxonomy
- actor attribution and session context capture
- scope-limited override target (identity/command/period)
- expiration or permanence flag
- post-action review routing and closure SLA

Overrides that affect economically material state require secondary approval or compensating reconciliation checks.

### 14.7 Tooling and Automation Requirements

Manual enforcement is allowed only for emergency fallback and must not be the default operating model.

The platform must provide:

- automated replay drills with published checksums and RTO evidence
- automated invariant freshness and backlog monitoring
- migration assistant tooling for compatibility windows and rollback plans
- policy linting for tenant and platform rule configuration
- dashboards for control compliance, exceptions, and breach trends

---

## 15) Implementation Roadmap (Risk-First)

For a concrete Phase 1 cut (specs, layout, commands, CI evidence), see [`phase-1-implementation-blueprint.md`](./phase-1-implementation-blueprint.md).

1. establish one end-to-end vertical flow (order -> inventory -> accounting)
2. enforce identity lifecycle operations and precedence model
3. harden invariant execution policies with measurable freshness targets
4. enable replay drills and incident playbooks
5. expand domain coverage only after passing quality gates

Breadth expansion without passing previous stage gates is prohibited.

### 15.1 Exit Criteria per Stage

- Stage 1 (vertical flow foundation): identity, authorization, and critical invariants passing in CI/runtime
- Stage 2 (economic correctness): idempotency, reconciliation, and conservation checks operational
- Stage 3 (recoverability): replay drills pass with evidence and RTO within target
- Stage 4 (governance maturity): exception workflows, policy linting, and approval traces active
- Stage 5 (domain expansion): only after stage 1-4 evidence passes for two consecutive review cycles

### 15.2 Mandatory Financial Hardening Before Breadth Expansion

Before expanding beyond the first vertical flow, AFENDA must demonstrate:

- active instantiated regulatory invariant set for the chosen financially material flow
- declared doctrine sets with invariant-to-doctrine binding and visible evidence (§8.5B–8.5F)
- reversal and correction handling for economically material mutations
- partial-state handling for at least one obligation/allocation/settlement chain
- valuation policy enforcement for at least one materially valued object class
- financially authoritative projection output with provenance and invariant status evidence

---

## 16) Non-Negotiable Rules

1. Canonical identity semantics are authoritative.
2. Identity lifecycle operations (merge/split/alias/supersede) must be explicit.
3. Conflicts resolve by legal/policy precedence, never by UI convenience.
4. Generated artifacts must be deterministic and version-governed.
5. Material mutations require reconstructable memory evidence.
6. Economic effects must be traceable, conserved, and idempotent under retries.
7. Invariants must declare scope, timing, severity, and failure behavior.
8. Forecasts and commitments are separate semantic objects.
9. Tenant boundaries are enforced in every data path.
10. Replayability is a tested capability.
11. Search and prediction behavior must publish explicit contracts and freshness bounds.
12. Domain expansion follows risk-first stage gates.
13. Regulatory and standards-derived invariants must be instantiated for each active financially material domain.
14. Reversal, correction, partial economic state, and valuation changes must preserve integrity, lineage, and authoritative semantics.
15. Financially authoritative outputs must satisfy the financial authority boundary and declare provenance and invariant status.
16. Legal erasure and anonymization must not destroy economic truth, replay validity, or authoritative rollups.
17. Regulatory doctrine must be declared, bound to applicable invariants, and visible for authoritative outputs and audit—not only enforced opaquely at runtime.
18. Regulatory and policy-derived invariants must reference explicit doctrine entries.
19. Resolvable invariant failures must return structured resolution metadata.
20. User-facing authoritative failure surfaces must expose doctrine, invariant, evidence, and resolution distinctly.
21. Doctrine visibility must be more specific than a generic family label when a standard or clause reference exists.

---

## 17) Final Statement

AFENDA is judged by:

- semantic consistency
- reconstructability of decisions
- recoverability of operations under failure

Architecture is complete only when these properties hold under scale.
