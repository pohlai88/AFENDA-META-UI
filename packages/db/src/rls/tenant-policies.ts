import { sql } from "drizzle-orm";
import { pgPolicy, pgRole } from "drizzle-orm/pg-core";

export const appUserRole = pgRole("app_user").existing();

export const serviceRole = pgRole("service_role").existing();

export const tenantIsolationCheck = () =>
  sql`"tenant_id" = NULLIF(current_setting('afenda.tenant_id', true), '')::int`;

export const tenantSelectPolicy = (tableName: string) =>
  pgPolicy(`${tableName}_tenant_select`, {
    as: "permissive",
    for: "select",
    to: appUserRole,
    using: tenantIsolationCheck(),
  });

export const tenantInsertPolicy = (tableName: string) =>
  pgPolicy(`${tableName}_tenant_insert`, {
    as: "permissive",
    for: "insert",
    to: appUserRole,
    withCheck: tenantIsolationCheck(),
  });

export const tenantUpdatePolicy = (tableName: string) =>
  pgPolicy(`${tableName}_tenant_update`, {
    as: "permissive",
    for: "update",
    to: appUserRole,
    using: tenantIsolationCheck(),
    withCheck: tenantIsolationCheck(),
  });

export const tenantDeletePolicy = (tableName: string) =>
  pgPolicy(`${tableName}_tenant_delete`, {
    as: "permissive",
    for: "delete",
    to: appUserRole,
    using: tenantIsolationCheck(),
  });

export function tenantIsolationPolicies(tableName: string) {
  return [
    tenantSelectPolicy(tableName),
    tenantInsertPolicy(tableName),
    tenantUpdatePolicy(tableName),
    tenantDeletePolicy(tableName),
  ];
}

export const serviceBypassPolicy = (tableName: string) =>
  pgPolicy(`${tableName}_service_bypass`, {
    as: "permissive",
    for: "all",
    to: serviceRole,
    using: sql`true`,
    withCheck: sql`true`,
  });
