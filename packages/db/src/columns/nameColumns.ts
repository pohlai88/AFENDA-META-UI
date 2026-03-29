import { text } from "drizzle-orm/pg-core";

export const nameColumn = {
  name: text().notNull(),
} as const;

export const NAME_FINGERPRINTS = {
  name: "text:notNull",
} as const;
