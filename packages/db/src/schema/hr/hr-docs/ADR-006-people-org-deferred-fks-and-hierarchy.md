# ADR-006: People & org — deferred FKs and hierarchy columns

## Context

`departments` is defined before `employees` and `cost_centers` in `people.ts`, so composite foreign keys from `departments.manager_id` and `departments.cost_center_id` cannot be expressed in Drizzle without reordering or synthetic placeholder tables.

## Decision

1. **Deferred FKs** — Keep nullable `manager_id` and `cost_center_id` on `departments` without Drizzle-declared FKs. Enforce referential integrity in a later migration via `ALTER TABLE … ADD CONSTRAINT` (see `CIRCULAR_FKS.md`, CIRC-001 and CIRC-002). Until then, application services must validate tenant-scoped IDs.

2. **Resolution options** (choose per rollout):
   - **Deferred constraint**: add composite FKs after baseline data is clean.
   - **Trigger-based validation**: `BEFORE INSERT OR UPDATE` on `hr.departments` checking `(tenant_id, manager_id)` exists in `hr.employees` when `manager_id` is not null (same pattern for cost center).

3. **Hierarchy helpers** — `departments.hierarchy_path` and `departments.tree_depth` are **application-maintained** (optional). They speed subtree queries and depth filters; materialized path format is a tenant convention (e.g. `/parent-id/self-id/`).

## Status

Accepted; complements `CIRCULAR_FKS.md`.
