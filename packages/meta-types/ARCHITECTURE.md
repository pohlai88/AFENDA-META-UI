# Meta Types — Architecture

> **Status:** Production-Ready Foundation Layer
> **Package:** `@afenda/meta-types`
> **Tests:** 2 contract tests, all passing
> **Build:** TypeScript clean, zero runtime dependencies

---

## The Design Philosophy

| Old approach                             | New approach     |
| ---------------------------------------- | ---------------- |
| "Types defined in each module"           | ❌ fragmentation |
| "Runtime validation scattered"           | ❌ drift risk    |
| **"Canonical business truth contracts"** | ✅ target        |

---

## Package Role

`@afenda/meta-types` is the **truth contract layer** for the entire AFENDA metadata engine.

- **Upstream** packages (`api`, `db`, `web`) depend on these contracts
- **Zero internal dependencies** — foundation tier boundary
- **98% pure types** — only essential runtime utilities
- **Multi-domain catalog** — 14 domain modules spanning ERP, events, governance

### Boundary Position

```
               ┌─────────────────┐
               │  apps/api       │ ←─┐
               │  apps/web       │   │
               └─────────────────┘   │
                       │             │
               ┌─────────────────┐   │
               │  packages/db    │   │
               │  packages/ui    │   │ all import
               └─────────────────┘   │
                       │             │
               ┌─────────────────┐   │
               │ @afenda/        │ ←─┘
               │   meta-types    │
               │   (foundation)  │
               └─────────────────┘
                  ↓ zero deps
```

---

## Package Structure

```
packages/meta-types/
├── src/
│   ├── core/
│   │   ├── index.ts               # Public API barrel
│   │   ├── types.ts               # Nominal types, deep recursion helpers, async utilities
│   │   ├── guards.ts              # Runtime type guards (isJsonObject, isJsonArray, etc.)
│   │   └── never.ts               # Exhaustiveness checking (assertNever)
│   ├── schema/
│   │   ├── index.ts               # Public API barrel
│   │   ├── types.ts               # FieldType, MetaField, ModelMeta, CrudPermissions, views
│   │   └── field-types.schema.ts # Zod runtime schemas for field types
│   ├── rbac/
│   │   ├── index.ts               # Public API barrel
│   │   ├── types.ts               # SessionContext, RbacResult
│   │   └── session.schema.ts     # Zod schemas for session context
│   ├── compiler/
│   │   ├── index.ts               # Public API barrel
│   │   ├── entity-def.ts          # ColumnType, FieldDef, EntityDef, EntityDefRegistry
│   │   ├── truth-model.ts         # TruthModel, MutationPolicyDefinition, ProjectionDefinition
│   │   ├── state-machine.ts       # StateMachineDefinition, Transition, TransitionResult
│   │   └── record-bridge.ts       # Compiler-facing entity/record bridge contracts
│   ├── module/
│   │   ├── index.ts               # Public API barrel
│   │   └── types.ts               # MetaModule, ModuleHooks, RouteDefinition, ActionDefinition
│   ├── layout/
│   │   ├── index.ts               # Public API barrel
│   │   └── types.ts               # LayoutNode, LayoutDefinition, recursive form/list layouts
│   ├── policy/
│   │   ├── index.ts               # Public API barrel
│   │   ├── types.ts               # PolicyDefinition, PolicyContext, PolicyViolation
│   │   ├── invariants.ts          # InvariantDefinition, InvariantRegistry, CrossInvariantDefinition
│   │   ├── mutation-policy.ts     # MutationPolicy, MutationOperation (event-sourcing contracts)
│   │   └── sandbox.ts             # SimulationScenario, SimulationReport, BlastRadiusResult
│   ├── audit/
│   │   ├── index.ts               # Public API barrel
│   │   └── types.ts               # AuditEntry, FieldChange, DecisionAuditEntry, MaskingRule
│   ├── events/
│   │   ├── index.ts               # Public API barrel
│   │   └── types.ts               # DomainEvent, EventReducer, EventStoreStats, AggregateSnapshot
│   ├── graph/
│   │   ├── index.ts               # Public API barrel
│   │   └── types.ts               # GraphNode, GraphEdge, TruthConflict, GraphQuery
│   ├── mesh/
│   │   ├── index.ts               # Public API barrel
│   │   └── types.ts               # MeshEvent, MeshSubscription, StreamProcessor, DeadLetterEntry
│   ├── workflow/
│   │   ├── index.ts               # Public API barrel
│   │   ├── types.ts               # WorkflowDefinition, WorkflowInstance, WorkflowStatus
│   │   └── workflow.schema.ts    # Zod schemas for workflow definitions
│   ├── platform/
│   │   ├── index.ts               # Public API barrel
│   │   ├── tenant.ts              # TenantDefinition, MetadataOverride, ResolutionContext
│   │   ├── organization.ts        # OrganizationDefinition, OrgHierarchy
│   │   ├── cache.ts               # ResolutionCacheConfig, CacheEntry, CacheStats
│   │   └── tenant.schema.ts      # Zod schemas for tenants
│   ├── inventory/
│   │   ├── index.ts               # Public API barrel
│   │   ├── types.ts               # WarehouseDefinition, StockMovement, InventoryItem
│   │   └── types.schema.ts       # Zod schemas for inventory
│   ├── __test__/
│   │   ├── api-contract.test.ts  # Public export surface verification
│   │   └── utils.test.ts         # Runtime utility function tests
│   └── index.ts                  # Root barrel: re-exports all domains
├── vitest.config.ts              # include: src/**/__test__/**/*.{test,spec}.*
├── package.json                  # 14 subpath exports (core, schema, rbac, etc.)
└── tsconfig.json                 # incremental: true, exclude: __test__
```

---

## Core Architecture

### 1. Truth Contract Philosophy

Every type in `@afenda/meta-types` is a **contract** between layers:

- **`api`** uses these contracts to validate input and enforce business rules
- **`db`** uses these contracts to compile database constraints and migrations
- **`web`** uses these contracts to render type-safe UIs
- **`truth-test`** uses these contracts to generate invariant tests

**Immutability Principle:** A breaking change in `@afenda/meta-types` requires a major version bump and coordinated migration across all consuming packages.

---

### 2. Domain Catalog

`@afenda/meta-types` is organized into 14 specialized domains:

| Domain        | Subpath                        | Purpose                                         | Runtime Exports                |
| ------------- | ------------------------------ | ----------------------------------------------- | ------------------------------ |
| **core**      | `@afenda/meta-types/core`      | Foundation types, guards, never                 | ✅ 4 functions + 1 class       |
| **schema**    | `@afenda/meta-types/schema`    | Field types, model metadata, views, permissions | ✅ Zod schemas                 |
| **rbac**      | `@afenda/meta-types/rbac`      | Session context, RBAC evaluation results        | ✅ Zod schemas                 |
| **compiler**  | `@afenda/meta-types/compiler`  | Entity defs, truth model, state machines        | ❌ Pure types                  |
| **module**    | `@afenda/meta-types/module`    | Plugin architecture, hooks, actions, widgets    | ❌ Pure types                  |
| **layout**    | `@afenda/meta-types/layout`    | Recursive form/list/kanban layout DSL           | ❌ Pure types                  |
| **policy**    | `@afenda/meta-types/policy`    | Business rules, invariants, mutation policies   | ❌ Pure types                  |
| **audit**     | `@afenda/meta-types/audit`     | Change tracking, masking, decision audits       | ✅ DEFAULT_MASKING_RULES const |
| **events**    | `@afenda/meta-types/events`    | Domain events, reducers, snapshots              | ❌ Pure types                  |
| **graph**     | `@afenda/meta-types/graph`     | Business Truth Graph, nodes, edges              | ✅ TRUTH_PRIORITY const        |
| **mesh**      | `@afenda/meta-types/mesh`      | Event mesh, pub/sub, streams                    | ❌ Pure types                  |
| **workflow**  | `@afenda/meta-types/workflow`  | Workflow state machines, step definitions       | ✅ Zod schemas                 |
| **platform**  | `@afenda/meta-types/platform`  | Tenant, organization, cache                     | ✅ Zod schemas                 |
| **inventory** | `@afenda/meta-types/inventory` | Warehouse, stock movements, items               | ✅ Zod schemas                 |

---

### 3. Subpath Exports Strategy

Each domain is exposed as a **subpath export** for selective import:

```typescript
// Core utilities
import { isJsonObject, assertNever } from "@afenda/meta-types/core";

// Schema types
import type { ModelMeta, MetaField } from "@afenda/meta-types/schema";

// Event contracts
import type { DomainEvent } from "@afenda/meta-types/events";

// Workflow types
import type { WorkflowDefinition } from "@afenda/meta-types/workflow";

// Full barrel (all types)
import type { TruthModel, InvariantDefinition } from "@afenda/meta-types";
```

**Tree-shaking:** Consumers import only what they need. No bloat.

---

### 4. Type Export Taxonomy

`@afenda/meta-types` exports ~90 types across 5 categories:

#### 4.1 Entity & Field Definitions

**Purpose:** Define the structure of business entities (models)

- `EntityDef`, `FieldDef`, `ColumnType`, `ColumnRef`
- `MetaField`, `ModelMeta`, `MetaViews`
- `FieldType`, `RelationConfig`, `ComputeConfig`

**Consumer:** `packages/db` (schema compiler), `apps/api` (metadata resolver)

#### 4.2 Business Logic Contracts

**Purpose:** Encode invariants, policies, state transitions

- `InvariantDefinition`, `InvariantRegistry`, `CrossInvariantDefinition`
- `PolicyDefinition`, `PolicyContext`, `PolicyViolation`
- `StateMachineDefinition`, `Transition`, `TransitionResult`
- `MutationPolicyDefinition` (direct, dual-write, event-only)

**Consumer:** `apps/api` (policy engine), `packages/truth-test` (auto-generated tests)

#### 4.3 Event Sourcing & Projection

**Purpose:** Event-driven architecture and read models

- `DomainEvent`, `EventMetadata`, `EventReducer`
- `ProjectionDefinition`, `ProjectionConsistency`
- `AggregateSnapshot`, `EventStoreStats`

**Consumer:** `apps/api` (event store), `packages/db` (projection materialization)

#### 4.4 Layout & Presentation

**Purpose:** UI rendering contracts

- `LayoutNode`, `LayoutDefinition`, `ResolvedLayout`
- `LayoutSection`, `LayoutGrid`, `LayoutTab`, `LayoutField`
- `MetaFormView`, `MetaListView`, `MetaKanbanView`, `MetaDashboardView`

**Consumer:** `apps/web` (dynamic form/list renderer)

#### 4.5 Multi-Tenant Governance

**Purpose:** Tenant customization and resolution

- `TenantDefinition`, `MetadataOverride`, `ResolutionContext`
- `TenantIsolationStrategy`, `OverrideScope`, `GovernanceViolation`

**Consumer:** `apps/api` (metadata resolver), `apps/web` (tenant branding)

---

### 5. Runtime Exports (Minimal)

**Design Goal:** Keep runtime footprint tiny. Most consumers only need types.

#### 5.1 Core Guards (`@afenda/meta-types/core`)

```typescript
function isJsonObject(value: unknown): value is JsonObject;
function isJsonArray(value: unknown): value is JsonArray;
function isJsonPrimitive(value: unknown): value is JsonPrimitive;
function assertNever(value: never): never;
```

**Usage:** Runtime narrowing and exhaustiveness checking in discriminated unions.

#### 5.2 Zod Schemas (`@afenda/meta-types/schema`, etc.)

```typescript
const MetaFieldSchema: z.ZodSchema<MetaField>;
const FieldTypeSchema: z.ZodSchema<FieldType>;
const ConditionExpressionSchema: z.ZodSchema<ConditionExpression>;
const SessionContextSchema: z.ZodSchema<SessionContext>;
const WorkflowDefinitionSchema: z.ZodSchema<WorkflowDefinition>;
const TenantDefinitionSchema: z.ZodSchema<TenantDefinition>;
```

**Usage:** Request validation in `apps/api`, safe parsing of metadata JSON.

#### 5.3 Constants

```typescript
// @afenda/meta-types/audit
const DEFAULT_MASKING_RULES: Record<SensitivityLevel, MaskingRule>;

// @afenda/meta-types/graph
const TRUTH_PRIORITY: Record<string, number>;
```

**Usage:** Default governance policies for auditing and truth resolution.

#### 5.4 Cache Service (`@afenda/meta-types/platform`)

```typescript
class ResolutionCache<T> {
  get(key: string): T | undefined;
  set(key: string, value: T, dependencies: string[]): void;
  invalidateByDependency(dep: string): void;
  invalidateByTenant(tenantId: string): void;
  getStats(): CacheStats;
}

const ResolutionCacheService = {
  getGlobalResolutionCache: () => ResolutionCache<ModelMeta>,
};
```

**Usage:** LRU cache with dependency tracking for metadata resolution (tenant-aware).

---

## Truth Primitives Taxonomy

### Entities

Structural business objects with fields, constraints, and relationships.

- `EntityDef` — compiler-facing schema
- `ModelMeta` — runtime metadata
- `MetaField` — field definition with type, validation, i18n, audit config

### Events

Immutable records of business facts (event sourcing).

- `DomainEvent` — aggregateType, aggregateId, eventType, payload, timestamp
- `EventReducer` — `(state, event) => state`
- `AggregateSnapshot` — optimized state checkpoint

### Invariants

Non-negotiable business rules that must always hold.

- `InvariantDefinition` — condition, severity, triggerOn
- `InvariantScope` — entity, aggregate, cross-aggregate, global
- `CrossInvariantDefinition` — multi-entity constraints with join paths

### Transitions

Allowed lifecycle state changes (state machines).

- `StateMachineDefinition` — states, initialState, terminalStates, transitions
- `Transition` — from → event → to (with guards, emits)
- `TransitionResult` — success, guardViolations, emittedEvents

### Relationships

Graph edges connecting truth across modules.

- `GraphNode` — id, type, data, truthPriority, updatedAt
- `GraphEdge` — id, type, fromId, toId, properties
- `TruthConflict` — resolution strategy (highest_priority, latest_timestamp)

---

## Design Patterns

### 1. Branded Types (Nominal Typing)

```typescript
import type { Brand } from "@afenda/meta-types/core";

type UserId = Brand<string, "UserId">;
type OrderId = Brand<string, "OrderId">;

declare const uid: UserId;
declare function processOrder(id: OrderId): void;

processOrder(uid); // ❌ TS error — UserId ≠ OrderId
```

**Prevents:** Mixing structurally identical but semantically different values.

### 2. Condition Expression DSL

```typescript
import type { ConditionExpression } from "@afenda/meta-types/schema";

const condition: ConditionExpression = {
  operator: "and",
  conditions: [
    { field: "status", operator: "eq", value: "draft" },
    { field: "amount", operator: "gt", value: 1000 },
  ],
};
```

**Powers:** Field visibility, readiness, requirement rules in dynamic forms.

### 3. State Machine Transitions

```typescript
import type { StateMachineDefinition } from "@afenda/meta-types/compiler";

const orderStateMachine: StateMachineDefinition = {
  model: "salesOrder",
  stateField: "status",
  states: ["draft", "submitted", "approved", "rejected", "cancelled"],
  initialState: "draft",
  terminalStates: ["approved", "rejected", "cancelled"],
  transitions: [
    { from: "draft", event: "submit", to: "submitted" },
    { from: "submitted", event: "approve", to: "approved", guards: ["has_manager_approval"] },
    { from: "submitted", event: "reject", to: "rejected", emits: ["OrderRejected"] },
  ],
  tenantExtensible: true,
};
```

**Enables:** Entity lifecycle enforcement without hard-coded workflow logic.

### 4. Event Sourcing

```typescript
import type { DomainEvent, EventReducer } from "@afenda/meta-types/events";

type OrderState = { id: string; status: string; total: number };

const orderReducer: EventReducer<OrderState> = (state, event) => {
  switch (event.eventType) {
    case "OrderCreated":
      return { id: event.aggregateId, status: "draft", total: 0 };
    case "OrderItemAdded":
      return { ...state, total: state.total + event.payload.price };
    case "OrderSubmitted":
      return { ...state, status: "submitted" };
    default:
      return state;
  }
};
```

**Powers:** Rebuild state from history, temporal queries, audit trails.

### 5. Multi-Tenant Resolution Stack

```typescript
import type { ResolutionContext, MetadataOverride } from "@afenda/meta-types/platform";

const context: ResolutionContext = {
  tenantId: "acme-corp",
  industry: "manufacturing",
  departmentId: "sales-na",
  userId: "user-123",
};

// Metadata resolution stack (lowest layer wins):
// Global → Industry → Tenant → Department → User

const overrides: MetadataOverride[] = [
  { model: "salesOrder", field: "priority", priority: 1, overrideType: "hidden" },
  { model: "salesOrder", field: "discount", priority: 2, overrideType: "required" },
];
```

**Enables:** One platform, infinite enterprise variations without code changes.

---

## Consumer Map

### `packages/db` (Data Layer)

**Imports:**

- `EntityDef`, `EntityDefRegistry`, `ColumnType`, `FieldDef`
- `StateMachineDefinition`, `InvariantDefinition`
- `ProjectionDefinition`, `DomainEvent`

**Usage:**

- Schema compiler: `EntityDef` → Drizzle schema + migrations
- State machine triggers: enforce transitions at DB level
- Invariant compilation: CHECK constraints and triggers
- Projection materialization: event → read model

### `apps/api` (Backend)

**Imports:**

- `ModelMeta`, `MetaField`, `MetaViews`, `CrudPermissions`
- `SessionContext`, `RbacResult`
- `TruthModel`, `InvariantDefinition`, `PolicyDefinition`
- `WorkflowDefinition`, `WorkflowInstance`, `DomainEvent`
- `ResolutionContext`, `TenantDefinition`

**Usage:**

- Metadata resolver: load tenant-specific `ModelMeta`
- Policy engine: evaluate `InvariantDefinition` + `PolicyDefinition`
- Workflow orchestrator: execute `WorkflowDefinition` steps
- Event store: append `DomainEvent` to event log
- RBAC: evaluate `SessionContext` → `RbacResult`

### `apps/web` (Frontend)

**Imports:**

- `ModelMeta`, `MetaField`, `MetaFormView`, `MetaListView`, `MetaKanbanView`
- `LayoutDefinition`, `LayoutNode`
- `SessionContext`, `CrudPermissions`
- `WorkflowStatus`, `WorkflowStepExecution`

**Usage:**

- Dynamic form renderer: `ModelMeta` + `LayoutDefinition` → form UI
- List view: `MetaListView` → column config, sorting, filtering
- Workflow UI: `WorkflowInstance` → step progress bar
- Tenant branding: `TenantDefinition` → custom logo, colors

### `packages/truth-test` (Testing)

**Imports:**

- `TruthModel`, `InvariantDefinition`, `StateMachineDefinition`
- `DomainEvent`, `EventReducer`
- `PolicyDefinition`, `MutationPolicyDefinition`

**Usage:**

- Auto-generate tests: `StateMachineDefinition` → transition test matrix
- Invariant tests: `InvariantDefinition` → assertion tests
- Event replay: `EventReducer` → projection verification

---

## Testing Strategy

### 1. Contract Tests

**Purpose:** Ensure public API surface remains stable.

```typescript
// src/__test__/api-contract.test.ts
describe("public api contract", () => {
  it("matches runtime public export surface", () => {
    const exportNames = sorted(Object.keys(publicApi));
    expect(exportNames).toMatchInlineSnapshot(`
      ["assertNever", "isJsonArray", "isJsonObject", "isJsonPrimitive"]
    `);
  });

  it("tracks barrel exports for type and runtime symbols", async () => {
    const exportLines = /* read index.ts */;
    expect(exportLines).toMatchInlineSnapshot(`
      ["export * from './core/index.js'", ...]
    `);
  });
});
```

**Fails if:** New runtime export added without test update (intentional gate).

### 2. Runtime Guard Tests

**Purpose:** Verify type guards work correctly at runtime.

```typescript
// src/__test__/utils.test.ts
describe("type guards", () => {
  it("isJsonObject", () => {
    expect(isJsonObject({})).toBe(true);
    expect(isJsonObject([])).toBe(false);
    expect(isJsonObject(null)).toBe(false);
  });

  it("isJsonArray", () => {
    expect(isJsonArray([])).toBe(true);
    expect(isJsonArray({})).toBe(false);
  });

  it("isJsonPrimitive", () => {
    expect(isJsonPrimitive("hello")).toBe(true);
    expect(isJsonPrimitive(42)).toBe(true);
    expect(isJsonPrimitive(null)).toBe(true);
    expect(isJsonPrimitive({})).toBe(false);
  });
});
```

### 3. Zod Schema Validation (Downstream)

Zod schemas are tested by consumers (`apps/api`) via request validation.

**Example:**

```typescript
import { MetaFieldSchema } from "@afenda/meta-types/schema";

const result = MetaFieldSchema.safeParse(inputField);
if (!result.success) {
  return { error: result.error };
}
```

---

## Build & Deployment

### TypeScript Compilation

```bash
pnpm --filter @afenda/meta-types build
```

**Output:** `dist/` contains `.js` and `.d.ts` files for all 14 subpath exports.

### Type Checking

```bash
pnpm --filter @afenda/meta-types typecheck
```

**Ensures:** All internal cross-references are valid.

### Testing

```bash
pnpm --filter @afenda/meta-types test
```

**Runs:** 2 contract tests + runtime guard tests.

---

## Governance Rules

### 1. Zero Internal Dependencies

❌ **FORBIDDEN:**

```typescript
import { SomeType } from "@afenda/db";
import { myFunction } from "@afenda/ui";
```

✅ **ALLOWED:**

```typescript
import type { JsonValue } from "./core/types.js";
```

### 2. Breaking Changes Require Major Version

**Breaking changes:**

- Removing a type export
- Renaming a field in a type
- Changing a type from optional to required
- Removing a subpath export

**Non-breaking changes:**

- Adding a new type export
- Adding optional fields to existing types
- Adding new subpath exports

### 3. Runtime Exports Require Justification

**Before adding runtime code:**

- Is this truly foundational? (e.g., `isJsonObject`)
- Can consumers implement it themselves? (prefer no)
- Does it have zero dependencies? (must be yes)

---

## Import Strategy

Prefer selective subpath imports over the barrel for tree-shaking and clear domain boundaries:

```typescript
import type { ModelMeta } from "@afenda/meta-types/schema";
import type { DomainEvent } from "@afenda/meta-types/events";
import type { InvariantDefinition } from "@afenda/meta-types/policy";
```

The full barrel (`@afenda/meta-types`) is available when importing across multiple domains.

---

## Future Roadmap

### Phase 3: OpenAPI Schema Generation

**Goal:** Auto-generate OpenAPI specs from `ModelMeta` + `MetaViews`.

**Contracts:**

- `OpenApiSchema` — OpenAPI 3.1 JSON schema
- `ApiEndpointDefinition` — path, method, params, responses

### Phase 4: GraphQL Schema Generation

**Goal:** Auto-generate GraphQL schema from `EntityDef` + `RelationConfig`.

**Contracts:**

- `GraphQLTypeDefinition` — type, fields, resolvers
- `GraphQLQueryDefinition` — query, args, return type

### Phase 5: Proto/gRPC Schema Generation

**Goal:** Enable cross-service event streaming via gRPC.

**Contracts:**

- `ProtoMessage` — Protobuf message definition
- `GrpcServiceDefinition` — service, rpcs, streams

---

## Summary

`@afenda/meta-types` is the **canonical business truth contract** for the AFENDA platform.

- **Foundation tier** — zero internal dependencies
- **14 domain modules** — core, schema, rbac, compiler, module, layout, policy, audit, events, graph, mesh, workflow, platform, inventory
- **~90 type exports** — entities, events, invariants, transitions, relationships
- **Minimal runtime** — 4 guards + cache service + Zod schemas + 2 consts
- **Multi-tenant ready** — resolution stack, governance, customization
- **Event-sourcing ready** — DomainEvent, reducers, projections, snapshots
- **Truth-test integration** — auto-generates invariant + state machine tests

**Consumers:** `apps/api`, `apps/web`, `packages/db`, `packages/ui`, `packages/truth-test`

**Tests:** 2 contract tests, all passing. No blockers.
