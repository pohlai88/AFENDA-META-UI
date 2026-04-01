-- =============================================================================
-- DOMAIN EVENT PRIMITIVES (required before truth-compiler emit functions)
-- =============================================================================
-- Referenced by generated trigger bodies in this bundle. Not yet modeled in
-- the compiler pipeline; keep in sync with sales.domain_event_logs.

CREATE OR REPLACE FUNCTION sales.current_actor_id()
RETURNS integer
LANGUAGE sql
STABLE
AS $$
  SELECT COALESCE(NULLIF(current_setting('afenda.user_id', true), '')::integer, 0);
$$;

CREATE OR REPLACE FUNCTION sales.emit_domain_event(
  p_event_type sales.domain_event_type,
  p_entity_type text,
  p_tenant_id integer,
  p_entity_id uuid,
  p_payload jsonb,
  p_triggered_by integer
)
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
  actor_id integer;
BEGIN
  actor_id := COALESCE(p_triggered_by, 0);

  INSERT INTO sales.domain_event_logs (
    tenant_id,
    event_type,
    entity_type,
    entity_id,
    payload,
    triggered_by,
    created_by,
    updated_by
  ) VALUES (
    p_tenant_id,
    p_event_type,
    p_entity_type,
    p_entity_id,
    COALESCE(p_payload, '{}'::jsonb),
    NULLIF(actor_id, 0),
    actor_id,
    actor_id
  );
END;
$$;
