export interface IntegerColumnFingerprint {
  readonly kind: "integer";
  readonly notNull: boolean;
  /** Expected FK target when governance enforces referential shape (canonical: `schema.table.column`). */
  readonly references?: string;
}

export const AUDIT_FINGERPRINTS = {
  createdBy: { kind: "integer", notNull: true, references: "security.users.userId" },
  updatedBy: { kind: "integer", notNull: true, references: "security.users.userId" },
} as const satisfies Record<string, IntegerColumnFingerprint>;
