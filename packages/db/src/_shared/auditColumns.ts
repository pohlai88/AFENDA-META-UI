import { integer } from "drizzle-orm/pg-core";

export const auditColumns = {
  createdBy: integer().notNull(),
  updatedBy: integer().notNull(),
} as const;

export const AUDIT_FINGERPRINTS = {
  createdBy: "integer:notNull",
  updatedBy: "integer:notNull",
} as const;
