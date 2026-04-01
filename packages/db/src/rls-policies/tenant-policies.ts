import { sql, type SQL } from "drizzle-orm";
import { pgPolicy, pgRole } from "drizzle-orm/pg-core";

import { AFENDA_SESSION_GUCS } from "../pg-session/guc-registry.js";

/**
 * Default physical tenant FK column on RLS-protected tables (SQL identifier).
 * Most domains use `tenant_id`; `security.*` historically uses `"tenantId"` (pass explicitly).
 */
export const TENANT_SCOPED_COLUMN = "tenant_id" as const;

export const appUserRole = pgRole("app_user").existing();

export const serviceRole = pgRole("service_role").existing();

/**
 * Predicate: row tenant column matches the session GUC set by {@link setSessionContext} /
 * {@link withTenantContext}. Uses `current_setting(..., true)` so missing GUC does not error
 * (returns NULL; row does not match).
 *
 * @param tenantColumn - Quoted SQL identifier for the tenant FK column (default `tenant_id`).
 *
 * @see https://www.postgresql.org/docs/current/ddl-rowsecurity.html — Row Security Policies
 * @see https://www.postgresql.org/docs/current/functions-admin.html#FUNCTIONS-ADMIN-SET — `current_setting`
 */
export const tenantIsolationCheck = (tenantColumn: string = TENANT_SCOPED_COLUMN): SQL => {
  const guc = AFENDA_SESSION_GUCS.tenantId;
  return sql`${sql.raw(`"${tenantColumn}"`)} = NULLIF(current_setting(${sql.raw(`'${guc}'`)}, true), '')::int`;
};

export const tenantSelectPolicy = (tableName: string, tenantColumn: string = TENANT_SCOPED_COLUMN) =>
  pgPolicy(`${tableName}_tenant_select`, {
    as: "permissive",
    for: "select",
    to: appUserRole,
    using: tenantIsolationCheck(tenantColumn),
  });

export const tenantInsertPolicy = (tableName: string, tenantColumn: string = TENANT_SCOPED_COLUMN) =>
  pgPolicy(`${tableName}_tenant_insert`, {
    as: "permissive",
    for: "insert",
    to: appUserRole,
    withCheck: tenantIsolationCheck(tenantColumn),
  });

export const tenantUpdatePolicy = (tableName: string, tenantColumn: string = TENANT_SCOPED_COLUMN) =>
  pgPolicy(`${tableName}_tenant_update`, {
    as: "permissive",
    for: "update",
    to: appUserRole,
    using: tenantIsolationCheck(tenantColumn),
    withCheck: tenantIsolationCheck(tenantColumn),
  });

export const tenantDeletePolicy = (tableName: string, tenantColumn: string = TENANT_SCOPED_COLUMN) =>
  pgPolicy(`${tableName}_tenant_delete`, {
    as: "permissive",
    for: "delete",
    to: appUserRole,
    using: tenantIsolationCheck(tenantColumn),
  });

/** Standard pack: SELECT / INSERT / UPDATE / DELETE for `app_user` with tenant isolation. */
export function tenantIsolationPolicies(
  tableName: string,
  tenantColumn: string = TENANT_SCOPED_COLUMN
) {
  return [
    tenantSelectPolicy(tableName, tenantColumn),
    tenantInsertPolicy(tableName, tenantColumn),
    tenantUpdatePolicy(tableName, tenantColumn),
    tenantDeletePolicy(tableName, tenantColumn),
  ];
}

/**
 * Unrestricted access for `service_role` (migrations, batch jobs, admin tools). Add **after** tenant policies.
 */
export const serviceBypassPolicy = (tableName: string) =>
  pgPolicy(`${tableName}_service_bypass`, {
    as: "permissive",
    for: "all",
    to: serviceRole,
    using: sql`true`,
    withCheck: sql`true`,
  });
