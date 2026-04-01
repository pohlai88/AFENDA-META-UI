// ============================================================================
// SECURITY DOMAIN — Schema namespace
// Shared `pgSchema("security")` for RBAC tables (users, roles, permissions, junctions).
// ============================================================================
import { pgSchema } from "drizzle-orm/pg-core";

export const securitySchema = pgSchema("security");

/** PostgreSQL identifier for tenant FK on `security.*` tables (canonical snake_case; aligns with current DB migrations). */
export const securityTenantSqlColumn = "tenant_id" as const;
