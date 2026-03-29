-- Migration: Add Circular Foreign Key Constraints
-- Generated: 2024
-- Purpose: Apply deferred FK constraints from CUSTOM_SQL_REGISTRY.json
-- Status: Implements CSQL-001 and CSQL-002

-- ============================================================================
-- CSQL-001: departments.managerId → employees.id
-- ============================================================================
-- This FK creates a circular dependency:
-- departments → employees (via managerId)
-- employees → departments (via departmentId)
-- 
-- Solution: Add FK with DEFERRABLE INITIALLY DEFERRED to allow insertion order flexibility

ALTER TABLE hr.departments
ADD CONSTRAINT fk_departments_manager_id
FOREIGN KEY (tenant_id, manager_id)
REFERENCES hr.employees(tenant_id, id)
DEFERRABLE INITIALLY DEFERRED;

-- ============================================================================
-- CSQL-002: departments.costCenterId → costCenters.id  
-- ============================================================================
-- This FK creates a circular dependency:
-- departments → cost_centers (via costCenterId)
-- cost_centers → departments (via managerId indirectly through employees)
--
-- Solution: Add FK with DEFERRABLE INITIALLY DEFERRED

ALTER TABLE hr.departments
ADD CONSTRAINT fk_departments_cost_center_id
FOREIGN KEY (tenant_id, cost_center_id)
REFERENCES hr.cost_centers(tenant_id, id)
DEFERRABLE INITIALLY DEFERRED;

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================
-- Run these queries to verify the constraints were added successfully:

-- Check departments constraints
SELECT 
    conname AS constraint_name,
    contype AS constraint_type,
    pg_get_constraintdef(oid) AS definition
FROM pg_constraint
WHERE conrelid = 'hr.departments'::regclass
    AND conname IN ('fk_departments_manager_id', 'fk_departments_cost_center_id');

-- ============================================================================
-- ROLLBACK SCRIPT (if needed)
-- ============================================================================
-- ALTER TABLE hr.departments DROP CONSTRAINT IF EXISTS fk_departments_manager_id;
-- ALTER TABLE hr.departments DROP CONSTRAINT IF EXISTS fk_departments_cost_center_id;
