import type { IntegerColumnFingerprint } from "./audit.js";
import { AUDIT_FINGERPRINTS } from "./audit.js";
import type { TextColumnFingerprint } from "./name.js";
import { NAME_FINGERPRINTS } from "./name.js";
import type { TimestampFingerprint } from "./timestamps.js";
import { TIMESTAMP_FINGERPRINTS } from "./timestamps.js";

export type { IntegerColumnFingerprint, TextColumnFingerprint, TimestampFingerprint };

/** Union of values in `ALL_SHARED_FINGERPRINTS` (lifecycle + audit mixins). */
export type SharedColumnFingerprint = TimestampFingerprint | IntegerColumnFingerprint;

/** All mixin fingerprints including `name` — use for shape checks beyond mandatory shared coverage. */
export type ColumnKitFingerprint = SharedColumnFingerprint | TextColumnFingerprint;

export const ALL_SHARED_FINGERPRINTS = {
  createdAt: TIMESTAMP_FINGERPRINTS.createdAt,
  updatedAt: TIMESTAMP_FINGERPRINTS.updatedAt,
  deletedAt: TIMESTAMP_FINGERPRINTS.deletedAt,
  createdBy: AUDIT_FINGERPRINTS.createdBy,
  updatedBy: AUDIT_FINGERPRINTS.updatedBy,
} as const;

/**
 * Unified catalog for column-kit mixin shapes (timestamps, audit, name).
 * Does not change `MANDATORY_SHARED_COLUMNS` / coverage naming rules — only shape evaluation.
 */
export const COLUMN_KIT_FINGERPRINTS = {
  ...ALL_SHARED_FINGERPRINTS,
  ...NAME_FINGERPRINTS,
} as const;

export type ColumnKitColumnName = keyof typeof COLUMN_KIT_FINGERPRINTS;

export const MANDATORY_SHARED_COLUMNS = ["createdAt", "updatedAt"] as const;

export const RECOMMENDED_SHARED_COLUMNS = ["deletedAt", "createdBy", "updatedBy"] as const;
