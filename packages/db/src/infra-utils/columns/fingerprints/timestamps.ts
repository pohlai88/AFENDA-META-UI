export const TIMESTAMP_FINGERPRINTS = {
  createdAt: "timestamp:withTimezone:notNull:defaultNow",
  updatedAt: "timestamp:withTimezone:notNull:defaultNow",
  deletedAt: "timestamp:withTimezone:nullable",
} as const;
