-- Expand commercial document enum (shared across governance + pricing truth).
ALTER TYPE "sales"."sales_truth_document_type" ADD VALUE IF NOT EXISTS 'return_order';--> statement-breakpoint
ALTER TYPE "sales"."sales_truth_document_type" ADD VALUE IF NOT EXISTS 'subscription';--> statement-breakpoint
ALTER TYPE "sales"."sales_truth_document_type" ADD VALUE IF NOT EXISTS 'consignment_stock_report';--> statement-breakpoint
ALTER TYPE "sales"."sales_truth_document_type" ADD VALUE IF NOT EXISTS 'consignment_agreement';--> statement-breakpoint
ALTER TYPE "sales"."sales_truth_document_type" ADD VALUE IF NOT EXISTS 'invoice';--> statement-breakpoint
ALTER TYPE "sales"."sales_truth_document_type" ADD VALUE IF NOT EXISTS 'credit_note';--> statement-breakpoint
ALTER TYPE "sales"."sales_truth_document_type" ADD VALUE IF NOT EXISTS 'other';--> statement-breakpoint

-- Migrate governance / pricing text columns to enum (unknown → other).
ALTER TABLE "sales"."document_status_history" ALTER COLUMN "document_type" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "sales"."document_status_history" ALTER COLUMN "document_type" TYPE "sales"."sales_truth_document_type" USING (
  CASE lower(btrim("document_type"::text))
    WHEN 'sales_order' THEN 'sales_order'::"sales"."sales_truth_document_type"
    WHEN 'return_order' THEN 'return_order'::"sales"."sales_truth_document_type"
    WHEN 'subscription' THEN 'subscription'::"sales"."sales_truth_document_type"
    WHEN 'consignment_stock_report' THEN 'consignment_stock_report'::"sales"."sales_truth_document_type"
    WHEN 'consignment_agreement' THEN 'consignment_agreement'::"sales"."sales_truth_document_type"
    WHEN 'invoice' THEN 'invoice'::"sales"."sales_truth_document_type"
    WHEN 'credit_note' THEN 'credit_note'::"sales"."sales_truth_document_type"
    ELSE 'other'::"sales"."sales_truth_document_type"
  END
);--> statement-breakpoint

ALTER TABLE "sales"."document_approvals" ALTER COLUMN "document_type" TYPE "sales"."sales_truth_document_type" USING (
  CASE lower(btrim("document_type"::text))
    WHEN 'sales_order' THEN 'sales_order'::"sales"."sales_truth_document_type"
    WHEN 'return_order' THEN 'return_order'::"sales"."sales_truth_document_type"
    WHEN 'subscription' THEN 'subscription'::"sales"."sales_truth_document_type"
    WHEN 'consignment_stock_report' THEN 'consignment_stock_report'::"sales"."sales_truth_document_type"
    WHEN 'consignment_agreement' THEN 'consignment_agreement'::"sales"."sales_truth_document_type"
    WHEN 'invoice' THEN 'invoice'::"sales"."sales_truth_document_type"
    WHEN 'credit_note' THEN 'credit_note'::"sales"."sales_truth_document_type"
    ELSE 'other'::"sales"."sales_truth_document_type"
  END
);--> statement-breakpoint

ALTER TABLE "sales"."document_attachments" ALTER COLUMN "document_type" TYPE "sales"."sales_truth_document_type" USING (
  CASE lower(btrim("document_type"::text))
    WHEN 'sales_order' THEN 'sales_order'::"sales"."sales_truth_document_type"
    WHEN 'return_order' THEN 'return_order'::"sales"."sales_truth_document_type"
    WHEN 'subscription' THEN 'subscription'::"sales"."sales_truth_document_type"
    WHEN 'consignment_stock_report' THEN 'consignment_stock_report'::"sales"."sales_truth_document_type"
    WHEN 'consignment_agreement' THEN 'consignment_agreement'::"sales"."sales_truth_document_type"
    WHEN 'invoice' THEN 'invoice'::"sales"."sales_truth_document_type"
    WHEN 'credit_note' THEN 'credit_note'::"sales"."sales_truth_document_type"
    ELSE 'other'::"sales"."sales_truth_document_type"
  END
);--> statement-breakpoint

ALTER TABLE "sales"."accounting_postings" ALTER COLUMN "source_document_type" TYPE "sales"."sales_truth_document_type" USING (
  CASE lower(btrim("source_document_type"::text))
    WHEN 'sales_order' THEN 'sales_order'::"sales"."sales_truth_document_type"
    WHEN 'return_order' THEN 'return_order'::"sales"."sales_truth_document_type"
    WHEN 'subscription' THEN 'subscription'::"sales"."sales_truth_document_type"
    WHEN 'consignment_stock_report' THEN 'consignment_stock_report'::"sales"."sales_truth_document_type"
    WHEN 'consignment_agreement' THEN 'consignment_agreement'::"sales"."sales_truth_document_type"
    WHEN 'invoice' THEN 'invoice'::"sales"."sales_truth_document_type"
    WHEN 'credit_note' THEN 'credit_note'::"sales"."sales_truth_document_type"
    ELSE 'other'::"sales"."sales_truth_document_type"
  END
);--> statement-breakpoint

ALTER TABLE "sales"."line_item_discounts" ALTER COLUMN "document_type" TYPE "sales"."sales_truth_document_type" USING (
  CASE lower(btrim("document_type"::text))
    WHEN 'sales_order' THEN 'sales_order'::"sales"."sales_truth_document_type"
    WHEN 'return_order' THEN 'return_order'::"sales"."sales_truth_document_type"
    WHEN 'subscription' THEN 'subscription'::"sales"."sales_truth_document_type"
    WHEN 'consignment_stock_report' THEN 'consignment_stock_report'::"sales"."sales_truth_document_type"
    WHEN 'consignment_agreement' THEN 'consignment_agreement'::"sales"."sales_truth_document_type"
    WHEN 'invoice' THEN 'invoice'::"sales"."sales_truth_document_type"
    WHEN 'credit_note' THEN 'credit_note'::"sales"."sales_truth_document_type"
    ELSE 'other'::"sales"."sales_truth_document_type"
  END
);--> statement-breakpoint

CREATE TYPE "sales"."journal_entry_status" AS ENUM('draft', 'posted', 'reversed');--> statement-breakpoint
CREATE TABLE "sales"."journal_entries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" integer NOT NULL,
	"entry_date" timestamp with time zone NOT NULL,
	"description" text,
	"reference" varchar(120),
	"currency_code" varchar(3) NOT NULL,
	"truth_binding_id" uuid,
	"status" "sales"."journal_entry_status" DEFAULT 'draft' NOT NULL,
	"reversal_journal_entry_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" integer NOT NULL,
	"updated_by" integer NOT NULL,
	CONSTRAINT "chk_sales_journal_entries_reversal_not_self" CHECK ("reversal_journal_entry_id" IS NULL OR "reversal_journal_entry_id" <> "id")
);
--> statement-breakpoint
ALTER TABLE "sales"."journal_entries" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "sales"."journal_entries" ADD CONSTRAINT "fk_sales_journal_entries_tenant" FOREIGN KEY ("tenant_id") REFERENCES "core"."tenants"("tenant_id") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "sales"."journal_entries" ADD CONSTRAINT "fk_sales_journal_entries_truth_binding" FOREIGN KEY ("truth_binding_id") REFERENCES "sales"."document_truth_bindings"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "sales"."journal_entries" ADD CONSTRAINT "fk_sales_journal_entries_reversal" FOREIGN KEY ("reversal_journal_entry_id") REFERENCES "sales"."journal_entries"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "sales"."journal_entries" ADD CONSTRAINT "fk_sales_journal_entries_created_by" FOREIGN KEY ("created_by") REFERENCES "security"."users"("userId") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "sales"."journal_entries" ADD CONSTRAINT "fk_sales_journal_entries_updated_by" FOREIGN KEY ("updated_by") REFERENCES "security"."users"("userId") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
CREATE INDEX "idx_sales_journal_entries_tenant" ON "sales"."journal_entries" ("tenant_id");--> statement-breakpoint
CREATE INDEX "idx_sales_journal_entries_date" ON "sales"."journal_entries" ("tenant_id","entry_date");--> statement-breakpoint
CREATE INDEX "idx_sales_journal_entries_truth_binding" ON "sales"."journal_entries" ("tenant_id","truth_binding_id");--> statement-breakpoint
CREATE INDEX "idx_sales_journal_entries_status" ON "sales"."journal_entries" ("tenant_id","status");--> statement-breakpoint
CREATE POLICY "sales_journal_entries_tenant_select" ON "sales"."journal_entries" AS PERMISSIVE FOR SELECT TO "app_user" USING ("tenant_id" = NULLIF(current_setting('afenda.tenant_id', true), '')::int);--> statement-breakpoint
CREATE POLICY "sales_journal_entries_tenant_insert" ON "sales"."journal_entries" AS PERMISSIVE FOR INSERT TO "app_user" WITH CHECK ("tenant_id" = NULLIF(current_setting('afenda.tenant_id', true), '')::int);--> statement-breakpoint
CREATE POLICY "sales_journal_entries_tenant_update" ON "sales"."journal_entries" AS PERMISSIVE FOR UPDATE TO "app_user" USING ("tenant_id" = NULLIF(current_setting('afenda.tenant_id', true), '')::int) WITH CHECK ("tenant_id" = NULLIF(current_setting('afenda.tenant_id', true), '')::int);--> statement-breakpoint
CREATE POLICY "sales_journal_entries_tenant_delete" ON "sales"."journal_entries" AS PERMISSIVE FOR DELETE TO "app_user" USING ("tenant_id" = NULLIF(current_setting('afenda.tenant_id', true), '')::int);--> statement-breakpoint
CREATE POLICY "sales_journal_entries_service_bypass" ON "sales"."journal_entries" AS PERMISSIVE FOR ALL TO "service_role" USING (true) WITH CHECK (true);--> statement-breakpoint

CREATE TABLE "sales"."journal_lines" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" integer NOT NULL,
	"journal_entry_id" uuid NOT NULL,
	"line_no" integer NOT NULL,
	"account_code" varchar(64) NOT NULL,
	"debit_amount" numeric(14, 2) DEFAULT '0' NOT NULL,
	"credit_amount" numeric(14, 2) DEFAULT '0' NOT NULL,
	"memo" text,
	"dimensions" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" integer NOT NULL,
	"updated_by" integer NOT NULL,
	CONSTRAINT "chk_sales_journal_lines_debit_non_negative" CHECK ("debit_amount" >= 0),
	CONSTRAINT "chk_sales_journal_lines_credit_non_negative" CHECK ("credit_amount" >= 0),
	CONSTRAINT "chk_sales_journal_lines_one_sided" CHECK (("debit_amount" > 0 AND "credit_amount" = 0) OR ("credit_amount" > 0 AND "debit_amount" = 0))
);
--> statement-breakpoint
ALTER TABLE "sales"."journal_lines" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "sales"."journal_lines" ADD CONSTRAINT "fk_sales_journal_lines_tenant" FOREIGN KEY ("tenant_id") REFERENCES "core"."tenants"("tenant_id") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "sales"."journal_lines" ADD CONSTRAINT "fk_sales_journal_lines_journal_entry" FOREIGN KEY ("journal_entry_id") REFERENCES "sales"."journal_entries"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "sales"."journal_lines" ADD CONSTRAINT "fk_sales_journal_lines_created_by" FOREIGN KEY ("created_by") REFERENCES "security"."users"("userId") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "sales"."journal_lines" ADD CONSTRAINT "fk_sales_journal_lines_updated_by" FOREIGN KEY ("updated_by") REFERENCES "security"."users"("userId") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
CREATE UNIQUE INDEX "uq_sales_journal_lines_entry_line" ON "sales"."journal_lines" ("tenant_id","journal_entry_id","line_no");--> statement-breakpoint
CREATE INDEX "idx_sales_journal_lines_tenant" ON "sales"."journal_lines" ("tenant_id");--> statement-breakpoint
CREATE INDEX "idx_sales_journal_lines_entry" ON "sales"."journal_lines" ("tenant_id","journal_entry_id");--> statement-breakpoint
CREATE INDEX "idx_sales_journal_lines_account" ON "sales"."journal_lines" ("tenant_id","account_code");--> statement-breakpoint
CREATE POLICY "sales_journal_lines_tenant_select" ON "sales"."journal_lines" AS PERMISSIVE FOR SELECT TO "app_user" USING ("tenant_id" = NULLIF(current_setting('afenda.tenant_id', true), '')::int);--> statement-breakpoint
CREATE POLICY "sales_journal_lines_tenant_insert" ON "sales"."journal_lines" AS PERMISSIVE FOR INSERT TO "app_user" WITH CHECK ("tenant_id" = NULLIF(current_setting('afenda.tenant_id', true), '')::int);--> statement-breakpoint
CREATE POLICY "sales_journal_lines_tenant_update" ON "sales"."journal_lines" AS PERMISSIVE FOR UPDATE TO "app_user" USING ("tenant_id" = NULLIF(current_setting('afenda.tenant_id', true), '')::int) WITH CHECK ("tenant_id" = NULLIF(current_setting('afenda.tenant_id', true), '')::int);--> statement-breakpoint
CREATE POLICY "sales_journal_lines_tenant_delete" ON "sales"."journal_lines" AS PERMISSIVE FOR DELETE TO "app_user" USING ("tenant_id" = NULLIF(current_setting('afenda.tenant_id', true), '')::int);--> statement-breakpoint
CREATE POLICY "sales_journal_lines_service_bypass" ON "sales"."journal_lines" AS PERMISSIVE FOR ALL TO "service_role" USING (true) WITH CHECK (true);--> statement-breakpoint

ALTER TABLE "sales"."accounting_postings" ADD CONSTRAINT "fk_sales_accounting_postings_journal_entry" FOREIGN KEY ("journal_entry_id") REFERENCES "sales"."journal_entries"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "sales"."price_resolutions" ADD CONSTRAINT "fk_sales_price_resolutions_truth_binding" FOREIGN KEY ("truth_binding_id") REFERENCES "sales"."document_truth_bindings"("id") ON DELETE set null ON UPDATE cascade;
