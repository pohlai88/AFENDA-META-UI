# @afenda/meta-types

Canonical business truth contracts for the AFENDA metadata engine — entities, events, invariants, state transitions, and governance primitives.

**Foundation tier** — zero internal dependencies, consumed by all upstream packages.

---

## Quick Start

### Installation (within monorepo)

```json
// package.json
{
  "dependencies": {
    "@afenda/meta-types": "workspace:*"
  }
}
```

### Import Strategies

#### Strategy A — Barrel Import (All Types)

```typescript
import type {
  ModelMeta,
  DomainEvent,
  InvariantDefinition,
  WorkflowDefinition,
} from "@afenda/meta-types";
```

**Use when:** You need types from multiple domains.

#### Strategy B — Subpath Imports (Selective)

```typescript
// Core utilities
import { isJsonObject, assertNever } from "@afenda/meta-types/core";

// Schema types
import type { ModelMeta, MetaField } from "@afenda/meta-types/schema";

// Event contracts
import type { DomainEvent } from "@afenda/meta-types/events";

// Policy contracts
import type { InvariantDefinition } from "@afenda/meta-types/policy";

// Workflow types
import type { WorkflowDefinition } from "@afenda/meta-types/workflow";
```

**Use when:** You want tree-shaking and clear domain boundaries.

---

## Available Subpath Exports

| Subpath                        | Purpose                                   | Runtime Exports                |
| ------------------------------ | ----------------------------------------- | ------------------------------ |
| `@afenda/meta-types`           | Full barrel (all domains)                 | ✅ All runtime exports         |
| `@afenda/meta-types/core`      | Foundation types, guards, never           | ✅ 4 functions + 1 class       |
| `@afenda/meta-types/schema`    | Field types, model metadata, views        | ✅ Zod schemas                 |
| `@afenda/meta-types/rbac`      | Session context, RBAC evaluation          | ✅ Zod schemas                 |
| `@afenda/meta-types/compiler`  | Entity defs, truth model, state machines  | ❌ Pure types                  |
| `@afenda/meta-types/module`    | Plugin architecture, hooks, actions       | ❌ Pure types                  |
| `@afenda/meta-types/layout`    | Form/list/kanban layout DSL               | ❌ Pure types                  |
| `@afenda/meta-types/policy`    | Invariants, policies, mutation policies   | ❌ Pure types                  |
| `@afenda/meta-types/audit`     | Change tracking, masking, decision audits | ✅ DEFAULT_MASKING_RULES const |
| `@afenda/meta-types/events`    | Domain events, reducers, snapshots        | ❌ Pure types                  |
| `@afenda/meta-types/graph`     | Business Truth Graph, nodes, edges        | ✅ TRUTH_PRIORITY const        |
| `@afenda/meta-types/mesh`      | Event mesh, pub/sub, streams              | ❌ Pure types                  |
| `@afenda/meta-types/workflow`  | Workflow state machines, definitions      | ✅ Zod schemas                 |
| `@afenda/meta-types/platform`  | Tenant, organization, cache               | ✅ Zod schemas + cache service |
| `@afenda/meta-types/inventory` | Warehouse, stock movements, items         | ✅ Zod schemas                 |

---

## Core Domains

### 1. Core — Foundation Types

**Subpath:** `@afenda/meta-types/core`

```typescript
import { isJsonObject, isJsonArray, isJsonPrimitive, assertNever } from "@afenda/meta-types/core";

import type {
  Brand,
  Opaque,
  DeepPartial,
  DeepReadonly,
  NonEmptyArray,
  MaybePromise,
} from "@afenda/meta-types/core";

// Branded types (nominal typing)
type UserId = Brand<string, "UserId">;
type OrderId = Brand<string, "OrderId">;

// Runtime type guards
if (isJsonObject(value)) {
  // value is Record<string, JsonValue>
}

// Exhaustiveness checking
function handleStatus(status: "draft" | "submitted") {
  switch (status) {
    case "draft":
      return "Draft";
    case "submitted":
      return "Submitted";
    default:
      return assertNever(status); // TS error if cases incomplete
  }
}
```

---

### 2. Schema — Model Metadata

**Subpath:** `@afenda/meta-types/schema`

```typescript
import type {
  ModelMeta,
  MetaField,
  MetaViews,
  FieldType,
  CrudPermissions,
  ConditionExpression,
} from "@afenda/meta-types/schema";

import { MetaFieldSchema, FieldTypeSchema } from "@afenda/meta-types/schema";

// Define a model
const customerModel: ModelMeta = {
  name: "customer",
  label: "Customer",
  description: "Customer master data",
  fields: [
    {
      name: "name",
      label: "Name",
      type: "string",
      required: true,
      maxLength: 200,
    },
    {
      name: "email",
      label: "Email",
      type: "string",
      required: true,
      unique: true,
      businessType: "email",
    },
    {
      name: "creditLimit",
      label: "Credit Limit",
      type: "numeric",
      required: false,
      compute: {
        expression: "baseLimit * riskMultiplier",
        dependencies: ["baseLimit", "riskMultiplier"],
      },
    },
  ],
  views: {
    form: {
      tabs: [
        /* ... */
      ],
    },
    list: {
      columns: [
        /* ... */
      ],
    },
    kanban: { groupBy: "status" },
  },
  permissions: {
    roleMap: {
      admin: { create: true, read: true, update: true, delete: true },
      user: { create: false, read: true, update: false, delete: false },
    },
  },
};

// Runtime validation
const result = MetaFieldSchema.safeParse(inputField);
```

**Powers:** Dynamic form generation, list views, metadata-driven UIs.

---

### 3. RBAC — Session & Authorization

**Subpath:** `@afenda/meta-types/rbac`

```typescript
import type { SessionContext, RbacResult } from "@afenda/meta-types/rbac";
import { SessionContextSchema } from "@afenda/meta-types/rbac";

// Session context (injected per request)
const session: SessionContext = {
  uid: "auth0|123",
  userId: "user-123",
  roles: ["sales-manager", "user"],
  lang: "en",
  timezone: "America/New_York",
  tenantId: "acme-corp",
  departmentId: "sales-na",
  industry: "manufacturing",
};

// RBAC evaluation result
const rbacResult: RbacResult = {
  allowedOps: { create: true, read: true, update: true, delete: false },
  visibleFields: ["name", "email", "creditLimit"],
  writableFields: ["name", "email"],
};
```

**Powers:** Role-based access control, field-level permissions.

---

### 4. Events — Event Sourcing

**Subpath:** `@afenda/meta-types/events`

```typescript
import type {
  DomainEvent,
  EventReducer,
  AggregateSnapshot,
  EventQuery,
  EventStoreStats,
} from "@afenda/meta-types/events";

// Domain event
const event: DomainEvent = {
  id: "evt-123",
  aggregateType: "salesOrder",
  aggregateId: "order-456",
  eventType: "OrderCreated",
  payload: {
    customerId: "cust-789",
    items: [{ productId: "prod-111", quantity: 2 }],
    total: 199.99,
  },
  metadata: {
    actor: "user-123",
    correlationId: "req-abc",
    source: "api",
  },
  version: 1,
  timestamp: "2026-01-15T10:30:00Z",
};

// Event reducer
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

// Replay events to rebuild state
const currentState = events.reduce(orderReducer, initialState);
```

**Powers:** Audit trails, temporal queries, event replay, projections.

---

### 5. Policy — Business Rules

**Subpath:** `@afenda/meta-types/policy`

```typescript
import type {
  InvariantDefinition,
  PolicyDefinition,
  CrossInvariantDefinition,
  MutationPolicyDefinition,
} from "@afenda/meta-types/policy";

// Entity invariant
const creditLimitInvariant: InvariantDefinition = {
  id: "inv-credit-limit",
  description: "Credit limit must be positive",
  targetModel: "customer",
  scope: "entity",
  severity: "error",
  condition: {
    operator: "or",
    conditions: [
      { field: "creditLimit", operator: "isNull" },
      { field: "creditLimit", operator: "gte", value: 0 },
    ],
  },
  triggerOn: ["create", "update"],
  tenantOverridable: false,
};

// Cross-entity invariant
const orderCustomerInvariant: CrossInvariantDefinition = {
  id: "inv-order-customer-active",
  description: "Cannot place order for inactive customer",
  involvedModels: ["salesOrder", "customer"],
  severity: "fatal",
  condition: {
    operator: "eq",
    field: "customer.status",
    value: "active",
  },
  joinPaths: [
    { fromModel: "salesOrder", fromField: "customerId", toModel: "customer", toField: "id" },
  ],
  executionKind: "check",
  dependsOn: [],
  triggerOn: ["create", "update"],
  tenantOverridable: false,
};
```

**Powers:** Compile-time invariants, runtime policy enforcement, mutation strategies.

---

### 6. Workflow — State Machines

**Subpath:** `@afenda/meta-types/workflow`

```typescript
import type {
  WorkflowDefinition,
  WorkflowInstance,
  WorkflowStep,
  WorkflowStatus,
} from "@afenda/meta-types/workflow";

// Workflow definition
const approvalWorkflow: WorkflowDefinition = {
  id: "wf-po-approval",
  name: "Purchase Order Approval",
  trigger: "PurchaseOrderSubmitted",
  condition: "amount > 10000",
  steps: [
    {
      id: "step-mgr-approval",
      label: "Manager Approval",
      type: "approval",
      config: { role: "manager", timeoutHours: 24 },
      nextStepId: "step-fin-approval",
      elseStepId: "step-rejected",
    },
    {
      id: "step-completed",
      label: "Approved",
      type: "action",
      config: { action: "markApproved" },
      terminal: true,
    },
  ],
  initialStepId: "step-mgr-approval",
  enabled: true,
  tenantId: null,
};
```

**Powers:** Metadata-driven workflows, no code deployments for workflow changes.

---

### 7. Platform — Multi-Tenant Governance

**Subpath:** `@afenda/meta-types/platform`

```typescript
import type {
  TenantDefinition,
  MetadataOverride,
  ResolutionContext,
} from "@afenda/meta-types/platform";

import { TenantDefinitionSchema } from "@afenda/meta-types/platform";
import { ResolutionCacheService } from "@afenda/meta-types/platform";

// Tenant definition
const tenant: TenantDefinition = {
  id: "acme-corp",
  name: "ACME Corporation",
  isolationStrategy: "logical",
  industry: "manufacturing",
  branding: {
    logo: "https://cdn.acme.com/logo.png",
    primaryColor: "#1E3A8A",
    secondaryColor: "#3B82F6",
  },
  overrides: [
    {
      model: "salesOrder",
      field: "priority",
      overrideType: "hidden",
      scope: "tenant",
      priority: 5,
    },
  ],
  enabledModules: ["sales", "inventory", "finance"],
  featureFlags: { enableWorkflows: true, enableAudit: true },
};

// Resolution cache (LRU with dependency tracking)
const cache = ResolutionCacheService.getGlobalResolutionCache();
const cachedMeta = cache.get("customer|acme-corp|sales-na");
```

**Powers:** White-label multi-tenant SaaS, metadata customization per tenant.

---

## Testing

```bash
# Run tests
pnpm --filter @afenda/meta-types test

# Type checking
pnpm --filter @afenda/meta-types typecheck

# Build
pnpm --filter @afenda/meta-types build
```

**Test Coverage:** 2 contract tests + runtime guard tests, all passing.

---

## Consumer Examples

### Dynamic Form Renderer (`apps/web`)

```typescript
import type { ModelMeta, LayoutDefinition } from "@afenda/meta-types";

async function renderForm(modelName: string, session: SessionContext) {
  const meta: ModelMeta = await fetchMetadata(modelName, session.tenantId);
  const layout: LayoutDefinition = await fetchLayout(modelName, session.tenantId);
  return <DynamicForm meta={meta} layout={layout} session={session} />;
}
```

### Policy Engine (`apps/api`)

```typescript
import type { InvariantDefinition } from "@afenda/meta-types/policy";

async function validateMutation(model: string, record: Record<string, unknown>) {
  const invariants: InvariantDefinition[] = await loadInvariants(model);
  for (const inv of invariants) {
    const result = evaluateCondition(inv.condition, record);
    if (!result) throw new InvariantViolationError(inv.id, inv.description);
  }
}
```

### Schema Compiler (`packages/db`)

```typescript
import type { EntityDef, StateMachineDefinition } from "@afenda/meta-types/compiler";

function compileEntity(entityDef: EntityDef) {
  return pgTable(entityDef.table, {
    id: uuid("id").primaryKey().defaultRandom(),
    name: text("name").notNull(),
  });
}
```

---

## Adding a New Domain

1. Create `src/<domain>/` folder
2. Create `types.ts` with TypeScript interfaces
3. Optionally create `types.schema.ts` with Zod runtime schemas
4. Create `index.ts` barrel that re-exports from `types.ts` (and schema if present)
5. Add package.json subpath export for `./<domain>`
6. Add barrel re-export in `src/index.ts`
7. Run `pnpm --filter @afenda/meta-types gate:export-snapshot` and update snapshots

**Example:** See `src/inventory/` for a complete reference domain.

---

## Related Documentation

- [ARCHITECTURE.md](./ARCHITECTURE.md) — Full architectural design document
- [../../docs/TYPESCRIPT_EXPORTS.md](../../docs/TYPESCRIPT_EXPORTS.md) — Monorepo export conventions
- [../truth-test/ARCHITECTURE.md](../truth-test/ARCHITECTURE.md) — Truth testing infrastructure
- [../db/README.md](../db/README.md) — Database schema compiler

---

## Contract Stability Policy

1. Mark legacy contracts with `@deprecated` and a replacement path
2. Keep deprecated contracts for at least one minor release cycle
3. Remove only in major-version changes with migration notes
4. Breaking changes require major version bump

---

## Version

**Current:** `0.1.0` (monorepo version)

**Stability:** Production-ready foundation layer

**Tests:** 2 passing (contract + runtime guards)

**Build:** ✅ TypeScript clean, zero errors
