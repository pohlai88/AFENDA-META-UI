-- =============================================================================
-- TRUTH COMPILER OUTPUT — AFENDA META ENGINE
-- =============================================================================
-- DO NOT EDIT MANUALLY.
-- Regenerate with: pnpm --filter @afenda/db truth:generate
-- Diff check:      pnpm --filter @afenda/db truth:check
-- =============================================================================
-- Generated at: 2026-03-31T08:46:57.133Z

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

-- Cross invariant: sales.cross.active_subscription_requires_sale_order | severity=warning | executionKind=trigger | model=sales_order
CREATE OR REPLACE FUNCTION "sales"."enforce_xinv_sales_cross_active_subscription_requires_sale_order_on_sales_order"()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
  IF NOT EXISTS (
    SELECT 1
    FROM (
      SELECT
        OLD."amount_total" AS "amount_total",
        OLD."created_at" AS "created_at",
        OLD."id" AS "id",
        OLD."status" AS "status",
        OLD."tenant_id" AS "tenant_id"
    ) AS "m_sales_order"
    JOIN "sales"."subscriptions" AS "m_subscription"
      ON "m_sales_order"."id" = "m_subscription"."sales_order_id"
    WHERE ("m_subscription"."status" <> 'active' OR "m_sales_order"."status" = 'sale')
  ) THEN
      RAISE WARNING 'Cross invariant sales.cross.active_subscription_requires_sale_order violated during direct mutation of sales_order.';
    END IF;
    RETURN OLD;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM (
      SELECT
        NEW."amount_total" AS "amount_total",
        NEW."created_at" AS "created_at",
        NEW."id" AS "id",
        NEW."status" AS "status",
        NEW."tenant_id" AS "tenant_id"
    ) AS "m_sales_order"
    JOIN "sales"."subscriptions" AS "m_subscription"
      ON "m_sales_order"."id" = "m_subscription"."sales_order_id"
    WHERE ("m_subscription"."status" <> 'active' OR "m_sales_order"."status" = 'sale')
  ) THEN
      RAISE WARNING 'Cross invariant sales.cross.active_subscription_requires_sale_order violated during direct mutation of sales_order.';
  END IF;

  RETURN NEW;
END;
$$;

-- Cross invariant: sales.cross.active_subscription_requires_sale_order | severity=warning | executionKind=trigger | model=subscription
CREATE OR REPLACE FUNCTION "sales"."enforce_xinv_sales_cross_active_subscription_requires_sale_order_on_subscription"()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
  IF NOT EXISTS (
    SELECT 1
    FROM (
      SELECT
        OLD."close_reason_id" AS "close_reason_id",
        OLD."created_at" AS "created_at",
        OLD."id" AS "id",
        OLD."recurring_total" AS "recurring_total",
        OLD."sales_order_id" AS "sales_order_id",
        OLD."status" AS "status",
        OLD."tenant_id" AS "tenant_id"
    ) AS "m_subscription"
    JOIN "sales"."sales_orders" AS "m_sales_order"
      ON "m_subscription"."sales_order_id" = "m_sales_order"."id"
    WHERE ("m_subscription"."status" <> 'active' OR "m_sales_order"."status" = 'sale')
  ) THEN
      RAISE WARNING 'Cross invariant sales.cross.active_subscription_requires_sale_order violated during direct mutation of subscription.';
    END IF;
    RETURN OLD;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM (
      SELECT
        NEW."close_reason_id" AS "close_reason_id",
        NEW."created_at" AS "created_at",
        NEW."id" AS "id",
        NEW."recurring_total" AS "recurring_total",
        NEW."sales_order_id" AS "sales_order_id",
        NEW."status" AS "status",
        NEW."tenant_id" AS "tenant_id"
    ) AS "m_subscription"
    JOIN "sales"."sales_orders" AS "m_sales_order"
      ON "m_subscription"."sales_order_id" = "m_sales_order"."id"
    WHERE ("m_subscription"."status" <> 'active' OR "m_sales_order"."status" = 'sale')
  ) THEN
      RAISE WARNING 'Cross invariant sales.cross.active_subscription_requires_sale_order violated during direct mutation of subscription.';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS "trg_xinv_sales_cross_active_subscription_requires_sale_order_sales_order" ON "sales"."sales_orders";
CREATE TRIGGER "trg_xinv_sales_cross_active_subscription_requires_sale_order_sales_order"
  BEFORE INSERT OR UPDATE OR DELETE ON "sales"."sales_orders"
  FOR EACH ROW
  EXECUTE FUNCTION "sales"."enforce_xinv_sales_cross_active_subscription_requires_sale_order_on_sales_order"();

DROP TRIGGER IF EXISTS "trg_xinv_sales_cross_active_subscription_requires_sale_order_subscription" ON "sales"."subscriptions";
CREATE TRIGGER "trg_xinv_sales_cross_active_subscription_requires_sale_order_subscription"
  BEFORE INSERT OR UPDATE OR DELETE ON "sales"."subscriptions"
  FOR EACH ROW
  EXECUTE FUNCTION "sales"."enforce_xinv_sales_cross_active_subscription_requires_sale_order_on_subscription"();

-- Mutation policy: sales.sales_order.command_projection
--   mode=event-only
--   appliesTo=sales_order
--   requiredEvents=sales_order.submitted, sales_order.confirmed, sales_order.cancelled

-- Mutation policy: sales.sales_order.command_projection | mode=event-only | model=sales_order
CREATE OR REPLACE FUNCTION "sales"."enforce_event_only_sales_order_writes"()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION USING
    MESSAGE = 'Sales-order command routes append events first and refresh the read model through projection persistence.',
    ERRCODE = 'P0001',
    HINT = 'Route writes through the append-only command/event gateway for this bounded context.';
END;
$$;

DROP TRIGGER IF EXISTS "trg_enforce_event_only_sales_order_writes" ON "sales"."sales_orders";
CREATE TRIGGER "trg_enforce_event_only_sales_order_writes"
  BEFORE CREATE OR DELETE OR UPDATE ON "sales"."sales_orders"
  FOR EACH ROW
  EXECUTE FUNCTION "sales"."enforce_event_only_sales_order_writes"();

-- Mutation policy: sales.subscription.command_projection
--   mode=event-only
--   appliesTo=subscription
--   requiredEvents=subscription.activated, subscription.cancelled, subscription.paused, subscription.direct_update

-- Mutation policy: sales.subscription.command_projection | mode=event-only | model=subscription
CREATE OR REPLACE FUNCTION "sales"."enforce_event_only_subscription_writes"()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION USING
    MESSAGE = 'Subscription command routes append events first and refresh the read model through projection persistence.',
    ERRCODE = 'P0001',
    HINT = 'Route writes through the append-only command/event gateway for this bounded context.';
END;
$$;

DROP TRIGGER IF EXISTS "trg_enforce_event_only_subscription_writes" ON "sales"."subscriptions";
CREATE TRIGGER "trg_enforce_event_only_subscription_writes"
  BEFORE UPDATE ON "sales"."subscriptions"
  FOR EACH ROW
  EXECUTE FUNCTION "sales"."enforce_event_only_subscription_writes"();

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

-- Event contract: subscription (5 registered types)
--   • subscription.activated
--   • subscription.cancelled
--   • subscription.direct_update
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
    event_payload := jsonb_build_object('operation', TG_OP, 'truth_event_contract', jsonb_build_array('subscription.activated', 'subscription.cancelled', 'subscription.direct_update', 'subscription.paused', 'subscription.renewed'), 'state_field', 'status', 'state_value', OLD."status");
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

  event_payload := jsonb_build_object('operation', TG_OP, 'truth_event_contract', jsonb_build_array('subscription.activated', 'subscription.cancelled', 'subscription.direct_update', 'subscription.paused', 'subscription.renewed'), 'state_field', 'status', 'state_value', NEW."status");
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

-- =============================================================================
-- SUPPLEMENTAL SALES TRIGGERS (not yet in truth-compiler manifest)
-- =============================================================================
-- Commission + return-order FSM, line↔header aggregate checks, and event
-- emission for those entities. Consolidated from former src/triggers/.

-- ---------------------------------------------------------------------------
-- COMMISSION ENTRIES — draft → approved → paid
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION sales.enforce_commission_status_transition()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  allowed text[];
BEGIN
  IF OLD.status = NEW.status THEN
    RETURN NEW;
  END IF;

  CASE OLD.status
    WHEN 'draft'    THEN allowed := ARRAY['approved'];
    WHEN 'approved' THEN allowed := ARRAY['paid'];
    WHEN 'paid'     THEN allowed := ARRAY[]::text[];
    ELSE                 allowed := ARRAY[]::text[];
  END CASE;

  IF NOT (NEW.status = ANY(allowed)) THEN
    RAISE EXCEPTION
      'Invalid commission entry status transition: % → % (allowed: %)',
      OLD.status, NEW.status, allowed
      USING ERRCODE = 'check_violation';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_commission_status ON sales.commission_entries;
CREATE TRIGGER trg_enforce_commission_status
  BEFORE UPDATE OF status ON sales.commission_entries
  FOR EACH ROW
  EXECUTE FUNCTION sales.enforce_commission_status_transition();

-- ---------------------------------------------------------------------------
-- RETURN ORDERS
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION sales.enforce_return_order_status_transition()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  allowed text[];
BEGIN
  IF OLD.status = NEW.status THEN
    RETURN NEW;
  END IF;

  CASE OLD.status
    WHEN 'draft'     THEN allowed := ARRAY['approved', 'cancelled'];
    WHEN 'approved'  THEN allowed := ARRAY['received', 'cancelled'];
    WHEN 'received'  THEN allowed := ARRAY['inspected', 'cancelled'];
    WHEN 'inspected' THEN allowed := ARRAY['credited', 'cancelled'];
    WHEN 'credited'  THEN allowed := ARRAY[]::text[];
    WHEN 'cancelled' THEN allowed := ARRAY[]::text[];
    ELSE                  allowed := ARRAY[]::text[];
  END CASE;

  IF NOT (NEW.status = ANY(allowed)) THEN
    RAISE EXCEPTION
      'Invalid return-order status transition: % → % (allowed: %)',
      OLD.status, NEW.status, allowed
      USING ERRCODE = 'check_violation';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_return_order_status ON sales.return_orders;
CREATE TRIGGER trg_enforce_return_order_status
  BEFORE UPDATE OF status ON sales.return_orders
  FOR EACH ROW
  EXECUTE FUNCTION sales.enforce_return_order_status_transition();

-- ---------------------------------------------------------------------------
-- AGGREGATE CONSISTENCY — SALES ORDER HEADER VS LINES
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION sales.validate_sales_order_aggregate_consistency(
  p_order_id uuid,
  p_tenant_id integer
)
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
  order_record record;
  line_totals record;
BEGIN
  IF p_order_id IS NULL OR p_tenant_id IS NULL THEN
    RETURN;
  END IF;

  SELECT
    o.id,
    o.tenant_id,
    o.amount_untaxed,
    o.amount_cost,
    o.amount_profit,
    o.amount_tax,
    o.amount_total
  INTO order_record
  FROM sales.sales_orders AS o
  WHERE o.id = p_order_id
    AND o.tenant_id = p_tenant_id;

  IF NOT FOUND THEN
    RETURN;
  END IF;

  SELECT
    COALESCE(SUM(l.price_subtotal), 0)::numeric(14, 2) AS amount_untaxed,
    COALESCE(SUM(l.cost_subtotal), 0)::numeric(14, 2) AS amount_cost,
    COALESCE(SUM(l.profit_amount), 0)::numeric(14, 2) AS amount_profit,
    COALESCE(SUM(l.price_tax), 0)::numeric(14, 2) AS amount_tax,
    COALESCE(SUM(l.price_total), 0)::numeric(14, 2) AS amount_total
  INTO line_totals
  FROM sales.sales_order_lines AS l
  WHERE l.order_id = p_order_id
    AND l.tenant_id = p_tenant_id
    AND l.deleted_at IS NULL;

  IF order_record.amount_untaxed IS DISTINCT FROM line_totals.amount_untaxed
     OR order_record.amount_cost IS DISTINCT FROM line_totals.amount_cost
     OR order_record.amount_profit IS DISTINCT FROM line_totals.amount_profit
     OR order_record.amount_tax IS DISTINCT FROM line_totals.amount_tax
     OR order_record.amount_total IS DISTINCT FROM line_totals.amount_total THEN
    RAISE EXCEPTION
      'Sales order aggregate mismatch for order %',
      p_order_id
      USING ERRCODE = 'check_violation',
            DETAIL = format(
              'expected[untaxed=%s cost=%s profit=%s tax=%s total=%s] actual[untaxed=%s cost=%s profit=%s tax=%s total=%s]',
              line_totals.amount_untaxed,
              line_totals.amount_cost,
              line_totals.amount_profit,
              line_totals.amount_tax,
              line_totals.amount_total,
              order_record.amount_untaxed,
              order_record.amount_cost,
              order_record.amount_profit,
              order_record.amount_tax,
              order_record.amount_total
            );
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION sales.defer_validate_sales_order_consistency()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    PERFORM sales.validate_sales_order_aggregate_consistency(OLD.order_id, OLD.tenant_id);
    RETURN OLD;
  END IF;

  PERFORM sales.validate_sales_order_aggregate_consistency(NEW.order_id, NEW.tenant_id);

  IF TG_OP = 'UPDATE'
     AND (OLD.order_id IS DISTINCT FROM NEW.order_id
       OR OLD.tenant_id IS DISTINCT FROM NEW.tenant_id) THEN
    PERFORM sales.validate_sales_order_aggregate_consistency(OLD.order_id, OLD.tenant_id);
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_defer_validate_sales_order_consistency ON sales.sales_order_lines;
CREATE CONSTRAINT TRIGGER trg_defer_validate_sales_order_consistency
  AFTER INSERT OR UPDATE OR DELETE ON sales.sales_order_lines
  DEFERRABLE INITIALLY DEFERRED
  FOR EACH ROW
  EXECUTE FUNCTION sales.defer_validate_sales_order_consistency();

-- ---------------------------------------------------------------------------
-- AGGREGATE CONSISTENCY — SUBSCRIPTION HEADER VS LINES
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION sales.validate_subscription_aggregate_consistency(
  p_subscription_id uuid,
  p_tenant_id integer
)
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
  subscription_record record;
  line_totals record;
  expected_mrr numeric(14, 2);
  expected_arr numeric(14, 2);
BEGIN
  IF p_subscription_id IS NULL OR p_tenant_id IS NULL THEN
    RETURN;
  END IF;

  SELECT
    s.id,
    s.tenant_id,
    s.recurring_total,
    s.mrr,
    s.arr,
    t.billing_period
  INTO subscription_record
  FROM sales.subscriptions AS s
  INNER JOIN sales.subscription_templates AS t
    ON t.id = s.template_id
   AND t.tenant_id = s.tenant_id
  WHERE s.id = p_subscription_id
    AND s.tenant_id = p_tenant_id;

  IF NOT FOUND THEN
    RETURN;
  END IF;

  SELECT
    COALESCE(SUM(l.subtotal), 0)::numeric(14, 2) AS recurring_total
  INTO line_totals
  FROM sales.subscription_lines AS l
  WHERE l.subscription_id = p_subscription_id
    AND l.tenant_id = p_tenant_id;

  expected_mrr := ROUND(
    line_totals.recurring_total *
    CASE subscription_record.billing_period
      WHEN 'weekly' THEN 52.0 / 12.0
      WHEN 'monthly' THEN 1.0
      WHEN 'quarterly' THEN 1.0 / 3.0
      WHEN 'yearly' THEN 1.0 / 12.0
      ELSE 1.0
    END,
    2
  )::numeric(14, 2);
  expected_arr := ROUND(expected_mrr * 12.0, 2)::numeric(14, 2);

  IF subscription_record.recurring_total IS DISTINCT FROM line_totals.recurring_total
     OR subscription_record.mrr IS DISTINCT FROM expected_mrr
     OR subscription_record.arr IS DISTINCT FROM expected_arr THEN
    RAISE EXCEPTION
      'Subscription aggregate mismatch for subscription %',
      p_subscription_id
      USING ERRCODE = 'check_violation',
            DETAIL = format(
              'expected[recurring_total=%s mrr=%s arr=%s billing_period=%s] actual[recurring_total=%s mrr=%s arr=%s]',
              line_totals.recurring_total,
              expected_mrr,
              expected_arr,
              subscription_record.billing_period,
              subscription_record.recurring_total,
              subscription_record.mrr,
              subscription_record.arr
            );
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION sales.defer_validate_subscription_consistency()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    PERFORM sales.validate_subscription_aggregate_consistency(
      OLD.subscription_id,
      OLD.tenant_id
    );
    RETURN OLD;
  END IF;

  PERFORM sales.validate_subscription_aggregate_consistency(
    NEW.subscription_id,
    NEW.tenant_id
  );

  IF TG_OP = 'UPDATE'
     AND (OLD.subscription_id IS DISTINCT FROM NEW.subscription_id
       OR OLD.tenant_id IS DISTINCT FROM NEW.tenant_id) THEN
    PERFORM sales.validate_subscription_aggregate_consistency(
      OLD.subscription_id,
      OLD.tenant_id
    );
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_defer_validate_subscription_consistency ON sales.subscription_lines;
CREATE CONSTRAINT TRIGGER trg_defer_validate_subscription_consistency
  AFTER INSERT OR UPDATE OR DELETE ON sales.subscription_lines
  DEFERRABLE INITIALLY DEFERRED
  FOR EACH ROW
  EXECUTE FUNCTION sales.defer_validate_subscription_consistency();

-- ---------------------------------------------------------------------------
-- EVENT EMISSION — COMMISSION ENTRIES & RETURN ORDERS
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION sales.emit_commission_entry_event()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  actor_id integer;
BEGIN
  actor_id := sales.current_actor_id();

  IF TG_OP = 'DELETE' THEN
    PERFORM sales.emit_domain_event(
      'COMMISSION_ENTRY_DELETED',
      'commission_entry',
      OLD.tenant_id,
      OLD.id,
      jsonb_build_object('operation', TG_OP, 'status', OLD.status),
      actor_id
    );
    RETURN OLD;
  END IF;

  PERFORM sales.emit_domain_event(
    'COMMISSION_ENTRY_MUTATED',
    'commission_entry',
    NEW.tenant_id,
    NEW.id,
    jsonb_build_object('operation', TG_OP, 'status', NEW.status),
    actor_id
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_emit_commission_entry_event ON sales.commission_entries;
CREATE TRIGGER trg_emit_commission_entry_event
  AFTER INSERT OR UPDATE OR DELETE ON sales.commission_entries
  FOR EACH ROW
  EXECUTE FUNCTION sales.emit_commission_entry_event();

CREATE OR REPLACE FUNCTION sales.emit_return_order_event()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  actor_id integer;
BEGIN
  actor_id := sales.current_actor_id();

  IF TG_OP = 'DELETE' THEN
    PERFORM sales.emit_domain_event(
      'RETURN_ORDER_DELETED',
      'return_order',
      OLD.tenant_id,
      OLD.id,
      jsonb_build_object('operation', TG_OP, 'status', OLD.status),
      actor_id
    );
    RETURN OLD;
  END IF;

  PERFORM sales.emit_domain_event(
    'RETURN_ORDER_MUTATED',
    'return_order',
    NEW.tenant_id,
    NEW.id,
    jsonb_build_object('operation', TG_OP, 'status', NEW.status),
    actor_id
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_emit_return_order_event ON sales.return_orders;
CREATE TRIGGER trg_emit_return_order_event
  AFTER INSERT OR UPDATE OR DELETE ON sales.return_orders
  FOR EACH ROW
  EXECUTE FUNCTION sales.emit_return_order_event();

-- ---------------------------------------------------------------------------
-- SUBSCRIPTIONS — exclude overlapping billing periods (active / past_due / paused)
-- ---------------------------------------------------------------------------
-- Uses generated column `billing_overlap_period` (empty tstzrange when ineligible).
-- Requires btree_gist for integer/uuid equality operators used with GiST.

CREATE EXTENSION IF NOT EXISTS btree_gist;

ALTER TABLE sales.subscriptions
  DROP CONSTRAINT IF EXISTS sales_subscriptions_billing_overlap_excl;

ALTER TABLE sales.subscriptions
  ADD CONSTRAINT sales_subscriptions_billing_overlap_excl
  EXCLUDE USING gist (
    tenant_id WITH =,
    partner_id WITH =,
    template_id WITH =,
    billing_overlap_period WITH &&
  );
