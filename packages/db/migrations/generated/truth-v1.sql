-- =============================================================================
-- TRUTH COMPILER OUTPUT — AFENDA META ENGINE
-- =============================================================================
-- DO NOT EDIT MANUALLY.
-- Regenerate with: pnpm --filter @afenda/db truth:generate
-- Diff check:      pnpm --filter @afenda/db truth:check
-- =============================================================================
-- Generated at: 2026-03-27T07:38:22.832Z

-- Invariant: sales.consignment_agreement.active_has_partner | severity=error | scope=entity
ALTER TABLE "sales"."consignment_agreements"
  DROP CONSTRAINT IF EXISTS "chk_inv_sales_consignment_agreement_active_has_partner";
ALTER TABLE "sales"."consignment_agreements"
  ADD CONSTRAINT "chk_inv_sales_consignment_agreement_active_has_partner"
  CHECK (("status" <> 'active' OR "partner_id" IS NOT NULL));
-- Invariant: sales.sales_order.confirmed_amount_positive | severity=fatal | scope=entity
ALTER TABLE "sales"."sales_orders"
  DROP CONSTRAINT IF EXISTS "chk_inv_sales_sales_order_confirmed_amount_positive";
ALTER TABLE "sales"."sales_orders"
  ADD CONSTRAINT "chk_inv_sales_sales_order_confirmed_amount_positive"
  CHECK (("status" <> 'sale' OR "amount_total" > 0));
-- Event contract: consignment_agreement (3 registered types)
--   • consignment_agreement.activated
--   • consignment_agreement.expired
--   • consignment_agreement.terminated
CREATE OR REPLACE FUNCTION "sales"."emit_consignment_agreement_event"()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  actor_id integer;
  event_payload jsonb;
BEGIN
  actor_id := "sales"."current_actor_id"();

  IF TG_OP = 'DELETE' THEN
    event_payload := jsonb_build_object('operation', TG_OP, 'truth_event_contract', jsonb_build_array('consignment_agreement.activated', 'consignment_agreement.expired', 'consignment_agreement.terminated'), 'state_field', 'status', 'state_value', OLD."status");
    PERFORM "sales"."emit_domain_event"(
      'CONSIGNMENT_AGREEMENT_DELETED',
      'consignment_agreement',
      OLD."tenant_id",
      OLD."id",
      event_payload,
      actor_id
    );
    RETURN OLD;
  END IF;

  event_payload := jsonb_build_object('operation', TG_OP, 'truth_event_contract', jsonb_build_array('consignment_agreement.activated', 'consignment_agreement.expired', 'consignment_agreement.terminated'), 'state_field', 'status', 'state_value', NEW."status");
  PERFORM "sales"."emit_domain_event"(
    'CONSIGNMENT_AGREEMENT_MUTATED',
    'consignment_agreement',
    NEW."tenant_id",
    NEW."id",
    event_payload,
    actor_id
  );
  RETURN NEW;
END;
$$;
-- State machine: consignment_agreement | field: status
CREATE OR REPLACE FUNCTION "sales"."enforce_consignment_agreement_status_transition"()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  allowed text[];
BEGIN
  -- No-op when the state field does not actually change
  IF OLD."status" IS NOT DISTINCT FROM NEW."status" THEN
    RETURN NEW;
  END IF;

  CASE OLD."status"
    WHEN 'draft' THEN allowed := ARRAY['active', 'terminated'];
    WHEN 'active' THEN allowed := ARRAY['expired', 'terminated'];
    WHEN 'expired' THEN allowed := ARRAY[]::text[];
    WHEN 'terminated' THEN allowed := ARRAY[]::text[];
    ELSE allowed := ARRAY[]::text[];
  END CASE;

  IF NOT (NEW."status" = ANY(allowed)) THEN
    RAISE EXCEPTION
      'invalid_transition [consignment_agreement]: % -> %',
      OLD."status", NEW."status"
      USING ERRCODE = 'check_violation';
  END IF;

  RETURN NEW;
END;
$$;
-- Event contract: sales_order (3 registered types)
--   • sales_order.cancelled
--   • sales_order.confirmed
--   • sales_order.submitted
CREATE OR REPLACE FUNCTION "sales"."emit_sales_order_event"()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  actor_id integer;
  event_payload jsonb;
BEGIN
  actor_id := "sales"."current_actor_id"();

  IF TG_OP = 'DELETE' THEN
    event_payload := jsonb_build_object('operation', TG_OP, 'truth_event_contract', jsonb_build_array('sales_order.cancelled', 'sales_order.confirmed', 'sales_order.submitted'), 'state_field', 'status', 'state_value', OLD."status");
    PERFORM "sales"."emit_domain_event"(
      'ORDER_DELETED',
      'sales_order',
      OLD."tenant_id",
      OLD."id",
      event_payload,
      actor_id
    );
    RETURN OLD;
  END IF;

  event_payload := jsonb_build_object('operation', TG_OP, 'truth_event_contract', jsonb_build_array('sales_order.cancelled', 'sales_order.confirmed', 'sales_order.submitted'), 'state_field', 'status', 'state_value', NEW."status");
  PERFORM "sales"."emit_domain_event"(
    'ORDER_MUTATED',
    'sales_order',
    NEW."tenant_id",
    NEW."id",
    event_payload,
    actor_id
  );
  RETURN NEW;
END;
$$;
-- State machine: sales_order | field: status
CREATE OR REPLACE FUNCTION "sales"."enforce_sales_order_status_transition"()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  allowed text[];
BEGIN
  -- No-op when the state field does not actually change
  IF OLD."status" IS NOT DISTINCT FROM NEW."status" THEN
    RETURN NEW;
  END IF;

  CASE OLD."status"
    WHEN 'draft' THEN allowed := ARRAY['sent', 'sale', 'cancel'];
    WHEN 'sent' THEN allowed := ARRAY['sale', 'cancel'];
    WHEN 'sale' THEN allowed := ARRAY['done', 'cancel'];
    WHEN 'done' THEN allowed := ARRAY[]::text[];
    WHEN 'cancel' THEN allowed := ARRAY[]::text[];
    ELSE allowed := ARRAY[]::text[];
  END CASE;

  IF NOT (NEW."status" = ANY(allowed)) THEN
    RAISE EXCEPTION
      'invalid_transition [sales_order]: % -> %',
      OLD."status", NEW."status"
      USING ERRCODE = 'check_violation';
  END IF;

  RETURN NEW;
END;
$$;
-- Event contract: subscription (4 registered types)
--   • subscription.activated
--   • subscription.cancelled
--   • subscription.paused
--   • subscription.renewed
CREATE OR REPLACE FUNCTION "sales"."emit_subscription_event"()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  actor_id integer;
  event_payload jsonb;
BEGIN
  actor_id := "sales"."current_actor_id"();

  IF TG_OP = 'DELETE' THEN
    event_payload := jsonb_build_object('operation', TG_OP, 'truth_event_contract', jsonb_build_array('subscription.activated', 'subscription.cancelled', 'subscription.paused', 'subscription.renewed'), 'state_field', 'status', 'state_value', OLD."status");
    PERFORM "sales"."emit_domain_event"(
      'SUBSCRIPTION_DELETED',
      'subscription',
      OLD."tenant_id",
      OLD."id",
      event_payload,
      actor_id
    );
    RETURN OLD;
  END IF;

  event_payload := jsonb_build_object('operation', TG_OP, 'truth_event_contract', jsonb_build_array('subscription.activated', 'subscription.cancelled', 'subscription.paused', 'subscription.renewed'), 'state_field', 'status', 'state_value', NEW."status");
  PERFORM "sales"."emit_domain_event"(
    'SUBSCRIPTION_MUTATED',
    'subscription',
    NEW."tenant_id",
    NEW."id",
    event_payload,
    actor_id
  );
  RETURN NEW;
END;
$$;
-- State machine: subscription | field: status
CREATE OR REPLACE FUNCTION "sales"."enforce_subscription_status_transition"()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  allowed text[];
BEGIN
  -- No-op when the state field does not actually change
  IF OLD."status" IS NOT DISTINCT FROM NEW."status" THEN
    RETURN NEW;
  END IF;

  CASE OLD."status"
    WHEN 'draft' THEN allowed := ARRAY['active', 'cancelled'];
    WHEN 'active' THEN allowed := ARRAY['paused', 'past_due', 'expired', 'cancelled'];
    WHEN 'paused' THEN allowed := ARRAY['active', 'cancelled'];
    WHEN 'past_due' THEN allowed := ARRAY['active', 'cancelled'];
    WHEN 'cancelled' THEN allowed := ARRAY[]::text[];
    WHEN 'expired' THEN allowed := ARRAY[]::text[];
    ELSE allowed := ARRAY[]::text[];
  END CASE;

  IF NOT (NEW."status" = ANY(allowed)) THEN
    RAISE EXCEPTION
      'invalid_transition [subscription]: % -> %',
      OLD."status", NEW."status"
      USING ERRCODE = 'check_violation';
  END IF;

  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS "enforce_consignment_agreement_status_transition" ON "sales"."consignment_agreements";
CREATE TRIGGER "enforce_consignment_agreement_status_transition"
  BEFORE UPDATE ON "sales"."consignment_agreements"
  FOR EACH ROW EXECUTE FUNCTION "sales"."enforce_consignment_agreement_status_transition"();
DROP TRIGGER IF EXISTS "trg_emit_consignment_agreement_event" ON "sales"."consignment_agreements";
CREATE TRIGGER "trg_emit_consignment_agreement_event"
  AFTER INSERT OR UPDATE OR DELETE ON "sales"."consignment_agreements"
  FOR EACH ROW
  EXECUTE FUNCTION "sales"."emit_consignment_agreement_event"();
DROP TRIGGER IF EXISTS "enforce_sales_order_status_transition" ON "sales"."sales_orders";
CREATE TRIGGER "enforce_sales_order_status_transition"
  BEFORE UPDATE ON "sales"."sales_orders"
  FOR EACH ROW EXECUTE FUNCTION "sales"."enforce_sales_order_status_transition"();
DROP TRIGGER IF EXISTS "trg_emit_sales_order_event" ON "sales"."sales_orders";
CREATE TRIGGER "trg_emit_sales_order_event"
  AFTER INSERT OR UPDATE OR DELETE ON "sales"."sales_orders"
  FOR EACH ROW
  EXECUTE FUNCTION "sales"."emit_sales_order_event"();
DROP TRIGGER IF EXISTS "enforce_subscription_status_transition" ON "sales"."subscriptions";
CREATE TRIGGER "enforce_subscription_status_transition"
  BEFORE UPDATE ON "sales"."subscriptions"
  FOR EACH ROW EXECUTE FUNCTION "sales"."enforce_subscription_status_transition"();
DROP TRIGGER IF EXISTS "trg_emit_subscription_event" ON "sales"."subscriptions";
CREATE TRIGGER "trg_emit_subscription_event"
  AFTER INSERT OR UPDATE OR DELETE ON "sales"."subscriptions"
  FOR EACH ROW
  EXECUTE FUNCTION "sales"."emit_subscription_event"();
