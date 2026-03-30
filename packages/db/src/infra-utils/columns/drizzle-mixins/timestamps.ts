import { timestamp } from "drizzle-orm/pg-core";

export const timestampColumns = {
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
} as const;

export const softDeleteColumns = {
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
} as const;

export const appendOnlyTimestampColumns = {
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
} as const;
