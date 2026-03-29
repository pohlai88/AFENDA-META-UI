# ADR-002: Circular Foreign Key Handling

**Status:** ✅ Implemented
**Date:** 2026-03-29
**Deciders:** Database team

---

## Context

When splitting the monolithic HR schema into domain files ([ADR-001](ADR-001-domain-file-split.md)), we encountered **circular foreign key references** that cannot be expressed in Drizzle ORM's schema definition language.

### The Problem

In TypeScript/Drizzle, table definitions reference imported table objects:

```typescript
// people.ts
export const departments = hrSchema.table("departments", {
  managerId: uuid("manager_id"), // wants to reference employees
  // ...
});

export const employees = hrSchema.table("employees", {
  departmentId: uuid("department_id").references(() => departments.id),
  // ...
});
```

**Issue:** `departments` is defined before `employees`, so `managerId` cannot reference `employees.id` (the symbol doesn't exist yet).

### Real-World Cases in HR Schema

1. **CIRC-001:** `departments.managerId` → `employees.id` (department manager)
2. **CIRC-002:** `departments.costCenterId` → `costCenters.id` (departments defined before cost centers)

## Decision

**Use deferred foreign keys with explicit documentation:**

1. **Omit circular FKs from Drizzle schema** — intentionally leave them undeclared
2. **Document in [CIRCULAR_FKS.md](CIRCULAR_FKS.md)** — create a CIRC-XXX registry entry
3. **Track in [CUSTOM_SQL_REGISTRY.json](CUSTOM_SQL_REGISTRY.json)** — log as CSQL-XXX with pending status
4. **Add via custom SQL in migration** — append `ALTER TABLE` after Drizzle generates base migration
5. **Add inline comment in table definition:**
   ```typescript
   managerId: uuid("manager_id"), // FK deferred — see CIRCULAR_FKS.md CIRC-001
   ```

### Migration Workflow

```bash
# 1. Generate base migration
pnpm drizzle-kit generate

# 2. Append circular FK SQL to generated migration
cat >> migrations/XXXX_migration.sql << EOF
-- CSQL-001: departments.managerId → employees.id
ALTER TABLE hr.departments
  ADD CONSTRAINT fk_departments_manager
  FOREIGN KEY (tenant_id, manager_id)
  REFERENCES hr.employees(tenant_id, id);
EOF

# 3. Update CUSTOM_SQL_REGISTRY.json status: "pending" → "applied"
```

## Rationale

### Why not use `ALTER TABLE` in Drizzle schema?
Drizzle doesn't support runtime `ALTER TABLE` — it only generates DDL files.

### Why not reorder table definitions?
Cannot reorder when both tables reference each other. One must come first.

### Why not use a separate "relations" file?
Drizzle's `relations()` API is for ORM query building, not database FK constraints. Database FKs require actual SQL `ALTER TABLE`.

### Why composite FKs?
Per [SCHEMA_LOCKDOWN.md](SCHEMA_LOCKDOWN.md), all intra-HR FKs must include `tenantId` for multi-tenancy isolation.

## Consequences

### ✅ Positive

- **Explicit documentation:** Deferred FKs are clearly documented, not invisible bugs
- **Auditability:** CUSTOM_SQL_REGISTRY.json provides a searchable audit trail
- **Type safety preserved:** Drizzle schema remains valid TypeScript
- **Database integrity maintained:** FKs exist at database level (where it matters)
- **Developer onboarding:** CIRCULAR_FKs.md explains "why is this FK missing?"

### ⚠️ Considerations

- **Manual migration step:** Developer must append SQL after `drizzle-kit generate`
- **Registry maintenance:** CUSTOM_SQL_REGISTRY.json must be updated when migration is applied
- **Code comment discipline:** Developers must add inline comments for deferred FKs

### ❌ Risks (Mitigated)

- **Risk:** Developer forgets to add custom SQL → FK missing in database
  - **Mitigation:** CUSTOM_SQL_REGISTRY.json tracks "pending" status → CI check can enforce

- **Risk:** Migration applied but registry not updated
  - **Mitigation:** Code review checklist + CI validation script

## Alternatives Considered

### 1. Use nullable FKs with post-creation UPDATE
```sql
CREATE TABLE departments (...);
CREATE TABLE employees (...);
ALTER TABLE departments ADD CONSTRAINT fk_... FOREIGN KEY ...;
```
**Rejected:** This is exactly what we're doing (deferred FK creation). Nullable columns would break business logic.

### 2. Merge tables into single file to avoid import order issues
**Rejected:** Violates [ADR-001](ADR-001-domain-file-split.md) rationale. Circular FKs are a technical constraint, not a reason to compromise domain organization.

### 3. Use string-based FK definitions (Drizzle experimental)
**Rejected:** Not stable in Drizzle v0.34. Would lose type safety.

### 4. Split HR into separate pgSchemas
**Deferred:** Possible future enhancement (payroll schema, recruitment schema, etc.) but introduces cross-schema FK complexity.

## Examples

### CIRC-001: Department Manager

**Deferred FK:**
```sql
ALTER TABLE hr.departments
  ADD CONSTRAINT fk_departments_manager
  FOREIGN KEY (tenant_id, manager_id)
  REFERENCES hr.employees(tenant_id, id);
```

**Why needed:**
- Departments have managers (employees)
- Employees belong to departments
- Bi-directional relationship

**Registry entry:**
```json
{
  "csqlId": "CSQL-001",
  "circularFkRef": "CIRC-001",
  "tables": ["hr.departments", "hr.employees"],
  "status": "pending"
}
```

## References

- Circular FK catalog: [CIRCULAR_FKS.md](CIRCULAR_FKS.md)
- Custom SQL registry: [CUSTOM_SQL_REGISTRY.json](CUSTOM_SQL_REGISTRY.json)
- Domain split rationale: [ADR-001](ADR-001-domain-file-split.md)
- Schema governance: [SCHEMA_LOCKDOWN.md](SCHEMA_LOCKDOWN.md)
