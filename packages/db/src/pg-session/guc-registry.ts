/**
 * Custom PostgreSQL session variables used for RLS, audit, and request tracing.
 * Set via `set_config(name, value, true)` (transaction-local / SET LOCAL semantics).
 * Read in SQL with `current_setting(name, true)` — missing_ok `true` matches empty/unset handling in policies.
 *
 * @see https://www.postgresql.org/docs/current/functions-admin.html#FUNCTIONS-ADMIN-SET
 */
export const AFENDA_SESSION_GUCS = {
  tenantId: "afenda.tenant_id",
  userId: "afenda.user_id",
  actorType: "afenda.actor_type",
  correlationId: "afenda.correlation_id",
  requestId: "afenda.request_id",
  sessionId: "afenda.session_id",
  ipAddress: "afenda.ip_address",
  userAgent: "afenda.user_agent",
} as const;

export type AfendaSessionGucName = (typeof AFENDA_SESSION_GUCS)[keyof typeof AFENDA_SESSION_GUCS];
