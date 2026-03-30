import { AUDIT_FINGERPRINTS } from "./audit.js";
import { TIMESTAMP_FINGERPRINTS } from "./timestamps.js";

export const ALL_SHARED_FINGERPRINTS = {
  createdAt: TIMESTAMP_FINGERPRINTS.createdAt,
  updatedAt: TIMESTAMP_FINGERPRINTS.updatedAt,
  deletedAt: TIMESTAMP_FINGERPRINTS.deletedAt,
  createdBy: AUDIT_FINGERPRINTS.createdBy,
  updatedBy: AUDIT_FINGERPRINTS.updatedBy,
} as const;

export const MANDATORY_SHARED_COLUMNS = ["createdAt", "updatedAt"] as const;

export const RECOMMENDED_SHARED_COLUMNS = ["deletedAt", "createdBy", "updatedBy"] as const;
