# Sales Domain Expansion - Checklist Coverage Gap Analysis

**Date**: March 26, 2026  
**Status**: Coverage audit against DB-First Checklist  
**Goal**: Ensure 100% checklist compliance

---

## Coverage Summary

| Checklist Category | Coverage | Status |
|-------------------|----------|--------|
| 1️⃣ Structural Coverage | 85% | 🟡 Needs indexing details |
| 2️⃣ Relational Integrity | 70% | 🟡 Missing temporal relationships |
| 3️⃣ Business Rule Enforcement | 75% | 🟡 Need explicit constraints per table |
| 4️⃣ Financial & Numerical Integrity | 60% | 🔴 Missing rounding policy, minor units consideration |
| 5️⃣ State & Workflow Truth | 65% | 🔴 Missing approval/history tables |
| 6️⃣ Audit & Forensics | 70% | 🔴 Missing decision audit fields |
| 7️⃣ Multi-Tenant & Security | 100% | ✅ Complete |
| 8️⃣ Reference & Master Data | 100% | ✅ Complete |
| 9️⃣ Performance Reality | 50% | 🔴 Missing indexing/archival strategy |
| 🔟 Seed & Test Coverage | 60% | 🟡 Need scenario matrix |
| 11️⃣ ERP Document Completeness | 40% | 🔴 Missing 5 supporting tables |
| 12️⃣ Anti-Patterns | 100% | ✅ Addressed |

**Overall Coverage**: 73% (needs improvement to reach enterprise grade)

---

## 🔴 Critical Gaps (Must Address)

### Gap 1: ERP Document Supporting Tables
**Impact**: Cannot track approvals, attachments, or state history  
**Missing Tables**: 5 critical tables

#### Missing Table: `document_status_history`
```typescript
{
  id: uuid().primaryKey(),
  tenantId: integer().notNull().references(() => tenants.id),
  
  // Polymorphic document reference
  documentType: text().notNull(), // 'sales_order', 'return_order', etc.
  documentId: uuid().notNull(),
  
  // Status tracking
  fromStatus: text(), // null for initial status
  toStatus: text().notNull(),
  transitionedAt: timestamp().notNull().defaultNow(),
  transitionedBy: uuid().notNull().references(() => users.id),
  
  // Context
  reason: text(), // For cancellations, rejections
  notes: text(),
  
  ...timestampColumns,
  ...auditColumns,
}

// Composite index for fast document history retrieval
index('idx_doc_status_history_lookup')
  .on('tenantId', 'documentType', 'documentId', 'transitionedAt'),
```

**Use Cases**:
- Audit trail: Who changed order from draft → confirmed when?
- Compliance: Cancellation reason tracking
- Analytics: Average time in each status

---

#### Missing Table: `document_approvals`
```typescript
{
  id: uuid().primaryKey(),
  tenantId: integer().notNull().references(() => tenants.id),
  
  // Polymorphic document reference
  documentType: text().notNull(),
  documentId: uuid().notNull(),
  
  // Approval workflow
  approvalLevel: integer().notNull(), // 1, 2, 3... for multi-tier approval
  approverUserId: uuid().notNull().references(() => users.id),
  approverRole: text(), // 'sales_manager', 'finance_director'
  
  // Status
  status: text().notNull(), // 'pending', 'approved', 'rejected'
  approvedAt: timestamp(),
  rejectedAt: timestamp(),
  
  // Decision context
  comments: text(),
  
  // Financial snapshot (for audit)
  documentAmount: numeric(14, 2),
  
  ...timestampColumns,
  ...auditColumns,
}

// Index for pending approvals dashboard
index('idx_pending_approvals')
  .on('tenantId', 'approverUserId', 'status')
  .where(sql`status = 'pending'`),
```

**Use Cases**:
- Approval workflow: Orders > $10k require manager approval
- Audit: Who approved this discount?
- Compliance: Financial authority limits

---

#### Missing Table: `document_attachments`
```typescript
{
  id: uuid().primaryKey(),
  tenantId: integer().notNull().references(() => tenants.id),
  
  // Polymorphic document reference
  documentType: text().notNull(),
  documentId: uuid().notNull(),
  
  // File metadata
  fileName: text().notNull(),
  fileSize: integer().notNull(), // bytes
  mimeType: text().notNull(),
  
  // Storage
  storageProvider: text().notNull(), // 's3', 'azure', 'local'
  storagePath: text().notNull(), // Full path or object key
  storageUrl: text(), // Signed URL or CDN path
  
  // Classification
  attachmentType: text(), // 'contract', 'specification', 'photo', 'other'
  description: text(),
  
  // Security
  isPublic: boolean().default(false),
  
  ...timestampColumns,
  ...auditColumns,
  ...softDeleteColumns,
}

// Index for document attachment listing
index('idx_doc_attachments')
  .on('tenantId', 'documentType', 'documentId'),
```

**Use Cases**:
- Sales order: Attach signed contract PDF
- Product: Attach specification sheet
- Return order: Attach photos of damaged goods

---

#### Missing Table: `line_item_discounts`
```typescript
{
  id: uuid().primaryKey(),
  tenantId: integer().notNull().references(() => tenants.id),
  
  // Polymorphic line reference
  documentType: text().notNull(), // 'sales_order_line', etc.
  lineId: uuid().notNull(),
  
  // Discount details
  discountType: text().notNull(), // 'volume', 'promotional', 'manual', 'pricelist'
  discountSource: text(), // 'pricelist_item_id:uuid' or 'manual'
  discountPercent: numeric(5, 2),
  discountAmount: numeric(14, 2),
  
  // Authorization
  authorizedBy: uuid().references(() => users.id),
  authorizedAt: timestamp(),
  maxDiscountAllowed: numeric(5, 2), // What was the policy limit?
  
  // Reasoning
  reason: text(),
  
  ...timestampColumns,
  ...auditColumns,
}

// Index for discount audit reports
index('idx_line_discounts_audit')
  .on('tenantId', 'discountType', 'authorizedBy', 'authorizedAt'),
```

**Use Cases**:
- Audit: Why was 25% discount given? Who authorized it?
- Analytics: Discount impact on margin
- Compliance: Discount authority enforcement

---

#### Missing Table: `accounting_postings`
```typescript
{
  id: uuid().primaryKey(),
  tenantId: integer().notNull().references(() => tenants.id),
  
  // Source document
  sourceDocumentType: text().notNull(), // 'sales_order', 'invoice', 'payment'
  sourceDocumentId: uuid().notNull(),
  
  // Accounting impact
  journalEntryId: uuid(), // FK to accounting.journal_entries (Phase 2)
  postingDate: timestamp().notNull(),
  
  // Financial summary (denormalized for reporting)
  debitAccountCode: text(),
  creditAccountCode: text(),
  amount: numeric(14, 2).notNull(),
  currency: text().notNull(),
  
  // Status
  postingStatus: text().notNull(), // 'draft', 'posted', 'reversed'
  postedBy: uuid().references(() => users.id),
  reversedAt: timestamp(),
  reversedBy: uuid().references(() => users.id),
  reversalReason: text(),
  
  ...timestampColumns,
  ...auditColumns,
}

// Index for financial reports
index('idx_accounting_postings')
  .on('tenantId', 'postingDate', 'postingStatus'),
```

**Use Cases**:
- Bridge to accounting: Sales order confirmed → journal entry created
- Audit: Which sales orders haven't been posted yet?
- Reversals: Track financial impact cancellations

---

### Gap 2: Temporal Relationships (Effective Dating)
**Impact**: Cannot handle time-bounded pricing, tax rules, or organizational changes

#### Missing: Effective Dating on Critical Tables

**Price History**:
```typescript
// Enhance: pricelist_items
{
  // ... existing columns
  effectiveFrom: timestamp().notNull(),
  effectiveTo: timestamp(), // null = no end date
  supersededBy: uuid().references(() => pricelistItems.id), // Chain of price changes
}

// Check constraint
sql`CHECK (effective_to IS NULL OR effective_to > effective_from)`
```

**Tax Rule History**:
```typescript
// Enhance: tax_rates
{
  // ... existing columns
  effectiveFrom: timestamp().notNull(),
  effectiveTo: timestamp(),
  replacedBy: uuid().references(() => taxRates.id),
}
```

**Partner Relationship History**:
```typescript
// Enhance: partners
{
  // ... existing columns
  relationshipStart: timestamp().notNull().defaultNow(),
  relationshipEnd: timestamp(), // For inactive customers
}
```

---

### Gap 3: Financial Precision Standards
**Impact**: Inconsistent rounding can cause penny mismatches in financial reports

#### Missing: Centralized Rounding Policy

**New Table**: `rounding_policies`
```typescript
{
  id: uuid().primaryKey(),
  tenantId: integer().notNull().references(() => tenants.id),
  
  // Policy scope
  policyName: text().notNull(), // 'line_subtotal', 'line_tax', 'order_total'
  
  // Rounding rules
  roundingMethod: text().notNull(), // 'round', 'ceil', 'floor', 'truncate'
  roundingPrecision: integer().notNull(), // 2 for cents, 0 for dollars
  roundingUnit: numeric(), // 0.05 for nickel rounding
  
  // Applicability
  appliesTo: text().notNull(), // 'sales', 'purchasing', 'inventory'
  currencyCode: text(), // null = all currencies
  
  isActive: boolean().notNull().default(true),
  
  ...timestampColumns,
  ...auditColumns,
}
```

#### Update: Monetary Storage Strategy

**Current Plan**: `numeric(14, 2)`  
**Issue**: Floating point imprecision in some calculations

**Recommendation**: Keep `numeric(14,2)` but:
1. All calculations use `Decimal.js` (never native JS math)
2. Rounding policy applied at each computation step
3. Document precision limits in schema comments

```typescript
// Example column with precision docs
amountUntaxed: numeric(14, 2).notNull()
  .$comment('Stored in major units (dollars/euros). Max: 999,999,999,999.99. Always use Decimal.js for calculations.')
```

---

### Gap 4: Decision Auditability Fields
**Impact**: Cannot answer "Why was this price used?" "Who approved this discount?"

#### Missing Audit Fields to Add

**Sales Order Lines** enhancements:
```typescript
{
  // ... existing columns
  
  // Price auditability
  priceSource: text(), // 'pricelist:uuid', 'manual', 'contract:uuid'
  priceListedAt: numeric(14, 2), // Original list price before discounts
  priceOverrideReason: text(), // Required if price < list price
  priceApprovedBy: uuid().references(() => users.id),
  
  // Tax auditability
  taxRuleSnapshot: jsonb(), // Snapshot of tax computation rules used
  fiscalPositionApplied: uuid().references(() => fiscalPositions.id),
  
  // Discount auditability
  discountApprovedBy: uuid().references(() => users.id),
  discountApprovedAt: timestamp(),
}
```

**Sales Orders** enhancements:
```typescript
{
  // ... existing columns
  
  // Credit check audit
  creditCheckPassed: boolean(),
  creditCheckAt: timestamp(),
  creditCheckBy: uuid().references(() => users.id),
  creditLimitAtCheck: numeric(14, 2), // What was limit when checked?
  
  // Pricing policy audit
  pricelistSnapshotId: uuid(), // Version of pricelist used
  exchangeRateUsed: numeric(12, 6), // FX rate locked at confirmation
  exchangeRateSource: text(), // 'ecb', 'manual', 'bank'
}
```

---

## 🟡 Important Gaps (Should Address)

### Gap 5: Indexing Strategy
**Impact**: Slow queries on production scale

#### Required Indexes Per Phase

**Phase 0: Reference Data**
```sql
-- countries: No additional index needed (small table)
-- currencies: No additional index needed (small table)

-- currency_rates: Fast rate lookup
CREATE INDEX idx_currency_rates_lookup 
  ON platform.currency_rates (currency_id, effective_date DESC);

-- sequences: Atomic increment requires unique constraint
CREATE UNIQUE INDEX idx_sequences_tenant_code 
  ON platform.sequences (tenant_id, code);

-- units_of_measure: Conversion lookup
CREATE INDEX idx_uom_category 
  ON platform.units_of_measure (category_id, uom_type);
```

**Phase 1: Partner Enhancement**
```sql
-- partners: Multi-column search
CREATE INDEX idx_partners_search 
  ON sales.partners (tenant_id, name, email, vat) 
  WHERE deleted_at IS NULL;

-- partner_addresses: Default address lookup
CREATE INDEX idx_partner_addresses_default 
  ON sales.partner_addresses (partner_id, type, is_default);

-- partner_tags: Tag filtering
CREATE INDEX idx_partner_tags_tenant 
  ON sales.partner_tags (tenant_id, name);
```

**Phase 6: Sales Orders (Critical)**
```sql
-- Sales orders: Dashboard queries
CREATE INDEX idx_sales_orders_dashboard 
  ON sales.sales_orders (tenant_id, status, order_date DESC) 
  WHERE deleted_at IS NULL;

-- Sales orders: Partner history
CREATE INDEX idx_sales_orders_partner 
  ON sales.sales_orders (partner_id, order_date DESC);

-- Sales order lines: Order detail page
CREATE INDEX idx_sales_order_lines_order 
  ON sales.sales_order_lines (order_id, sequence);

-- Sales order lines: Product sales history
CREATE INDEX idx_sales_order_lines_product 
  ON sales.sales_order_lines (product_id, created_at DESC);

-- Sale order line taxes: Tax reporting
CREATE INDEX idx_line_taxes_tax_id 
  ON sales.sale_order_line_taxes (tax_id, created_at DESC);
```

---

### Gap 6: Archival & Partitioning Strategy
**Impact**: Database bloat, slow queries on old data

#### Archival Rules

**Hot Data** (online, fast access):
- Orders: Last 2 fiscal years
- Invoices: Last 2 fiscal years  
- Payments: Last 2 fiscal years
- Subscriptions: Active + last 1 year cancelled

**Warm Data** (online, slower access OK):
- Orders: 2-7 years ago
- Archived via table partitioning by `order_date`

**Cold Data** (offline, archival storage):
- Orders: > 7 years (legal retention)
- Moved to separate schema/database

#### Partitioning Strategy

```sql
-- Partition sales_orders by year
CREATE TABLE sales.sales_orders (
  -- ... columns
) PARTITION BY RANGE (order_date);

CREATE TABLE sales.sales_orders_2024 
  PARTITION OF sales.sales_orders
  FOR VALUES FROM ('2024-01-01') TO ('2025-01-01');

CREATE TABLE sales.sales_orders_2025 
  PARTITION OF sales.sales_orders
  FOR VALUES FROM ('2025-01-01') TO ('2026-01-01');

CREATE TABLE sales.sales_orders_2026 
  PARTITION OF sales.sales_orders
  FOR VALUES FROM ('2026-01-01') TO ('2027-01-01');

-- Auto-create new partitions via cron job
```

---

### Gap 7: Explicit Constraint Documentation
**Impact**: Ambiguity in business rules, inconsistent enforcement

#### Per-Table Constraint Matrix Needed

**Example: sales_orders**
```typescript
// Check constraints documented inline
export const salesOrders = pgTable('sales_orders', {
  // ... columns
  amountUntaxed: numeric(14, 2).notNull()
    .check(sql`amount_untaxed >= 0`),
  amountTax: numeric(14, 2).notNull()
    .check(sql`amount_tax >= 0`),
  amountTotal: numeric(14, 2).notNull()
    .check(sql`amount_total >= 0`)
    .check(sql`amount_total = amount_untaxed + amount_tax`), // Invariant enforced at DB
  
  quotationDate: timestamp(),
  confirmationDate: timestamp(),
  // Date logic: quotation must come before confirmation
  check(sql`confirmation_date IS NULL OR quotation_date IS NULL OR confirmation_date >= quotation_date`),
  
  validityDate: timestamp(),
  // Validity must be future from quotation
  check(sql`validity_date IS NULL OR quotation_date IS NULL OR validity_date >= quotation_date`),
})

// Unique constraints
.unique(['tenantId', 'sequenceNumber']) // No duplicate order numbers per tenant
```

---

## 🟢 Complete Areas (No Action Needed)

### ✅ Multi-Tenant & Security (7️⃣)
- All tables have `tenantId`
- RLS policies defined
- Service bypass policy for background jobs

### ✅ Reference & Master Data (8️⃣)
- All 8 required domains in Phase 0
- Currency, UoM, Countries, Tax, Payment Terms, Sequences all covered

### ✅ Anti-Patterns (12️⃣)
- Business logic in domain modules, not scattered
- No magic strings (enums used)
- No hidden JSON blobs (structured tables)

---

## Action Plan to Close Gaps

### Priority 1 (Must Have for Phase 6)
1. ✅ Add `document_status_history` table
2. ✅ Add `document_approvals` table
3. ✅ Add `document_attachments` table
4. ✅ Add `line_item_discounts` table
5. ✅ Add `accounting_postings` bridge table
6. ✅ Add decision audit fields to sales orders/lines

### Priority 2 (Before Production)
7. ✅ Add temporal relationship fields (effective_from/to)
8. ✅ Add `rounding_policies` table
9. ✅ Document indexing strategy per phase
10. ✅ Define archival/partitioning strategy

### Priority 3 (Optimization)
11. ⏸️ Add explicit check constraints with inline docs
12. ⏸️ Implement partitioning on sales_orders
13. ⏸️ Create seed scenario coverage matrix

---

## Updated Phase Counts

| Metric | Original | With Gaps Closed | Delta |
|--------|----------|------------------|-------|
| Sales Domain Tables | 45 | 53 | +8 |
| Platform Tables | 8 | 9 | +1 |
| **Total New Tables** | **53** | **62** | **+9** |
| Enums | 28 | 32 | +4 |
| Logic Modules | 8 | 10 | +2 |

---

## Revised Implementation Timeline

| Phase | Original Tables | + Gap Closure | New Estimate |
|-------|----------------|---------------|--------------|
| Phase 0 | 8 | +1 (rounding_policies) | 3 days |
| Phase 1-5 | 29 | No change | 16 days |
| **Phase 6** | **4** | **+8 (supporting tables)** | **8 days** |
| Phase 7-10 | 19 | No change | 10 days |
| **Total** | **60** | **+9** | **37 days (~7.5 weeks)** |

---

## Conclusion

**Current Coverage**: 73%  
**Target Coverage**: 95%+ (enterprise-grade)  
**Gap Closure**: +9 tables, +4 enums, revised standards

**Critical Path**:
1. Implement Priority 1 items in Phase 6
2. Add temporal relationships across phases
3. Document constraint matrix per table
4. Define indexing + archival strategy

**This ensures**: DB = complete business truth, auditable, performant, compliant.
