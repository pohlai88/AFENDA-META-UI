# Graph Validation System

**Automated FK Integrity & Tenant Isolation Validation**

The Graph Validation System provides automated checks for referential integrity across all 279+ Foreign Key relationships in the AFENDA sales domain. It detects orphaned records, validates tenant isolation, checks FK index coverage, and generates a comprehensive 0-100 health score with actionable recommendations.

---

## Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Quick Start](#quick-start)
- [CLI Commands](#cli-commands)
- [Architecture](#architecture)
- [Health Scoring](#health-scoring)
- [Validation Priorities](#validation-priorities)
- [Example Output](#example-output)
- [CI/CD Integration](#cicd-integration)
- [Monitoring & Alerts](#monitoring--alerts)
- [Troubleshooting](#troubleshooting)

---

## Overview

### Why Graph Validation?

**Problem**: In large-scale ERP systems with hundreds of FK relationships, orphaned records accumulate from:

- Manual SQL updates bypassing FK constraints
- Bulk imports without referential integrity checks
- Migrations with incorrect CASCADE behavior
- Race conditions in concurrent transactions

**Impact**:

- Data corruption (order lines referencing non-existent orders)
- Query performance degradation (missing FK indexes)
- Security incidents (cross-tenant data leaks)
- Compliance violations (SOX, GDPR, ISO 27001)

**Solution**: Automated validation system that:

1. Detects orphaned records before they proliferate
2. Validates tenant isolation (critical security requirement)
3. Checks FK index coverage for performance
4. Generates health scores for operational visibility
5. Blocks production deployments when health is CRITICAL

---

## Features

### 🔍 Comprehensive FK Analysis

- Automatically discovers all 279+ FK relationships via `information_schema`
- Enriches metadata with priorities (P0 Critical → P3 Low)
- Flags tenant-isolated relationships for security checks
- Groups relationships by table and priority tier

### 📊 Multi-Layer Validation

1. **Schema Layer**: FK constraints exist and match Drizzle definitions
2. **Data Layer**: LEFT JOIN queries detect orphaned child records
3. **Performance Layer**: FK columns have proper B-Tree indexes
4. **Security Layer**: Cross-tenant leak detection (c.tenant_id ≠ p.tenant_id)

### 🏥 Health Scoring (0-100 Points)

- **Orphan Count** (40%): Priority-weighted orphan penalties
- **Index Coverage** (25%): FK column index percentage
- **Tenant Isolation** (25%): Binary security check (0 leaks = PASS)
- **Cascade Behavior** (10%): Correct DELETE rules verification

### 🚨 Production Safety

- Exit code 1 when health score < 70 (CRITICAL status)
- Exit code 1 when tenant leaks detected (P0 security incident)
- Blocks CI/CD pipelines until violations resolved
- Security incident reports with escalation procedures

---

## Quick Start

### Prerequisites

```bash
# Ensure DATABASE_URL is set
export DATABASE_URL="postgresql://user:pass@localhost:5432/afenda_db"

# Or add to .env file
echo "DATABASE_URL=postgresql://..." >> .env
```

### Run Health Check

```bash
# Quick health overview (recommended daily check)
pnpm --filter @afenda/db graph-validation health

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
#   AFENDA Graph Validation Health Check
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
#
#   Overall Health Score: 92/100 (Grade: A)
#   Status: ✅ HEALTHY
#
#   Dimension Scores:
#   ├─ Orphan Count:      36.5/40pts (35 orphans)
#   ├─ Index Coverage:    24.2/25pts (96.8% indexed)
#   ├─ Tenant Isolation:  25/25pts (0 leaks)
#   └─ Cascade Behavior:  10/10pts (all correct)
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

### Generate Detailed Report

```bash
# Human-readable text report
pnpm --filter @afenda/db graph-validation report

# JSON report for CI/CD or monitoring
pnpm --filter @afenda/db graph-validation report --format=json > validation-report.json
```

### Validate Specific Priority Tier

```bash
# P0 (Critical) - Zero tolerance
pnpm --filter @afenda/db graph-validation validate --tier=P0

# P1 (High) - Important relationships
pnpm --filter @afenda/db graph-validation validate --tier=P1

# P2 (Medium) - Business configuration
pnpm --filter @afenda/db graph-validation validate --tier=P2

# P3 (Low) - Reference data
pnpm --filter @afenda/db graph-validation validate --tier=P3
```

### Check Tenant Isolation

```bash
# Critical security check (MUST be 0 leaks)
pnpm --filter @afenda/db graph-validation tenants

# ✅ Tenant isolation is SECURE. No cross-tenant violations detected.
```

---

## CLI Commands

### `health`

Quick health check with orphan detection, tenant leak check, and overall score.

**Usage:**

```bash
pnpm --filter @afenda/db graph-validation health
```

**Exit Codes:**

- `0`: Health score ≥ 70 (HEALTHY or WARNING)
- `1`: Health score < 70 (CRITICAL) - blocks CI/CD

**When to Use:**

- Daily health check (via cron or GitHub Actions)
- Pre-deployment validation gate
- After bulk data imports or migrations

---

### `report`

Detailed validation report with orphan details, tenant leak forensics, and recommendations.

**Usage:**

```bash
# Human-readable text report
pnpm --filter @afenda/db graph-validation report

# Machine-readable JSON report
pnpm --filter @afenda/db graph-validation report --format=json

# Export to file
pnpm --filter @afenda/db graph-validation report --format=json > report.json
```

**Output:**

- Health score breakdown by dimension
- Orphaned record counts per table
- Sample orphan IDs for investigation
- Tenant leak forensic data (if violations exist)
- Actionable recommendations

**When to Use:**

- Detailed investigation of health issues
- Compliance audits (SOX, GDPR, ISO 27001)
- Weekly operational reports

---

### `validate`

Validate specific priority tier with detailed violation listing.

**Usage:**

```bash
# Validate only P0 (Critical) relationships
pnpm --filter @afenda/db graph-validation validate --tier=P0

# Validate P1 (High) relationships
pnpm --filter @afenda/db graph-validation validate --tier=P1

# Validate all relationships (no tier filter)
pnpm --filter @afenda/db graph-validation validate
```

**Exit Codes:**

- `0`: No critical violations (P0/P1 orphans = 0)
- `1`: Critical violations detected

**When to Use:**

- Targeted validation after schema changes
- Isolate specific tier issues during debugging
- CI/CD gates for specific modules (e.g., only validate P0 before prod)

---

### `tenants`

Security audit for cross-tenant data leaks via FK relationships.

**Usage:**

```bash
pnpm --filter @afenda/db graph-validation tenants
```

**Exit Codes:**

- `0`: Secure (0 tenant leaks)
- `1`: CRITICAL SECURITY INCIDENT (any leaks detected)

**Output (if violations):**

```
🚨 SECURITY INCIDENT: Cross-Tenant Data Leak Detected
Severity: CRITICAL (P0)

Total Violations: 14 cross-tenant leaks detected
Affected Tables: 3 (partners, sales_orders, addresses)

Sample Violations:
  - Child: partners#1234 (tenant_id=2) → Parent: users#5678 (tenant_id=5)
  - Child: sales_orders#9876 (tenant_id=3) → Parent: partners#4321 (tenant_id=7)

IMMEDIATE ACTION REQUIRED:
1. Escalate to security team (#security-incidents)
2. Quarantine affected records (DO NOT delete without approval)
3. Forensic analysis: When did leaks occur?
4. Check for data exfiltration attempts
5. Audit recent migrations/bulk imports
6. Review RLS policy enforcement

Contact: security-team@afenda.com
PagerDuty: Security On-Call
```

**When to Use:**

- Daily security audit (automated via GitHub Actions)
- After tenant migrations or data imports
- Compliance audits (ISO 27001, SOC 2)

---

### `clean`

Generate orphan cleanup SQL in dry-run mode or execute cleanup with explicit confirmation.

**Usage:**

```bash
# Dry-run: show cleanup SQL for critical relationships only
pnpm --filter @afenda/db graph-validation clean --tier=P0

# Dry-run for a specific child table
pnpm --filter @afenda/db graph-validation clean --table=sales_order_lines

# Execute cleanup for top 5 candidates (destructive)
pnpm --filter @afenda/db graph-validation clean --apply --confirm=DELETE --limit=5
```

**Options:**

- `--tier=P0|P1|P2|P3`: Limit cleanup candidates by relationship priority
- `--table=<child_table>`: Limit cleanup candidates to one child table
- `--limit=<n>`: Execute/show only top `n` candidates by orphan volume
- `--apply`: Execute delete statements (default mode is dry-run)
- `--confirm=DELETE`: Required safety confirmation when using `--apply`

**Exit Codes:**

- `0`: Cleanup dry-run or execution completed without command-level failures
- `1`: Safety check failure (missing `--confirm=DELETE`) or execution error

**When to Use:**

- Weekly orphan remediation runbooks
- Controlled cleanup windows after validation reports
- Incident response when P0/P1 orphan accumulation is detected

---

### `add-indexes`

Generate missing FK column indexes or create them directly to improve query performance.

**Usage:**

```bash
# Dry-run: show all missing FK column indexes
pnpm --filter @afenda/db graph-validation add-indexes

# Dry-run: show only critical (P0) missing indexes
pnpm --filter @afenda/db graph-validation add-indexes --tier=P0

# Execute index creation (will show top 10 by default)
pnpm --filter @afenda/db graph-validation add-indexes --apply --confirm=APPLY

# Execute index creation for top 5 missing indexes
pnpm --filter @afenda/db graph-validation add-indexes --apply --confirm=APPLY --limit=5
```

**Options:**

- `--tier=P0|P1|P2|P3`: Limit index suggestions by FK relationship priority
- `--limit=<n>`: Show/create only top `n` missing indexes (sorted by priority)
- `--apply`: Execute CREATE INDEX statements (default mode is dry-run)
- `--confirm=APPLY`: Required safety confirmation when using `--apply`

**Exit Codes:**

- `0`: Index detection dry-run or creation completed without command-level failures
- `1`: Safety check failure (missing `--confirm=APPLY`) or creation error

**Details:**

- Uses `CREATE INDEX CONCURRENTLY` for lock-free index creation
- Supports concurrent queries during index creation (production-safe)
- Indexes are created using naming convention: `idx_<table>_<column>`
- Fails gracefully if index already exists

**When to Use:**

- After schema migrations that add FK columns
- Performance remediation when JOIN queries are slow
- Preventive maintenance before large data loads
- Addressing index coverage gaps in health reports (target: ≥95%)

---

### `export-catalog`

Export FK relationship catalog to JSON for documentation or manual review.

**Usage:**

```bash
# Default output: ./fk-catalog.json
pnpm --filter @afenda/db graph-validation export-catalog

# Custom output path
pnpm --filter @afenda/db graph-validation export-catalog --output=./docs/fk-catalog.json
```

**Output Format:**

```json
{
  "relationships": [
    {
      "constraintName": "fk_sales_order_lines_order_id",
      "childTable": "sales_order_lines",
      "childColumn": "order_id",
      "parentTable": "sales_orders",
      "parentColumn": "id",
      "onDelete": "cascade",
      "onUpdate": "cascade",
      "priority": "P0",
      "isOptional": false,
      "isTenantIsolated": true
    }
  ],
  "byPriority": {
    "P0": [...],
    "P1": [...],
    "P2": [...],
    "P3": [...]
  }
}
```

**When to Use:**

- Documentation generation
- Manual FK relationship review
- Schema change planning (understand FK dependencies)

---

## Architecture

### 4-Layer Validation Model

```
┌─────────────────────────────────────────────────────────────┐
│  Layer 1: Schema Validation                                 │
│  → FK constraints exist in information_schema               │
│  → Match Drizzle schema definitions                         │
│  → Correct onDelete/onUpdate rules (CASCADE vs RESTRICT)    │
└─────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│  Layer 2: Data Validation                                   │
│  → LEFT JOIN queries detect orphaned child records          │
│  → Priority-based orphan detection (P0 → P3)                │
│  → Sample orphan IDs for investigation                      │
└─────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│  Layer 3: Performance Validation                            │
│  → FK columns have B-Tree indexes                           │
│  → Index coverage metrics (% of FKs indexed)                │
│  → Missing index identification                             │
└─────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│  Layer 4: Security Validation                               │
│  → Cross-tenant leak detection (c.tenant_id ≠ p.tenant_id) │
│  → Forensic sample data (IDs + tenant IDs)                  │
│  → Binary security status (0 leaks = SECURE)                │
└─────────────────────────────────────────────────────────────┘
```

### Module Structure

```
packages/db/src/graph-validation/
├── runner.ts                 # CLI orchestration
├── fk-catalog.ts             # FK metadata extraction
├── orphan-detection.ts       # LEFT JOIN orphan queries
├── tenant-isolation.ts       # Cross-tenant leak detection
├── health-scoring.ts         # 0-100 scoring algorithm
├── GRAPH_VALIDATION_STRATEGY.md  # Comprehensive reference
└── README.md                 # This file
```

---

## Health Scoring

### Scoring Formula (0-100 Points)

```
Overall Score = Orphan Score + Index Score + Tenant Score + Cascade Score
               └─ 40pts max   └─ 25pts max  └─ 25pts max   └─ 10pts max
```

### Dimension Breakdown

#### 1. Orphan Score (40% weight)

```typescript
orphanScore = 40 - (P0_orphans × 1.0) - (P1_orphans × 1.0)
                 - (P2_orphans × 0.1) - (P3_orphans × 0.1)
orphanScore = Math.max(0, orphanScore) // Floor at 0
```

**Example:**

- 5 P0 orphans (critical) → 40 - (5 × 1.0) = 35 pts
- 100 P2 orphans (medium) → 40 - (100 × 0.1) = 30 pts
- 1000 P3 orphans (low) → 40 - (1000 × 0.1) = 0 pts (floor)

#### 2. Index Score (25% weight)

```typescript
indexScore = (indexedFKs / totalFKs) × 25
```

**Example:**

- 270/279 FKs indexed → (270/279) × 25 = 24.2 pts
- 220/279 FKs indexed → (220/279) × 25 = 19.7 pts

#### 3. Tenant Score (25% weight)

```typescript
tenantScore = tenantLeaks === 0 ? 25 : 0; // BINARY
```

**Example:**

- 0 tenant leaks → 25 pts
- 1 tenant leak → 0 pts (SECURITY INCIDENT)

#### 4. Cascade Score (10% weight)

```typescript
cascadeScore = 10 - (incorrectCascadeRules × 2)
cascadeScore = Math.max(0, cascadeScore) // Floor at 0
```

**Example:**

- 0 incorrect rules → 10 pts
- 3 incorrect rules → 10 - (3 × 2) = 4 pts

### Grade Thresholds

| Grade | Range  | Description                         |
| ----- | ------ | ----------------------------------- |
| A+    | 98-100 | Near-perfect health                 |
| A     | 90-97  | Excellent health                    |
| B     | 80-89  | Good health, routine cleanup needed |
| C     | 70-79  | Acceptable, urgent cleanup required |
| D     | 60-69  | Poor health, integrity at risk      |
| F     | 0-59   | CRITICAL failure, block deployment  |

### Status Thresholds

| Status   | Range | Action Required                       |
| -------- | ----- | ------------------------------------- |
| HEALTHY  | ≥95   | Maintain current hygiene              |
| WARNING  | 70-94 | Investigate and cleanup within 1 week |
| CRITICAL | <70   | Emergency response, block deployment  |

---

## Validation Priorities

### 4-Tier Priority System

Each FK relationship is assigned a priority (P0 → P3) based on criticality:

#### P0: Critical (Zero Tolerance)

**SLA**: 0 orphans tolerated, immediate alert

**Examples:**

- `tenants` → all sales domain tables
- `partners` → `sales_orders`
- `sales_orders` → `sales_order_lines`
- `products` → `sales_order_lines`

**Impact if Violated:**

- Order lines without parent order (billing errors)
- Sales orders without partner (legal compliance violation)
- Lines without product (inventory reconciliation failure)

---

#### P1: High (Grace Period)

**SLA**: < 100 orphans, alert if exceeded

**Examples:**

- `users` → audit trail tables (created_by, updated_by)
- FK relationships with CASCADE delete rules
- History tables (e.g., `partners_history`)
- Event logs

**Impact if Violated:**

- Audit trail gaps (SOX compliance risk)
- Orphaned historical records (forensic analysis impaired)
- Cascading failures from incorrect DELETE behavior

---

#### P2: Medium (Weekly Cleanup)

**SLA**: < 1000 orphans, weekly cleanup acceptable

**Examples:**

- `tax_rates` → sales documents
- `pricelists` → sales orders
- `payment_terms` → partners
- `fiscal_positions` → partners

**Impact if Violated:**

- Missing tax rate → default tax applied (revenue discrepancy)
- Missing pricelist → pricing errors
- Cleanup can be scheduled during off-hours

---

#### P3: Low (Monitoring Only)

**SLA**: Weekly cleanup, monitoring only

**Examples:**

- `currencies` → price fields
- `units_of_measure` → product definitions
- `warehouses` → stock moves
- `incoterms` → sales orders

**Impact if Violated:**

- Reference data missing (display errors)
- Low business impact
- Cleanup can be batched

---

## Example Output

### Health Check (HEALTHY)

```bash
$ pnpm --filter @afenda/db graph-validation health

🏥 Starting graph validation health check...

✅ Found 279 FK constraints
   P0: 45, P1: 89, P2: 78, P3: 67
   Tenant-isolated relationships: 245

✅ Orphan detection complete
   Total orphans: 35 across 8 tables
   Critical violations (P0/P1): 0

✅ Tenant isolation: SECURE (0 violations)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  AFENDA Graph Validation Health Check
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  Overall Health Score: 96/100 (Grade: A)
  Status: ✅ HEALTHY

  Dimension Scores:
  ├─ Orphan Count:      36.5/40pts (35 orphans)
  ├─ Index Coverage:    24.2/25pts (96.8% indexed)
  ├─ Tenant Isolation:  25/25pts (0 leaks)
  └─ Cascade Behavior:  10/10pts (all correct)

  Recommendations:
  ✅ Overall health HEALTHY. Continue routine monitoring.
  🟡 35 total orphaned records detected. Review and schedule cleanup.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

### Health Check (CRITICAL)

```bash
$ pnpm --filter @afenda/db graph-validation health

🏥 Starting graph validation health check...

✅ Found 279 FK constraints
   P0: 45, P1: 89, P2: 78, P3: 67
   Tenant-isolated relationships: 245

⚠️  Orphan detection complete
   Total orphans: 1,247 across 12 tables
   Critical violations (P0/P1): 14

🚨 Tenant isolation: CRITICAL (14 violations) - SECURITY INCIDENT

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  AFENDA Graph Validation Health Check
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  Overall Health Score: 39/100 (Grade: F)
  Status: ❌ CRITICAL

  Dimension Scores:
  ├─ Orphan Count:      2.7/40pts (1,247 orphans)
  ├─ Index Coverage:    24.2/25pts (96.8% indexed)
  ├─ Tenant Isolation:  0/25pts (14 leaks)
  └─ Cascade Behavior:  10/10pts (all correct)

  Recommendations:
  🔴 CRITICAL: 14 P0/P1 violations detected.
  🟡 1,247 total orphaned records detected. Review and cleanup.
  🚨 SECURITY: 14 cross-tenant violations. THIS IS A SECURITY INCIDENT.
     Escalate immediately to #security-incidents.
  ❌ Overall health CRITICAL. Production deployment should be blocked.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Exit code: 1
```

---

## CI/CD Integration

### Phase 1-2: Automated Test Suite + Coverage

The repository includes a dedicated workflow at `.github/workflows/graph-validation.yml`.

**Test Job (`graph-validation`):**

- Runs on pull requests and pushes that touch graph-validation files
- Runs nightly via cron (`0 2 * * * UTC`)
- Executes both scripts:
  - `pnpm run db:test:graph-validation` - Unit + integration tests
  - `pnpm run db:test:graph-validation:coverage` - Coverage enforcement (100% all metrics)
- Uploads coverage log as artifact: `graph-validation-coverage-log`
- Enforces 100% coverage thresholds (statements, branches, functions, lines)

**Equivalent local commands:**

```bash
# Run graph-validation tests only
pnpm run db:test:graph-validation

# Run graph-validation coverage
pnpm run db:test:graph-validation:coverage
```

### Phase 3: Automated Health Check & Daily Validation

**Health Check Job (`graph-validation-health`)** — NEW

- **Trigger**: Scheduled daily at 2 AM UTC (`0 2 * * *`)
- **Also runs on**: Manual workflow dispatch, protected branch push
- **Requires**: `DATABASE_URL` secret configured in GitHub repository
- **Timeout**: 20 minutes (queries 279+ FK relationships)

**Validation checks performed:**

1. **Health Score**: Overall FK integrity status (0-100)
2. **P0 Critical**: Zero-tolerance violations on core relationships
3. **Tenant Isolation**: Security audit for cross-tenant data leaks
4. **Index Coverage**: Missing FK column indexes for performance
5. **Orphan Count**: Record count by priority tier

**Reports generated:**

- `health-check.txt` - Human-readable health overview
- `validation-report.json` - Machine-readable detailed metrics
- `p0-validation.txt` - Critical relationship violations (if any)
- `tenant-isolation-audit.txt` - Security audit results
- `fk-catalog.json` - Complete FK relationship metadata

**Workflow thresholds:**

- **Minimum Health Score**: 70/100 (fails if lower)
- **Alert Threshold**: 80/100 (warning if between 70-79)
- **P0 Violations**: Zero tolerance (fails if count > 0)
- **Tenant Leaks**: Zero tolerance (fails on any breach)

**Failure conditions:**

```
Exit code 1 if:
- Health score < 70 (CRITICAL)
- P0 violations detected (production data corruption risk)
- Tenant isolation breach (security incident)
```

**GitHub Actions setup:**

1. Add `DATABASE_URL` secret to repository settings:
   - Settings → Secrets and variables → Actions → New repository secret
   - Name: `DATABASE_URL`
   - Value: PostgreSQL connection string (staging or production)

2. Optional: Configure with environment protection rules
   - Settings → Environments → New environment
   - Name: `production`
   - Approval requirements (for automatic firing)

**Example workflow output:**

```
## Graph Validation Health Check

### Overall Status
- Health Score: 92/100 (Status: HEALTHY)
- P0 Validation: PASS
- Tenant Isolation: SECURE

### Generated Reports
- 📋 Health Check Summary
- 📊 Detailed Validation Report (JSON)
- 🔍 P0 Critical Relationship Validation
- 🔒 Tenant Isolation Security Audit
- 📁 FK Catalog Export

### Artifacts
- Download: graph-validation-reports
```

### Pre-Deployment Gate (Recommended)

```yaml
# .github/workflows/deploy.yml (excerpt)
jobs:
  validate-production:
    runs-on: ubuntu-latest
    environment: production
    steps:
      - name: Validate P0 FK relationships
        env:
          DATABASE_URL: ${{ secrets.PRODUCTION_DATABASE_URL }}
        run: |
          pnpm --filter @afenda/db graph-validation validate --tier=P0

      - name: Check tenant isolation
        env:
          DATABASE_URL: ${{ secrets.PRODUCTION_DATABASE_URL }}
        run: |
          pnpm --filter @afenda/db graph-validation tenants

      - name: Block deployment if validation fails
        if: failure()
        run: |
          echo "❌ Pre-deployment validation failed"
          echo "Fix violations before attempting deployment"
          exit 1
```

---

## Monitoring & Alerts

### Grafana Dashboard

**Recommended Panels:**

1. **Health Score Time-Series**
   - Graph overall health score (0-100) over 30 days
   - Color bands: GREEN (≥95), YELLOW (70-94), RED (<70)

2. **Orphan Trends by Priority**
   - Multi-line graph: P0, P1, P2, P3 orphan counts
   - Alert when P0 orphans > 0

3. **Tenant Isolation Status**
   - Binary status (SECURE vs CRITICAL)
   - Alert on any tenant leak

4. **Index Coverage Percentage**
   - Gauge: FK index coverage (target: 100%)
   - Alert when < 95%

### PagerDuty Alert Rules

**P0: Security Incident** (CRITICAL)

```
Condition: Tenant leaks > 0
Severity: CRITICAL
Escalation: Immediate (security team)
```

**P1: Poor Health** (HIGH)

```
Condition: Health score < 70
Severity: HIGH
Escalation: On-call DBA within 15 minutes
```

**P2: Missing Indexes** (MEDIUM)

```
Condition: Unindexed FKs > 5
Severity: MEDIUM
Escalation: Daily summary to DevOps team
```

---

## Troubleshooting

### "DATABASE_URL environment variable is required"

**Solution:**

```bash
export DATABASE_URL="postgresql://user:pass@localhost:5432/afenda_db"
```

Or add to `.env` file in project root.

---

### Exit Code 1 Despite Healthy Score

**Likely Cause**: Tenant leaks detected (P0 security incident)

**Solution:**

```bash
# Check tenant isolation specifically
pnpm --filter @afenda/db graph-validation tenants

# Review sample violations
pnpm --filter @afenda/db graph-validation report --format=json | jq '.tenantLeaks'
```

**Remediation**:

1. Escalate to security team
2. Quarantine affected records (do NOT delete)
3. Forensic analysis: audit log review
4. Fix source of leak (bulk import script, migration, etc.)

---

### High Orphan Count in P3 (Low Priority)

**Expected Behavior**: P3 orphans have minimal business impact

**Solution:**

- Schedule weekly cleanup during off-hours
- P3 orphans penalized lightly (-0.1pt each)
- Only becomes CRITICAL if total exceeds ~4000 orphans

---

### Performance Issues (Long Validation Time)

**Solution:**

- Validate specific tier: `--tier=P0` (only critical FKs)
- Run during off-peak hours (avoid production impact)
- Check database connection latency
- Consider read-replica for validation queries

---

## Next Steps

### Phase 2: Remediation Tools (Week 2)

#### Implemented:

```bash
# Clean orphaned records (dry-run by default, safe to use)
pnpm --filter @afenda/db graph-validation clean --tier=P0
pnpm --filter @afenda/db graph-validation clean --table=sales_orders --limit=10
pnpm --filter @afenda/db graph-validation clean --apply --confirm=DELETE --limit=5

# Create missing FK column indexes (concurrent-safe index creation)
pnpm --filter @afenda/db graph-validation add-indexes
pnpm --filter @afenda/db graph-validation add-indexes --tier=P0
pnpm --filter @afenda/db graph-validation add-indexes --apply --confirm=APPLY --limit=10
```

**Deliverables (Phase 2):**

- ✅ **Cleanup Tool** (`clean` command): Generates and executes orphan deletion with safety checks
- ✅ **Index Remediation** (`add-indexes` command): Detects missing FK column indexes and creates them safely

### Phase 3: Automation (Week 3)

#### Implemented:

**GitHub Actions Workflow** — `.github/workflows/graph-validation.yml`

```bash
# Trigger manually or on schedule (daily 2 AM UTC)
# Generates comprehensive validation reports and health metrics
Artifacts: graph-validation-reports (30-day retention)
```

**Automated Jobs:**

1. **Test Suite** (`graph-validation`):
   - Runs on PR/push/nightly
   - 100% code coverage enforcement
   - Artifact: coverage report

2. **Health Check** (`graph-validation-health`):
   - Daily schedule or manual trigger
   - Requires DATABASE_URL secret
   - Runs: health check, report generation, P0 validation, tenant isolation audit
   - Fails on: CRITICAL health score (<70), P0 violations, tenant leaks
   - Artifacts: 5 detailed reports in JSON and text formats

**Deliverables (Phase 3):**

- ✅ **Daily Validation Automation**: GitHub Actions workflow with health check + reporting
- ✅ **Multi-Report Generation**: Health, detailed metrics, P0 validation, security audit, FK catalog
- ✅ **CI/CD Integration**: Exit codes for deployment gates, artifact uploads, workflow summaries
- ✅ **Monitoring Setup**: Dashboard panels (health score, orphans, tenant isolation, index coverage)
- ✅ **Alert Framework**: PagerDuty integration guidelines (P0 security, P1 health, P2 indexes)

**Setup Instructions:**

1. Add `DATABASE_URL` secret to GitHub repository
2. Optional: Configure approval gates for `production` environment
3. View daily health check results in Actions tab → Artifacts

### Phase 4: Compliance (Week 4)

- SOX audit queries
- GDPR compliance checks
- ISO 27001 validation queries

---

## Support

**For Issues or Questions:**

- GitHub: [AFENDA-META-UI Repository](https://github.com/your-org/afenda-meta-ui)
- Docs: [GRAPH_VALIDATION_STRATEGY.md](./GRAPH_VALIDATION_STRATEGY.md)
- Contact: dba-team@afenda.com

**For Security Incidents (Tenant Leaks):**

- Slack: #security-incidents
- PagerDuty: Security On-Call
- Email: security-team@afenda.com
