import { integer } from "drizzle-orm/pg-core";

export const auditColumns = {
  createdBy: integer("created_by").notNull(),
  updatedBy: integer("updated_by").notNull(),
} as const;
