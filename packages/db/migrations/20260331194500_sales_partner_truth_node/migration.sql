CREATE TYPE "sales"."partner_entity_type" AS ENUM('company','branch','contact');--> statement-breakpoint
CREATE TYPE "sales"."partner_reconciliation_status" AS ENUM('unmatched','matched','disputed','void');--> statement-breakpoint
ALTER TABLE "sales"."partners" ADD COLUMN "legal_name" text;--> statement-breakpoint
UPDATE "sales"."partners" SET "legal_name" = "name" WHERE "legal_name" IS NULL;--> statement-breakpoint
ALTER TABLE "sales"."partners" ALTER COLUMN "legal_name" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "sales"."partners" ADD COLUMN "display_name" text;--> statement-breakpoint
ALTER TABLE "sales"."partners" ADD COLUMN "entity_type" "sales"."partner_entity_type" DEFAULT 'company'::"sales"."partner_entity_type" NOT NULL;--> statement-breakpoint
ALTER TABLE "sales"."partners" ADD COLUMN "registration_number" text;--> statement-breakpoint
ALTER TABLE "sales"."partners" ADD COLUMN "external_ref" text;--> statement-breakpoint
CREATE UNIQUE INDEX "uq_sales_partners_tenant_id" ON "sales"."partners" ("tenant_id","id");--> statement-breakpoint
CREATE INDEX "idx_sales_partners_legal_name" ON "sales"."partners" ("tenant_id","legal_name");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_sales_partners_vat_tenant" ON "sales"."partners" ("tenant_id","vat") WHERE "vat" IS NOT NULL AND "deleted_at" IS NULL;--> statement-breakpoint
ALTER TABLE "sales"."partner_bank_accounts" ADD COLUMN "iban" text;--> statement-breakpoint
ALTER TABLE "sales"."partner_bank_accounts" ADD COLUMN "swift" varchar(22);--> statement-breakpoint
ALTER TABLE "sales"."partner_bank_accounts" ADD COLUMN "currency_id" integer;--> statement-breakpoint
CREATE INDEX "idx_sales_partner_bank_accounts_currency" ON "sales"."partner_bank_accounts" ("tenant_id","currency_id");--> statement-breakpoint
ALTER TABLE "sales"."partner_bank_accounts" ADD CONSTRAINT "fk_sales_partner_bank_accounts_currency" FOREIGN KEY ("currency_id") REFERENCES "reference"."currencies"("currency_id") ON DELETE SET NULL ON UPDATE CASCADE;--> statement-breakpoint
CREATE TABLE "sales"."partner_contact_snapshots" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" integer NOT NULL,
	"partner_id" uuid NOT NULL,
	"email" text,
	"phone" text,
	"website" text,
	"lang" text,
	"is_primary" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	"created_by" integer NOT NULL,
	"updated_by" integer NOT NULL
);--> statement-breakpoint
ALTER TABLE "sales"."partner_contact_snapshots" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "sales"."partner_address_snapshots" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" integer NOT NULL,
	"partner_id" uuid NOT NULL,
	"type" "sales"."address_type" DEFAULT 'contact'::"sales"."address_type" NOT NULL,
	"street" text,
	"street2" text,
	"city" text,
	"state_id" integer,
	"country_id" integer,
	"zip" text,
	"is_primary" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	"created_by" integer NOT NULL,
	"updated_by" integer NOT NULL
);--> statement-breakpoint
ALTER TABLE "sales"."partner_address_snapshots" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "sales"."partner_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" integer NOT NULL,
	"partner_id" uuid NOT NULL,
	"event_type" varchar(80) NOT NULL,
	"ref_id" uuid,
	"amount" numeric(14, 2),
	"currency_id" integer,
	"occurred_at" timestamp with time zone NOT NULL,
	"metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" integer NOT NULL,
	"updated_by" integer NOT NULL,
	CONSTRAINT "chk_sales_partner_events_amount_defined" CHECK ("amount" IS NULL OR "amount" >= 0)
);--> statement-breakpoint
ALTER TABLE "sales"."partner_events" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "sales"."partner_financial_projections" (
	"tenant_id" integer NOT NULL,
	"partner_id" uuid NOT NULL,
	"total_invoiced" numeric(14, 2) DEFAULT '0' NOT NULL,
	"total_paid" numeric(14, 2) DEFAULT '0' NOT NULL,
	"total_outstanding" numeric(14, 2) DEFAULT '0' NOT NULL,
	"credit_limit" numeric(14, 2) DEFAULT '0' NOT NULL,
	"last_updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "chk_sales_partner_financial_projections_totals_non_negative" CHECK ("total_invoiced" >= 0 AND "total_paid" >= 0 AND "total_outstanding" >= 0 AND "credit_limit" >= 0),
	CONSTRAINT "sales_partner_financial_projections_pkey" PRIMARY KEY("tenant_id","partner_id")
);--> statement-breakpoint
ALTER TABLE "sales"."partner_financial_projections" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "sales"."partner_reconciliation_links" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" integer NOT NULL,
	"partner_id" uuid NOT NULL,
	"source_type" varchar(64) NOT NULL,
	"source_id" uuid NOT NULL,
	"reconciliation_group_id" uuid,
	"status" "sales"."partner_reconciliation_status" DEFAULT 'unmatched'::"sales"."partner_reconciliation_status" NOT NULL,
	"matched_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" integer NOT NULL,
	"updated_by" integer NOT NULL
);--> statement-breakpoint
ALTER TABLE "sales"."partner_reconciliation_links" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "sales"."sales_orders" ADD COLUMN "invoice_address_snapshot" jsonb;--> statement-breakpoint
ALTER TABLE "sales"."sales_orders" ADD COLUMN "delivery_address_snapshot" jsonb;--> statement-breakpoint
ALTER TABLE "sales"."partner_contact_snapshots" ADD CONSTRAINT "fk_sales_partner_contact_snapshots_tenant" FOREIGN KEY ("tenant_id") REFERENCES "core"."tenants"("tenantId") ON DELETE RESTRICT ON UPDATE CASCADE;--> statement-breakpoint
ALTER TABLE "sales"."partner_contact_snapshots" ADD CONSTRAINT "fk_sales_partner_contact_snapshots_partner" FOREIGN KEY ("partner_id") REFERENCES "sales"."partners"("id") ON DELETE CASCADE ON UPDATE CASCADE;--> statement-breakpoint
ALTER TABLE "sales"."partner_contact_snapshots" ADD CONSTRAINT "fk_sales_partner_contact_snapshots_created_by" FOREIGN KEY ("created_by") REFERENCES "security"."users"("userId") ON DELETE RESTRICT ON UPDATE CASCADE;--> statement-breakpoint
ALTER TABLE "sales"."partner_contact_snapshots" ADD CONSTRAINT "fk_sales_partner_contact_snapshots_updated_by" FOREIGN KEY ("updated_by") REFERENCES "security"."users"("userId") ON DELETE RESTRICT ON UPDATE CASCADE;--> statement-breakpoint
ALTER TABLE "sales"."partner_address_snapshots" ADD CONSTRAINT "fk_sales_partner_address_snapshots_tenant" FOREIGN KEY ("tenant_id") REFERENCES "core"."tenants"("tenantId") ON DELETE RESTRICT ON UPDATE CASCADE;--> statement-breakpoint
ALTER TABLE "sales"."partner_address_snapshots" ADD CONSTRAINT "fk_sales_partner_address_snapshots_partner" FOREIGN KEY ("partner_id") REFERENCES "sales"."partners"("id") ON DELETE CASCADE ON UPDATE CASCADE;--> statement-breakpoint
ALTER TABLE "sales"."partner_address_snapshots" ADD CONSTRAINT "fk_sales_partner_address_snapshots_state" FOREIGN KEY ("state_id") REFERENCES "reference"."states"("state_id") ON DELETE SET NULL ON UPDATE CASCADE;--> statement-breakpoint
ALTER TABLE "sales"."partner_address_snapshots" ADD CONSTRAINT "fk_sales_partner_address_snapshots_country" FOREIGN KEY ("country_id") REFERENCES "reference"."countries"("country_id") ON DELETE SET NULL ON UPDATE CASCADE;--> statement-breakpoint
ALTER TABLE "sales"."partner_address_snapshots" ADD CONSTRAINT "fk_sales_partner_address_snapshots_created_by" FOREIGN KEY ("created_by") REFERENCES "security"."users"("userId") ON DELETE RESTRICT ON UPDATE CASCADE;--> statement-breakpoint
ALTER TABLE "sales"."partner_address_snapshots" ADD CONSTRAINT "fk_sales_partner_address_snapshots_updated_by" FOREIGN KEY ("updated_by") REFERENCES "security"."users"("userId") ON DELETE RESTRICT ON UPDATE CASCADE;--> statement-breakpoint
ALTER TABLE "sales"."partner_events" ADD CONSTRAINT "fk_sales_partner_events_tenant" FOREIGN KEY ("tenant_id") REFERENCES "core"."tenants"("tenantId") ON DELETE RESTRICT ON UPDATE CASCADE;--> statement-breakpoint
ALTER TABLE "sales"."partner_events" ADD CONSTRAINT "fk_sales_partner_events_partner" FOREIGN KEY ("partner_id") REFERENCES "sales"."partners"("id") ON DELETE CASCADE ON UPDATE CASCADE;--> statement-breakpoint
ALTER TABLE "sales"."partner_events" ADD CONSTRAINT "fk_sales_partner_events_currency" FOREIGN KEY ("currency_id") REFERENCES "reference"."currencies"("currency_id") ON DELETE SET NULL ON UPDATE CASCADE;--> statement-breakpoint
ALTER TABLE "sales"."partner_events" ADD CONSTRAINT "fk_sales_partner_events_created_by" FOREIGN KEY ("created_by") REFERENCES "security"."users"("userId") ON DELETE RESTRICT ON UPDATE CASCADE;--> statement-breakpoint
ALTER TABLE "sales"."partner_events" ADD CONSTRAINT "fk_sales_partner_events_updated_by" FOREIGN KEY ("updated_by") REFERENCES "security"."users"("userId") ON DELETE RESTRICT ON UPDATE CASCADE;--> statement-breakpoint
ALTER TABLE "sales"."partner_financial_projections" ADD CONSTRAINT "fk_sales_partner_financial_projections_partner" FOREIGN KEY ("tenant_id","partner_id") REFERENCES "sales"."partners"("tenant_id","id") ON DELETE CASCADE ON UPDATE CASCADE;--> statement-breakpoint
ALTER TABLE "sales"."partner_financial_projections" ADD CONSTRAINT "fk_sales_partner_financial_projections_partner_id" FOREIGN KEY ("partner_id") REFERENCES "sales"."partners"("id") ON DELETE CASCADE ON UPDATE CASCADE;--> statement-breakpoint
ALTER TABLE "sales"."partner_reconciliation_links" ADD CONSTRAINT "fk_sales_partner_reconciliation_links_tenant" FOREIGN KEY ("tenant_id") REFERENCES "core"."tenants"("tenantId") ON DELETE RESTRICT ON UPDATE CASCADE;--> statement-breakpoint
ALTER TABLE "sales"."partner_reconciliation_links" ADD CONSTRAINT "fk_sales_partner_reconciliation_links_partner" FOREIGN KEY ("partner_id") REFERENCES "sales"."partners"("id") ON DELETE CASCADE ON UPDATE CASCADE;--> statement-breakpoint
ALTER TABLE "sales"."partner_reconciliation_links" ADD CONSTRAINT "fk_sales_partner_reconciliation_links_created_by" FOREIGN KEY ("created_by") REFERENCES "security"."users"("userId") ON DELETE RESTRICT ON UPDATE CASCADE;--> statement-breakpoint
ALTER TABLE "sales"."partner_reconciliation_links" ADD CONSTRAINT "fk_sales_partner_reconciliation_links_updated_by" FOREIGN KEY ("updated_by") REFERENCES "security"."users"("userId") ON DELETE RESTRICT ON UPDATE CASCADE;--> statement-breakpoint
CREATE INDEX "idx_sales_partner_contact_snapshots_tenant" ON "sales"."partner_contact_snapshots" ("tenant_id");--> statement-breakpoint
CREATE INDEX "idx_sales_partner_contact_snapshots_partner" ON "sales"."partner_contact_snapshots" ("tenant_id","partner_id");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_sales_partner_contact_snapshots_primary" ON "sales"."partner_contact_snapshots" ("tenant_id","partner_id") WHERE "deleted_at" IS NULL AND "is_primary" = true;--> statement-breakpoint
CREATE INDEX "idx_sales_partner_address_snapshots_tenant" ON "sales"."partner_address_snapshots" ("tenant_id");--> statement-breakpoint
CREATE INDEX "idx_sales_partner_address_snapshots_partner" ON "sales"."partner_address_snapshots" ("tenant_id","partner_id","type");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_sales_partner_address_snapshots_primary_type" ON "sales"."partner_address_snapshots" ("tenant_id","partner_id","type") WHERE "deleted_at" IS NULL AND "is_primary" = true;--> statement-breakpoint
CREATE INDEX "idx_sales_partner_events_tenant" ON "sales"."partner_events" ("tenant_id");--> statement-breakpoint
CREATE INDEX "idx_sales_partner_events_partner_time" ON "sales"."partner_events" ("tenant_id","partner_id","occurred_at");--> statement-breakpoint
CREATE INDEX "idx_sales_partner_events_type" ON "sales"."partner_events" ("tenant_id","event_type");--> statement-breakpoint
CREATE INDEX "idx_sales_partner_financial_projections_tenant" ON "sales"."partner_financial_projections" ("tenant_id");--> statement-breakpoint
CREATE INDEX "idx_sales_partner_reconciliation_links_tenant" ON "sales"."partner_reconciliation_links" ("tenant_id");--> statement-breakpoint
CREATE INDEX "idx_sales_partner_reconciliation_links_partner" ON "sales"."partner_reconciliation_links" ("tenant_id","partner_id");--> statement-breakpoint
CREATE INDEX "idx_sales_partner_reconciliation_links_group" ON "sales"."partner_reconciliation_links" ("tenant_id","reconciliation_group_id");--> statement-breakpoint
CREATE INDEX "idx_sales_partner_reconciliation_links_source" ON "sales"."partner_reconciliation_links" ("tenant_id","source_type","source_id");--> statement-breakpoint
CREATE POLICY "sales_partner_contact_snapshots_tenant_select" ON "sales"."partner_contact_snapshots" AS PERMISSIVE FOR SELECT TO "app_user" USING ("tenant_id" = NULLIF(current_setting('afenda.tenant_id', true), '')::int);--> statement-breakpoint
CREATE POLICY "sales_partner_contact_snapshots_tenant_insert" ON "sales"."partner_contact_snapshots" AS PERMISSIVE FOR INSERT TO "app_user" WITH CHECK ("tenant_id" = NULLIF(current_setting('afenda.tenant_id', true), '')::int);--> statement-breakpoint
CREATE POLICY "sales_partner_contact_snapshots_tenant_update" ON "sales"."partner_contact_snapshots" AS PERMISSIVE FOR UPDATE TO "app_user" USING ("tenant_id" = NULLIF(current_setting('afenda.tenant_id', true), '')::int) WITH CHECK ("tenant_id" = NULLIF(current_setting('afenda.tenant_id', true), '')::int);--> statement-breakpoint
CREATE POLICY "sales_partner_contact_snapshots_tenant_delete" ON "sales"."partner_contact_snapshots" AS PERMISSIVE FOR DELETE TO "app_user" USING ("tenant_id" = NULLIF(current_setting('afenda.tenant_id', true), '')::int);--> statement-breakpoint
CREATE POLICY "sales_partner_contact_snapshots_service_bypass" ON "sales"."partner_contact_snapshots" AS PERMISSIVE FOR ALL TO "service_role" USING (true) WITH CHECK (true);--> statement-breakpoint
CREATE POLICY "sales_partner_address_snapshots_tenant_select" ON "sales"."partner_address_snapshots" AS PERMISSIVE FOR SELECT TO "app_user" USING ("tenant_id" = NULLIF(current_setting('afenda.tenant_id', true), '')::int);--> statement-breakpoint
CREATE POLICY "sales_partner_address_snapshots_tenant_insert" ON "sales"."partner_address_snapshots" AS PERMISSIVE FOR INSERT TO "app_user" WITH CHECK ("tenant_id" = NULLIF(current_setting('afenda.tenant_id', true), '')::int);--> statement-breakpoint
CREATE POLICY "sales_partner_address_snapshots_tenant_update" ON "sales"."partner_address_snapshots" AS PERMISSIVE FOR UPDATE TO "app_user" USING ("tenant_id" = NULLIF(current_setting('afenda.tenant_id', true), '')::int) WITH CHECK ("tenant_id" = NULLIF(current_setting('afenda.tenant_id', true), '')::int);--> statement-breakpoint
CREATE POLICY "sales_partner_address_snapshots_tenant_delete" ON "sales"."partner_address_snapshots" AS PERMISSIVE FOR DELETE TO "app_user" USING ("tenant_id" = NULLIF(current_setting('afenda.tenant_id', true), '')::int);--> statement-breakpoint
CREATE POLICY "sales_partner_address_snapshots_service_bypass" ON "sales"."partner_address_snapshots" AS PERMISSIVE FOR ALL TO "service_role" USING (true) WITH CHECK (true);--> statement-breakpoint
CREATE POLICY "sales_partner_events_tenant_select" ON "sales"."partner_events" AS PERMISSIVE FOR SELECT TO "app_user" USING ("tenant_id" = NULLIF(current_setting('afenda.tenant_id', true), '')::int);--> statement-breakpoint
CREATE POLICY "sales_partner_events_tenant_insert" ON "sales"."partner_events" AS PERMISSIVE FOR INSERT TO "app_user" WITH CHECK ("tenant_id" = NULLIF(current_setting('afenda.tenant_id', true), '')::int);--> statement-breakpoint
CREATE POLICY "sales_partner_events_tenant_update" ON "sales"."partner_events" AS PERMISSIVE FOR UPDATE TO "app_user" USING ("tenant_id" = NULLIF(current_setting('afenda.tenant_id', true), '')::int) WITH CHECK ("tenant_id" = NULLIF(current_setting('afenda.tenant_id', true), '')::int);--> statement-breakpoint
CREATE POLICY "sales_partner_events_tenant_delete" ON "sales"."partner_events" AS PERMISSIVE FOR DELETE TO "app_user" USING ("tenant_id" = NULLIF(current_setting('afenda.tenant_id', true), '')::int);--> statement-breakpoint
CREATE POLICY "sales_partner_events_service_bypass" ON "sales"."partner_events" AS PERMISSIVE FOR ALL TO "service_role" USING (true) WITH CHECK (true);--> statement-breakpoint
CREATE POLICY "sales_partner_financial_projections_tenant_select" ON "sales"."partner_financial_projections" AS PERMISSIVE FOR SELECT TO "app_user" USING ("tenant_id" = NULLIF(current_setting('afenda.tenant_id', true), '')::int);--> statement-breakpoint
CREATE POLICY "sales_partner_financial_projections_tenant_insert" ON "sales"."partner_financial_projections" AS PERMISSIVE FOR INSERT TO "app_user" WITH CHECK ("tenant_id" = NULLIF(current_setting('afenda.tenant_id', true), '')::int);--> statement-breakpoint
CREATE POLICY "sales_partner_financial_projections_tenant_update" ON "sales"."partner_financial_projections" AS PERMISSIVE FOR UPDATE TO "app_user" USING ("tenant_id" = NULLIF(current_setting('afenda.tenant_id', true), '')::int) WITH CHECK ("tenant_id" = NULLIF(current_setting('afenda.tenant_id', true), '')::int);--> statement-breakpoint
CREATE POLICY "sales_partner_financial_projections_tenant_delete" ON "sales"."partner_financial_projections" AS PERMISSIVE FOR DELETE TO "app_user" USING ("tenant_id" = NULLIF(current_setting('afenda.tenant_id', true), '')::int);--> statement-breakpoint
CREATE POLICY "sales_partner_financial_projections_service_bypass" ON "sales"."partner_financial_projections" AS PERMISSIVE FOR ALL TO "service_role" USING (true) WITH CHECK (true);--> statement-breakpoint
CREATE POLICY "sales_partner_reconciliation_links_tenant_select" ON "sales"."partner_reconciliation_links" AS PERMISSIVE FOR SELECT TO "app_user" USING ("tenant_id" = NULLIF(current_setting('afenda.tenant_id', true), '')::int);--> statement-breakpoint
CREATE POLICY "sales_partner_reconciliation_links_tenant_insert" ON "sales"."partner_reconciliation_links" AS PERMISSIVE FOR INSERT TO "app_user" WITH CHECK ("tenant_id" = NULLIF(current_setting('afenda.tenant_id', true), '')::int);--> statement-breakpoint
CREATE POLICY "sales_partner_reconciliation_links_tenant_update" ON "sales"."partner_reconciliation_links" AS PERMISSIVE FOR UPDATE TO "app_user" USING ("tenant_id" = NULLIF(current_setting('afenda.tenant_id', true), '')::int) WITH CHECK ("tenant_id" = NULLIF(current_setting('afenda.tenant_id', true), '')::int);--> statement-breakpoint
CREATE POLICY "sales_partner_reconciliation_links_tenant_delete" ON "sales"."partner_reconciliation_links" AS PERMISSIVE FOR DELETE TO "app_user" USING ("tenant_id" = NULLIF(current_setting('afenda.tenant_id', true), '')::int);--> statement-breakpoint
CREATE POLICY "sales_partner_reconciliation_links_service_bypass" ON "sales"."partner_reconciliation_links" AS PERMISSIVE FOR ALL TO "service_role" USING (true) WITH CHECK (true);
