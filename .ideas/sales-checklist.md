Got it — you want a **practical DB-first coverage checklist** to verify your schema truly represents the *complete business truth* (not just tables), aligned with enterprise ERP rigor and your **Business Truth Engine** direction.

Below is a **systematic verification checklist** you can run against every domain (starting with Sales).

---

# ✅ DB-First Coverage Checklist

**Goal:** Ensure database = *complete, enforceable business reality*

---

## 1️⃣ Structural Coverage (Schema Completeness)

### ✔ Entity Modeling

* [ ] Every business concept exists as a table (not implied in code)
* [ ] No overloaded tables serving multiple domains
* [ ] No JSON “escape hatches” hiding structured data
* [ ] Naming reflects domain language (DDD ubiquitous language)

### ✔ Column Semantics

* [ ] Columns represent *facts*, not UI artifacts
* [ ] No derived values stored unless audit-required
* [ ] Units explicit (e.g., `amount_minor`, `weight_kg`)
* [ ] Nullable only when business-valid
* [ ] Enum used only for closed business states

### ✔ Keys & Identity

* [ ] Surrogate PK for technical identity
* [ ] Natural keys enforced where business requires uniqueness
* [ ] Tenant isolation embedded in PK or unique constraints
* [ ] External reference IDs indexed

---

## 2️⃣ Relational Integrity (Truth Connections)

### ✔ Foreign Keys

* [ ] All relationships enforced at DB level (no soft links)
* [ ] No orphan-possible references
* [ ] Proper cascade rules (RESTRICT vs CASCADE vs SET NULL)
* [ ] Optional relationships truly optional

### ✔ Cardinality Reality

* [ ] One-to-many vs many-to-many modeled explicitly
* [ ] Join tables used for associative entities
* [ ] No array columns replacing relational design

### ✔ Temporal Relationships

* [ ] Time-bounded relationships use effective dating
* [ ] Historical changes preserved (SCD or versioning)
* [ ] “Current” views derivable, not stored redundantly

---

## 3️⃣ Business Rule Enforcement (Invariant Safety)

### ✔ Check Constraints

* [ ] Non-negative quantities
* [ ] Monetary values ≥ 0 where required
* [ ] Date ranges valid (`end >= start`)
* [ ] Status transitions limited to legal states
* [ ] Boolean combinations prevented when invalid

### ✔ Unique Constraints

* [ ] Business uniqueness enforced (e.g., invoice_no per tenant)
* [ ] Composite uniqueness where logic requires it
* [ ] No reliance on application-only uniqueness

### ✔ Derived Truth Protection

* [ ] Totals consistent with line items
* [ ] Parent-child quantity consistency
* [ ] Currency consistency within documents
* [ ] Immutable historical records protected

---

## 4️⃣ Financial & Numerical Integrity

### ✔ Monetary Safety

* [ ] Stored in minor units (integers)
* [ ] Currency table exists
* [ ] FX rate source traceable
* [ ] Rounding policy centralized
* [ ] No floating-point storage

### ✔ Quantity Safety

* [ ] Units standardized
* [ ] Conversion rules defined
* [ ] Precision appropriate for domain
* [ ] Inventory-affecting records immutable

---

## 5️⃣ State & Workflow Truth

### ✔ Lifecycle Modeling

* [ ] Each document has lifecycle state
* [ ] Draft vs Posted vs Cancelled separated
* [ ] Terminal states enforced
* [ ] State transitions auditable

### ✔ Event Traceability

* [ ] Creation source recorded
* [ ] Approval identity captured
* [ ] Posting identity captured
* [ ] Cancellation reason required

---

## 6️⃣ Audit & Forensics

### ✔ Universal Audit Columns

* [ ] created_at
* [ ] updated_at
* [ ] created_by
* [ ] updated_by
* [ ] tenant_id

### ✔ Change History

* [ ] Critical tables versioned
* [ ] Financial records immutable after posting
* [ ] Soft delete only where legally required
* [ ] Deletion trace preserved

### ✔ Decision Auditability

* [ ] Price source recorded
* [ ] Discount authority recorded
* [ ] Tax rule source recorded
* [ ] Policy version captured

---

## 7️⃣ Multi-Tenant & Security Truth

### ✔ Tenant Isolation

* [ ] Tenant ID on all business tables
* [ ] Row Level Security enforced
* [ ] Cross-tenant joins impossible
* [ ] Tenant-specific configs isolated

### ✔ Authorization Trace

* [ ] Actor identity stored on sensitive actions
* [ ] Role snapshot stored for critical approvals

---

## 8️⃣ Reference & Master Data Coverage

### ✔ Required Reference Domains Exist

* [ ] Currency
* [ ] Units of Measure
* [ ] Countries / Regions
* [ ] Tax Codes
* [ ] Payment Terms
* [ ] Document Number Sequences
* [ ] Business Partner Categories
* [ ] Product Categories

### ✔ Controlled Extensibility

* [ ] Lookup tables tenant-extensible
* [ ] Enum avoided where business evolves
* [ ] Metadata-driven configuration supported

---

## 9️⃣ Performance Reality (Operational Truth)

### ✔ Indexing

* [ ] Foreign keys indexed
* [ ] High-frequency filters indexed
* [ ] Composite indexes for document queries
* [ ] Unique indexes enforce business speed

### ✔ Archival Strategy

* [ ] Hot vs cold data separable
* [ ] Historical partitions defined
* [ ] Ledger-scale tables partitioned

---

## 🔟 Seed & Test Truth Coverage

### ✔ Seed Integrity

* [ ] Seeds respect FK constraints
* [ ] Seeds represent realistic business scenarios
* [ ] All lifecycle states seeded
* [ ] Multi-tenant seeds included

### ✔ Scenario Coverage

* [ ] Happy path transactions
* [ ] Edge financial rounding cases
* [ ] Reversals & cancellations
* [ ] Cross-period postings
* [ ] Permission boundary cases

### ✔ Snapshot Truth

* [ ] Seed → snapshot → invariant checks
* [ ] Totals reconcile
* [ ] Ledger balances zero-sum
* [ ] Referential graph intact

---

## 11️⃣ ERP-Grade Document Completeness

For each document type (Order, Invoice, Payment, etc.):

* [ ] Header table
* [ ] Line table
* [ ] Tax breakdown table
* [ ] Discount breakdown table
* [ ] Status history table
* [ ] Attachment table
* [ ] Approval log table
* [ ] Accounting impact table

---

## 12️⃣ Anti-Patterns Check

* [ ] Business rules living only in services
* [ ] Calculations only in frontend
* [ ] “Magic status strings”
* [ ] Cross-domain coupling
* [ ] Hidden side effects not persisted
* [ ] Non-reproducible financial results

---

# 🧠 Final Litmus Test

Your DB-first architecture is complete if:

> **A new engineering team could rebuild all services using only the schema, constraints, and seeds — and still reproduce correct business behavior.**

If not → missing truth in database.

---

If you want, next I can produce:

✅ A **gap scoring matrix**
✅ A **Sales-domain specific coverage audit**
✅ A **schema-to-invariant traceability map**
✅ A **seed scenario coverage matrix**
✅ A **DB Truth Maturity Model (Level 1–5)**
