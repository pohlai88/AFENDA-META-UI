CREATE TYPE "sales"."truth_decision_type" AS ENUM('pricing', 'approval', 'accounting', 'inventory');--> statement-breakpoint
ALTER TABLE "sales"."domain_invariant_logs" ADD COLUMN "blocking" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "sales"."domain_event_logs" ADD COLUMN "caused_by_event_id" uuid;--> statement-breakpoint
ALTER TABLE "sales"."domain_event_logs" ADD COLUMN "correlation_id" varchar(128);--> statement-breakpoint
ALTER TABLE "sales"."domain_event_logs" ADD CONSTRAINT "fk_sales_domain_event_logs_caused_by" FOREIGN KEY ("caused_by_event_id") REFERENCES "sales"."domain_event_logs"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
CREATE INDEX "idx_sales_domain_event_logs_correlation" ON "sales"."domain_event_logs" ("tenant_id","correlation_id");--> statement-breakpoint
CREATE TABLE "sales"."truth_decision_locks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" integer NOT NULL,
	"truth_binding_id" uuid NOT NULL,
	"decision_type" "sales"."truth_decision_type" NOT NULL,
	"decision_hash" varchar(128) NOT NULL,
	"locked_at" timestamp with time zone DEFAULT now() NOT NULL,
	"locked_by" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" integer NOT NULL,
	"updated_by" integer NOT NULL
);
--> statement-breakpoint
ALTER TABLE "sales"."truth_decision_locks" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "sales"."truth_decision_locks" ADD CONSTRAINT "fk_sales_truth_decision_locks_tenant" FOREIGN KEY ("tenant_id") REFERENCES "core"."tenants"("tenant_id") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "sales"."truth_decision_locks" ADD CONSTRAINT "fk_sales_truth_decision_locks_truth_binding" FOREIGN KEY ("truth_binding_id") REFERENCES "sales"."document_truth_bindings"("id") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "sales"."truth_decision_locks" ADD CONSTRAINT "fk_sales_truth_decision_locks_locked_by" FOREIGN KEY ("locked_by") REFERENCES "security"."users"("userId") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
CREATE UNIQUE INDEX "uq_sales_truth_decision_locks_binding_type" ON "sales"."truth_decision_locks" ("tenant_id","truth_binding_id","decision_type");--> statement-breakpoint
CREATE INDEX "idx_sales_truth_decision_locks_tenant" ON "sales"."truth_decision_locks" ("tenant_id");--> statement-breakpoint
CREATE INDEX "idx_sales_truth_decision_locks_binding" ON "sales"."truth_decision_locks" ("tenant_id","truth_binding_id");--> statement-breakpoint
CREATE POLICY "sales_truth_decision_locks_tenant_select" ON "sales"."truth_decision_locks" AS PERMISSIVE FOR SELECT TO "app_user" USING ("tenant_id" = NULLIF(current_setting('afenda.tenant_id', true), '')::int);--> statement-breakpoint
CREATE POLICY "sales_truth_decision_locks_tenant_insert" ON "sales"."truth_decision_locks" AS PERMISSIVE FOR INSERT TO "app_user" WITH CHECK ("tenant_id" = NULLIF(current_setting('afenda.tenant_id', true), '')::int);--> statement-breakpoint
CREATE POLICY "sales_truth_decision_locks_tenant_update" ON "sales"."truth_decision_locks" AS PERMISSIVE FOR UPDATE TO "app_user" USING ("tenant_id" = NULLIF(current_setting('afenda.tenant_id', true), '')::int) WITH CHECK ("tenant_id" = NULLIF(current_setting('afenda.tenant_id', true), '')::int);--> statement-breakpoint
CREATE POLICY "sales_truth_decision_locks_tenant_delete" ON "sales"."truth_decision_locks" AS PERMISSIVE FOR DELETE TO "app_user" USING ("tenant_id" = NULLIF(current_setting('afenda.tenant_id', true), '')::int);--> statement-breakpoint
CREATE POLICY "sales_truth_decision_locks_service_bypass" ON "sales"."truth_decision_locks" AS PERMISSIVE FOR ALL TO "service_role" USING (true) WITH CHECK (true);--> statement-breakpoint
UPDATE "sales"."accounting_postings" AS ap
SET "truth_binding_id" = dtb."id"
FROM "sales"."document_truth_bindings" AS dtb
WHERE ap."truth_binding_id" IS NULL
  AND ap."posting_status" = 'posted'
  AND ap."source_document_type"::text = dtb."document_type"::text
  AND ap."source_document_id" = dtb."document_id"
  AND dtb."voided_at" IS NULL;--> statement-breakpoint
ALTER TABLE "sales"."accounting_postings" ADD CONSTRAINT "chk_sales_accounting_postings_posted_double_entry" CHECK ("posting_status" <> 'posted' OR ("debit_account_code" IS NOT NULL AND "credit_account_code" IS NOT NULL));--> statement-breakpoint
ALTER TABLE "sales"."accounting_postings" ADD CONSTRAINT "chk_sales_accounting_postings_posted_truth_anchor" CHECK ("posting_status" <> 'posted' OR "truth_binding_id" IS NOT NULL);--> statement-breakpoint
