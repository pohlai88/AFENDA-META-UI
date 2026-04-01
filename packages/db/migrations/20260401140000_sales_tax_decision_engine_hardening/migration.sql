CREATE TYPE "sales"."tax_computation_method" AS ENUM('flat', 'compound', 'included', 'group');--> statement-breakpoint
CREATE TYPE "sales"."tax_resolution_subject_type" AS ENUM('sales_order', 'sales_order_line', 'return_order', 'invoice', 'credit_note', 'subscription', 'manual', 'replay');--> statement-breakpoint
CREATE TYPE "sales"."tax_resolution_strategy" AS ENUM('priority', 'default', 'fallback', 'none');--> statement-breakpoint
ALTER TABLE "sales"."tax_rates" ADD COLUMN "computation_method" "sales"."tax_computation_method" DEFAULT 'flat' NOT NULL;--> statement-breakpoint
UPDATE "sales"."tax_rates" SET "computation_method" = 'group' WHERE "amount_type" = 'group';--> statement-breakpoint
UPDATE "sales"."tax_rates" SET "computation_method" = 'included' WHERE "price_include" = true AND "amount_type" <> 'group';--> statement-breakpoint
ALTER TABLE "sales"."tax_rates" DROP COLUMN "is_active";--> statement-breakpoint
ALTER TABLE "sales"."tax_rates" ADD CONSTRAINT "chk_sales_tax_rates_group_computation" CHECK (("amount_type" = 'group' AND "computation_method" = 'group') OR ("amount_type" <> 'group' AND "computation_method" <> 'group'));--> statement-breakpoint
ALTER TABLE "sales"."tax_rates" ADD CONSTRAINT "chk_sales_tax_rates_included_price_flag" CHECK (("computation_method" = 'included' AND "price_include") OR ("computation_method" <> 'included' AND NOT "price_include"));--> statement-breakpoint
CREATE INDEX "idx_sales_tax_rates_tenant_effective_window" ON "sales"."tax_rates" ("tenant_id","effective_from","effective_to");--> statement-breakpoint
DROP INDEX IF EXISTS "sales"."idx_sales_tax_rates_tenant_active_effective";--> statement-breakpoint
ALTER TABLE "sales"."fiscal_positions" ADD COLUMN "effective_from" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "sales"."fiscal_positions" ADD COLUMN "effective_to" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "sales"."fiscal_positions" ADD CONSTRAINT "chk_sales_fiscal_positions_effective_window" CHECK ("effective_to" IS NULL OR "effective_to" >= "effective_from");--> statement-breakpoint
CREATE TABLE "sales"."fiscal_position_states" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" integer NOT NULL,
	"fiscal_position_id" uuid NOT NULL,
	"state_id" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" integer NOT NULL,
	"updated_by" integer NOT NULL
);--> statement-breakpoint
ALTER TABLE "sales"."fiscal_position_states" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "sales"."fiscal_position_states" ADD CONSTRAINT "fk_sales_fiscal_position_states_tenant" FOREIGN KEY ("tenant_id") REFERENCES "core"."tenants"("tenantId") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "sales"."fiscal_position_states" ADD CONSTRAINT "fk_sales_fiscal_position_states_position" FOREIGN KEY ("fiscal_position_id") REFERENCES "sales"."fiscal_positions"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "sales"."fiscal_position_states" ADD CONSTRAINT "fk_sales_fiscal_position_states_state" FOREIGN KEY ("state_id") REFERENCES "reference"."states"("state_id") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "sales"."fiscal_position_states" ADD CONSTRAINT "fk_sales_fiscal_position_states_created_by" FOREIGN KEY ("created_by") REFERENCES "security"."users"("userId") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "sales"."fiscal_position_states" ADD CONSTRAINT "fk_sales_fiscal_position_states_updated_by" FOREIGN KEY ("updated_by") REFERENCES "security"."users"("userId") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
CREATE INDEX "idx_sales_fiscal_position_states_tenant" ON "sales"."fiscal_position_states" ("tenant_id");--> statement-breakpoint
CREATE INDEX "idx_sales_fiscal_position_states_position" ON "sales"."fiscal_position_states" ("tenant_id","fiscal_position_id");--> statement-breakpoint
CREATE INDEX "idx_sales_fiscal_position_states_state" ON "sales"."fiscal_position_states" ("tenant_id","state_id");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_sales_fiscal_position_states_unique" ON "sales"."fiscal_position_states" ("tenant_id","fiscal_position_id","state_id");--> statement-breakpoint
CREATE POLICY "sales_fiscal_position_states_tenant_select" ON "sales"."fiscal_position_states" AS PERMISSIVE FOR SELECT TO "app_user" USING ("tenant_id" = NULLIF(current_setting('afenda.tenant_id', true), '')::int);--> statement-breakpoint
CREATE POLICY "sales_fiscal_position_states_tenant_insert" ON "sales"."fiscal_position_states" AS PERMISSIVE FOR INSERT TO "app_user" WITH CHECK ("tenant_id" = NULLIF(current_setting('afenda.tenant_id', true), '')::int);--> statement-breakpoint
CREATE POLICY "sales_fiscal_position_states_tenant_update" ON "sales"."fiscal_position_states" AS PERMISSIVE FOR UPDATE TO "app_user" USING ("tenant_id" = NULLIF(current_setting('afenda.tenant_id', true), '')::int) WITH CHECK ("tenant_id" = NULLIF(current_setting('afenda.tenant_id', true), '')::int);--> statement-breakpoint
CREATE POLICY "sales_fiscal_position_states_tenant_delete" ON "sales"."fiscal_position_states" AS PERMISSIVE FOR DELETE TO "app_user" USING ("tenant_id" = NULLIF(current_setting('afenda.tenant_id', true), '')::int);--> statement-breakpoint
CREATE POLICY "sales_fiscal_position_states_service_bypass" ON "sales"."fiscal_position_states" AS PERMISSIVE FOR ALL TO "service_role" USING (true) WITH CHECK (true);--> statement-breakpoint
INSERT INTO "sales"."fiscal_position_states" ("id", "tenant_id", "fiscal_position_id", "state_id", "created_at", "updated_at", "created_by", "updated_by")
SELECT gen_random_uuid(), s."tenant_id", s."fiscal_position_id", s."state_id", now(), now(), s."created_by", s."updated_by"
FROM (
	SELECT DISTINCT ON (fp."tenant_id", fp."id", NULLIF(trim(both FROM tok.token), '')::integer)
		fp."tenant_id",
		fp."id" AS "fiscal_position_id",
		NULLIF(trim(both FROM tok.token), '')::integer AS "state_id",
		fp."created_by",
		fp."updated_by"
	FROM "sales"."fiscal_positions" fp
	CROSS JOIN LATERAL regexp_split_to_table(COALESCE(fp."state_ids", ''), ',') AS tok(token)
	WHERE fp."state_ids" IS NOT NULL AND trim(both FROM tok.token) ~ '^[0-9]+$'
	ORDER BY fp."tenant_id", fp."id", NULLIF(trim(both FROM tok.token), '')::integer
) s;--> statement-breakpoint
ALTER TABLE "sales"."fiscal_positions" DROP COLUMN "state_ids";--> statement-breakpoint
ALTER TABLE "sales"."fiscal_positions" DROP COLUMN "is_active";--> statement-breakpoint
ALTER TABLE "sales"."fiscal_positions" DROP COLUMN "zip_from";--> statement-breakpoint
ALTER TABLE "sales"."fiscal_positions" DROP COLUMN "zip_to";--> statement-breakpoint
ALTER TABLE "sales"."fiscal_positions" ADD COLUMN "zip_from" integer;--> statement-breakpoint
ALTER TABLE "sales"."fiscal_positions" ADD COLUMN "zip_to" integer;--> statement-breakpoint
ALTER TABLE "sales"."fiscal_positions" ADD CONSTRAINT "chk_sales_fiscal_positions_zip_bounds" CHECK (("zip_from" IS NULL AND "zip_to" IS NULL) OR ("zip_from" IS NOT NULL AND "zip_to" IS NOT NULL AND "zip_to" >= "zip_from"));--> statement-breakpoint
CREATE INDEX "idx_sales_fiscal_positions_effective" ON "sales"."fiscal_positions" ("tenant_id","effective_from","effective_to");--> statement-breakpoint
CREATE TABLE "sales"."tax_resolutions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" integer NOT NULL,
	"subject_type" "sales"."tax_resolution_subject_type" NOT NULL,
	"subject_id" uuid,
	"input_snapshot" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"fiscal_position_id" uuid,
	"applied_tax_ids" uuid[] DEFAULT '{}'::uuid[] NOT NULL,
	"computation_trace" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"total_tax_amount" numeric(14, 2) NOT NULL,
	"resolution_strategy" "sales"."tax_resolution_strategy" NOT NULL,
	"evaluated_at" timestamp with time zone NOT NULL,
	"resolved_at" timestamp with time zone DEFAULT now() NOT NULL,
	"tax_engine_version" varchar(64) DEFAULT 'v1' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" integer NOT NULL,
	"updated_by" integer NOT NULL,
	CONSTRAINT "chk_sales_tax_resolutions_total_non_negative" CHECK ("total_tax_amount" >= 0),
	CONSTRAINT "chk_sales_tax_resolutions_strategy_integrity" CHECK ((("resolution_strategy" = 'priority') AND ("fiscal_position_id" IS NOT NULL)) OR (("resolution_strategy" = 'default') AND ("fiscal_position_id" IS NOT NULL)) OR (("resolution_strategy" = 'fallback') AND ("fiscal_position_id" IS NOT NULL)) OR (("resolution_strategy" = 'none') AND ("fiscal_position_id" IS NULL)))
);--> statement-breakpoint
ALTER TABLE "sales"."tax_resolutions" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "sales"."tax_resolutions" ADD CONSTRAINT "fk_sales_tax_resolutions_tenant" FOREIGN KEY ("tenant_id") REFERENCES "core"."tenants"("tenantId") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "sales"."tax_resolutions" ADD CONSTRAINT "fk_sales_tax_resolutions_fiscal_position" FOREIGN KEY ("fiscal_position_id") REFERENCES "sales"."fiscal_positions"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "sales"."tax_resolutions" ADD CONSTRAINT "fk_sales_tax_resolutions_created_by" FOREIGN KEY ("created_by") REFERENCES "security"."users"("userId") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "sales"."tax_resolutions" ADD CONSTRAINT "fk_sales_tax_resolutions_updated_by" FOREIGN KEY ("updated_by") REFERENCES "security"."users"("userId") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
CREATE INDEX "idx_sales_tax_resolutions_tenant" ON "sales"."tax_resolutions" ("tenant_id");--> statement-breakpoint
CREATE INDEX "idx_sales_tax_resolutions_subject" ON "sales"."tax_resolutions" ("tenant_id","subject_type","subject_id");--> statement-breakpoint
CREATE INDEX "idx_sales_tax_resolutions_position" ON "sales"."tax_resolutions" ("tenant_id","fiscal_position_id");--> statement-breakpoint
CREATE INDEX "idx_sales_tax_resolutions_resolved" ON "sales"."tax_resolutions" ("tenant_id","resolved_at");--> statement-breakpoint
CREATE POLICY "sales_tax_resolutions_tenant_select" ON "sales"."tax_resolutions" AS PERMISSIVE FOR SELECT TO "app_user" USING ("tenant_id" = NULLIF(current_setting('afenda.tenant_id', true), '')::int);--> statement-breakpoint
CREATE POLICY "sales_tax_resolutions_tenant_insert" ON "sales"."tax_resolutions" AS PERMISSIVE FOR INSERT TO "app_user" WITH CHECK ("tenant_id" = NULLIF(current_setting('afenda.tenant_id', true), '')::int);--> statement-breakpoint
CREATE POLICY "sales_tax_resolutions_tenant_update" ON "sales"."tax_resolutions" AS PERMISSIVE FOR UPDATE TO "app_user" USING ("tenant_id" = NULLIF(current_setting('afenda.tenant_id', true), '')::int) WITH CHECK ("tenant_id" = NULLIF(current_setting('afenda.tenant_id', true), '')::int);--> statement-breakpoint
CREATE POLICY "sales_tax_resolutions_tenant_delete" ON "sales"."tax_resolutions" AS PERMISSIVE FOR DELETE TO "app_user" USING ("tenant_id" = NULLIF(current_setting('afenda.tenant_id', true), '')::int);--> statement-breakpoint
CREATE POLICY "sales_tax_resolutions_service_bypass" ON "sales"."tax_resolutions" AS PERMISSIVE FOR ALL TO "service_role" USING (true) WITH CHECK (true);--> statement-breakpoint
ALTER TABLE "sales"."sale_order_line_taxes" ADD COLUMN "computation_snapshot" jsonb;--> statement-breakpoint
