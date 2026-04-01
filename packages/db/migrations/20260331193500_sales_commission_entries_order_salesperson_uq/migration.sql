CREATE UNIQUE INDEX "uq_sales_commission_entries_order_salesperson" ON "sales"."commission_entries" ("tenant_id","order_id","salesperson_id") WHERE "deleted_at" IS NULL;--> statement-breakpoint

-- Rollback: DROP INDEX IF EXISTS "sales"."uq_sales_commission_entries_order_salesperson";
