---
name: erp-database-patterns
description: Production-grade ERP SaaS database design patterns for PostgreSQL and Drizzle ORM. Covers multi-tenant schema isolation, audit trails, hierarchical metadata, workflow persistence, and zero-downtime migrations.
type: skill
tags:
  - erp
  - database
  - postgresql
  - drizzle-orm
  - multi-tenant
  - audit
  - event-sourcing
  - schema-design
authors:
  - AFENDA Team
created: 2024-01-15
updated: 2024-01-15
version: 1.0.0
keywords:
  - tenant isolation
  - row-level security (RLS)
  - audit logging
  - event tables
  - workflow persistence
  - hierarchical metadata
  - zero-downtime migrations
---

# ERP Database Patterns for PostgreSQL + Drizzle ORM

Production-tested patterns from the AFENDA ERP SaaS platform. These patterns address the unique challenges of multi-tenant ERP systems: tenant isolation, audit compliance, hierarchical configuration, and zero-downtime schema evolution.

## 1. Multi-Tenant Schema Isolation

### Pattern: Row-Level Security (RLS) with Tenant Context

**Why this pattern**: Enforces tenant boundaries at the database layer, preventing data leakage even if application logic fails.

**When to use**:

- Strict compliance requirements (HIPAA, SOX, GDPR)
- High-risk data (financial, healthcare, personal information)
- Multiple competing organizations on shared infrastructure

**Implementation** (Drizzle ORM + PostgreSQL):

```typescript
// 1. Create tenant identification columns on all tenant-scoped tables
export const invoices = pgTable(
  "invoices",
  {
    id: uuid("id").primaryKey(),
    tenantId: text("tenant_id").notNull(), // Mandatory on every table
    organizationId: uuid("organization_id").notNull(),
    invoiceNumber: text("invoice_number").notNull(),
    amount: decimal("amount", { precision: 12, scale: 2 }).notNull(),
    status: text("status").notNull().default("draft"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => ({
    tenantIdx: index("invoices_tenant_idx").on(table.tenantId),
    orgIdx: index("invoices_org_idx").on(table.tenantId, table.organizationId),
  })
);

// 2. Enable RLS on the table
await db.execute(sql`ALTER TABLE invoices ENABLE ROW LEVEL SECURITY`);

// 3. Create tenant isolation policies via database-level constraints
const tenantIsolationCheck = () =>
  sql`"tenantId" = NULLIF(current_setting('afenda.tenant_id', true), '')`;

// SELECT policy: users can only see rows for their tenant
await db.execute(
  pgPolicy("invoices_tenant_select", {
    as: "permissive",
    for: "select",
    to: pgRole("app_user"),
    using: tenantIsolationCheck(),
  })
);

// INSERT policy: users can only insert rows for their tenant
await db.execute(
  pgPolicy("invoices_tenant_insert", {
    as: "permissive",
    for: "insert",
    to: pgRole("app_user"),
    withCheck: tenantIsolationCheck(),
  })
);

// UPDATE policy: users can only modify rows for their tenant
await db.execute(
  pgPolicy("invoices_tenant_update", {
    as: "permissive",
    for: "update",
    to: pgRole("app_user"),
    using: tenantIsolationCheck(),
    withCheck: tenantIsolationCheck(),
  })
);

// DELETE policy: users can only delete rows for their tenant
await db.execute(
  pgPolicy("invoices_tenant_delete", {
    as: "permissive",
    for: "delete",
    to: pgRole("app_user"),
    using: tenantIsolationCheck(),
  })
);

// 4. Middleware sets the tenant context on every request
export async function setTenantContext(req: Request, res: Response, next: NextFunction) {
  const session = req.user; // From JWT
  const tenantId = session.tenantId;

  // SQL connections will use this setting
  await db.execute(sql`SET LOCAL "afenda.tenant_id" = ${tenantId}`);
  next();
}

// 5. All queries automatically filtered by tenant
const userInvoices = await db.select().from(invoices).where(eq(invoices.invoiceNumber, "INV-001"));
// → Actually executes:
// SELECT * FROM invoices
// WHERE invoice_number = 'INV-001'
// AND tenant_id = [current user's tenant]
```

**Critical GotChas**:

1. **Always set the tenant context** before queries. Missing this setting bypasses RLS:

   ```typescript
   // ❌ Don't forget:
   await db.execute(sql`SET LOCAL "afenda.tenant_id" = ${tenantId}`);
   ```

2. **Tenant ID cannot be NULL**. Use `text` not `uuid` to avoid ambiguity:

   ```typescript
   // ✅ Good: text allows NULLIF check
   tenantId: text("tenant_id").notNull(),

   // ❌ Risky: uuid has less predictable NULL handling
   tenantId: uuid("tenant_id").notNull(),
   ```

3. **Composite indexes for performance**. Always include tenantId:

   ```typescript
   // ✅ Good: First column is tenant, enables fast filtering
   tenantOrgIdx: index("invoices_tenant_org").on(table.tenantId, table.organizationId),

   // ❌ Bad: Tenant not first, query planner can't optimize
   orgTenantIdx: index("invoices_org_tenant").on(table.organizationId, table.tenantId),
   ```

4. **Service role bypasses RLS**. Restrict service role usage:

   ```typescript
   // ✅ Only use service_role for admin operations
   await db.execute(sql`SET ROLE app_user`); // Enforce RLS for regular queries

   // ❌ Only use service_role (no RLS) for batch operations that explicitly need bypass
   await db.execute(
     pgPolicy("invoices_service_bypass", {
       as: "permissive",
       for: "all",
       to: pgRole("service_role"),
       using: sql`true`, // Intentionally bypasses RLS for admin ops
     })
   );
   ```

---

### Pattern: Hierarchical Tenant Metadata Resolution

**Why this pattern**: Different customers have different rules. Store configuration per tenant (or per industry, or per department) instead of hardcoding.

**When to use**:

- Multi-industry SaaS (manufacturing, retail, healthcare each have unique rules)
- Per-tenant customization (workflow approvals, field visibility, validation rules)
- A/B testing or feature flags per customer

**Implementation**:

```typescript
// 1. Define metadata resolution layers
export const tenantDefinitions = pgTable("tenant_definitions", {
  id: text("id").primaryKey(), // e.g., "acme-corp"
  name: text("name").notNull(),
  industry: text("industry"), // e.g., "manufacturing"
  isolationStrategy: pgEnum("isolation_strategy", [
    "logical", // Shared schema, RLS filters by tenant
    "schema", // Each tenant gets own schema
    "physical", // Each tenant gets own database
  ])
    .notNull()
    .default("logical"),
  enabled: boolean("enabled").notNull().default(true),
  branding: jsonb("branding").$type<TenantBranding>(),
  features: jsonb("features").$type<Record<string, boolean>>().default({}),
  locale: jsonb("locale").$type<{
    timezone: string;
    language: string;
    currency: string;
    dateFormat: string;
  }>(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// 2. Store configuration overrides at multiple scopes
export const metadataOverrides = pgTable(
  "metadata_overrides",
  {
    id: text("id").primaryKey(),
    scope: pgEnum("override_scope", [
      "global", // Default for all customers
      "industry", // Default for manufacturing
      "tenant", // acme-corp-specific
      "department", // Finance department in acme-corp
      "user", // Alice's personal preferences
    ]).notNull(),
    tenantId: text("tenant_id").references(() => tenantDefinitions.id),
    departmentId: text("department_id"),
    userId: text("user_id"),
    model: text("model").notNull(), // e.g., "invoice", "purchase_order"
    patch: jsonb("patch").$type<Record<string, unknown>>().notNull(), // Configuration
    enabled: boolean("enabled").notNull().default(true),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (t) => ({
    modelIdx: index("overrides_model_idx").on(t.model),
    tenantIdx: index("overrides_tenant_idx").on(t.tenantId),
    scopeIdx: index("overrides_scope_idx").on(t.scope),
    contextIdx: index("overrides_context_idx").on(t.tenantId, t.departmentId, t.userId),
  })
);

// 3. Resolution function applies layers in priority order
interface ResolutionContext {
  tenantId: string;
  industry?: string;
  userId?: string;
  departmentId?: string;
}

function resolveMetadata(model: string, ctx: ResolutionContext): Record<string, unknown> {
  // Fetch all scopes for this model
  const layers = await Promise.all([
    // Layer 0: Global defaults (foundation)
    db
      .select()
      .from(metadataOverrides)
      .where(and(eq(metadataOverrides.model, model), eq(metadataOverrides.scope, "global"))),

    // Layer 1: Industry defaults
    ctx.industry
      ? db
          .select()
          .from(metadataOverrides)
          .where(
            and(
              eq(metadataOverrides.model, model),
              eq(metadataOverrides.scope, "industry"),
              eq(metadataOverrides.model, ctx.industry)
            )
          )
      : [],

    // Layer 2: Tenant overrides
    db
      .select()
      .from(metadataOverrides)
      .where(
        and(
          eq(metadataOverrides.model, model),
          eq(metadataOverrides.scope, "tenant"),
          eq(metadataOverrides.tenantId, ctx.tenantId)
        )
      ),

    // Layer 3: Department overrides
    ctx.departmentId
      ? db
          .select()
          .from(metadataOverrides)
          .where(
            and(
              eq(metadataOverrides.model, model),
              eq(metadataOverrides.scope, "department"),
              eq(metadataOverrides.departmentId, ctx.departmentId)
            )
          )
      : [],

    // Layer 4: User preferences (highest priority)
    ctx.userId
      ? db
          .select()
          .from(metadataOverrides)
          .where(
            and(
              eq(metadataOverrides.model, model),
              eq(metadataOverrides.scope, "user"),
              eq(metadataOverrides.userId, ctx.userId)
            )
          )
      : [],
  ]);

  // Deep merge layers (later layers override earlier)
  let resolved = {};
  for (const layer of layers) {
    if (layer.enabled) {
      resolved = mergeDeep(resolved, layer.patch);
    }
  }

  return resolved;
}

// 4. Usage: Design fields and layouts with metadata
export const invoiceFields = pgTable(
  "invoice_fields",
  {
    id: uuid("id").primaryKey(),
    tenantId: text("tenant_id").notNull(),
    fieldName: text("field_name").notNull(), // "invoiceAmount"
    label: text("label").notNull(), // "Amount"
    dataType: text("data_type").notNull(), // "decimal"
    isRequired: boolean("is_required").notNull().default(true),
    isReadonly: boolean("is_readonly").notNull().default(false),
    visibilityRule: jsonb("visibility_rule"), // Complex RLS at field level
    auditLevel: text("audit_level").default("medium"), // "low" | "medium" | "high"
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => ({
    tenantIdx: index("invoice_fields_tenant_idx").on(table.tenantId, table.fieldName),
  })
);

// Example: Resolve invoice layout for tenant "acme-corp"
const acmeInvoiceConfig = await resolveMetadata("invoice", {
  tenantId: "acme-corp",
  industry: "manufacturing",
  departmentId: "finance",
  userId: "alice",
});
// Result might include: hiding certain tax fields for non-finance roles,
// enabling multi-currency for manufacturing, etc.
```

**Storage strategy decision**:

| Strategy                           | Use Case                                   | Trade-offs                                     |
| ---------------------------------- | ------------------------------------------ | ---------------------------------------------- |
| **Logical** (RLS on shared schema) | Most SaaS apps                             | Simple to operate, but noisy data in backups   |
| **Schema** (per-tenant schema)     | Moderate isolation needs                   | Cleaner backups, but complex schema migrations |
| **Physical** (per-tenant database) | Strict compliance or special customization | Maximum isolation, but operational overhead    |

---

## 2. Audit & Compliance Tables

### Pattern: Immutable Decision Audit Log + Event Trail

**Why this pattern**: Regulatory compliance (SOX, HIPAA) requires proving who did what and why. Database-level immutability prevents application-layer tampering.

**When to use**:

- Financial systems (audit trail for transactions)
- Healthcare (HIPAA audit logs)
- Compliance-critical industries
- Post-mortem debugging of system decisions

**Implementation**:

```typescript
// 1. Create immutable audit tables with append-only design
export const decisionAuditEntries = pgTable(
  "decision_audit_entries",
  {
    id: text("id").primaryKey(), // UUID, never updated
    timestamp: timestamp("timestamp", { withTimezone: true }).defaultNow().notNull(), // Immutable creation time
    tenantId: text("tenant_id").notNull(),
    userId: text("user_id"), // Who triggered the decision
    eventType: pgEnum("decision_event_type", [
      "metadata_resolved", // Tenant configuration applied
      "rule_evaluated", // Business rule triggered
      "policy_enforced", // Permission check result
      "workflow_transitioned", // Workflow state changed
      "event_propagated", // Event published to mesh
      "layout_rendered", // UI structure generated
    ]).notNull(),
    scope: text("scope").notNull(), // e.g., "invoice.approval"
    context: jsonb("context")
      .$type<{
        tenantId: string;
        departmentId?: string;
        sessionId: string;
        correlationId: string;
      }>()
      .notNull()
      .default({}), // Request context
    decision: jsonb("decision").notNull(), // What was decided
    durationMs: real("duration_ms").notNull(), // Execution time
    status: pgEnum("decision_status", ["success", "error"]).notNull(),
    error: jsonb("error"), // Error details if status = "error"
    chainId: text("chain_id"), // Links related decisions in single request
    createdAt: timestamp("created_at").defaultNow().notNull(), // Immutable
  },
  (t) => ({
    // Composite indexes for audit queries
    tenantIdx: index("dae_tenant_idx").on(t.tenantId),
    eventTypeIdx: index("dae_event_type_idx").on(t.eventType),
    userIdx: index("dae_user_idx").on(t.tenantId, t.userId),
    timestampIdx: index("dae_timestamp_idx").on(t.timestamp),
    chainIdx: index("dae_chain_idx").on(t.chainId), // Follow request chains
  })
);

// 2. Group related decisions into audit chains (single request = many decisions)
export const decisionAuditChains = pgTable("decision_audit_chains", {
  rootId: text("root_id").primaryKey(), // e.g., "req-12345-chain"
  totalDurationMs: real("total_duration_ms").notNull().default(0), // Total request time
  entryCount: integer("entry_count").notNull().default(0), // Number of decisions
  errorCount: integer("error_count").notNull().default(0), // Failed decisions
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

// 3. Override default behavior to immutable (no updates or deletes)
await db.execute(sql`
  ALTER TABLE decision_audit_entries ENABLE ROW LEVEL SECURITY;
  CREATE POLICY "audit_immutable" ON decision_audit_entries
    AS RESTRICTIVE
    FOR UPDATE
    TO app_user
    USING (false); -- Prevent all updates
  CREATE POLICY "audit_no_delete" ON decision_audit_entries
    AS RESTRICTIVE
    FOR DELETE
    TO app_user
    USING (false); -- Prevent all deletes
`);

// 4. Application instrumentation: log decisions automatically
class DecisionAuditLogger {
  private chainId: string;

  constructor(
    private db: Database,
    private tenantId: string,
    private userId: string
  ) {
    this.chainId = `chain-${randomUUID()}`;
  }

  async logDecision(input: {
    eventType: DecisionEventType;
    scope: string;
    context: Record<string, unknown>;
    decision: Record<string, unknown>;
    durationMs: number;
    status: "success" | "error";
    error?: Record<string, unknown>;
  }) {
    const entry = await this.db
      .insert(decisionAuditEntries)
      .values({
        id: `${this.chainId}-${randomUUID()}`,
        timestamp: new Date(),
        tenantId: this.tenantId,
        userId: this.userId,
        eventType: input.eventType,
        scope: input.scope,
        context: input.context,
        decision: input.decision,
        durationMs: input.durationMs,
        status: input.status,
        error: input.error,
        chainId: this.chainId,
      })
      .returning();

    // Update chain summary
    await this.db
      .update(decisionAuditChains)
      .set({
        entryCount: sql`${decisionAuditChains.entryCount} + 1`,
        errorCount:
          input.status === "error" ? sql`${decisionAuditChains.errorCount} + 1` : undefined,
        totalDurationMs: sql`${decisionAuditChains.totalDurationMs} + ${input.durationMs}`,
      })
      .where(eq(decisionAuditChains.rootId, this.chainId));

    return entry;
  }

  async getChain() {
    return this.db
      .select()
      .from(decisionAuditChains)
      .where(eq(decisionAuditChains.rootId, this.chainId));
  }
}

// 5. Usage in request handler
async function approveInvoice(req: Request) {
  const logger = new DecisionAuditLogger(db, req.user.tenantId, req.user.id);

  const start = performance.now();

  try {
    // 1. Retrieve invoice (logged as data access)
    const invoice = await db.query.invoices.findFirst({
      where: eq(invoices.id, req.params.invoiceId),
    });

    await logger.logDecision({
      eventType: "rule_evaluated",
      scope: "invoice.approve",
      context: { invoiceId: req.params.invoiceId },
      decision: { invoiceFound: !!invoice },
      durationMs: performance.now() - start,
      status: "success",
    });

    // 2. Check approval policy
    const policy = await resolveMetadata("invoice.approval", {
      tenantId: req.user.tenantId,
      departmentId: req.user.departmentId,
    });

    await logger.logDecision({
      eventType: "policy_enforced",
      scope: "invoice.approval",
      context: { policy },
      decision: { approved: req.user.role === "approver" },
      durationMs: performance.now() - start,
      status: req.user.role === "approver" ? "success" : "error",
    });

    // 3. Update invoice
    const updated = await db
      .update(invoices)
      .set({ status: "approved" })
      .where(eq(invoices.id, req.params.invoiceId));

    await logger.logDecision({
      eventType: "workflow_transitioned",
      scope: "invoice.status",
      context: { previousStatus: invoice.status },
      decision: { newStatus: "approved" },
      durationMs: performance.now() - start,
      status: "success",
    });

    return { chainId: logger.chainId, invoice: updated };
  } catch (error) {
    await logger.logDecision({
      eventType: "rule_evaluated",
      scope: "invoice.approve",
      context: {},
      decision: {},
      durationMs: performance.now() - start,
      status: "error",
      error: { message: error.message },
    });

    throw error;
  }
}

// 6. Audit queries (post-incident analysis)
async function findDecisionsInChain(chainId: string) {
  return db
    .select()
    .from(decisionAuditEntries)
    .where(eq(decisionAuditEntries.chainId, chainId))
    .orderBy(asc(decisionAuditEntries.timestamp));
}

async function findUserActivity(tenantId: string, userId: string, dateRange: DateRange) {
  return db
    .select()
    .from(decisionAuditEntries)
    .where(
      and(
        eq(decisionAuditEntries.tenantId, tenantId),
        eq(decisionAuditEntries.userId, userId),
        gte(decisionAuditEntries.timestamp, dateRange.start),
        lte(decisionAuditEntries.timestamp, dateRange.end)
      )
    )
    .orderBy(desc(decisionAuditEntries.timestamp));
}

async function findFailedDecisions(tenantId: string) {
  return db
    .select()
    .from(decisionAuditEntries)
    .where(
      and(eq(decisionAuditEntries.tenantId, tenantId), eq(decisionAuditEntries.status, "error"))
    )
    .orderBy(desc(decisionAuditEntries.timestamp));
}
```

**Audit data retention policy**:

```typescript
// 1. Define retention periods per event type
const RETENTION_POLICY = {
  rule_evaluated: 7 * 365, // 7 years for financial audit
  policy_enforced: 7 * 365,
  workflow_transitioned: 3 * 365, // 3 years for workflow history
  event_propagated: 1 * 365, // 1 year for operational debugging
  layout_rendered: 90, // 90 days (low risk)
  metadata_resolved: 90,
};

// 2. Archive old audit entries (immutable, so move to cold storage)
async function archiveAuditEntries() {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - 365); // 1 year

  const toArchive = await db
    .select()
    .from(decisionAuditEntries)
    .where(lt(decisionAuditEntries.timestamp, cutoffDate));

  // Move to S3 or archive table
  for (const batch of chunk(toArchive, 10000)) {
    await archiveToS3(batch);
    await db.delete(decisionAuditEntries).where(
      inArray(
        decisionAuditEntries.id,
        batch.map((e) => e.id)
      )
    );
  }
}

// Schedule weekly
schedule.scheduleJob("0 0 * * 0", archiveAuditEntries);
```

---

## 3. Event Mesh Persistence

### Pattern: Event Store + Event Projections

**Why this pattern**: Event sourcing enables temporal queries ("what was the state at time X?") and audit-friendly replay.

**When to use**:

- Workflow orchestration (track step execution history)
- Saga pattern implementation (distributed transactions)
- CQRS projection patterns
- Complex event correlation

**Implementation**:

```typescript
// 1. Event store: immutable event log
export const meshEvents = pgTable(
  "mesh_events",
  {
    id: text("id").primaryKey(),
    tenantId: text("tenant_id").notNull(),
    aggregateId: text("aggregate_id").notNull(), // e.g., "invoice-INV-001"
    aggregateType: text("aggregate_type").notNull(), // e.g., "invoice"
    eventType: text("event_type").notNull(), // e.g., "invoice.created"
    eventVersion: integer("event_version").notNull().default(1),
    payload: jsonb("payload").notNull(), // Event data
    metadata: jsonb("metadata").$type<{
      correlationId: string;
      causationId: string;
      userId: string;
      timestamp: Date;
    }>(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => ({
    tenantIdx: index("mesh_events_tenant_idx").on(t.tenantId),
    aggregateIdx: index("mesh_events_aggregate_idx").on(t.tenantId, t.aggregateType, t.aggregateId),
    eventTypeIdx: index("mesh_events_event_type_idx").on(t.eventType),
    correlationIdx: index("mesh_events_correlation_idx").on(
      t.tenantId,
      sql`(metadata->>'correlationId')`
    ), // Follow event chains
    createdIdx: index("mesh_events_created_idx").on(t.createdAt),
  })
);

// 2. Event ledger: append-only transaction log
export const eventLedger = pgTable(
  "event_ledger",
  {
    id: serial("id").primaryKey(),
    eventId: text("event_id")
      .notNull()
      .references(() => meshEvents.id),
    ledgerEntryId: text("ledger_entry_id").unique().notNull(),
    previousEntryHash: text("previous_entry_hash"), // Chain hash for integrity
    entryHash: text("entry_hash").notNull(), // SHA256 of this entry
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => ({
    sequenceIdx: index("event_ledger_sequence_idx").on(t.id),
  })
);

// 3. Event projections: denormalized read views updated from events
export const invoiceProjection = pgTable(
  "invoice_projection",
  {
    tenantId: text("tenant_id").notNull(),
    invoiceId: text("invoice_id").notNull(),
    version: integer("version").notNull(), // Event version at time of projection
    invoiceNumber: text("invoice_number").notNull(),
    status: text("status").notNull().default("draft"), // Latest state
    amount: decimal("amount", { precision: 12, scale: 2 }),
    lastModified: timestamp("last_modified").notNull(),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.tenantId, t.invoiceId] }),
    tenantIdx: index("invoice_projection_tenant_idx").on(t.tenantId),
    statusIdx: index("invoice_projection_status_idx").on(t.tenantId, t.status),
  })
);

// 4. Publish event to event store
class EventStore {
  async publishEvent(
    tenantId: string,
    eventType: string,
    aggregateId: string,
    aggregateType: string,
    payload: Record<string, unknown>,
    metadata?: Record<string, unknown>
  ) {
    const eventId = randomUUID();

    return await db.transaction(async (tx) => {
      // 1. Write to event store
      const event = await tx
        .insert(meshEvents)
        .values({
          id: eventId,
          tenantId,
          eventType,
          aggregateId,
          aggregateType,
          payload,
          metadata,
        })
        .returning();

      // 2. Append to immutable ledger
      const previousEntry = await tx
        .select()
        .from(eventLedger)
        .orderBy(desc(eventLedger.id))
        .limit(1);

      const entryHash = crypto
        .createHash("sha256")
        .update(JSON.stringify({ ...event, previousHash: previousEntry[0]?.entryHash }))
        .digest("hex");

      await tx.insert(eventLedger).values({
        eventId,
        ledgerEntryHash: entryHash,
        previousEntryHash: previousEntry[0]?.entryHash,
      });

      // 3. Update projection
      await tx
        .insert(invoiceProjection)
        .values({
          tenantId,
          invoiceId: aggregateId,
          version: 1,
          invoiceNumber: payload.invoiceNumber,
          status: payload.status || "draft",
          amount: payload.amount,
          lastModified: new Date(),
        })
        .onConflictDoUpdate({
          target: [invoiceProjection.tenantId, invoiceProjection.invoiceId],
          set: {
            version: sql`${invoiceProjection.version} + 1`,
            status: payload.status || invoiceProjection.status,
            amount: payload.amount || invoiceProjection.amount,
            lastModified: new Date(),
          },
        });

      return event;
    });
  }

  // Replay events to rebuild state at specific time
  async replayEventsUntil(tenantId: string, aggregateId: string, untilTimestamp: Date) {
    return db
      .select()
      .from(meshEvents)
      .where(
        and(
          eq(meshEvents.tenantId, tenantId),
          eq(meshEvents.aggregateId, aggregateId),
          lte(meshEvents.createdAt, untilTimestamp)
        )
      )
      .orderBy(asc(meshEvents.createdAt));
  }

  // Find related events via correlation ID
  async findEventChain(correlationId: string) {
    return db
      .select()
      .from(meshEvents)
      .where(sql`${meshEvents.metadata}->>'correlationId' = ${correlationId}`)
      .orderBy(asc(meshEvents.createdAt));
  }
}

// 5. Usage
const eventStore = new EventStore();

// Publish invoice creation
await eventStore.publishEvent(
  "acme-corp",
  "invoice.created",
  "invoice-INV-001",
  "invoice",
  {
    invoiceNumber: "INV-001",
    amount: 1000.0,
    status: "draft",
  },
  {
    correlationId: "req-12345",
    userId: "alice",
  }
);

// Later: replay events to see what happened
const chain = await eventStore.findEventChain("req-12345");
```

---

## 4. Workflow Persistence

### Pattern: Workflow Definitions + Instances + Step History

**Why this pattern**: Decouple business process logic from application code. Allow non-developers to define workflows via UI.

**Implementation**:

```typescript
// 1. Workflow definitions (versioned blueprints)
export const workflowDefinitions = pgTable(
  "workflow_definitions",
  {
    id: uuid("id").primaryKey(),
    tenantId: text("tenant_id").notNull(),
    name: text("name").notNull(),
    scope: text("scope").notNull(), // e.g., "invoice.approval"
    version: integer("version").notNull().default(1),
    triggers: jsonb("triggers").$type<
      Array<{
        on: string; // "invoice.created"
        when?: Record<string, unknown>; // Optional condition
      }>
    >(),
    steps: jsonb("steps").$type<
      Array<{
        id: string;
        name: string;
        action: "send_event" | "apply_rule" | "check_policy" | "human_decision";
        params: Record<string, unknown>;
        nextSteps?: string[];
      }>
    >(),
    metadata: jsonb("metadata").$type<Record<string, unknown>>(), // Tenant overrides
    enabled: boolean("enabled").notNull().default(true),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (t) => ({
    tenantIdx: index("workflow_defs_tenant_idx").on(t.tenantId, t.scope),
  })
);

// 2. Workflow instances (execution state)
export const workflowInstances = pgTable(
  "workflow_instances",
  {
    id: uuid("id").primaryKey(),
    tenantId: text("tenant_id").notNull(),
    definitionId: uuid("definition_id")
      .notNull()
      .references(() => workflowDefinitions.id),
    aggregateId: text("aggregate_id").notNull(), // e.g., "invoice-INV-001"
    currentStep: text("current_step"),
    status: pgEnum("workflow_status", ["pending", "running", "completed", "failed"])
      .notNull()
      .default("pending"),
    context: jsonb("context").$type<Record<string, unknown>>(), // Passed through steps
    error: jsonb("error"), // If failed
    startedAt: timestamp("started_at"),
    completedAt: timestamp("completed_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (t) => ({
    tenantIdx: index("workflow_instances_tenant_idx").on(t.tenantId),
    aggregateIdx: index("workflow_instances_aggregate_idx").on(t.tenantId, t.aggregateId),
    statusIdx: index("workflow_instances_status_idx").on(t.status),
  })
);

// 3. Step execution history (immutable ledger)
export const workflowStepExecutions = pgTable(
  "workflow_step_executions",
  {
    id: uuid("id").primaryKey(),
    tenantId: text("tenant_id").notNull(),
    instanceId: uuid("instance_id")
      .notNull()
      .references(() => workflowInstances.id),
    stepId: text("step_id").notNull(),
    stepName: text("step_name").notNull(),
    action: text("action").notNull(),
    inputData: jsonb("input_data").$type<Record<string, unknown>>(),
    outputData: jsonb("output_data").$type<Record<string, unknown>>(),
    status: pgEnum("step_status", ["pending", "running", "success", "failed"]).notNull(),
    error: jsonb("error"),
    startedAt: timestamp("started_at").notNull(),
    completedAt: timestamp("completed_at"),
    durationMs: integer("duration_ms"),
  },
  (t) => ({
    instanceIdx: index("workflow_steps_instance_idx").on(t.tenantId, t.instanceId),
    statusIdx: index("workflow_steps_status_idx").on(t.status),
  })
);

// 4. Start workflow execution
async function startWorkflow(
  tenantId: string,
  trigger: { eventType: string; aggregateId: string; payload: Record<string, unknown> }
) {
  // Find matching definition
  const definition = await db.query.workflowDefinitions.findFirst({
    where: and(
      eq(workflowDefinitions.tenantId, tenantId),
      eq(workflowDefinitions.scope, trigger.eventType),
      eq(workflowDefinitions.enabled, true)
    ),
  });

  if (!definition) return; // No workflow for this event

  // Create instance
  const instance = await db
    .insert(workflowInstances)
    .values({
      tenantId,
      definitionId: definition.id,
      aggregateId: trigger.aggregateId,
      currentStep: definition.steps[0]?.id,
      context: trigger.payload,
    })
    .returning();

  // Execute first step
  await executeWorkflowStep(tenantId, instance.id, definition.steps[0]);

  return instance;
}

// 5. Execute single step
async function executeWorkflowStep(tenantId: string, instanceId: string, step: WorkflowStep) {
  const start = Date.now();
  const stepExecution = {
    id: randomUUID(),
    instanceId,
    stepId: step.id,
    stepName: step.name,
    action: step.action,
    status: "running" as const,
    startedAt: new Date(),
  };

  try {
    let output;

    switch (step.action) {
      case "send_event":
        output = await publishEvent(step.params);
        break;
      case "apply_rule":
        output = await evaluateRule(step.params);
        break;
      case "check_policy":
        output = await enforcePolicy(step.params);
        break;
      case "human_decision":
        // Wait for external decision (webhook)
        output = await waitForDecision(step.params);
        break;
    }

    // Log successful step
    await db.insert(workflowStepExecutions).values({
      ...stepExecution,
      outputData: output,
      status: "success",
      completedAt: new Date(),
      durationMs: Date.now() - start,
    });

    // Continue to next step
    if (step.nextSteps?.length) {
      const nextStepId = step.nextSteps[0]; // Simple linear; support branching
      await executeWorkflowStep(tenantId, instanceId, findStep(nextStepId));
    } else {
      // Mark instance as completed
      await db
        .update(workflowInstances)
        .set({ status: "completed", completedAt: new Date() })
        .where(eq(workflowInstances.id, instanceId));
    }
  } catch (error) {
    await db.insert(workflowStepExecutions).values({
      ...stepExecution,
      status: "failed",
      error: { message: error.message },
      completedAt: new Date(),
      durationMs: Date.now() - start,
    });

    await db
      .update(workflowInstances)
      .set({ status: "failed", error: { message: error.message } })
      .where(eq(workflowInstances.id, instanceId));
  }
}
```

---

## 5. Zero-Downtime Migration Patterns

### Pattern: Backward-Compatible Schema Changes

**Why this pattern**: ERP systems run 24/7. Schema changes must not cause downtime or data loss.

**When to use**: Any production schema migration

**Drizzle Kit migration examples**:

```typescript
// ❌ Don't: This locks the table and causes downtime
ALTER TABLE invoices DROP COLUMN legacy_field;

// ✅ Do: Use Drizzle Kit with IF EXISTS
import { sql } from "drizzle-orm";

export async function up(db: Database) {
  // Step 1: Add nullable column first (no lock)
  await db.execute(sql`
    ALTER TABLE invoices
    ADD COLUMN IF NOT EXISTS new_status TEXT;
  `);

  // Step 2: Backfill data (can take time, but allows reads/writes)
  await db.execute(sql`
    UPDATE invoices
    SET new_status = status
    WHERE new_status IS NULL;
  `);

  // Step 3: Make NOT NULL (metadata-only change, no lock)
  await db.execute(sql`
    ALTER TABLE invoices
    ALTER COLUMN new_status SET NOT NULL;
  `);

  // Step 4: Drop old column (after app deployed to use new column)
  await db.execute(sql`
    ALTER TABLE invoices
    DROP COLUMN IF EXISTS status;
  `);
}

export async function down(db: Database) {
  // Reverse migration (for rollback)
  await db.execute(sql`
    ALTER TABLE invoices
    ADD COLUMN IF NOT EXISTS status TEXT;
  `);
}
```

**Adding indexes without locking**:

```typescript
// ❌ Locks table
CREATE INDEX invoices_status_idx ON invoices (status);

// ✅ Use CONCURRENTLY (PostgreSQL 9.1+)
await db.execute(sql`
  CREATE INDEX CONCURRENTLY invoices_status_idx
  ON invoices (status);
`);

// Verify index creation
await db.execute(sql`
  SELECT schemaname, tablename, indexname
  FROM pg_indexes
  WHERE tablename = 'invoices'
  AND indexname = 'invoices_status_idx';
`);
```

**Multi-step zero-downtime pattern**:

```typescript
// Day 1: Deploy migration 1 (backward compatible)
// - Add new column
// - Create new index
// - NO code changes required yet

// Day 2: Deploy code change
// - Application starts writing to new column
// - Old column ignored (dual-write optional)

// Day 3: Deploy migration 2 (cleanup)
// - Drop old column/index
// - Application already uses new structure
```

---

## 6. Performance Optimization for Multi-Tenant Systems

### Tenant-Aware Query Patterns

**Always include tenant in WHERE clause** (or RLS enforces it):

```typescript
// ✅ Fast: Uses tenant_org composite index
const invoice = await db
  .select()
  .from(invoices)
  .where(and(eq(invoices.tenantId, "acme-corp"), eq(invoices.invoiceNumber, "INV-001")));

// ❌ Slow: Full table scan without tenant filter
const invoice = await db.select().from(invoices).where(eq(invoices.invoiceNumber, "INV-001"));
// Even though RLS filters, query planner doesn't know tenant filter is coming
```

**Pagination for multi-tenant reporting**:

```typescript
async function listInvoices(
  tenantId: string,
  filters: {
    status?: string;
    limit?: number;
    offset?: number;
  }
) {
  return db
    .select()
    .from(invoices)
    .where(
      and(
        eq(invoices.tenantId, tenantId), // Always first
        filters.status ? eq(invoices.status, filters.status) : undefined
      )
    )
    .orderBy(desc(invoices.createdAt))
    .limit(filters.limit || 50)
    .offset(filters.offset || 0);
}

// Usage: Pagination for SaaS listing
const page1 = await listInvoices("acme-corp", {
  status: "approved",
  limit: 25,
  offset: 0,
});
const page2 = await listInvoices("acme-corp", {
  status: "approved",
  limit: 25,
  offset: 25,
});
```

**Batch operations for performance**:

```typescript
// ❌ N queries (slow)
for (const invoiceId of invoiceIds) {
  await db.update(invoices).set({ status: "archived" }).where(eq(invoices.id, invoiceId));
}

// ✅ 1 query (fast)
await db.update(invoices).set({ status: "archived" }).where(inArray(invoices.id, invoiceIds));
```

---

## 7. Integration with Other Skills

- **`erp-workflow-patterns`**: Business Truth Graph schema (entities, fields, layouts)
- **`event-sourcing`**: Event store implementation details
- **`postgresql-database-engineering`**: Advanced indexing and query optimization
- **`drizzle-orm`**: Type-safe schema API
- **`multi-tenant-architecture`**: Tenant routing and isolation strategies

---

## Summary Table: Pattern Selection

| Pattern                          | Use Case                        | Trade-off                                               |
| -------------------------------- | ------------------------------- | ------------------------------------------------------- |
| **RLS + Tenant Context**         | Strict isolation + compliance   | Small perf overhead for policy check                    |
| **Hierarchical Metadata**        | Per-tenant customization        | Query complexity increases with layers                  |
| **Immutable Audit Logs**         | Regulatory compliance           | Log table can grow large (require archival policy)      |
| **Event Store + Projections**    | Temporal queries + event replay | Complex to operate (event versioning, projection sync)  |
| **Workflow Definitions + Steps** | Business process abstraction    | Requires orchestration layer (deploy workflows != code) |
| **Zero-Downtime Migrations**     | Always-on production systems    | Requires more steps and careful sequencing              |

---

_For questions or pattern updates, refer to the AFENDA architecture documentation._
