/**
 * HTTP header names used to build {@link SessionContext} for `withTenantContext`.
 *
 * **Trust boundary:** These values must be set by **platform middleware** after tenant resolution
 * and authentication — not copied from arbitrary client input. See `README.md`.
 */
export const TENANT_CONTEXT_HEADERS = {
  tenantId: "x-tenant-id",
  userId: "x-user-id",
  actorType: "x-actor-type",
  correlationId: "x-correlation-id",
  requestId: "x-request-id",
  sessionId: "x-session-id",
} as const;
