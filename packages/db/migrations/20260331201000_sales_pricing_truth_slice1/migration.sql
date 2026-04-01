CREATE TYPE "sales"."sales_truth_document_type" AS ENUM('sales_order');--> statement-breakpoint
ALTER TABLE "sales"."pricelist_items" ADD CONSTRAINT "chk_sales_pricelist_items_applied_on_scope" CHECK ((
        ("applied_on" = 'global' AND "product_tmpl_id" IS NULL AND "product_id" IS NULL AND "categ_id" IS NULL)
        OR ("applied_on" = 'product_template' AND "product_tmpl_id" IS NOT NULL AND "product_id" IS NULL AND "categ_id" IS NULL)
        OR ("applied_on" = 'product_variant' AND "product_id" IS NOT NULL AND "product_tmpl_id" IS NULL AND "categ_id" IS NULL)
        OR ("applied_on" = 'product_category' AND "categ_id" IS NOT NULL AND "product_tmpl_id" IS NULL AND "product_id" IS NULL)
      ));--> statement-breakpoint
CREATE TABLE "sales"."price_resolutions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" integer NOT NULL,
	"document_type" "sales"."sales_truth_document_type" NOT NULL,
	"document_id" uuid NOT NULL,
	"line_id" uuid NOT NULL,
	"resolution_version" integer DEFAULT 1 NOT NULL,
	"input_snapshot" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"applied_rule_ids" uuid[] DEFAULT '{}'::uuid[] NOT NULL,
	"base_price" numeric(14, 2) NOT NULL,
	"final_price" numeric(14, 2) NOT NULL,
	"currency_id" integer NOT NULL,
	"exchange_rate" numeric(18, 8),
	"exchange_rate_source" text,
	"override_approved_by" integer,
	"resolved_at" timestamp with time zone DEFAULT now() NOT NULL,
	"locked_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" integer NOT NULL,
	"updated_by" integer NOT NULL,
	CONSTRAINT "chk_sales_price_resolutions_base_non_negative" CHECK ("base_price" >= 0),
	CONSTRAINT "chk_sales_price_resolutions_final_non_negative" CHECK ("final_price" >= 0),
	CONSTRAINT "chk_sales_price_resolutions_locked_after_resolve" CHECK ("locked_at" IS NULL OR "locked_at" >= "resolved_at"),
	CONSTRAINT "chk_sales_price_resolutions_exchange_pair" CHECK (("exchange_rate" IS NULL AND "exchange_rate_source" IS NULL) OR ("exchange_rate" IS NOT NULL AND "exchange_rate_source" IS NOT NULL AND "exchange_rate" > 0)),
	CONSTRAINT "chk_sales_price_resolutions_override_above_base" CHECK ("final_price" <= "base_price" OR "override_approved_by" IS NOT NULL)
);--> statement-breakpoint
ALTER TABLE "sales"."price_resolutions" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "sales"."document_truth_links" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" integer NOT NULL,
	"document_type" "sales"."sales_truth_document_type" NOT NULL,
	"document_id" uuid NOT NULL,
	"pricelist_id" uuid NOT NULL,
	"currency_id" integer NOT NULL,
	"payment_term_id" uuid,
	"exchange_rate" numeric(18, 8),
	"exchange_rate_source" text,
	"locked_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" integer NOT NULL,
	"updated_by" integer NOT NULL,
	CONSTRAINT "chk_sales_document_truth_links_exchange_pair" CHECK (("exchange_rate" IS NULL AND "exchange_rate_source" IS NULL) OR ("exchange_rate" IS NOT NULL AND "exchange_rate_source" IS NOT NULL AND "exchange_rate" > 0))
);--> statement-breakpoint
ALTER TABLE "sales"."document_truth_links" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "sales"."price_resolutions" ADD CONSTRAINT "fk_sales_price_resolutions_tenant" FOREIGN KEY ("tenant_id") REFERENCES "core"."tenants"("tenant_id") ON DELETE RESTRICT ON UPDATE CASCADE;--> statement-breakpoint
ALTER TABLE "sales"."price_resolutions" ADD CONSTRAINT "fk_sales_price_resolutions_order" FOREIGN KEY ("document_id") REFERENCES "sales"."sales_orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;--> statement-breakpoint
ALTER TABLE "sales"."price_resolutions" ADD CONSTRAINT "fk_sales_price_resolutions_order_line" FOREIGN KEY ("line_id") REFERENCES "sales"."sales_order_lines"("id") ON DELETE CASCADE ON UPDATE CASCADE;--> statement-breakpoint
ALTER TABLE "sales"."price_resolutions" ADD CONSTRAINT "fk_sales_price_resolutions_currency" FOREIGN KEY ("currency_id") REFERENCES "reference"."currencies"("currency_id") ON DELETE RESTRICT ON UPDATE CASCADE;--> statement-breakpoint
ALTER TABLE "sales"."price_resolutions" ADD CONSTRAINT "fk_sales_price_resolutions_created_by" FOREIGN KEY ("created_by") REFERENCES "security"."users"("userId") ON DELETE RESTRICT ON UPDATE CASCADE;--> statement-breakpoint
ALTER TABLE "sales"."price_resolutions" ADD CONSTRAINT "fk_sales_price_resolutions_updated_by" FOREIGN KEY ("updated_by") REFERENCES "security"."users"("userId") ON DELETE RESTRICT ON UPDATE CASCADE;--> statement-breakpoint
ALTER TABLE "sales"."price_resolutions" ADD CONSTRAINT "fk_sales_price_resolutions_override_approved_by" FOREIGN KEY ("override_approved_by") REFERENCES "security"."users"("userId") ON DELETE SET NULL ON UPDATE CASCADE;--> statement-breakpoint
ALTER TABLE "sales"."document_truth_links" ADD CONSTRAINT "fk_sales_document_truth_links_tenant" FOREIGN KEY ("tenant_id") REFERENCES "core"."tenants"("tenant_id") ON DELETE RESTRICT ON UPDATE CASCADE;--> statement-breakpoint
ALTER TABLE "sales"."document_truth_links" ADD CONSTRAINT "fk_sales_document_truth_links_order" FOREIGN KEY ("document_id") REFERENCES "sales"."sales_orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;--> statement-breakpoint
ALTER TABLE "sales"."document_truth_links" ADD CONSTRAINT "fk_sales_document_truth_links_pricelist" FOREIGN KEY ("pricelist_id") REFERENCES "sales"."pricelists"("id") ON DELETE RESTRICT ON UPDATE CASCADE;--> statement-breakpoint
ALTER TABLE "sales"."document_truth_links" ADD CONSTRAINT "fk_sales_document_truth_links_currency" FOREIGN KEY ("currency_id") REFERENCES "reference"."currencies"("currency_id") ON DELETE RESTRICT ON UPDATE CASCADE;--> statement-breakpoint
ALTER TABLE "sales"."document_truth_links" ADD CONSTRAINT "fk_sales_document_truth_links_payment_term" FOREIGN KEY ("payment_term_id") REFERENCES "sales"."payment_terms"("id") ON DELETE SET NULL ON UPDATE CASCADE;--> statement-breakpoint
ALTER TABLE "sales"."document_truth_links" ADD CONSTRAINT "fk_sales_document_truth_links_created_by" FOREIGN KEY ("created_by") REFERENCES "security"."users"("userId") ON DELETE RESTRICT ON UPDATE CASCADE;--> statement-breakpoint
ALTER TABLE "sales"."document_truth_links" ADD CONSTRAINT "fk_sales_document_truth_links_updated_by" FOREIGN KEY ("updated_by") REFERENCES "security"."users"("userId") ON DELETE RESTRICT ON UPDATE CASCADE;--> statement-breakpoint
CREATE UNIQUE INDEX "uq_sales_price_resolutions_line_version" ON "sales"."price_resolutions" ("tenant_id","document_type","document_id","line_id","resolution_version");--> statement-breakpoint
CREATE INDEX "idx_sales_price_resolutions_tenant" ON "sales"."price_resolutions" ("tenant_id");--> statement-breakpoint
CREATE INDEX "idx_sales_price_resolutions_document" ON "sales"."price_resolutions" ("tenant_id","document_type","document_id");--> statement-breakpoint
CREATE INDEX "idx_sales_price_resolutions_line" ON "sales"."price_resolutions" ("tenant_id","line_id");--> statement-breakpoint
CREATE INDEX "idx_sales_price_resolutions_resolved" ON "sales"."price_resolutions" ("tenant_id","resolved_at");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_sales_document_truth_links_document" ON "sales"."document_truth_links" ("tenant_id","document_type","document_id");--> statement-breakpoint
CREATE INDEX "idx_sales_document_truth_links_tenant" ON "sales"."document_truth_links" ("tenant_id");--> statement-breakpoint
CREATE INDEX "idx_sales_document_truth_links_locked" ON "sales"."document_truth_links" ("tenant_id","locked_at");--> statement-breakpoint
CREATE POLICY "sales_price_resolutions_tenant_select" ON "sales"."price_resolutions" AS PERMISSIVE FOR SELECT TO "app_user" USING ("tenant_id" = NULLIF(current_setting('afenda.tenant_id', true), '')::int);--> statement-breakpoint
CREATE POLICY "sales_price_resolutions_tenant_insert" ON "sales"."price_resolutions" AS PERMISSIVE FOR INSERT TO "app_user" WITH CHECK ("tenant_id" = NULLIF(current_setting('afenda.tenant_id', true), '')::int);--> statement-breakpoint
CREATE POLICY "sales_price_resolutions_tenant_update" ON "sales"."price_resolutions" AS PERMISSIVE FOR UPDATE TO "app_user" USING ("tenant_id" = NULLIF(current_setting('afenda.tenant_id', true), '')::int) WITH CHECK ("tenant_id" = NULLIF(current_setting('afenda.tenant_id', true), '')::int);--> statement-breakpoint
CREATE POLICY "sales_price_resolutions_tenant_delete" ON "sales"."price_resolutions" AS PERMISSIVE FOR DELETE TO "app_user" USING ("tenant_id" = NULLIF(current_setting('afenda.tenant_id', true), '')::int);--> statement-breakpoint
CREATE POLICY "sales_price_resolutions_service_bypass" ON "sales"."price_resolutions" AS PERMISSIVE FOR ALL TO "service_role" USING (true) WITH CHECK (true);--> statement-breakpoint
CREATE POLICY "sales_document_truth_links_tenant_select" ON "sales"."document_truth_links" AS PERMISSIVE FOR SELECT TO "app_user" USING ("tenant_id" = NULLIF(current_setting('afenda.tenant_id', true), '')::int);--> statement-breakpoint
CREATE POLICY "sales_document_truth_links_tenant_insert" ON "sales"."document_truth_links" AS PERMISSIVE FOR INSERT TO "app_user" WITH CHECK ("tenant_id" = NULLIF(current_setting('afenda.tenant_id', true), '')::int);--> statement-breakpoint
CREATE POLICY "sales_document_truth_links_tenant_update" ON "sales"."document_truth_links" AS PERMISSIVE FOR UPDATE TO "app_user" USING ("tenant_id" = NULLIF(current_setting('afenda.tenant_id', true), '')::int) WITH CHECK ("tenant_id" = NULLIF(current_setting('afenda.tenant_id', true), '')::int);--> statement-breakpoint
CREATE POLICY "sales_document_truth_links_tenant_delete" ON "sales"."document_truth_links" AS PERMISSIVE FOR DELETE TO "app_user" USING ("tenant_id" = NULLIF(current_setting('afenda.tenant_id', true), '')::int);--> statement-breakpoint
CREATE POLICY "sales_document_truth_links_service_bypass" ON "sales"."document_truth_links" AS PERMISSIVE FOR ALL TO "service_role" USING (true) WITH CHECK (true);
