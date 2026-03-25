---
name: erp-workflow-patterns
description: Enterprise ERP workflow orchestration, event-driven business processes, tenant-aware metadata resolution, and Business Truth Graph patterns. Use when implementing workflow engines, event meshes, multi-tenant business logic, or metadata-driven ERP systems. Based on AFENDA-META-UI production architecture.
---

# ERP Workflow & Event Orchestration Patterns

Enterprise-grade patterns for building event-driven ERP systems with workflow orchestration, business truth graphs, tenant-aware metadata resolution, and audit-compliant event meshes.

## When to Use This Skill

Use this skill when:

- Building workflow orchestration engines
- Implementing event-driven business processes
- Creating multi-tenant ERP systems
- Designing Business Truth Graphs (metadata as code)
- Building tenant-aware metadata resolution layers
- Implementing audit trails via event sourcing
- Creating compliance logging frameworks
- Orchestrating cross-system business workflows
- Building deterministic business rules engines

---

## Architecture Overview: The Business Truth Engine

The **Business Truth Engine** is a four-pillar architecture for metadata-driven ERP systems:

```
┌─────────────────────────────────────────────────────────────┐
│                   Business Truth Engine                     │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Pillar 1: Business Truth Graph                             │
│  ┌──────────────────────────────────────────────────────┐   │
│  │ Tenant → Industry → Dept → Model → Field → Policy   │   │
│  │ Single source of truth for business structure       │   │
│  └──────────────────────────────────────────────────────┘   │
│                          ↓                                  │
│  Pillar 2: ERP Event Mesh                                   │
│  ┌──────────────────────────────────────────────────────┐   │
│  │ Event-driven nervous system                          │   │
│  │ All state changes broadcast through mesh            │   │
│  └──────────────────────────────────────────────────────┘   │
│                          ↓                                  │
│  Pillar 3: Workflow Engine                                  │
│  ┌──────────────────────────────────────────────────────┐   │
│  │ Automatic business process orchestration            │   │
│  │ Tenant-aware, metadata-driven workflows             │   │
│  └──────────────────────────────────────────────────────┘   │
│                          ↓                                  │
│  Pillar 4: Tenant Resolution Layer                          │
│  ┌──────────────────────────────────────────────────────┐   │
│  │ Global → Industry → Tenant → Dept → User             │   │
│  │ Deterministic metadata resolution hierarchy         │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## Pillar 1: Business Truth Graph

### Concept

The **Business Truth Graph** is a **single source of definition** for business structure. It represents the hierarchical relationships between tenants, industries, departments, teams, models, fields, behaviors, and policies.

**Purpose**: Eliminate hardcoded business logic; drive system behavior from metadata.

### Schema

```typescript
// packages/meta-types/src/graph.ts

interface BusinessTruthGraph {
  tenants: Tenant[];
  industries: Industry[];
}

interface Tenant {
  id: string;
  name: string;
  industry: string; // Link to Industry
  metadata: Record<string, unknown>; // Tenant-specific overrides
  departments: Department[];
}

interface Department {
  id: string;
  name: string;
  tenantId: string;
  teams: Team[];
  metadata: Record<string, unknown>;
}

interface Team {
  id: string;
  name: string;
  departmentId: string;
  members: User[];
}

interface Model {
  id: string;
  name: string; // e.g., "invoice", "purchaseOrder"
  industryId: string;
  fields: Field[];
  behaviors: Behavior[];
  policies: Policy[];
}

interface Field {
  id: string;
  name: string;
  type: "string" | "number" | "date" | "reference";
  required: boolean;
  validations: Validation[];
}

interface Behavior {
  id: string;
  name: string; // e.g., "compute_tax", "apply_discount"
  trigger: string; // e.g., "on_create", "on_update"
  implementation: string; // Reference to function or script
}

interface Policy {
  id: string;
  name: string; // e.g., "maximum_amount_10k"
  condition: string; // Expression to evaluate
  enforcement: "block" | "warn" | "audit";
}
```

### Implementation

**File**: `apps/api/src/graph/index.ts`

```typescript
import { db } from "@repo/db";
import { tenants, industries, models } from "@repo/db/schema";

export class BusinessTruthGraph {
  // Query tenant hierarchy
  async getTenantGraph(tenantId: string) {
    const tenant = await db.query.tenants.findFirst({
      where: eq(tenants.id, tenantId),
      with: {
        departments: {
          with: {
            teams: true,
          },
        },
      },
    });

    return tenant;
  }

  // Query model definition
  async getModelDefinition(modelName: string, industryId: string) {
    const model = await db.query.models.findFirst({
      where: and(eq(models.name, modelName), eq(models.industryId, industryId)),
      with: {
        fields: true,
        behaviors: true,
        policies: true,
      },
    });

    return model;
  }

  // Resolve effective metadata for a tenant
  async resolveMetadata(modelName: string, tenantId: string): Promise<Record<string, unknown>> {
    const tenant = await this.getTenantGraph(tenantId);
    const model = await this.getModelDefinition(modelName, tenant.industryId);

    // Merge: global model → industry layer → tenant overrides
    return {
      ...model.metadata,
      ...(tenant.industryMetadata?.[modelName] ?? {}),
      ...(tenant.metadata?.[modelName] ?? {}),
    };
  }
}
```

### Usage Pattern

```typescript
// apps/api/src/routes/invoice.ts

import { graph } from "../graph";

router.post("/invoices", async (req, res) => {
  const { tenantId } = req.tenantContext;

  // Get invoice model definition for this tenant's industry
  const invoiceModel = await graph.resolveMetadata("invoice", tenantId);

  // Use metadata to drive validation
  const requiredFields = invoiceModel.fields
    .filter((f: Field) => f.required)
    .map((f: Field) => f.name);

  // Validate request
  for (const field of requiredFields) {
    if (!req.body[field]) {
      return res.status(400).json({ error: `Missing required field: ${field}` });
    }
  }

  // Create invoice using metadata-driven logic
  const invoice = await createInvoice(req.body, invoiceModel);

  res.json(invoice);
});
```

---

## Pillar 2: ERP Event Mesh

### Concept

The **Event Mesh** is the **business nervous system**. All significant state changes broadcast through it, enabling:

- Audit trails (compliance)
- Workflow triggers
- Cross-system integration
- Real-time notifications
- Event replay (time travel debugging)

### Event Schema

```typescript
// packages/meta-types/src/events.ts

interface MeshEvent<T = any> {
  id: string; // Unique event ID (UUID)
  type: string; // e.g., "invoice.created", "workflow.transitioned"
  tenantId: string; // Tenant scope (multi-tenancy)
  payload: T; // Event data
  metadata?: {
    timestamp: string;
    userId?: string;
    source?: string; // Which service/system emitted this
    correlationId?: string; // Link related events
  };
}

// Common event types
type InvoiceCreated = MeshEvent<{
  invoiceId: string;
  amount: number;
  customerId: string;
}>;

type WorkflowTransitioned = MeshEvent<{
  workflowId: string;
  fromState: string;
  toState: string;
  triggeredBy: string;
}>;

type PolicyViolated = MeshEvent<{
  policyId: string;
  modelId: string;
  violation: string;
}>;
```

### Implementation

**File**: `apps/api/src/mesh/index.ts`

```typescript
import EventEmitter from "node:events";
import { db } from "@repo/db";
import { events } from "@repo/db/schema";

export class EventMesh {
  private emitter = new EventEmitter();

  // Publish event to mesh
  async publish<T>(
    type: string,
    payload: T,
    tenantId: string,
    metadata?: Partial<MeshEvent["metadata"]>
  ): Promise<void> {
    const event: MeshEvent<T> = {
      id: crypto.randomUUID(),
      type,
      tenantId,
      payload,
      metadata: {
        timestamp: new Date().toISOString(),
        ...metadata,
      },
    };

    // Persist to event store (audit trail)
    await db.insert(events).values({
      ...event,
      payload: JSON.stringify(event.payload),
    });

    // Emit to in-memory subscribers (real-time)
    this.emitter.emit(type, event);
    this.emitter.emit("*", event); // Wildcard handler

    console.log(`[Mesh] Published event: ${type}`, { tenantId, eventId: event.id });
  }

  // Subscribe to events
  subscribe(eventType: string, handler: (event: MeshEvent) => void | Promise<void>): () => void {
    this.emitter.on(eventType, handler);

    // Return unsubscribe function
    return () => this.emitter.off(eventType, handler);
  }

  // Stream processor (transform + re-emit)
  streamProcessor<TIn, TOut>(
    inputType: string,
    outputType: string,
    transform: (event: MeshEvent<TIn>) => TOut | Promise<TOut>
  ): void {
    this.subscribe(inputType, async (event) => {
      const transformed = await transform(event);
      await this.publish(outputType, transformed, event.tenantId, {
        correlationId: event.id,
      });
    });
  }

  // Query event history (audit, replay, debugging)
  async getEventHistory(
    tenantId: string,
    options?: {
      type?: string;
      startDate?: Date;
      endDate?: Date;
      limit?: number;
    }
  ): Promise<MeshEvent[]> {
    const query = db.query.events.findMany({
      where: and(
        eq(events.tenantId, tenantId),
        options?.type ? eq(events.type, options.type) : undefined,
        options?.startDate ? gte(events.createdAt, options.startDate) : undefined,
        options?.endDate ? lte(events.createdAt, options.endDate) : undefined
      ),
      orderBy: desc(events.createdAt),
      limit: options?.limit ?? 100,
    });

    return query;
  }
}

export const mesh = new EventMesh();
```

### Usage Pattern

```typescript
// apps/api/src/routes/invoice.ts

import { mesh } from "../mesh";

router.post("/invoices", async (req, res) => {
  const invoice = await createInvoice(req.body);

  // Publish event to mesh
  await mesh.publish(
    "invoice.created",
    {
      invoiceId: invoice.id,
      amount: invoice.amount,
      customerId: invoice.customerId,
    },
    req.tenantContext.tenantId,
    {
      userId: req.user.id,
      source: "api",
    }
  );

  res.json(invoice);
});

// Subscribe to events
mesh.subscribe("invoice.created", async (event) => {
  console.log("Invoice created:", event.payload);

  // Trigger workflow
  await workflowEngine.triggerWorkflows("invoice.created", event);

  // Send notification
  await notificationService.notify(event.tenantId, {
    message: `New invoice #${event.payload.invoiceId} created`,
  });
});
```

### Stream Processing Example

```typescript
// Transform invoice.created → invoice.enriched
mesh.streamProcessor("invoice.created", "invoice.enriched", async (event) => {
  const { invoiceId } = event.payload;

  // Fetch additional data
  const customer = await db.query.customers.findFirst({
    where: eq(customers.id, event.payload.customerId),
  });

  // Return enriched payload
  return {
    ...event.payload,
    customerName: customer.name,
    customerTier: customer.tier,
  };
});
```

---

## Pillar 3: Workflow Engine

### Concept

The **Workflow Engine** automatically orchestrates business processes. Workflows are **defined in metadata** and triggered by events from the Event Mesh.

**Key Features**:

- Tenant-aware (different workflows per tenant)
- Metadata-driven (no hardcoded workflows)
- Event-triggered
- Step-by-step execution with branching

### Workflow Schema

```typescript
// packages/meta-types/src/workflow.ts

interface WorkflowDefinition {
  id: string;
  name: string;
  scope: string; // e.g., "invoice.approval"
  tenantId: string; // Tenant-specific workflow

  triggers: WorkflowTrigger[];
  steps: WorkflowStep[];

  metadata?: Record<string, unknown>; // Tenant overrides
}

interface WorkflowTrigger {
  on: string; // Event type (e.g., "invoice.created")
  when?: ConditionExpression; // Optional condition
}

interface WorkflowStep {
  id: string;
  name: string;
  action: "send_event" | "apply_rule" | "check_policy" | "human_decision" | "wait";
  params: Record<string, unknown>;
  nextSteps?: string[]; // For branching (e.g., if/else)
}

interface ConditionExpression {
  field: string;
  operator: "eq" | "gt" | "lt" | "in" | "contains";
  value: any;
}

interface WorkflowInstance {
  id: string;
  workflowId: string;
  tenantId: string;
  currentStep: string;
  state: "running" | "waiting" | "completed" | "failed";
  context: Record<string, unknown>; // Data passed between steps
  createdAt: Date;
  updatedAt: Date;
}
```

### Implementation

**File**: `apps/api/src/workflow/index.ts`

```typescript
import { mesh } from "../mesh";
import { db } from "@repo/db";
import { workflows, workflowInstances } from "@repo/db/schema";

export class WorkflowEngine {
  private registry = new Map<string, WorkflowDefinition>();

  // Register workflow
  register(workflow: WorkflowDefinition): void {
    this.registry.set(workflow.id, workflow);

    // Auto-subscribe to triggers
    for (const trigger of workflow.triggers) {
      mesh.subscribe(trigger.on, async (event) => {
        if (event.tenantId === workflow.tenantId) {
          await this.triggerWorkflow(workflow.id, event);
        }
      });
    }
  }

  // Trigger workflow from event
  async triggerWorkflow(workflowId: string, triggerEvent: MeshEvent): Promise<WorkflowInstance> {
    const workflow = this.registry.get(workflowId);
    if (!workflow) throw new Error(`Workflow not found: ${workflowId}`);

    // Check condition if present
    const trigger = workflow.triggers.find((t) => t.on === triggerEvent.type);
    if (trigger?.when && !this.evaluateCondition(trigger.when, triggerEvent.payload)) {
      console.log(`[Workflow] Condition not met for ${workflowId}`);
      return;
    }

    // Create instance
    const instance: WorkflowInstance = {
      id: crypto.randomUUID(),
      workflowId: workflow.id,
      tenantId: workflow.tenantId,
      currentStep: workflow.steps[0].id,
      state: "running",
      context: { triggerEvent: triggerEvent.payload },
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    await db.insert(workflowInstances).values(instance);

    // Execute first step
    await this.executeStep(instance, workflow.steps[0]);

    // Publish workflow started event
    await mesh.publish(
      "workflow.started",
      { workflowId, instanceId: instance.id },
      workflow.tenantId
    );

    return instance;
  }

  // Execute workflow step
  async executeStep(instance: WorkflowInstance, step: WorkflowStep): Promise<void> {
    console.log(`[Workflow] Executing step: ${step.name}`, { instanceId: instance.id });

    try {
      switch (step.action) {
        case "send_event":
          await mesh.publish(
            step.params.eventType as string,
            { ...instance.context, ...step.params.payload },
            instance.tenantId
          );
          break;

        case "apply_rule":
          const ruleResult = await this.applyRule(step.params.ruleId as string, instance.context);
          instance.context = { ...instance.context, ruleResult };
          break;

        case "check_policy":
          const policyValid = await this.checkPolicy(
            step.params.policyId as string,
            instance.context
          );
          if (!policyValid) {
            instance.state = "failed";
            await mesh.publish(
              "workflow.failed",
              { instanceId: instance.id, reason: "Policy violation" },
              instance.tenantId
            );
            return;
          }
          break;

        case "human_decision":
          instance.state = "waiting";
          await mesh.publish(
            "workflow.waiting",
            { instanceId: instance.id, reason: "Awaiting approval" },
            instance.tenantId
          );
          return;

        case "wait":
          await new Promise((resolve) => setTimeout(resolve, step.params.duration as number));
          break;
      }

      // Move to next step
      if (step.nextSteps && step.nextSteps.length > 0) {
        const workflow = this.registry.get(instance.workflowId)!;
        const nextStep = workflow.steps.find((s) => s.id === step.nextSteps![0]);
        if (nextStep) {
          instance.currentStep = nextStep.id;
          instance.updatedAt = new Date();
          await db
            .update(workflowInstances)
            .set({ currentStep: nextStep.id, updatedAt: instance.updatedAt })
            .where(eq(workflowInstances.id, instance.id));

          await this.executeStep(instance, nextStep);
        }
      } else {
        // Workflow complete
        instance.state = "completed";
        await db
          .update(workflowInstances)
          .set({ state: "completed", updatedAt: new Date() })
          .where(eq(workflowInstances.id, instance.id));

        await mesh.publish("workflow.completed", { instanceId: instance.id }, instance.tenantId);
      }
    } catch (error) {
      instance.state = "failed";
      await mesh.publish(
        "workflow.failed",
        { instanceId: instance.id, error: error.message },
        instance.tenantId
      );
    }
  }

  // Evaluate condition
  private evaluateCondition(condition: ConditionExpression, data: any): boolean {
    const value = data[condition.field];

    switch (condition.operator) {
      case "eq":
        return value === condition.value;
      case "gt":
        return value > condition.value;
      case "lt":
        return value < condition.value;
      case "in":
        return condition.value.includes(value);
      case "contains":
        return value.includes(condition.value);
      default:
        return false;
    }
  }

  private async applyRule(ruleId: string, context: any): Promise<any> {
    // Load and execute business rule
    const rule = await db.query.rules.findFirst({ where: eq(rules.id, ruleId) });
    // Execute rule logic (omitted for brevity)
    return { success: true };
  }

  private async checkPolicy(policyId: string, context: any): Promise<boolean> {
    // Load and check policy
    const policy = await db.query.policies.findFirst({ where: eq(policies.id, policyId) });
    // Evaluate policy condition (omitted for brevity)
    return true;
  }
}

export const workflowEngine = new WorkflowEngine();
```

### Usage Example: Invoice Approval Workflow

```typescript
// Define workflow
const invoiceApprovalWorkflow: WorkflowDefinition = {
  id: "invoice-approval",
  name: "Invoice Approval Process",
  scope: "invoice.approval",
  tenantId: "acme-corp",

  triggers: [
    {
      on: "invoice.created",
      when: {
        field: "amount",
        operator: "gt",
        value: 1000, // Only trigger for invoices > $1000
      },
    },
  ],

  steps: [
    {
      id: "step-1",
      name: "Request Manager Approval",
      action: "send_event",
      params: {
        eventType: "approval.requested",
        payload: { role: "manager" },
      },
      nextSteps: ["step-2"],
    },
    {
      id: "step-2",
      name: "Wait for Approval",
      action: "human_decision",
      params: {},
      nextSteps: ["step-3"],
    },
    {
      id: "step-3",
      name: "Check Approval Policy",
      action: "check_policy",
      params: { policyId: "invoice-limits" },
      nextSteps: ["step-4"],
    },
    {
      id: "step-4",
      name: "Mark Invoice Approved",
      action: "send_event",
      params: {
        eventType: "invoice.approved",
        payload: {},
      },
      nextSteps: [], // End of workflow
    },
  ],

  metadata: {
    maxApprovers: 3,
    escalationTime: "1h",
  },
};

// Register workflow
workflowEngine.register(invoiceApprovalWorkflow);
```

### Tenant-Aware Workflows

```typescript
// Global workflow definition
const globalInvoiceApproval = {
  /* ... */
};

// Tenant "acme-corp" overrides via metadata
const acmeMetadata = {
  "workflows.invoice.approval.maxApprovers": 5, // Override: 5 approvers instead of 3
  "workflows.invoice.approval.escalationTime": "30m", // Override: 30min instead of 1h
};

// Workflow execution automatically picks up overrides
const workflow = await resolveWorkflowWithMetadata("invoice.approval", "acme-corp");
// workflow.metadata.maxApprovers === 5 (tenant override applied)
```

---

## Pillar 4: Tenant Resolution Layer

### Concept

The **Tenant Resolution Layer** enforces **deterministic metadata resolution** across all systems. It ensures that the same request with different tenant contexts produces different behavior automatically.

**Resolution Hierarchy**:

```
Global (Foundation)
  ↓ (override if present)
Industry Layer (e.g., "manufacturing")
  ↓ (override if present)
Tenant Layer (e.g., "acme-corp")
  ↓ (override if present)
Department Layer (e.g., "finance")
  ↓ (override if present)
User Layer (e.g., "alice")
```

### Schema

```typescript
// packages/meta-types/src/rbac.ts

interface ResolutionContext {
  tenantId: string;
  userId?: string;
  departmentId?: string;
  industryId?: string;
}

interface MetadataLayer {
  global: Record<string, unknown>;
  industry: Record<string, Record<string, unknown>>; // industryId → metadata
  tenant: Record<string, Record<string, unknown>>; // tenantId → metadata
  department: Record<string, Record<string, unknown>>; // deptId → metadata
  user: Record<string, Record<string, unknown>>; // userId → metadata
}
```

### Implementation

**File**: `apps/api/src/tenant/index.ts`

```typescript
import { db } from "@repo/db";
import { tenants, industries, departments, users } from "@repo/db/schema";
import deepMerge from "deepmerge";

export class TenantResolver {
  // Resolve metadata with tenant context
  async resolveMetadata(
    model: string,
    globalMeta: Record<string, unknown>,
    ctx: ResolutionContext
  ): Promise<Record<string, unknown>> {
    const layers: Record<string, unknown>[] = [globalMeta];

    // Layer 2: Industry metadata
    if (ctx.industryId) {
      const industry = await db.query.industries.findFirst({
        where: eq(industries.id, ctx.industryId),
      });
      if (industry?.metadata?.[model]) {
        layers.push(industry.metadata[model]);
      }
    }

    // Layer 3: Tenant metadata
    const tenant = await db.query.tenants.findFirst({
      where: eq(tenants.id, ctx.tenantId),
    });
    if (tenant?.metadata?.[model]) {
      layers.push(tenant.metadata[model]);
    }

    // Layer 4: Department metadata
    if (ctx.departmentId) {
      const dept = await db.query.departments.findFirst({
        where: eq(departments.id, ctx.departmentId),
      });
      if (dept?.metadata?.[model]) {
        layers.push(dept.metadata[model]);
      }
    }

    // Layer 5: User metadata
    if (ctx.userId) {
      const user = await db.query.users.findFirst({
        where: eq(users.id, ctx.userId),
      });
      if (user?.metadata?.[model]) {
        layers.push(user.metadata[model]);
      }
    }

    // Merge all layers (later layers override earlier ones)
    return layers.reduce((acc, layer) => deepMerge(acc, layer), {});
  }

  // Reverse resolution: determine which layer defined a value
  async reverseResolve(
    model: string,
    field: string,
    ctx: ResolutionContext
  ): Promise<{ layer: string; value: unknown }> {
    const resolved = await this.resolveMetadata(model, {}, ctx);
    const value = resolved[field];

    // Check each layer in reverse order
    if (ctx.userId) {
      const user = await db.query.users.findFirst({ where: eq(users.id, ctx.userId) });
      if (user?.metadata?.[model]?.[field] === value) {
        return { layer: "user", value };
      }
    }

    if (ctx.departmentId) {
      const dept = await db.query.departments.findFirst({
        where: eq(departments.id, ctx.departmentId),
      });
      if (dept?.metadata?.[model]?.[field] === value) {
        return { layer: "department", value };
      }
    }

    const tenant = await db.query.tenants.findFirst({ where: eq(tenants.id, ctx.tenantId) });
    if (tenant?.metadata?.[model]?.[field] === value) {
      return { layer: "tenant", value };
    }

    if (ctx.industryId) {
      const industry = await db.query.industries.findFirst({
        where: eq(industries.id, ctx.industryId),
      });
      if (industry?.metadata?.[model]?.[field] === value) {
        return { layer: "industry", value };
      }
    }

    return { layer: "global", value };
  }
}

export const tenantResolver = new TenantResolver();
```

### Middleware Integration

**File**: `apps/api/src/middleware/tenantContext.ts`

```typescript
import { Request, Response, NextFunction } from "express";
import { tenantResolver } from "../tenant";

export async function tenantContextMiddleware(req: Request, res: Response, next: NextFunction) {
  // Extract from JWT or headers
  const tenantId = (req.headers["x-tenant-id"] as string) || req.user?.tenantId;
  const userId = req.user?.id;
  const departmentId = req.user?.departmentId;

  if (!tenantId) {
    return res.status(400).json({ error: "Missing tenant context" });
  }

  // Fetch tenant info
  const tenant = await db.query.tenants.findFirst({
    where: eq(tenants.id, tenantId),
    with: { industry: true },
  });

  if (!tenant) {
    return res.status(404).json({ error: "Tenant not found" });
  }

  // Attach resolution context to request
  req.tenantContext = {
    tenantId,
    userId,
    departmentId,
    industryId: tenant.industryId,
  };

  next();
}
```

### Usage Example: Metadata-Driven UI

```typescript
// apps/api/src/routes/layout.ts

import { tenantResolver } from "../tenant";

router.get("/layouts/:model", async (req, res) => {
  const { model } = req.params;
  const { tenantContext } = req;

  // Global layout definition
  const globalLayout = {
    fields: ["id", "name", "amount", "date"],
    theme: "default",
    columns: 4,
  };

  // Resolve with tenant context
  const resolvedLayout = await tenantResolver.resolveMetadata(model, globalLayout, tenantContext);

  // Result for tenant "acme-corp" might be:
  // {
  //   fields: ['id', 'name', 'amount', 'date', 'customField'],  ← Tenant added field
  //   theme: 'acme-brand',  ← Tenant override
  //   columns: 6  ← Tenant override
  // }

  res.json(resolvedLayout);
});
```

---

## Integration: Wiring the Four Pillars

### Mesh ↔ Workflow

```typescript
// Automatic workflow triggering from events

// 1. Event published
await mesh.publish("invoice.created", { invoiceId: "123", amount: 5000 }, "acme-corp");

// 2. Mesh routes to workflow engine
mesh.subscribe("invoice.created", async (event) => {
  await workflowEngine.triggerWorkflows("invoice.created", event);
});

// 3. Workflow executes steps
// 4. Workflow publishes "workflow.transitioned" event
// 5. Other subscribers react to workflow events
```

### Tenant ↔ Workflow

```typescript
// Tenant-aware workflow execution

// Global workflow definition
const globalWorkflow: WorkflowDefinition = {
  id: "invoice-approval",
  triggers: [{ on: "invoice.created" }],
  steps: [
    /* ... */
  ],
  metadata: { maxApprovers: 3 },
};

// Tenant "acme-corp" overrides
const acmeMetadata = {
  "workflows.invoice-approval.maxApprovers": 5,
};

// Workflow execution picks up tenant overrides
const workflow = await workflowEngine.resolveWorkflow("invoice-approval", "acme-corp");
// workflow.metadata.maxApprovers === 5 (tenant override applied)
```

### Tenant ↔ Graph

```typescript
// Metadata resolution uses Business Truth Graph

const graph = new BusinessTruthGraph();

// Query effective metadata for tenant
const invoiceMetadata = await graph.resolveMetadata("invoice", "acme-corp");

// Result includes:
// - Global invoice definition
// - Industry-specific overrides (manufacturing)
// - Tenant-specific overrides (acme-corp)
```

---

## Compliance & Audit Patterns

### Audit Trail via Event Sourcing

**All state changes flow through Event Mesh** → automatic audit trail.

```typescript
// Query audit history
const auditTrail = await mesh.getEventHistory("acme-corp", {
  type: "invoice.updated",
  startDate: new Date("2026-01-01"),
  endDate: new Date("2026-01-31"),
});

// Result: Complete history of all invoice updates in January
auditTrail.forEach((event) => {
  console.log(`${event.metadata.timestamp}: ${event.type}`, event.payload);
});
```

### Compliance Logging

```typescript
// Log compliance-relevant events with extra metadata

await mesh.publish(
  "compliance.dataAccess",
  {
    userId: req.user.id,
    resource: "invoice",
    resourceId: "123",
    action: "view",
    piiFields: ["customerName", "customerAddress"],
  },
  req.tenantContext.tenantId,
  {
    userId: req.user.id,
    source: "api",
    ipAddress: req.ip,
    userAgent: req.headers["user-agent"],
  }
);
```

### GDPR Right to Erasure

```typescript
// Replay events excluding deleted user's data

async function anonymizeUserData(userId: string, tenantId: string) {
  // 1. Get all events involving this user
  const userEvents = await mesh.getEventHistory(tenantId, {
    // Custom query for userId in payload
  });

  // 2. Create "anonymization" events
  for (const event of userEvents) {
    await mesh.publish(
      "user.dataAnonymized",
      {
        originalEventId: event.id,
        userId,
        anonymizedAt: new Date().toISOString(),
      },
      tenantId
    );
  }

  // 3. Projections will rebuild state excluding PII
}
```

---

## Key Takeaways

1. **Business Truth Graph**: Single source of truth for business structure
2. **Event Mesh**: All state changes flow through audit-compliant event log
3. **Workflow Engine**: Metadata-driven, tenant-aware business process automation
4. **Tenant Resolution**: Deterministic multi-layer metadata hierarchy
5. **Integration**: Four pillars wire together via events + metadata resolution
6. **Compliance**: Event sourcing provides automatic audit trails
7. **Multi-Tenancy**: Same code, different behavior per tenant via metadata

---

## Related Skills

- **domain-driven-design**: Bounded contexts, aggregates, domain events
- **event-sourcing**: Event store implementation, projections, snapshots
- **enterprise-architecture-patterns**: CQRS, saga patterns, consistency models
- **multi-tenant-architecture**: Tenant isolation, routing, data scoping
- **monorepo-governance**: Managing complex ERP codebases at scale
