---
name: erp-compliance-audit
description: Compliance and audit logging for regulated ERP systems. Covers SOX (Sarbanes-Oxley), HIPAA (healthcare), GDPR (privacy), and PCI-DSS (payments) audit trail patterns for financial, healthcare, and payment-processing SaaS platforms.
type: skill
tags:
  - erp
  - compliance
  - audit-logging
  - sox
  - hipaa
  - gdpr
  - pci-dss
  - regulated-systems
  - data-governance
authors:
  - AFENDA Team
created: 2024-01-15
updated: 2024-01-15
version: 1.0.0
keywords:
  - SOX compliance
  - HIPAA audit
  - GDPR data subject rights
  - PCI-DSS payment data
  - immutable audit logs
  - data retention policies
  - encryption
  - data anonymization
  - consent management
  - right-to-be-forgotten
---

# ERP Compliance and Audit Logging

Production-tested compliance patterns for regulated ERP systems. Supports SOX (financial), HIPAA (healthcare), GDPR (privacy), and PCI-DSS (payments) requirements.

## 1. SOX Compliance (Financial Systems)

### Pattern: Immutable Financial Audit Trail

**Required by**: Sarbanes-Oxley Act (SEC requirement for public companies)

**What SOX requires**:

- Document all transactions and changes
- Prove who made each change and when
- Prevent unauthorized modification of records
- Maintain audit trail for 7+ years
- Segregation of duties (approval vs. execution)

**Implementation**:

```typescript
// 1. SOX-Compliant audit log with immutability
export const soxAuditLog = pgTable(
  "sox_audit_log",
  {
    id: text("id").primaryKey(), // Never reused
    timestamp: timestamp("timestamp", { withTimezone: true }).defaultNow().notNull(),
    tenantId: text("tenant_id").notNull(),

    // User identification (immutable)
    userId: text("user_id").notNull(),
    username: text("username").notNull(),
    userRole: text("user_role").notNull(), // For SOX segregation of duties
    ipAddress: text("ip_address"),
    sessionId: text("session_id"),

    // What changed
    entityType: text("entity_type").notNull(), // "journal_entry", "invoice", "account"
    entityId: text("entity_id").notNull(),
    action: pgEnum("sox_action", [
      "create",
      "modify",
      "approve",
      "reject",
      "post",
      "reverse",
      "delete",
    ]).notNull(),

    // Before and after
    previousValues: jsonb("previous_values"), // Full previous state
    newValues: jsonb("new_values"), // Full new state
    changedFields: jsonb("changed_fields").$type<
      Array<{
        fieldName: string;
        previousValue: unknown;
        newValue: unknown;
      }>
    >(),

    // Business context
    description: text("description"), // Human-readable change reason
    transactionId: text("transaction_id"), // Links related changes
    approverUserId: text("approver_user_id"), // Who approved this change (if needed)

    // Cryptographic integrity (tamper-detection)
    previousEntryHash: text("previous_entry_hash"), // Hash chain link
    entryHash: text("entry_hash"), // SHA256(this entry + previous hash)

    // Compliance metadata
    relevantAccounts: jsonb("relevant_accounts").$type<string[]>(), // G/L accounts affected
    materiality: text("materiality").notNull().default("normal"), // "immaterial", "normal", "material", "significant"
    requiresApproval: boolean("requires_approval").notNull().default(false),
    approvalStatus: pgEnum("approval_status", ["pending", "approved", "rejected"]).default(
      "approved"
    ),

    // Immutability enforcement
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => ({
    tenantIdx: index("sox_log_tenant_idx").on(t.tenantId),
    userIdx: index("sox_log_user_idx").on(t.tenantId, t.userId),
    entityIdx: index("sox_log_entity_idx").on(t.tenantId, t.entityType, t.entityId),
    actionIdx: index("sox_log_action_idx").on(t.action),
    timestampIdx: index("sox_log_timestamp_idx").on(t.timestamp),
    txnIdx: index("sox_log_txn_idx").on(t.transactionId),
    hashIdx: index("sox_log_hash_idx").on(t.entryHash), // For chain verification
  })
);

// 2. Enforce immutability at database level
async function enforceSoxImmutability(db: Database) {
  // Prevent all UPDATEs
  await db.execute(sql`
    ALTER TABLE sox_audit_log ENABLE ROW LEVEL SECURITY;
    
    CREATE POLICY sox_audit_immutable_update ON sox_audit_log
      AS RESTRICTIVE
      FOR UPDATE
      TO app_user
      USING (false); -- Deny all updates
    
    CREATE POLICY sox_audit_immutable_delete ON sox_audit_log
      AS RESTRICTIVE
      FOR DELETE
      TO app_user
      USING (false); -- Deny all deletes
  `);

  // Only service_role can insert (controlled access)
  await db.execute(sql`
    CREATE POLICY sox_audit_insert ON sox_audit_log
      AS PERMISSIVE
      FOR INSERT
      TO service_role
      WITH CHECK (true);
  `);
}

// 3. Hash chain for tamper detection
function computeEntryHash(entry: Record<string, unknown>, previousHash: string | null): string {
  const crypto = require("crypto");
  const data = JSON.stringify({
    ...entry,
    previousHash,
  });
  return crypto.createHash("sha256").update(data).digest("hex");
}

// 4. Log a SOX-relevant transaction
class SoxAuditLogger {
  async logFinancialChange(input: {
    tenantId: string;
    userId: string;
    entityType: "journal_entry" | "invoice" | "account";
    entityId: string;
    action: "create" | "modify" | "approve" | "reverse";
    previousValues: Record<string, unknown>;
    newValues: Record<string, unknown>;
    description: string;
    materiality: "immaterial" | "normal" | "material" | "significant";
    relevantAccounts?: string[];
  }) {
    // Get previous entry for hash chain
    const previousEntry = await db
      .select()
      .from(soxAuditLog)
      .orderBy(desc(soxAuditLog.timestamp))
      .limit(1);

    const previousHash = previousEntry[0]?.entryHash;
    const changedFields = Object.keys(input.newValues)
      .filter((key) => input.previousValues[key] !== input.newValues[key])
      .map((key) => ({
        fieldName: key,
        previousValue: input.previousValues[key],
        newValue: input.newValues[key],
      }));

    const entry = {
      tenantId: input.tenantId,
      userId: input.userId,
      entityType: input.entityType,
      entityId: input.entityId,
      action: input.action,
      previousValues: input.previousValues,
      newValues: input.newValues,
      changedFields,
      description: input.description,
      materiality: input.materiality,
      relevantAccounts: input.relevantAccounts || [],
      timestamp: new Date(),
    };

    const entryHash = computeEntryHash(entry, previousHash);

    // Insert into immutable log
    return await db
      .insert(soxAuditLog)
      .values({
        ...entry,
        id: `sox-${randomUUID()}`,
        previousEntryHash: previousHash,
        entryHash,
        ipAddress: "0.0.0.0", // From request context
      })
      .returning();
  }

  // Verify hash chain integrity (detect tampering)
  async verifyChainIntegrity(): Promise<{
    isValid: boolean;
    brokenAt?: string;
  }> {
    const entries = await db.select().from(soxAuditLog).orderBy(asc(soxAuditLog.timestamp));

    for (let i = 0; i < entries.length - 1; i++) {
      const current = entries[i];
      const next = entries[i + 1];

      if (next.previousEntryHash !== current.entryHash) {
        return {
          isValid: false,
          brokenAt: next.id,
        };
      }

      // Recompute hash to verify it wasn't tampered with
      const recomputed = computeEntryHash(
        {
          tenantId: current.tenantId,
          userId: current.userId,
          entityType: current.entityType,
          action: current.action,
        },
        current.previousEntryHash
      );

      if (recomputed !== current.entryHash) {
        return {
          isValid: false,
          brokenAt: current.id,
        };
      }
    }

    return { isValid: true };
  }

  // Generate SOX audit report
  async generateSoxReport(dateRange: { start: Date; end: Date }): Promise<{
    totalTransactions: number;
    byAction: Record<string, number>;
    byUser: Record<string, number>;
    materialChanges: number;
  }> {
    const logs = await db
      .select()
      .from(soxAuditLog)
      .where(
        and(gte(soxAuditLog.timestamp, dateRange.start), lte(soxAuditLog.timestamp, dateRange.end))
      );

    return {
      totalTransactions: logs.length,
      byAction: logs.reduce(
        (acc, log) => {
          acc[log.action] = (acc[log.action] || 0) + 1;
          return acc;
        },
        {} as Record<string, number>
      ),
      byUser: logs.reduce(
        (acc, log) => {
          acc[log.userId] = (acc[log.userId] || 0) + 1;
          return acc;
        },
        {} as Record<string, number>
      ),
      materialChanges: logs.filter((l) => ["material", "significant"].includes(l.materiality))
        .length,
    };
  }
}
```

**SOX Best Practices**:

```typescript
// 1. Segregation of Duties: Prevent same user from creating AND approving
async function enforceSegregationOfDuties(userId: string, action: string, entityId: string) {
  if (action === "approve") {
    // Check if this user created the transaction
    const created = await db
      .select()
      .from(soxAuditLog)
      .where(
        and(
          eq(soxAuditLog.userId, userId),
          eq(soxAuditLog.action, "create"),
          eq(soxAuditLog.entityId, entityId)
        )
      );

    if (created.length > 0) {
      throw new Error("Segregation of duties violation: cannot approve own transaction");
    }
  }
}

// 2. Materiality thresholds (what gets special handling)
function computeMateriality(amount: number, threshold: number = 100000): string {
  if (amount === 0) return "immaterial";
  if (amount < threshold * 0.1) return "immaterial"; // < 10% threshold
  if (amount < threshold) return "normal";
  if (amount < threshold * 10) return "material"; // 1-10x threshold
  return "significant"; // > 10x threshold
}

// 3. Export audit log for external auditor
async function exportAuditLogForAuditor(
  tenantId: string,
  dateRange: { start: Date; end: Date }
): Promise<Buffer> {
  const logs = await db
    .select()
    .from(soxAuditLog)
    .where(
      and(
        eq(soxAuditLog.tenantId, tenantId),
        gte(soxAuditLog.timestamp, dateRange.start),
        lte(soxAuditLog.timestamp, dateRange.end)
      )
    );

  // CSVformat: timestamp, user, action, entity, change, amount, hash
  const csv = [
    "Timestamp,User,Action,EntityType,EntityID,Amount,Materiality,Hash",
    ...logs.map((l) =>
      [
        l.timestamp,
        l.userId,
        l.action,
        l.entityType,
        l.entityId,
        l.newValues?.amount || 0,
        l.materiality,
        l.entryHash,
      ].join(",")
    ),
  ].join("\n");

  return Buffer.from(csv, "utf8");
}
```

---

## 2. HIPAA Compliance (Healthcare)

### Pattern: Healthcare Data Audit Trail + PHI Protection

**Required by**: Health Insurance Portability and Accountability Act (HIPAA)

**What HIPAA requires**:

- Log all access to Protected Health Information (PHI)
- No unauthorized access or modification
- 6-year retention minimum
- Patient consent for certain operations
- De-identification for non-clinical use

**Implementation**:

```typescript
// 1. HIPAA-compliant audit log with PHI tracking
export const hipaaAuditLog = pgTable(
  "hipaa_audit_log",
  {
    id: text("id").primaryKey(),
    timestamp: timestamp("timestamp", { withTimezone: true }).defaultNow().notNull(),
    tenantId: text("tenant_id").notNull(), // Healthcare organization
    patientId: text("patient_id").notNull(), // Whose PHI was accessed

    // Access details
    userId: text("user_id").notNull(),
    userRole: text("user_role").notNull(), // "nurse", "doctor", "admin"
    accessLevel: pgEnum("access_level", ["read", "create", "update", "delete"]).notNull(),
    purpose: text("purpose"), // "treatment", "payment", "operations", "research"

    // PHI accessed
    phiCategory: text("phi_category").notNull(), // "demographics", "diagnosis", "medication", "test_result"
    phiSensitivity: pgEnum("sensitivity", ["low", "medium", "high", "critical"]).notNull(),
    dataClassification: text("data_classification"), // "public", "internal", "confidential", "restricted"

    // Consent tracking
    consentId: text("consent_id"), // Link to consent record
    consentStatus: pgEnum("consent_status", ["consented", "not_consented", "revoked"]).notNull(),

    // Abnormal access patterns (breach detection)
    isUnusualAccess: boolean("is_unusual_access").default(false), // Flagged for review
    accessReason: text("access_reason"), // Why accessed

    ipAddress: text("ip_address"),
    deviceId: text("device_id"),

    // Outcome
    accessGranted: boolean("access_granted").notNull(),
    denialReason: text("denial_reason"), // If access denied

    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => ({
    patientIdx: index("hipaa_patient_idx").on(t.tenantId, t.patientId),
    userIdx: index("hipaa_user_idx").on(t.tenantId, t.userId),
    sensitivityIdx: index("hipaa_sensitivity_idx").on(t.phiSensitivity),
    anomalyIdx: index("hipaa_anomaly_idx").on(t.isUnusualAccess),
    timestampIdx: index("hipaa_timestamp_idx").on(t.timestamp),
  })
);

// 2. Consent management
export const hipaaConsents = pgTable(
  "hipaa_consents",
  {
    id: uuid("id").primaryKey(),
    tenantId: text("tenant_id").notNull(),
    patientId: text("patient_id").notNull(),
    consentType: pgEnum("consent_type", [
      "treatment",
      "payment",
      "operations",
      "marketing",
      "research",
    ]).notNull(),
    isGranted: boolean("is_granted").notNull(),
    effectiveDate: timestamp("effective_date").notNull(),
    expiryDate: timestamp("expiry_date"),
    revokedAt: timestamp("revoked_at"),
    revokedReason: text("revoked_reason"),
    consentDocumentHash: text("consent_document_hash"), // Proof of signed consent

    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (t) => ({
    patientIdx: index("consents_patient_idx").on(t.tenantId, t.patientId),
  })
);

// 3. Detect unusual access patterns (breach detection)
class HipaaAuditLogger {
  async logAccess(input: {
    tenantId: string;
    patientId: string;
    userId: string;
    accessLevel: "read" | "create" | "update" | "delete";
    phiCategory: string;
    purpose: string;
  }): Promise<void> {
    // Check if user has valid consent from patient
    const consent = await db.query.hipaaConsents.findFirst({
      where: and(
        eq(hipaaConsents.tenantId, input.tenantId),
        eq(hipaaConsents.patientId, input.patientId),
        eq(hipaaConsents.consentType, input.purpose)
      ),
    });

    const hasConsent = consent && consent.isGranted && new Date() < consent.expiryDate;

    // Check for anomalies
    const recentAccess = await db
      .select()
      .from(hipaaAuditLog)
      .where(
        and(
          eq(hipaaAuditLog.tenantId, input.tenantId),
          eq(hipaaAuditLog.userId, input.userId),
          gte(hipaaAuditLog.timestamp, new Date(Date.now() - 24 * 60 * 60 * 1000))
        )
      );

    const isUnusual =
      recentAccess.length > 100 || // More than 100 accesses in 24h
      this.isAccessOutsideNormalHours(new Date());

    // Log access
    await db.insert(hipaaAuditLog).values({
      id: `hipaa-${randomUUID()}`,
      tenantId: input.tenantId,
      patientId: input.patientId,
      userId: input.userId,
      accessLevel: input.accessLevel,
      phiCategory: input.phiCategory,
      purpose: input.purpose,
      consentId: consent?.id,
      consentStatus: hasConsent ? "consented" : "not_consented",
      isUnusualAccess: isUnusual,
      accessGranted: input.accessLevel === "read" || hasConsent,
      denialReason: !hasConsent ? "No valid consent" : undefined,
    });

    // Alert if unusual
    if (isUnusual) {
      await this.alertSecurityTeam({
        type: "unusual_phi_access",
        userId: input.userId,
        patientId: input.patientId,
        timestamp: new Date(),
      });
    }
  }

  private isAccessOutsideNormalHours(date: Date): boolean {
    const hour = date.getHours();
    return hour < 6 || hour > 22; // Outside 6am-10pm
  }

  // Generate breach notification report
  async generateBreachReport(dateRange: { start: Date; end: Date }): Promise<{
    unauthorizedAccess: number;
    unusualPatterns: number;
    revokedAccess: number;
  }> {
    const logs = await db
      .select()
      .from(hipaaAuditLog)
      .where(
        and(
          gte(hipaaAuditLog.timestamp, dateRange.start),
          lte(hipaaAuditLog.timestamp, dateRange.end)
        )
      );

    return {
      unauthorizedAccess: logs.filter((l) => !l.accessGranted).length,
      unusualPatterns: logs.filter((l) => l.isUnusualAccess).length,
      revokedAccess: logs.filter((l) => l.consentStatus === "revoked").length,
    };
  }

  private async alertSecurityTeam(alert: Record<string, unknown>) {
    // Send to security team for review
    await fetch(process.env.SECURITY_WEBHOOK!, {
      method: "POST",
      body: JSON.stringify(alert),
    });
  }
}
```

---

## 3. GDPR Compliance (Privacy)

### Pattern: Data Subject Rights + Retention

**Required by**: General Data Protection Regulation (GDPR)

**What GDPR requires**:

- Right to access personal data
- Right to be forgotten (erasure)
- Right to data portability
- Right to rectification (correction)
- Data retention limits (delete when no longer needed)
- Consent before processing

**Implementation**:

```typescript
// 1. Track processing purposes and retention
export const gdprProcessing = pgTable(
  "gdpr_processing",
  {
    id: uuid("id").primaryKey(),
    tenantId: text("tenant_id").notNull(),
    dataSubjectId: text("data_subject_id").notNull(), // Person whose data
    dataCategory: text("data_category").notNull(), // "email", "phone", "address", "payment"
    processingPurpose: text("processing_purpose").notNull(), // "billing", "support", "marketing"
    legalBasis: pgEnum("legal_basis", [
      "consent",
      "contract",
      "legal_obligation",
      "vital_interests",
      "public_task",
      "legitimate_interests",
    ]).notNull(),

    // Consent
    consentGiven: boolean("consent_given").notNull(),
    consentDate: timestamp("consent_date"),
    consentWithdrawalDate: timestamp("consent_withdrawal_date"),

    // Retention
    retentionPeriod: text("retention_period").notNull(), // e.g., "3 years", "until contract ends"
    deleteAfterDate: timestamp("delete_after_date").notNull(),
    isDeleted: boolean("is_deleted").notNull().default(false),
    deletedAt: timestamp("deleted_at"),
    deletionReason: text("deletion_reason"), // "right_to_be_forgotten", "retention_expired"

    processedAt: timestamp("processed_at").defaultNow().notNull(),
  },
  (t) => ({
    subjectIdx: index("gdpr_subject_idx").on(t.tenantId, t.dataSubjectId),
    categoryIdx: index("gdpr_category_idx").on(t.dataCategory),
    deleteIdx: index("gdpr_delete_idx").on(t.deleteAfterDate),
  })
);

// 2. Right to access (data export)
async function generateDataExport(tenantId: string, dataSubjectId: string): Promise<Buffer> {
  // Retrieve all personal data for subject
  const processing = await db
    .select()
    .from(gdprProcessing)
    .where(
      and(
        eq(gdprProcessing.tenantId, tenantId),
        eq(gdprProcessing.dataSubjectId, dataSubjectId),
        eq(gdprProcessing.isDeleted, false)
      )
    );

  // Format as JSON (portable format)
  const exportData = {
    exportDate: new Date().toISOString(),
    dataSubjectId,
    personalData: processing.map((p) => ({
      category: p.dataCategory,
      purpose: p.processingPurpose,
      legalBasis: p.legalBasis,
      processedAt: p.processedAt,
      deleteAfter: p.deleteAfterDate,
    })),
  };

  return Buffer.from(JSON.stringify(exportData, null, 2), "utf8");
}

// 3. Right to be forgotten (erasure)
async function rightToBeForgettenRequest(
  tenantId: string,
  dataSubjectId: string,
  requestId: string
): Promise<void> {
  // Mark all personal data for deletion
  const processing = await db
    .update(gdprProcessing)
    .set({
      isDeleted: true,
      deletedAt: new Date(),
      deletionReason: "right_to_be_forgotten",
    })
    .where(
      and(
        eq(gdprProcessing.tenantId, tenantId),
        eq(gdprProcessing.dataSubjectId, dataSubjectId),
        eq(gdprProcessing.isDeleted, false)
      )
    )
    .returning();

  console.log(`✅ Marked ${processing.length} records for deletion`);

  // Schedule actual deletion (30-day delay for verification)
  await scheduleForgatefulDeletion(tenantId, dataSubjectId, requestId);

  // Notify data subject
  await notifyDataSubject({
    dataSubjectId,
    type: "erasure_confirmation",
    timestamp: new Date(),
    requestId,
  });
}

// 4. Automatic retention cleanup
async function executeRetentionCleanup() {
  const expiredRecords = await db
    .select()
    .from(gdprProcessing)
    .where(
      and(eq(gdprProcessing.isDeleted, false), lte(gdprProcessing.deleteAfterDate, new Date()))
    );

  console.log(`🗑️  Found ${expiredRecords.length} expired records for deletion`);

  for (const batch of chunk(expiredRecords, 1000)) {
    await db
      .update(gdprProcessing)
      .set({
        isDeleted: true,
        deletedAt: new Date(),
        deletionReason: "retention_expired",
      })
      .where(
        inArray(
          gdprProcessing.id,
          batch.map((r) => r.id)
        )
      );
  }

  console.log("✅ Retention cleanup complete");
}

// 5. Data breach notification
async function notifyDataBreach(
  tenantId: string,
  breachDetails: {
    affectedDataSubjects: number;
    dataCategories: string[];
    breachDate: Date;
    discoveredDate: Date;
    description: string;
    measuresTaken: string;
  }
): Promise<void> {
  // Log breach internally
  console.log(`🚨 GDPR Data Breach Notification`);
  console.log(`Affected individuals: ${breachDetails.affectedDataSubjects}`);
  console.log(`Categories: ${breachDetails.dataCategories.join(", ")}`);
  console.log(`Discovered: ${breachDetails.discoveredDate.toISOString()}`);

  // Notify supervisory authority (regulatory body) within 72 hours if "high risk"
  if (breachDetails.affectedDataSubjects > 1000) {
    await notifyRegulator({
      breachDate: breachDetails.breachDate,
      discoveredDate: breachDetails.discoveredDate,
      affectedCount: breachDetails.affectedDataSubjects,
      categories: breachDetails.dataCategories,
      description: breachDetails.description,
    });
  }

  // Notify affected data subjects without undue delay
  await notifyAffectedSubjects({
    tenantId,
    measuresTaken: breachDetails.measuresTaken,
  });
}
```

---

## 4. PCI-DSS Compliance (Payment Data)

### Pattern: Payment Card Industry Data Security Standard

**Required by**: Payment Card Industry (for payment processors)

**What PCI-DSS requires**:

- Never store full credit card numbers
- Encrypt sensitive payment data
- Log all payment access
- Pass annual compliance audits
- 7-year transaction history

**Implementation**:

```typescript
// 1. PCI-compliant payment audit log
export const pciAuditLog = pgTable(
  "pci_audit_log",
  {
    id: text("id").primaryKey(),
    timestamp: timestamp("timestamp", { withTimezone: true }).defaultNow().notNull(),
    tenantId: text("tenant_id").notNull(),

    // Payment transaction (never full card number)
    transactionId: text("transaction_id").notNull(), // Reference, no card data
    cardLastFour: text("card_last_four").notNull(), // Only last 4 digits
    cardBrand: text("card_brand"), // "visa", "mastercard"
    amount: decimal("amount", { precision: 12, scale: 2 }).notNull(),

    // User
    userId: text("user_id"),
    merchantId: text("merchant_id").notNull(),

    // Action
    actionType: pgEnum("pci_action", [
      "authorize",
      "capture",
      "void",
      "refund",
      "access_log",
    ]).notNull(),
    actionStatus: pgEnum("action_status", ["success", "failed"]).notNull(),
    failureReason: text("failure_reason"),

    // Network
    ipAddress: text("ip_address"), // Only masked
    deviceFingerprint: text("device_fingerprint"),

    // Fraud detection
    isFraudulent: boolean("is_fraudulent").default(false),
    fraudScore: real("fraud_score"), // 0-100

    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => ({
    merchantIdx: index("pci_merchant_idx").on(t.tenantId, t.merchantId),
    txnIdx: index("pci_txn_idx").on(t.transactionId),
    fraudIdx: index("pci_fraud_idx").on(t.isFraudulent),
    timestampIdx: index("pci_timestamp_idx").on(t.timestamp),
  })
);

// 2. Tokenize card data (never store full numbers)
function tokenizeCardData(cardNumber: string): string {
  // In production: use Stripe, Square, or similar tokenization service
  const lastFour = cardNumber.slice(-4);
  return `tok_${crypto.randomBytes(16).toString("hex")}_${lastFour}`;
}

// 3. Encrypt sensitive data at rest
import crypto from "crypto";

function encryptPaymentData(data: string, encryptionKey: string): string {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv("aes-256-gcm", Buffer.from(encryptionKey, "hex"), iv);

  let encrypted = cipher.update(data, "utf8", "hex");
  encrypted += cipher.final("hex");

  const authTag = cipher.getAuthTag();
  return `${iv.toString("hex")}:${authTag.toString("hex")}:${encrypted}`;
}

// 4. Annual audit report
async function generatePciAuditReport(year: number): Promise<{
  totalTransactions: number;
  totalAmount: number;
  fraudAttempts: number;
  avgFraudScore: number;
  complianceStatus: "compliant" | "non_compliant";
}> {
  const startDate = new Date(`${year}-01-01`);
  const endDate = new Date(`${year}-12-31`);

  const logs = await db
    .select()
    .from(pciAuditLog)
    .where(and(gte(pciAuditLog.timestamp, startDate), lte(pciAuditLog.timestamp, endDate)));

  const successfulTxns = logs.filter((l) => l.actionStatus === "success");
  const totalAmount = successfulTxns.reduce((sum, l) => sum + parseFloat(l.amount as any), 0);
  const fraudTxns = logs.filter((l) => l.isFraudulent);
  const avgFraudScore =
    fraudTxns.length > 0
      ? fraudTxns.reduce((sum, l) => sum + (l.fraudScore || 0), 0) / fraudTxns.length
      : 0;

  return {
    totalTransactions: successfulTxns.length,
    totalAmount,
    fraudAttempts: fraudTxns.length,
    avgFraudScore,
    complianceStatus:
      fraudTxns.length < successfulTxns.length * 0.001 // < 0.1% fraud rate
        ? "compliant"
        : "non_compliant",
  };
}
```

---

## 5. General Compliance Utilities

### Pattern: Audit Log Archival and Retention

```typescript
// 1. Archive audit logs to cold storage (S3)
async function archiveAuditLogs(maxAge: number) {
  // Find logs older than max age
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - maxAge);

  const logsToArchive = await db
    .select()
    .from(soxAuditLog)
    .where(lt(soxAuditLog.timestamp, cutoffDate));

  console.log(`📦 Archiving ${logsToArchive.length} logs to S3...`);

  // Upload to S3 in batches
  for (const batch of chunk(logsToArchive, 10000)) {
    const fileName = `audit-logs-${Date.now()}.jsonl`;
    const content = batch.map((log) => JSON.stringify(log)).join("\n");

    await s3
      .putObject({
        Bucket: process.env.AUDIT_LOG_BUCKET!,
        Key: `archive/${fileName}`,
        Body: content,
        ServerSideEncryption: "AES256",
      })
      .promise();

    // Delete from hot storage after successful archive
    await db.delete(soxAuditLog).where(
      inArray(
        soxAuditLog.id,
        batch.map((b) => b.id)
      )
    );
  }

  console.log("✅ Archive complete");
}

// 2. Compliance report generation
async function generateComplianceReport(
  framework: "sox" | "hipaa" | "gdpr" | "pci"
): Promise<Buffer> {
  const report = `
# ${framework.toUpperCase()} Compliance Report
Generated: ${new Date().toISOString()}

## Audit Trail Status
- Total entries: [counted from DB]
- Integrity verified: Yes
- Unusual patterns: [from anomaly detection]

## Retention Status
- Data retention policy: Maintained
- Scheduled deletions: On track

## Recommendations
- [Based on framework-specific controls]
  `;

  return Buffer.from(report, "utf8");
}
```

---

## 6. Integration with Other Skills

- **`erp-database-patterns`**: Multi-tenant isolation for compliance boundaries
- **`event-sourcing`**: Event store for auditable decisions
- **`erp-data-migration-strategies`**: Compliance-safe schema evolution
- **`postgresql-database-engineering`**: Encryption, partitioning for compliance

---

## Compliance Checklist

```
SOX Compliance
□ Immutable audit logs for all transactions
□ Segregation of duties (create vs approve)
□ Hash chain integrity verification
□ 7-year retention + archive

HIPAA Compliance
□ Patient consent tracking
□ Unusual access pattern detection
□ Breach notification procedures
□ PHI encryption at rest & in transit

GDPR Compliance
□ Data subject rights (access, erase, portability)
□ Retention expiry automation
□ Consent withdrawal mechanism
□ Privacy by design

PCI-DSS Compliance
□ No full credit card storage (tokenization)
□ Encryption of payment data
□ Annual audit pass
□ Fraud detection/monitoring
```

---

_For detailed regulatory guidance, consult with your compliance officer or legal team._
