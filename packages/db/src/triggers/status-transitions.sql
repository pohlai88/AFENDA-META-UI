/**
 * Status-Transition Triggers
 * ==========================
 * BEFORE UPDATE triggers that enforce valid state machine transitions
 * at the database level for critical financial entities.
 *
 * These triggers are the last line of defence — the application layer
 * (sales-order-engine, subscription-engine) enforces the same rules
 * with richer context, but the DB trigger guarantees correctness even
 * for direct SQL updates or bulk operations.
 *
 * Applies to:
 *   Status machine enforcement
 *   1. sales.sales_orders         (order_status)
 *   2. sales.subscriptions        (subscription_status)
 *   3. sales.commission_entries   (commission_entry_status)
 *   4. sales.return_orders        (return_status)
 *   5. sales.consignment_agreements (consignment_status)
 *
 *   Mandatory event emission
 *   6. sales.sales_orders
 *   7. sales.subscriptions
 *   8. sales.commission_entries
 *   9. sales.return_orders
 *   10. sales.consignment_agreements
 *
 *   Aggregate consistency enforcement
 *   11. sales.sales_order_lines -> sales.sales_orders
 *   12. sales.subscription_lines -> sales.subscriptions
 *
 * Usage:
 *   pnpm --filter @afenda/db db:trigger:apply   (via the runner script)
 *   -- or --
 *   psql $DATABASE_URL -f packages/db/src/triggers/status-transitions.sql
 */

-- ============================================================================
-- 1. SALES ORDERS — draft → sent → sale → done  (cancel from any non-done)
-- ============================================================================

CREATE OR REPLACE FUNCTION sales.enforce_order_status_transition()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  allowed text[];
BEGIN
  -- Only fire when the status column actually changes
  IF OLD.status = NEW.status THEN
    RETURN NEW;
  END IF;

  CASE OLD.status
    WHEN 'draft'  THEN allowed := ARRAY['sent', 'sale', 'cancel'];
    WHEN 'sent'   THEN allowed := ARRAY['sale', 'cancel'];
    WHEN 'sale'   THEN allowed := ARRAY['done', 'cancel'];
    WHEN 'done'   THEN allowed := ARRAY[]::text[];
    WHEN 'cancel' THEN allowed := ARRAY[]::text[];
    ELSE               allowed := ARRAY[]::text[];
  END CASE;

  IF NOT (NEW.status = ANY(allowed)) THEN
    RAISE EXCEPTION
      'Invalid order status transition: % → % (allowed: %)',
      OLD.status, NEW.status, allowed
      USING ERRCODE = 'check_violation';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_order_status ON sales.sales_orders;
CREATE TRIGGER trg_enforce_order_status
  BEFORE UPDATE OF status ON sales.sales_orders
  FOR EACH ROW
  EXECUTE FUNCTION sales.enforce_order_status_transition();


-- ============================================================================
-- 2. SUBSCRIPTIONS
--    draft → active → [paused ⇄ active] → [cancelled | expired]
--    past_due → active | cancelled
-- ============================================================================

CREATE OR REPLACE FUNCTION sales.enforce_subscription_status_transition()
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
    WHEN 'draft'     THEN allowed := ARRAY['active', 'cancelled'];
    WHEN 'active'    THEN allowed := ARRAY['paused', 'past_due', 'cancelled', 'expired'];
    WHEN 'paused'    THEN allowed := ARRAY['active', 'cancelled'];
    WHEN 'past_due'  THEN allowed := ARRAY['active', 'cancelled'];
    WHEN 'cancelled' THEN allowed := ARRAY[]::text[];
    WHEN 'expired'   THEN allowed := ARRAY[]::text[];
    ELSE                  allowed := ARRAY[]::text[];
  END CASE;

  IF NOT (NEW.status = ANY(allowed)) THEN
    RAISE EXCEPTION
      'Invalid subscription status transition: % → % (allowed: %)',
      OLD.status, NEW.status, allowed
      USING ERRCODE = 'check_violation';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_subscription_status ON sales.subscriptions;
CREATE TRIGGER trg_enforce_subscription_status
  BEFORE UPDATE OF status ON sales.subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION sales.enforce_subscription_status_transition();


-- ============================================================================
-- 3. COMMISSION ENTRIES — draft → approved → paid
-- ============================================================================

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


-- ============================================================================
-- 4. RETURN ORDERS
--    draft → approved → received → inspected → credited
--    cancel is allowed from non-terminal forward states
-- ============================================================================

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


-- ============================================================================
-- 5. CONSIGNMENT AGREEMENTS
--    draft → active → expired
--    active/expired may transition to terminated as terminal state
-- ============================================================================

CREATE OR REPLACE FUNCTION sales.enforce_consignment_status_transition()
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
    WHEN 'draft'      THEN allowed := ARRAY['active', 'terminated'];
    WHEN 'active'     THEN allowed := ARRAY['expired', 'terminated'];
    WHEN 'expired'    THEN allowed := ARRAY['terminated'];
    WHEN 'terminated' THEN allowed := ARRAY[]::text[];
    ELSE                   allowed := ARRAY[]::text[];
  END CASE;

  IF NOT (NEW.status = ANY(allowed)) THEN
    RAISE EXCEPTION
      'Invalid consignment status transition: % → % (allowed: %)',
      OLD.status, NEW.status, allowed
      USING ERRCODE = 'check_violation';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_consignment_status ON sales.consignment_agreements;
CREATE TRIGGER trg_enforce_consignment_status
  BEFORE UPDATE OF status ON sales.consignment_agreements
  FOR EACH ROW
  EXECUTE FUNCTION sales.enforce_consignment_status_transition();


-- ============================================================================
-- 6. AGGREGATE CONSISTENCY — SALES ORDER HEADER VS LINES
-- ============================================================================

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


-- ============================================================================
-- 7. AGGREGATE CONSISTENCY — SUBSCRIPTION HEADER VS LINES
-- ============================================================================

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


-- ============================================================================
-- 8. DOMAIN EVENT EMISSION HELPERS (MANDATORY)
-- ============================================================================

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
    COALESCE(p_payload, '{}'::jsonb)::text,
    NULLIF(actor_id, 0),
    actor_id,
    actor_id
  );
END;
$$;


-- ============================================================================
-- 9. EVENT EMISSION — SALES ORDERS
-- ============================================================================

CREATE OR REPLACE FUNCTION sales.emit_sales_order_event()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  actor_id integer;
BEGIN
  actor_id := sales.current_actor_id();

  IF TG_OP = 'DELETE' THEN
    PERFORM sales.emit_domain_event(
      'ORDER_DELETED',
      'sales_order',
      OLD.tenant_id,
      OLD.id,
      jsonb_build_object('operation', TG_OP, 'status', OLD.status),
      actor_id
    );
    RETURN OLD;
  END IF;

  PERFORM sales.emit_domain_event(
    'ORDER_MUTATED',
    'sales_order',
    NEW.tenant_id,
    NEW.id,
    jsonb_build_object('operation', TG_OP, 'status', NEW.status),
    actor_id
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_emit_sales_order_event ON sales.sales_orders;
CREATE TRIGGER trg_emit_sales_order_event
  AFTER INSERT OR UPDATE OR DELETE ON sales.sales_orders
  FOR EACH ROW
  EXECUTE FUNCTION sales.emit_sales_order_event();


-- ============================================================================
-- 10. EVENT EMISSION — SUBSCRIPTIONS
-- ============================================================================

CREATE OR REPLACE FUNCTION sales.emit_subscription_event()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  actor_id integer;
BEGIN
  actor_id := sales.current_actor_id();

  IF TG_OP = 'DELETE' THEN
    PERFORM sales.emit_domain_event(
      'SUBSCRIPTION_DELETED',
      'subscription',
      OLD.tenant_id,
      OLD.id,
      jsonb_build_object('operation', TG_OP, 'status', OLD.status),
      actor_id
    );
    RETURN OLD;
  END IF;

  PERFORM sales.emit_domain_event(
    'SUBSCRIPTION_MUTATED',
    'subscription',
    NEW.tenant_id,
    NEW.id,
    jsonb_build_object('operation', TG_OP, 'status', NEW.status),
    actor_id
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_emit_subscription_event ON sales.subscriptions;
CREATE TRIGGER trg_emit_subscription_event
  AFTER INSERT OR UPDATE OR DELETE ON sales.subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION sales.emit_subscription_event();


-- ============================================================================
-- 11. EVENT EMISSION — COMMISSION ENTRIES
-- ============================================================================

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


-- ============================================================================
-- 12. EVENT EMISSION — RETURN ORDERS
-- ============================================================================

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


-- ============================================================================
-- 13. EVENT EMISSION — CONSIGNMENT AGREEMENTS
-- ============================================================================

CREATE OR REPLACE FUNCTION sales.emit_consignment_agreement_event()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  actor_id integer;
BEGIN
  actor_id := sales.current_actor_id();

  IF TG_OP = 'DELETE' THEN
    PERFORM sales.emit_domain_event(
      'CONSIGNMENT_AGREEMENT_DELETED',
      'consignment_agreement',
      OLD.tenant_id,
      OLD.id,
      jsonb_build_object('operation', TG_OP, 'status', OLD.status),
      actor_id
    );
    RETURN OLD;
  END IF;

  PERFORM sales.emit_domain_event(
    'CONSIGNMENT_AGREEMENT_MUTATED',
    'consignment_agreement',
    NEW.tenant_id,
    NEW.id,
    jsonb_build_object('operation', TG_OP, 'status', NEW.status),
    actor_id
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_emit_consignment_agreement_event ON sales.consignment_agreements;
CREATE TRIGGER trg_emit_consignment_agreement_event
  AFTER INSERT OR UPDATE OR DELETE ON sales.consignment_agreements
  FOR EACH ROW
  EXECUTE FUNCTION sales.emit_consignment_agreement_event();
