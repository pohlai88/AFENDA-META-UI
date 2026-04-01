CREATE TYPE "sales"."partner_event_type" AS ENUM(
	'partner_created',
	'partner_activated',
	'partner_deactivated',
	'partner_blocked',
	'partner_unblocked',
	'credit_limit_changed',
	'invoice_posted',
	'invoice_voided',
	'payment_received',
	'payment_applied',
	'credit_note_posted',
	'refund_posted',
	'reconciliation_adjustment',
	'external_sync'
);--> statement-breakpoint
CREATE TYPE "sales"."partner_event_accounting_impact" AS ENUM(
	'none',
	'increase_receivable',
	'decrease_receivable',
	'increase_payable',
	'decrease_payable'
);--> statement-breakpoint
ALTER TABLE "sales"."partner_financial_projections" ADD COLUMN "last_processed_event_id" uuid;--> statement-breakpoint
ALTER TABLE "sales"."partner_financial_projections" ADD COLUMN "last_rebuild_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "sales"."partner_events" ADD COLUMN "event_schema_version" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "sales"."partner_events" ADD COLUMN "truth_binding_id" uuid;--> statement-breakpoint
ALTER TABLE "sales"."partner_events" ADD COLUMN "accounting_impact" "sales"."partner_event_accounting_impact" DEFAULT 'none'::"sales"."partner_event_accounting_impact" NOT NULL;--> statement-breakpoint
ALTER TABLE "sales"."partner_events" ADD COLUMN "event_type_new" "sales"."partner_event_type";--> statement-breakpoint
UPDATE "sales"."partner_events" SET "event_type_new" = CASE lower(trim(both from "event_type"::text))
	WHEN 'partner_created' THEN 'partner_created'::"sales"."partner_event_type"
	WHEN 'partner_activated' THEN 'partner_activated'::"sales"."partner_event_type"
	WHEN 'partner_deactivated' THEN 'partner_deactivated'::"sales"."partner_event_type"
	WHEN 'partner_blocked' THEN 'partner_blocked'::"sales"."partner_event_type"
	WHEN 'partner_unblocked' THEN 'partner_unblocked'::"sales"."partner_event_type"
	WHEN 'credit_limit_changed' THEN 'credit_limit_changed'::"sales"."partner_event_type"
	WHEN 'invoice_posted' THEN 'invoice_posted'::"sales"."partner_event_type"
	WHEN 'invoice_voided' THEN 'invoice_voided'::"sales"."partner_event_type"
	WHEN 'payment_received' THEN 'payment_received'::"sales"."partner_event_type"
	WHEN 'payment_applied' THEN 'payment_applied'::"sales"."partner_event_type"
	WHEN 'credit_note_posted' THEN 'credit_note_posted'::"sales"."partner_event_type"
	WHEN 'refund_posted' THEN 'refund_posted'::"sales"."partner_event_type"
	WHEN 'reconciliation_adjustment' THEN 'reconciliation_adjustment'::"sales"."partner_event_type"
	WHEN 'external_sync' THEN 'external_sync'::"sales"."partner_event_type"
	ELSE 'reconciliation_adjustment'::"sales"."partner_event_type"
END;--> statement-breakpoint
UPDATE "sales"."partner_events" SET "event_type_new" = 'reconciliation_adjustment'::"sales"."partner_event_type"
WHERE "event_type_new" IN (
	'invoice_posted'::"sales"."partner_event_type",
	'invoice_voided'::"sales"."partner_event_type",
	'credit_note_posted'::"sales"."partner_event_type"
) AND "truth_binding_id" IS NULL;--> statement-breakpoint
UPDATE "sales"."partner_events" SET "accounting_impact" = CASE "event_type_new"::text
	WHEN 'partner_created' THEN 'none'::"sales"."partner_event_accounting_impact"
	WHEN 'partner_activated' THEN 'none'::"sales"."partner_event_accounting_impact"
	WHEN 'partner_deactivated' THEN 'none'::"sales"."partner_event_accounting_impact"
	WHEN 'partner_blocked' THEN 'none'::"sales"."partner_event_accounting_impact"
	WHEN 'partner_unblocked' THEN 'none'::"sales"."partner_event_accounting_impact"
	WHEN 'credit_limit_changed' THEN 'none'::"sales"."partner_event_accounting_impact"
	WHEN 'invoice_posted' THEN 'increase_receivable'::"sales"."partner_event_accounting_impact"
	WHEN 'invoice_voided' THEN 'decrease_receivable'::"sales"."partner_event_accounting_impact"
	WHEN 'payment_received' THEN 'decrease_receivable'::"sales"."partner_event_accounting_impact"
	WHEN 'payment_applied' THEN 'decrease_receivable'::"sales"."partner_event_accounting_impact"
	WHEN 'credit_note_posted' THEN 'decrease_receivable'::"sales"."partner_event_accounting_impact"
	WHEN 'refund_posted' THEN 'increase_receivable'::"sales"."partner_event_accounting_impact"
	WHEN 'reconciliation_adjustment' THEN CASE
		WHEN "amount" IS NOT NULL AND "currency_id" IS NOT NULL THEN 'increase_receivable'::"sales"."partner_event_accounting_impact"
		ELSE 'none'::"sales"."partner_event_accounting_impact"
	END
	WHEN 'external_sync' THEN CASE
		WHEN "amount" IS NOT NULL AND "currency_id" IS NOT NULL THEN 'increase_receivable'::"sales"."partner_event_accounting_impact"
		ELSE 'none'::"sales"."partner_event_accounting_impact"
	END
	ELSE 'none'::"sales"."partner_event_accounting_impact"
END;--> statement-breakpoint
ALTER TABLE "sales"."partner_events" ALTER COLUMN "event_type_new" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "sales"."partner_events" DROP CONSTRAINT "chk_sales_partner_events_amount_defined";--> statement-breakpoint
ALTER TABLE "sales"."partner_events" DROP COLUMN "event_type";--> statement-breakpoint
ALTER TABLE "sales"."partner_events" RENAME COLUMN "event_type_new" TO "event_type";--> statement-breakpoint
ALTER TABLE "sales"."partner_events" DROP CONSTRAINT "fk_sales_partner_events_partner";--> statement-breakpoint
ALTER TABLE "sales"."partner_events" ADD CONSTRAINT "fk_sales_partner_events_partner" FOREIGN KEY ("partner_id") REFERENCES "sales"."partners"("id") ON DELETE RESTRICT ON UPDATE CASCADE;--> statement-breakpoint
ALTER TABLE "sales"."partner_events" ADD CONSTRAINT "fk_sales_partner_events_truth_binding" FOREIGN KEY ("truth_binding_id") REFERENCES "sales"."document_truth_bindings"("id") ON DELETE RESTRICT ON UPDATE CASCADE;--> statement-breakpoint
ALTER TABLE "sales"."partner_events" ADD CONSTRAINT "chk_sales_partner_events_schema_version_positive" CHECK ("event_schema_version" >= 1);--> statement-breakpoint
ALTER TABLE "sales"."partner_events" ADD CONSTRAINT "chk_sales_partner_events_amount_non_negative" CHECK ("amount" IS NULL OR "amount" >= 0);--> statement-breakpoint
ALTER TABLE "sales"."partner_events" ADD CONSTRAINT "chk_sales_partner_events_monetary_requires_amount" CHECK ("accounting_impact" = 'none'::"sales"."partner_event_accounting_impact" OR ("amount" IS NOT NULL AND "currency_id" IS NOT NULL));--> statement-breakpoint
ALTER TABLE "sales"."partner_events" ADD CONSTRAINT "chk_sales_partner_events_lifecycle_impact_none" CHECK (("event_type"::text NOT IN ('partner_created','partner_activated','partner_deactivated','partner_blocked','partner_unblocked','credit_limit_changed')) OR ("accounting_impact" = 'none'::"sales"."partner_event_accounting_impact"));--> statement-breakpoint
ALTER TABLE "sales"."partner_events" ADD CONSTRAINT "chk_sales_partner_events_core_financial_requires_impact" CHECK (("event_type"::text NOT IN ('invoice_posted','invoice_voided','payment_received','payment_applied','credit_note_posted','refund_posted')) OR ("accounting_impact" <> 'none'::"sales"."partner_event_accounting_impact"));--> statement-breakpoint
ALTER TABLE "sales"."partner_events" ADD CONSTRAINT "chk_sales_partner_events_truth_document_types" CHECK (("event_type"::text NOT IN ('invoice_posted','invoice_voided','credit_note_posted')) OR ("truth_binding_id" IS NOT NULL));--> statement-breakpoint
CREATE UNIQUE INDEX "uq_sales_partner_events_tenant_type_ref" ON "sales"."partner_events" ("tenant_id","event_type","ref_id") WHERE "ref_id" IS NOT NULL;--> statement-breakpoint
CREATE INDEX "idx_sales_partner_events_truth_binding" ON "sales"."partner_events" ("tenant_id","truth_binding_id");
