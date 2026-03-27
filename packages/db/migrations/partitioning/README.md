# Partition Strategy Implementation

**Status:** Ô£à Ready for Deployment
**Created:** 2026-03-27
**Priority:** Medium (Priority 2 from sales-checklist.md)

---

## ­ƒôï Overview

This directory contains SQL migration scripts for implementing PostgreSQL range partitioning on three high-volume tables in the Sales domain:

1. **sales_orders** - Monthly partitions by `order_date`
2. **accounting_postings** - Monthly partitions by `posting_date`
3. **domain_event_logs** - Weekly partitions by `created_at`

**Why Partition?**
- Query performance improvements (5-10x for date-range queries via partition pruning)
- Efficient data lifecycle management (archive old partitions independently)
- Reduced maintenance overhead (VACUUM, ANALYZE operate on smaller units)
- Scalability to 100M+ rows

---

## ­ƒôü Files

| File | Description | Status |
|------|-------------|--------|
| `001_partition_sales_orders.sql` | Convert `sales_orders` to monthly partitions | Ô£à Ready |
| `002_partition_accounting_postings.sql` | Convert `accounting_postings` to monthly partitions | Ô£à Ready |
| `003_partition_domain_event_logs.sql` | Convert `domain_event_logs` to weekly partitions | Ô£à Ready |
| `004_partition_automation_functions.sql` | Auto-create future partitions + health checks | Ô£à Ready |
| `005_partition_maintenance_scripts.sql` | Archive old partitions + pg_cron setup | Ô£à Ready |

---

## ­ƒÜÇ Deployment Instructions

### Prerequisites

- PostgreSQL 14+ (declarative partitioning support)
- Existing tables: `sales.sales_orders`, `sales.accounting_postings`, `sales.domain_event_logs`
- Database backup completed
- Low-traffic maintenance window scheduled

### Step 1: Review Strategy Document

Read the comprehensive strategy documentation:
```bash
cat ../PARTITION_STRATEGY.md
```

Key details:
- Partition intervals (monthly vs weekly)
- Retention policies (7 years for orders, 10 years for postings, 90 days for events)
- Archival procedures
- Query performance expectations

### Step 2: Run Migrations (in order)

**ÔÜá´©Å CRITICAL: Run in a transaction if possible, or ensure you can rollback**

```bash
# 1. Partition sales_orders (monthly)
psql -U postgres -d afenda_meta_ui -f 001_partition_sales_orders.sql

# 2. Partition accounting_postings (monthly)
psql -U postgres -d afenda_meta_ui -f 002_partition_accounting_postings.sql

# 3. Partition domain_event_logs (weekly)
psql -U postgres -d afenda_meta_ui -f 003_partition_domain_event_logs.sql

# 4. Install automation functions
psql -U postgres -d afenda_meta_ui -f 004_partition_automation_functions.sql

# 5. Install maintenance scripts
psql -U postgres -d afenda_meta_ui -f 005_partition_maintenance_scripts.sql
```

**Each script performs:**
1. Creates partitioned table structure (`tablename_partitioned`)
2. Creates initial partitions (6-13 partitions depending on table)
3. Creates default partition (catches data outside ranges)
4. Migrates data from existing table
5. Swaps tables atomically (`tablename_old` ÔåÉ old, `tablename` ÔåÉ partitioned)
6. Validates partition setup

**Duration estimates:**
- `sales_orders`: 5-30 minutes (depends on row count)
- `accounting_postings`: 5-60 minutes (ledger-scale data)
- `domain_event_logs`: 5-45 minutes (high-volume events)

### Step 3: Validate Partitioning

```sql
-- Check partition counts
SELECT sales.check_partition_health();

-- Verify default partitions are empty (should be 0 rows)
SELECT COUNT(*) FROM sales.sales_orders_default;
SELECT COUNT(*) FROM sales.accounting_postings_default;
SELECT COUNT(*) FROM sales.domain_event_logs_default;

-- Test partition pruning (check EXPLAIN output)
EXPLAIN SELECT * FROM sales.sales_orders
WHERE order_date >= '2024-01-01' AND order_date < '2024-02-01';
-- Look for: "Partitions pruned: X" in output

-- List all partitions with sizes
SELECT * FROM sales.list_partitions('sales_orders');
SELECT * FROM sales.list_partitions('accounting_postings');
SELECT * FROM sales.list_partitions('domain_event_logs');
```

### Step 4: Setup Automated Management

**Option A: Using pg_cron (recommended)**

```sql
-- Setup scheduled jobs
SELECT * FROM sales.setup_partition_cron_jobs();

-- Verify jobs scheduled
SELECT * FROM cron.job;
```

**Jobs created:**
- **Daily at 2 AM**: Create future partitions (6 months ahead for orders, 8 weeks for events)
- **Weekly on Sunday at 3 AM**: Health check (default partition empty, coverage adequate)
- **Monthly on 1st at 4 AM**: Archive old partitions per retention policy

**Option B: Manual cron (if pg_cron unavailable)**

Add to system crontab:
```bash
# Create future partitions daily at 2 AM
0 2 * * * psql -U postgres -d afenda_meta_ui -c "SELECT sales.create_future_partitions();"

# Check partition health weekly (Sunday 3 AM)
0 3 * * 0 psql -U postgres -d afenda_meta_ui -c "SELECT sales.check_partition_health();"

# Archive old partitions monthly (1st of month, 4 AM)
0 4 1 * * psql -U postgres -d afenda_meta_ui -c "SELECT sales.archive_sales_orders_partitions(7, FALSE, TRUE);"
```

### Step 5: Cleanup Old Tables (after validation period)

**ÔÜá´©Å Wait at least 7 days to ensure partitioned tables work correctly**

```sql
-- After confirming partitioned tables work:
DROP TABLE sales.sales_orders_old CASCADE;
DROP TABLE sales.accounting_postings_old CASCADE;
DROP TABLE sales.domain_event_logs_old CASCADE;

-- Remove helper functions (optional)
DROP FUNCTION sales.create_sales_orders_partition(DATE);
DROP FUNCTION sales.create_accounting_postings_partition(DATE);
DROP FUNCTION sales.create_domain_event_logs_partition(DATE);
```

---

## ­ƒöä Rollback Procedure

If issues are detected after migration:

```sql
-- Rollback sales_orders
ALTER TABLE sales.sales_orders RENAME TO sales_orders_partitioned_failed;
ALTER TABLE sales.sales_orders_old RENAME TO sales_orders;
DROP TABLE sales.sales_orders_partitioned_failed CASCADE;

-- Rollback accounting_postings
ALTER TABLE sales.accounting_postings RENAME TO accounting_postings_partitioned_failed;
ALTER TABLE sales.accounting_postings_old RENAME TO accounting_postings;
DROP TABLE sales.accounting_postings_partitioned_failed CASCADE;

-- Rollback domain_event_logs
ALTER TABLE sales.domain_event_logs RENAME TO domain_event_logs_partitioned_failed;
ALTER TABLE sales.domain_event_logs_old RENAME TO domain_event_logs;
DROP TABLE sales.domain_event_logs_partitioned_failed CASCADE;
```

---

## ­ƒôè Performance Testing

### Before/After Comparison

**Test queries:**

```sql
-- Query 1: Single month orders
EXPLAIN ANALYZE
SELECT * FROM sales.sales_orders
WHERE tenant_id = 1
  AND order_date >= '2024-01-01'
  AND order_date < '2024-02-01';

-- Query 2: Quarterly accounting report
EXPLAIN ANALYZE
SELECT
    debit_account_code,
    SUM(amount) as total
FROM sales.accounting_postings
WHERE tenant_id = 1
  AND posting_date >= '2024-01-01'
  AND posting_date < '2024-04-01'
GROUP BY debit_account_code;

-- Query 3: Event replay for entity
EXPLAIN ANALYZE
SELECT * FROM sales.domain_event_logs
WHERE tenant_id = 1
  AND entity_id = '00000301-0000-4000-8000-000000000301'
  AND created_at >= CURRENT_DATE - INTERVAL '7 days'
ORDER BY created_at;
```

**Expected improvements:**
- Queries filtering by partition key: **5-10x faster**
- Partition pruning should eliminate 80-95% of partitions
- Index scans should be faster (smaller indexes per partition)

---

## ­ƒøá´©Å Maintenance Operations

### Create Future Partitions (manual)

```sql
-- Auto-create partitions for next N months/weeks
SELECT sales.create_future_partitions();
```

### Check Partition Health

```sql
-- Comprehensive health check
SELECT * FROM sales.check_partition_health();
```

### Archive Old Partitions (dry run)

```sql
-- See what would be archived
SELECT * FROM sales.archive_sales_orders_partitions(7, TRUE, TRUE);
SELECT * FROM sales.archive_accounting_postings_partitions(10, TRUE, TRUE);
SELECT * FROM sales.archive_domain_event_logs_partitions(90, TRUE, FALSE);
```

### Archive Old Partitions (execute)

```sql
-- Execute archival (CAUTION: This detaches and drops partitions)
SELECT * FROM sales.archive_sales_orders_partitions(7, FALSE, TRUE);
SELECT * FROM sales.archive_accounting_postings_partitions(10, FALSE, TRUE);
SELECT * FROM sales.archive_domain_event_logs_partitions(90, FALSE, FALSE);
```

---

## ­ƒº¬ Testing Checklist

Before deploying to production:

- [ ] Backup database
- [ ] Run migrations in dev/staging environment
- [ ] Verify row counts match (old table vs partitioned table)
- [ ] Test sample queries with EXPLAIN ANALYZE
- [ ] Confirm partition pruning is working
- [ ] Verify default partitions are empty
- [ ] Test Drizzle ORM queries (should be transparent)
- [ ] Run seed script to verify inserts work: `pnpm seed`
- [ ] Test automation functions: `SELECT sales.create_future_partitions();`
- [ ] Document performance improvements (before/after benchmarks)
- [ ] Plan rollback window (keep old tables for 7 days)

---

## ­ƒôÜ References

- [PARTITION_STRATEGY.md](../PARTITION_STRATEGY.md) - Comprehensive strategy documentation
- [PostgreSQL Partitioning Docs](https://www.postgresql.org/docs/14/ddl-partitioning.html)
- [sales-checklist.md](../../../.ideas/sales-checklist.md) - DB-first coverage checklist (updated to 94%)
- [postgresql-database-engineering skill](../../../.agents/skills/postgresql-database-engineering/SKILL.md) - Partitioning expertise

---

## Ô£à Completion Status

- [x] Strategy documented
- [x] Migration SQL created (3 tables)
- [x] Automation functions created
- [x] Maintenance scripts created
- [x] Deployment instructions written
- [ ] Tested in dev environment
- [ ] Performance benchmarks documented
- [ ] Deployed to staging
- [ ] Deployed to production

**Next Actions:**
1. Test migrations in local dev environment
2. Run performance benchmarks (before/after comparison)
3. Schedule production deployment in low-traffic window
4. Monitor partition health for 7 days post-deployment
5. Remove old tables after validation period

---

**Questions or Issues?** Refer to [PARTITION_STRATEGY.md](../PARTITION_STRATEGY.md) troubleshooting section.
