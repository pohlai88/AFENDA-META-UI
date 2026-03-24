# Phase 4: Business Truth Engine — Control Plane & Scale

**Date**: 2026-03-25  
**Status**: 🚀 **PLANNING**  
**Prerequisite**: Phase 3 Complete (Tenant-Aware Metadata Resolution)

---

## Strategic Context

Phase 3 established the **central nervous system** — the wiring that makes all modules speak to each other as one platform.

Phase 4 adds **eyes, hands, and voice**:

- **Eyes** — Audit Fabric (observability into business logic execution)
- **Hands** — Resolution Caching Layer (computational efficiency at scale)  
- **Voice** — Admin Control Plane (non-technical business users own the system)
- **Tools** — GraphQL Surface (unified client access to the graph)

---

## Delivery Architecture

Current State:

```
┌─────────────────────────────────────────────────────────┐
│  Business Truth Engine (Phase 3 Complete)              │
│                                                          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐ │
│  │   Metadata   │  │   Workflow   │  │  Rules/      │ │
│  │  Resolution  │  │   Engine     │  │  Policy      │ │
│  └──────────────┘  └──────────────┘  └──────────────┘ │
│                                                          │
│  ╔════════════════════════════════════════════════════╗ │
│  ║  Tenant Context Middleware (Enforces Boundaries)  ║ │
│  ╚════════════════════════════════════════════════════╝ │
│                                                          │
│  ╔════════════════════════════════════════════════════╗ │
│  ║  Event Mesh (Business Events)                      ║ │
│  ╚════════════════════════════════════════════════════╝ │
└─────────────────────────────────────────────────────────┘
```

Phase 4 adds:

```
┌─────────────────────────────────────────────────────────┐
│  ADMIN CONTROL PLANE (NEW)                             │
│  (Tenant Overrides / Workflow Definitions / Rules)     │
└─────────────────────────────────────────────────────────┘
        ↓         ↑
        │         │
        │   ┌─────────────────────┐
        │───┤ Resolution Cache    │ (NEW)
        │   │ (99% Hit Optimized) │  
        │   └─────────────────────┘
        │         ↑
┌──────────────────────────────────┐
│  GRAPHQL SURFACE LAYER (NEW)     │
│  (Unified Client Access)         │  Connected to ┐
└──────────────────────────────────┘             │
        ↑                                        │
        │                                        │
    ┌──────────────────────────────────────────┴──┐
    │  HTTP REST API (Phase 3)                    │
    └─────────────────────────────────────────────┘
        ↕
    ┌──────────────────────────────────────────────────┐
    │  AUDIT FABRIC (NEW)                             │
    │  (Determinism Verification + Compliance Trail)  │
    │                                                 │
    │  • Metadata Resolution Decisions                │
    │  • Rule Evaluations                             │
    │  • Workflow Transitions                         │
    │  • Event Propagation Chains                     │
    └──────────────────────────────────────────────────┘
```

---

## Priority Roadmap

### 🥇 Priority 1: Audit Fabric

**Impact**: Compliance + Enterprise Trust + Debugging  
**Effort**: Medium  
**Timeline**: Weeks 1-2

#### What it does

Captures every deterministic decision the platform makes:

```
Event Published
  ↓ (log)
Workflow Triggered
  ↓ (log)
Tenant Context Resolved
  ↓ (log)
Metadata Applied (layer by layer)
  ↓ (log)
Rules Evaluated
  ↓ (log)
Policy Enforced
  ↓ (log)
Layout Rendered
```

Complete chain → can replay, debug, audit, prove compliance.

#### Implementation

**1. Audit Event Schema**

```typescript
// packages/meta-types/src/audit.ts

interface AuditLogEntry {
  id: string;
  timestamp: ISO8601;
  tenantId: string;
  userId?: string;
  
  eventType: 
    | "metadata_resolved"
    | "rule_evaluated"
    | "policy_enforced"
    | "workflow_transitioned"
    | "event_propagated";
    
  scope: string;  // "model.field.action"
  context: {
    model?: string;
    field?: string;
    workflowId?: string;
    eventId?: string;
  };
  
  decision: {
    input: Record<string, unknown>;
    output: Record<string, unknown>;
    reasoning?: string;  // Why this outcome
    layers?: string[];   // Which tenant layers applied
  };
  
  durationMs: number;
  status: "success" | "error";
}
```

**2. Capture Points**

Inject logging at:
- `resolveMetadata()` — Log each layer applied
- `evaluateRule()` — Log rule trigger + result
- `evaluatePoliciesWithTenantContext()` — Log policy enforcement
- Workflow engine — Log state transitions
- Event mesh — Log event propagation

**3. Storage**

```typescript
// apps/api/src/audit/index.ts

interface AuditLog {
  write(entry: AuditLogEntry): Promise<void>;
  query(filters: {
    tenantId: string;
    eventType?: string;
    dateRange?: [Date, Date];
    limit?: number;
  }): Promise<AuditLogEntry[]>;
}

// Implementation: Use ERP event mesh
// Every audit entry IS a business event
```

**4. Query Endpoints**

```
GET /api/audit/logs
  ?tenantId=acme-corp
  &eventType=metadata_resolved
  &dateRange[start]=2026-03-25T00:00:00Z
  &dateRange[end]=2026-03-25T23:59:59Z
  &limit=1000

GET /api/audit/chain/:eventId
  Returns complete decision chain for an event
```

**5. Verification View**

For a given resolved layout, show:

```json
{
  "layoutId": "invoice-detail",
  "resolvedAt": "2026-03-25T14:32:10Z",
  "auditChain": [
    {
      "step": 1,
      "type": "metadata_resolved",
      "scope": "invoice.layout",
      "layersApplied": ["global", "industry:manufacturing", "tenant:acme-corp"],
      "changes": [
        { "path": "sections[0].label", "from": "Invoice Details", "to": "Manufacturing Invoice" }
      ]
    },
    {
      "step": 2,
      "type": "rule_evaluated",
      "scope": "invoice.visibility.line_item_tax_code",
      "condition": "isFieldVisible && user.roles.includes('finance')",
      "result": true
    },
    {
      "step": 3,
      "type": "policy_enforced",
      "scope": "invoice.field.amount",
      "policy": "maximum_invoice_amount_10k",
      "enforcementLevel": "warning"
    }
  ]
}
```

**Files to create/modify:**
- `packages/meta-types/src/audit.ts` — Audit schema
- `apps/api/src/audit/index.ts` — Audit log interface + implementation
- `apps/api/src/routes/audit.ts` — HTTP handlers
- `apps/api/src/tenant/index.ts` — Add logging to `resolveMetadata()`
- `apps/api/src/rules/index.ts` — Add logging to `evaluateRule()`
- `apps/api/src/policy/policyEvaluator.ts` — Add logging to policy enforcement

---

### 🥈 Priority 2: Resolution Caching Layer

**Impact**: 90% reduction in metadata resolution compute cost  
**Effort**: Low  
**Timeline**: Week 2

#### What it does

```
ResolutionContext Hash → Cached Resolved Metadata
```

For identical resolution contexts, return cached result instead of recomputing layers.

#### Implementation

**1. Cache Key Function**

```typescript
// apps/api/src/tenant/cache.ts

function resolutionCacheKey(
  model: string,
  context: ResolutionContext,
): string {
  return JSON.stringify({
    model,
    tenantId: context.tenantId,
    departmentId: context.departmentId,
    industry: context.industry,
    userId: context.userId,
  });
}
```

**2. Cached Resolution**

```typescript
interface ResolutionCache {
  get(key: string): Record<string, unknown> | null;
  set(key: string, value: Record<string, unknown>, ttlMs?: number): void;
  invalidate(pattern: string): void;  // Tenant/model pattern
}

function resolveMetadataWithCache(
  model: string,
  globalMeta: Record<string, unknown>,
  ctx: ResolutionContext,
  cache: ResolutionCache,
): Record<string, unknown> {
  const key = resolutionCacheKey(model, ctx);
  
  // Check cache (default TTL: 5 minutes per entry)
  const cached = cache.get(key);
  if (cached) {
    return cached;
  }
  
  // Compute if miss
  const resolved = resolveMetadata(model, globalMeta, ctx);
  
  // Store (auto-expires)
  cache.set(key, resolved, 5 * 60 * 1000);
  
  return resolved;
}
```

**3. Invalidation Strategy**

When tenant/metadata changes:

```typescript
// File: apps/api/src/tenant/management.ts

async function updateTenantMetadata(
  tenantId: string,
  model: string,
  patch: MetadataPatch,
  cache: ResolutionCache,
): Promise<void> {
  // Apply patch to database
  await db.tenantMetadata.update(tenantId, model, patch);
  
  // Invalidate all resolution caches for this tenant+model
  cache.invalidate(`${tenantId}:${model}:*`);
}
```

**4. Storage Backend Options**

- **In-Memory** (default): Fast, rebuilds on restart
- **Redis** (production): Shared across replicas, persistent TTL
- **Hybrid**: In-memory + Redis fallback

**Files to create/modify:**
- `apps/api/src/tenant/cache.ts` — Cache interface + implementation
- `apps/api/src/tenant/index.ts` — Integrate cache into `resolveMetadata()`
- `apps/api/src/tenant/management.ts` — Invalidation on updates

---

### 🥉 Priority 3: Admin Control Plane

**Impact**: Non-technical users own tenant configuration  
**Effort**: High  
**Timeline**: Weeks 3-4

#### What it does

UI + API for business users to manage:

- Tenant overrides (which metadata layers apply)
- Workflow definitions (without code)
- Rule logic (expression builder UX)
- Layout variations (drag-drop editor)
- Policy enforcement levels (tighten/loosen validation)

#### Architecture

**Backend API**

```
PUT /api/admin/tenants/:tenantId/metadata/:model
  {
    "layer": "tenant",
    "overrides": { ... }
  }

GET /api/admin/tenants/:tenantId/workflows
  Returns workflow definitions for tenant

POST /api/admin/tenants/:tenantId/workflows
  Create/deploy workflow

PUT /api/admin/tenants/:tenantId/rules/:ruleId
  Modify rule expression

PUT /api/admin/tenants/:tenantId/policies/:policyId
  Adjust enforcement level
```

**Frontend Components** (in `apps/web/src/components/admin`)

- `<MetadataOverrideEditor />` — Tenant layer management
- `<WorkflowBuilder />` — Drag-drop workflow design
- `<RuleExpressionBuilder />` — Visual expression composer
- `<LayoutVariationEditor />` — Layout override UI
- `<PolicyEnforcementControl />` — Policy severity adjuster

#### Implementation Phase

This is inherently iterative. Start with:

1. **Metadata Override UI** (Weeks 3)
   - Read current tenant metadata layers
   - Edit/save overrides for specific model + layer
   - Preview resolved metadata in real-time

2. **Rule Expression Builder** (Week 3-4)
   - Visual composer for DSL expressions
   - Dropdown for field references
   - Validation + testing UI

3. **Workflow Template Gallery** (Week 4)
   - Pre-built templates (approval chains, notifications, etc.)
   - One-click deploy to tenant

**Files to create:**
- `apps/api/src/routes/admin.ts` — Admin API handlers
- `apps/web/src/components/admin/MetadataOverrideEditor.tsx`
- `apps/web/src/components/admin/RuleExpressionBuilder.tsx`
- `apps/web/src/components/admin/WorkflowBuilder.tsx`

---

### 📊 Priority 4: GraphQL Surface Layer

**Impact**: Unified client access + reduced round-trips  
**Effort**: Medium  
**Timeline**: Week 4+

#### Why GraphQL

Your Truth Graph + Metadata Resolution + Workflow Engine = GraphQL-shaped problem.

```graphql
query GetInvoiceWithContext($tenantId: ID!, $invoiceId: ID!) {
  tenant(id: $tenantId) {
    metadata(model: "invoice") {
      # Resolved metadata for this tenant
      fields { name type visibility rules }
    }
    
    invoice(id: $invoiceId) {
      # Data shaped by layout
      id amount tax_code
      
      # Computed fields via rules
      totalTax: computed(rule: "compute_tax_amount")
      
      # Visibility via rules
      financeNotes @include(if: isFieldVisible(rule: "show_finance_notes")) {
        text author createdAt
      }
      
      # Workflow state
      workflow {
        currentState possibleTransitions
      }
    }
  }
}
```

#### Implementation

**1. Schema**

```typescript
// apps/api/src/graphql/schema.ts

export const typeDefs = `
  type Query {
    tenant(id: ID!): Tenant
    metadata(model: String!): ResolvedMetadata
    invoice(id: ID!): Invoice
  }
  
  type Tenant {
    id: ID!
    name: String!
    metadata(model: String!): ResolvedMetadata
    workflows: [Workflow!]!
    rules(scope: String!): [RuleDefinition!]!
  }
  
  type ResolvedMetadata {
    model: String!
    global: JSON
    layersApplied: [MetadataLayer!]!
    resolved: JSON
  }
  
  type Invoice {
    id: ID!
    amount: Float!
    computed(rule: String!): ComputedValue
  }
`;
```

**2. Resolvers**

```typescript
// apps/api/src/graphql/resolvers.ts

const resolvers = {
  Query: {
    tenant: (_, { id }, ctx) => getTenant(id),
    metadata: (_, { model }, ctx) => {
      const resolved = resolveMetadata(model, globalMeta, ctx.tenantContext);
      return {
        model,
        resolved,
        layersApplied: ctx.tenantContext.appliedLayers,
      };
    },
  },
  
  Invoice: {
    computed: (invoice, { rule }, ctx) => {
      return evaluateRule(rule, invoice, ctx.tenantContext);
    },
  },
};
```

**3. Route**

```typescript
// apps/api/src/routes/graphql.ts

router.post('/graphql', async (req, res) => {
  const { query, variables } = req.body;
  
  // Context includes tenantContext from middleware
  const result = await graphqlExecute(schema, query, variables, {
    req,
    tenantContext: req.tenantContext,
  });
  
  res.json(result);
});
```

**Files to create:**
- `apps/api/src/graphql/schema.ts` — Type definitions
- `apps/api/src/graphql/resolvers.ts` — Query resolvers
- `apps/api/src/routes/graphql.ts` — HTTP handler
- `apps/web/src/hooks/useGraphQL.ts` — Client hook for queries/mutations

---

## Implementation Sequence

```
Week 1-2: Audit Fabric
  ├─ Audit schema + capture points
  ├─ Query API + verification view
  └─ Tests + documentation

Week 2: Resolution Caching
  ├─ Cache implementation
  ├─ Invalidation strategy  
  └─ Performance benchmarks

Week 3-4: Admin Control Plane
  ├─ Metadata override UI
  ├─ Rule expression builder
  └─ Workflow template gallery

Week 4+: GraphQL Surface Layer
  ├─ Schema + resolvers
  ├─ Client integration
  └─ Query optimization
```

---

## Success Metrics

### Audit Fabric
- [ ] 100% of decisions captured in audit log
- [ ] Query API returns full decision chain in <100ms
- [ ] Can replay any business decision from audit trail

### Resolution Caching
- [ ] 90%+ cache hit rate for typical workloads
- [ ] Metadata resolution time <10ms (cached) vs 50-200ms (uncached)
- [ ] Memory footprint <100MB per 1M unique resolution contexts

### Admin Control Plane
- [ ] Business users (non-Dev) can modify tenant metadata without code
- [ ] Workflow deployment time <5s
- [ ] Rule expression validation provides real-time feedback

### GraphQL Surface Layer
- [ ] Single GraphQL query replaces 3-5 HTTP calls
- [ ] Latency improvement: 40-60% reduction on typical workflows
- [ ] Type safety for client code generation

---

## Architecture Validation

After Phase 4, the system will have achieved:

| Attribute | Capability |
|-----------|-----------|
| **Determinism** | Audit chain proves reproducibility |
| **Scalability** | Caching handles 10k+ tenants efficiently |
| **Approachability** | Non-developers can configure platform |
| **Efficiency** | GraphQL reduces client/server chattiness |
| **Composability** | Building blocks can be recombined |
| **Traceability** | Every decision is logged + queryable |

This positions the platform for:
- Multi-tenant SaaS at scale
- Enterprise compliance audits
- Business user autonomy
- Developer productivity

---

## Decision Gates

### Gate 1: Audit Fabric Sign-Off (End of Week 2)
- [ ] Audit API queries verified against business requirements
- [ ] Capture points validated to cover all decision types
- [ ] Performance acceptable (<2% overhead)

### Gate 2: Caching Performance (End of Week 2)
- [ ] Hit rates meet 90% target
- [ ] Memory usage within limits
- [ ] Invalidation strategy tested

### Gate 3: Admin UX (End of Week 4)
- [ ] Usability testing with non-technical users
- [ ] Workflow builders considered "easy to use"
- [ ] No code required for typical operations

### Gate 4: GraphQL Integration (Week 4+)
- [ ] Schema matches Truth Graph structure
- [ ] Client code generation verified
- [ ] Performance within SLA

---

## Open Questions

1. **Audit Storage**: Database table or event mesh message stream?
2. **Cache Invalidation**: Eager (on write) or lazy (TTL-based)?
3. **Admin RBAC**: Which users can modify which tenant layers?
4. **GraphQL Subscriptions**: Real-time metadata/workflow updates?
5. **Multilingual Expressions**: DSL internationalization?

---

## Reference

**Phase 3 Foundations**
- Tenant-aware metadata resolution ✅
- Event mesh + workflow wiring ✅
- Rule + policy infrastructure ✅
- Layout + graph integration ✅

**Phase 4 Builds On**
- Visibility into execution (Audit)
- Efficiency at scale (Cache)
- User autonomy (Control Plane)
- Integrated client access (GraphQL)

