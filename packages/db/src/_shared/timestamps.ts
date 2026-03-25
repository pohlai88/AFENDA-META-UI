import { timestamp } from "drizzle-orm/pg-core";

export const timestampColumns = {
  createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
} as const;

export const softDeleteColumns = {
  deletedAt: timestamp({ withTimezone: true }),
} as const;

export const appendOnlyTimestampColumns = {
  createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
} as const;

export const TIMESTAMP_FINGERPRINTS = {
  createdAt: "timestamp:withTimezone:notNull:defaultNow",
  updatedAt: "timestamp:withTimezone:notNull:defaultNow",
  deletedAt: "timestamp:withTimezone:nullable",
} as const;