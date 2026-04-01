---
title: AFENDA Architecture (archived pre–v3.3)
description: Multi-tenant ERP SaaS platform — semantic root, layers, and operating model.
status: archived
---

> **Archived:** Superseded by [`architecture.md`](../architecture.md) (Hardened v3.3 — doctrine, resolution, enforcement map). Retained for historical comparison; **do not** cite as normative for new decisions.

# AFENDA Architecture

## 1. Position

AFENDA is a multi-tenant ERP SaaS platform built from a single semantic root and expanded into a runtime system that preserves enterprise memory, supports operational execution, and enables forward consequence modeling.

AFENDA does not treat ERP as a set of disconnected modules. It treats the enterprise as one connected system of identities, states, relations, actions, and consequences across accounting, finance, CRM, sales, procurement, inventory, warehouse, retail, F&B, ecommerce, HR, and adjacent domains.

The architectural root remains:

- `identitySpec`

That is not because identity alone is sufficient, but because without a coherent identity root, every later layer becomes fragmented:

- schema fragments
- workflows fragment
- permissions fragment
- integrations fragment
- reporting fragments
- memory fragments

AFENDA starts by making identity explicit, then builds every other layer in relation to that root.

---

## 2. Core Architectural Thesis

AFENDA is designed on five principles.

### 2.1 Identity is the root of enterprise structure

Every serious enterprise object must first exist as a declared identity with clear scope, ownership, and lifecycle semantics.

### 2.2 State is a projection, not the whole truth

A current row value is only a present projection. It is not the complete enterprise reality.

### 2.3 Enterprise memory is permanent

AFENDA may allow correction, overwrite, and reclassification, but it never depends on silent forgetting.

### 2.4 ERP is not CRUD-only

AFENDA operates as a **CRUD.SAP** system:

- Create
- Read
- Update
- Delete
- Search
- Audit
- Predict

### 2.5 SaaS concerns are part of product architecture

Tenancy, security, storage, search, observability, integrations, and recovery are not external details. They are part of the system design.

---

## 3. Why `identitySpec` is still the root

The enterprise does not fail first because a field is wrong. It fails because meaning is inconsistent.

Examples:

- the same party is modeled differently across CRM, procurement, and finance
- document ownership is unclear
- workflow boundaries do not align to entity boundaries
- domain teams redefine the same structural concepts separately

`identitySpec` exists to stop structural divergence at the source.

It defines the enterprise graph at its most stable level:

- what exists
- where it belongs
- what owns what
- which entities participate in controlled lifecycle behavior

Every later layer depends on this root:

- `enumSpec` depends on defined identities and lifecycle surfaces
- `relationSpec` extends declared identities with associative links
- `invariantSpec` evaluates behavior over declared identities and relations
- generated artifacts compile from the semantic root
- runtime execution depends on the generated graph
- UI, search, audit, and prediction project from the same system

So yes, the basic is still `identitySpec`.

---

## 4. Architectural Stack

AFENDA is organized into six architectural strata:

1. **Core**
2. **Runtime**
3. **Platform**
4. **Surfaces**
5. **Analytics**
6. **Operations**

These are not cosmetic separations. They reflect ownership and dependency direction.

---

## 5. Directory Architecture

```txt
packages/
  core/
    src/
      truth/
        identitySpec.ts
        enumSpec.ts
        relationSpec.ts
        invariantSpec.ts

      generated/
        identity.ts
        enums.ts
        graph.ts
        relations.ts
        zod.ts
        tables.ts
        invariants.ts

      contracts/
        commands.ts
        queries.ts
        events.ts

  runtime/
    src/
      graph/
      decisions/
      memory/
      projections/
      invariants/
      workflows/

  platform/
    src/
      tenancy/
      iam/
      integrations/
      documents/
      notifications/
      search/
      jobs/
      observability/

  surfaces/
    api/
      src/
        commands/
        queries/
        webhooks/
        auth/

    web/
      src/
        app/
        modules/
        workspaces/
        dashboards/
        admin/

    mobile/
      src/
        warehouse/
        approvals/
        retail/

  analytics/
    src/
      pipelines/
      models/
      metrics/
      forecasts/

  ops/
    migrations/
    seeds/
    scripts/
    runbooks/
```

---

## 6. Reasoning Behind the Nesting

The nesting must explain the architecture, not merely store files.

### 6.1 `core/`

This is the semantic and contractual heart of the system.

It is intentionally **not** named `db/`, because the root is not merely persistence.
The root is enterprise meaning.

#### `core/truth/`

Human-authored semantic source.

This is where structural and conceptual authority begins.

Contains:

- `identitySpec.ts`
- `enumSpec.ts`
- `relationSpec.ts`
- `invariantSpec.ts`

These files are authored deliberately and reviewed as architecture, not as convenience code.

#### `core/generated/`

Deterministic machine output compiled from truth.

It sits beside `truth/` because it is the machine form of the same semantic layer.

Contains:

- ID types
- enum outputs
- graph metadata
- relation metadata
- validation artifacts
- table definitions
- invariant helpers

#### `core/contracts/`

Formal interaction language of the platform.

Commands, queries, and events should not live only inside API folders, because they are not delivery details. They are system-level contracts.

This placement makes the contract language subordinate to semantic authority, not to transport technology.

---

### 6.2 `runtime/`

This is the live enterprise execution environment.

It is intentionally **not** called `engine/`, because the runtime is not one engine. It is a set of tightly coupled execution subsystems.

#### `runtime/graph/`

Understands structural topology:

- parent-child traversal
- dependency maps
- impact analysis
- graph navigation

#### `runtime/decisions/`

Handles controlled lifecycle behavior:

- action permissions
- transitions
- locks
- approvals
- mutation semantics

#### `runtime/memory/`

Preserves enterprise memory using temporal records, not shallow logs.

This is where permanent memory, responsibility tracing, and historical reconstruction live.

#### `runtime/projections/`

Builds usable state from:

- semantic definitions
- remembered history
- current operational requirements

Present-state views belong here.

#### `runtime/invariants/`

Evaluates and classifies rule expectations:

- consistency checks
- exception states
- domain expectations
- policy and financial rules

#### `runtime/workflows/`

Coordinates multi-step enterprise execution:

- approvals
- escalations
- orchestration
- downstream actions
- task sequencing

This runtime nesting is strong because these concerns are deeply coupled in execution, but distinct in responsibility.

---

### 6.3 `platform/`

This contains hosted-system capabilities that make AFENDA a serious SaaS platform.

These are not “miscellaneous support utilities.” Each is a first-class subsystem.

#### `platform/tenancy/`

Tenant lifecycle and isolation:

- provisioning
- activation / suspension
- feature entitlements
- tenant controls
- support boundaries

#### `platform/iam/`

Identity and access management:

- authentication
- RBAC
- policy
- delegated roles
- support impersonation with memory trail

#### `platform/integrations/`

External system connectivity:

- connectors
- sync flows
- webhook handling
- mapping
- retry logic

#### `platform/documents/`

Enterprise document and file surfaces:

- attachments
- generated PDFs
- exports
- signed artifacts
- file lifecycle

#### `platform/notifications/`

Human communication and system signaling:

- in-app
- email
- SMS where needed
- push channels
- escalation messaging

#### `platform/search/`

Search is first-class because AFENDA is not CRUD-only.

Search supports:

- record retrieval
- relation discovery
- historical lookup
- operational exception search
- enterprise-wide findability

#### `platform/jobs/`

Background execution:

- schedules
- retries
- long-running workflows
- periodic processing
- asynchronous integration work

#### `platform/observability/`

Operational visibility:

- metrics
- logs
- traces
- tenant diagnostics
- workflow and job health

---

### 6.4 `surfaces/`

This groups all delivery surfaces under one semantic category.

This is stronger than placing `api/`, `web/`, and `mobile/` as disconnected top-level siblings, because they are all interfaces to the same enterprise system.

#### `surfaces/api/`

Command, query, auth, and webhook surfaces for machine access.

#### `surfaces/web/`

Main operational ERP interface:

- workspaces
- forms
- dashboards
- admin tools
- document screens

#### `surfaces/mobile/`

Execution surfaces for field and device workflows:

- warehouse
- approvals
- retail / POS style operations

This grouping reinforces that surfaces are projections, not roots.

---

### 6.5 `analytics/`

Analytics is intentionally separate from runtime.

Why:

- runtime serves transaction execution
- analytics serves interpretation, summarization, and forecasting

Contains:

- pipelines
- models
- metrics
- forecasts

This is where the **Predict** part of CRUD.SAP begins to operationalize.

---

### 6.6 `ops/`

Operational mechanics belong here:

- migrations
- seeds
- scripts
- runbooks

This prevents production and maintenance artifacts from polluting core product semantics.

---

## 7. Core Layer in Detail

---

### 7.1 `identitySpec.ts`

`identitySpec` is the structural root registry of AFENDA.

Each entity definition answers these questions:

- what is this enterprise thing
- what scope does it live in
- what does it own
- what owns it
- does it participate in controlled lifecycle logic

Example:

```ts
export const identitySpec = {
  tenant: {
    scope: "system",
    children: ["organization", "user", "partner", "warehouse", "product"],
  },

  partner: {
    scope: "tenant",
    children: ["partnerAddress", "partnerContact", "partnerBankAccount"],
  },

  salesOrder: {
    scope: "tenant",
    children: ["salesOrderLine"],
    locks: true,
  },

  salesOrderLine: {
    parent: "salesOrder",
  },
} as const;
```

#### Supported fields

##### `scope`

Isolation boundary of the identity.

Examples:

- `system`
- `tenant`
- `global`

##### `children`

Structural descendants owned or contained by the current identity.

##### `parent`

Structural owner of the current identity.

##### `locks`

Declares lifecycle sensitivity and controlled transition participation.

#### What does not belong in `identitySpec`

- UI layouts
- SQL indexes
- report definitions
- API routes
- widget settings
- vendor-specific integration mappings

`identitySpec` must stay structural.

---

### 7.2 `enumSpec.ts`

`enumSpec` defines finite enterprise vocabularies.

This includes:

- statuses
- modes
- types
- operational phases
- workflow states

Examples:

- invoice status
- sales order status
- stock move type
- kitchen order status
- employment state
- payment method
- procurement stage

This matters because vocabulary drift is one of the fastest ways enterprise systems become inconsistent across UI, validation, API, and reporting.

---

### 7.3 `relationSpec.ts`

`relationSpec` defines non-hierarchical and associative relations that cannot be modeled through `parent` and `children` alone.

Examples:

- sales order to partner
- invoice to originating order
- payment to allocation target
- product to tax profile
- employee to department
- stock move from location to location

`relationSpec` is not the root.
It is a structural extension over already declared identities.

---

### 7.4 `invariantSpec.ts`

`invariantSpec` declares rule expectations the platform will evaluate.

These are not limited to financial balancing rules.

They include:

- consistency expectations
- completeness expectations
- sequencing expectations
- policy expectations
- exception classification rules
- domain-specific operational conditions

AFENDA distinguishes:

- **memory**: what happened
- **invariants**: how the system evaluates what happened

That separation is important.

---

## 8. Generated Layer

The generated layer exists so that enterprise meaning is not manually duplicated across too many technical surfaces.

Typical outputs:

- `identity.ts`
- `enums.ts`
- `graph.ts`
- `relations.ts`
- `zod.ts`
- `tables.ts`
- `invariants.ts`

### Why generation is architectural, not cosmetic

Without generation, the same meaning would be redefined repeatedly in:

- types
- validation
- schema
- runtime checks
- UI metadata
- contract layers

That leads to drift.

The generator exists to preserve coherence.

### Determinism requirement

Generated artifacts must be:

- reproducible
- ordered
- CI-checkable
- diff-stable

Generated files are machine-owned.

---

## 9. Runtime Philosophy

AFENDA runtime is built on three distinctions:

1. **identity vs state**
2. **memory vs projection**
3. **operation vs consequence**

This is where the architecture becomes stronger than traditional ERP layering.

---

## 10. Temporal Enterprise Memory

Earlier architectures often describe change as `before` and `after`.

AFENDA uses a stronger model:

- **past**
- **present**
- **future**

This is a better fit for enterprise systems because it captures:

- lineage
- current assertion
- expected consequence

### 10.1 Why `past / present / future` is better than `before / after`

`before / after` implies a narrow mutation frame.

`past / present / future` reflects the reality of enterprise work:

- past contains accumulated lineage and prior commitments
- present contains the current projection
- future contains expected consequences, obligations, and anticipated downstream effects

Enterprise actions are not only deltas.
They are temporal commitments.

### 10.2 Temporal memory record

AFENDA preserves enterprise memory through a temporal 7W1H record:

- who
- what
- when
- where
- which
- why
- with
- how

combined with:

- past
- present
- future

Example shape:

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
  future: FutureExpectation;
};
```

### 10.3 Meaning of each temporal dimension

#### `past`

Historical lineage:

- prior states
- prior assumptions
- prior dependencies
- prior decisions
- prior commitments

#### `present`

Current visible projection:

- what the system currently asserts
- how the record is currently classified
- what is currently actionable

#### `future`

Forward implications:

- obligations
- downstream work
- expected outcomes
- predicted effects
- pending risks

This is not “just audit logging.”
It is permanent enterprise memory.

---

## 11. CRUD.SAP Operating Model

AFENDA is not accurately described as CRUD-only.

It is better described as **CRUD.SAP**:

- **Create**
- **Read**
- **Update**
- **Delete**
- **Search**
- **Audit**
- **Predict**

### 11.1 Why CRUD is too weak

CRUD describes record manipulation.
It does not describe how modern enterprise platforms operate.

ERP users also need to:

- find information across large operational memory
- reconstruct responsibility and causality
- anticipate future consequences and risks

So AFENDA treats Search, Audit, and Predict as first-class architecture concerns.

---

### 11.2 Meanings in AFENDA

#### Create

Introduce a new enterprise identity, fact, or commitment.

#### Read

Retrieve a current or historical projection.

#### Update

Change the current projection while preserving permanent memory.

#### Delete

Retire or remove active visibility without relying on silent destruction of memory.

#### Search

Discover entities, relations, events, exceptions, and context across the enterprise graph.

#### Audit

Reconstruct responsibility, causality, lineage, and temporal context from permanent memory.

#### Predict

Estimate future consequences, operational risks, shortages, timing, and likely states.

---

### 11.3 Architectural implications of CRUD.SAP

#### Search

Requires:

- indexing
- faceted discovery
- cross-domain lookup
- historical retrieval
- operational exception search

#### Audit

Requires:

- temporal memory
- causality reconstruction
- actor and reason capture
- long-term recoverability of enterprise context

#### Predict

Requires:

- analytics pipelines
- historical signal
- forecasting models
- scenario capabilities
- forward consequence modeling

CRUD.SAP is therefore not branding language. It changes the architecture.

---

## 12. ERP Domain Strategy

AFENDA does not allocate a separate architecture per domain.

Instead, all domains are modeled as projections over the same enterprise graph.

### Examples of domain projections

#### Accounting / Finance

- account
- journalEntry
- journalLine
- invoice
- payment
- allocations
- tax profile
- currency context

#### CRM / Sales

- partner
- lead
- opportunity
- quote
- salesOrder
- salesOrderLine

#### Procurement

- supplier partner
- purchaseRequest
- purchaseOrder
- goodsReceipt
- vendor bill

#### Inventory / Warehouse

- product
- productVariant
- inventoryItem
- warehouse
- stockLocation
- stockMove
- transfer

#### HR / Workforce

- employee
- contract
- assignment
- attendance event
- leave and approval entities

#### Retail / F&B / Ecommerce

- cart
- posOrder
- menu
- menuItem
- kitchenOrder
- storefront order
- shipment
- return

The domain count can grow without changing the architecture because:

- the root remains identity-based
- vocabularies extend through enums
- associative links extend through relations
- evaluation extends through invariants
- runtime behavior extends through decisions, workflows, memory, and projections

That is what robustness means here.

---

## 13. SaaS Architecture Requirements

AFENDA is explicitly a SaaS architecture, not ERP software hosted somewhere.

### 13.1 Tenancy

Must support:

- isolation
- tenant lifecycle
- feature entitlements
- tenant settings
- support boundaries

### 13.2 IAM and policy

Must support:

- authentication
- authorization
- policy
- delegated authority
- support impersonation with memory preservation

### 13.3 Storage

Must include:

- transactional data store
- document storage
- cache
- search index
- analytics storage
- temporal memory store

### 13.4 Integrations

Must support:

- webhooks
- connectors
- sync pipelines
- external commerce and payment systems
- shipping, tax, banking, identity ecosystems

### 13.5 Surfaces

Must include:

- API
- operational web application
- mobile and device workflows
- admin and support tools

### 13.6 Recovery and observability

Must include:

- logs
- metrics
- traces
- diagnostics
- replay support
- operational runbooks

---

## 14. Data Architecture

### 14.1 Transactional database

Recommended:

- PostgreSQL

Stores:

- current business state
- transactional documents
- tenant-scoped master data
- workflow state
- current projections
- references into permanent memory

### 14.2 Temporal memory store

Stores:

- 7W1H temporal records
- lineage
- causality
- change records
- future commitments and consequence references

This may live in the primary transactional store at first, but is conceptually distinct.

### 14.3 Object storage

Stores:

- attachments
- generated documents
- signed files
- exported artifacts
- media assets

### 14.4 Search index

Supports:

- operational search
- historical search
- cross-domain retrieval
- exception discovery

### 14.5 Analytics and forecasting storage

Supports:

- metrics
- dashboards
- trend analysis
- forward models
- prediction surfaces

---

## 15. Non-Negotiable Rules

1. `identitySpec` is the semantic root.
2. `enumSpec`, `relationSpec`, and `invariantSpec` extend that root; they do not replace it.
3. Generated files are machine-owned and deterministic.
4. Current state is only a present projection.
5. Enterprise memory is permanent.
6. Temporal memory uses `past / present / future`, not a shallow `before / after` model.
7. AFENDA is a CRUD.SAP system, not a CRUD-only system.
8. Delivery surfaces are projections over one enterprise system.
9. SaaS concerns are first-class architecture concerns.
10. Analytics and prediction are designed into the platform, not bolted on later.

---

## 16. Final Statement

AFENDA begins with `identitySpec` because identity is the most stable and least negotiable root of enterprise structure.

From that root, the system extends into:

- vocabularies
- relations
- invariants
- generated machine forms
- runtime execution
- temporal enterprise memory
- search
- audit
- prediction
- hosted SaaS operations

That is why the architecture does not stop at schema.
It starts at identity, and then grows into a complete ERP SaaS platform without losing semantic coherence.
