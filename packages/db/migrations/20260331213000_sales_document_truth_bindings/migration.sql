CREATE TYPE "sales"."truth_binding_commit_phase" AS ENUM('financial_commit', 'posted', 'voided', 'superseded');--> statement-breakpoint
ALTER TYPE "sales"."domain_event_type" ADD VALUE IF NOT EXISTS 'TRUTH_BOUNDARY_COMMITTED';--> statement-breakpoint
ALTER TYPE "sales"."domain_event_type" ADD VALUE IF NOT EXISTS 'TRUTH_BINDING_VOIDED';--> statement-breakpoint
ALTER TABLE "sales"."domain_event_logs" ALTER COLUMN "payload" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "sales"."domain_event_logs" ALTER COLUMN "payload" TYPE jsonb USING (
  CASE
    WHEN "payload" IS NULL OR btrim("payload"::text) = '' THEN '{}'::jsonb
    ELSE "payload"::jsonb
  END
);--> statement-breakpoint
ALTER TABLE "sales"."domain_event_logs" ALTER COLUMN "payload" SET DEFAULT '{}'::jsonb;--> statement-breakpoint
ALTER TABLE "sales"."domain_event_logs" ALTER COLUMN "payload" SET NOT NULL;--> statement-breakpoint
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
$$;--> statement-breakpoint
CREATE TABLE "sales"."document_truth_bindings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" integer NOT NULL,
	"document_type" "sales"."sales_truth_document_type" NOT NULL,
	"document_id" uuid NOT NULL,
	"document_status_at_commit" varchar(32) NOT NULL,
	"commit_phase" "sales"."truth_binding_commit_phase" DEFAULT 'financial_commit' NOT NULL,
	"committed_at" timestamp with time zone NOT NULL,
	"locked_at" timestamp with time zone NOT NULL,
	"committed_by" integer NOT NULL,
	"price_truth_link_id" uuid,
	"currency_id" integer NOT NULL,
	"total_amount" numeric(14, 2) NOT NULL,
	"header_snapshot" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"line_snapshot" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"commission_snapshot_id" uuid,
	"supersedes_binding_id" uuid,
	"voided_at" timestamp with time zone,
	"voided_by" integer,
	"void_reason" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" integer NOT NULL,
	"updated_by" integer NOT NULL,
	CONSTRAINT "chk_sales_document_truth_bindings_total_non_negative" CHECK ("total_amount" >= 0),
	CONSTRAINT "chk_sales_document_truth_bindings_void_consistency" CHECK (("voided_at" IS NULL AND "commit_phase" NOT IN ('voided', 'superseded')) OR ("voided_at" IS NOT NULL AND "voided_by" IS NOT NULL AND "commit_phase" IN ('voided', 'superseded')))
);
--> statement-breakpoint
ALTER TABLE "sales"."document_truth_bindings" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "sales"."document_truth_bindings" ADD CONSTRAINT "fk_sales_document_truth_bindings_tenant" FOREIGN KEY ("tenant_id") REFERENCES "core"."tenants"("tenant_id") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "sales"."document_truth_bindings" ADD CONSTRAINT "fk_sales_document_truth_bindings_committed_by" FOREIGN KEY ("committed_by") REFERENCES "security"."users"("userId") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "sales"."document_truth_bindings" ADD CONSTRAINT "fk_sales_document_truth_bindings_price_truth_link" FOREIGN KEY ("price_truth_link_id") REFERENCES "sales"."document_truth_links"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "sales"."document_truth_bindings" ADD CONSTRAINT "fk_sales_document_truth_bindings_currency" FOREIGN KEY ("currency_id") REFERENCES "reference"."currencies"("currency_id") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "sales"."document_truth_bindings" ADD CONSTRAINT "fk_sales_document_truth_bindings_voided_by" FOREIGN KEY ("voided_by") REFERENCES "security"."users"("userId") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "sales"."document_truth_bindings" ADD CONSTRAINT "fk_sales_document_truth_bindings_supersedes" FOREIGN KEY ("supersedes_binding_id") REFERENCES "sales"."document_truth_bindings"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
CREATE UNIQUE INDEX "uq_sales_document_truth_bindings_active" ON "sales"."document_truth_bindings" ("tenant_id","document_type","document_id") WHERE "voided_at" IS NULL;--> statement-breakpoint
CREATE INDEX "idx_sales_document_truth_bindings_tenant" ON "sales"."document_truth_bindings" ("tenant_id");--> statement-breakpoint
CREATE INDEX "idx_sales_document_truth_bindings_document" ON "sales"."document_truth_bindings" ("tenant_id","document_type","document_id","committed_at");--> statement-breakpoint
CREATE INDEX "idx_sales_document_truth_bindings_price_link" ON "sales"."document_truth_bindings" ("tenant_id","price_truth_link_id");--> statement-breakpoint
CREATE POLICY "sales_document_truth_bindings_tenant_select" ON "sales"."document_truth_bindings" AS PERMISSIVE FOR SELECT TO "app_user" USING ("tenant_id" = NULLIF(current_setting('afenda.tenant_id', true), '')::int);--> statement-breakpoint
CREATE POLICY "sales_document_truth_bindings_tenant_insert" ON "sales"."document_truth_bindings" AS PERMISSIVE FOR INSERT TO "app_user" WITH CHECK ("tenant_id" = NULLIF(current_setting('afenda.tenant_id', true), '')::int);--> statement-breakpoint
CREATE POLICY "sales_document_truth_bindings_tenant_update" ON "sales"."document_truth_bindings" AS PERMISSIVE FOR UPDATE TO "app_user" USING ("tenant_id" = NULLIF(current_setting('afenda.tenant_id', true), '')::int) WITH CHECK ("tenant_id" = NULLIF(current_setting('afenda.tenant_id', true), '')::int);--> statement-breakpoint
CREATE POLICY "sales_document_truth_bindings_tenant_delete" ON "sales"."document_truth_bindings" AS PERMISSIVE FOR DELETE TO "app_user" USING ("tenant_id" = NULLIF(current_setting('afenda.tenant_id', true), '')::int);--> statement-breakpoint
CREATE POLICY "sales_document_truth_bindings_service_bypass" ON "sales"."document_truth_bindings" AS PERMISSIVE FOR ALL TO "service_role" USING (true) WITH CHECK (true);--> statement-breakpoint
ALTER TABLE "sales"."document_attachments" ADD COLUMN "truth_binding_id" uuid;--> statement-breakpoint
ALTER TABLE "sales"."accounting_postings" ADD COLUMN "truth_binding_id" uuid;--> statement-breakpoint
ALTER TABLE "sales"."price_resolutions" ADD COLUMN "truth_binding_id" uuid;--> statement-breakpoint
ALTER TABLE "sales"."commission_entries" ADD COLUMN "truth_binding_id" uuid;--> statement-breakpoint
CREATE INDEX "idx_sales_document_attachments_truth_binding" ON "sales"."document_attachments" ("tenant_id","truth_binding_id");--> statement-breakpoint
CREATE INDEX "idx_sales_accounting_postings_truth_binding" ON "sales"."accounting_postings" ("tenant_id","truth_binding_id");--> statement-breakpoint
CREATE INDEX "idx_sales_price_resolutions_truth_binding" ON "sales"."price_resolutions" ("tenant_id","truth_binding_id");--> statement-breakpoint
CREATE INDEX "idx_sales_commission_entries_truth_binding" ON "sales"."commission_entries" ("tenant_id","truth_binding_id");--> statement-breakpoint
ALTER TABLE "sales"."document_attachments" ADD CONSTRAINT "fk_sales_document_attachments_truth_binding" FOREIGN KEY ("truth_binding_id") REFERENCES "sales"."document_truth_bindings"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "sales"."accounting_postings" ADD CONSTRAINT "fk_sales_accounting_postings_truth_binding" FOREIGN KEY ("truth_binding_id") REFERENCES "sales"."document_truth_bindings"("id") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "sales"."commission_entries" ADD CONSTRAINT "fk_sales_commission_entries_truth_binding" FOREIGN KEY ("truth_binding_id") REFERENCES "sales"."document_truth_bindings"("id") ON DELETE set null ON UPDATE cascade;
