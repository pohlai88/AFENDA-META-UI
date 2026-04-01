ALTER TYPE "sales"."truth_decision_type" ADD VALUE 'credit';--> statement-breakpoint
ALTER TABLE "sales"."document_truth_bindings" ADD COLUMN "tax_snapshot" jsonb DEFAULT '{}'::jsonb NOT NULL;--> statement-breakpoint
