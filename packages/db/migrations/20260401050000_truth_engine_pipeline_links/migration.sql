-- Truth Engine: order → active pricing head; returns → truth binding + source price resolution.

ALTER TABLE "sales"."sales_orders" ADD COLUMN IF NOT EXISTS "active_pricing_decision_id" uuid;--> statement-breakpoint
ALTER TABLE "sales"."sales_orders" ADD CONSTRAINT "fk_sales_orders_active_pricing_decision" FOREIGN KEY ("active_pricing_decision_id") REFERENCES "sales"."sales_order_pricing_decisions"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_sales_orders_active_pricing_decision" ON "sales"."sales_orders" ("tenant_id","active_pricing_decision_id");--> statement-breakpoint

ALTER TABLE "sales"."return_orders" ADD COLUMN IF NOT EXISTS "truth_binding_id" uuid;--> statement-breakpoint
ALTER TABLE "sales"."return_orders" ADD CONSTRAINT "fk_sales_return_orders_truth_binding" FOREIGN KEY ("truth_binding_id") REFERENCES "sales"."document_truth_bindings"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_sales_return_orders_truth_binding" ON "sales"."return_orders" ("tenant_id","truth_binding_id");--> statement-breakpoint

ALTER TABLE "sales"."return_order_lines" ADD COLUMN IF NOT EXISTS "source_price_resolution_id" uuid;--> statement-breakpoint
ALTER TABLE "sales"."return_order_lines" ADD CONSTRAINT "fk_sales_return_order_lines_source_price_resolution" FOREIGN KEY ("source_price_resolution_id") REFERENCES "sales"."sales_order_price_resolutions"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_sales_return_order_lines_source_price_resolution" ON "sales"."return_order_lines" ("tenant_id","source_price_resolution_id");--> statement-breakpoint
