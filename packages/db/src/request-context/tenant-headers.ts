import type { SessionContext } from "../pg-session/index.js";

import { TENANT_CONTEXT_HEADERS } from "./header-names.js";

function parsePositiveIntHeader(raw: string | null): number | undefined {
  if (raw == null) return undefined;
  const trimmed = raw.trim();
  if (trimmed === "") return undefined;
  const n = Number.parseInt(trimmed, 10);
  if (!Number.isFinite(n) || !Number.isInteger(n) || n < 1) return undefined;
  return n;
}

function parseOptionalStringHeader(raw: string | null): string | undefined {
  if (raw == null) return undefined;
  const v = raw.trim();
  return v === "" ? undefined : v;
}

function parseActorType(headers: Headers, hasUserId: boolean): SessionContext["actorType"] {
  const raw = parseOptionalStringHeader(headers.get(TENANT_CONTEXT_HEADERS.actorType))?.toLowerCase();
  if (raw === "user" || raw === "service_principal" || raw === "system") {
    return raw;
  }
  return hasUserId ? "user" : "system";
}

/**
 * Builds a {@link SessionContext} from **trusted** request headers (typically set by middleware).
 *
 * Returns `null` when `x-tenant-id` is missing or not a positive integer (aligned with
 * `setSessionContext` / `pg-session` validation).
 *
 * **Security:** Do not treat browser-supplied headers as authoritative. Resolve tenant and user in
 * middleware (e.g. from session/JWT + domain map), then set these headers on the internal request.
 */
export function getTenantContextFromHeaders(headers: Headers): SessionContext | null {
  const tenantId = parsePositiveIntHeader(headers.get(TENANT_CONTEXT_HEADERS.tenantId));
  if (tenantId === undefined) return null;

  const userId = parsePositiveIntHeader(headers.get(TENANT_CONTEXT_HEADERS.userId));

  const correlationId = parseOptionalStringHeader(headers.get(TENANT_CONTEXT_HEADERS.correlationId));
  const requestId = parseOptionalStringHeader(headers.get(TENANT_CONTEXT_HEADERS.requestId));
  const sessionId = parseOptionalStringHeader(headers.get(TENANT_CONTEXT_HEADERS.sessionId));

  const hasUserId = userId !== undefined;

  return {
    tenantId,
    userId,
    actorType: parseActorType(headers, hasUserId),
    ...(correlationId !== undefined ? { correlationId } : {}),
    ...(requestId !== undefined ? { requestId } : {}),
    ...(sessionId !== undefined ? { sessionId } : {}),
  };
}

/**
 * Same as {@link getTenantContextFromHeaders}, but throws if tenant context is missing or invalid.
 */
export function requireTenantContextFromHeaders(headers: Headers): SessionContext {
  const ctx = getTenantContextFromHeaders(headers);
  if (ctx === null) {
    throw new Error(
      `Missing or invalid ${TENANT_CONTEXT_HEADERS.tenantId}: expected a positive integer tenant id`
    );
  }
  return ctx;
}
