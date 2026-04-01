-- Split sales-order pricing truth: drop polymorphic (document_type, document_id) → order_id + typed table names.
-- Recreates triggers that referenced old table/column names; adds final-decision ≥1 resolution enforcement.

-- ── 1) Drop triggers that reference old table/column names ─────────────────
DROP TRIGGER IF EXISTS "sales_order_enforce_truth_link_before_sale" ON "sales"."sales_orders";--> statement-breakpoint
DROP TRIGGER IF EXISTS "sync_sales_price_resolutions_lock_from_document_truth" ON "sales"."sales_orders";--> statement-breakpoint
DROP TRIGGER IF EXISTS "trg_emit_price_resolution_lifecycle_event" ON "sales"."price_resolutions";--> statement-breakpoint
DROP TRIGGER IF EXISTS "trg_sales_price_resolutions_lock_guard" ON "sales"."price_resolutions";--> statement-breakpoint
DROP TRIGGER IF EXISTS "trg_sales_document_truth_links_immutable" ON "sales"."document_truth_links";--> statement-breakpoint
DROP TRIGGER IF EXISTS "trg_document_truth_links_require_final_pricing" ON "sales"."document_truth_links";--> statement-breakpoint
DROP TRIGGER IF EXISTS "trg_sales_pricing_decisions_immutable_guard" ON "sales"."pricing_decisions";--> statement-breakpoint

-- ── 2) Drop FKs that block renames (child → price_resolutions) ─────────────
ALTER TABLE "sales"."commission_entries" DROP CONSTRAINT IF EXISTS "fk_sales_commission_entries_price_resolution";--> statement-breakpoint
ALTER TABLE "sales"."commission_resolutions" DROP CONSTRAINT IF EXISTS "fk_sales_commission_resolutions_source_price_resolution";--> statement-breakpoint
ALTER TABLE "sales"."price_resolution_events" DROP CONSTRAINT IF EXISTS "fk_sales_price_resolution_events_resolution";--> statement-breakpoint

-- ── 3) pricing_decisions → reshape + rename ────────────────────────────────
DROP INDEX IF EXISTS "sales"."uq_sales_pricing_decisions_one_active_per_document";--> statement-breakpoint
DROP INDEX IF EXISTS "sales"."uq_sales_pricing_decisions_doc_version";--> statement-breakpoint
DROP INDEX IF EXISTS "sales"."idx_sales_pricing_decisions_tenant_document";--> statement-breakpoint
DROP INDEX IF EXISTS "sales"."idx_sales_pricing_decisions_status";--> statement-breakpoint
ALTER TABLE "sales"."pricing_decisions" DROP CONSTRAINT IF EXISTS "chk_sales_pricing_decisions_sales_order_scope";--> statement-breakpoint
ALTER TABLE "sales"."pricing_decisions" DROP CONSTRAINT IF EXISTS "fk_sales_pricing_decisions_order";--> statement-breakpoint
ALTER TABLE "sales"."pricing_decisions" RENAME COLUMN "document_id" TO "order_id";--> statement-breakpoint
ALTER TABLE "sales"."pricing_decisions" DROP COLUMN "document_type";--> statement-breakpoint
ALTER TABLE "sales"."pricing_decisions" ADD CONSTRAINT "fk_sales_sopd_order" FOREIGN KEY ("order_id") REFERENCES "sales"."sales_orders"("id") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
CREATE UNIQUE INDEX "uq_sales_sopd_order_version" ON "sales"."pricing_decisions" ("tenant_id","order_id","decision_version");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_sales_sopd_one_active_per_order" ON "sales"."pricing_decisions" ("tenant_id","order_id") WHERE "is_active" = true;--> statement-breakpoint
CREATE INDEX "idx_sales_sopd_tenant_order" ON "sales"."pricing_decisions" ("tenant_id","order_id");--> statement-breakpoint
CREATE INDEX "idx_sales_sopd_status" ON "sales"."pricing_decisions" ("tenant_id","order_id","status");--> statement-breakpoint
ALTER TABLE "sales"."pricing_decisions" RENAME TO "sales_order_pricing_decisions";--> statement-breakpoint

-- ── 4) document_truth_links → reshape + rename ─────────────────────────────
DROP INDEX IF EXISTS "sales"."uq_sales_document_truth_links_document";--> statement-breakpoint
DROP INDEX IF EXISTS "sales"."idx_sales_document_truth_links_pricing_decision";--> statement-breakpoint
ALTER TABLE "sales"."document_truth_links" DROP CONSTRAINT IF EXISTS "chk_sales_document_truth_links_sales_order_only";--> statement-breakpoint
ALTER TABLE "sales"."document_truth_links" DROP CONSTRAINT IF EXISTS "fk_sales_document_truth_links_order";--> statement-breakpoint
ALTER TABLE "sales"."document_truth_links" DROP CONSTRAINT IF EXISTS "fk_sales_document_truth_links_pricing_decision";--> statement-breakpoint
ALTER TABLE "sales"."document_truth_links" RENAME COLUMN "document_id" TO "order_id";--> statement-breakpoint
ALTER TABLE "sales"."document_truth_links" DROP COLUMN "document_type";--> statement-breakpoint
ALTER TABLE "sales"."document_truth_links" ADD CONSTRAINT "fk_sales_sodtl_order" FOREIGN KEY ("order_id") REFERENCES "sales"."sales_orders"("id") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "sales"."document_truth_links" ADD CONSTRAINT "fk_sales_sodtl_pricing_decision" FOREIGN KEY ("pricing_decision_id") REFERENCES "sales"."sales_order_pricing_decisions"("id") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
CREATE UNIQUE INDEX "uq_sales_sodtl_order" ON "sales"."document_truth_links" ("tenant_id","order_id");--> statement-breakpoint
CREATE INDEX "idx_sales_sodtl_pricing_decision" ON "sales"."document_truth_links" ("tenant_id","pricing_decision_id");--> statement-breakpoint
ALTER TABLE "sales"."document_truth_links" RENAME TO "sales_order_document_truth_links";--> statement-breakpoint

-- ── 5) price_resolutions → reshape + rename ────────────────────────────────
ALTER TABLE "sales"."price_resolutions" DROP CONSTRAINT IF EXISTS "fk_sales_price_resolutions_pricing_decision";--> statement-breakpoint
DROP INDEX IF EXISTS "sales"."uq_sales_price_resolutions_line_version";--> statement-breakpoint
DROP INDEX IF EXISTS "sales"."idx_sales_price_resolutions_document";--> statement-breakpoint
ALTER TABLE "sales"."price_resolutions" DROP CONSTRAINT IF EXISTS "fk_sales_price_resolutions_order";--> statement-breakpoint
ALTER TABLE "sales"."price_resolutions" RENAME COLUMN "document_id" TO "order_id";--> statement-breakpoint
ALTER TABLE "sales"."price_resolutions" DROP COLUMN "document_type";--> statement-breakpoint
ALTER TABLE "sales"."price_resolutions" ADD CONSTRAINT "fk_sales_sopr_order" FOREIGN KEY ("order_id") REFERENCES "sales"."sales_orders"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "sales"."price_resolutions" ADD CONSTRAINT "fk_sales_sopr_pricing_decision" FOREIGN KEY ("pricing_decision_id") REFERENCES "sales"."sales_order_pricing_decisions"("id") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
CREATE UNIQUE INDEX "uq_sales_sopr_line_version" ON "sales"."price_resolutions" ("tenant_id","order_id","line_id","resolution_version");--> statement-breakpoint
CREATE INDEX "idx_sales_sopr_order" ON "sales"."price_resolutions" ("tenant_id","order_id");--> statement-breakpoint
ALTER TABLE "sales"."price_resolutions" RENAME TO "sales_order_price_resolutions";--> statement-breakpoint

-- ── 6) Restore FKs from commission + events → resolutions ─────────────────
ALTER TABLE "sales"."price_resolution_events" ADD CONSTRAINT "fk_sales_price_resolution_events_resolution" FOREIGN KEY ("resolution_id") REFERENCES "sales"."sales_order_price_resolutions"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "sales"."commission_entries" ADD CONSTRAINT "fk_sales_commission_entries_price_resolution" FOREIGN KEY ("price_resolution_id") REFERENCES "sales"."sales_order_price_resolutions"("id") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "sales"."commission_resolutions" ADD CONSTRAINT "fk_sales_commission_resolutions_source_price_resolution" FOREIGN KEY ("source_price_resolution_id") REFERENCES "sales"."sales_order_price_resolutions"("id") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint

-- ── 7) document_truth_bindings FK still points to link id (table renamed) ───
-- OID-based FK survives renames; verify constraint targets renamed table (PostgreSQL updates automatically).

-- ── 8) Immutability guard: column rename document_id → order_id (no document_type) ─
CREATE OR REPLACE FUNCTION "sales"."tf_pricing_decisions_immutable_guard"()
RETURNS trigger
LANGUAGE plpgsql
AS $f$
BEGIN
	IF OLD."status" = 'final'::"sales"."pricing_decision_status" THEN
		IF (
			NEW."order_id" IS DISTINCT FROM OLD."order_id" OR
			NEW."decision_version" IS DISTINCT FROM OLD."decision_version" OR
			NEW."pricing_engine_version" IS DISTINCT FROM OLD."pricing_engine_version" OR
			NEW."document_inputs_digest" IS DISTINCT FROM OLD."document_inputs_digest" OR
			NEW."document_inputs" IS DISTINCT FROM OLD."document_inputs" OR
			NEW."status" IS DISTINCT FROM OLD."status" OR
			NEW."created_at" IS DISTINCT FROM OLD."created_at" OR
			NEW."created_by" IS DISTINCT FROM OLD."created_by"
		) THEN
			RAISE EXCEPTION 'sales.sales_order_pricing_decisions: row is final; only is_active and updated_* may change';
		END IF;
		RETURN NEW;
	END IF;

	IF NEW."order_id" IS DISTINCT FROM OLD."order_id"
		OR NEW."decision_version" IS DISTINCT FROM OLD."decision_version" THEN
		RAISE EXCEPTION 'sales.sales_order_pricing_decisions: order key and decision_version are immutable';
	END IF;

	IF OLD."status" = 'draft'::"sales"."pricing_decision_status"
		AND NEW."status" = 'final'::"sales"."pricing_decision_status" THEN
		RETURN NEW;
	END IF;

	IF NEW."status" = 'draft'::"sales"."pricing_decision_status" THEN
		RETURN NEW;
	END IF;

	RAISE EXCEPTION 'sales.sales_order_pricing_decisions: invalid status transition % → %', OLD."status", NEW."status";
END;
$f$;--> statement-breakpoint

-- ── 9) sales_orders triggers (use new link + resolution table names, order_id) ─
CREATE OR REPLACE FUNCTION "sales"."sales_order_enforce_truth_link_before_sale"()
RETURNS trigger
LANGUAGE plpgsql
AS $so$
BEGIN
	IF NEW."status" = 'sale' AND OLD."status" IS DISTINCT FROM 'sale' THEN
		IF NOT EXISTS (
			SELECT 1
			FROM "sales"."sales_order_document_truth_links" d
			WHERE d."tenant_id" = NEW."tenant_id"
				AND d."order_id" = NEW."id"
		) THEN
			RAISE EXCEPTION 'sales_orders: transition to sale requires sales_order_document_truth_links row (tenant_id, order_id) first'
				USING ERRCODE = 'check_violation';
		END IF;
	END IF;
	RETURN NEW;
END;
$so$;--> statement-breakpoint
CREATE TRIGGER "sales_order_enforce_truth_link_before_sale"
	BEFORE UPDATE ON "sales"."sales_orders"
	FOR EACH ROW
	EXECUTE FUNCTION "sales"."sales_order_enforce_truth_link_before_sale"();--> statement-breakpoint

CREATE OR REPLACE FUNCTION "sales"."sync_sales_price_resolutions_lock_from_document_truth"()
RETURNS trigger
LANGUAGE plpgsql
AS $sync$
BEGIN
	IF NEW."status" = 'sale' AND OLD."status" IS DISTINCT FROM 'sale' THEN
		UPDATE "sales"."sales_order_price_resolutions" pr
		SET "locked_at" = dtl."locked_at"
		FROM "sales"."sales_order_document_truth_links" dtl
		WHERE pr."tenant_id" = NEW."tenant_id"
			AND pr."order_id" = NEW."id"
			AND dtl."tenant_id" = NEW."tenant_id"
			AND dtl."order_id" = NEW."id"
			AND pr."locked_at" IS NULL;
	END IF;
	RETURN NEW;
END;
$sync$;--> statement-breakpoint
CREATE TRIGGER "sync_sales_price_resolutions_lock_from_document_truth"
	AFTER UPDATE ON "sales"."sales_orders"
	FOR EACH ROW
	EXECUTE FUNCTION "sales"."sync_sales_price_resolutions_lock_from_document_truth"();--> statement-breakpoint

-- ── 10) price_resolutions triggers on renamed table ──────────────────────────
CREATE TRIGGER "trg_sales_price_resolutions_lock_guard"
	BEFORE UPDATE ON "sales"."sales_order_price_resolutions"
	FOR EACH ROW
	EXECUTE FUNCTION "sales"."prevent_sales_price_resolutions_mutate_after_lock"();--> statement-breakpoint
CREATE TRIGGER "trg_emit_price_resolution_lifecycle_event"
	AFTER INSERT OR UPDATE ON "sales"."sales_order_price_resolutions"
	FOR EACH ROW
	EXECUTE FUNCTION "sales"."emit_price_resolution_lifecycle_event"();--> statement-breakpoint

-- ── 11) document truth links immutability + final pricing check ────────────
CREATE TRIGGER "trg_sales_sodtl_immutable"
	BEFORE UPDATE ON "sales"."sales_order_document_truth_links"
	FOR EACH ROW
	EXECUTE FUNCTION "sales"."prevent_sales_document_truth_links_update"();--> statement-breakpoint

CREATE OR REPLACE FUNCTION "sales"."tf_document_truth_links_require_final_pricing"()
RETURNS trigger
LANGUAGE plpgsql
AS $tf$
BEGIN
	IF NOT EXISTS (
		SELECT 1
		FROM "sales"."sales_order_pricing_decisions" pd
		WHERE pd."id" = NEW."pricing_decision_id"
			AND pd."status" = 'final'::"sales"."pricing_decision_status"
	) THEN
		RAISE EXCEPTION 'sales.sales_order_document_truth_links: pricing_decision_id must reference status = final';
	END IF;
	RETURN NEW;
END;
$tf$;--> statement-breakpoint
CREATE TRIGGER "trg_sodtl_require_final_pricing"
	BEFORE INSERT ON "sales"."sales_order_document_truth_links"
	FOR EACH ROW
	EXECUTE FUNCTION "sales"."tf_document_truth_links_require_final_pricing"();--> statement-breakpoint

-- ── 12) pricing decision immutability on renamed table ────────────────────
CREATE TRIGGER "trg_sales_sopd_immutable_guard"
	BEFORE UPDATE ON "sales"."sales_order_pricing_decisions"
	FOR EACH ROW
	EXECUTE FUNCTION "sales"."tf_pricing_decisions_immutable_guard"();--> statement-breakpoint

-- ── 13) Final decision must have ≥1 line resolution ────────────────────────
CREATE OR REPLACE FUNCTION "sales"."tf_sales_sopd_final_requires_price_resolution"()
RETURNS trigger
LANGUAGE plpgsql
AS $fin$
BEGIN
	IF TG_OP = 'INSERT' THEN
		IF NEW."status" = 'final'::"sales"."pricing_decision_status" THEN
			IF NOT EXISTS (
				SELECT 1 FROM "sales"."sales_order_price_resolutions" pr
				WHERE pr."pricing_decision_id" = NEW."id"
				LIMIT 1
			) THEN
				RAISE EXCEPTION 'sales_order_pricing_decisions: status final requires at least one sales_order_price_resolutions row'
					USING ERRCODE = 'check_violation';
			END IF;
		END IF;
		RETURN NEW;
	END IF;
	IF TG_OP = 'UPDATE' THEN
		IF NEW."status" = 'final'::"sales"."pricing_decision_status"
			AND OLD."status" IS DISTINCT FROM NEW."status" THEN
			IF NOT EXISTS (
				SELECT 1 FROM "sales"."sales_order_price_resolutions" pr
				WHERE pr."pricing_decision_id" = NEW."id"
				LIMIT 1
			) THEN
				RAISE EXCEPTION 'sales_order_pricing_decisions: status final requires at least one sales_order_price_resolutions row'
					USING ERRCODE = 'check_violation';
			END IF;
		END IF;
		RETURN NEW;
	END IF;
	RETURN NEW;
END;
$fin$;--> statement-breakpoint
CREATE TRIGGER "trg_sales_sopd_final_requires_price_resolution"
	BEFORE INSERT OR UPDATE OF "status" ON "sales"."sales_order_pricing_decisions"
	FOR EACH ROW
	EXECUTE FUNCTION "sales"."tf_sales_sopd_final_requires_price_resolution"();--> statement-breakpoint

CREATE OR REPLACE FUNCTION "sales"."tf_sales_sopr_block_delete_when_decision_final"()
RETURNS trigger
LANGUAGE plpgsql
AS $del$
DECLARE s "sales"."pricing_decision_status";
BEGIN
	SELECT pd."status" INTO s
	FROM "sales"."sales_order_pricing_decisions" pd
	WHERE pd."id" = OLD."pricing_decision_id";
	IF s = 'final'::"sales"."pricing_decision_status" THEN
		RAISE EXCEPTION 'sales_order_price_resolutions: cannot delete rows for a final pricing decision'
			USING ERRCODE = 'check_violation';
	END IF;
	RETURN OLD;
END;
$del$;--> statement-breakpoint
CREATE TRIGGER "trg_sales_sopr_block_delete_when_decision_final"
	BEFORE DELETE ON "sales"."sales_order_price_resolutions"
	FOR EACH ROW
	EXECUTE FUNCTION "sales"."tf_sales_sopr_block_delete_when_decision_final"();--> statement-breakpoint
