/**
 * Pure key helpers for R2/S3 object layout (no I/O).
 * Convention: `{prefix?}/{tenantId}/{domain}/{kind}/{objectId}` with safe segments.
 */

import { z } from "zod/v4";

const UNSAFE = /[^a-zA-Z0-9._-]+/g;

/**
 * Single path segment: trim, lowercase optional, replace unsafe chars.
 */
export function sanitizeKeySegment(segment: string, opts?: { lowerCase?: boolean }): string {
  let s = segment.trim();
  if (opts?.lowerCase) s = s.toLowerCase();
  return s.replace(UNSAFE, "_").replace(/_+/g, "_").replace(/^_|_$/g, "") || "_";
}

/**
 * Join non-empty segments with `/` (no leading slash unless first segment has one).
 */
export function joinObjectKey(...segments: string[]): string {
  return segments.filter(Boolean).join("/");
}

const normalizeRepoPrefix = (prefix: string | undefined) =>
  prefix?.trim() ? prefix.replace(/^\/+|\/+$/g, "") : "";

/**
 * Logical key (`tenant/...`) or already-prefixed list/delete key (`prod/tenant/...`) → full S3 object key.
 */
export function resolveFullObjectKey(repoPrefix: string | undefined, key: string): string {
  const keyPrefix = normalizeRepoPrefix(repoPrefix);
  const k = key.replace(/^\/+/, "");
  if (!keyPrefix) return k;
  const p = `${keyPrefix}/`;
  if (k === keyPrefix || k.startsWith(p)) return k;
  return joinObjectKey(keyPrefix, k);
}

/**
 * Prefix for ListObjectsV2 (trim slashes; combine with repo prefix).
 */
export function resolveListPrefix(repoPrefix: string | undefined, prefix: string): string {
  const trimmed = prefix.replace(/^\/+/, "").replace(/\/+$/g, "");
  return resolveFullObjectKey(repoPrefix, trimmed);
}

/**
 * Typical multi-tenant object key for app blobs (uploads, exports, HR attachments).
 */
export function tenantObjectKey(params: {
  tenantId: string | number;
  domain: string;
  kind: string;
  objectId: string;
  prefix?: string;
}): string {
  const core = joinObjectKey(
    sanitizeKeySegment(String(params.tenantId)),
    sanitizeKeySegment(params.domain, { lowerCase: true }),
    sanitizeKeySegment(params.kind, { lowerCase: true }),
    sanitizeKeySegment(params.objectId)
  );
  return params.prefix ? joinObjectKey(sanitizeKeySegment(params.prefix), core) : core;
}

/**
 * Immutable-style version suffix: `{baseKey}/v{version}`.
 * Prefer new keys per version for auditability (see ADR-object-versioning.md).
 */
export function versionedObjectKey(params: { baseKey: string; version: number | string }): string {
  const v = sanitizeKeySegment(String(params.version));
  return joinObjectKey(params.baseKey.replace(/^\/+|\/+$/g, ""), `v${v}`);
}

/**
 * Cold-archive style key (replaces sales-only hardcoding in legacy archival paths).
 */
export function coldArchiveKey(params: {
  dataset: string;
  period: string;
  fileName: string;
}): string {
  const period = sanitizeKeySegment(params.period);
  const year = period.slice(0, 4) || "unknown";
  return joinObjectKey(
    sanitizeKeySegment(params.dataset, { lowerCase: true }),
    year,
    sanitizeKeySegment(params.fileName)
  );
}

/** Allowed characters per path segment (after sanitization). */
const SEGMENT = String.raw`[a-zA-Z0-9._-]+`;

/**
 * Validates application `storage_key` values: at least 3 `/`-separated segments, safe characters only.
 * Covers tenant layout (4+ segments) and cold-archive layout (3 segments).
 */
export const applicationStorageKeySchema = z
  .string()
  .min(3)
  .max(1024)
  .regex(
    new RegExp(`^${SEGMENT}(?:/${SEGMENT}){2,}$`),
    "storage_key must be dot-segment paths using [a-zA-Z0-9._-] only (min 3 segments)"
  );

/** Plan / ADR alias for {@link applicationStorageKeySchema}. */
export const storageKeySchema = applicationStorageKeySchema;

export type ParsedTenantStyleObjectKey = {
  /** Present when key was built with optional prefix in tenantObjectKey. */
  prefix?: string;
  tenantId: string;
  domain: string;
  kind: string;
  objectId: string;
};

/**
 * Best-effort parse for keys produced by `tenantObjectKey` (with or without single prefix segment).
 * Does not validate against `applicationStorageKeySchema` — call validation separately if needed.
 */
export function parseTenantStyleObjectKey(key: string): ParsedTenantStyleObjectKey | null {
  const trimmed = key.replace(/^\/+|\/+$/g, "");
  const parts = trimmed.split("/").filter(Boolean);
  if (parts.length < 4) return null;

  if (parts.length === 4) {
    return {
      tenantId: parts[0]!,
      domain: parts[1]!,
      kind: parts[2]!,
      objectId: parts[3]!,
    };
  }

  const prefix = parts[0];
  const tenantId = parts[1]!;
  const domain = parts[2]!;
  const kind = parts[3]!;
  const objectId = parts.slice(4).join("/");
  return { prefix, tenantId, domain, kind, objectId };
}

/**
 * Alias for {@link parseTenantStyleObjectKey}. Tenant-style keys only; cold-archive keys return `null`.
 */
export function parseObjectKey(key: string): ParsedTenantStyleObjectKey | null {
  return parseTenantStyleObjectKey(key);
}
