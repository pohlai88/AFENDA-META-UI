ALTER TABLE "core"."tenants" ADD COLUMN "created_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "core"."tenants" ADD COLUMN "updated_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "core"."tenants" ADD COLUMN "deleted_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "core"."app_modules" ADD COLUMN "created_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "core"."app_modules" ADD COLUMN "updated_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "core"."app_modules" ADD COLUMN "deleted_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "core"."app_modules" ADD COLUMN "created_by" integer NOT NULL;--> statement-breakpoint
ALTER TABLE "core"."app_modules" ADD COLUMN "updated_by" integer NOT NULL;--> statement-breakpoint
ALTER TABLE "reference"."approval_logs" ADD COLUMN "created_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "reference"."banks" ADD COLUMN "created_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "reference"."banks" ADD COLUMN "updated_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "reference"."banks" ADD COLUMN "deleted_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "reference"."banks" ADD COLUMN "created_by" integer NOT NULL;--> statement-breakpoint
ALTER TABLE "reference"."banks" ADD COLUMN "updated_by" integer NOT NULL;--> statement-breakpoint
ALTER TABLE "reference"."countries" ADD COLUMN "created_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "reference"."countries" ADD COLUMN "updated_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "reference"."countries" ADD COLUMN "deleted_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "reference"."countries" ADD COLUMN "created_by" integer NOT NULL;--> statement-breakpoint
ALTER TABLE "reference"."countries" ADD COLUMN "updated_by" integer NOT NULL;--> statement-breakpoint
ALTER TABLE "reference"."currencies" ADD COLUMN "created_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "reference"."currencies" ADD COLUMN "updated_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "reference"."currencies" ADD COLUMN "deleted_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "reference"."currencies" ADD COLUMN "created_by" integer NOT NULL;--> statement-breakpoint
ALTER TABLE "reference"."currencies" ADD COLUMN "updated_by" integer NOT NULL;--> statement-breakpoint
ALTER TABLE "reference"."currency_rates" ADD COLUMN "created_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "reference"."currency_rates" ADD COLUMN "created_by" integer NOT NULL;--> statement-breakpoint
ALTER TABLE "reference"."currency_rates" ADD COLUMN "updated_by" integer NOT NULL;--> statement-breakpoint
ALTER TABLE "reference"."document_attachments" ADD COLUMN "created_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "reference"."sequences" ADD COLUMN "created_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "reference"."sequences" ADD COLUMN "updated_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "reference"."sequences" ADD COLUMN "deleted_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "reference"."sequences" ADD COLUMN "created_by" integer NOT NULL;--> statement-breakpoint
ALTER TABLE "reference"."sequences" ADD COLUMN "updated_by" integer NOT NULL;--> statement-breakpoint
ALTER TABLE "reference"."states" ADD COLUMN "created_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "reference"."states" ADD COLUMN "updated_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "reference"."states" ADD COLUMN "deleted_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "reference"."states" ADD COLUMN "created_by" integer NOT NULL;--> statement-breakpoint
ALTER TABLE "reference"."states" ADD COLUMN "updated_by" integer NOT NULL;--> statement-breakpoint
ALTER TABLE "reference"."units_of_measure" ADD COLUMN "created_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "reference"."units_of_measure" ADD COLUMN "updated_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "reference"."units_of_measure" ADD COLUMN "deleted_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "reference"."units_of_measure" ADD COLUMN "created_by" integer NOT NULL;--> statement-breakpoint
ALTER TABLE "reference"."units_of_measure" ADD COLUMN "updated_by" integer NOT NULL;--> statement-breakpoint
ALTER TABLE "reference"."uom_categories" ADD COLUMN "created_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "reference"."uom_categories" ADD COLUMN "updated_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "reference"."uom_categories" ADD COLUMN "deleted_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "reference"."uom_categories" ADD COLUMN "created_by" integer NOT NULL;--> statement-breakpoint
ALTER TABLE "reference"."uom_categories" ADD COLUMN "updated_by" integer NOT NULL;--> statement-breakpoint
ALTER TABLE "security"."users" ADD COLUMN "created_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "security"."users" ADD COLUMN "updated_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "security"."users" ADD COLUMN "deleted_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "security"."users" ADD COLUMN "created_by" integer NOT NULL;--> statement-breakpoint
ALTER TABLE "security"."users" ADD COLUMN "updated_by" integer NOT NULL;--> statement-breakpoint
ALTER TABLE "security"."roles" ADD COLUMN "created_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "security"."roles" ADD COLUMN "updated_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "security"."roles" ADD COLUMN "deleted_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "security"."roles" ADD COLUMN "created_by" integer NOT NULL;--> statement-breakpoint
ALTER TABLE "security"."roles" ADD COLUMN "updated_by" integer NOT NULL;--> statement-breakpoint
ALTER TABLE "security"."user_roles" ADD COLUMN "created_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "security"."user_roles" ADD COLUMN "updated_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "security"."permissions" ADD COLUMN "created_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "security"."permissions" ADD COLUMN "updated_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "security"."permissions" ADD COLUMN "deleted_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "security"."permissions" ADD COLUMN "created_by" integer NOT NULL;--> statement-breakpoint
ALTER TABLE "security"."permissions" ADD COLUMN "updated_by" integer NOT NULL;--> statement-breakpoint
ALTER TABLE "security"."role_permissions" ADD COLUMN "created_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "security"."role_permissions" ADD COLUMN "updated_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "security"."role_permissions" ADD COLUMN "created_by" integer NOT NULL;--> statement-breakpoint
ALTER TABLE "security"."role_permissions" ADD COLUMN "updated_by" integer NOT NULL;--> statement-breakpoint
ALTER TABLE "security"."user_permissions" ADD COLUMN "created_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "security"."user_permissions" ADD COLUMN "updated_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "security"."user_permissions" ADD COLUMN "created_by" integer NOT NULL;--> statement-breakpoint
ALTER TABLE "security"."user_permissions" ADD COLUMN "updated_by" integer NOT NULL;--> statement-breakpoint
ALTER TABLE "sales"."accounting_postings" ADD COLUMN "created_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "sales"."accounting_postings" ADD COLUMN "updated_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "sales"."accounting_postings" ADD COLUMN "created_by" integer NOT NULL;--> statement-breakpoint
ALTER TABLE "sales"."accounting_postings" ADD COLUMN "updated_by" integer NOT NULL;--> statement-breakpoint
ALTER TABLE "sales"."commission_entries" ADD COLUMN "created_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "sales"."commission_entries" ADD COLUMN "updated_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "sales"."commission_entries" ADD COLUMN "deleted_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "sales"."commission_entries" ADD COLUMN "created_by" integer NOT NULL;--> statement-breakpoint
ALTER TABLE "sales"."commission_entries" ADD COLUMN "updated_by" integer NOT NULL;--> statement-breakpoint
ALTER TABLE "sales"."commission_plan_tiers" ADD COLUMN "created_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "sales"."commission_plan_tiers" ADD COLUMN "updated_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "sales"."commission_plan_tiers" ADD COLUMN "created_by" integer NOT NULL;--> statement-breakpoint
ALTER TABLE "sales"."commission_plan_tiers" ADD COLUMN "updated_by" integer NOT NULL;--> statement-breakpoint
ALTER TABLE "sales"."commission_plans" ADD COLUMN "created_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "sales"."commission_plans" ADD COLUMN "updated_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "sales"."commission_plans" ADD COLUMN "deleted_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "sales"."commission_plans" ADD COLUMN "created_by" integer NOT NULL;--> statement-breakpoint
ALTER TABLE "sales"."commission_plans" ADD COLUMN "updated_by" integer NOT NULL;--> statement-breakpoint
ALTER TABLE "sales"."consignment_agreement_lines" ADD COLUMN "created_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "sales"."consignment_agreement_lines" ADD COLUMN "updated_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "sales"."consignment_agreement_lines" ADD COLUMN "deleted_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "sales"."consignment_agreement_lines" ADD COLUMN "created_by" integer NOT NULL;--> statement-breakpoint
ALTER TABLE "sales"."consignment_agreement_lines" ADD COLUMN "updated_by" integer NOT NULL;--> statement-breakpoint
ALTER TABLE "sales"."consignment_agreements" ADD COLUMN "created_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "sales"."consignment_agreements" ADD COLUMN "updated_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "sales"."consignment_agreements" ADD COLUMN "deleted_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "sales"."consignment_agreements" ADD COLUMN "created_by" integer NOT NULL;--> statement-breakpoint
ALTER TABLE "sales"."consignment_agreements" ADD COLUMN "updated_by" integer NOT NULL;--> statement-breakpoint
ALTER TABLE "sales"."consignment_stock_report_lines" ADD COLUMN "created_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "sales"."consignment_stock_report_lines" ADD COLUMN "updated_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "sales"."consignment_stock_report_lines" ADD COLUMN "created_by" integer NOT NULL;--> statement-breakpoint
ALTER TABLE "sales"."consignment_stock_report_lines" ADD COLUMN "updated_by" integer NOT NULL;--> statement-breakpoint
ALTER TABLE "sales"."consignment_stock_reports" ADD COLUMN "created_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "sales"."consignment_stock_reports" ADD COLUMN "updated_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "sales"."consignment_stock_reports" ADD COLUMN "deleted_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "sales"."consignment_stock_reports" ADD COLUMN "created_by" integer NOT NULL;--> statement-breakpoint
ALTER TABLE "sales"."consignment_stock_reports" ADD COLUMN "updated_by" integer NOT NULL;--> statement-breakpoint
ALTER TABLE "sales"."document_approvals" ADD COLUMN "created_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "sales"."document_approvals" ADD COLUMN "updated_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "sales"."document_approvals" ADD COLUMN "created_by" integer NOT NULL;--> statement-breakpoint
ALTER TABLE "sales"."document_approvals" ADD COLUMN "updated_by" integer NOT NULL;--> statement-breakpoint
ALTER TABLE "sales"."document_status_history" ADD COLUMN "created_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "sales"."document_status_history" ADD COLUMN "updated_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "sales"."document_status_history" ADD COLUMN "created_by" integer NOT NULL;--> statement-breakpoint
ALTER TABLE "sales"."document_status_history" ADD COLUMN "updated_by" integer NOT NULL;--> statement-breakpoint
ALTER TABLE "sales"."domain_event_logs" ADD COLUMN "created_by" integer NOT NULL;--> statement-breakpoint
ALTER TABLE "sales"."domain_event_logs" ADD COLUMN "updated_by" integer NOT NULL;--> statement-breakpoint
ALTER TABLE "sales"."domain_invariant_logs" ADD COLUMN "created_by" integer NOT NULL;--> statement-breakpoint
ALTER TABLE "sales"."domain_invariant_logs" ADD COLUMN "updated_by" integer NOT NULL;--> statement-breakpoint
ALTER TABLE "sales"."fiscal_position_account_maps" ADD COLUMN "created_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "sales"."fiscal_position_account_maps" ADD COLUMN "updated_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "sales"."fiscal_position_account_maps" ADD COLUMN "created_by" integer NOT NULL;--> statement-breakpoint
ALTER TABLE "sales"."fiscal_position_account_maps" ADD COLUMN "updated_by" integer NOT NULL;--> statement-breakpoint
ALTER TABLE "sales"."fiscal_position_tax_maps" ADD COLUMN "created_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "sales"."fiscal_position_tax_maps" ADD COLUMN "updated_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "sales"."fiscal_position_tax_maps" ADD COLUMN "created_by" integer NOT NULL;--> statement-breakpoint
ALTER TABLE "sales"."fiscal_position_tax_maps" ADD COLUMN "updated_by" integer NOT NULL;--> statement-breakpoint
ALTER TABLE "sales"."fiscal_positions" ADD COLUMN "created_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "sales"."fiscal_positions" ADD COLUMN "updated_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "sales"."fiscal_positions" ADD COLUMN "deleted_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "sales"."fiscal_positions" ADD COLUMN "created_by" integer NOT NULL;--> statement-breakpoint
ALTER TABLE "sales"."fiscal_positions" ADD COLUMN "updated_by" integer NOT NULL;--> statement-breakpoint
ALTER TABLE "sales"."line_item_discounts" ADD COLUMN "created_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "sales"."line_item_discounts" ADD COLUMN "updated_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "sales"."line_item_discounts" ADD COLUMN "created_by" integer NOT NULL;--> statement-breakpoint
ALTER TABLE "sales"."line_item_discounts" ADD COLUMN "updated_by" integer NOT NULL;--> statement-breakpoint
ALTER TABLE "sales"."partner_addresses" ADD COLUMN "created_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "sales"."partner_addresses" ADD COLUMN "updated_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "sales"."partner_addresses" ADD COLUMN "deleted_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "sales"."partner_addresses" ADD COLUMN "created_by" integer NOT NULL;--> statement-breakpoint
ALTER TABLE "sales"."partner_addresses" ADD COLUMN "updated_by" integer NOT NULL;--> statement-breakpoint
ALTER TABLE "sales"."partner_bank_accounts" ADD COLUMN "created_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "sales"."partner_bank_accounts" ADD COLUMN "updated_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "sales"."partner_bank_accounts" ADD COLUMN "deleted_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "sales"."partner_bank_accounts" ADD COLUMN "created_by" integer NOT NULL;--> statement-breakpoint
ALTER TABLE "sales"."partner_bank_accounts" ADD COLUMN "updated_by" integer NOT NULL;--> statement-breakpoint
ALTER TABLE "sales"."partner_tag_assignments" ADD COLUMN "created_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "sales"."partner_tag_assignments" ADD COLUMN "updated_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "sales"."partner_tag_assignments" ADD COLUMN "created_by" integer NOT NULL;--> statement-breakpoint
ALTER TABLE "sales"."partner_tag_assignments" ADD COLUMN "updated_by" integer NOT NULL;--> statement-breakpoint
ALTER TABLE "sales"."partner_tags" ADD COLUMN "created_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "sales"."partner_tags" ADD COLUMN "updated_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "sales"."partner_tags" ADD COLUMN "deleted_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "sales"."partner_tags" ADD COLUMN "created_by" integer NOT NULL;--> statement-breakpoint
ALTER TABLE "sales"."partner_tags" ADD COLUMN "updated_by" integer NOT NULL;--> statement-breakpoint
ALTER TABLE "sales"."partners" ADD COLUMN "created_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "sales"."partners" ADD COLUMN "updated_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "sales"."partners" ADD COLUMN "deleted_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "sales"."partners" ADD COLUMN "created_by" integer NOT NULL;--> statement-breakpoint
ALTER TABLE "sales"."partners" ADD COLUMN "updated_by" integer NOT NULL;--> statement-breakpoint
ALTER TABLE "sales"."payment_term_lines" ADD COLUMN "created_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "sales"."payment_term_lines" ADD COLUMN "updated_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "sales"."payment_term_lines" ADD COLUMN "created_by" integer NOT NULL;--> statement-breakpoint
ALTER TABLE "sales"."payment_term_lines" ADD COLUMN "updated_by" integer NOT NULL;--> statement-breakpoint
ALTER TABLE "sales"."payment_terms" ADD COLUMN "created_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "sales"."payment_terms" ADD COLUMN "updated_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "sales"."payment_terms" ADD COLUMN "deleted_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "sales"."payment_terms" ADD COLUMN "created_by" integer NOT NULL;--> statement-breakpoint
ALTER TABLE "sales"."payment_terms" ADD COLUMN "updated_by" integer NOT NULL;--> statement-breakpoint
ALTER TABLE "sales"."pricelist_items" ADD COLUMN "created_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "sales"."pricelist_items" ADD COLUMN "updated_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "sales"."pricelist_items" ADD COLUMN "deleted_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "sales"."pricelist_items" ADD COLUMN "created_by" integer NOT NULL;--> statement-breakpoint
ALTER TABLE "sales"."pricelist_items" ADD COLUMN "updated_by" integer NOT NULL;--> statement-breakpoint
ALTER TABLE "sales"."pricelists" ADD COLUMN "created_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "sales"."pricelists" ADD COLUMN "updated_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "sales"."pricelists" ADD COLUMN "deleted_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "sales"."pricelists" ADD COLUMN "created_by" integer NOT NULL;--> statement-breakpoint
ALTER TABLE "sales"."pricelists" ADD COLUMN "updated_by" integer NOT NULL;--> statement-breakpoint
ALTER TABLE "sales"."product_attribute_values" ADD COLUMN "created_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "sales"."product_attribute_values" ADD COLUMN "updated_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "sales"."product_attribute_values" ADD COLUMN "deleted_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "sales"."product_attribute_values" ADD COLUMN "created_by" integer NOT NULL;--> statement-breakpoint
ALTER TABLE "sales"."product_attribute_values" ADD COLUMN "updated_by" integer NOT NULL;--> statement-breakpoint
ALTER TABLE "sales"."product_attributes" ADD COLUMN "created_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "sales"."product_attributes" ADD COLUMN "updated_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "sales"."product_attributes" ADD COLUMN "deleted_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "sales"."product_attributes" ADD COLUMN "created_by" integer NOT NULL;--> statement-breakpoint
ALTER TABLE "sales"."product_attributes" ADD COLUMN "updated_by" integer NOT NULL;--> statement-breakpoint
ALTER TABLE "sales"."product_categories" ADD COLUMN "created_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "sales"."product_categories" ADD COLUMN "updated_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "sales"."product_categories" ADD COLUMN "deleted_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "sales"."product_categories" ADD COLUMN "created_by" integer NOT NULL;--> statement-breakpoint
ALTER TABLE "sales"."product_categories" ADD COLUMN "updated_by" integer NOT NULL;--> statement-breakpoint
ALTER TABLE "sales"."product_packaging" ADD COLUMN "created_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "sales"."product_packaging" ADD COLUMN "updated_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "sales"."product_packaging" ADD COLUMN "deleted_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "sales"."product_packaging" ADD COLUMN "created_by" integer NOT NULL;--> statement-breakpoint
ALTER TABLE "sales"."product_packaging" ADD COLUMN "updated_by" integer NOT NULL;--> statement-breakpoint
ALTER TABLE "sales"."product_template_attribute_lines" ADD COLUMN "created_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "sales"."product_template_attribute_lines" ADD COLUMN "updated_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "sales"."product_template_attribute_lines" ADD COLUMN "created_by" integer NOT NULL;--> statement-breakpoint
ALTER TABLE "sales"."product_template_attribute_lines" ADD COLUMN "updated_by" integer NOT NULL;--> statement-breakpoint
ALTER TABLE "sales"."product_template_attribute_values" ADD COLUMN "created_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "sales"."product_template_attribute_values" ADD COLUMN "updated_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "sales"."product_template_attribute_values" ADD COLUMN "created_by" integer NOT NULL;--> statement-breakpoint
ALTER TABLE "sales"."product_template_attribute_values" ADD COLUMN "updated_by" integer NOT NULL;--> statement-breakpoint
ALTER TABLE "sales"."product_templates" ADD COLUMN "created_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "sales"."product_templates" ADD COLUMN "updated_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "sales"."product_templates" ADD COLUMN "deleted_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "sales"."product_templates" ADD COLUMN "created_by" integer NOT NULL;--> statement-breakpoint
ALTER TABLE "sales"."product_templates" ADD COLUMN "updated_by" integer NOT NULL;--> statement-breakpoint
ALTER TABLE "sales"."product_variants" ADD COLUMN "created_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "sales"."product_variants" ADD COLUMN "updated_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "sales"."product_variants" ADD COLUMN "deleted_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "sales"."product_variants" ADD COLUMN "created_by" integer NOT NULL;--> statement-breakpoint
ALTER TABLE "sales"."product_variants" ADD COLUMN "updated_by" integer NOT NULL;--> statement-breakpoint
ALTER TABLE "sales"."products" ADD COLUMN "created_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "sales"."products" ADD COLUMN "updated_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "sales"."products" ADD COLUMN "deleted_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "sales"."products" ADD COLUMN "created_by" integer NOT NULL;--> statement-breakpoint
ALTER TABLE "sales"."products" ADD COLUMN "updated_by" integer NOT NULL;--> statement-breakpoint
ALTER TABLE "sales"."return_order_lines" ADD COLUMN "created_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "sales"."return_order_lines" ADD COLUMN "updated_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "sales"."return_order_lines" ADD COLUMN "created_by" integer NOT NULL;--> statement-breakpoint
ALTER TABLE "sales"."return_order_lines" ADD COLUMN "updated_by" integer NOT NULL;--> statement-breakpoint
ALTER TABLE "sales"."return_orders" ADD COLUMN "created_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "sales"."return_orders" ADD COLUMN "updated_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "sales"."return_orders" ADD COLUMN "deleted_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "sales"."return_orders" ADD COLUMN "created_by" integer NOT NULL;--> statement-breakpoint
ALTER TABLE "sales"."return_orders" ADD COLUMN "updated_by" integer NOT NULL;--> statement-breakpoint
ALTER TABLE "sales"."return_reason_codes" ADD COLUMN "created_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "sales"."return_reason_codes" ADD COLUMN "updated_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "sales"."return_reason_codes" ADD COLUMN "deleted_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "sales"."return_reason_codes" ADD COLUMN "created_by" integer NOT NULL;--> statement-breakpoint
ALTER TABLE "sales"."return_reason_codes" ADD COLUMN "updated_by" integer NOT NULL;--> statement-breakpoint
ALTER TABLE "sales"."rounding_policies" ADD COLUMN "created_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "sales"."rounding_policies" ADD COLUMN "updated_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "sales"."rounding_policies" ADD COLUMN "deleted_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "sales"."rounding_policies" ADD COLUMN "created_by" integer NOT NULL;--> statement-breakpoint
ALTER TABLE "sales"."rounding_policies" ADD COLUMN "updated_by" integer NOT NULL;--> statement-breakpoint
ALTER TABLE "sales"."sale_order_line_taxes" ADD COLUMN "created_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "sales"."sale_order_line_taxes" ADD COLUMN "updated_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "sales"."sale_order_line_taxes" ADD COLUMN "created_by" integer NOT NULL;--> statement-breakpoint
ALTER TABLE "sales"."sale_order_line_taxes" ADD COLUMN "updated_by" integer NOT NULL;--> statement-breakpoint
ALTER TABLE "sales"."sale_order_option_lines" ADD COLUMN "created_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "sales"."sale_order_option_lines" ADD COLUMN "updated_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "sales"."sale_order_option_lines" ADD COLUMN "created_by" integer NOT NULL;--> statement-breakpoint
ALTER TABLE "sales"."sale_order_option_lines" ADD COLUMN "updated_by" integer NOT NULL;--> statement-breakpoint
ALTER TABLE "sales"."sale_order_status_history" ADD COLUMN "created_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "sales"."sale_order_status_history" ADD COLUMN "updated_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "sales"."sale_order_status_history" ADD COLUMN "created_by" integer NOT NULL;--> statement-breakpoint
ALTER TABLE "sales"."sale_order_status_history" ADD COLUMN "updated_by" integer NOT NULL;--> statement-breakpoint
ALTER TABLE "sales"."sale_order_tax_summary" ADD COLUMN "created_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "sales"."sale_order_tax_summary" ADD COLUMN "updated_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "sales"."sale_order_tax_summary" ADD COLUMN "created_by" integer NOT NULL;--> statement-breakpoint
ALTER TABLE "sales"."sale_order_tax_summary" ADD COLUMN "updated_by" integer NOT NULL;--> statement-breakpoint
ALTER TABLE "sales"."document_attachments" ADD COLUMN "created_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "sales"."document_attachments" ADD COLUMN "updated_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "sales"."document_attachments" ADD COLUMN "deleted_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "sales"."document_attachments" ADD COLUMN "created_by" integer NOT NULL;--> statement-breakpoint
ALTER TABLE "sales"."document_attachments" ADD COLUMN "updated_by" integer NOT NULL;--> statement-breakpoint
ALTER TABLE "sales"."sales_order_lines" ADD COLUMN "created_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "sales"."sales_order_lines" ADD COLUMN "updated_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "sales"."sales_order_lines" ADD COLUMN "deleted_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "sales"."sales_order_lines" ADD COLUMN "created_by" integer NOT NULL;--> statement-breakpoint
ALTER TABLE "sales"."sales_order_lines" ADD COLUMN "updated_by" integer NOT NULL;--> statement-breakpoint
ALTER TABLE "sales"."sales_orders" ADD COLUMN "created_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "sales"."sales_orders" ADD COLUMN "updated_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "sales"."sales_orders" ADD COLUMN "deleted_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "sales"."sales_orders" ADD COLUMN "created_by" integer NOT NULL;--> statement-breakpoint
ALTER TABLE "sales"."sales_orders" ADD COLUMN "updated_by" integer NOT NULL;--> statement-breakpoint
ALTER TABLE "sales"."sales_team_members" ADD COLUMN "created_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "sales"."sales_team_members" ADD COLUMN "updated_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "sales"."sales_team_members" ADD COLUMN "deleted_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "sales"."sales_team_members" ADD COLUMN "created_by" integer NOT NULL;--> statement-breakpoint
ALTER TABLE "sales"."sales_team_members" ADD COLUMN "updated_by" integer NOT NULL;--> statement-breakpoint
ALTER TABLE "sales"."sales_teams" ADD COLUMN "created_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "sales"."sales_teams" ADD COLUMN "updated_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "sales"."sales_teams" ADD COLUMN "deleted_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "sales"."sales_teams" ADD COLUMN "created_by" integer NOT NULL;--> statement-breakpoint
ALTER TABLE "sales"."sales_teams" ADD COLUMN "updated_by" integer NOT NULL;--> statement-breakpoint
ALTER TABLE "sales"."subscription_close_reasons" ADD COLUMN "created_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "sales"."subscription_close_reasons" ADD COLUMN "updated_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "sales"."subscription_close_reasons" ADD COLUMN "deleted_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "sales"."subscription_close_reasons" ADD COLUMN "created_by" integer NOT NULL;--> statement-breakpoint
ALTER TABLE "sales"."subscription_close_reasons" ADD COLUMN "updated_by" integer NOT NULL;--> statement-breakpoint
ALTER TABLE "sales"."subscription_lines" ADD COLUMN "created_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "sales"."subscription_lines" ADD COLUMN "updated_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "sales"."subscription_lines" ADD COLUMN "created_by" integer NOT NULL;--> statement-breakpoint
ALTER TABLE "sales"."subscription_lines" ADD COLUMN "updated_by" integer NOT NULL;--> statement-breakpoint
ALTER TABLE "sales"."subscription_logs" ADD COLUMN "created_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "sales"."subscription_logs" ADD COLUMN "updated_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "sales"."subscription_logs" ADD COLUMN "created_by" integer NOT NULL;--> statement-breakpoint
ALTER TABLE "sales"."subscription_logs" ADD COLUMN "updated_by" integer NOT NULL;--> statement-breakpoint
ALTER TABLE "sales"."subscription_templates" ADD COLUMN "created_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "sales"."subscription_templates" ADD COLUMN "updated_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "sales"."subscription_templates" ADD COLUMN "deleted_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "sales"."subscription_templates" ADD COLUMN "created_by" integer NOT NULL;--> statement-breakpoint
ALTER TABLE "sales"."subscription_templates" ADD COLUMN "updated_by" integer NOT NULL;--> statement-breakpoint
ALTER TABLE "sales"."subscriptions" ADD COLUMN "created_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "sales"."subscriptions" ADD COLUMN "updated_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "sales"."subscriptions" ADD COLUMN "deleted_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "sales"."subscriptions" ADD COLUMN "created_by" integer NOT NULL;--> statement-breakpoint
ALTER TABLE "sales"."subscriptions" ADD COLUMN "updated_by" integer NOT NULL;--> statement-breakpoint
ALTER TABLE "sales"."tax_groups" ADD COLUMN "created_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "sales"."tax_groups" ADD COLUMN "updated_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "sales"."tax_groups" ADD COLUMN "deleted_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "sales"."tax_groups" ADD COLUMN "created_by" integer NOT NULL;--> statement-breakpoint
ALTER TABLE "sales"."tax_groups" ADD COLUMN "updated_by" integer NOT NULL;--> statement-breakpoint
ALTER TABLE "sales"."tax_rate_children" ADD COLUMN "created_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "sales"."tax_rate_children" ADD COLUMN "updated_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "sales"."tax_rate_children" ADD COLUMN "created_by" integer NOT NULL;--> statement-breakpoint
ALTER TABLE "sales"."tax_rate_children" ADD COLUMN "updated_by" integer NOT NULL;--> statement-breakpoint
ALTER TABLE "sales"."tax_rates" ADD COLUMN "created_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "sales"."tax_rates" ADD COLUMN "updated_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "sales"."tax_rates" ADD COLUMN "deleted_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "sales"."tax_rates" ADD COLUMN "created_by" integer NOT NULL;--> statement-breakpoint
ALTER TABLE "sales"."tax_rates" ADD COLUMN "updated_by" integer NOT NULL;--> statement-breakpoint
ALTER TABLE "sales"."territories" ADD COLUMN "created_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "sales"."territories" ADD COLUMN "updated_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "sales"."territories" ADD COLUMN "deleted_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "sales"."territories" ADD COLUMN "created_by" integer NOT NULL;--> statement-breakpoint
ALTER TABLE "sales"."territories" ADD COLUMN "updated_by" integer NOT NULL;--> statement-breakpoint
ALTER TABLE "sales"."territory_rules" ADD COLUMN "created_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "sales"."territory_rules" ADD COLUMN "updated_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "sales"."territory_rules" ADD COLUMN "deleted_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "sales"."territory_rules" ADD COLUMN "created_by" integer NOT NULL;--> statement-breakpoint
ALTER TABLE "sales"."territory_rules" ADD COLUMN "updated_by" integer NOT NULL;--> statement-breakpoint
ALTER TABLE "core"."tenants" DROP COLUMN "createdAt";--> statement-breakpoint
ALTER TABLE "core"."tenants" DROP COLUMN "updatedAt";--> statement-breakpoint
ALTER TABLE "core"."tenants" DROP COLUMN "deletedAt";--> statement-breakpoint
ALTER TABLE "core"."app_modules" DROP COLUMN "createdAt";--> statement-breakpoint
ALTER TABLE "core"."app_modules" DROP COLUMN "updatedAt";--> statement-breakpoint
ALTER TABLE "core"."app_modules" DROP COLUMN "deletedAt";--> statement-breakpoint
ALTER TABLE "core"."app_modules" DROP COLUMN "createdBy";--> statement-breakpoint
ALTER TABLE "core"."app_modules" DROP COLUMN "updatedBy";--> statement-breakpoint
ALTER TABLE "reference"."approval_logs" DROP COLUMN "createdAt";--> statement-breakpoint
ALTER TABLE "reference"."banks" DROP COLUMN "createdAt";--> statement-breakpoint
ALTER TABLE "reference"."banks" DROP COLUMN "updatedAt";--> statement-breakpoint
ALTER TABLE "reference"."banks" DROP COLUMN "deletedAt";--> statement-breakpoint
ALTER TABLE "reference"."banks" DROP COLUMN "createdBy";--> statement-breakpoint
ALTER TABLE "reference"."banks" DROP COLUMN "updatedBy";--> statement-breakpoint
ALTER TABLE "reference"."countries" DROP COLUMN "createdAt";--> statement-breakpoint
ALTER TABLE "reference"."countries" DROP COLUMN "updatedAt";--> statement-breakpoint
ALTER TABLE "reference"."countries" DROP COLUMN "deletedAt";--> statement-breakpoint
ALTER TABLE "reference"."countries" DROP COLUMN "createdBy";--> statement-breakpoint
ALTER TABLE "reference"."countries" DROP COLUMN "updatedBy";--> statement-breakpoint
ALTER TABLE "reference"."currencies" DROP COLUMN "createdAt";--> statement-breakpoint
ALTER TABLE "reference"."currencies" DROP COLUMN "updatedAt";--> statement-breakpoint
ALTER TABLE "reference"."currencies" DROP COLUMN "deletedAt";--> statement-breakpoint
ALTER TABLE "reference"."currencies" DROP COLUMN "createdBy";--> statement-breakpoint
ALTER TABLE "reference"."currencies" DROP COLUMN "updatedBy";--> statement-breakpoint
ALTER TABLE "reference"."currency_rates" DROP COLUMN "createdAt";--> statement-breakpoint
ALTER TABLE "reference"."currency_rates" DROP COLUMN "createdBy";--> statement-breakpoint
ALTER TABLE "reference"."currency_rates" DROP COLUMN "updatedBy";--> statement-breakpoint
ALTER TABLE "reference"."document_attachments" DROP COLUMN "createdAt";--> statement-breakpoint
ALTER TABLE "reference"."sequences" DROP COLUMN "createdAt";--> statement-breakpoint
ALTER TABLE "reference"."sequences" DROP COLUMN "updatedAt";--> statement-breakpoint
ALTER TABLE "reference"."sequences" DROP COLUMN "deletedAt";--> statement-breakpoint
ALTER TABLE "reference"."sequences" DROP COLUMN "createdBy";--> statement-breakpoint
ALTER TABLE "reference"."sequences" DROP COLUMN "updatedBy";--> statement-breakpoint
ALTER TABLE "reference"."states" DROP COLUMN "createdAt";--> statement-breakpoint
ALTER TABLE "reference"."states" DROP COLUMN "updatedAt";--> statement-breakpoint
ALTER TABLE "reference"."states" DROP COLUMN "deletedAt";--> statement-breakpoint
ALTER TABLE "reference"."states" DROP COLUMN "createdBy";--> statement-breakpoint
ALTER TABLE "reference"."states" DROP COLUMN "updatedBy";--> statement-breakpoint
ALTER TABLE "reference"."units_of_measure" DROP COLUMN "createdAt";--> statement-breakpoint
ALTER TABLE "reference"."units_of_measure" DROP COLUMN "updatedAt";--> statement-breakpoint
ALTER TABLE "reference"."units_of_measure" DROP COLUMN "deletedAt";--> statement-breakpoint
ALTER TABLE "reference"."units_of_measure" DROP COLUMN "createdBy";--> statement-breakpoint
ALTER TABLE "reference"."units_of_measure" DROP COLUMN "updatedBy";--> statement-breakpoint
ALTER TABLE "reference"."uom_categories" DROP COLUMN "createdAt";--> statement-breakpoint
ALTER TABLE "reference"."uom_categories" DROP COLUMN "updatedAt";--> statement-breakpoint
ALTER TABLE "reference"."uom_categories" DROP COLUMN "deletedAt";--> statement-breakpoint
ALTER TABLE "reference"."uom_categories" DROP COLUMN "createdBy";--> statement-breakpoint
ALTER TABLE "reference"."uom_categories" DROP COLUMN "updatedBy";--> statement-breakpoint
ALTER TABLE "security"."users" DROP COLUMN "createdAt";--> statement-breakpoint
ALTER TABLE "security"."users" DROP COLUMN "updatedAt";--> statement-breakpoint
ALTER TABLE "security"."users" DROP COLUMN "deletedAt";--> statement-breakpoint
ALTER TABLE "security"."users" DROP COLUMN "createdBy";--> statement-breakpoint
ALTER TABLE "security"."users" DROP COLUMN "updatedBy";--> statement-breakpoint
ALTER TABLE "security"."roles" DROP COLUMN "createdAt";--> statement-breakpoint
ALTER TABLE "security"."roles" DROP COLUMN "updatedAt";--> statement-breakpoint
ALTER TABLE "security"."roles" DROP COLUMN "deletedAt";--> statement-breakpoint
ALTER TABLE "security"."roles" DROP COLUMN "createdBy";--> statement-breakpoint
ALTER TABLE "security"."roles" DROP COLUMN "updatedBy";--> statement-breakpoint
ALTER TABLE "security"."user_roles" DROP COLUMN "createdAt";--> statement-breakpoint
ALTER TABLE "security"."user_roles" DROP COLUMN "updatedAt";--> statement-breakpoint
ALTER TABLE "security"."permissions" DROP COLUMN "createdAt";--> statement-breakpoint
ALTER TABLE "security"."permissions" DROP COLUMN "updatedAt";--> statement-breakpoint
ALTER TABLE "security"."permissions" DROP COLUMN "deletedAt";--> statement-breakpoint
ALTER TABLE "security"."permissions" DROP COLUMN "createdBy";--> statement-breakpoint
ALTER TABLE "security"."permissions" DROP COLUMN "updatedBy";--> statement-breakpoint
ALTER TABLE "security"."role_permissions" DROP COLUMN "createdAt";--> statement-breakpoint
ALTER TABLE "security"."role_permissions" DROP COLUMN "updatedAt";--> statement-breakpoint
ALTER TABLE "security"."role_permissions" DROP COLUMN "createdBy";--> statement-breakpoint
ALTER TABLE "security"."role_permissions" DROP COLUMN "updatedBy";--> statement-breakpoint
ALTER TABLE "security"."user_permissions" DROP COLUMN "createdAt";--> statement-breakpoint
ALTER TABLE "security"."user_permissions" DROP COLUMN "updatedAt";--> statement-breakpoint
ALTER TABLE "security"."user_permissions" DROP COLUMN "createdBy";--> statement-breakpoint
ALTER TABLE "security"."user_permissions" DROP COLUMN "updatedBy";--> statement-breakpoint
ALTER TABLE "sales"."accounting_postings" DROP COLUMN "createdAt";--> statement-breakpoint
ALTER TABLE "sales"."accounting_postings" DROP COLUMN "updatedAt";--> statement-breakpoint
ALTER TABLE "sales"."accounting_postings" DROP COLUMN "createdBy";--> statement-breakpoint
ALTER TABLE "sales"."accounting_postings" DROP COLUMN "updatedBy";--> statement-breakpoint
ALTER TABLE "sales"."commission_entries" DROP COLUMN "createdAt";--> statement-breakpoint
ALTER TABLE "sales"."commission_entries" DROP COLUMN "updatedAt";--> statement-breakpoint
ALTER TABLE "sales"."commission_entries" DROP COLUMN "deletedAt";--> statement-breakpoint
ALTER TABLE "sales"."commission_entries" DROP COLUMN "createdBy";--> statement-breakpoint
ALTER TABLE "sales"."commission_entries" DROP COLUMN "updatedBy";--> statement-breakpoint
ALTER TABLE "sales"."commission_plan_tiers" DROP COLUMN "createdAt";--> statement-breakpoint
ALTER TABLE "sales"."commission_plan_tiers" DROP COLUMN "updatedAt";--> statement-breakpoint
ALTER TABLE "sales"."commission_plan_tiers" DROP COLUMN "createdBy";--> statement-breakpoint
ALTER TABLE "sales"."commission_plan_tiers" DROP COLUMN "updatedBy";--> statement-breakpoint
ALTER TABLE "sales"."commission_plans" DROP COLUMN "createdAt";--> statement-breakpoint
ALTER TABLE "sales"."commission_plans" DROP COLUMN "updatedAt";--> statement-breakpoint
ALTER TABLE "sales"."commission_plans" DROP COLUMN "deletedAt";--> statement-breakpoint
ALTER TABLE "sales"."commission_plans" DROP COLUMN "createdBy";--> statement-breakpoint
ALTER TABLE "sales"."commission_plans" DROP COLUMN "updatedBy";--> statement-breakpoint
ALTER TABLE "sales"."consignment_agreement_lines" DROP COLUMN "createdAt";--> statement-breakpoint
ALTER TABLE "sales"."consignment_agreement_lines" DROP COLUMN "updatedAt";--> statement-breakpoint
ALTER TABLE "sales"."consignment_agreement_lines" DROP COLUMN "deletedAt";--> statement-breakpoint
ALTER TABLE "sales"."consignment_agreement_lines" DROP COLUMN "createdBy";--> statement-breakpoint
ALTER TABLE "sales"."consignment_agreement_lines" DROP COLUMN "updatedBy";--> statement-breakpoint
ALTER TABLE "sales"."consignment_agreements" DROP COLUMN "createdAt";--> statement-breakpoint
ALTER TABLE "sales"."consignment_agreements" DROP COLUMN "updatedAt";--> statement-breakpoint
ALTER TABLE "sales"."consignment_agreements" DROP COLUMN "deletedAt";--> statement-breakpoint
ALTER TABLE "sales"."consignment_agreements" DROP COLUMN "createdBy";--> statement-breakpoint
ALTER TABLE "sales"."consignment_agreements" DROP COLUMN "updatedBy";--> statement-breakpoint
ALTER TABLE "sales"."consignment_stock_report_lines" DROP COLUMN "createdAt";--> statement-breakpoint
ALTER TABLE "sales"."consignment_stock_report_lines" DROP COLUMN "updatedAt";--> statement-breakpoint
ALTER TABLE "sales"."consignment_stock_report_lines" DROP COLUMN "createdBy";--> statement-breakpoint
ALTER TABLE "sales"."consignment_stock_report_lines" DROP COLUMN "updatedBy";--> statement-breakpoint
ALTER TABLE "sales"."consignment_stock_reports" DROP COLUMN "createdAt";--> statement-breakpoint
ALTER TABLE "sales"."consignment_stock_reports" DROP COLUMN "updatedAt";--> statement-breakpoint
ALTER TABLE "sales"."consignment_stock_reports" DROP COLUMN "deletedAt";--> statement-breakpoint
ALTER TABLE "sales"."consignment_stock_reports" DROP COLUMN "createdBy";--> statement-breakpoint
ALTER TABLE "sales"."consignment_stock_reports" DROP COLUMN "updatedBy";--> statement-breakpoint
ALTER TABLE "sales"."document_approvals" DROP COLUMN "createdAt";--> statement-breakpoint
ALTER TABLE "sales"."document_approvals" DROP COLUMN "updatedAt";--> statement-breakpoint
ALTER TABLE "sales"."document_approvals" DROP COLUMN "createdBy";--> statement-breakpoint
ALTER TABLE "sales"."document_approvals" DROP COLUMN "updatedBy";--> statement-breakpoint
ALTER TABLE "sales"."document_status_history" DROP COLUMN "createdAt";--> statement-breakpoint
ALTER TABLE "sales"."document_status_history" DROP COLUMN "updatedAt";--> statement-breakpoint
ALTER TABLE "sales"."document_status_history" DROP COLUMN "createdBy";--> statement-breakpoint
ALTER TABLE "sales"."document_status_history" DROP COLUMN "updatedBy";--> statement-breakpoint
ALTER TABLE "sales"."domain_event_logs" DROP COLUMN "createdBy";--> statement-breakpoint
ALTER TABLE "sales"."domain_event_logs" DROP COLUMN "updatedBy";--> statement-breakpoint
ALTER TABLE "sales"."domain_invariant_logs" DROP COLUMN "createdBy";--> statement-breakpoint
ALTER TABLE "sales"."domain_invariant_logs" DROP COLUMN "updatedBy";--> statement-breakpoint
ALTER TABLE "sales"."fiscal_position_account_maps" DROP COLUMN "createdAt";--> statement-breakpoint
ALTER TABLE "sales"."fiscal_position_account_maps" DROP COLUMN "updatedAt";--> statement-breakpoint
ALTER TABLE "sales"."fiscal_position_account_maps" DROP COLUMN "createdBy";--> statement-breakpoint
ALTER TABLE "sales"."fiscal_position_account_maps" DROP COLUMN "updatedBy";--> statement-breakpoint
ALTER TABLE "sales"."fiscal_position_tax_maps" DROP COLUMN "createdAt";--> statement-breakpoint
ALTER TABLE "sales"."fiscal_position_tax_maps" DROP COLUMN "updatedAt";--> statement-breakpoint
ALTER TABLE "sales"."fiscal_position_tax_maps" DROP COLUMN "createdBy";--> statement-breakpoint
ALTER TABLE "sales"."fiscal_position_tax_maps" DROP COLUMN "updatedBy";--> statement-breakpoint
ALTER TABLE "sales"."fiscal_positions" DROP COLUMN "createdAt";--> statement-breakpoint
ALTER TABLE "sales"."fiscal_positions" DROP COLUMN "updatedAt";--> statement-breakpoint
ALTER TABLE "sales"."fiscal_positions" DROP COLUMN "deletedAt";--> statement-breakpoint
ALTER TABLE "sales"."fiscal_positions" DROP COLUMN "createdBy";--> statement-breakpoint
ALTER TABLE "sales"."fiscal_positions" DROP COLUMN "updatedBy";--> statement-breakpoint
ALTER TABLE "sales"."line_item_discounts" DROP COLUMN "createdAt";--> statement-breakpoint
ALTER TABLE "sales"."line_item_discounts" DROP COLUMN "updatedAt";--> statement-breakpoint
ALTER TABLE "sales"."line_item_discounts" DROP COLUMN "createdBy";--> statement-breakpoint
ALTER TABLE "sales"."line_item_discounts" DROP COLUMN "updatedBy";--> statement-breakpoint
ALTER TABLE "sales"."partner_addresses" DROP COLUMN "createdAt";--> statement-breakpoint
ALTER TABLE "sales"."partner_addresses" DROP COLUMN "updatedAt";--> statement-breakpoint
ALTER TABLE "sales"."partner_addresses" DROP COLUMN "deletedAt";--> statement-breakpoint
ALTER TABLE "sales"."partner_addresses" DROP COLUMN "createdBy";--> statement-breakpoint
ALTER TABLE "sales"."partner_addresses" DROP COLUMN "updatedBy";--> statement-breakpoint
ALTER TABLE "sales"."partner_bank_accounts" DROP COLUMN "createdAt";--> statement-breakpoint
ALTER TABLE "sales"."partner_bank_accounts" DROP COLUMN "updatedAt";--> statement-breakpoint
ALTER TABLE "sales"."partner_bank_accounts" DROP COLUMN "deletedAt";--> statement-breakpoint
ALTER TABLE "sales"."partner_bank_accounts" DROP COLUMN "createdBy";--> statement-breakpoint
ALTER TABLE "sales"."partner_bank_accounts" DROP COLUMN "updatedBy";--> statement-breakpoint
ALTER TABLE "sales"."partner_tag_assignments" DROP COLUMN "createdAt";--> statement-breakpoint
ALTER TABLE "sales"."partner_tag_assignments" DROP COLUMN "updatedAt";--> statement-breakpoint
ALTER TABLE "sales"."partner_tag_assignments" DROP COLUMN "createdBy";--> statement-breakpoint
ALTER TABLE "sales"."partner_tag_assignments" DROP COLUMN "updatedBy";--> statement-breakpoint
ALTER TABLE "sales"."partner_tags" DROP COLUMN "createdAt";--> statement-breakpoint
ALTER TABLE "sales"."partner_tags" DROP COLUMN "updatedAt";--> statement-breakpoint
ALTER TABLE "sales"."partner_tags" DROP COLUMN "deletedAt";--> statement-breakpoint
ALTER TABLE "sales"."partner_tags" DROP COLUMN "createdBy";--> statement-breakpoint
ALTER TABLE "sales"."partner_tags" DROP COLUMN "updatedBy";--> statement-breakpoint
ALTER TABLE "sales"."partners" DROP COLUMN "createdAt";--> statement-breakpoint
ALTER TABLE "sales"."partners" DROP COLUMN "updatedAt";--> statement-breakpoint
ALTER TABLE "sales"."partners" DROP COLUMN "deletedAt";--> statement-breakpoint
ALTER TABLE "sales"."partners" DROP COLUMN "createdBy";--> statement-breakpoint
ALTER TABLE "sales"."partners" DROP COLUMN "updatedBy";--> statement-breakpoint
ALTER TABLE "sales"."payment_term_lines" DROP COLUMN "createdAt";--> statement-breakpoint
ALTER TABLE "sales"."payment_term_lines" DROP COLUMN "updatedAt";--> statement-breakpoint
ALTER TABLE "sales"."payment_term_lines" DROP COLUMN "createdBy";--> statement-breakpoint
ALTER TABLE "sales"."payment_term_lines" DROP COLUMN "updatedBy";--> statement-breakpoint
ALTER TABLE "sales"."payment_terms" DROP COLUMN "createdAt";--> statement-breakpoint
ALTER TABLE "sales"."payment_terms" DROP COLUMN "updatedAt";--> statement-breakpoint
ALTER TABLE "sales"."payment_terms" DROP COLUMN "deletedAt";--> statement-breakpoint
ALTER TABLE "sales"."payment_terms" DROP COLUMN "createdBy";--> statement-breakpoint
ALTER TABLE "sales"."payment_terms" DROP COLUMN "updatedBy";--> statement-breakpoint
ALTER TABLE "sales"."pricelist_items" DROP COLUMN "createdAt";--> statement-breakpoint
ALTER TABLE "sales"."pricelist_items" DROP COLUMN "updatedAt";--> statement-breakpoint
ALTER TABLE "sales"."pricelist_items" DROP COLUMN "deletedAt";--> statement-breakpoint
ALTER TABLE "sales"."pricelist_items" DROP COLUMN "createdBy";--> statement-breakpoint
ALTER TABLE "sales"."pricelist_items" DROP COLUMN "updatedBy";--> statement-breakpoint
ALTER TABLE "sales"."pricelists" DROP COLUMN "createdAt";--> statement-breakpoint
ALTER TABLE "sales"."pricelists" DROP COLUMN "updatedAt";--> statement-breakpoint
ALTER TABLE "sales"."pricelists" DROP COLUMN "deletedAt";--> statement-breakpoint
ALTER TABLE "sales"."pricelists" DROP COLUMN "createdBy";--> statement-breakpoint
ALTER TABLE "sales"."pricelists" DROP COLUMN "updatedBy";--> statement-breakpoint
ALTER TABLE "sales"."product_attribute_values" DROP COLUMN "createdAt";--> statement-breakpoint
ALTER TABLE "sales"."product_attribute_values" DROP COLUMN "updatedAt";--> statement-breakpoint
ALTER TABLE "sales"."product_attribute_values" DROP COLUMN "deletedAt";--> statement-breakpoint
ALTER TABLE "sales"."product_attribute_values" DROP COLUMN "createdBy";--> statement-breakpoint
ALTER TABLE "sales"."product_attribute_values" DROP COLUMN "updatedBy";--> statement-breakpoint
ALTER TABLE "sales"."product_attributes" DROP COLUMN "createdAt";--> statement-breakpoint
ALTER TABLE "sales"."product_attributes" DROP COLUMN "updatedAt";--> statement-breakpoint
ALTER TABLE "sales"."product_attributes" DROP COLUMN "deletedAt";--> statement-breakpoint
ALTER TABLE "sales"."product_attributes" DROP COLUMN "createdBy";--> statement-breakpoint
ALTER TABLE "sales"."product_attributes" DROP COLUMN "updatedBy";--> statement-breakpoint
ALTER TABLE "sales"."product_categories" DROP COLUMN "createdAt";--> statement-breakpoint
ALTER TABLE "sales"."product_categories" DROP COLUMN "updatedAt";--> statement-breakpoint
ALTER TABLE "sales"."product_categories" DROP COLUMN "deletedAt";--> statement-breakpoint
ALTER TABLE "sales"."product_categories" DROP COLUMN "createdBy";--> statement-breakpoint
ALTER TABLE "sales"."product_categories" DROP COLUMN "updatedBy";--> statement-breakpoint
ALTER TABLE "sales"."product_packaging" DROP COLUMN "createdAt";--> statement-breakpoint
ALTER TABLE "sales"."product_packaging" DROP COLUMN "updatedAt";--> statement-breakpoint
ALTER TABLE "sales"."product_packaging" DROP COLUMN "deletedAt";--> statement-breakpoint
ALTER TABLE "sales"."product_packaging" DROP COLUMN "createdBy";--> statement-breakpoint
ALTER TABLE "sales"."product_packaging" DROP COLUMN "updatedBy";--> statement-breakpoint
ALTER TABLE "sales"."product_template_attribute_lines" DROP COLUMN "createdAt";--> statement-breakpoint
ALTER TABLE "sales"."product_template_attribute_lines" DROP COLUMN "updatedAt";--> statement-breakpoint
ALTER TABLE "sales"."product_template_attribute_lines" DROP COLUMN "createdBy";--> statement-breakpoint
ALTER TABLE "sales"."product_template_attribute_lines" DROP COLUMN "updatedBy";--> statement-breakpoint
ALTER TABLE "sales"."product_template_attribute_values" DROP COLUMN "createdAt";--> statement-breakpoint
ALTER TABLE "sales"."product_template_attribute_values" DROP COLUMN "updatedAt";--> statement-breakpoint
ALTER TABLE "sales"."product_template_attribute_values" DROP COLUMN "createdBy";--> statement-breakpoint
ALTER TABLE "sales"."product_template_attribute_values" DROP COLUMN "updatedBy";--> statement-breakpoint
ALTER TABLE "sales"."product_templates" DROP COLUMN "createdAt";--> statement-breakpoint
ALTER TABLE "sales"."product_templates" DROP COLUMN "updatedAt";--> statement-breakpoint
ALTER TABLE "sales"."product_templates" DROP COLUMN "deletedAt";--> statement-breakpoint
ALTER TABLE "sales"."product_templates" DROP COLUMN "createdBy";--> statement-breakpoint
ALTER TABLE "sales"."product_templates" DROP COLUMN "updatedBy";--> statement-breakpoint
ALTER TABLE "sales"."product_variants" DROP COLUMN "createdAt";--> statement-breakpoint
ALTER TABLE "sales"."product_variants" DROP COLUMN "updatedAt";--> statement-breakpoint
ALTER TABLE "sales"."product_variants" DROP COLUMN "deletedAt";--> statement-breakpoint
ALTER TABLE "sales"."product_variants" DROP COLUMN "createdBy";--> statement-breakpoint
ALTER TABLE "sales"."product_variants" DROP COLUMN "updatedBy";--> statement-breakpoint
ALTER TABLE "sales"."products" DROP COLUMN "createdAt";--> statement-breakpoint
ALTER TABLE "sales"."products" DROP COLUMN "updatedAt";--> statement-breakpoint
ALTER TABLE "sales"."products" DROP COLUMN "deletedAt";--> statement-breakpoint
ALTER TABLE "sales"."products" DROP COLUMN "createdBy";--> statement-breakpoint
ALTER TABLE "sales"."products" DROP COLUMN "updatedBy";--> statement-breakpoint
ALTER TABLE "sales"."return_order_lines" DROP COLUMN "createdAt";--> statement-breakpoint
ALTER TABLE "sales"."return_order_lines" DROP COLUMN "updatedAt";--> statement-breakpoint
ALTER TABLE "sales"."return_order_lines" DROP COLUMN "createdBy";--> statement-breakpoint
ALTER TABLE "sales"."return_order_lines" DROP COLUMN "updatedBy";--> statement-breakpoint
ALTER TABLE "sales"."return_orders" DROP COLUMN "createdAt";--> statement-breakpoint
ALTER TABLE "sales"."return_orders" DROP COLUMN "updatedAt";--> statement-breakpoint
ALTER TABLE "sales"."return_orders" DROP COLUMN "deletedAt";--> statement-breakpoint
ALTER TABLE "sales"."return_orders" DROP COLUMN "createdBy";--> statement-breakpoint
ALTER TABLE "sales"."return_orders" DROP COLUMN "updatedBy";--> statement-breakpoint
ALTER TABLE "sales"."return_reason_codes" DROP COLUMN "createdAt";--> statement-breakpoint
ALTER TABLE "sales"."return_reason_codes" DROP COLUMN "updatedAt";--> statement-breakpoint
ALTER TABLE "sales"."return_reason_codes" DROP COLUMN "deletedAt";--> statement-breakpoint
ALTER TABLE "sales"."return_reason_codes" DROP COLUMN "createdBy";--> statement-breakpoint
ALTER TABLE "sales"."return_reason_codes" DROP COLUMN "updatedBy";--> statement-breakpoint
ALTER TABLE "sales"."rounding_policies" DROP COLUMN "createdAt";--> statement-breakpoint
ALTER TABLE "sales"."rounding_policies" DROP COLUMN "updatedAt";--> statement-breakpoint
ALTER TABLE "sales"."rounding_policies" DROP COLUMN "deletedAt";--> statement-breakpoint
ALTER TABLE "sales"."rounding_policies" DROP COLUMN "createdBy";--> statement-breakpoint
ALTER TABLE "sales"."rounding_policies" DROP COLUMN "updatedBy";--> statement-breakpoint
ALTER TABLE "sales"."sale_order_line_taxes" DROP COLUMN "createdAt";--> statement-breakpoint
ALTER TABLE "sales"."sale_order_line_taxes" DROP COLUMN "updatedAt";--> statement-breakpoint
ALTER TABLE "sales"."sale_order_line_taxes" DROP COLUMN "createdBy";--> statement-breakpoint
ALTER TABLE "sales"."sale_order_line_taxes" DROP COLUMN "updatedBy";--> statement-breakpoint
ALTER TABLE "sales"."sale_order_option_lines" DROP COLUMN "createdAt";--> statement-breakpoint
ALTER TABLE "sales"."sale_order_option_lines" DROP COLUMN "updatedAt";--> statement-breakpoint
ALTER TABLE "sales"."sale_order_option_lines" DROP COLUMN "createdBy";--> statement-breakpoint
ALTER TABLE "sales"."sale_order_option_lines" DROP COLUMN "updatedBy";--> statement-breakpoint
ALTER TABLE "sales"."sale_order_status_history" DROP COLUMN "createdAt";--> statement-breakpoint
ALTER TABLE "sales"."sale_order_status_history" DROP COLUMN "updatedAt";--> statement-breakpoint
ALTER TABLE "sales"."sale_order_status_history" DROP COLUMN "createdBy";--> statement-breakpoint
ALTER TABLE "sales"."sale_order_status_history" DROP COLUMN "updatedBy";--> statement-breakpoint
ALTER TABLE "sales"."sale_order_tax_summary" DROP COLUMN "createdAt";--> statement-breakpoint
ALTER TABLE "sales"."sale_order_tax_summary" DROP COLUMN "updatedAt";--> statement-breakpoint
ALTER TABLE "sales"."sale_order_tax_summary" DROP COLUMN "createdBy";--> statement-breakpoint
ALTER TABLE "sales"."sale_order_tax_summary" DROP COLUMN "updatedBy";--> statement-breakpoint
ALTER TABLE "sales"."document_attachments" DROP COLUMN "createdAt";--> statement-breakpoint
ALTER TABLE "sales"."document_attachments" DROP COLUMN "updatedAt";--> statement-breakpoint
ALTER TABLE "sales"."document_attachments" DROP COLUMN "deletedAt";--> statement-breakpoint
ALTER TABLE "sales"."document_attachments" DROP COLUMN "createdBy";--> statement-breakpoint
ALTER TABLE "sales"."document_attachments" DROP COLUMN "updatedBy";--> statement-breakpoint
ALTER TABLE "sales"."sales_order_lines" DROP COLUMN "createdAt";--> statement-breakpoint
ALTER TABLE "sales"."sales_order_lines" DROP COLUMN "updatedAt";--> statement-breakpoint
ALTER TABLE "sales"."sales_order_lines" DROP COLUMN "deletedAt";--> statement-breakpoint
ALTER TABLE "sales"."sales_order_lines" DROP COLUMN "createdBy";--> statement-breakpoint
ALTER TABLE "sales"."sales_order_lines" DROP COLUMN "updatedBy";--> statement-breakpoint
ALTER TABLE "sales"."sales_orders" DROP COLUMN "createdAt";--> statement-breakpoint
ALTER TABLE "sales"."sales_orders" DROP COLUMN "updatedAt";--> statement-breakpoint
ALTER TABLE "sales"."sales_orders" DROP COLUMN "deletedAt";--> statement-breakpoint
ALTER TABLE "sales"."sales_orders" DROP COLUMN "createdBy";--> statement-breakpoint
ALTER TABLE "sales"."sales_orders" DROP COLUMN "updatedBy";--> statement-breakpoint
ALTER TABLE "sales"."sales_team_members" DROP COLUMN "createdAt";--> statement-breakpoint
ALTER TABLE "sales"."sales_team_members" DROP COLUMN "updatedAt";--> statement-breakpoint
ALTER TABLE "sales"."sales_team_members" DROP COLUMN "deletedAt";--> statement-breakpoint
ALTER TABLE "sales"."sales_team_members" DROP COLUMN "createdBy";--> statement-breakpoint
ALTER TABLE "sales"."sales_team_members" DROP COLUMN "updatedBy";--> statement-breakpoint
ALTER TABLE "sales"."sales_teams" DROP COLUMN "createdAt";--> statement-breakpoint
ALTER TABLE "sales"."sales_teams" DROP COLUMN "updatedAt";--> statement-breakpoint
ALTER TABLE "sales"."sales_teams" DROP COLUMN "deletedAt";--> statement-breakpoint
ALTER TABLE "sales"."sales_teams" DROP COLUMN "createdBy";--> statement-breakpoint
ALTER TABLE "sales"."sales_teams" DROP COLUMN "updatedBy";--> statement-breakpoint
ALTER TABLE "sales"."subscription_close_reasons" DROP COLUMN "createdAt";--> statement-breakpoint
ALTER TABLE "sales"."subscription_close_reasons" DROP COLUMN "updatedAt";--> statement-breakpoint
ALTER TABLE "sales"."subscription_close_reasons" DROP COLUMN "deletedAt";--> statement-breakpoint
ALTER TABLE "sales"."subscription_close_reasons" DROP COLUMN "createdBy";--> statement-breakpoint
ALTER TABLE "sales"."subscription_close_reasons" DROP COLUMN "updatedBy";--> statement-breakpoint
ALTER TABLE "sales"."subscription_lines" DROP COLUMN "createdAt";--> statement-breakpoint
ALTER TABLE "sales"."subscription_lines" DROP COLUMN "updatedAt";--> statement-breakpoint
ALTER TABLE "sales"."subscription_lines" DROP COLUMN "createdBy";--> statement-breakpoint
ALTER TABLE "sales"."subscription_lines" DROP COLUMN "updatedBy";--> statement-breakpoint
ALTER TABLE "sales"."subscription_logs" DROP COLUMN "createdAt";--> statement-breakpoint
ALTER TABLE "sales"."subscription_logs" DROP COLUMN "updatedAt";--> statement-breakpoint
ALTER TABLE "sales"."subscription_logs" DROP COLUMN "createdBy";--> statement-breakpoint
ALTER TABLE "sales"."subscription_logs" DROP COLUMN "updatedBy";--> statement-breakpoint
ALTER TABLE "sales"."subscription_templates" DROP COLUMN "createdAt";--> statement-breakpoint
ALTER TABLE "sales"."subscription_templates" DROP COLUMN "updatedAt";--> statement-breakpoint
ALTER TABLE "sales"."subscription_templates" DROP COLUMN "deletedAt";--> statement-breakpoint
ALTER TABLE "sales"."subscription_templates" DROP COLUMN "createdBy";--> statement-breakpoint
ALTER TABLE "sales"."subscription_templates" DROP COLUMN "updatedBy";--> statement-breakpoint
ALTER TABLE "sales"."subscriptions" DROP COLUMN "createdAt";--> statement-breakpoint
ALTER TABLE "sales"."subscriptions" DROP COLUMN "updatedAt";--> statement-breakpoint
ALTER TABLE "sales"."subscriptions" DROP COLUMN "deletedAt";--> statement-breakpoint
ALTER TABLE "sales"."subscriptions" DROP COLUMN "createdBy";--> statement-breakpoint
ALTER TABLE "sales"."subscriptions" DROP COLUMN "updatedBy";--> statement-breakpoint
ALTER TABLE "sales"."tax_groups" DROP COLUMN "createdAt";--> statement-breakpoint
ALTER TABLE "sales"."tax_groups" DROP COLUMN "updatedAt";--> statement-breakpoint
ALTER TABLE "sales"."tax_groups" DROP COLUMN "deletedAt";--> statement-breakpoint
ALTER TABLE "sales"."tax_groups" DROP COLUMN "createdBy";--> statement-breakpoint
ALTER TABLE "sales"."tax_groups" DROP COLUMN "updatedBy";--> statement-breakpoint
ALTER TABLE "sales"."tax_rate_children" DROP COLUMN "createdAt";--> statement-breakpoint
ALTER TABLE "sales"."tax_rate_children" DROP COLUMN "updatedAt";--> statement-breakpoint
ALTER TABLE "sales"."tax_rate_children" DROP COLUMN "createdBy";--> statement-breakpoint
ALTER TABLE "sales"."tax_rate_children" DROP COLUMN "updatedBy";--> statement-breakpoint
ALTER TABLE "sales"."tax_rates" DROP COLUMN "createdAt";--> statement-breakpoint
ALTER TABLE "sales"."tax_rates" DROP COLUMN "updatedAt";--> statement-breakpoint
ALTER TABLE "sales"."tax_rates" DROP COLUMN "deletedAt";--> statement-breakpoint
ALTER TABLE "sales"."tax_rates" DROP COLUMN "createdBy";--> statement-breakpoint
ALTER TABLE "sales"."tax_rates" DROP COLUMN "updatedBy";--> statement-breakpoint
ALTER TABLE "sales"."territories" DROP COLUMN "createdAt";--> statement-breakpoint
ALTER TABLE "sales"."territories" DROP COLUMN "updatedAt";--> statement-breakpoint
ALTER TABLE "sales"."territories" DROP COLUMN "deletedAt";--> statement-breakpoint
ALTER TABLE "sales"."territories" DROP COLUMN "createdBy";--> statement-breakpoint
ALTER TABLE "sales"."territories" DROP COLUMN "updatedBy";--> statement-breakpoint
ALTER TABLE "sales"."territory_rules" DROP COLUMN "createdAt";--> statement-breakpoint
ALTER TABLE "sales"."territory_rules" DROP COLUMN "updatedAt";--> statement-breakpoint
ALTER TABLE "sales"."territory_rules" DROP COLUMN "deletedAt";--> statement-breakpoint
ALTER TABLE "sales"."territory_rules" DROP COLUMN "createdBy";--> statement-breakpoint
ALTER TABLE "sales"."territory_rules" DROP COLUMN "updatedBy";--> statement-breakpoint
DROP INDEX "core"."uq_tenants_code";--> statement-breakpoint
CREATE UNIQUE INDEX "uq_tenants_code" ON "core"."tenants" (lower("tenantCode")) WHERE "deleted_at" IS NULL;--> statement-breakpoint
DROP INDEX "core"."uq_app_modules_code";--> statement-breakpoint
CREATE UNIQUE INDEX "uq_app_modules_code" ON "core"."app_modules" ("tenantId",lower("code")) WHERE "deleted_at" IS NULL;--> statement-breakpoint
DROP INDEX "reference"."uq_reference_banks_name_country";--> statement-breakpoint
CREATE UNIQUE INDEX "uq_reference_banks_name_country" ON "reference"."banks" (lower("name"),"country_id") WHERE "deleted_at" IS NULL;--> statement-breakpoint
DROP INDEX "reference"."uq_reference_countries_code";--> statement-breakpoint
CREATE UNIQUE INDEX "uq_reference_countries_code" ON "reference"."countries" (lower("code")) WHERE "deleted_at" IS NULL;--> statement-breakpoint
DROP INDEX "reference"."uq_reference_currencies_code";--> statement-breakpoint
CREATE UNIQUE INDEX "uq_reference_currencies_code" ON "reference"."currencies" (upper("code")) WHERE "deleted_at" IS NULL;--> statement-breakpoint
DROP INDEX "reference"."uq_reference_sequences_tenant_code";--> statement-breakpoint
CREATE UNIQUE INDEX "uq_reference_sequences_tenant_code" ON "reference"."sequences" ("tenant_id",lower("code")) WHERE "deleted_at" IS NULL;--> statement-breakpoint
DROP INDEX "reference"."uq_reference_states_country_code";--> statement-breakpoint
CREATE UNIQUE INDEX "uq_reference_states_country_code" ON "reference"."states" ("country_id",lower("code")) WHERE "deleted_at" IS NULL;--> statement-breakpoint
DROP INDEX "reference"."uq_reference_uoms_category_name";--> statement-breakpoint
CREATE UNIQUE INDEX "uq_reference_uoms_category_name" ON "reference"."units_of_measure" ("category_id",lower("name")) WHERE "deleted_at" IS NULL;--> statement-breakpoint
DROP INDEX "reference"."uq_reference_uoms_reference_per_category";--> statement-breakpoint
CREATE UNIQUE INDEX "uq_reference_uoms_reference_per_category" ON "reference"."units_of_measure" ("category_id") WHERE "deleted_at" IS NULL AND "uom_type" = 'reference';--> statement-breakpoint
DROP INDEX "reference"."uq_reference_uom_categories_name";--> statement-breakpoint
CREATE UNIQUE INDEX "uq_reference_uom_categories_name" ON "reference"."uom_categories" (lower("name")) WHERE "deleted_at" IS NULL;--> statement-breakpoint
DROP INDEX "security"."uq_users_email";--> statement-breakpoint
CREATE UNIQUE INDEX "uq_users_email" ON "security"."users" ("tenantId",lower("email")) WHERE "deleted_at" IS NULL;--> statement-breakpoint
DROP INDEX "security"."uq_roles_code";--> statement-breakpoint
CREATE UNIQUE INDEX "uq_roles_code" ON "security"."roles" ("tenantId",lower("roleCode")) WHERE "deleted_at" IS NULL;--> statement-breakpoint
DROP INDEX "security"."uq_permissions_key";--> statement-breakpoint
CREATE UNIQUE INDEX "uq_permissions_key" ON "security"."permissions" ("tenantId",lower("key")) WHERE "deleted_at" IS NULL;--> statement-breakpoint
DROP INDEX "sales"."uq_sales_commission_plans_name";--> statement-breakpoint
CREATE UNIQUE INDEX "uq_sales_commission_plans_name" ON "sales"."commission_plans" ("tenant_id",lower("name")) WHERE "deleted_at" IS NULL;--> statement-breakpoint
DROP INDEX "sales"."uq_sales_consignment_agreement_lines_unique";--> statement-breakpoint
CREATE UNIQUE INDEX "uq_sales_consignment_agreement_lines_unique" ON "sales"."consignment_agreement_lines" ("tenant_id","agreement_id","product_id") WHERE "deleted_at" IS NULL;--> statement-breakpoint
DROP INDEX "sales"."uq_sales_consignment_agreements_name";--> statement-breakpoint
CREATE UNIQUE INDEX "uq_sales_consignment_agreements_name" ON "sales"."consignment_agreements" ("tenant_id",lower("name")) WHERE "deleted_at" IS NULL;--> statement-breakpoint
DROP INDEX "sales"."uq_sales_consignment_stock_reports_date";--> statement-breakpoint
CREATE UNIQUE INDEX "uq_sales_consignment_stock_reports_date" ON "sales"."consignment_stock_reports" ("tenant_id","agreement_id","report_date") WHERE "deleted_at" IS NULL;--> statement-breakpoint
DROP INDEX "sales"."uq_sales_fiscal_positions_name";--> statement-breakpoint
CREATE UNIQUE INDEX "uq_sales_fiscal_positions_name" ON "sales"."fiscal_positions" ("tenant_id",lower("name")) WHERE "deleted_at" IS NULL;--> statement-breakpoint
DROP INDEX "sales"."uq_sales_partner_addresses_default_type";--> statement-breakpoint
CREATE UNIQUE INDEX "uq_sales_partner_addresses_default_type" ON "sales"."partner_addresses" ("tenant_id","partner_id","type") WHERE "deleted_at" IS NULL AND "is_default" = true;--> statement-breakpoint
DROP INDEX "sales"."uq_sales_partner_bank_accounts_acc_number";--> statement-breakpoint
CREATE UNIQUE INDEX "uq_sales_partner_bank_accounts_acc_number" ON "sales"."partner_bank_accounts" ("tenant_id",lower("acc_number")) WHERE "deleted_at" IS NULL;--> statement-breakpoint
DROP INDEX "sales"."uq_sales_partner_bank_accounts_default";--> statement-breakpoint
CREATE UNIQUE INDEX "uq_sales_partner_bank_accounts_default" ON "sales"."partner_bank_accounts" ("tenant_id","partner_id") WHERE "deleted_at" IS NULL AND "is_default" = true;--> statement-breakpoint
DROP INDEX "sales"."uq_sales_partner_tags_name";--> statement-breakpoint
CREATE UNIQUE INDEX "uq_sales_partner_tags_name" ON "sales"."partner_tags" ("tenant_id",lower("name")) WHERE "deleted_at" IS NULL;--> statement-breakpoint
DROP INDEX "sales"."uq_sales_partners_email";--> statement-breakpoint
CREATE UNIQUE INDEX "uq_sales_partners_email" ON "sales"."partners" ("tenant_id",lower("email")) WHERE "deleted_at" IS NULL AND "email" IS NOT NULL;--> statement-breakpoint
DROP INDEX "sales"."uq_sales_payment_terms_name";--> statement-breakpoint
CREATE UNIQUE INDEX "uq_sales_payment_terms_name" ON "sales"."payment_terms" ("tenant_id",lower("name")) WHERE "deleted_at" IS NULL;--> statement-breakpoint
DROP INDEX "sales"."uq_sales_pricelists_name";--> statement-breakpoint
CREATE UNIQUE INDEX "uq_sales_pricelists_name" ON "sales"."pricelists" ("tenant_id",lower("name")) WHERE "deleted_at" IS NULL;--> statement-breakpoint
DROP INDEX "sales"."uq_sales_product_attribute_values_name";--> statement-breakpoint
CREATE UNIQUE INDEX "uq_sales_product_attribute_values_name" ON "sales"."product_attribute_values" ("tenant_id","attribute_id",lower("name")) WHERE "deleted_at" IS NULL;--> statement-breakpoint
DROP INDEX "sales"."uq_sales_product_attributes_name";--> statement-breakpoint
CREATE UNIQUE INDEX "uq_sales_product_attributes_name" ON "sales"."product_attributes" ("tenant_id",lower("name")) WHERE "deleted_at" IS NULL;--> statement-breakpoint
DROP INDEX "sales"."uq_sales_product_categories_name";--> statement-breakpoint
CREATE UNIQUE INDEX "uq_sales_product_categories_name" ON "sales"."product_categories" ("tenant_id",lower("name")) WHERE "deleted_at" IS NULL;--> statement-breakpoint
DROP INDEX "sales"."uq_sales_product_templates_barcode";--> statement-breakpoint
CREATE UNIQUE INDEX "uq_sales_product_templates_barcode" ON "sales"."product_templates" ("tenant_id",lower("barcode")) WHERE "deleted_at" IS NULL AND "barcode" IS NOT NULL;--> statement-breakpoint
DROP INDEX "sales"."uq_sales_product_variants_barcode";--> statement-breakpoint
CREATE UNIQUE INDEX "uq_sales_product_variants_barcode" ON "sales"."product_variants" ("tenant_id",lower("barcode")) WHERE "deleted_at" IS NULL AND "barcode" IS NOT NULL;--> statement-breakpoint
DROP INDEX "sales"."uq_sales_product_variants_combination";--> statement-breakpoint
CREATE UNIQUE INDEX "uq_sales_product_variants_combination" ON "sales"."product_variants" ("tenant_id","template_id","combination_indices") WHERE "deleted_at" IS NULL;--> statement-breakpoint
DROP INDEX "sales"."uq_sales_products_sku";--> statement-breakpoint
CREATE UNIQUE INDEX "uq_sales_products_sku" ON "sales"."products" ("tenant_id",lower("sku")) WHERE "deleted_at" IS NULL AND "sku" IS NOT NULL;--> statement-breakpoint
DROP INDEX "sales"."idx_sales_return_orders_status";--> statement-breakpoint
CREATE INDEX "idx_sales_return_orders_status" ON "sales"."return_orders" ("tenant_id","status","updated_at");--> statement-breakpoint
DROP INDEX "sales"."uq_sales_return_reason_codes_code";--> statement-breakpoint
CREATE UNIQUE INDEX "uq_sales_return_reason_codes_code" ON "sales"."return_reason_codes" ("tenant_id",lower("code")) WHERE "deleted_at" IS NULL;--> statement-breakpoint
DROP INDEX "sales"."uq_sales_return_reason_codes_name";--> statement-breakpoint
CREATE UNIQUE INDEX "uq_sales_return_reason_codes_name" ON "sales"."return_reason_codes" ("tenant_id",lower("name")) WHERE "deleted_at" IS NULL;--> statement-breakpoint
DROP INDEX "sales"."uq_sales_rounding_policies_effective";--> statement-breakpoint
CREATE UNIQUE INDEX "uq_sales_rounding_policies_effective" ON "sales"."rounding_policies" ("tenant_id","policy_key","currency_code","effective_from") WHERE "deleted_at" IS NULL AND "is_active" = true;--> statement-breakpoint
DROP INDEX "sales"."idx_sales_document_attachments_lookup";--> statement-breakpoint
CREATE INDEX "idx_sales_document_attachments_lookup" ON "sales"."document_attachments" ("tenant_id","document_type","document_id","created_at");--> statement-breakpoint
DROP INDEX "sales"."idx_sales_document_attachments_type";--> statement-breakpoint
CREATE INDEX "idx_sales_document_attachments_type" ON "sales"."document_attachments" ("tenant_id","attachment_type","created_at");--> statement-breakpoint
DROP INDEX "sales"."uq_sales_document_attachments_storage_path";--> statement-breakpoint
CREATE UNIQUE INDEX "uq_sales_document_attachments_storage_path" ON "sales"."document_attachments" ("tenant_id","storage_path") WHERE "deleted_at" IS NULL;--> statement-breakpoint
DROP INDEX "sales"."uq_sales_orders_sequence_number";--> statement-breakpoint
CREATE UNIQUE INDEX "uq_sales_orders_sequence_number" ON "sales"."sales_orders" ("tenant_id","sequence_number") WHERE "deleted_at" IS NULL AND "sequence_number" IS NOT NULL;--> statement-breakpoint
DROP INDEX "sales"."uq_sales_sales_team_members_unique";--> statement-breakpoint
CREATE UNIQUE INDEX "uq_sales_sales_team_members_unique" ON "sales"."sales_team_members" ("tenant_id","team_id","user_id") WHERE "deleted_at" IS NULL;--> statement-breakpoint
DROP INDEX "sales"."uq_sales_sales_teams_code";--> statement-breakpoint
CREATE UNIQUE INDEX "uq_sales_sales_teams_code" ON "sales"."sales_teams" ("tenant_id",lower("code")) WHERE "deleted_at" IS NULL;--> statement-breakpoint
DROP INDEX "sales"."uq_sales_sales_teams_name";--> statement-breakpoint
CREATE UNIQUE INDEX "uq_sales_sales_teams_name" ON "sales"."sales_teams" ("tenant_id",lower("name")) WHERE "deleted_at" IS NULL;--> statement-breakpoint
DROP INDEX "sales"."uq_sales_subscription_close_reasons_code";--> statement-breakpoint
CREATE UNIQUE INDEX "uq_sales_subscription_close_reasons_code" ON "sales"."subscription_close_reasons" ("tenant_id",lower("code")) WHERE "deleted_at" IS NULL;--> statement-breakpoint
DROP INDEX "sales"."uq_sales_subscription_close_reasons_name";--> statement-breakpoint
CREATE UNIQUE INDEX "uq_sales_subscription_close_reasons_name" ON "sales"."subscription_close_reasons" ("tenant_id",lower("name")) WHERE "deleted_at" IS NULL;--> statement-breakpoint
DROP INDEX "sales"."uq_sales_subscription_templates_name";--> statement-breakpoint
CREATE UNIQUE INDEX "uq_sales_subscription_templates_name" ON "sales"."subscription_templates" ("tenant_id",lower("name")) WHERE "deleted_at" IS NULL;--> statement-breakpoint
DROP INDEX "sales"."uq_sales_subscriptions_name";--> statement-breakpoint
CREATE UNIQUE INDEX "uq_sales_subscriptions_name" ON "sales"."subscriptions" ("tenant_id",lower("name")) WHERE "deleted_at" IS NULL;--> statement-breakpoint
DROP INDEX "sales"."uq_sales_tax_groups_name";--> statement-breakpoint
CREATE UNIQUE INDEX "uq_sales_tax_groups_name" ON "sales"."tax_groups" ("tenant_id",lower("name")) WHERE "deleted_at" IS NULL;--> statement-breakpoint
DROP INDEX "sales"."uq_sales_tax_rates_name";--> statement-breakpoint
CREATE UNIQUE INDEX "uq_sales_tax_rates_name" ON "sales"."tax_rates" ("tenant_id",lower("name")) WHERE "deleted_at" IS NULL;--> statement-breakpoint
DROP INDEX "sales"."uq_sales_territories_code";--> statement-breakpoint
CREATE UNIQUE INDEX "uq_sales_territories_code" ON "sales"."territories" ("tenant_id",lower("code")) WHERE "deleted_at" IS NULL;--> statement-breakpoint
DROP INDEX "sales"."uq_sales_territories_name";--> statement-breakpoint
CREATE UNIQUE INDEX "uq_sales_territories_name" ON "sales"."territories" ("tenant_id",lower("name")) WHERE "deleted_at" IS NULL;