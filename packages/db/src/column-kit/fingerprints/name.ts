export interface TextColumnFingerprint {
  readonly kind: "text";
  readonly notNull: boolean;
  /** When set, governance expects a bounded length (e.g. varchar). */
  readonly maxLength?: number;
  /** When `true`, the declared column must be unique. */
  readonly unique?: boolean;
}

export const NAME_FINGERPRINTS = {
  /** Display name; Drizzle `varchar("name", { length: 255 }).notNull()`. */
  name: { kind: "text", notNull: true, maxLength: 255 },
} as const satisfies Record<string, TextColumnFingerprint>;
