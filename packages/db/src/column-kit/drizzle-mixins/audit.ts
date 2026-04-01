import type { AnyPgColumn } from "drizzle-orm/pg-core";
import { integer } from "drizzle-orm/pg-core";

/**
 * Audit actor columns (`created_by`, `updated_by`) as non-null integers FK to `security.users.userId`.
 * Pass the users PK column (e.g. `() => users.userId`) so column-kit stays free of schema imports.
 * Aligns with `AUDIT_FINGERPRINTS.references: "security.users.userId"`.
 */
export function auditColumns(userIdRef: () => AnyPgColumn) {
  return {
    createdBy: integer("created_by").notNull().references(userIdRef),
    updatedBy: integer("updated_by").notNull().references(userIdRef),
  } as const;
}
