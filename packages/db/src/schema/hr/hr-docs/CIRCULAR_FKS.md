# Circular Foreign Keys — HR Schema

> Tracks FK relationships that **cannot** be declared in Drizzle due to definition-order
> circular dependencies. These must be added via custom SQL in migrations.

## Why This Matters

In Drizzle ORM, table definitions reference other table objects. When table A references
table B and table B references table A, one of those FKs can't be declared in the schema
because the referenced table symbol isn't yet in scope.

These "deferred" FKs are intentionally omitted from the Drizzle schema and must be added
via `ALTER TABLE` in a migration. They are **NOT bugs** — they are documented design
decisions.

---

## Deferred Foreign Keys

### CIRC-001: `departments.managerId` → `employees.id`

| Field       | Value                                                                     |
| ----------- | ------------------------------------------------------------------------- |
| **Source**  | `hr.departments.manager_id`                                               |
| **Target**  | `hr.employees.id`                                                         |
| **File**    | `people.ts` (departments defined at line ~40, employees at line ~155)     |
| **Reason**  | departments is defined before employees; cannot reference employees table |
| **Reverse** | `employees.departmentId` → `departments.id` (declared as composite FK)    |

**Custom SQL to add:**

```sql
ALTER TABLE hr.departments
  ADD CONSTRAINT fk_departments_manager
  FOREIGN KEY (tenant_id, manager_id)
  REFERENCES hr.employees(tenant_id, id);
```

**Note:** This should be a composite FK including `tenant_id` per SCHEMA_LOCKDOWN policy.

---

### CIRC-002: `departments.costCenterId` → `costCenters.id`

| Field       | Value                                                                         |
| ----------- | ----------------------------------------------------------------------------- |
| **Source**  | `hr.departments.cost_center_id`                                               |
| **Target**  | `hr.cost_centers.id`                                                          |
| **File**    | `people.ts` (departments at line ~40, costCenters at line ~240)               |
| **Reason**  | departments is defined before costCenters; cannot reference costCenters table |
| **Reverse** | N/A (costCenters does not reference departments)                              |

**Custom SQL to add:**

```sql
ALTER TABLE hr.departments
  ADD CONSTRAINT fk_departments_cost_center
  FOREIGN KEY (tenant_id, cost_center_id)
  REFERENCES hr.cost_centers(tenant_id, id);
```

---

## Self-References (NOT circular — handled inline)

These are self-referencing FKs within the same table. Drizzle handles them fine via
`foreignKey({ columns: [table.col], foreignColumns: [table.id] })`.

| Table          | Column                | Pattern           |
| -------------- | --------------------- | ----------------- |
| `departments`  | `parentDepartmentId`  | Hierarchy tree    |
| `jobPositions` | `reportsToPositionId` | Reporting chain   |
| `employees`    | `managerId`           | Manager hierarchy |
| `costCenters`  | `parentCostCenterId`  | Hierarchy tree    |

---

## New Circular FKs (Phase 4 Upgrade)

No new circular foreign keys were introduced during the Phase 4 upgrade. All new tables (benefits.ts, learning.ts, payroll.ts enhancements, recruitment.ts enhancements) were designed to avoid circular dependencies by:

- Using reference tables for shared data
- Maintaining clear dependency hierarchy
- Avoiding bidirectional references between new tables

---

## Adding a New Circular FK

1. Document it here with a `CIRC-XXX` identifier
2. Add the `ALTER TABLE` SQL to the next migration
3. Register in `CUSTOM_SQL_REGISTRY.json` with the CIRC reference
4. Add a code comment in the table definition:
   ```ts
   managerId: uuid("manager_id"), // FK deferred — see CIRCULAR_FKS.md CIRC-001
   ```
