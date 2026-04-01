CREATE TYPE "sales"."tax_rounding_method" AS ENUM('per_line', 'per_tax', 'global');--> statement-breakpoint
ALTER TYPE "sales"."tax_resolution_strategy" ADD VALUE 'ambiguous';--> statement-breakpoint
ALTER TABLE "sales"."tax_resolutions" DROP CONSTRAINT IF EXISTS "chk_sales_tax_resolutions_strategy_integrity";--> statement-breakpoint
ALTER TABLE "sales"."tax_resolutions" ADD COLUMN "applied_taxes" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "sales"."tax_resolutions" ADD COLUMN "rounding_method" "sales"."tax_rounding_method" DEFAULT 'per_line' NOT NULL;--> statement-breakpoint
ALTER TABLE "sales"."tax_resolutions" ADD COLUMN "rounding_precision" numeric(5,4) DEFAULT '0.0100' NOT NULL;--> statement-breakpoint
ALTER TABLE "sales"."tax_resolutions" ADD CONSTRAINT "chk_sales_tax_resolutions_rounding_precision_positive" CHECK ("rounding_precision" > 0);--> statement-breakpoint
ALTER TABLE "sales"."tax_resolutions" ADD CONSTRAINT "chk_sales_tax_resolutions_strategy_integrity" CHECK ((("resolution_strategy" = 'priority') AND ("fiscal_position_id" IS NOT NULL)) OR (("resolution_strategy" = 'default') AND ("fiscal_position_id" IS NOT NULL)) OR (("resolution_strategy" = 'fallback') AND ("fiscal_position_id" IS NOT NULL)) OR (("resolution_strategy" = 'ambiguous') AND ("fiscal_position_id" IS NOT NULL)) OR (("resolution_strategy" = 'none') AND ("fiscal_position_id" IS NULL)));--> statement-breakpoint
ALTER TABLE "sales"."tax_resolutions" ALTER COLUMN "tax_engine_version" SET DEFAULT 'v2';--> statement-breakpoint
CREATE UNIQUE INDEX "uq_sales_tax_rate_children_parent_sequence" ON "sales"."tax_rate_children" ("tenant_id","parent_tax_id","sequence");--> statement-breakpoint
