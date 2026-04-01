-- Phase 3: price_resolution_events, override approver on resolutions, DB-emitted resolved/locked events.

DO $col$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'sales' AND table_name = 'price_resolutions' AND column_name = 'override_approved_by'
  ) THEN
    ALTER TABLE "sales"."price_resolutions" ADD COLUMN "override_approved_by" integer;
  END IF;
END
$col$;--> statement-breakpoint

DO $chk$
BEGIN
  ALTER TABLE "sales"."price_resolutions" ADD CONSTRAINT "chk_sales_price_resolutions_override_above_base" CHECK ("final_price" <= "base_price" OR "override_approved_by" IS NOT NULL);
EXCEPTION
  WHEN duplicate_object THEN NULL;
END
$chk$;--> statement-breakpoint

DO $fk$
BEGIN
  ALTER TABLE "sales"."price_resolutions" ADD CONSTRAINT "fk_sales_price_resolutions_override_approved_by" FOREIGN KEY ("override_approved_by") REFERENCES "security"."users"("userId") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END
$fk$;--> statement-breakpoint

CREATE TYPE "sales"."price_resolution_event_type" AS ENUM('resolved','recomputed','locked','overridden');--> statement-breakpoint

CREATE TABLE "sales"."price_resolution_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" integer NOT NULL,
	"resolution_id" uuid NOT NULL,
	"event_type" "sales"."price_resolution_event_type" NOT NULL,
	"payload" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"occurred_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" integer NOT NULL
);--> statement-breakpoint
ALTER TABLE "sales"."price_resolution_events" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "sales"."price_resolution_events" ADD CONSTRAINT "fk_sales_price_resolution_events_tenant" FOREIGN KEY ("tenant_id") REFERENCES "core"."tenants"("tenant_id") ON DELETE RESTRICT ON UPDATE CASCADE;--> statement-breakpoint
ALTER TABLE "sales"."price_resolution_events" ADD CONSTRAINT "fk_sales_price_resolution_events_resolution" FOREIGN KEY ("resolution_id") REFERENCES "sales"."price_resolutions"("id") ON DELETE CASCADE ON UPDATE CASCADE;--> statement-breakpoint
ALTER TABLE "sales"."price_resolution_events" ADD CONSTRAINT "fk_sales_price_resolution_events_created_by" FOREIGN KEY ("created_by") REFERENCES "security"."users"("userId") ON DELETE RESTRICT ON UPDATE CASCADE;--> statement-breakpoint
CREATE INDEX "idx_sales_price_resolution_events_tenant" ON "sales"."price_resolution_events" ("tenant_id");--> statement-breakpoint
CREATE INDEX "idx_sales_price_resolution_events_resolution" ON "sales"."price_resolution_events" ("tenant_id","resolution_id","occurred_at");--> statement-breakpoint
CREATE POLICY "sales_price_resolution_events_tenant_select" ON "sales"."price_resolution_events" AS PERMISSIVE FOR SELECT TO "app_user" USING ("tenant_id" = NULLIF(current_setting('afenda.tenant_id', true), '')::int);--> statement-breakpoint
CREATE POLICY "sales_price_resolution_events_tenant_insert" ON "sales"."price_resolution_events" AS PERMISSIVE FOR INSERT TO "app_user" WITH CHECK ("tenant_id" = NULLIF(current_setting('afenda.tenant_id', true), '')::int);--> statement-breakpoint
CREATE POLICY "sales_price_resolution_events_tenant_update" ON "sales"."price_resolution_events" AS PERMISSIVE FOR UPDATE TO "app_user" USING ("tenant_id" = NULLIF(current_setting('afenda.tenant_id', true), '')::int) WITH CHECK ("tenant_id" = NULLIF(current_setting('afenda.tenant_id', true), '')::int);--> statement-breakpoint
CREATE POLICY "sales_price_resolution_events_tenant_delete" ON "sales"."price_resolution_events" AS PERMISSIVE FOR DELETE TO "app_user" USING ("tenant_id" = NULLIF(current_setting('afenda.tenant_id', true), '')::int);--> statement-breakpoint
CREATE POLICY "sales_price_resolution_events_service_bypass" ON "sales"."price_resolution_events" AS PERMISSIVE FOR ALL TO "service_role" USING (true) WITH CHECK (true);--> statement-breakpoint

CREATE OR REPLACE FUNCTION "sales"."emit_price_resolution_lifecycle_event"()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO "sales"."price_resolution_events" ("tenant_id", "resolution_id", "event_type", "created_by", "payload")
    VALUES (NEW."tenant_id", NEW."id", 'resolved'::"sales"."price_resolution_event_type", NEW."created_by", '{}'::jsonb);
    RETURN NEW;
  END IF;
  IF TG_OP = 'UPDATE' THEN
    IF OLD."locked_at" IS NULL AND NEW."locked_at" IS NOT NULL THEN
      INSERT INTO "sales"."price_resolution_events" ("tenant_id", "resolution_id", "event_type", "created_by", "payload")
      VALUES (NEW."tenant_id", NEW."id", 'locked'::"sales"."price_resolution_event_type", NEW."updated_by", '{}'::jsonb);
    END IF;
    RETURN NEW;
  END IF;
  RETURN NEW;
END;
$$;--> statement-breakpoint

DROP TRIGGER IF EXISTS "trg_emit_price_resolution_lifecycle_event" ON "sales"."price_resolutions";--> statement-breakpoint
CREATE TRIGGER "trg_emit_price_resolution_lifecycle_event"
  AFTER INSERT OR UPDATE ON "sales"."price_resolutions"
  FOR EACH ROW
  EXECUTE FUNCTION "sales"."emit_price_resolution_lifecycle_event"();
