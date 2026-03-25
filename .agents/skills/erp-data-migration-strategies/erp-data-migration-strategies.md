---
name: erp-data-migration-strategies
description: Zero-downtime, compliance-safe data migration strategies for ERP SaaS systems. Covers multi-step evolution, feature flagging, history preservation, reversibility, and backward compatibility for mission-critical systems.
type: skill
tags:
  - erp
  - data-migration
  - zero-downtime
  - schema-evolution
  - compliance
  - drizzle-orm
  - postgresql
  - feature-flags
authors:
  - AFENDA Team
created: 2024-01-15
updated: 2024-01-15
version: 1.0.0
keywords:
  - zero-downtime migrations
  - feature flags
  - rollback strategies
  - data preservation
  - dual-write patterns
  - backward compatibility
  - staging environments
  - compliance auditing
---

# ERP Data Migration Strategies for Production Systems

Advanced patterns for migrating data in 24/7 mission-critical ERP systems. These strategies ensure zero downtime, preserve audit trails, maintain compliance, and enable safe rollbacks.

## 1. Multi-Step Migration Pattern

### Pattern: Backward-Compatible Schema Evolution

**Why this pattern**: Production systems cannot tolerate downtime. Multi-step migrations allow incremental rollout with rollback capability at each step.

**When to use**:

- Production database migrations
- Multi-tenant environments where clients cannot be forced to upgrade
- Systems with strict SLA requirements
- Migrating critical business data (invoices, GL accounts, etc.)

**Implementation**:

```typescript
// 1. Step 0 (Prerequisites): Verify data integrity
async function validateDataIntegrity(db: Database) {
  // Check for NULL values where NOT NULL is required
  const orphanedRecords = await db.select().from(invoices).where(isNull(invoices.organizationId));

  if (orphanedRecords.length > 0) {
    throw new Error(`Cannot migrate: ${orphanedRecords.length} orphaned invoice records`);
  }

  // Check for constraint violations
  const violationCount = await db.execute(sql`
    SELECT COUNT(*) FROM invoices 
    WHERE amount < 0 AND status != 'cancelled'
  `);

  if (violationCount[0].count > 0) {
    throw new Error("Data integrity violations found");
  }

  console.log("✅ Data integrity check passed");
}

// 2. Step 1: Add new column (backward compatible)
async function addNewColumn(db: Database) {
  console.log("Step 1: Adding new column (non-blocking)...");

  await db.execute(sql`
    ALTER TABLE invoices 
    ADD COLUMN IF NOT EXISTS tenant_id TEXT 
    DEFAULT NULL; -- Nullable initially
  `);

  // Create index for performance
  await db.execute(sql`
    CREATE INDEX CONCURRENTLY IF NOT EXISTS invoices_tenant_idx 
    ON invoices(tenant_id);
  `);

  console.log("✅ Step 1 complete: column added");
}

// 3. Step 2: Backfill data (production is live)
async function backfillData(db: Database, options?: { batchSize?: number }) {
  const batchSize = options?.batchSize || 1000;
  console.log(`Step 2: Backfilling ${batchSize} rows at a time (non-blocking)...`);

  let totalUpdated = 0;

  while (true) {
    // Update in small batches to avoid table locks
    const result = await db.execute(sql`
      UPDATE invoices 
      SET tenant_id = organizations.tenant_id 
      FROM organizations 
      WHERE invoices.organization_id = organizations.id 
        AND invoices.tenant_id IS NULL 
      LIMIT ${batchSize}
    `);

    const rowsAffected = result.count || 0;
    if (rowsAffected === 0) break;

    totalUpdated += rowsAffected;

    // Log progress
    console.log(`  Processed ${totalUpdated} rows... (next batch in 100ms)`);
    await new Promise((resolve) => setTimeout(resolve, 100)); // Stagger updates
  }

  console.log(`✅ Step 2 complete: ${totalUpdated} rows backfilled`);
}

// 4. Step 3: Deploy code that uses new column
// (Application now writes to both old and new columns)
async function deployCodeToUseTenantId() {
  // Deploy app code that:
  // 1. Reads from tenant_id if present
  // 2. Falls back to organization_id if tenant_id is NULL
  // 3. Writes to both columns (dual-write)

  console.log("Step 3: Deploy code to use new column...");

  // Example handler
  return async function getInvoice(req: Request) {
    const invoice = await db.query.invoices.findFirst({
      where: eq(invoices.id, req.params.invoiceId),
    });

    // Dual-write pattern
    if (invoice.tenantId === null && invoice.organizationId !== null) {
      // Backfill on-read if still migrating
      await db
        .update(invoices)
        .set({ tenantId: invoice.organizationId })
        .where(eq(invoices.id, invoice.id));
    }

    return invoice;
  };
}

// 5. Step 4: Make column NOT NULL (after all NULL values backfilled)
async function makeColumnNotNull(db: Database) {
  console.log("Step 4: Making column NOT NULL (metadata-only change)...");

  // Check no NULLs remain
  const nullCount = await db.execute(sql`
    SELECT COUNT(*) FROM invoices WHERE tenant_id IS NULL
  `);

  if (nullCount[0].count > 0) {
    throw new Error(`Cannot make NOT NULL: ${nullCount[0].count} rows still have NULL`);
  }

  // Make NOT NULL (fast metadata change)
  await db.execute(sql`
    ALTER TABLE invoices 
    ALTER COLUMN tenant_id SET NOT NULL;
  `);

  console.log("✅ Step 4 complete: column is NOT NULL");
}

// 6. Step 5: Drop old column (final cleanup)
async function dropOldColumn(db: Database) {
  console.log("Step 5: Dropping old column...");

  // Only after:
  // 1. All code using new column deployed
  // 2. Monitoring shows no errors
  // 3. Rollback window closed

  await db.execute(sql`
    ALTER TABLE invoices 
    DROP COLUMN IF EXISTS organization_id;
  `);

  console.log("✅ Step 5 complete: old column dropped");
}

// 7. Execute migration with checkpoints and rollback capability
type MigrationStep =
  | "validate"
  | "add-column"
  | "backfill"
  | "deploy-code"
  | "make-not-null"
  | "drop-old";

async function executeMigration(db: Database, targetStep: MigrationStep = "drop-old") {
  const steps: Record<MigrationStep, () => Promise<void>> = {
    validate: () => validateDataIntegrity(db),
    "add-column": async () => {
      await validateDataIntegrity(db);
      await addNewColumn(db);
    },
    backfill: async () => {
      await validateDataIntegrity(db);
      await addNewColumn(db);
      await backfillData(db);
    },
    "deploy-code": async () => {
      // Manual step: deploy application code
      console.log("🔄 Manually deploy application code to use new column");
    },
    "make-not-null": async () => {
      await makeColumnNotNull(db);
    },
    "drop-old": async () => {
      await dropOldColumn(db);
    },
  };

  const order: MigrationStep[] = [
    "validate",
    "add-column",
    "backfill",
    "deploy-code",
    "make-not-null",
    "drop-old",
  ];
  const targetIndex = order.indexOf(targetStep);

  for (const step of order.slice(0, targetIndex + 1)) {
    try {
      console.log(`\n📋 Executing: ${step}`);
      await steps[step]();
    } catch (error) {
      console.error(
        `❌ Step failed: ${step}\n${error.message}\n\nROLLBACK available to previous step.`
      );
      throw error;
    }
  }

  console.log("\n✅ All migration steps completed");
}

// 8. Rollback strategy
async function rollbackMigration(db: Database, toStep: MigrationStep) {
  console.log(`🔄 Rolling back to: ${toStep}`);

  const rollbacks: Record<MigrationStep, () => Promise<void>> = {
    validate: async () => {
      // No rollback needed
    },
    "add-column": async () => {
      await db.execute(sql`
        ALTER TABLE invoices DROP COLUMN IF EXISTS tenant_id
      `);
    },
    backfill: async () => {
      // Revert to NULL values
      await db.execute(sql`
        UPDATE invoices SET tenant_id = NULL
      `);
    },
    "deploy-code": async () => {
      // Redeploy previous code version
      console.log("🔄 Manually redeploy previous application code");
    },
    "make-not-null": async () => {
      // Revert to nullable
      await db.execute(sql`
        ALTER TABLE invoices ALTER COLUMN tenant_id DROP NOT NULL
      `);
    },
    "drop-old": async () => {
      // Re-add dropped column (requires backup/PITR)
      await db.execute(sql`
        ALTER TABLE invoices 
        ADD COLUMN organization_id UUID REFERENCES organizations(id)
      `);
    },
  };

  if (rollbacks[toStep]) {
    await rollbacks[toStep]();
    console.log(`✅ Rolled back to: ${toStep}`);
  }
}

// 9. Usage
async function main() {
  const db = createConnection();

  // Day 1: Add column
  await executeMigration(db, "add-column");

  // Day 1-2: Backfill (can run overnight)
  await executeMigration(db, "backfill");

  // Day 3: Deploy new code
  await executeMigration(db, "deploy-code");

  // Day 5 (after monitoring): Set NOT NULL
  await executeMigration(db, "make-not-null");

  // Day 7 (after confidence): Drop old column
  await executeMigration(db, "drop-old");
}
```

---

## 2. Feature Flags for Schema Evolution

### Pattern: Canary Rollout with Percentage-Based Rollout

**Why this pattern**: Control who sees new schema/behavior. Gradually increase rollout percentage while monitoring errors.

**Implementation**:

```typescript
// 1. Define feature flags for schema changes
export const schemaFeatureFlags = pgTable(
  "schema_feature_flags",
  {
    id: uuid("id").primaryKey(),
    tenantId: text("tenant_id").notNull(),
    featureName: text("feature_name").notNull(), // e.g., "use_new_tenant_column"
    isEnabled: boolean("is_enabled").notNull().default(false),
    rolloutPercentage: integer("rollout_percentage").default(0), // 0-100
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.tenantId, t.featureName] }),
    tenantIdx: index("flags_tenant_idx").on(t.tenantId),
  })
);

// 2. Feature flag resolver with deterministic assignment
class FeatureFlagResolver {
  async isFeatureEnabled(tenantId: string, featureName: string): Promise<boolean> {
    // Get flag config
    const flag = await db.query.schemaFeatureFlags.findFirst({
      where: and(
        eq(schemaFeatureFlags.tenantId, tenantId),
        eq(schemaFeatureFlags.featureName, featureName)
      ),
    });

    if (!flag) return false;
    if (!flag.isEnabled) return false;

    // Deterministic rollout: use hash of tenant to ensure stable allocation
    const tenantHash = Math.abs(
      tenantId.split("").reduce((h, c) => {
        h = (h << 5) - h + c.charCodeAt(0);
        return h & h; // Convert to 32bit integer
      }, 0)
    );

    const percentile = tenantHash % 100;
    return percentile < flag.rolloutPercentage;
  }

  async setRolloutPercentage(featureName: string, percentage: number): Promise<void> {
    // Update all tenants' rollout for this feature
    console.log(`🚀 Rolling out ${featureName} to ${percentage}% of tenants`);

    await db
      .update(schemaFeatureFlags)
      .set({ rolloutPercentage: percentage })
      .where(eq(schemaFeatureFlags.featureName, featureName));

    // Log the rollout event for audit
    await db.insert(auditLog).values({
      action: "feature_rollout",
      featureName,
      percentage,
      timestamp: new Date(),
    });
  }
}

// 3. Usage in query logic
async function getInvoice(req: Request) {
  const flagResolver = new FeatureFlagResolver();
  const shouldUseTenantId = await flagResolver.isFeatureEnabled(
    req.user.tenantId,
    "use_new_tenant_column"
  );

  let invoice;
  if (shouldUseTenantId) {
    // Use new column
    invoice = await db
      .select()
      .from(invoices)
      .where(and(eq(invoices.tenantId, req.user.tenantId), eq(invoices.id, req.params.invoiceId)));
  } else {
    // Use old column (fallback)
    invoice = await db.select().from(invoices).where(eq(invoices.id, req.params.invoiceId));
  }

  return invoice;
}

// 4. Gradual rollout timeline
async function rolloutSchedule() {
  const flagResolver = new FeatureFlagResolver();

  // Day 1: 5% of tenants
  await flagResolver.setRolloutPercentage("use_new_tenant_column", 5);
  console.log("📊 Monitor error rate for 24h...");

  // Day 2: 25% if error rate < 0.1%
  await flagResolver.setRolloutPercentage("use_new_tenant_column", 25);

  // Day 3: 50% if still stable
  await flagResolver.setRolloutPercentage("use_new_tenant_column", 50);

  // Day 4: 100%
  await flagResolver.setRolloutPercentage("use_new_tenant_column", 100);

  console.log("✅ Feature rolled out to 100% of tenants");
}
```

---

## 3. Data History and Audit Trail Preservation

### Pattern: Temporal Tables + Event Logging

**Why this pattern**: Regulatory compliance requires proving what data was changed and by whom. Temporal tables provide automatic history while events enable replay.

**Implementation**:

```typescript
// 1. Create temporal table (system-versioned history)
export const invoices = pgTable("invoices", {
  id: uuid("id").primaryKey(),
  tenantId: text("tenant_id").notNull(),
  invoiceNumber: text("invoice_number").notNull(),
  amount: decimal("amount", { precision: 12, scale: 2 }).notNull(),
  status: text("status").notNull().default("draft"),
  validFrom: timestamp("sys_time_start").notNull().defaultNow(), // System-managed
  validTo: timestamp("sys_time_end")
    .notNull()
    .default(sql`'infinity'::timestamp`), // System-managed
});

export const invoicesHistory = pgTable("invoices_history", {
  id: uuid("id").primaryKey(),
  tenantId: text("tenant_id").notNull(),
  invoiceNumber: text("invoice_number").notNull(),
  amount: decimal("amount", { precision: 12, scale: 2 }).notNull(),
  status: text("status").notNull(),
  validFrom: timestamp("sys_time_start").notNull(),
  validTo: timestamp("sys_time_end").notNull(),
});

// 2. Enable temporal versioning
async function enableTemporalVersioning(db: Database) {
  await db.execute(sql`
    ALTER TABLE invoices 
    ADD COLUMN sys_time_start TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    ADD COLUMN sys_time_end TIMESTAMP NOT NULL DEFAULT 'infinity'
  `);

  // Create history table
  await db.execute(sql`
    CREATE TABLE invoices_history AS 
    SELECT *, sys_time_start, sys_time_end FROM invoices 
    WHERE FALSE;
  `);

  // Enable temporal versioning
  await db.execute(sql`
    ALTER TABLE invoices 
    ADD SYSTEM VERSIONING NOT MATCHED INVOKE
      (SELECT * FROM invoices_history UNION ALL SELECT * FROM invoices)
  `);
}

// 3. Query historical states
async function queryInvoiceAtTime(invoiceId: string, timestamp: Date): Promise<any> {
  // PostgreSQL temporal query
  return db.execute(sql`
    SELECT * FROM invoices FOR SYSTEM_TIME AS OF ${timestamp}
    WHERE id = ${invoiceId}
  `);
}

// 4. Track who changed what
export const changeLog = pgTable(
  "change_log",
  {
    id: uuid("id").primaryKey(),
    tenantId: text("tenant_id").notNull(),
    entityId: uuid("entity_id").notNull(),
    entityType: text("entity_type").notNull(), // "invoice"
    action: pgEnum("change_action", ["create", "update", "delete"]).notNull(),
    userId: text("user_id").notNull(),
    previousValues: jsonb("previous_values"), // Before
    newValues: jsonb("new_values"), // After
    changedFields: jsonb("changed_fields").$type<string[]>(), // Which fields changed
    reason: text("reason"), // Why (attached to action)
    timestamp: timestamp("timestamp").defaultNow().notNull(),
  },
  (t) => ({
    tenantIdx: index("changelog_tenant_idx").on(t.tenantId),
    entityIdx: index("changelog_entity_idx").on(t.entityId),
    userIdx: index("changelog_user_idx").on(t.userId),
    timestampIdx: index("changelog_timestamp_idx").on(t.timestamp),
  })
);

// 5. Automatic change tracking via database triggers
async function setupChangeTracking(db: Database) {
  await db.execute(sql`
    CREATE TRIGGER invoice_change_track
    AFTER UPDATE ON invoices
    FOR EACH ROW
    EXECUTE FUNCTION log_invoice_change();

    CREATE FUNCTION log_invoice_change() RETURNS TRIGGER AS $$
    BEGIN
      INSERT INTO change_log (
        tenant_id, entity_id, entity_type, action, 
        user_id, previous_values, new_values, changed_fields, timestamp
      ) VALUES (
        NEW.tenant_id,
        NEW.id,
        'invoice',
        'update',
        COALESCE(current_setting('afenda.user_id', true), 'system'),
        row_to_json(OLD),
        row_to_json(NEW),
        (SELECT array_agg(key) 
         FROM jsonb_each(row_to_json(NEW)) 
         WHERE row_to_json(NEW) ->> key != row_to_json(OLD) ->> key),
        CURRENT_TIMESTAMP
      );
      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;
  `);
}

// 6. Query audit trail
async function getAuditTrail(invoiceId: string) {
  return db
    .select()
    .from(changeLog)
    .where(eq(changeLog.entityId, invoiceId))
    .orderBy(desc(changeLog.timestamp));
}

// 7. Compliance report: who accessed sensitive data
async function generateAccessAudit(tenantId: string, dateRange: { start: Date; end: Date }) {
  return db
    .select()
    .from(changeLog)
    .where(
      and(
        eq(changeLog.tenantId, tenantId),
        gte(changeLog.timestamp, dateRange.start),
        lte(changeLog.timestamp, dateRange.end)
      )
    )
    .groupBy(changeLog.userId)
    .orderBy(desc(sql`count(*)`));
}
```

---

## 4. Reversibility and Rollback Strategies

### Pattern: Point-in-Time Recovery (PITR) + Backup Strategy

**Why this pattern**: If migration goes wrong, restore to pre-migration state. PITR enables recovery to any second.

**Implementation**:

```typescript
// 1. Pre-migration backup
async function createPreMigrationBackup(db: Database, migrationName: string): Promise<string> {
  const backupId = `backup-${migrationName}-${Date.now()}`;

  // Create point-in-time backup via Neon API or pg_basebackup
  const backup = await fetch("https://api.neon.tech/v2/projects/backup", {
    method: "POST",
    headers: { Authorization: `Bearer ${process.env.NEON_API_KEY}` },
    body: JSON.stringify({
      backup_id: backupId,
      branch_id: process.env.NEON_BRANCH_ID,
      timestamp: new Date().toISOString(),
    }),
  });

  console.log(`✅ Pre-migration backup created: ${backupId}`);
  return backupId;
}

// 2. Verify backup before proceeding
async function verifyBackup(backupId: string): Promise<boolean> {
  const backup = await fetch(`https://api.neon.tech/v2/projects/backups/${backupId}`, {
    headers: { Authorization: `Bearer ${process.env.NEON_API_KEY}` },
  });

  const data = (await backup.json()) as { status: string };
  if (data.status === "completed") {
    console.log("✅ Backup verified and ready for rollback");
    return true;
  }

  console.log("❌ Backup not ready yet");
  return false;
}

// 3. Rollback via PITR
async function rollbackToPreMigration(backupId: string) {
  console.log(`🔄 Rolling back migration via PITR...`);

  // Restore branch from backup
  const restore = await fetch(`https://api.neon.tech/v2/projects/restore`, {
    method: "POST",
    headers: { Authorization: `Bearer ${process.env.NEON_API_KEY}` },
    body: JSON.stringify({
      backup_id: backupId,
      branch_id: process.env.NEON_BRANCH_ID,
    }),
  });

  if (restore.ok) {
    console.log("✅ Rollback complete. Database restored to pre-migration state.");
  } else {
    console.error("❌ Rollback failed", await restore.text());
  }
}

// 4. Manual intervention protocol
async function rolledBackMigrationProtocol(backupId: string) {
  console.log(`
  🚨 MIGRATION ROLLBACK INITIATED

  Status: Database restored from backup ${backupId}

  Post-Rollback Checklist:
  [ ] Verify data consistency
  [ ] Check for data loss in backfilled records
  [ ] Notify affected users
  [ ] Analyze root cause
  [ ] Update runbooks
  [ ] Schedule retry with fix
  [ ] Decompress manual backups

  Recovery time: ~5-10 minutes
  `);

  // Send alert to on-call team
  await notifyOncall({
    severity: "critical",
    title: "Migration rollback executed",
    details: { backupId, timestamp: new Date() },
  });
}

// 5. Usage example
async function safeMigration() {
  const backupId = await createPreMigrationBackup(db, "add-tenant-column");

  // Wait for backup completion
  let backupReady = false;
  let attempts = 0;
  while (!backupReady && attempts < 10) {
    backupReady = await verifyBackup(backupId);
    if (!backupReady) await new Promise((r) => setTimeout(r, 1000));
    attempts++;
  }

  if (!backupReady) {
    throw new Error("Backup failed to complete");
  }

  try {
    // Execute migration
    await executeMigration(db, "add-column");
    await backfillData(db);
    console.log("✅ Migration succeeded");
  } catch (error) {
    // Automatic rollback on error
    await rollbackToPreMigration(backupId);
    await rolledBackMigrationProtocol(backupId);
    throw error;
  }
}
```

---

## 5. Schema Change Testing & Validation

### Pattern: Pre-Deploy Verification

**Implementation**:

```typescript
// 1. Test schema compatibility
async function validateSchemaCompat(oldDb: Database, newDb: Database): Promise<boolean> {
  console.log("Testing schema compatibility...");

  // Test 1: All existing queries still work
  const testQueries = [
    sql`SELECT * FROM invoices LIMIT 1`,
    sql`SELECT COUNT(*) FROM invoices WHERE status = 'draft'`,
    sql`SELECT * FROM invoices WHERE tenant_id = $1 ORDER BY created_at`,
  ];

  for (const query of testQueries) {
    try {
      await oldDb.execute(query);
      await newDb.execute(query);
    } catch (error) {
      console.error(`❌ Query failed: ${error.message}`);
      return false;
    }
  }

  // Test 2: Data sample migration
  const sample = await oldDb.select().from(invoices).limit(10);
  for (const row of sample) {
    try {
      await newDb.insert(invoices).values(row);
    } catch (error) {
      console.error(`❌ Insert failed for row ${row.id}: ${error.message}`);
      return false;
    }
  }

  // Test 3: Performance regression check
  const oldPlan = await oldDb.execute(sql`
    EXPLAIN ANALYZE 
    SELECT * FROM invoices WHERE tenant_id = $1 LIMIT 100
  `);

  const newPlan = await newDb.execute(sql`
    EXPLAIN ANALYZE 
    SELECT * FROM invoices WHERE tenant_id = $1 LIMIT 100
  `);

  const oldCost = parseExplainCost(oldPlan);
  const newCost = parseExplainCost(newPlan);

  if (newCost > oldCost * 1.5) {
    console.warn(
      `⚠️  Performance regression: ${oldCost} → ${newCost} (${Math.round(((newCost - oldCost) / oldCost) * 100)}% slower)`
    );
  }

  console.log("✅ Schema compatibility verified");
  return true;
}

// 2. Run on staging environment first
async function deployToStaging(production: Database, staging: Database): Promise<void> {
  // Clone production schema to staging
  await staging.execute(sql`DROP SCHEMA IF EXISTS public CASCADE`);
  await staging.execute(
    sql`CREATE SCHEMA public
    AS SELECT * FROM dblink('${process.env.PROD_DB_URL}', '
      SELECT * FROM information_schema.tables 
      WHERE table_schema = ''public''
    ') AS t(
      table_catalog name,
      table_schema name,
      table_name name,
      table_type text
    )`
  );

  // Apply migration to staging
  console.log("Applying migration to staging...");
  await executeMigration(staging, "drop-old");

  // Validate
  await validateSchemaCompat(production, staging);
  console.log("✅ Staging environment ready for production rollout");
}
```

---

## 6. Multi-Tenant Migration Coordination

### Pattern: Phased Per-Tenant Rollout

**Why this pattern**: Different tenants may need different timelines. Rolling out per-tenant allows each customer to upgrade at their pace.

**Implementation**:

```typescript
// 1. Track per-tenant migration status
export const tenantMigrationStatus = pgTable(
  "tenant_migration_status",
  {
    id: uuid("id").primaryKey(),
    tenantId: text("tenant_id").notNull().unique(),
    migrationName: text("migration_name").notNull(),
    status: pgEnum("migration_status", [
      "pending",
      "in_progress",
      "completed",
      "failed",
      "rolled_back",
    ])
      .notNull()
      .default("pending"),
    startedAt: timestamp("started_at"),
    completedAt: timestamp("completed_at"),
    error: jsonb("error"),
    backupId: text("backup_id"),
    version: integer("version").notNull().default(1),
  },
  (t) => ({
    tenantMigrationIdx: primaryKey({
      columns: [t.tenantId, t.migrationName],
    }),
  })
);

// 2. Execute migration per tenant
async function executeTenantMigration(tenantId: string, migrationName: string): Promise<void> {
  // Mark as in-progress
  await db
    .update(tenantMigrationStatus)
    .set({ status: "in_progress", startedAt: new Date() })
    .where(
      and(
        eq(tenantMigrationStatus.tenantId, tenantId),
        eq(tenantMigrationStatus.migrationName, migrationName)
      )
    );

  try {
    // Create tenant-specific backup
    const backupId = await createTenantBackup(tenantId);

    // Set tenant context
    await db.execute(sql`SET LOCAL "afenda.tenant_id" = ${tenantId}`);

    // Execute migration
    await executeMigration(db, "drop-old");

    // Mark as completed
    await db
      .update(tenantMigrationStatus)
      .set({
        status: "completed",
        completedAt: new Date(),
        backupId,
      })
      .where(
        and(
          eq(tenantMigrationStatus.tenantId, tenantId),
          eq(tenantMigrationStatus.migrationName, migrationName)
        )
      );

    console.log(`✅ Tenant ${tenantId}: migration completed`);
  } catch (error) {
    await db
      .update(tenantMigrationStatus)
      .set({
        status: "failed",
        error: { message: error.message },
      })
      .where(
        and(
          eq(tenantMigrationStatus.tenantId, tenantId),
          eq(tenantMigrationStatus.migrationName, migrationName)
        )
      );

    console.error(`❌ Tenant ${tenantId}: migration failed - ${error.message}`);
  }
}

// 3. Batch migrate multiple tenants
async function batchMigrateTenants(
  tenants: string[],
  migrationName: string,
  options?: { concurrency?: number; waitBetween?: number }
): Promise<void> {
  const concurrency = options?.concurrency || 3;
  const waitBetween = options?.waitBetween || 5000;

  let inProgress = 0;

  for (const tenantId of tenants) {
    while (inProgress >= concurrency) {
      await new Promise((r) => setTimeout(r, 100));
    }

    inProgress++;

    executeTenantMigration(tenantId, migrationName)
      .then(() => {
        inProgress--;
      })
      .catch((error) => {
        console.error(`Tenant ${tenantId} failed:`, error);
        inProgress--;
      });

    await new Promise((r) => setTimeout(r, waitBetween));
  }

  // Wait for all in-flight to complete
  while (inProgress > 0) {
    await new Promise((r) => setTimeout(r, 1000));
  }

  console.log(`✅ Batch migration complete for ${tenants.length} tenants`);
}

// 4. Monitor migration progress
async function reportMigrationProgress(migrationName: string): Promise<void> {
  const stats = await db.execute(sql`
    SELECT 
      status,
      COUNT(*) as tenant_count,
      COUNT(CASE WHEN error IS NOT NULL THEN 1 END) as error_count
    FROM ${tenantMigrationStatus}
    WHERE migration_name = ${migrationName}
    GROUP BY status
  `);

  console.log(`
  📊 Migration Progress: ${migrationName}
  ${stats.map((s) => `  ${s.status}: ${s.tenant_count} tenants`).join("\n")}
  `);
}
```

---

## 7. Integration with Other Skills

- **`erp-database-patterns`**: Core schema design for migrations
- **`postgresql-database-engineering`**: Performance analysis, VACUUM, maintenance
- **`event-sourcing`**: Event-based change tracking
- **`monorepo-governance`**: Version governance during rollouts
- **`dependency-audit`**: Database connector version/compatibility checking

---

## Summary: Migration Checklist

```
Pre-Migration
□ Create backup + verify
□ Test schema on staging
□ Plan rollback procedure
□ Notify stakeholders

During Migration
□ Monitor error rate
□ Check query performance
□ Monitor CPU/memory usage
□ Keep rollback window open

Post-Migration
□ Verify data integrity
□ Monitor for 48h
□ Archive backups
□ Update documentation

Common Mistakes to Avoid
✗ Migrating during peak hours
✗ Skipping backup verification
✗ Changing multiple things at once
✗ Not testing on staging first
✗ Closing rollback window too early
```

---

_For detailed PostgreSQL migration guidance, see postgresql-database-engineering skill._
