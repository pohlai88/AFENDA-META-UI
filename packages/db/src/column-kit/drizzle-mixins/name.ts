import { varchar } from "drizzle-orm/pg-core";

/** Canonical display `name` — matches `NAME_FINGERPRINTS.name` (`maxLength: 255`). */
export const nameColumn = {
  name: varchar("name", { length: 255 }).notNull(),
} as const;
