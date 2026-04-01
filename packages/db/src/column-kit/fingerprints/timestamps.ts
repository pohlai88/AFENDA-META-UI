export interface TimestampFingerprint {
  readonly kind: "timestamp";
  readonly timezone: boolean;
  readonly notNull: boolean;
  readonly defaultNow: boolean;
}

export const TIMESTAMP_FINGERPRINTS = {
  createdAt: {
    kind: "timestamp",
    timezone: true,
    notNull: true,
    defaultNow: true,
  },
  updatedAt: {
    kind: "timestamp",
    timezone: true,
    notNull: true,
    defaultNow: true,
  },
  deletedAt: {
    kind: "timestamp",
    timezone: true,
    notNull: false,
    defaultNow: false,
  },
} as const satisfies Record<string, TimestampFingerprint>;
