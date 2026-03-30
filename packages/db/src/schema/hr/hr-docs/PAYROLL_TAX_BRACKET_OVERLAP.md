# Tax brackets — preventing overlapping bands

Row-level checks on `hr.tax_brackets` (`min_income` / `max_income`, `effective_from` / `effective_to`) cannot enforce **non-overlap across rows**. Use one of the following after data is clean.

## 1. Deferred trigger (flexible)

Before insert/update, scan for another active row with the same `tenant_id`, `country`, and `tax_type` where:

- Date ranges overlap (treat `effective_to` null as open-ended).
- Income ranges overlap (treat `max_income` null as unbounded above).

Raise `RAISE EXCEPTION` if a conflict exists.

## 2. Exclusion constraint (PostgreSQL)

Requires `btree_gist` and normalized range columns (e.g. `numrange` for income, `daterange` for validity). Example shape (adjust types and bounds to your conventions):

```sql
CREATE EXTENSION IF NOT EXISTS btree_gist;

-- Illustrative only: map nullable ends to finite sentinels or use constraint triggers instead.
-- ALTER TABLE hr.tax_brackets ADD CONSTRAINT tax_brackets_no_overlap EXCLUDE USING gist (...)
```

Prefer a **migration-owned** definition once bracket semantics (open-ended max income, inclusive/exclusive bounds) are fixed.

## 3. Application + batch job

Enforce on write in the payroll admin API and run a periodic report query to list overlaps (see payroll analytics examples).
