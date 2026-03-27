CREATE SCHEMA "core";
--> statement-breakpoint
CREATE SCHEMA "reference";
--> statement-breakpoint
CREATE SCHEMA "security";
--> statement-breakpoint
CREATE SCHEMA "sales";
--> statement-breakpoint
CREATE TYPE "core"."tenant_status" AS ENUM('ACTIVE', 'SUSPENDED', 'CLOSED');--> statement-breakpoint
CREATE TYPE "reference"."approval_action" AS ENUM('submit', 'approve', 'reject', 'escalate');--> statement-breakpoint
CREATE TYPE "reference"."approval_entity_type" AS ENUM('sale_order', 'return_order', 'consignment_agreement', 'subscription', 'commission_batch');--> statement-breakpoint
CREATE TYPE "reference"."attachment_entity_type" AS ENUM('sale_order', 'return_order', 'consignment_agreement', 'subscription', 'partner');--> statement-breakpoint
CREATE TYPE "reference"."sequence_reset_period" AS ENUM('yearly', 'monthly', 'never');--> statement-breakpoint
CREATE TYPE "reference"."uom_type" AS ENUM('reference', 'bigger', 'smaller');--> statement-breakpoint
CREATE TYPE "security"."user_status" AS ENUM('ACTIVE', 'INACTIVE', 'LOCKED', 'PENDING_VERIFICATION');--> statement-breakpoint
CREATE TYPE "audit_operation" AS ENUM('create', 'update', 'delete');--> statement-breakpoint
CREATE TYPE "audit_source" AS ENUM('ui', 'api', 'import', 'system', 'migration');--> statement-breakpoint
CREATE TYPE "layout_view_type" AS ENUM('form', 'list', 'kanban', 'dashboard', 'wizard');--> statement-breakpoint
CREATE TYPE "policy_severity" AS ENUM('error', 'warning', 'info');--> statement-breakpoint
CREATE TYPE "isolation_strategy" AS ENUM('logical', 'schema', 'physical');--> statement-breakpoint
CREATE TYPE "override_scope" AS ENUM('global', 'industry', 'tenant', 'department', 'user');--> statement-breakpoint
CREATE TYPE "decision_event_type" AS ENUM('metadata_resolved', 'rule_evaluated', 'policy_enforced', 'workflow_transitioned', 'event_propagated', 'layout_rendered');--> statement-breakpoint
CREATE TYPE "decision_status" AS ENUM('success', 'error');--> statement-breakpoint
CREATE TYPE "sales"."address_type" AS ENUM('invoice', 'delivery', 'contact', 'other');--> statement-breakpoint
CREATE TYPE "sales"."attribute_display_type" AS ENUM('radio', 'select', 'color', 'pills');--> statement-breakpoint
CREATE TYPE "sales"."commission_base" AS ENUM('revenue', 'profit', 'margin');--> statement-breakpoint
CREATE TYPE "sales"."commission_entry_status" AS ENUM('draft', 'approved', 'paid');--> statement-breakpoint
CREATE TYPE "sales"."commission_type" AS ENUM('percentage', 'tiered', 'flat');--> statement-breakpoint
CREATE TYPE "sales"."consignment_report_period" AS ENUM('weekly', 'monthly', 'quarterly');--> statement-breakpoint
CREATE TYPE "sales"."consignment_report_status" AS ENUM('draft', 'confirmed', 'invoiced');--> statement-breakpoint
CREATE TYPE "sales"."consignment_status" AS ENUM('draft', 'active', 'expired', 'terminated');--> statement-breakpoint
CREATE TYPE "sales"."create_variant_policy" AS ENUM('always', 'dynamic', 'no_variant');--> statement-breakpoint
CREATE TYPE "sales"."delivery_status" AS ENUM('no', 'partial', 'full');--> statement-breakpoint
CREATE TYPE "sales"."discount_policy" AS ENUM('with_discount', 'without_discount');--> statement-breakpoint
CREATE TYPE "sales"."discount_source" AS ENUM('manual', 'campaign', 'volume', 'coupon');--> statement-breakpoint
CREATE TYPE "sales"."display_line_type" AS ENUM('line_section', 'line_note', 'product');--> statement-breakpoint
CREATE TYPE "sales"."domain_event_type" AS ENUM('REPORT_VALIDATED', 'REPORT_CONFIRMED', 'INVOICE_GENERATED', 'AGREEMENT_EXPIRED', 'AGREEMENT_ACTIVATED', 'ORDER_MUTATED', 'ORDER_DELETED', 'SUBSCRIPTION_MUTATED', 'SUBSCRIPTION_DELETED', 'COMMISSION_ENTRY_MUTATED', 'COMMISSION_ENTRY_DELETED', 'RETURN_ORDER_MUTATED', 'RETURN_ORDER_DELETED', 'CONSIGNMENT_AGREEMENT_MUTATED', 'CONSIGNMENT_AGREEMENT_DELETED');--> statement-breakpoint
CREATE TYPE "sales"."invariant_severity" AS ENUM('error', 'warning', 'info');--> statement-breakpoint
CREATE TYPE "sales"."invariant_status" AS ENUM('pass', 'fail');--> statement-breakpoint
CREATE TYPE "sales"."invoice_policy" AS ENUM('ordered', 'delivered');--> statement-breakpoint
CREATE TYPE "sales"."invoice_status" AS ENUM('no', 'to_invoice', 'invoiced');--> statement-breakpoint
CREATE TYPE "sales"."order_status" AS ENUM('draft', 'sent', 'sale', 'done', 'cancel');--> statement-breakpoint
CREATE TYPE "sales"."partner_type" AS ENUM('customer', 'vendor', 'both');--> statement-breakpoint
CREATE TYPE "sales"."payment_term_value_type" AS ENUM('balance', 'percent', 'fixed');--> statement-breakpoint
CREATE TYPE "sales"."price_source" AS ENUM('manual', 'pricelist', 'override');--> statement-breakpoint
CREATE TYPE "sales"."pricelist_applied_on" AS ENUM('global', 'product_template', 'product_variant', 'product_category');--> statement-breakpoint
CREATE TYPE "sales"."pricelist_base_type" AS ENUM('list_price', 'standard_price', 'pricelist');--> statement-breakpoint
CREATE TYPE "sales"."pricelist_compute_type" AS ENUM('fixed', 'percentage', 'formula');--> statement-breakpoint
CREATE TYPE "sales"."product_tracking" AS ENUM('none', 'lot', 'serial');--> statement-breakpoint
CREATE TYPE "sales"."product_type" AS ENUM('consumable', 'storable', 'service');--> statement-breakpoint
CREATE TYPE "sales"."restock_policy" AS ENUM('restock', 'scrap', 'return_to_vendor');--> statement-breakpoint
CREATE TYPE "sales"."return_condition" AS ENUM('new', 'used', 'damaged', 'defective');--> statement-breakpoint
CREATE TYPE "sales"."return_status" AS ENUM('draft', 'approved', 'received', 'inspected', 'credited', 'cancelled');--> statement-breakpoint
CREATE TYPE "sales"."subscription_billing_period" AS ENUM('weekly', 'monthly', 'quarterly', 'yearly');--> statement-breakpoint
CREATE TYPE "sales"."subscription_log_event_type" AS ENUM('created', 'renewed', 'paused', 'resumed', 'plan_changed', 'price_changed', 'cancelled', 'payment_failed', 'invoice_generated');--> statement-breakpoint
CREATE TYPE "sales"."subscription_status" AS ENUM('draft', 'active', 'paused', 'past_due', 'cancelled', 'expired');--> statement-breakpoint
CREATE TYPE "sales"."tax_amount_type" AS ENUM('percent', 'fixed', 'group', 'code');--> statement-breakpoint
CREATE TYPE "sales"."tax_type_use" AS ENUM('sale', 'purchase', 'none');--> statement-breakpoint
CREATE TABLE "core"."tenants" (
	"tenant_id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "core"."tenants_tenant_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"tenantCode" text NOT NULL,
	"name" text NOT NULL,
	"status" "core"."tenant_status" DEFAULT 'ACTIVE'::"core"."tenant_status" NOT NULL,
	"settings" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "core"."app_modules" (
	"appModuleId" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "core"."app_modules_appModuleId_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"tenant_id" integer NOT NULL,
	"code" text NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"icon" text,
	"color" text,
	"basePath" text NOT NULL,
	"sortOrder" integer DEFAULT 0 NOT NULL,
	"isEnabled" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	"created_by" integer NOT NULL,
	"updated_by" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "reference"."approval_logs" (
	"approval_log_id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"tenant_id" integer NOT NULL,
	"entity_type" "reference"."approval_entity_type" NOT NULL,
	"entity_id" uuid NOT NULL,
	"action" "reference"."approval_action" NOT NULL,
	"actor_id" integer,
	"actor_role_snapshot" text,
	"reason" text,
	"decided_at" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "reference"."approval_logs" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "reference"."banks" (
	"bank_id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "reference"."banks_bank_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"name" text NOT NULL,
	"bic" text,
	"country_id" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	"created_by" integer NOT NULL,
	"updated_by" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "reference"."countries" (
	"country_id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "reference"."countries_country_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"code" text NOT NULL,
	"name" text NOT NULL,
	"phone_code" text,
	"vat_label" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	"created_by" integer NOT NULL,
	"updated_by" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "reference"."currencies" (
	"currency_id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "reference"."currencies_currency_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"code" text NOT NULL,
	"name" text NOT NULL,
	"symbol" text,
	"decimal_places" integer DEFAULT 2 NOT NULL,
	"rounding" numeric(12,6) DEFAULT '0.01' NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	"created_by" integer NOT NULL,
	"updated_by" integer NOT NULL,
	CONSTRAINT "chk_reference_currencies_decimal_places" CHECK ("decimal_places" >= 0 AND "decimal_places" <= 6),
	CONSTRAINT "chk_reference_currencies_rounding_positive" CHECK ("rounding" > 0)
);
--> statement-breakpoint
CREATE TABLE "reference"."currency_rates" (
	"currency_rate_id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "reference"."currency_rates_currency_rate_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"currency_id" integer NOT NULL,
	"rate" numeric(12,6) NOT NULL,
	"inverse_rate" numeric(12,6) NOT NULL,
	"effective_date" text NOT NULL,
	"source" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" integer NOT NULL,
	"updated_by" integer NOT NULL,
	CONSTRAINT "chk_reference_currency_rates_rate_positive" CHECK ("rate" > 0),
	CONSTRAINT "chk_reference_currency_rates_inverse_rate_positive" CHECK ("inverse_rate" > 0)
);
--> statement-breakpoint
CREATE TABLE "reference"."document_attachments" (
	"attachment_id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"tenant_id" integer NOT NULL,
	"entity_type" "reference"."attachment_entity_type" NOT NULL,
	"entity_id" uuid NOT NULL,
	"filename" text NOT NULL,
	"content_type" text NOT NULL,
	"byte_size" integer NOT NULL,
	"storage_key" text NOT NULL,
	"uploaded_by" integer,
	"checksum" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "chk_reference_document_attachments_byte_size_non_negative" CHECK ("byte_size" >= 0)
);
--> statement-breakpoint
ALTER TABLE "reference"."document_attachments" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "reference"."sequences" (
	"sequence_id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "reference"."sequences_sequence_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"tenant_id" integer NOT NULL,
	"code" text NOT NULL,
	"prefix" text,
	"suffix" text,
	"padding" integer DEFAULT 4 NOT NULL,
	"step" integer DEFAULT 1 NOT NULL,
	"next_number" integer DEFAULT 1 NOT NULL,
	"reset_period" "reference"."sequence_reset_period" DEFAULT 'never'::"reference"."sequence_reset_period" NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	"created_by" integer NOT NULL,
	"updated_by" integer NOT NULL,
	CONSTRAINT "chk_reference_sequences_padding_non_negative" CHECK ("padding" >= 0),
	CONSTRAINT "chk_reference_sequences_step_positive" CHECK ("step" > 0),
	CONSTRAINT "chk_reference_sequences_next_number_positive" CHECK ("next_number" > 0)
);
--> statement-breakpoint
ALTER TABLE "reference"."sequences" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "reference"."states" (
	"state_id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "reference"."states_state_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"country_id" integer NOT NULL,
	"code" text NOT NULL,
	"name" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	"created_by" integer NOT NULL,
	"updated_by" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "reference"."units_of_measure" (
	"uom_id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "reference"."units_of_measure_uom_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"category_id" integer NOT NULL,
	"name" text NOT NULL,
	"factor" numeric(14,6) NOT NULL,
	"uom_type" "reference"."uom_type" NOT NULL,
	"rounding" numeric(14,6) DEFAULT '0.0001' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	"created_by" integer NOT NULL,
	"updated_by" integer NOT NULL,
	CONSTRAINT "chk_reference_uoms_factor_positive" CHECK ("factor" > 0),
	CONSTRAINT "chk_reference_uoms_rounding_positive" CHECK ("rounding" > 0)
);
--> statement-breakpoint
CREATE TABLE "reference"."uom_categories" (
	"uom_category_id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "reference"."uom_categories_uom_category_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"name" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	"created_by" integer NOT NULL,
	"updated_by" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "security"."users" (
	"userId" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "security"."users_userId_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"tenant_id" integer NOT NULL,
	"email" text NOT NULL,
	"displayName" text NOT NULL,
	"status" "security"."user_status" DEFAULT 'PENDING_VERIFICATION'::"security"."user_status" NOT NULL,
	"emailVerified" boolean DEFAULT false NOT NULL,
	"avatarUrl" text,
	"lastLoginAt" timestamp with time zone,
	"locale" text,
	"timezone" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	"created_by" integer NOT NULL,
	"updated_by" integer NOT NULL
);
--> statement-breakpoint
ALTER TABLE "security"."users" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "security"."roles" (
	"roleId" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "security"."roles_roleId_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"tenant_id" integer NOT NULL,
	"roleCode" text NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"permissions" jsonb,
	"isSystemRole" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	"created_by" integer NOT NULL,
	"updated_by" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "security"."user_roles" (
	"userId" integer,
	"roleId" integer,
	"tenant_id" integer NOT NULL,
	"assignedAt" timestamp with time zone DEFAULT now() NOT NULL,
	"assignedBy" integer NOT NULL,
	"expiresAt" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "pk_user_roles" PRIMARY KEY("userId","roleId")
);
--> statement-breakpoint
CREATE TABLE "security"."permissions" (
	"permissionId" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "security"."permissions_permissionId_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"tenant_id" integer NOT NULL,
	"resource" text NOT NULL,
	"action" text NOT NULL,
	"key" text NOT NULL,
	"description" text,
	"isSystemPermission" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	"created_by" integer NOT NULL,
	"updated_by" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "security"."role_permissions" (
	"rolePermissionId" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "security"."role_permissions_rolePermissionId_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"tenant_id" integer NOT NULL,
	"roleId" integer NOT NULL,
	"permissionId" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" integer NOT NULL,
	"updated_by" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "security"."user_permissions" (
	"userPermissionId" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "security"."user_permissions_userPermissionId_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"tenant_id" integer NOT NULL,
	"userId" integer NOT NULL,
	"permissionId" integer NOT NULL,
	"reason" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" integer NOT NULL,
	"updated_by" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "schema_registry" (
	"model" text PRIMARY KEY,
	"module" text DEFAULT 'core' NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"meta" jsonb NOT NULL,
	"permissions" jsonb DEFAULT '{}' NOT NULL,
	"field_permissions" jsonb DEFAULT '[]',
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "audit_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"entity" text NOT NULL,
	"record_id" text NOT NULL,
	"actor" text NOT NULL,
	"operation" "audit_operation" NOT NULL,
	"source" "audit_source" DEFAULT 'api'::"audit_source" NOT NULL,
	"diff_json" jsonb DEFAULT '[]' NOT NULL,
	"reason" text,
	"metadata" jsonb,
	"timestamp" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "entities" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"name" text NOT NULL UNIQUE,
	"module" text DEFAULT 'core' NOT NULL,
	"label" text,
	"description" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"aggregate_type" text NOT NULL,
	"aggregate_id" text NOT NULL,
	"event_type" text NOT NULL,
	"event_payload" jsonb NOT NULL,
	"metadata" jsonb,
	"version" integer DEFAULT 1 NOT NULL,
	"timestamp" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "fields" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"entity_id" uuid NOT NULL,
	"name" text NOT NULL,
	"label" text NOT NULL,
	"data_type" text NOT NULL,
	"business_type" text,
	"is_required" boolean DEFAULT false NOT NULL,
	"is_unique" boolean DEFAULT false NOT NULL,
	"is_readonly" boolean DEFAULT false NOT NULL,
	"default_value" text,
	"compute_formula" text,
	"visibility_rule" jsonb,
	"access_roles" jsonb DEFAULT '[]',
	"audit_level" text DEFAULT 'low',
	"field_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "layouts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"entity_id" uuid NOT NULL,
	"name" text NOT NULL,
	"view_type" "layout_view_type" DEFAULT 'form'::"layout_view_type" NOT NULL,
	"layout_json" jsonb NOT NULL,
	"roles" jsonb DEFAULT '[]',
	"version" integer DEFAULT 1 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"is_default" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "policies" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"scope_entity" text NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"when_dsl" text,
	"validate_dsl" text NOT NULL,
	"message" text NOT NULL,
	"severity" "policy_severity" DEFAULT 'error'::"policy_severity" NOT NULL,
	"is_enabled" boolean DEFAULT true NOT NULL,
	"is_blocking" boolean DEFAULT true NOT NULL,
	"tags" jsonb DEFAULT '[]',
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "industry_templates" (
	"industry" text PRIMARY KEY,
	"template" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "metadata_overrides" (
	"id" text PRIMARY KEY,
	"scope" "override_scope" NOT NULL,
	"tenant_id" text,
	"department_id" text,
	"user_id" text,
	"model" text NOT NULL,
	"patch" jsonb NOT NULL,
	"enabled" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tenant_definitions" (
	"id" text PRIMARY KEY,
	"name" text NOT NULL,
	"industry" text,
	"isolation_strategy" "isolation_strategy" DEFAULT 'logical'::"isolation_strategy" NOT NULL,
	"enabled" boolean DEFAULT true NOT NULL,
	"branding" jsonb,
	"features" jsonb DEFAULT '{}',
	"locale" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "decision_audit_chains" (
	"root_id" text PRIMARY KEY,
	"total_duration_ms" real DEFAULT 0 NOT NULL,
	"entry_count" integer DEFAULT 0 NOT NULL,
	"error_count" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "decision_audit_entries" (
	"id" text PRIMARY KEY,
	"timestamp" timestamp with time zone DEFAULT now() NOT NULL,
	"tenant_id" text NOT NULL,
	"user_id" text,
	"event_type" "decision_event_type" NOT NULL,
	"scope" text NOT NULL,
	"context" jsonb DEFAULT '{}' NOT NULL,
	"decision" jsonb NOT NULL,
	"duration_ms" real NOT NULL,
	"status" "decision_status" NOT NULL,
	"error" jsonb,
	"chain_id" text
);
--> statement-breakpoint
CREATE TABLE "sales"."accounting_postings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"tenant_id" integer NOT NULL,
	"source_document_type" text NOT NULL,
	"source_document_id" uuid NOT NULL,
	"journal_entry_id" uuid,
	"posting_date" timestamp with time zone NOT NULL,
	"debit_account_code" text,
	"credit_account_code" text,
	"amount" numeric(14,2) DEFAULT '0' NOT NULL,
	"currency_code" text NOT NULL,
	"posting_status" text DEFAULT 'draft' NOT NULL,
	"posted_by" integer,
	"posted_at" timestamp with time zone,
	"reversed_at" timestamp with time zone,
	"reversed_by" integer,
	"reversal_reason" text,
	"reversal_entry_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" integer NOT NULL,
	"updated_by" integer NOT NULL,
	CONSTRAINT "chk_sales_accounting_postings_amount_non_negative" CHECK ("amount" >= 0),
	CONSTRAINT "chk_sales_accounting_postings_status" CHECK ("posting_status" IN ('draft', 'posted', 'reversed')),
	CONSTRAINT "chk_sales_accounting_postings_posted_consistency" CHECK ("posting_status" <> 'posted' OR ("posted_by" IS NOT NULL AND "posted_at" IS NOT NULL)),
	CONSTRAINT "chk_sales_accounting_postings_reversed_consistency" CHECK ("posting_status" <> 'reversed' OR ("reversed_by" IS NOT NULL AND "reversed_at" IS NOT NULL))
);
--> statement-breakpoint
ALTER TABLE "sales"."accounting_postings" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "sales"."commission_entries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"tenant_id" integer NOT NULL,
	"order_id" uuid NOT NULL,
	"salesperson_id" integer NOT NULL,
	"plan_id" uuid NOT NULL,
	"base_amount" numeric(14,2) DEFAULT '0' NOT NULL,
	"commission_amount" numeric(14,2) DEFAULT '0' NOT NULL,
	"status" "sales"."commission_entry_status" DEFAULT 'draft'::"sales"."commission_entry_status" NOT NULL,
	"paid_date" timestamp with time zone,
	"period_start" timestamp with time zone NOT NULL,
	"period_end" timestamp with time zone NOT NULL,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	"created_by" integer NOT NULL,
	"updated_by" integer NOT NULL,
	CONSTRAINT "chk_sales_commission_entries_base_non_negative" CHECK ("base_amount" >= 0),
	CONSTRAINT "chk_sales_commission_entries_amount_non_negative" CHECK ("commission_amount" >= 0),
	CONSTRAINT "chk_sales_commission_entries_period_order" CHECK ("period_end" >= "period_start"),
	CONSTRAINT "chk_sales_commission_entries_paid_requires_date" CHECK ("status" <> 'paid' OR "paid_date" IS NOT NULL)
);
--> statement-breakpoint
ALTER TABLE "sales"."commission_entries" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "sales"."commission_plan_tiers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"tenant_id" integer NOT NULL,
	"plan_id" uuid NOT NULL,
	"min_amount" numeric(14,2) DEFAULT '0' NOT NULL,
	"max_amount" numeric(14,2),
	"rate" numeric(9,4) DEFAULT '0' NOT NULL,
	"sequence" integer DEFAULT 10 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" integer NOT NULL,
	"updated_by" integer NOT NULL,
	CONSTRAINT "chk_sales_commission_plan_tiers_min_non_negative" CHECK ("min_amount" >= 0),
	CONSTRAINT "chk_sales_commission_plan_tiers_max_after_min" CHECK ("max_amount" IS NULL OR "max_amount" >= "min_amount"),
	CONSTRAINT "chk_sales_commission_plan_tiers_rate_percentage" CHECK ("rate" >= 0 AND "rate" <= 100),
	CONSTRAINT "chk_sales_commission_plan_tiers_sequence_non_negative" CHECK ("sequence" >= 0)
);
--> statement-breakpoint
ALTER TABLE "sales"."commission_plan_tiers" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "sales"."commission_plans" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"tenant_id" integer NOT NULL,
	"name" text NOT NULL,
	"type" "sales"."commission_type" DEFAULT 'percentage'::"sales"."commission_type" NOT NULL,
	"base" "sales"."commission_base" DEFAULT 'revenue'::"sales"."commission_base" NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	"created_by" integer NOT NULL,
	"updated_by" integer NOT NULL
);
--> statement-breakpoint
ALTER TABLE "sales"."commission_plans" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "sales"."consignment_agreement_lines" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"tenant_id" integer NOT NULL,
	"agreement_id" uuid NOT NULL,
	"product_id" uuid NOT NULL,
	"max_quantity" numeric(12,4) DEFAULT '0' NOT NULL,
	"unit_price" numeric(14,2) DEFAULT '0' NOT NULL,
	"min_report_period" "sales"."consignment_report_period" DEFAULT 'monthly'::"sales"."consignment_report_period" NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	"created_by" integer NOT NULL,
	"updated_by" integer NOT NULL,
	CONSTRAINT "chk_sales_consignment_agreement_lines_max_qty_non_negative" CHECK ("max_quantity" >= 0),
	CONSTRAINT "chk_sales_consignment_agreement_lines_unit_price_non_negative" CHECK ("unit_price" >= 0)
);
--> statement-breakpoint
ALTER TABLE "sales"."consignment_agreement_lines" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "sales"."consignment_agreements" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"tenant_id" integer NOT NULL,
	"name" text NOT NULL,
	"partner_id" uuid NOT NULL,
	"start_date" timestamp with time zone NOT NULL,
	"end_date" timestamp with time zone,
	"status" "sales"."consignment_status" DEFAULT 'draft'::"sales"."consignment_status" NOT NULL,
	"payment_term_id" uuid,
	"review_period_days" integer DEFAULT 30 NOT NULL,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	"created_by" integer NOT NULL,
	"updated_by" integer NOT NULL,
	CONSTRAINT "chk_sales_consignment_agreements_end_after_start" CHECK ("end_date" IS NULL OR "end_date" >= "start_date"),
	CONSTRAINT "chk_sales_consignment_agreements_review_period_positive" CHECK ("review_period_days" > 0),
	CONSTRAINT "chk_sales_consignment_agreements_expired_requires_end_date" CHECK ("status" <> 'expired' OR "end_date" IS NOT NULL)
);
--> statement-breakpoint
ALTER TABLE "sales"."consignment_agreements" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "sales"."consignment_stock_report_lines" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"tenant_id" integer NOT NULL,
	"report_id" uuid NOT NULL,
	"product_id" uuid NOT NULL,
	"opening_qty" numeric(12,4) DEFAULT '0' NOT NULL,
	"received_qty" numeric(12,4) DEFAULT '0' NOT NULL,
	"sold_qty" numeric(12,4) DEFAULT '0' NOT NULL,
	"returned_qty" numeric(12,4) DEFAULT '0' NOT NULL,
	"closing_qty" numeric(12,4) DEFAULT '0' NOT NULL,
	"unit_price" numeric(14,2) DEFAULT '0' NOT NULL,
	"line_total" numeric(14,2) DEFAULT '0' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" integer NOT NULL,
	"updated_by" integer NOT NULL,
	CONSTRAINT "chk_sales_consignment_stock_report_lines_opening_non_negative" CHECK ("opening_qty" >= 0),
	CONSTRAINT "chk_sales_consignment_stock_report_lines_received_non_negative" CHECK ("received_qty" >= 0),
	CONSTRAINT "chk_sales_consignment_stock_report_lines_sold_non_negative" CHECK ("sold_qty" >= 0),
	CONSTRAINT "chk_sales_consignment_stock_report_lines_returned_non_negative" CHECK ("returned_qty" >= 0),
	CONSTRAINT "chk_sales_consignment_stock_report_lines_closing_non_negative" CHECK ("closing_qty" >= 0),
	CONSTRAINT "chk_sales_consignment_stock_report_lines_unit_price_non_negative" CHECK ("unit_price" >= 0),
	CONSTRAINT "chk_sales_consignment_stock_report_lines_total_non_negative" CHECK ("line_total" >= 0),
	CONSTRAINT "chk_sales_consignment_stock_report_lines_stock_balance" CHECK ("opening_qty" + "received_qty" - "sold_qty" - "returned_qty" = "closing_qty")
);
--> statement-breakpoint
ALTER TABLE "sales"."consignment_stock_report_lines" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "sales"."consignment_stock_reports" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"tenant_id" integer NOT NULL,
	"agreement_id" uuid NOT NULL,
	"report_date" timestamp with time zone NOT NULL,
	"status" "sales"."consignment_report_status" DEFAULT 'draft'::"sales"."consignment_report_status" NOT NULL,
	"submitted_at" timestamp with time zone,
	"confirmed_at" timestamp with time zone,
	"invoiced_at" timestamp with time zone,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	"created_by" integer NOT NULL,
	"updated_by" integer NOT NULL
);
--> statement-breakpoint
ALTER TABLE "sales"."consignment_stock_reports" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "sales"."document_approvals" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"tenant_id" integer NOT NULL,
	"document_type" text NOT NULL,
	"document_id" uuid NOT NULL,
	"approval_level" integer DEFAULT 1 NOT NULL,
	"approver_user_id" integer NOT NULL,
	"approver_role" text,
	"status" text DEFAULT 'pending' NOT NULL,
	"approved_at" timestamp with time zone,
	"rejected_at" timestamp with time zone,
	"comments" text,
	"document_amount" numeric(14,2),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" integer NOT NULL,
	"updated_by" integer NOT NULL,
	CONSTRAINT "chk_sales_document_approvals_level_positive" CHECK ("approval_level" > 0),
	CONSTRAINT "chk_sales_document_approvals_status" CHECK ("status" IN ('pending', 'approved', 'rejected')),
	CONSTRAINT "chk_sales_document_approvals_approved_consistency" CHECK ("status" <> 'approved' OR "approved_at" IS NOT NULL),
	CONSTRAINT "chk_sales_document_approvals_rejected_consistency" CHECK ("status" <> 'rejected' OR "rejected_at" IS NOT NULL),
	CONSTRAINT "chk_sales_document_approvals_amount_non_negative" CHECK ("document_amount" IS NULL OR "document_amount" >= 0)
);
--> statement-breakpoint
ALTER TABLE "sales"."document_approvals" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "sales"."document_status_history" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"tenant_id" integer NOT NULL,
	"document_type" text NOT NULL,
	"document_id" uuid NOT NULL,
	"from_status" text,
	"to_status" text NOT NULL,
	"transitioned_at" timestamp with time zone DEFAULT now() NOT NULL,
	"transitioned_by" integer NOT NULL,
	"reason" text,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" integer NOT NULL,
	"updated_by" integer NOT NULL
);
--> statement-breakpoint
ALTER TABLE "sales"."document_status_history" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "sales"."domain_event_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"tenant_id" integer NOT NULL,
	"event_type" "sales"."domain_event_type" NOT NULL,
	"entity_type" text NOT NULL,
	"entity_id" uuid NOT NULL,
	"payload" text,
	"triggered_by" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" integer NOT NULL,
	"updated_by" integer NOT NULL
);
--> statement-breakpoint
ALTER TABLE "sales"."domain_event_logs" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "sales"."domain_invariant_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"tenant_id" integer NOT NULL,
	"invariant_code" text NOT NULL,
	"entity_type" text NOT NULL,
	"entity_id" uuid NOT NULL,
	"status" "sales"."invariant_status" NOT NULL,
	"severity" "sales"."invariant_severity" NOT NULL,
	"expected_value" text,
	"actual_value" text,
	"context" text,
	"evaluated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" integer NOT NULL,
	"updated_by" integer NOT NULL
);
--> statement-breakpoint
ALTER TABLE "sales"."domain_invariant_logs" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "sales"."fiscal_position_account_maps" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"tenant_id" integer NOT NULL,
	"fiscal_position_id" uuid NOT NULL,
	"account_src_id" text NOT NULL,
	"account_dest_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" integer NOT NULL,
	"updated_by" integer NOT NULL
);
--> statement-breakpoint
ALTER TABLE "sales"."fiscal_position_account_maps" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "sales"."fiscal_position_tax_maps" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"tenant_id" integer NOT NULL,
	"fiscal_position_id" uuid NOT NULL,
	"tax_src_id" uuid NOT NULL,
	"tax_dest_id" uuid,
	"sequence" integer DEFAULT 10 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" integer NOT NULL,
	"updated_by" integer NOT NULL
);
--> statement-breakpoint
ALTER TABLE "sales"."fiscal_position_tax_maps" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "sales"."fiscal_positions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"tenant_id" integer NOT NULL,
	"name" text NOT NULL,
	"country_id" integer,
	"state_ids" text,
	"zip_from" text,
	"zip_to" text,
	"auto_apply" boolean DEFAULT false NOT NULL,
	"vat_required" boolean DEFAULT false NOT NULL,
	"sequence" integer DEFAULT 10 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	"created_by" integer NOT NULL,
	"updated_by" integer NOT NULL
);
--> statement-breakpoint
ALTER TABLE "sales"."fiscal_positions" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "sales"."line_item_discounts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"tenant_id" integer NOT NULL,
	"document_type" text NOT NULL,
	"line_id" uuid NOT NULL,
	"discount_type" text NOT NULL,
	"discount_source" text,
	"discount_percent" numeric(5,2),
	"discount_amount" numeric(14,2),
	"authorized_by" integer,
	"authorized_at" timestamp with time zone,
	"max_discount_allowed" numeric(5,2),
	"reason" text,
	"sequence" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" integer NOT NULL,
	"updated_by" integer NOT NULL,
	CONSTRAINT "chk_sales_line_item_discounts_percent_range" CHECK ("discount_percent" IS NULL OR ("discount_percent" >= 0 AND "discount_percent" <= 100)),
	CONSTRAINT "chk_sales_line_item_discounts_amount_non_negative" CHECK ("discount_amount" IS NULL OR "discount_amount" >= 0),
	CONSTRAINT "chk_sales_line_item_discounts_requires_value" CHECK ("discount_percent" IS NOT NULL OR "discount_amount" IS NOT NULL),
	CONSTRAINT "chk_sales_line_item_discounts_manual_auth" CHECK ("discount_type" <> 'manual' OR "authorized_by" IS NOT NULL),
	CONSTRAINT "chk_sales_line_item_discounts_sequence_positive" CHECK ("sequence" > 0)
);
--> statement-breakpoint
ALTER TABLE "sales"."line_item_discounts" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "sales"."partner_addresses" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"tenant_id" integer NOT NULL,
	"partner_id" uuid NOT NULL,
	"type" "sales"."address_type" DEFAULT 'contact'::"sales"."address_type" NOT NULL,
	"street" text,
	"street2" text,
	"city" text,
	"state_id" integer,
	"country_id" integer,
	"zip" text,
	"phone" text,
	"email" text,
	"contact_name" text,
	"is_default" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	"created_by" integer NOT NULL,
	"updated_by" integer NOT NULL
);
--> statement-breakpoint
ALTER TABLE "sales"."partner_addresses" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "sales"."partner_bank_accounts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"tenant_id" integer NOT NULL,
	"partner_id" uuid NOT NULL,
	"bank_id" integer,
	"acc_number" text NOT NULL,
	"acc_holder_name" text,
	"is_default" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	"created_by" integer NOT NULL,
	"updated_by" integer NOT NULL
);
--> statement-breakpoint
ALTER TABLE "sales"."partner_bank_accounts" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "sales"."partner_tag_assignments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"tenant_id" integer NOT NULL,
	"partner_id" uuid NOT NULL,
	"tag_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" integer NOT NULL,
	"updated_by" integer NOT NULL
);
--> statement-breakpoint
ALTER TABLE "sales"."partner_tag_assignments" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "sales"."partner_tags" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"tenant_id" integer NOT NULL,
	"name" text NOT NULL,
	"color" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	"created_by" integer NOT NULL,
	"updated_by" integer NOT NULL
);
--> statement-breakpoint
ALTER TABLE "sales"."partner_tags" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "sales"."partners" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"tenant_id" integer NOT NULL,
	"name" text NOT NULL,
	"email" text,
	"phone" text,
	"is_company" boolean DEFAULT false NOT NULL,
	"parent_id" uuid,
	"vat" text,
	"website" text,
	"industry" text,
	"relationship_start" timestamp with time zone DEFAULT now() NOT NULL,
	"relationship_end" timestamp with time zone,
	"country_id" integer,
	"state_id" integer,
	"lang" text,
	"credit_limit" numeric(14,2) DEFAULT '0' NOT NULL,
	"default_payment_term_id" uuid,
	"default_pricelist_id" uuid,
	"default_fiscal_position_id" uuid,
	"property_account_receivable_id" text,
	"property_account_payable_id" text,
	"total_invoiced" numeric(14,2) DEFAULT '0' NOT NULL,
	"total_due" numeric(14,2) DEFAULT '0' NOT NULL,
	"type" "sales"."partner_type" DEFAULT 'customer'::"sales"."partner_type" NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	"created_by" integer NOT NULL,
	"updated_by" integer NOT NULL,
	CONSTRAINT "chk_sales_partners_credit_limit_non_negative" CHECK ("credit_limit" >= 0),
	CONSTRAINT "chk_sales_partners_total_invoiced_non_negative" CHECK ("total_invoiced" >= 0),
	CONSTRAINT "chk_sales_partners_total_due_non_negative" CHECK ("total_due" >= 0),
	CONSTRAINT "chk_sales_partners_relationship_dates" CHECK ("relationship_end" IS NULL OR "relationship_end" >= "relationship_start")
);
--> statement-breakpoint
ALTER TABLE "sales"."partners" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "sales"."payment_term_lines" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"tenant_id" integer NOT NULL,
	"payment_term_id" uuid NOT NULL,
	"value_type" "sales"."payment_term_value_type" DEFAULT 'balance'::"sales"."payment_term_value_type" NOT NULL,
	"value" numeric(10,4) DEFAULT '0' NOT NULL,
	"days" integer DEFAULT 0 NOT NULL,
	"day_of_month" integer,
	"end_of_month" boolean DEFAULT false NOT NULL,
	"sequence" integer DEFAULT 10 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" integer NOT NULL,
	"updated_by" integer NOT NULL,
	CONSTRAINT "chk_sales_payment_term_lines_value_non_negative" CHECK ("value" >= 0),
	CONSTRAINT "chk_sales_payment_term_lines_percent_range" CHECK ("value_type" <> 'percent' OR "value" <= 100),
	CONSTRAINT "chk_sales_payment_term_lines_days_non_negative" CHECK ("days" >= 0),
	CONSTRAINT "chk_sales_payment_term_lines_day_of_month_range" CHECK ("day_of_month" IS NULL OR ("day_of_month" >= 1 AND "day_of_month" <= 31)),
	CONSTRAINT "chk_sales_payment_term_lines_sequence_non_negative" CHECK ("sequence" >= 0)
);
--> statement-breakpoint
ALTER TABLE "sales"."payment_term_lines" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "sales"."payment_terms" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"tenant_id" integer NOT NULL,
	"name" text NOT NULL,
	"note" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	"created_by" integer NOT NULL,
	"updated_by" integer NOT NULL
);
--> statement-breakpoint
ALTER TABLE "sales"."payment_terms" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "sales"."pricelist_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"tenant_id" integer NOT NULL,
	"pricelist_id" uuid NOT NULL,
	"applied_on" "sales"."pricelist_applied_on" DEFAULT 'global'::"sales"."pricelist_applied_on" NOT NULL,
	"product_tmpl_id" uuid,
	"product_id" uuid,
	"categ_id" uuid,
	"min_quantity" numeric(12,4) DEFAULT '1' NOT NULL,
	"date_start" timestamp with time zone,
	"date_end" timestamp with time zone,
	"effective_from" timestamp with time zone DEFAULT now() NOT NULL,
	"effective_to" timestamp with time zone,
	"superseded_by" uuid,
	"compute_price" "sales"."pricelist_compute_type" DEFAULT 'fixed'::"sales"."pricelist_compute_type" NOT NULL,
	"fixed_price" numeric(14,4),
	"percent_price" numeric(9,4),
	"base" "sales"."pricelist_base_type" DEFAULT 'list_price'::"sales"."pricelist_base_type" NOT NULL,
	"base_pricelist_id" uuid,
	"price_surcharge" numeric(14,4) DEFAULT '0' NOT NULL,
	"price_discount" numeric(9,4) DEFAULT '0' NOT NULL,
	"price_round" numeric(14,6),
	"price_min_margin" numeric(14,4) DEFAULT '0' NOT NULL,
	"price_max_margin" numeric(14,4) DEFAULT '0' NOT NULL,
	"sequence" integer DEFAULT 10 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	"created_by" integer NOT NULL,
	"updated_by" integer NOT NULL,
	CONSTRAINT "chk_sales_pricelist_items_min_quantity_positive" CHECK ("min_quantity" > 0),
	CONSTRAINT "chk_sales_pricelist_items_percent_price_range" CHECK ("percent_price" IS NULL OR ("percent_price" >= 0 AND "percent_price" <= 100)),
	CONSTRAINT "chk_sales_pricelist_items_price_discount_range" CHECK ("price_discount" >= -100 AND "price_discount" <= 100),
	CONSTRAINT "chk_sales_pricelist_items_date_range" CHECK ("date_end" IS NULL OR "date_start" IS NULL OR "date_end" >= "date_start"),
	CONSTRAINT "chk_sales_pricelist_items_effective_order" CHECK ("effective_to" IS NULL OR "effective_to" >= "effective_from"),
	CONSTRAINT "chk_sales_pricelist_items_margins_non_negative" CHECK ("price_min_margin" >= 0 AND "price_max_margin" >= 0),
	CONSTRAINT "chk_sales_pricelist_items_sequence_non_negative" CHECK ("sequence" >= 0)
);
--> statement-breakpoint
ALTER TABLE "sales"."pricelist_items" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "sales"."pricelists" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"tenant_id" integer NOT NULL,
	"name" text NOT NULL,
	"currency_id" integer NOT NULL,
	"discount_policy" "sales"."discount_policy" DEFAULT 'with_discount'::"sales"."discount_policy" NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"sequence" integer DEFAULT 10 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	"created_by" integer NOT NULL,
	"updated_by" integer NOT NULL,
	CONSTRAINT "chk_sales_pricelists_sequence_non_negative" CHECK ("sequence" >= 0)
);
--> statement-breakpoint
ALTER TABLE "sales"."pricelists" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "sales"."product_attribute_values" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"tenant_id" integer NOT NULL,
	"attribute_id" uuid NOT NULL,
	"name" text NOT NULL,
	"html_color" text,
	"sequence" integer DEFAULT 1 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	"created_by" integer NOT NULL,
	"updated_by" integer NOT NULL
);
--> statement-breakpoint
ALTER TABLE "sales"."product_attribute_values" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "sales"."product_attributes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"tenant_id" integer NOT NULL,
	"name" text NOT NULL,
	"display_type" "sales"."attribute_display_type" DEFAULT 'radio'::"sales"."attribute_display_type" NOT NULL,
	"create_variant_policy" "sales"."create_variant_policy" DEFAULT 'always'::"sales"."create_variant_policy" NOT NULL,
	"sequence" integer DEFAULT 1 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	"created_by" integer NOT NULL,
	"updated_by" integer NOT NULL
);
--> statement-breakpoint
ALTER TABLE "sales"."product_attributes" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "sales"."product_categories" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"tenant_id" integer NOT NULL,
	"name" text NOT NULL,
	"parent_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	"created_by" integer NOT NULL,
	"updated_by" integer NOT NULL
);
--> statement-breakpoint
ALTER TABLE "sales"."product_categories" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "sales"."product_packaging" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"tenant_id" integer NOT NULL,
	"variant_id" uuid NOT NULL,
	"name" text NOT NULL,
	"qty" numeric(12,4) DEFAULT '0' NOT NULL,
	"barcode" text,
	"sequence" integer DEFAULT 1 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	"created_by" integer NOT NULL,
	"updated_by" integer NOT NULL,
	CONSTRAINT "chk_sales_product_packaging_qty_positive" CHECK ("qty" > 0)
);
--> statement-breakpoint
ALTER TABLE "sales"."product_packaging" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "sales"."product_template_attribute_lines" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"tenant_id" integer NOT NULL,
	"template_id" uuid NOT NULL,
	"attribute_id" uuid NOT NULL,
	"sequence" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" integer NOT NULL,
	"updated_by" integer NOT NULL
);
--> statement-breakpoint
ALTER TABLE "sales"."product_template_attribute_lines" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "sales"."product_template_attribute_values" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"tenant_id" integer NOT NULL,
	"template_attribute_line_id" uuid NOT NULL,
	"attribute_value_id" uuid NOT NULL,
	"price_extra" numeric(12,2) DEFAULT '0' NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" integer NOT NULL,
	"updated_by" integer NOT NULL,
	CONSTRAINT "chk_sales_ptmpl_attr_vals_price_extra" CHECK ("price_extra" >= 0)
);
--> statement-breakpoint
ALTER TABLE "sales"."product_template_attribute_values" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "sales"."product_templates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"tenant_id" integer NOT NULL,
	"name" text NOT NULL,
	"internal_reference" text,
	"barcode" text,
	"category_id" uuid,
	"uom_id" integer,
	"uom_po_id" integer,
	"type" "sales"."product_type" DEFAULT 'consumable'::"sales"."product_type" NOT NULL,
	"tracking" "sales"."product_tracking" DEFAULT 'none'::"sales"."product_tracking" NOT NULL,
	"invoice_policy" "sales"."invoice_policy" DEFAULT 'ordered'::"sales"."invoice_policy" NOT NULL,
	"can_be_sold" boolean DEFAULT true NOT NULL,
	"can_be_purchased" boolean DEFAULT true NOT NULL,
	"list_price" numeric(12,2) DEFAULT '0' NOT NULL,
	"standard_price" numeric(12,2) DEFAULT '0' NOT NULL,
	"weight" numeric(10,4),
	"volume" numeric(10,4),
	"description" text,
	"sales_description" text,
	"purchase_description" text,
	"sequence" integer DEFAULT 1 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	"created_by" integer NOT NULL,
	"updated_by" integer NOT NULL,
	CONSTRAINT "chk_sales_product_templates_list_price" CHECK ("list_price" >= 0),
	CONSTRAINT "chk_sales_product_templates_std_price" CHECK ("standard_price" >= 0)
);
--> statement-breakpoint
ALTER TABLE "sales"."product_templates" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "sales"."product_variants" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"tenant_id" integer NOT NULL,
	"template_id" uuid NOT NULL,
	"combination_indices" text DEFAULT '' NOT NULL,
	"internal_reference" text,
	"barcode" text,
	"lst_price" numeric(12,2),
	"standard_price" numeric(12,2),
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	"created_by" integer NOT NULL,
	"updated_by" integer NOT NULL
);
--> statement-breakpoint
ALTER TABLE "sales"."product_variants" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "sales"."products" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"tenant_id" integer NOT NULL,
	"name" text NOT NULL,
	"sku" text,
	"category_id" uuid,
	"unit_price" numeric(12,2) NOT NULL,
	"description" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	"created_by" integer NOT NULL,
	"updated_by" integer NOT NULL,
	CONSTRAINT "chk_sales_products_unit_price_non_negative" CHECK ("unit_price" >= 0)
);
--> statement-breakpoint
ALTER TABLE "sales"."products" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "sales"."return_order_lines" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"tenant_id" integer NOT NULL,
	"return_order_id" uuid NOT NULL,
	"source_line_id" uuid,
	"product_id" uuid NOT NULL,
	"quantity" numeric(12,4) DEFAULT '0' NOT NULL,
	"condition" "sales"."return_condition" DEFAULT 'used'::"sales"."return_condition" NOT NULL,
	"unit_price" numeric(14,2) DEFAULT '0' NOT NULL,
	"credit_amount" numeric(14,2) DEFAULT '0' NOT NULL,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" integer NOT NULL,
	"updated_by" integer NOT NULL,
	CONSTRAINT "chk_sales_return_order_lines_quantity_positive" CHECK ("quantity" > 0),
	CONSTRAINT "chk_sales_return_order_lines_unit_price_non_negative" CHECK ("unit_price" >= 0),
	CONSTRAINT "chk_sales_return_order_lines_credit_non_negative" CHECK ("credit_amount" >= 0)
);
--> statement-breakpoint
ALTER TABLE "sales"."return_order_lines" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "sales"."return_orders" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"tenant_id" integer NOT NULL,
	"name" text NOT NULL,
	"source_order_id" uuid NOT NULL,
	"partner_id" uuid NOT NULL,
	"status" "sales"."return_status" DEFAULT 'draft'::"sales"."return_status" NOT NULL,
	"reason_code_id" uuid,
	"approved_by" integer,
	"approved_date" timestamp with time zone,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	"created_by" integer NOT NULL,
	"updated_by" integer NOT NULL,
	CONSTRAINT "chk_sales_return_orders_approved_requires_actor" CHECK ("status" <> 'approved' OR ("approved_by" IS NOT NULL AND "approved_date" IS NOT NULL)),
	CONSTRAINT "chk_sales_return_orders_progressed_requires_approval" CHECK ("status" IN ('draft', 'cancelled') OR ("approved_by" IS NOT NULL AND "approved_date" IS NOT NULL)),
	CONSTRAINT "chk_sales_return_orders_credited_requires_reason" CHECK ("status" <> 'credited' OR "reason_code_id" IS NOT NULL)
);
--> statement-breakpoint
ALTER TABLE "sales"."return_orders" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "sales"."return_reason_codes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"tenant_id" integer NOT NULL,
	"code" text NOT NULL,
	"name" text NOT NULL,
	"requires_inspection" boolean DEFAULT false NOT NULL,
	"restock_policy" "sales"."restock_policy" DEFAULT 'restock'::"sales"."restock_policy" NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	"created_by" integer NOT NULL,
	"updated_by" integer NOT NULL
);
--> statement-breakpoint
ALTER TABLE "sales"."return_reason_codes" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "sales"."rounding_policies" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"tenant_id" integer NOT NULL,
	"policy_name" text NOT NULL,
	"policy_key" text NOT NULL,
	"rounding_method" text NOT NULL,
	"rounding_precision" integer DEFAULT 2 NOT NULL,
	"rounding_unit" numeric(14,6),
	"applies_to" text NOT NULL,
	"currency_code" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"effective_from" timestamp with time zone DEFAULT now() NOT NULL,
	"effective_to" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	"created_by" integer NOT NULL,
	"updated_by" integer NOT NULL,
	CONSTRAINT "chk_sales_rounding_policies_method" CHECK ("rounding_method" IN ('round', 'ceil', 'floor', 'truncate')),
	CONSTRAINT "chk_sales_rounding_policies_precision_range" CHECK ("rounding_precision" BETWEEN 0 AND 6),
	CONSTRAINT "chk_sales_rounding_policies_unit_positive" CHECK ("rounding_unit" IS NULL OR "rounding_unit" > 0),
	CONSTRAINT "chk_sales_rounding_policies_effective_order" CHECK ("effective_to" IS NULL OR "effective_to" >= "effective_from")
);
--> statement-breakpoint
ALTER TABLE "sales"."rounding_policies" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "sales"."sale_order_line_taxes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"tenant_id" integer NOT NULL,
	"order_line_id" uuid NOT NULL,
	"tax_id" uuid NOT NULL,
	"sequence" integer DEFAULT 10 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" integer NOT NULL,
	"updated_by" integer NOT NULL,
	CONSTRAINT "chk_sales_sale_order_line_taxes_sequence_non_negative" CHECK ("sequence" >= 0)
);
--> statement-breakpoint
ALTER TABLE "sales"."sale_order_line_taxes" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "sales"."sale_order_option_lines" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"tenant_id" integer NOT NULL,
	"order_id" uuid NOT NULL,
	"product_id" uuid NOT NULL,
	"name" text NOT NULL,
	"quantity" numeric(12,3) DEFAULT '1' NOT NULL,
	"price_unit" numeric(14,2) NOT NULL,
	"discount" numeric(5,2) DEFAULT '0' NOT NULL,
	"uom_id" integer NOT NULL,
	"sequence" integer DEFAULT 10 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" integer NOT NULL,
	"updated_by" integer NOT NULL,
	CONSTRAINT "chk_sales_sale_order_option_lines_quantity_positive" CHECK ("quantity" > 0),
	CONSTRAINT "chk_sales_sale_order_option_lines_price_unit_non_negative" CHECK ("price_unit" >= 0),
	CONSTRAINT "chk_sales_sale_order_option_lines_discount_range" CHECK ("discount" >= 0 AND "discount" <= 100)
);
--> statement-breakpoint
ALTER TABLE "sales"."sale_order_option_lines" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "sales"."sale_order_status_history" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"tenant_id" integer NOT NULL,
	"order_id" uuid NOT NULL,
	"old_status" "sales"."order_status" NOT NULL,
	"new_status" "sales"."order_status" NOT NULL,
	"changed_by" integer,
	"changed_at" timestamp with time zone DEFAULT now() NOT NULL,
	"reason" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" integer NOT NULL,
	"updated_by" integer NOT NULL
);
--> statement-breakpoint
ALTER TABLE "sales"."sale_order_status_history" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "sales"."sale_order_tax_summary" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"tenant_id" integer NOT NULL,
	"order_id" uuid NOT NULL,
	"tax_id" uuid NOT NULL,
	"tax_group_id" uuid,
	"base_amount" numeric(14,2) DEFAULT '0' NOT NULL,
	"tax_amount" numeric(14,2) DEFAULT '0' NOT NULL,
	"is_tax_included" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" integer NOT NULL,
	"updated_by" integer NOT NULL,
	CONSTRAINT "chk_sales_sale_order_tax_summary_base_non_negative" CHECK ("base_amount" >= 0),
	CONSTRAINT "chk_sales_sale_order_tax_summary_tax_non_negative" CHECK ("tax_amount" >= 0)
);
--> statement-breakpoint
ALTER TABLE "sales"."sale_order_tax_summary" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "sales"."document_attachments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"tenant_id" integer NOT NULL,
	"document_type" text NOT NULL,
	"document_id" uuid NOT NULL,
	"file_name" text NOT NULL,
	"file_size" integer NOT NULL,
	"mime_type" text NOT NULL,
	"storage_provider" text NOT NULL,
	"storage_path" text NOT NULL,
	"storage_url" text,
	"attachment_type" text,
	"description" text,
	"is_public" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	"created_by" integer NOT NULL,
	"updated_by" integer NOT NULL,
	CONSTRAINT "chk_sales_document_attachments_size_non_negative" CHECK ("file_size" >= 0)
);
--> statement-breakpoint
ALTER TABLE "sales"."document_attachments" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "sales"."sales_order_lines" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"tenant_id" integer NOT NULL,
	"order_id" uuid NOT NULL,
	"product_id" uuid NOT NULL,
	"product_template_id" uuid,
	"tax_id" uuid,
	"product_uom_id" integer,
	"description" text,
	"quantity" numeric(12,4) DEFAULT '1' NOT NULL,
	"price_unit" numeric(12,2) NOT NULL,
	"discount" numeric(5,2) DEFAULT '0' NOT NULL,
	"price_listed_at" numeric(14,2),
	"price_override_reason" text,
	"price_approved_by" integer,
	"cost_unit" numeric(12,2) DEFAULT '0' NOT NULL,
	"subtotal" numeric(14,2) NOT NULL,
	"price_subtotal" numeric(14,2) DEFAULT '0' NOT NULL,
	"price_tax" numeric(14,2) DEFAULT '0' NOT NULL,
	"price_total" numeric(14,2) DEFAULT '0' NOT NULL,
	"cost_subtotal" numeric(14,2) DEFAULT '0' NOT NULL,
	"profit_amount" numeric(14,2) DEFAULT '0' NOT NULL,
	"margin_percent" numeric(9,4) DEFAULT '0' NOT NULL,
	"qty_delivered" numeric(12,4) DEFAULT '0' NOT NULL,
	"qty_to_invoice" numeric(12,4) DEFAULT '0' NOT NULL,
	"qty_invoiced" numeric(12,4) DEFAULT '0' NOT NULL,
	"invoice_status" "sales"."invoice_status" DEFAULT 'no'::"sales"."invoice_status" NOT NULL,
	"customer_lead" integer DEFAULT 0 NOT NULL,
	"display_type" "sales"."display_line_type" DEFAULT 'product'::"sales"."display_line_type" NOT NULL,
	"price_source" "sales"."price_source" DEFAULT 'manual'::"sales"."price_source" NOT NULL,
	"discount_source" "sales"."discount_source" DEFAULT 'manual'::"sales"."discount_source" NOT NULL,
	"applied_pricelist_id" uuid,
	"applied_fiscal_position_id" uuid,
	"tax_rule_snapshot" text,
	"discount_authority_user_id" integer,
	"discount_approved_at" timestamp with time zone,
	"sequence" integer DEFAULT 10 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	"created_by" integer NOT NULL,
	"updated_by" integer NOT NULL,
	CONSTRAINT "chk_sales_order_lines_quantity_positive" CHECK ("quantity" > 0),
	CONSTRAINT "chk_sales_order_lines_price_unit_non_negative" CHECK ("price_unit" >= 0),
	CONSTRAINT "chk_sales_order_lines_price_listed_at_non_negative" CHECK ("price_listed_at" IS NULL OR "price_listed_at" >= 0),
	CONSTRAINT "chk_sales_order_lines_discount_range" CHECK ("discount" >= 0 AND "discount" <= 100),
	CONSTRAINT "chk_sales_order_lines_price_override_reason_required" CHECK ("price_listed_at" IS NULL OR "price_unit" >= "price_listed_at" OR "price_override_reason" IS NOT NULL),
	CONSTRAINT "chk_sales_order_lines_price_override_approval_required" CHECK ("price_listed_at" IS NULL OR "price_unit" >= "price_listed_at" OR "price_approved_by" IS NOT NULL),
	CONSTRAINT "chk_sales_order_lines_cost_unit_non_negative" CHECK ("cost_unit" >= 0),
	CONSTRAINT "chk_sales_order_lines_subtotal_non_negative" CHECK ("subtotal" >= 0),
	CONSTRAINT "chk_sales_order_lines_price_subtotal_non_negative" CHECK ("price_subtotal" >= 0),
	CONSTRAINT "chk_sales_order_lines_price_tax_non_negative" CHECK ("price_tax" >= 0),
	CONSTRAINT "chk_sales_order_lines_price_total_non_negative" CHECK ("price_total" >= 0),
	CONSTRAINT "chk_sales_order_lines_cost_subtotal_non_negative" CHECK ("cost_subtotal" >= 0),
	CONSTRAINT "chk_sales_order_lines_profit_amount_non_negative" CHECK ("profit_amount" >= 0),
	CONSTRAINT "chk_sales_order_lines_cost_subtotal_formula" CHECK ("cost_subtotal" = round("quantity" * "cost_unit", 2)),
	CONSTRAINT "chk_sales_order_lines_profit_formula" CHECK ("profit_amount" = round("price_subtotal" - "cost_subtotal", 2)),
	CONSTRAINT "chk_sales_order_lines_margin_percent_formula" CHECK ("margin_percent" = CASE
        WHEN "price_subtotal" = 0 THEN 0
        ELSE round(("profit_amount" / "price_subtotal") * 100, 4)
      END),
	CONSTRAINT "chk_sales_order_lines_qty_delivered_non_negative" CHECK ("qty_delivered" >= 0),
	CONSTRAINT "chk_sales_order_lines_qty_to_invoice_non_negative" CHECK ("qty_to_invoice" >= 0),
	CONSTRAINT "chk_sales_order_lines_qty_invoiced_non_negative" CHECK ("qty_invoiced" >= 0),
	CONSTRAINT "chk_sales_order_lines_qty_delivered_within_ordered" CHECK ("qty_delivered" <= "quantity"),
	CONSTRAINT "chk_sales_order_lines_qty_invoiced_within_ordered" CHECK ("qty_invoiced" <= "quantity"),
	CONSTRAINT "chk_sales_order_lines_qty_to_invoice_within_ordered" CHECK ("qty_to_invoice" <= "quantity"),
	CONSTRAINT "chk_sales_order_lines_customer_lead_non_negative" CHECK ("customer_lead" >= 0)
);
--> statement-breakpoint
ALTER TABLE "sales"."sales_order_lines" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "sales"."sales_orders" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"tenant_id" integer NOT NULL,
	"name" text NOT NULL,
	"partner_id" uuid NOT NULL,
	"status" "sales"."order_status" DEFAULT 'draft'::"sales"."order_status" NOT NULL,
	"sequence_number" text,
	"quotation_date" timestamp with time zone,
	"validity_date" timestamp with time zone,
	"confirmation_date" timestamp with time zone,
	"confirmed_by" integer,
	"currency_id" integer,
	"pricelist_id" uuid,
	"payment_term_id" uuid,
	"fiscal_position_id" uuid,
	"invoice_address_id" uuid,
	"delivery_address_id" uuid,
	"warehouse_id" text,
	"company_currency_rate" numeric(14,6),
	"exchange_rate_used" numeric(14,6),
	"exchange_rate_source" text,
	"pricelist_snapshot_id" uuid,
	"credit_check_passed" boolean DEFAULT false NOT NULL,
	"credit_check_at" timestamp with time zone,
	"credit_check_by" integer,
	"credit_limit_at_check" numeric(14,2),
	"invoice_status" "sales"."invoice_status" DEFAULT 'no'::"sales"."invoice_status" NOT NULL,
	"delivery_status" "sales"."delivery_status" DEFAULT 'no'::"sales"."delivery_status" NOT NULL,
	"signed_by" text,
	"signed_on" timestamp with time zone,
	"client_order_ref" text,
	"origin" text,
	"team_id" text,
	"user_id" integer,
	"cancel_reason" text,
	"order_date" timestamp with time zone DEFAULT now() NOT NULL,
	"delivery_date" timestamp with time zone,
	"assigned_to_id" text,
	"notes" text,
	"amount_untaxed" numeric(14,2) DEFAULT '0' NOT NULL,
	"amount_cost" numeric(14,2) DEFAULT '0' NOT NULL,
	"amount_profit" numeric(14,2) DEFAULT '0' NOT NULL,
	"margin_percent" numeric(9,4) DEFAULT '0' NOT NULL,
	"amount_tax" numeric(14,2) DEFAULT '0' NOT NULL,
	"amount_total" numeric(14,2) DEFAULT '0' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	"created_by" integer NOT NULL,
	"updated_by" integer NOT NULL,
	CONSTRAINT "chk_sales_orders_amount_untaxed_non_negative" CHECK ("amount_untaxed" >= 0),
	CONSTRAINT "chk_sales_orders_amount_cost_non_negative" CHECK ("amount_cost" >= 0),
	CONSTRAINT "chk_sales_orders_amount_profit_non_negative" CHECK ("amount_profit" >= 0),
	CONSTRAINT "chk_sales_orders_amount_tax_non_negative" CHECK ("amount_tax" >= 0),
	CONSTRAINT "chk_sales_orders_amount_total_non_negative" CHECK ("amount_total" >= 0),
	CONSTRAINT "chk_sales_orders_amount_profit_formula" CHECK ("amount_profit" = round("amount_untaxed" - "amount_cost", 2)),
	CONSTRAINT "chk_sales_orders_margin_percent_formula" CHECK ("margin_percent" = CASE
        WHEN "amount_untaxed" = 0 THEN 0
        ELSE round(("amount_profit" / "amount_untaxed") * 100, 4)
      END),
	CONSTRAINT "chk_sales_orders_validity_date_after_quotation" CHECK ("validity_date" IS NULL OR "quotation_date" IS NULL OR "validity_date" >= "quotation_date"),
	CONSTRAINT "chk_sales_orders_company_currency_rate_positive" CHECK ("company_currency_rate" IS NULL OR "company_currency_rate" > 0),
	CONSTRAINT "chk_sales_orders_exchange_rate_used_positive" CHECK ("exchange_rate_used" IS NULL OR "exchange_rate_used" > 0),
	CONSTRAINT "chk_sales_orders_exchange_rate_source_required" CHECK ("exchange_rate_used" IS NULL OR "exchange_rate_source" IS NOT NULL),
	CONSTRAINT "chk_sales_orders_credit_limit_at_check_non_negative" CHECK ("credit_limit_at_check" IS NULL OR "credit_limit_at_check" >= 0),
	CONSTRAINT "chk_sales_orders_credit_check_consistency" CHECK (NOT "credit_check_passed" OR ("credit_check_at" IS NOT NULL AND "credit_check_by" IS NOT NULL)),
	CONSTRAINT "chk_sales_orders_signature_consistency" CHECK (("signed_by" IS NULL AND "signed_on" IS NULL) OR ("signed_by" IS NOT NULL AND "signed_on" IS NOT NULL)),
	CONSTRAINT "chk_sales_orders_invoiced_requires_sales_state" CHECK ("invoice_status" <> 'invoiced' OR "status" IN ('sale', 'done')),
	CONSTRAINT "chk_sales_orders_delivery_progress_requires_sales_state" CHECK ("delivery_status" = 'no' OR "status" IN ('sale', 'done'))
);
--> statement-breakpoint
ALTER TABLE "sales"."sales_orders" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "sales"."sales_team_members" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"tenant_id" integer NOT NULL,
	"team_id" uuid NOT NULL,
	"user_id" integer NOT NULL,
	"role" text DEFAULT 'member' NOT NULL,
	"is_leader" boolean DEFAULT false NOT NULL,
	"start_date" timestamp with time zone DEFAULT now() NOT NULL,
	"end_date" timestamp with time zone,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	"created_by" integer NOT NULL,
	"updated_by" integer NOT NULL,
	CONSTRAINT "chk_sales_sales_team_members_end_after_start" CHECK ("end_date" IS NULL OR "end_date" >= "start_date")
);
--> statement-breakpoint
ALTER TABLE "sales"."sales_team_members" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "sales"."sales_teams" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"tenant_id" integer NOT NULL,
	"name" text NOT NULL,
	"code" text NOT NULL,
	"manager_id" integer,
	"is_active" boolean DEFAULT true NOT NULL,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	"created_by" integer NOT NULL,
	"updated_by" integer NOT NULL
);
--> statement-breakpoint
ALTER TABLE "sales"."sales_teams" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "sales"."subscription_close_reasons" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"tenant_id" integer NOT NULL,
	"code" text NOT NULL,
	"name" text NOT NULL,
	"is_churn" boolean DEFAULT true NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	"created_by" integer NOT NULL,
	"updated_by" integer NOT NULL
);
--> statement-breakpoint
ALTER TABLE "sales"."subscription_close_reasons" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "sales"."subscription_lines" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"tenant_id" integer NOT NULL,
	"subscription_id" uuid NOT NULL,
	"product_id" uuid NOT NULL,
	"uom_id" integer NOT NULL,
	"quantity" numeric(12,4) DEFAULT '1' NOT NULL,
	"price_unit" numeric(14,2) DEFAULT '0' NOT NULL,
	"discount" numeric(5,2) DEFAULT '0' NOT NULL,
	"subtotal" numeric(14,2) DEFAULT '0' NOT NULL,
	"sequence" integer DEFAULT 10 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" integer NOT NULL,
	"updated_by" integer NOT NULL,
	CONSTRAINT "chk_sales_subscription_lines_quantity_positive" CHECK ("quantity" > 0),
	CONSTRAINT "chk_sales_subscription_lines_price_non_negative" CHECK ("price_unit" >= 0),
	CONSTRAINT "chk_sales_subscription_lines_discount_percentage" CHECK ("discount" >= 0 AND "discount" <= 100),
	CONSTRAINT "chk_sales_subscription_lines_subtotal_non_negative" CHECK ("subtotal" >= 0),
	CONSTRAINT "chk_sales_subscription_lines_sequence_non_negative" CHECK ("sequence" >= 0),
	CONSTRAINT "chk_sales_subscription_lines_subtotal_formula" CHECK ("subtotal" = round("quantity" * "price_unit" * (1 - "discount" / 100.0), 2))
);
--> statement-breakpoint
ALTER TABLE "sales"."subscription_lines" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "sales"."subscription_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"tenant_id" integer NOT NULL,
	"subscription_id" uuid NOT NULL,
	"event_type" "sales"."subscription_log_event_type" DEFAULT 'created'::"sales"."subscription_log_event_type" NOT NULL,
	"old_mrr" numeric(14,2) DEFAULT '0' NOT NULL,
	"new_mrr" numeric(14,2) DEFAULT '0' NOT NULL,
	"change_reason" text,
	"event_at" timestamp with time zone DEFAULT now() NOT NULL,
	"actor_id" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" integer NOT NULL,
	"updated_by" integer NOT NULL,
	CONSTRAINT "chk_sales_subscription_logs_old_mrr_non_negative" CHECK ("old_mrr" >= 0),
	CONSTRAINT "chk_sales_subscription_logs_new_mrr_non_negative" CHECK ("new_mrr" >= 0)
);
--> statement-breakpoint
ALTER TABLE "sales"."subscription_logs" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "sales"."subscription_templates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"tenant_id" integer NOT NULL,
	"name" text NOT NULL,
	"billing_period" "sales"."subscription_billing_period" DEFAULT 'monthly'::"sales"."subscription_billing_period" NOT NULL,
	"billing_day" integer DEFAULT 1 NOT NULL,
	"auto_renew" boolean DEFAULT true NOT NULL,
	"renewal_period" integer DEFAULT 1 NOT NULL,
	"payment_term_id" uuid,
	"pricelist_id" uuid,
	"notes" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	"created_by" integer NOT NULL,
	"updated_by" integer NOT NULL,
	CONSTRAINT "chk_sales_subscription_templates_billing_day_range" CHECK ("billing_day" BETWEEN 1 AND 31),
	CONSTRAINT "chk_sales_subscription_templates_renewal_period_positive" CHECK ("renewal_period" > 0)
);
--> statement-breakpoint
ALTER TABLE "sales"."subscription_templates" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "sales"."subscriptions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"tenant_id" integer NOT NULL,
	"name" text NOT NULL,
	"partner_id" uuid NOT NULL,
	"template_id" uuid NOT NULL,
	"status" "sales"."subscription_status" DEFAULT 'draft'::"sales"."subscription_status" NOT NULL,
	"date_start" timestamp with time zone NOT NULL,
	"date_end" timestamp with time zone,
	"next_invoice_date" timestamp with time zone NOT NULL,
	"recurring_total" numeric(14,2) DEFAULT '0' NOT NULL,
	"mrr" numeric(14,2) DEFAULT '0' NOT NULL,
	"arr" numeric(14,2) DEFAULT '0' NOT NULL,
	"close_reason_id" uuid,
	"last_invoiced_at" timestamp with time zone,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	"created_by" integer NOT NULL,
	"updated_by" integer NOT NULL,
	CONSTRAINT "chk_sales_subscriptions_end_after_start" CHECK ("date_end" IS NULL OR "date_end" >= "date_start"),
	CONSTRAINT "chk_sales_subscriptions_recurring_total_non_negative" CHECK ("recurring_total" >= 0),
	CONSTRAINT "chk_sales_subscriptions_mrr_non_negative" CHECK ("mrr" >= 0),
	CONSTRAINT "chk_sales_subscriptions_arr_non_negative" CHECK ("arr" >= 0),
	CONSTRAINT "chk_sales_subscriptions_arr_consistency" CHECK ("arr" = "mrr" * 12),
	CONSTRAINT "chk_sales_subscriptions_closed_requires_end_date" CHECK ("status" NOT IN ('cancelled', 'expired') OR "date_end" IS NOT NULL)
);
--> statement-breakpoint
ALTER TABLE "sales"."subscriptions" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "sales"."tax_groups" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"tenant_id" integer NOT NULL,
	"name" text NOT NULL,
	"sequence" integer DEFAULT 10 NOT NULL,
	"country_id" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	"created_by" integer NOT NULL,
	"updated_by" integer NOT NULL,
	CONSTRAINT "chk_sales_tax_groups_sequence_non_negative" CHECK ("sequence" >= 0)
);
--> statement-breakpoint
ALTER TABLE "sales"."tax_groups" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "sales"."tax_rate_children" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"tenant_id" integer NOT NULL,
	"parent_tax_id" uuid NOT NULL,
	"child_tax_id" uuid NOT NULL,
	"sequence" integer DEFAULT 10 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" integer NOT NULL,
	"updated_by" integer NOT NULL,
	CONSTRAINT "chk_sales_tax_rate_children_sequence_non_negative" CHECK ("sequence" >= 0),
	CONSTRAINT "chk_sales_tax_rate_children_distinct" CHECK ("parent_tax_id" <> "child_tax_id")
);
--> statement-breakpoint
ALTER TABLE "sales"."tax_rate_children" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "sales"."tax_rates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"tenant_id" integer NOT NULL,
	"name" text NOT NULL,
	"type_tax_use" "sales"."tax_type_use" DEFAULT 'sale'::"sales"."tax_type_use" NOT NULL,
	"amount_type" "sales"."tax_amount_type" DEFAULT 'percent'::"sales"."tax_amount_type" NOT NULL,
	"amount" numeric(9,4) DEFAULT '0' NOT NULL,
	"effective_from" timestamp with time zone DEFAULT now() NOT NULL,
	"effective_to" timestamp with time zone,
	"replaced_by" uuid,
	"tax_group_id" uuid,
	"price_include" boolean DEFAULT false NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"sequence" integer DEFAULT 10 NOT NULL,
	"country_id" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	"created_by" integer NOT NULL,
	"updated_by" integer NOT NULL,
	CONSTRAINT "chk_sales_tax_rates_amount_non_negative" CHECK ("amount" >= 0),
	CONSTRAINT "chk_sales_tax_rates_percent_range" CHECK ("amount_type" <> 'percent' OR "amount" <= 100),
	CONSTRAINT "chk_sales_tax_rates_effective_order" CHECK ("effective_to" IS NULL OR "effective_to" >= "effective_from"),
	CONSTRAINT "chk_sales_tax_rates_sequence_non_negative" CHECK ("sequence" >= 0)
);
--> statement-breakpoint
ALTER TABLE "sales"."tax_rates" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "sales"."territories" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"tenant_id" integer NOT NULL,
	"name" text NOT NULL,
	"code" text NOT NULL,
	"parent_id" uuid,
	"default_salesperson_id" integer,
	"team_id" uuid,
	"is_active" boolean DEFAULT true NOT NULL,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	"created_by" integer NOT NULL,
	"updated_by" integer NOT NULL
);
--> statement-breakpoint
ALTER TABLE "sales"."territories" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "sales"."territory_rules" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"tenant_id" integer NOT NULL,
	"territory_id" uuid NOT NULL,
	"country_id" integer,
	"state_id" integer,
	"zip_from" text,
	"zip_to" text,
	"priority" integer DEFAULT 10 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	"created_by" integer NOT NULL,
	"updated_by" integer NOT NULL,
	CONSTRAINT "chk_sales_territory_rules_priority_non_negative" CHECK ("priority" >= 0),
	CONSTRAINT "chk_sales_territory_rules_zip_range" CHECK ("zip_to" IS NULL OR "zip_from" IS NULL OR "zip_to" >= "zip_from")
);
--> statement-breakpoint
ALTER TABLE "sales"."territory_rules" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE UNIQUE INDEX "uq_tenants_code" ON "core"."tenants" (lower("tenantCode")) WHERE "deleted_at" IS NULL;--> statement-breakpoint
CREATE INDEX "idx_tenants_status" ON "core"."tenants" ("status");--> statement-breakpoint
CREATE INDEX "idx_tenants_code" ON "core"."tenants" ("tenantCode");--> statement-breakpoint
CREATE INDEX "idx_app_modules_tenant" ON "core"."app_modules" ("tenant_id");--> statement-breakpoint
CREATE INDEX "idx_app_modules_enabled" ON "core"."app_modules" ("tenant_id","isEnabled","sortOrder");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_app_modules_code" ON "core"."app_modules" ("tenant_id",lower("code")) WHERE "deleted_at" IS NULL;--> statement-breakpoint
CREATE INDEX "idx_reference_approval_logs_entity" ON "reference"."approval_logs" ("tenant_id","entity_type","entity_id");--> statement-breakpoint
CREATE INDEX "idx_reference_approval_logs_actor" ON "reference"."approval_logs" ("tenant_id","actor_id","decided_at");--> statement-breakpoint
CREATE INDEX "idx_reference_banks_country" ON "reference"."banks" ("country_id","name");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_reference_banks_name_country" ON "reference"."banks" (lower("name"),"country_id") WHERE "deleted_at" IS NULL;--> statement-breakpoint
CREATE INDEX "idx_reference_countries_name" ON "reference"."countries" ("name");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_reference_countries_code" ON "reference"."countries" (lower("code")) WHERE "deleted_at" IS NULL;--> statement-breakpoint
CREATE INDEX "idx_reference_currencies_active" ON "reference"."currencies" ("is_active","code");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_reference_currencies_code" ON "reference"."currencies" (upper("code")) WHERE "deleted_at" IS NULL;--> statement-breakpoint
CREATE INDEX "idx_reference_currency_rates_date" ON "reference"."currency_rates" ("currency_id","effective_date");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_reference_currency_rates_currency_date" ON "reference"."currency_rates" ("currency_id","effective_date");--> statement-breakpoint
CREATE INDEX "idx_reference_document_attachments_entity" ON "reference"."document_attachments" ("tenant_id","entity_type","entity_id");--> statement-breakpoint
CREATE INDEX "idx_reference_document_attachments_uploaded_by" ON "reference"."document_attachments" ("tenant_id","uploaded_by");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_reference_document_attachments_storage_key" ON "reference"."document_attachments" ("tenant_id","storage_key");--> statement-breakpoint
CREATE INDEX "idx_reference_sequences_tenant" ON "reference"."sequences" ("tenant_id","code");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_reference_sequences_tenant_code" ON "reference"."sequences" ("tenant_id",lower("code")) WHERE "deleted_at" IS NULL;--> statement-breakpoint
CREATE INDEX "idx_reference_states_country" ON "reference"."states" ("country_id","name");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_reference_states_country_code" ON "reference"."states" ("country_id",lower("code")) WHERE "deleted_at" IS NULL;--> statement-breakpoint
CREATE INDEX "idx_reference_uoms_category" ON "reference"."units_of_measure" ("category_id","name");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_reference_uoms_category_name" ON "reference"."units_of_measure" ("category_id",lower("name")) WHERE "deleted_at" IS NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "uq_reference_uoms_reference_per_category" ON "reference"."units_of_measure" ("category_id") WHERE "deleted_at" IS NULL AND "uom_type" = 'reference';--> statement-breakpoint
CREATE UNIQUE INDEX "uq_reference_uom_categories_name" ON "reference"."uom_categories" (lower("name")) WHERE "deleted_at" IS NULL;--> statement-breakpoint
CREATE INDEX "idx_users_tenant" ON "security"."users" ("tenant_id");--> statement-breakpoint
CREATE INDEX "idx_users_email" ON "security"."users" ("tenant_id","email");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_users_email" ON "security"."users" ("tenant_id",lower("email")) WHERE "deleted_at" IS NULL;--> statement-breakpoint
CREATE INDEX "idx_roles_tenant" ON "security"."roles" ("tenant_id");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_roles_code" ON "security"."roles" ("tenant_id",lower("roleCode")) WHERE "deleted_at" IS NULL;--> statement-breakpoint
CREATE INDEX "idx_user_roles_tenant" ON "security"."user_roles" ("tenant_id");--> statement-breakpoint
CREATE INDEX "idx_user_roles_user" ON "security"."user_roles" ("tenant_id","userId");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_user_roles_assignment" ON "security"."user_roles" ("tenant_id","userId","roleId");--> statement-breakpoint
CREATE INDEX "idx_permissions_tenant" ON "security"."permissions" ("tenant_id");--> statement-breakpoint
CREATE INDEX "idx_permissions_resource" ON "security"."permissions" ("tenant_id","resource");--> statement-breakpoint
CREATE INDEX "idx_permissions_key" ON "security"."permissions" ("tenant_id","key");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_permissions_key" ON "security"."permissions" ("tenant_id",lower("key")) WHERE "deleted_at" IS NULL;--> statement-breakpoint
CREATE INDEX "idx_role_permissions_tenant" ON "security"."role_permissions" ("tenant_id");--> statement-breakpoint
CREATE INDEX "idx_role_permissions_role" ON "security"."role_permissions" ("tenant_id","roleId");--> statement-breakpoint
CREATE INDEX "idx_role_permissions_permission" ON "security"."role_permissions" ("tenant_id","permissionId");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_role_permissions" ON "security"."role_permissions" ("tenant_id","roleId","permissionId");--> statement-breakpoint
CREATE INDEX "idx_user_permissions_tenant" ON "security"."user_permissions" ("tenant_id");--> statement-breakpoint
CREATE INDEX "idx_user_permissions_user" ON "security"."user_permissions" ("tenant_id","userId");--> statement-breakpoint
CREATE INDEX "idx_user_permissions_permission" ON "security"."user_permissions" ("tenant_id","permissionId");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_user_permissions" ON "security"."user_permissions" ("tenant_id","userId","permissionId");--> statement-breakpoint
CREATE INDEX "audit_entity_idx" ON "audit_logs" ("entity");--> statement-breakpoint
CREATE INDEX "audit_entity_record_idx" ON "audit_logs" ("entity","record_id");--> statement-breakpoint
CREATE INDEX "audit_actor_idx" ON "audit_logs" ("actor");--> statement-breakpoint
CREATE INDEX "audit_timestamp_idx" ON "audit_logs" ("timestamp");--> statement-breakpoint
CREATE INDEX "events_aggregate_idx" ON "events" ("aggregate_type","aggregate_id");--> statement-breakpoint
CREATE INDEX "events_type_idx" ON "events" ("event_type");--> statement-breakpoint
CREATE INDEX "events_timestamp_idx" ON "events" ("timestamp");--> statement-breakpoint
CREATE INDEX "fields_entity_idx" ON "fields" ("entity_id");--> statement-breakpoint
CREATE INDEX "layouts_entity_idx" ON "layouts" ("entity_id");--> statement-breakpoint
CREATE INDEX "policies_scope_idx" ON "policies" ("scope_entity");--> statement-breakpoint
CREATE INDEX "overrides_model_idx" ON "metadata_overrides" ("model");--> statement-breakpoint
CREATE INDEX "overrides_tenant_idx" ON "metadata_overrides" ("tenant_id");--> statement-breakpoint
CREATE INDEX "overrides_scope_idx" ON "metadata_overrides" ("scope");--> statement-breakpoint
CREATE INDEX "dae_tenant_idx" ON "decision_audit_entries" ("tenant_id");--> statement-breakpoint
CREATE INDEX "dae_event_type_idx" ON "decision_audit_entries" ("event_type");--> statement-breakpoint
CREATE INDEX "dae_scope_idx" ON "decision_audit_entries" ("scope");--> statement-breakpoint
CREATE INDEX "dae_timestamp_idx" ON "decision_audit_entries" ("timestamp");--> statement-breakpoint
CREATE INDEX "dae_chain_idx" ON "decision_audit_entries" ("chain_id");--> statement-breakpoint
CREATE INDEX "dae_user_idx" ON "decision_audit_entries" ("tenant_id","user_id");--> statement-breakpoint
CREATE INDEX "idx_sales_accounting_postings_tenant" ON "sales"."accounting_postings" ("tenant_id");--> statement-breakpoint
CREATE INDEX "idx_sales_accounting_postings_date" ON "sales"."accounting_postings" ("tenant_id","posting_date","posting_status");--> statement-breakpoint
CREATE INDEX "idx_sales_accounting_postings_source" ON "sales"."accounting_postings" ("tenant_id","source_document_type","source_document_id");--> statement-breakpoint
CREATE INDEX "idx_sales_commission_entries_tenant" ON "sales"."commission_entries" ("tenant_id");--> statement-breakpoint
CREATE INDEX "idx_sales_commission_entries_order" ON "sales"."commission_entries" ("tenant_id","order_id");--> statement-breakpoint
CREATE INDEX "idx_sales_commission_entries_salesperson" ON "sales"."commission_entries" ("tenant_id","salesperson_id");--> statement-breakpoint
CREATE INDEX "idx_sales_commission_entries_plan" ON "sales"."commission_entries" ("tenant_id","plan_id");--> statement-breakpoint
CREATE INDEX "idx_sales_commission_entries_status_period" ON "sales"."commission_entries" ("tenant_id","status","period_start");--> statement-breakpoint
CREATE INDEX "idx_sales_commission_plan_tiers_tenant" ON "sales"."commission_plan_tiers" ("tenant_id");--> statement-breakpoint
CREATE INDEX "idx_sales_commission_plan_tiers_plan" ON "sales"."commission_plan_tiers" ("tenant_id","plan_id","sequence");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_sales_commission_plan_tiers_sequence" ON "sales"."commission_plan_tiers" ("tenant_id","plan_id","sequence");--> statement-breakpoint
CREATE INDEX "idx_sales_commission_plans_tenant" ON "sales"."commission_plans" ("tenant_id");--> statement-breakpoint
CREATE INDEX "idx_sales_commission_plans_active" ON "sales"."commission_plans" ("tenant_id","is_active");--> statement-breakpoint
CREATE INDEX "idx_sales_commission_plans_type_base" ON "sales"."commission_plans" ("tenant_id","type","base");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_sales_commission_plans_name" ON "sales"."commission_plans" ("tenant_id",lower("name")) WHERE "deleted_at" IS NULL;--> statement-breakpoint
CREATE INDEX "idx_sales_consignment_agreement_lines_tenant" ON "sales"."consignment_agreement_lines" ("tenant_id");--> statement-breakpoint
CREATE INDEX "idx_sales_consignment_agreement_lines_agreement" ON "sales"."consignment_agreement_lines" ("tenant_id","agreement_id");--> statement-breakpoint
CREATE INDEX "idx_sales_consignment_agreement_lines_product" ON "sales"."consignment_agreement_lines" ("tenant_id","product_id");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_sales_consignment_agreement_lines_unique" ON "sales"."consignment_agreement_lines" ("tenant_id","agreement_id","product_id") WHERE "deleted_at" IS NULL;--> statement-breakpoint
CREATE INDEX "idx_sales_consignment_agreements_tenant" ON "sales"."consignment_agreements" ("tenant_id");--> statement-breakpoint
CREATE INDEX "idx_sales_consignment_agreements_partner" ON "sales"."consignment_agreements" ("tenant_id","partner_id","status");--> statement-breakpoint
CREATE INDEX "idx_sales_consignment_agreements_dates" ON "sales"."consignment_agreements" ("tenant_id","start_date","end_date");--> statement-breakpoint
CREATE INDEX "idx_sales_consignment_agreements_payment_term" ON "sales"."consignment_agreements" ("tenant_id","payment_term_id");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_sales_consignment_agreements_name" ON "sales"."consignment_agreements" ("tenant_id",lower("name")) WHERE "deleted_at" IS NULL;--> statement-breakpoint
CREATE INDEX "idx_sales_consignment_stock_report_lines_tenant" ON "sales"."consignment_stock_report_lines" ("tenant_id");--> statement-breakpoint
CREATE INDEX "idx_sales_consignment_stock_report_lines_report" ON "sales"."consignment_stock_report_lines" ("tenant_id","report_id");--> statement-breakpoint
CREATE INDEX "idx_sales_consignment_stock_report_lines_product" ON "sales"."consignment_stock_report_lines" ("tenant_id","product_id");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_sales_consignment_stock_report_lines_unique" ON "sales"."consignment_stock_report_lines" ("tenant_id","report_id","product_id");--> statement-breakpoint
CREATE INDEX "idx_sales_consignment_stock_reports_tenant" ON "sales"."consignment_stock_reports" ("tenant_id");--> statement-breakpoint
CREATE INDEX "idx_sales_consignment_stock_reports_agreement" ON "sales"."consignment_stock_reports" ("tenant_id","agreement_id","report_date");--> statement-breakpoint
CREATE INDEX "idx_sales_consignment_stock_reports_status" ON "sales"."consignment_stock_reports" ("tenant_id","status","report_date");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_sales_consignment_stock_reports_date" ON "sales"."consignment_stock_reports" ("tenant_id","agreement_id","report_date") WHERE "deleted_at" IS NULL;--> statement-breakpoint
CREATE INDEX "idx_sales_document_approvals_tenant" ON "sales"."document_approvals" ("tenant_id");--> statement-breakpoint
CREATE INDEX "idx_sales_document_approvals_pending" ON "sales"."document_approvals" ("tenant_id","approver_user_id","status");--> statement-breakpoint
CREATE INDEX "idx_sales_document_approvals_history" ON "sales"."document_approvals" ("tenant_id","document_type","document_id","approval_level");--> statement-breakpoint
CREATE INDEX "idx_sales_document_status_history_tenant" ON "sales"."document_status_history" ("tenant_id");--> statement-breakpoint
CREATE INDEX "idx_sales_document_status_history_lookup" ON "sales"."document_status_history" ("tenant_id","document_type","document_id","transitioned_at");--> statement-breakpoint
CREATE INDEX "idx_sales_document_status_history_actor" ON "sales"."document_status_history" ("tenant_id","transitioned_by","transitioned_at");--> statement-breakpoint
CREATE INDEX "idx_sales_domain_event_logs_tenant" ON "sales"."domain_event_logs" ("tenant_id");--> statement-breakpoint
CREATE INDEX "idx_sales_domain_event_logs_entity" ON "sales"."domain_event_logs" ("tenant_id","entity_type","entity_id","created_at");--> statement-breakpoint
CREATE INDEX "idx_sales_domain_event_logs_type" ON "sales"."domain_event_logs" ("tenant_id","event_type","created_at");--> statement-breakpoint
CREATE INDEX "idx_sales_domain_invariant_logs_tenant" ON "sales"."domain_invariant_logs" ("tenant_id");--> statement-breakpoint
CREATE INDEX "idx_sales_domain_invariant_logs_entity" ON "sales"."domain_invariant_logs" ("tenant_id","entity_type","entity_id","evaluated_at");--> statement-breakpoint
CREATE INDEX "idx_sales_domain_invariant_logs_code" ON "sales"."domain_invariant_logs" ("tenant_id","invariant_code","evaluated_at");--> statement-breakpoint
CREATE INDEX "idx_sales_domain_invariant_logs_status" ON "sales"."domain_invariant_logs" ("tenant_id","status","severity","evaluated_at");--> statement-breakpoint
CREATE INDEX "idx_sales_fiscal_position_account_maps_tenant" ON "sales"."fiscal_position_account_maps" ("tenant_id");--> statement-breakpoint
CREATE INDEX "idx_sales_fiscal_position_account_maps_position" ON "sales"."fiscal_position_account_maps" ("tenant_id","fiscal_position_id");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_sales_fiscal_position_account_maps_unique" ON "sales"."fiscal_position_account_maps" ("tenant_id","fiscal_position_id","account_src_id");--> statement-breakpoint
CREATE INDEX "idx_sales_fiscal_position_tax_maps_tenant" ON "sales"."fiscal_position_tax_maps" ("tenant_id");--> statement-breakpoint
CREATE INDEX "idx_sales_fiscal_position_tax_maps_position" ON "sales"."fiscal_position_tax_maps" ("tenant_id","fiscal_position_id");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_sales_fiscal_position_tax_maps_unique" ON "sales"."fiscal_position_tax_maps" ("tenant_id","fiscal_position_id","tax_src_id");--> statement-breakpoint
CREATE INDEX "idx_sales_fiscal_positions_tenant" ON "sales"."fiscal_positions" ("tenant_id");--> statement-breakpoint
CREATE INDEX "idx_sales_fiscal_positions_country" ON "sales"."fiscal_positions" ("tenant_id","country_id","auto_apply");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_sales_fiscal_positions_name" ON "sales"."fiscal_positions" ("tenant_id",lower("name")) WHERE "deleted_at" IS NULL;--> statement-breakpoint
CREATE INDEX "idx_sales_line_item_discounts_tenant" ON "sales"."line_item_discounts" ("tenant_id");--> statement-breakpoint
CREATE INDEX "idx_sales_line_item_discounts_audit" ON "sales"."line_item_discounts" ("tenant_id","discount_type","authorized_by","authorized_at");--> statement-breakpoint
CREATE INDEX "idx_sales_line_item_discounts_line" ON "sales"."line_item_discounts" ("tenant_id","document_type","line_id","sequence");--> statement-breakpoint
CREATE INDEX "idx_sales_partner_addresses_tenant" ON "sales"."partner_addresses" ("tenant_id");--> statement-breakpoint
CREATE INDEX "idx_sales_partner_addresses_partner" ON "sales"."partner_addresses" ("tenant_id","partner_id","type");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_sales_partner_addresses_default_type" ON "sales"."partner_addresses" ("tenant_id","partner_id","type") WHERE "deleted_at" IS NULL AND "is_default" = true;--> statement-breakpoint
CREATE INDEX "idx_sales_partner_bank_accounts_tenant" ON "sales"."partner_bank_accounts" ("tenant_id");--> statement-breakpoint
CREATE INDEX "idx_sales_partner_bank_accounts_partner" ON "sales"."partner_bank_accounts" ("tenant_id","partner_id");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_sales_partner_bank_accounts_acc_number" ON "sales"."partner_bank_accounts" ("tenant_id",lower("acc_number")) WHERE "deleted_at" IS NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "uq_sales_partner_bank_accounts_default" ON "sales"."partner_bank_accounts" ("tenant_id","partner_id") WHERE "deleted_at" IS NULL AND "is_default" = true;--> statement-breakpoint
CREATE INDEX "idx_sales_partner_tag_assignments_tenant" ON "sales"."partner_tag_assignments" ("tenant_id");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_sales_partner_tag_assignments_unique" ON "sales"."partner_tag_assignments" ("tenant_id","partner_id","tag_id");--> statement-breakpoint
CREATE INDEX "idx_sales_partner_tags_tenant" ON "sales"."partner_tags" ("tenant_id");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_sales_partner_tags_name" ON "sales"."partner_tags" ("tenant_id",lower("name")) WHERE "deleted_at" IS NULL;--> statement-breakpoint
CREATE INDEX "idx_sales_partners_tenant" ON "sales"."partners" ("tenant_id");--> statement-breakpoint
CREATE INDEX "idx_sales_partners_type" ON "sales"."partners" ("tenant_id","type");--> statement-breakpoint
CREATE INDEX "idx_sales_partners_parent" ON "sales"."partners" ("tenant_id","parent_id");--> statement-breakpoint
CREATE INDEX "idx_sales_partners_country_state" ON "sales"."partners" ("tenant_id","country_id","state_id");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_sales_partners_email" ON "sales"."partners" ("tenant_id",lower("email")) WHERE "deleted_at" IS NULL AND "email" IS NOT NULL;--> statement-breakpoint
CREATE INDEX "idx_sales_payment_term_lines_tenant" ON "sales"."payment_term_lines" ("tenant_id");--> statement-breakpoint
CREATE INDEX "idx_sales_payment_term_lines_term" ON "sales"."payment_term_lines" ("tenant_id","payment_term_id","sequence");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_sales_payment_term_lines_sequence" ON "sales"."payment_term_lines" ("tenant_id","payment_term_id","sequence");--> statement-breakpoint
CREATE INDEX "idx_sales_payment_terms_tenant" ON "sales"."payment_terms" ("tenant_id");--> statement-breakpoint
CREATE INDEX "idx_sales_payment_terms_active" ON "sales"."payment_terms" ("tenant_id","is_active");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_sales_payment_terms_name" ON "sales"."payment_terms" ("tenant_id",lower("name")) WHERE "deleted_at" IS NULL;--> statement-breakpoint
CREATE INDEX "idx_sales_pricelist_items_tenant" ON "sales"."pricelist_items" ("tenant_id");--> statement-breakpoint
CREATE INDEX "idx_sales_pricelist_items_pricelist" ON "sales"."pricelist_items" ("tenant_id","pricelist_id","sequence");--> statement-breakpoint
CREATE INDEX "idx_sales_pricelist_items_scope" ON "sales"."pricelist_items" ("tenant_id","applied_on","is_active");--> statement-breakpoint
CREATE INDEX "idx_sales_pricelist_items_product" ON "sales"."pricelist_items" ("tenant_id","product_id");--> statement-breakpoint
CREATE INDEX "idx_sales_pricelist_items_category" ON "sales"."pricelist_items" ("tenant_id","categ_id");--> statement-breakpoint
CREATE INDEX "idx_sales_pricelist_items_effective" ON "sales"."pricelist_items" ("tenant_id","pricelist_id","effective_from");--> statement-breakpoint
CREATE INDEX "idx_sales_pricelist_items_superseded_by" ON "sales"."pricelist_items" ("tenant_id","superseded_by");--> statement-breakpoint
CREATE INDEX "idx_sales_pricelists_tenant" ON "sales"."pricelists" ("tenant_id");--> statement-breakpoint
CREATE INDEX "idx_sales_pricelists_currency" ON "sales"."pricelists" ("tenant_id","currency_id");--> statement-breakpoint
CREATE INDEX "idx_sales_pricelists_active" ON "sales"."pricelists" ("tenant_id","is_active","sequence");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_sales_pricelists_name" ON "sales"."pricelists" ("tenant_id",lower("name")) WHERE "deleted_at" IS NULL;--> statement-breakpoint
CREATE INDEX "idx_sales_product_attribute_values_tenant" ON "sales"."product_attribute_values" ("tenant_id");--> statement-breakpoint
CREATE INDEX "idx_sales_product_attribute_values_attribute" ON "sales"."product_attribute_values" ("tenant_id","attribute_id");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_sales_product_attribute_values_name" ON "sales"."product_attribute_values" ("tenant_id","attribute_id",lower("name")) WHERE "deleted_at" IS NULL;--> statement-breakpoint
CREATE INDEX "idx_sales_product_attributes_tenant" ON "sales"."product_attributes" ("tenant_id");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_sales_product_attributes_name" ON "sales"."product_attributes" ("tenant_id",lower("name")) WHERE "deleted_at" IS NULL;--> statement-breakpoint
CREATE INDEX "idx_sales_product_categories_tenant" ON "sales"."product_categories" ("tenant_id");--> statement-breakpoint
CREATE INDEX "idx_sales_product_categories_parent" ON "sales"."product_categories" ("tenant_id","parent_id");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_sales_product_categories_name" ON "sales"."product_categories" ("tenant_id",lower("name")) WHERE "deleted_at" IS NULL;--> statement-breakpoint
CREATE INDEX "idx_sales_product_packaging_tenant" ON "sales"."product_packaging" ("tenant_id");--> statement-breakpoint
CREATE INDEX "idx_sales_product_packaging_variant" ON "sales"."product_packaging" ("tenant_id","variant_id");--> statement-breakpoint
CREATE INDEX "idx_sales_ptmpl_attr_lines_tenant" ON "sales"."product_template_attribute_lines" ("tenant_id");--> statement-breakpoint
CREATE INDEX "idx_sales_ptmpl_attr_lines_template" ON "sales"."product_template_attribute_lines" ("tenant_id","template_id");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_sales_ptmpl_attr_lines_tmpl_attr" ON "sales"."product_template_attribute_lines" ("tenant_id","template_id","attribute_id");--> statement-breakpoint
CREATE INDEX "idx_sales_ptmpl_attr_vals_tenant" ON "sales"."product_template_attribute_values" ("tenant_id");--> statement-breakpoint
CREATE INDEX "idx_sales_ptmpl_attr_vals_line" ON "sales"."product_template_attribute_values" ("tenant_id","template_attribute_line_id");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_sales_ptmpl_attr_vals_line_val" ON "sales"."product_template_attribute_values" ("tenant_id","template_attribute_line_id","attribute_value_id");--> statement-breakpoint
CREATE INDEX "idx_sales_product_templates_tenant" ON "sales"."product_templates" ("tenant_id");--> statement-breakpoint
CREATE INDEX "idx_sales_product_templates_category" ON "sales"."product_templates" ("tenant_id","category_id");--> statement-breakpoint
CREATE INDEX "idx_sales_product_templates_active" ON "sales"."product_templates" ("tenant_id","is_active");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_sales_product_templates_barcode" ON "sales"."product_templates" ("tenant_id",lower("barcode")) WHERE "deleted_at" IS NULL AND "barcode" IS NOT NULL;--> statement-breakpoint
CREATE INDEX "idx_sales_product_variants_tenant" ON "sales"."product_variants" ("tenant_id");--> statement-breakpoint
CREATE INDEX "idx_sales_product_variants_template" ON "sales"."product_variants" ("tenant_id","template_id");--> statement-breakpoint
CREATE INDEX "idx_sales_product_variants_active" ON "sales"."product_variants" ("tenant_id","is_active");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_sales_product_variants_barcode" ON "sales"."product_variants" ("tenant_id",lower("barcode")) WHERE "deleted_at" IS NULL AND "barcode" IS NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "uq_sales_product_variants_combination" ON "sales"."product_variants" ("tenant_id","template_id","combination_indices") WHERE "deleted_at" IS NULL;--> statement-breakpoint
CREATE INDEX "idx_sales_products_tenant" ON "sales"."products" ("tenant_id");--> statement-breakpoint
CREATE INDEX "idx_sales_products_category" ON "sales"."products" ("tenant_id","category_id");--> statement-breakpoint
CREATE INDEX "idx_sales_products_active" ON "sales"."products" ("tenant_id","is_active");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_sales_products_sku" ON "sales"."products" ("tenant_id",lower("sku")) WHERE "deleted_at" IS NULL AND "sku" IS NOT NULL;--> statement-breakpoint
CREATE INDEX "idx_sales_return_order_lines_tenant" ON "sales"."return_order_lines" ("tenant_id");--> statement-breakpoint
CREATE INDEX "idx_sales_return_order_lines_return_order" ON "sales"."return_order_lines" ("tenant_id","return_order_id");--> statement-breakpoint
CREATE INDEX "idx_sales_return_order_lines_source_line" ON "sales"."return_order_lines" ("tenant_id","source_line_id");--> statement-breakpoint
CREATE INDEX "idx_sales_return_order_lines_product" ON "sales"."return_order_lines" ("tenant_id","product_id");--> statement-breakpoint
CREATE INDEX "idx_sales_return_orders_tenant" ON "sales"."return_orders" ("tenant_id");--> statement-breakpoint
CREATE INDEX "idx_sales_return_orders_source_order" ON "sales"."return_orders" ("tenant_id","source_order_id");--> statement-breakpoint
CREATE INDEX "idx_sales_return_orders_partner" ON "sales"."return_orders" ("tenant_id","partner_id");--> statement-breakpoint
CREATE INDEX "idx_sales_return_orders_status" ON "sales"."return_orders" ("tenant_id","status","updated_at");--> statement-breakpoint
CREATE INDEX "idx_sales_return_orders_reason" ON "sales"."return_orders" ("tenant_id","reason_code_id");--> statement-breakpoint
CREATE INDEX "idx_sales_return_reason_codes_tenant" ON "sales"."return_reason_codes" ("tenant_id");--> statement-breakpoint
CREATE INDEX "idx_sales_return_reason_codes_active" ON "sales"."return_reason_codes" ("tenant_id","is_active");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_sales_return_reason_codes_code" ON "sales"."return_reason_codes" ("tenant_id",lower("code")) WHERE "deleted_at" IS NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "uq_sales_return_reason_codes_name" ON "sales"."return_reason_codes" ("tenant_id",lower("name")) WHERE "deleted_at" IS NULL;--> statement-breakpoint
CREATE INDEX "idx_sales_rounding_policies_tenant" ON "sales"."rounding_policies" ("tenant_id");--> statement-breakpoint
CREATE INDEX "idx_sales_rounding_policies_lookup" ON "sales"."rounding_policies" ("tenant_id","policy_key","currency_code","effective_from");--> statement-breakpoint
CREATE INDEX "idx_sales_rounding_policies_active" ON "sales"."rounding_policies" ("tenant_id","applies_to","is_active");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_sales_rounding_policies_effective" ON "sales"."rounding_policies" ("tenant_id","policy_key","currency_code","effective_from") WHERE "deleted_at" IS NULL AND "is_active" = true;--> statement-breakpoint
CREATE INDEX "idx_sales_sale_order_line_taxes_tenant" ON "sales"."sale_order_line_taxes" ("tenant_id");--> statement-breakpoint
CREATE INDEX "idx_sales_sale_order_line_taxes_line" ON "sales"."sale_order_line_taxes" ("tenant_id","order_line_id","sequence");--> statement-breakpoint
CREATE INDEX "idx_sales_sale_order_line_taxes_tax" ON "sales"."sale_order_line_taxes" ("tenant_id","tax_id");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_sales_sale_order_line_taxes_unique" ON "sales"."sale_order_line_taxes" ("tenant_id","order_line_id","tax_id");--> statement-breakpoint
CREATE INDEX "idx_sales_sale_order_option_lines_tenant" ON "sales"."sale_order_option_lines" ("tenant_id");--> statement-breakpoint
CREATE INDEX "idx_sales_sale_order_option_lines_order" ON "sales"."sale_order_option_lines" ("tenant_id","order_id","sequence");--> statement-breakpoint
CREATE INDEX "idx_sales_sale_order_option_lines_product" ON "sales"."sale_order_option_lines" ("tenant_id","product_id");--> statement-breakpoint
CREATE INDEX "idx_sales_sale_order_status_history_tenant" ON "sales"."sale_order_status_history" ("tenant_id");--> statement-breakpoint
CREATE INDEX "idx_sales_sale_order_status_history_order" ON "sales"."sale_order_status_history" ("tenant_id","order_id","changed_at");--> statement-breakpoint
CREATE INDEX "idx_sales_sale_order_status_history_status" ON "sales"."sale_order_status_history" ("tenant_id","new_status","changed_at");--> statement-breakpoint
CREATE INDEX "idx_sales_sale_order_tax_summary_tenant" ON "sales"."sale_order_tax_summary" ("tenant_id");--> statement-breakpoint
CREATE INDEX "idx_sales_sale_order_tax_summary_order" ON "sales"."sale_order_tax_summary" ("tenant_id","order_id");--> statement-breakpoint
CREATE INDEX "idx_sales_sale_order_tax_summary_tax" ON "sales"."sale_order_tax_summary" ("tenant_id","tax_id");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_sales_sale_order_tax_summary_unique" ON "sales"."sale_order_tax_summary" ("tenant_id","order_id","tax_id");--> statement-breakpoint
CREATE INDEX "idx_sales_document_attachments_tenant" ON "sales"."document_attachments" ("tenant_id");--> statement-breakpoint
CREATE INDEX "idx_sales_document_attachments_lookup" ON "sales"."document_attachments" ("tenant_id","document_type","document_id","created_at");--> statement-breakpoint
CREATE INDEX "idx_sales_document_attachments_type" ON "sales"."document_attachments" ("tenant_id","attachment_type","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_sales_document_attachments_storage_path" ON "sales"."document_attachments" ("tenant_id","storage_path") WHERE "deleted_at" IS NULL;--> statement-breakpoint
CREATE INDEX "idx_sales_order_lines_tenant" ON "sales"."sales_order_lines" ("tenant_id");--> statement-breakpoint
CREATE INDEX "idx_sales_order_lines_order" ON "sales"."sales_order_lines" ("tenant_id","order_id","sequence");--> statement-breakpoint
CREATE INDEX "idx_sales_order_lines_product" ON "sales"."sales_order_lines" ("tenant_id","product_id");--> statement-breakpoint
CREATE INDEX "idx_sales_order_lines_uom" ON "sales"."sales_order_lines" ("tenant_id","product_uom_id");--> statement-breakpoint
CREATE INDEX "idx_sales_order_lines_invoice_status" ON "sales"."sales_order_lines" ("tenant_id","invoice_status");--> statement-breakpoint
CREATE INDEX "idx_sales_order_lines_price_source" ON "sales"."sales_order_lines" ("tenant_id","price_source");--> statement-breakpoint
CREATE INDEX "idx_sales_order_lines_tax" ON "sales"."sales_order_lines" ("tenant_id","tax_id");--> statement-breakpoint
CREATE INDEX "idx_sales_order_lines_price_approved_by" ON "sales"."sales_order_lines" ("tenant_id","price_approved_by");--> statement-breakpoint
CREATE INDEX "idx_sales_orders_tenant" ON "sales"."sales_orders" ("tenant_id");--> statement-breakpoint
CREATE INDEX "idx_sales_orders_partner" ON "sales"."sales_orders" ("tenant_id","partner_id");--> statement-breakpoint
CREATE INDEX "idx_sales_orders_status" ON "sales"."sales_orders" ("tenant_id","status","order_date");--> statement-breakpoint
CREATE INDEX "idx_sales_orders_credit_check" ON "sales"."sales_orders" ("tenant_id","credit_check_passed","order_date");--> statement-breakpoint
CREATE INDEX "idx_sales_orders_currency" ON "sales"."sales_orders" ("tenant_id","currency_id");--> statement-breakpoint
CREATE INDEX "idx_sales_orders_pricelist" ON "sales"."sales_orders" ("tenant_id","pricelist_id");--> statement-breakpoint
CREATE INDEX "idx_sales_orders_pricelist_snapshot" ON "sales"."sales_orders" ("tenant_id","pricelist_snapshot_id");--> statement-breakpoint
CREATE INDEX "idx_sales_orders_credit_check_by" ON "sales"."sales_orders" ("tenant_id","credit_check_by");--> statement-breakpoint
CREATE INDEX "idx_sales_orders_payment_term" ON "sales"."sales_orders" ("tenant_id","payment_term_id");--> statement-breakpoint
CREATE INDEX "idx_sales_orders_fiscal_position" ON "sales"."sales_orders" ("tenant_id","fiscal_position_id");--> statement-breakpoint
CREATE INDEX "idx_sales_orders_invoice_status" ON "sales"."sales_orders" ("tenant_id","invoice_status","order_date");--> statement-breakpoint
CREATE INDEX "idx_sales_orders_delivery_status" ON "sales"."sales_orders" ("tenant_id","delivery_status","order_date");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_sales_orders_sequence_number" ON "sales"."sales_orders" ("tenant_id","sequence_number") WHERE "deleted_at" IS NULL AND "sequence_number" IS NOT NULL;--> statement-breakpoint
CREATE INDEX "idx_sales_sales_team_members_tenant" ON "sales"."sales_team_members" ("tenant_id");--> statement-breakpoint
CREATE INDEX "idx_sales_sales_team_members_team" ON "sales"."sales_team_members" ("tenant_id","team_id");--> statement-breakpoint
CREATE INDEX "idx_sales_sales_team_members_user" ON "sales"."sales_team_members" ("tenant_id","user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_sales_sales_team_members_unique" ON "sales"."sales_team_members" ("tenant_id","team_id","user_id") WHERE "deleted_at" IS NULL;--> statement-breakpoint
CREATE INDEX "idx_sales_sales_teams_tenant" ON "sales"."sales_teams" ("tenant_id");--> statement-breakpoint
CREATE INDEX "idx_sales_sales_teams_manager" ON "sales"."sales_teams" ("tenant_id","manager_id");--> statement-breakpoint
CREATE INDEX "idx_sales_sales_teams_active" ON "sales"."sales_teams" ("tenant_id","is_active");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_sales_sales_teams_code" ON "sales"."sales_teams" ("tenant_id",lower("code")) WHERE "deleted_at" IS NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "uq_sales_sales_teams_name" ON "sales"."sales_teams" ("tenant_id",lower("name")) WHERE "deleted_at" IS NULL;--> statement-breakpoint
CREATE INDEX "idx_sales_subscription_close_reasons_tenant" ON "sales"."subscription_close_reasons" ("tenant_id");--> statement-breakpoint
CREATE INDEX "idx_sales_subscription_close_reasons_churn" ON "sales"."subscription_close_reasons" ("tenant_id","is_churn");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_sales_subscription_close_reasons_code" ON "sales"."subscription_close_reasons" ("tenant_id",lower("code")) WHERE "deleted_at" IS NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "uq_sales_subscription_close_reasons_name" ON "sales"."subscription_close_reasons" ("tenant_id",lower("name")) WHERE "deleted_at" IS NULL;--> statement-breakpoint
CREATE INDEX "idx_sales_subscription_lines_tenant" ON "sales"."subscription_lines" ("tenant_id");--> statement-breakpoint
CREATE INDEX "idx_sales_subscription_lines_subscription" ON "sales"."subscription_lines" ("tenant_id","subscription_id");--> statement-breakpoint
CREATE INDEX "idx_sales_subscription_lines_product" ON "sales"."subscription_lines" ("tenant_id","product_id");--> statement-breakpoint
CREATE INDEX "idx_sales_subscription_lines_uom" ON "sales"."subscription_lines" ("tenant_id","uom_id");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_sales_subscription_lines_sequence" ON "sales"."subscription_lines" ("tenant_id","subscription_id","sequence");--> statement-breakpoint
CREATE INDEX "idx_sales_subscription_logs_tenant" ON "sales"."subscription_logs" ("tenant_id");--> statement-breakpoint
CREATE INDEX "idx_sales_subscription_logs_subscription" ON "sales"."subscription_logs" ("tenant_id","subscription_id");--> statement-breakpoint
CREATE INDEX "idx_sales_subscription_logs_event" ON "sales"."subscription_logs" ("tenant_id","event_type","event_at");--> statement-breakpoint
CREATE INDEX "idx_sales_subscription_templates_tenant" ON "sales"."subscription_templates" ("tenant_id");--> statement-breakpoint
CREATE INDEX "idx_sales_subscription_templates_active" ON "sales"."subscription_templates" ("tenant_id","is_active");--> statement-breakpoint
CREATE INDEX "idx_sales_subscription_templates_payment_term" ON "sales"."subscription_templates" ("tenant_id","payment_term_id");--> statement-breakpoint
CREATE INDEX "idx_sales_subscription_templates_pricelist" ON "sales"."subscription_templates" ("tenant_id","pricelist_id");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_sales_subscription_templates_name" ON "sales"."subscription_templates" ("tenant_id",lower("name")) WHERE "deleted_at" IS NULL;--> statement-breakpoint
CREATE INDEX "idx_sales_subscriptions_tenant" ON "sales"."subscriptions" ("tenant_id");--> statement-breakpoint
CREATE INDEX "idx_sales_subscriptions_partner" ON "sales"."subscriptions" ("tenant_id","partner_id");--> statement-breakpoint
CREATE INDEX "idx_sales_subscriptions_template" ON "sales"."subscriptions" ("tenant_id","template_id");--> statement-breakpoint
CREATE INDEX "idx_sales_subscriptions_status" ON "sales"."subscriptions" ("tenant_id","status","next_invoice_date");--> statement-breakpoint
CREATE INDEX "idx_sales_subscriptions_close_reason" ON "sales"."subscriptions" ("tenant_id","close_reason_id");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_sales_subscriptions_name" ON "sales"."subscriptions" ("tenant_id",lower("name")) WHERE "deleted_at" IS NULL;--> statement-breakpoint
CREATE INDEX "idx_sales_tax_groups_tenant" ON "sales"."tax_groups" ("tenant_id");--> statement-breakpoint
CREATE INDEX "idx_sales_tax_groups_country" ON "sales"."tax_groups" ("tenant_id","country_id");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_sales_tax_groups_name" ON "sales"."tax_groups" ("tenant_id",lower("name")) WHERE "deleted_at" IS NULL;--> statement-breakpoint
CREATE INDEX "idx_sales_tax_rate_children_tenant" ON "sales"."tax_rate_children" ("tenant_id");--> statement-breakpoint
CREATE INDEX "idx_sales_tax_rate_children_parent" ON "sales"."tax_rate_children" ("tenant_id","parent_tax_id","sequence");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_sales_tax_rate_children_unique" ON "sales"."tax_rate_children" ("tenant_id","parent_tax_id","child_tax_id");--> statement-breakpoint
CREATE INDEX "idx_sales_tax_rates_tenant" ON "sales"."tax_rates" ("tenant_id");--> statement-breakpoint
CREATE INDEX "idx_sales_tax_rates_type" ON "sales"."tax_rates" ("tenant_id","type_tax_use","amount_type");--> statement-breakpoint
CREATE INDEX "idx_sales_tax_rates_group" ON "sales"."tax_rates" ("tenant_id","tax_group_id");--> statement-breakpoint
CREATE INDEX "idx_sales_tax_rates_effective" ON "sales"."tax_rates" ("tenant_id","effective_from");--> statement-breakpoint
CREATE INDEX "idx_sales_tax_rates_replaced_by" ON "sales"."tax_rates" ("tenant_id","replaced_by");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_sales_tax_rates_name" ON "sales"."tax_rates" ("tenant_id",lower("name")) WHERE "deleted_at" IS NULL;--> statement-breakpoint
CREATE INDEX "idx_sales_territories_tenant" ON "sales"."territories" ("tenant_id");--> statement-breakpoint
CREATE INDEX "idx_sales_territories_parent" ON "sales"."territories" ("tenant_id","parent_id");--> statement-breakpoint
CREATE INDEX "idx_sales_territories_team" ON "sales"."territories" ("tenant_id","team_id");--> statement-breakpoint
CREATE INDEX "idx_sales_territories_salesperson" ON "sales"."territories" ("tenant_id","default_salesperson_id");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_sales_territories_code" ON "sales"."territories" ("tenant_id",lower("code")) WHERE "deleted_at" IS NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "uq_sales_territories_name" ON "sales"."territories" ("tenant_id",lower("name")) WHERE "deleted_at" IS NULL;--> statement-breakpoint
CREATE INDEX "idx_sales_territory_rules_tenant" ON "sales"."territory_rules" ("tenant_id");--> statement-breakpoint
CREATE INDEX "idx_sales_territory_rules_territory" ON "sales"."territory_rules" ("tenant_id","territory_id");--> statement-breakpoint
CREATE INDEX "idx_sales_territory_rules_geo" ON "sales"."territory_rules" ("tenant_id","country_id","state_id");--> statement-breakpoint
CREATE INDEX "idx_sales_territory_rules_priority" ON "sales"."territory_rules" ("tenant_id","priority");--> statement-breakpoint
ALTER TABLE "core"."app_modules" ADD CONSTRAINT "fk_app_modules_tenant" FOREIGN KEY ("tenant_id") REFERENCES "core"."tenants"("tenant_id") ON DELETE RESTRICT ON UPDATE CASCADE;--> statement-breakpoint
ALTER TABLE "reference"."approval_logs" ADD CONSTRAINT "fk_reference_approval_logs_tenant" FOREIGN KEY ("tenant_id") REFERENCES "core"."tenants"("tenant_id") ON DELETE RESTRICT ON UPDATE CASCADE;--> statement-breakpoint
ALTER TABLE "reference"."approval_logs" ADD CONSTRAINT "fk_reference_approval_logs_actor" FOREIGN KEY ("actor_id") REFERENCES "security"."users"("userId") ON DELETE SET NULL ON UPDATE CASCADE;--> statement-breakpoint
ALTER TABLE "reference"."banks" ADD CONSTRAINT "fk_reference_banks_country" FOREIGN KEY ("country_id") REFERENCES "reference"."countries"("country_id") ON DELETE SET NULL ON UPDATE CASCADE;--> statement-breakpoint
ALTER TABLE "reference"."currency_rates" ADD CONSTRAINT "fk_reference_currency_rates_currency" FOREIGN KEY ("currency_id") REFERENCES "reference"."currencies"("currency_id") ON DELETE RESTRICT ON UPDATE CASCADE;--> statement-breakpoint
ALTER TABLE "reference"."document_attachments" ADD CONSTRAINT "fk_reference_document_attachments_tenant" FOREIGN KEY ("tenant_id") REFERENCES "core"."tenants"("tenant_id") ON DELETE RESTRICT ON UPDATE CASCADE;--> statement-breakpoint
ALTER TABLE "reference"."document_attachments" ADD CONSTRAINT "fk_reference_document_attachments_uploaded_by" FOREIGN KEY ("uploaded_by") REFERENCES "security"."users"("userId") ON DELETE SET NULL ON UPDATE CASCADE;--> statement-breakpoint
ALTER TABLE "reference"."sequences" ADD CONSTRAINT "fk_reference_sequences_tenant" FOREIGN KEY ("tenant_id") REFERENCES "core"."tenants"("tenant_id") ON DELETE RESTRICT ON UPDATE CASCADE;--> statement-breakpoint
ALTER TABLE "reference"."states" ADD CONSTRAINT "fk_reference_states_country" FOREIGN KEY ("country_id") REFERENCES "reference"."countries"("country_id") ON DELETE RESTRICT ON UPDATE CASCADE;--> statement-breakpoint
ALTER TABLE "reference"."units_of_measure" ADD CONSTRAINT "fk_reference_uoms_category" FOREIGN KEY ("category_id") REFERENCES "reference"."uom_categories"("uom_category_id") ON DELETE RESTRICT ON UPDATE CASCADE;--> statement-breakpoint
ALTER TABLE "security"."users" ADD CONSTRAINT "fk_users_tenant" FOREIGN KEY ("tenant_id") REFERENCES "core"."tenants"("tenant_id") ON DELETE RESTRICT ON UPDATE CASCADE;--> statement-breakpoint
ALTER TABLE "security"."roles" ADD CONSTRAINT "fk_roles_tenant" FOREIGN KEY ("tenant_id") REFERENCES "core"."tenants"("tenant_id") ON DELETE RESTRICT ON UPDATE CASCADE;--> statement-breakpoint
ALTER TABLE "security"."user_roles" ADD CONSTRAINT "fk_user_roles_tenant" FOREIGN KEY ("tenant_id") REFERENCES "core"."tenants"("tenant_id") ON DELETE RESTRICT ON UPDATE CASCADE;--> statement-breakpoint
ALTER TABLE "security"."user_roles" ADD CONSTRAINT "fk_user_roles_user" FOREIGN KEY ("userId") REFERENCES "security"."users"("userId") ON DELETE CASCADE ON UPDATE CASCADE;--> statement-breakpoint
ALTER TABLE "security"."user_roles" ADD CONSTRAINT "fk_user_roles_role" FOREIGN KEY ("roleId") REFERENCES "security"."roles"("roleId") ON DELETE RESTRICT ON UPDATE CASCADE;--> statement-breakpoint
ALTER TABLE "security"."user_roles" ADD CONSTRAINT "fk_user_roles_assigned_by" FOREIGN KEY ("assignedBy") REFERENCES "security"."users"("userId") ON DELETE RESTRICT ON UPDATE CASCADE;--> statement-breakpoint
ALTER TABLE "security"."permissions" ADD CONSTRAINT "fk_permissions_tenant" FOREIGN KEY ("tenant_id") REFERENCES "core"."tenants"("tenant_id") ON DELETE RESTRICT ON UPDATE CASCADE;--> statement-breakpoint
ALTER TABLE "security"."role_permissions" ADD CONSTRAINT "fk_role_permissions_tenant" FOREIGN KEY ("tenant_id") REFERENCES "core"."tenants"("tenant_id") ON DELETE RESTRICT ON UPDATE CASCADE;--> statement-breakpoint
ALTER TABLE "security"."role_permissions" ADD CONSTRAINT "fk_role_permissions_role" FOREIGN KEY ("roleId") REFERENCES "security"."roles"("roleId") ON DELETE CASCADE ON UPDATE CASCADE;--> statement-breakpoint
ALTER TABLE "security"."role_permissions" ADD CONSTRAINT "fk_role_permissions_permission" FOREIGN KEY ("permissionId") REFERENCES "security"."permissions"("permissionId") ON DELETE CASCADE ON UPDATE CASCADE;--> statement-breakpoint
ALTER TABLE "security"."user_permissions" ADD CONSTRAINT "fk_user_permissions_tenant" FOREIGN KEY ("tenant_id") REFERENCES "core"."tenants"("tenant_id") ON DELETE RESTRICT ON UPDATE CASCADE;--> statement-breakpoint
ALTER TABLE "security"."user_permissions" ADD CONSTRAINT "fk_user_permissions_user" FOREIGN KEY ("userId") REFERENCES "security"."users"("userId") ON DELETE CASCADE ON UPDATE CASCADE;--> statement-breakpoint
ALTER TABLE "security"."user_permissions" ADD CONSTRAINT "fk_user_permissions_permission" FOREIGN KEY ("permissionId") REFERENCES "security"."permissions"("permissionId") ON DELETE CASCADE ON UPDATE CASCADE;--> statement-breakpoint
ALTER TABLE "fields" ADD CONSTRAINT "fields_entity_id_entities_id_fkey" FOREIGN KEY ("entity_id") REFERENCES "entities"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "layouts" ADD CONSTRAINT "layouts_entity_id_entities_id_fkey" FOREIGN KEY ("entity_id") REFERENCES "entities"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "metadata_overrides" ADD CONSTRAINT "metadata_overrides_tenant_id_tenant_definitions_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenant_definitions"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "sales"."accounting_postings" ADD CONSTRAINT "fk_sales_accounting_postings_tenant" FOREIGN KEY ("tenant_id") REFERENCES "core"."tenants"("tenant_id") ON DELETE RESTRICT ON UPDATE CASCADE;--> statement-breakpoint
ALTER TABLE "sales"."accounting_postings" ADD CONSTRAINT "fk_sales_accounting_postings_posted_by" FOREIGN KEY ("posted_by") REFERENCES "security"."users"("userId") ON DELETE SET NULL ON UPDATE CASCADE;--> statement-breakpoint
ALTER TABLE "sales"."accounting_postings" ADD CONSTRAINT "fk_sales_accounting_postings_reversed_by" FOREIGN KEY ("reversed_by") REFERENCES "security"."users"("userId") ON DELETE SET NULL ON UPDATE CASCADE;--> statement-breakpoint
ALTER TABLE "sales"."accounting_postings" ADD CONSTRAINT "fk_sales_accounting_postings_reversal_entry" FOREIGN KEY ("reversal_entry_id") REFERENCES "sales"."accounting_postings"("id") ON DELETE SET NULL ON UPDATE CASCADE;--> statement-breakpoint
ALTER TABLE "sales"."commission_entries" ADD CONSTRAINT "fk_sales_commission_entries_tenant" FOREIGN KEY ("tenant_id") REFERENCES "core"."tenants"("tenant_id") ON DELETE RESTRICT ON UPDATE CASCADE;--> statement-breakpoint
ALTER TABLE "sales"."commission_entries" ADD CONSTRAINT "fk_sales_commission_entries_order" FOREIGN KEY ("order_id") REFERENCES "sales"."sales_orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;--> statement-breakpoint
ALTER TABLE "sales"."commission_entries" ADD CONSTRAINT "fk_sales_commission_entries_salesperson" FOREIGN KEY ("salesperson_id") REFERENCES "security"."users"("userId") ON DELETE RESTRICT ON UPDATE CASCADE;--> statement-breakpoint
ALTER TABLE "sales"."commission_entries" ADD CONSTRAINT "fk_sales_commission_entries_plan" FOREIGN KEY ("plan_id") REFERENCES "sales"."commission_plans"("id") ON DELETE RESTRICT ON UPDATE CASCADE;--> statement-breakpoint
ALTER TABLE "sales"."commission_plan_tiers" ADD CONSTRAINT "fk_sales_commission_plan_tiers_tenant" FOREIGN KEY ("tenant_id") REFERENCES "core"."tenants"("tenant_id") ON DELETE RESTRICT ON UPDATE CASCADE;--> statement-breakpoint
ALTER TABLE "sales"."commission_plan_tiers" ADD CONSTRAINT "fk_sales_commission_plan_tiers_plan" FOREIGN KEY ("plan_id") REFERENCES "sales"."commission_plans"("id") ON DELETE CASCADE ON UPDATE CASCADE;--> statement-breakpoint
ALTER TABLE "sales"."commission_plans" ADD CONSTRAINT "fk_sales_commission_plans_tenant" FOREIGN KEY ("tenant_id") REFERENCES "core"."tenants"("tenant_id") ON DELETE RESTRICT ON UPDATE CASCADE;--> statement-breakpoint
ALTER TABLE "sales"."consignment_agreement_lines" ADD CONSTRAINT "fk_sales_consignment_agreement_lines_tenant" FOREIGN KEY ("tenant_id") REFERENCES "core"."tenants"("tenant_id") ON DELETE RESTRICT ON UPDATE CASCADE;--> statement-breakpoint
ALTER TABLE "sales"."consignment_agreement_lines" ADD CONSTRAINT "fk_sales_consignment_agreement_lines_agreement" FOREIGN KEY ("agreement_id") REFERENCES "sales"."consignment_agreements"("id") ON DELETE CASCADE ON UPDATE CASCADE;--> statement-breakpoint
ALTER TABLE "sales"."consignment_agreement_lines" ADD CONSTRAINT "fk_sales_consignment_agreement_lines_product" FOREIGN KEY ("product_id") REFERENCES "sales"."products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;--> statement-breakpoint
ALTER TABLE "sales"."consignment_agreements" ADD CONSTRAINT "fk_sales_consignment_agreements_tenant" FOREIGN KEY ("tenant_id") REFERENCES "core"."tenants"("tenant_id") ON DELETE RESTRICT ON UPDATE CASCADE;--> statement-breakpoint
ALTER TABLE "sales"."consignment_agreements" ADD CONSTRAINT "fk_sales_consignment_agreements_partner" FOREIGN KEY ("partner_id") REFERENCES "sales"."partners"("id") ON DELETE RESTRICT ON UPDATE CASCADE;--> statement-breakpoint
ALTER TABLE "sales"."consignment_agreements" ADD CONSTRAINT "fk_sales_consignment_agreements_payment_term" FOREIGN KEY ("payment_term_id") REFERENCES "sales"."payment_terms"("id") ON DELETE SET NULL ON UPDATE CASCADE;--> statement-breakpoint
ALTER TABLE "sales"."consignment_stock_report_lines" ADD CONSTRAINT "fk_sales_consignment_stock_report_lines_tenant" FOREIGN KEY ("tenant_id") REFERENCES "core"."tenants"("tenant_id") ON DELETE RESTRICT ON UPDATE CASCADE;--> statement-breakpoint
ALTER TABLE "sales"."consignment_stock_report_lines" ADD CONSTRAINT "fk_sales_consignment_stock_report_lines_report" FOREIGN KEY ("report_id") REFERENCES "sales"."consignment_stock_reports"("id") ON DELETE CASCADE ON UPDATE CASCADE;--> statement-breakpoint
ALTER TABLE "sales"."consignment_stock_report_lines" ADD CONSTRAINT "fk_sales_consignment_stock_report_lines_product" FOREIGN KEY ("product_id") REFERENCES "sales"."products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;--> statement-breakpoint
ALTER TABLE "sales"."consignment_stock_reports" ADD CONSTRAINT "fk_sales_consignment_stock_reports_tenant" FOREIGN KEY ("tenant_id") REFERENCES "core"."tenants"("tenant_id") ON DELETE RESTRICT ON UPDATE CASCADE;--> statement-breakpoint
ALTER TABLE "sales"."consignment_stock_reports" ADD CONSTRAINT "fk_sales_consignment_stock_reports_agreement" FOREIGN KEY ("agreement_id") REFERENCES "sales"."consignment_agreements"("id") ON DELETE CASCADE ON UPDATE CASCADE;--> statement-breakpoint
ALTER TABLE "sales"."document_approvals" ADD CONSTRAINT "fk_sales_document_approvals_tenant" FOREIGN KEY ("tenant_id") REFERENCES "core"."tenants"("tenant_id") ON DELETE RESTRICT ON UPDATE CASCADE;--> statement-breakpoint
ALTER TABLE "sales"."document_approvals" ADD CONSTRAINT "fk_sales_document_approvals_approver" FOREIGN KEY ("approver_user_id") REFERENCES "security"."users"("userId") ON DELETE RESTRICT ON UPDATE CASCADE;--> statement-breakpoint
ALTER TABLE "sales"."document_status_history" ADD CONSTRAINT "fk_sales_document_status_history_tenant" FOREIGN KEY ("tenant_id") REFERENCES "core"."tenants"("tenant_id") ON DELETE RESTRICT ON UPDATE CASCADE;--> statement-breakpoint
ALTER TABLE "sales"."document_status_history" ADD CONSTRAINT "fk_sales_document_status_history_transitioned_by" FOREIGN KEY ("transitioned_by") REFERENCES "security"."users"("userId") ON DELETE RESTRICT ON UPDATE CASCADE;--> statement-breakpoint
ALTER TABLE "sales"."domain_event_logs" ADD CONSTRAINT "fk_sales_domain_event_logs_tenant" FOREIGN KEY ("tenant_id") REFERENCES "core"."tenants"("tenant_id") ON DELETE RESTRICT ON UPDATE CASCADE;--> statement-breakpoint
ALTER TABLE "sales"."domain_event_logs" ADD CONSTRAINT "fk_sales_domain_event_logs_user" FOREIGN KEY ("triggered_by") REFERENCES "security"."users"("userId") ON DELETE SET NULL ON UPDATE CASCADE;--> statement-breakpoint
ALTER TABLE "sales"."domain_invariant_logs" ADD CONSTRAINT "fk_sales_domain_invariant_logs_tenant" FOREIGN KEY ("tenant_id") REFERENCES "core"."tenants"("tenant_id") ON DELETE RESTRICT ON UPDATE CASCADE;--> statement-breakpoint
ALTER TABLE "sales"."fiscal_position_account_maps" ADD CONSTRAINT "fk_sales_fiscal_position_account_maps_tenant" FOREIGN KEY ("tenant_id") REFERENCES "core"."tenants"("tenant_id") ON DELETE RESTRICT ON UPDATE CASCADE;--> statement-breakpoint
ALTER TABLE "sales"."fiscal_position_account_maps" ADD CONSTRAINT "fk_sales_fiscal_position_account_maps_position" FOREIGN KEY ("fiscal_position_id") REFERENCES "sales"."fiscal_positions"("id") ON DELETE CASCADE ON UPDATE CASCADE;--> statement-breakpoint
ALTER TABLE "sales"."fiscal_position_tax_maps" ADD CONSTRAINT "fk_sales_fiscal_position_tax_maps_tenant" FOREIGN KEY ("tenant_id") REFERENCES "core"."tenants"("tenant_id") ON DELETE RESTRICT ON UPDATE CASCADE;--> statement-breakpoint
ALTER TABLE "sales"."fiscal_position_tax_maps" ADD CONSTRAINT "fk_sales_fiscal_position_tax_maps_position" FOREIGN KEY ("fiscal_position_id") REFERENCES "sales"."fiscal_positions"("id") ON DELETE CASCADE ON UPDATE CASCADE;--> statement-breakpoint
ALTER TABLE "sales"."fiscal_position_tax_maps" ADD CONSTRAINT "fk_sales_fiscal_position_tax_maps_src" FOREIGN KEY ("tax_src_id") REFERENCES "sales"."tax_rates"("id") ON DELETE RESTRICT ON UPDATE CASCADE;--> statement-breakpoint
ALTER TABLE "sales"."fiscal_position_tax_maps" ADD CONSTRAINT "fk_sales_fiscal_position_tax_maps_dest" FOREIGN KEY ("tax_dest_id") REFERENCES "sales"."tax_rates"("id") ON DELETE SET NULL ON UPDATE CASCADE;--> statement-breakpoint
ALTER TABLE "sales"."fiscal_positions" ADD CONSTRAINT "fk_sales_fiscal_positions_tenant" FOREIGN KEY ("tenant_id") REFERENCES "core"."tenants"("tenant_id") ON DELETE RESTRICT ON UPDATE CASCADE;--> statement-breakpoint
ALTER TABLE "sales"."fiscal_positions" ADD CONSTRAINT "fk_sales_fiscal_positions_country" FOREIGN KEY ("country_id") REFERENCES "reference"."countries"("country_id") ON DELETE SET NULL ON UPDATE CASCADE;--> statement-breakpoint
ALTER TABLE "sales"."line_item_discounts" ADD CONSTRAINT "fk_sales_line_item_discounts_tenant" FOREIGN KEY ("tenant_id") REFERENCES "core"."tenants"("tenant_id") ON DELETE RESTRICT ON UPDATE CASCADE;--> statement-breakpoint
ALTER TABLE "sales"."line_item_discounts" ADD CONSTRAINT "fk_sales_line_item_discounts_authorized_by" FOREIGN KEY ("authorized_by") REFERENCES "security"."users"("userId") ON DELETE SET NULL ON UPDATE CASCADE;--> statement-breakpoint
ALTER TABLE "sales"."partner_addresses" ADD CONSTRAINT "fk_sales_partner_addresses_tenant" FOREIGN KEY ("tenant_id") REFERENCES "core"."tenants"("tenant_id") ON DELETE RESTRICT ON UPDATE CASCADE;--> statement-breakpoint
ALTER TABLE "sales"."partner_addresses" ADD CONSTRAINT "fk_sales_partner_addresses_partner" FOREIGN KEY ("partner_id") REFERENCES "sales"."partners"("id") ON DELETE CASCADE ON UPDATE CASCADE;--> statement-breakpoint
ALTER TABLE "sales"."partner_addresses" ADD CONSTRAINT "fk_sales_partner_addresses_state" FOREIGN KEY ("state_id") REFERENCES "reference"."states"("state_id") ON DELETE SET NULL ON UPDATE CASCADE;--> statement-breakpoint
ALTER TABLE "sales"."partner_addresses" ADD CONSTRAINT "fk_sales_partner_addresses_country" FOREIGN KEY ("country_id") REFERENCES "reference"."countries"("country_id") ON DELETE SET NULL ON UPDATE CASCADE;--> statement-breakpoint
ALTER TABLE "sales"."partner_bank_accounts" ADD CONSTRAINT "fk_sales_partner_bank_accounts_tenant" FOREIGN KEY ("tenant_id") REFERENCES "core"."tenants"("tenant_id") ON DELETE RESTRICT ON UPDATE CASCADE;--> statement-breakpoint
ALTER TABLE "sales"."partner_bank_accounts" ADD CONSTRAINT "fk_sales_partner_bank_accounts_partner" FOREIGN KEY ("partner_id") REFERENCES "sales"."partners"("id") ON DELETE CASCADE ON UPDATE CASCADE;--> statement-breakpoint
ALTER TABLE "sales"."partner_bank_accounts" ADD CONSTRAINT "fk_sales_partner_bank_accounts_bank" FOREIGN KEY ("bank_id") REFERENCES "reference"."banks"("bank_id") ON DELETE SET NULL ON UPDATE CASCADE;--> statement-breakpoint
ALTER TABLE "sales"."partner_tag_assignments" ADD CONSTRAINT "fk_sales_partner_tag_assignments_tenant" FOREIGN KEY ("tenant_id") REFERENCES "core"."tenants"("tenant_id") ON DELETE RESTRICT ON UPDATE CASCADE;--> statement-breakpoint
ALTER TABLE "sales"."partner_tag_assignments" ADD CONSTRAINT "fk_sales_partner_tag_assignments_partner" FOREIGN KEY ("partner_id") REFERENCES "sales"."partners"("id") ON DELETE CASCADE ON UPDATE CASCADE;--> statement-breakpoint
ALTER TABLE "sales"."partner_tag_assignments" ADD CONSTRAINT "fk_sales_partner_tag_assignments_tag" FOREIGN KEY ("tag_id") REFERENCES "sales"."partner_tags"("id") ON DELETE CASCADE ON UPDATE CASCADE;--> statement-breakpoint
ALTER TABLE "sales"."partner_tags" ADD CONSTRAINT "fk_sales_partner_tags_tenant" FOREIGN KEY ("tenant_id") REFERENCES "core"."tenants"("tenant_id") ON DELETE RESTRICT ON UPDATE CASCADE;--> statement-breakpoint
ALTER TABLE "sales"."partners" ADD CONSTRAINT "fk_sales_partners_tenant" FOREIGN KEY ("tenant_id") REFERENCES "core"."tenants"("tenant_id") ON DELETE RESTRICT ON UPDATE CASCADE;--> statement-breakpoint
ALTER TABLE "sales"."partners" ADD CONSTRAINT "fk_sales_partners_parent" FOREIGN KEY ("parent_id") REFERENCES "sales"."partners"("id") ON DELETE SET NULL ON UPDATE CASCADE;--> statement-breakpoint
ALTER TABLE "sales"."partners" ADD CONSTRAINT "fk_sales_partners_country" FOREIGN KEY ("country_id") REFERENCES "reference"."countries"("country_id") ON DELETE SET NULL ON UPDATE CASCADE;--> statement-breakpoint
ALTER TABLE "sales"."partners" ADD CONSTRAINT "fk_sales_partners_state" FOREIGN KEY ("state_id") REFERENCES "reference"."states"("state_id") ON DELETE SET NULL ON UPDATE CASCADE;--> statement-breakpoint
ALTER TABLE "sales"."payment_term_lines" ADD CONSTRAINT "fk_sales_payment_term_lines_tenant" FOREIGN KEY ("tenant_id") REFERENCES "core"."tenants"("tenant_id") ON DELETE RESTRICT ON UPDATE CASCADE;--> statement-breakpoint
ALTER TABLE "sales"."payment_term_lines" ADD CONSTRAINT "fk_sales_payment_term_lines_term" FOREIGN KEY ("payment_term_id") REFERENCES "sales"."payment_terms"("id") ON DELETE CASCADE ON UPDATE CASCADE;--> statement-breakpoint
ALTER TABLE "sales"."payment_terms" ADD CONSTRAINT "fk_sales_payment_terms_tenant" FOREIGN KEY ("tenant_id") REFERENCES "core"."tenants"("tenant_id") ON DELETE RESTRICT ON UPDATE CASCADE;--> statement-breakpoint
ALTER TABLE "sales"."pricelist_items" ADD CONSTRAINT "fk_sales_pricelist_items_tenant" FOREIGN KEY ("tenant_id") REFERENCES "core"."tenants"("tenant_id") ON DELETE RESTRICT ON UPDATE CASCADE;--> statement-breakpoint
ALTER TABLE "sales"."pricelist_items" ADD CONSTRAINT "fk_sales_pricelist_items_pricelist" FOREIGN KEY ("pricelist_id") REFERENCES "sales"."pricelists"("id") ON DELETE CASCADE ON UPDATE CASCADE;--> statement-breakpoint
ALTER TABLE "sales"."pricelist_items" ADD CONSTRAINT "fk_sales_pricelist_items_product" FOREIGN KEY ("product_id") REFERENCES "sales"."products"("id") ON DELETE SET NULL ON UPDATE CASCADE;--> statement-breakpoint
ALTER TABLE "sales"."pricelist_items" ADD CONSTRAINT "fk_sales_pricelist_items_category" FOREIGN KEY ("categ_id") REFERENCES "sales"."product_categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;--> statement-breakpoint
ALTER TABLE "sales"."pricelist_items" ADD CONSTRAINT "fk_sales_pricelist_items_base_pricelist" FOREIGN KEY ("base_pricelist_id") REFERENCES "sales"."pricelists"("id") ON DELETE SET NULL ON UPDATE CASCADE;--> statement-breakpoint
ALTER TABLE "sales"."pricelist_items" ADD CONSTRAINT "fk_sales_pricelist_items_superseded_by" FOREIGN KEY ("superseded_by") REFERENCES "sales"."pricelist_items"("id") ON DELETE SET NULL ON UPDATE CASCADE;--> statement-breakpoint
ALTER TABLE "sales"."pricelists" ADD CONSTRAINT "fk_sales_pricelists_tenant" FOREIGN KEY ("tenant_id") REFERENCES "core"."tenants"("tenant_id") ON DELETE RESTRICT ON UPDATE CASCADE;--> statement-breakpoint
ALTER TABLE "sales"."pricelists" ADD CONSTRAINT "fk_sales_pricelists_currency" FOREIGN KEY ("currency_id") REFERENCES "reference"."currencies"("currency_id") ON DELETE RESTRICT ON UPDATE CASCADE;--> statement-breakpoint
ALTER TABLE "sales"."product_attribute_values" ADD CONSTRAINT "fk_sales_product_attribute_values_tenant" FOREIGN KEY ("tenant_id") REFERENCES "core"."tenants"("tenant_id") ON DELETE RESTRICT ON UPDATE CASCADE;--> statement-breakpoint
ALTER TABLE "sales"."product_attribute_values" ADD CONSTRAINT "fk_sales_product_attribute_values_attribute" FOREIGN KEY ("attribute_id") REFERENCES "sales"."product_attributes"("id") ON DELETE CASCADE ON UPDATE CASCADE;--> statement-breakpoint
ALTER TABLE "sales"."product_attributes" ADD CONSTRAINT "fk_sales_product_attributes_tenant" FOREIGN KEY ("tenant_id") REFERENCES "core"."tenants"("tenant_id") ON DELETE RESTRICT ON UPDATE CASCADE;--> statement-breakpoint
ALTER TABLE "sales"."product_categories" ADD CONSTRAINT "fk_sales_product_categories_tenant" FOREIGN KEY ("tenant_id") REFERENCES "core"."tenants"("tenant_id") ON DELETE RESTRICT ON UPDATE CASCADE;--> statement-breakpoint
ALTER TABLE "sales"."product_categories" ADD CONSTRAINT "fk_sales_product_categories_parent" FOREIGN KEY ("parent_id") REFERENCES "sales"."product_categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;--> statement-breakpoint
ALTER TABLE "sales"."product_packaging" ADD CONSTRAINT "fk_sales_product_packaging_tenant" FOREIGN KEY ("tenant_id") REFERENCES "core"."tenants"("tenant_id") ON DELETE RESTRICT ON UPDATE CASCADE;--> statement-breakpoint
ALTER TABLE "sales"."product_packaging" ADD CONSTRAINT "fk_sales_product_packaging_variant" FOREIGN KEY ("variant_id") REFERENCES "sales"."product_variants"("id") ON DELETE CASCADE ON UPDATE CASCADE;--> statement-breakpoint
ALTER TABLE "sales"."product_template_attribute_lines" ADD CONSTRAINT "fk_sales_ptmpl_attr_lines_tenant" FOREIGN KEY ("tenant_id") REFERENCES "core"."tenants"("tenant_id") ON DELETE RESTRICT ON UPDATE CASCADE;--> statement-breakpoint
ALTER TABLE "sales"."product_template_attribute_lines" ADD CONSTRAINT "fk_sales_ptmpl_attr_lines_template" FOREIGN KEY ("template_id") REFERENCES "sales"."product_templates"("id") ON DELETE CASCADE ON UPDATE CASCADE;--> statement-breakpoint
ALTER TABLE "sales"."product_template_attribute_lines" ADD CONSTRAINT "fk_sales_ptmpl_attr_lines_attribute" FOREIGN KEY ("attribute_id") REFERENCES "sales"."product_attributes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;--> statement-breakpoint
ALTER TABLE "sales"."product_template_attribute_values" ADD CONSTRAINT "fk_sales_ptmpl_attr_vals_tenant" FOREIGN KEY ("tenant_id") REFERENCES "core"."tenants"("tenant_id") ON DELETE RESTRICT ON UPDATE CASCADE;--> statement-breakpoint
ALTER TABLE "sales"."product_template_attribute_values" ADD CONSTRAINT "fk_sales_ptmpl_attr_vals_line" FOREIGN KEY ("template_attribute_line_id") REFERENCES "sales"."product_template_attribute_lines"("id") ON DELETE CASCADE ON UPDATE CASCADE;--> statement-breakpoint
ALTER TABLE "sales"."product_template_attribute_values" ADD CONSTRAINT "fk_sales_ptmpl_attr_vals_attr_val" FOREIGN KEY ("attribute_value_id") REFERENCES "sales"."product_attribute_values"("id") ON DELETE RESTRICT ON UPDATE CASCADE;--> statement-breakpoint
ALTER TABLE "sales"."product_templates" ADD CONSTRAINT "fk_sales_product_templates_tenant" FOREIGN KEY ("tenant_id") REFERENCES "core"."tenants"("tenant_id") ON DELETE RESTRICT ON UPDATE CASCADE;--> statement-breakpoint
ALTER TABLE "sales"."product_templates" ADD CONSTRAINT "fk_sales_product_templates_category" FOREIGN KEY ("category_id") REFERENCES "sales"."product_categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;--> statement-breakpoint
ALTER TABLE "sales"."product_templates" ADD CONSTRAINT "fk_sales_product_templates_uom" FOREIGN KEY ("uom_id") REFERENCES "reference"."units_of_measure"("uom_id") ON DELETE RESTRICT ON UPDATE CASCADE;--> statement-breakpoint
ALTER TABLE "sales"."product_templates" ADD CONSTRAINT "fk_sales_product_templates_uom_po" FOREIGN KEY ("uom_po_id") REFERENCES "reference"."units_of_measure"("uom_id") ON DELETE RESTRICT ON UPDATE CASCADE;--> statement-breakpoint
ALTER TABLE "sales"."product_variants" ADD CONSTRAINT "fk_sales_product_variants_tenant" FOREIGN KEY ("tenant_id") REFERENCES "core"."tenants"("tenant_id") ON DELETE RESTRICT ON UPDATE CASCADE;--> statement-breakpoint
ALTER TABLE "sales"."product_variants" ADD CONSTRAINT "fk_sales_product_variants_template" FOREIGN KEY ("template_id") REFERENCES "sales"."product_templates"("id") ON DELETE RESTRICT ON UPDATE CASCADE;--> statement-breakpoint
ALTER TABLE "sales"."products" ADD CONSTRAINT "fk_sales_products_tenant" FOREIGN KEY ("tenant_id") REFERENCES "core"."tenants"("tenant_id") ON DELETE RESTRICT ON UPDATE CASCADE;--> statement-breakpoint
ALTER TABLE "sales"."products" ADD CONSTRAINT "fk_sales_products_category" FOREIGN KEY ("category_id") REFERENCES "sales"."product_categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;--> statement-breakpoint
ALTER TABLE "sales"."return_order_lines" ADD CONSTRAINT "fk_sales_return_order_lines_tenant" FOREIGN KEY ("tenant_id") REFERENCES "core"."tenants"("tenant_id") ON DELETE RESTRICT ON UPDATE CASCADE;--> statement-breakpoint
ALTER TABLE "sales"."return_order_lines" ADD CONSTRAINT "fk_sales_return_order_lines_return_order" FOREIGN KEY ("return_order_id") REFERENCES "sales"."return_orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;--> statement-breakpoint
ALTER TABLE "sales"."return_order_lines" ADD CONSTRAINT "fk_sales_return_order_lines_source_line" FOREIGN KEY ("source_line_id") REFERENCES "sales"."sales_order_lines"("id") ON DELETE SET NULL ON UPDATE CASCADE;--> statement-breakpoint
ALTER TABLE "sales"."return_order_lines" ADD CONSTRAINT "fk_sales_return_order_lines_product" FOREIGN KEY ("product_id") REFERENCES "sales"."products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;--> statement-breakpoint
ALTER TABLE "sales"."return_orders" ADD CONSTRAINT "fk_sales_return_orders_tenant" FOREIGN KEY ("tenant_id") REFERENCES "core"."tenants"("tenant_id") ON DELETE RESTRICT ON UPDATE CASCADE;--> statement-breakpoint
ALTER TABLE "sales"."return_orders" ADD CONSTRAINT "fk_sales_return_orders_source_order" FOREIGN KEY ("source_order_id") REFERENCES "sales"."sales_orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;--> statement-breakpoint
ALTER TABLE "sales"."return_orders" ADD CONSTRAINT "fk_sales_return_orders_partner" FOREIGN KEY ("partner_id") REFERENCES "sales"."partners"("id") ON DELETE RESTRICT ON UPDATE CASCADE;--> statement-breakpoint
ALTER TABLE "sales"."return_orders" ADD CONSTRAINT "fk_sales_return_orders_reason_code" FOREIGN KEY ("reason_code_id") REFERENCES "sales"."return_reason_codes"("id") ON DELETE SET NULL ON UPDATE CASCADE;--> statement-breakpoint
ALTER TABLE "sales"."return_orders" ADD CONSTRAINT "fk_sales_return_orders_approved_by" FOREIGN KEY ("approved_by") REFERENCES "security"."users"("userId") ON DELETE SET NULL ON UPDATE CASCADE;--> statement-breakpoint
ALTER TABLE "sales"."return_reason_codes" ADD CONSTRAINT "fk_sales_return_reason_codes_tenant" FOREIGN KEY ("tenant_id") REFERENCES "core"."tenants"("tenant_id") ON DELETE RESTRICT ON UPDATE CASCADE;--> statement-breakpoint
ALTER TABLE "sales"."rounding_policies" ADD CONSTRAINT "fk_sales_rounding_policies_tenant" FOREIGN KEY ("tenant_id") REFERENCES "core"."tenants"("tenant_id") ON DELETE RESTRICT ON UPDATE CASCADE;--> statement-breakpoint
ALTER TABLE "sales"."sale_order_line_taxes" ADD CONSTRAINT "fk_sales_sale_order_line_taxes_tenant" FOREIGN KEY ("tenant_id") REFERENCES "core"."tenants"("tenant_id") ON DELETE RESTRICT ON UPDATE CASCADE;--> statement-breakpoint
ALTER TABLE "sales"."sale_order_line_taxes" ADD CONSTRAINT "fk_sales_sale_order_line_taxes_line" FOREIGN KEY ("order_line_id") REFERENCES "sales"."sales_order_lines"("id") ON DELETE CASCADE ON UPDATE CASCADE;--> statement-breakpoint
ALTER TABLE "sales"."sale_order_line_taxes" ADD CONSTRAINT "fk_sales_sale_order_line_taxes_tax" FOREIGN KEY ("tax_id") REFERENCES "sales"."tax_rates"("id") ON DELETE RESTRICT ON UPDATE CASCADE;--> statement-breakpoint
ALTER TABLE "sales"."sale_order_option_lines" ADD CONSTRAINT "fk_sales_sale_order_option_lines_tenant" FOREIGN KEY ("tenant_id") REFERENCES "core"."tenants"("tenant_id") ON DELETE RESTRICT ON UPDATE CASCADE;--> statement-breakpoint
ALTER TABLE "sales"."sale_order_option_lines" ADD CONSTRAINT "fk_sales_sale_order_option_lines_order" FOREIGN KEY ("order_id") REFERENCES "sales"."sales_orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;--> statement-breakpoint
ALTER TABLE "sales"."sale_order_option_lines" ADD CONSTRAINT "fk_sales_sale_order_option_lines_product" FOREIGN KEY ("product_id") REFERENCES "sales"."products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;--> statement-breakpoint
ALTER TABLE "sales"."sale_order_option_lines" ADD CONSTRAINT "fk_sales_sale_order_option_lines_uom" FOREIGN KEY ("uom_id") REFERENCES "reference"."units_of_measure"("uom_id") ON DELETE RESTRICT ON UPDATE CASCADE;--> statement-breakpoint
ALTER TABLE "sales"."sale_order_status_history" ADD CONSTRAINT "fk_sales_sale_order_status_history_tenant" FOREIGN KEY ("tenant_id") REFERENCES "core"."tenants"("tenant_id") ON DELETE RESTRICT ON UPDATE CASCADE;--> statement-breakpoint
ALTER TABLE "sales"."sale_order_status_history" ADD CONSTRAINT "fk_sales_sale_order_status_history_order" FOREIGN KEY ("order_id") REFERENCES "sales"."sales_orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;--> statement-breakpoint
ALTER TABLE "sales"."sale_order_status_history" ADD CONSTRAINT "fk_sales_sale_order_status_history_changed_by" FOREIGN KEY ("changed_by") REFERENCES "security"."users"("userId") ON DELETE SET NULL ON UPDATE CASCADE;--> statement-breakpoint
ALTER TABLE "sales"."sale_order_tax_summary" ADD CONSTRAINT "fk_sales_sale_order_tax_summary_tenant" FOREIGN KEY ("tenant_id") REFERENCES "core"."tenants"("tenant_id") ON DELETE RESTRICT ON UPDATE CASCADE;--> statement-breakpoint
ALTER TABLE "sales"."sale_order_tax_summary" ADD CONSTRAINT "fk_sales_sale_order_tax_summary_order" FOREIGN KEY ("order_id") REFERENCES "sales"."sales_orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;--> statement-breakpoint
ALTER TABLE "sales"."sale_order_tax_summary" ADD CONSTRAINT "fk_sales_sale_order_tax_summary_tax" FOREIGN KEY ("tax_id") REFERENCES "sales"."tax_rates"("id") ON DELETE RESTRICT ON UPDATE CASCADE;--> statement-breakpoint
ALTER TABLE "sales"."sale_order_tax_summary" ADD CONSTRAINT "fk_sales_sale_order_tax_summary_tax_group" FOREIGN KEY ("tax_group_id") REFERENCES "sales"."tax_groups"("id") ON DELETE SET NULL ON UPDATE CASCADE;--> statement-breakpoint
ALTER TABLE "sales"."document_attachments" ADD CONSTRAINT "fk_sales_document_attachments_tenant" FOREIGN KEY ("tenant_id") REFERENCES "core"."tenants"("tenant_id") ON DELETE RESTRICT ON UPDATE CASCADE;--> statement-breakpoint
ALTER TABLE "sales"."sales_order_lines" ADD CONSTRAINT "fk_sales_order_lines_tenant" FOREIGN KEY ("tenant_id") REFERENCES "core"."tenants"("tenant_id") ON DELETE RESTRICT ON UPDATE CASCADE;--> statement-breakpoint
ALTER TABLE "sales"."sales_order_lines" ADD CONSTRAINT "fk_sales_order_lines_order" FOREIGN KEY ("order_id") REFERENCES "sales"."sales_orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;--> statement-breakpoint
ALTER TABLE "sales"."sales_order_lines" ADD CONSTRAINT "fk_sales_order_lines_product" FOREIGN KEY ("product_id") REFERENCES "sales"."products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;--> statement-breakpoint
ALTER TABLE "sales"."sales_order_lines" ADD CONSTRAINT "fk_sales_order_lines_product_template" FOREIGN KEY ("product_template_id") REFERENCES "sales"."product_templates"("id") ON DELETE SET NULL ON UPDATE CASCADE;--> statement-breakpoint
ALTER TABLE "sales"."sales_order_lines" ADD CONSTRAINT "fk_sales_order_lines_product_uom" FOREIGN KEY ("product_uom_id") REFERENCES "reference"."units_of_measure"("uom_id") ON DELETE SET NULL ON UPDATE CASCADE;--> statement-breakpoint
ALTER TABLE "sales"."sales_order_lines" ADD CONSTRAINT "fk_sales_order_lines_discount_authority_user" FOREIGN KEY ("discount_authority_user_id") REFERENCES "security"."users"("userId") ON DELETE SET NULL ON UPDATE CASCADE;--> statement-breakpoint
ALTER TABLE "sales"."sales_order_lines" ADD CONSTRAINT "fk_sales_order_lines_price_approved_by" FOREIGN KEY ("price_approved_by") REFERENCES "security"."users"("userId") ON DELETE SET NULL ON UPDATE CASCADE;--> statement-breakpoint
ALTER TABLE "sales"."sales_orders" ADD CONSTRAINT "fk_sales_orders_tenant" FOREIGN KEY ("tenant_id") REFERENCES "core"."tenants"("tenant_id") ON DELETE RESTRICT ON UPDATE CASCADE;--> statement-breakpoint
ALTER TABLE "sales"."sales_orders" ADD CONSTRAINT "fk_sales_orders_partner" FOREIGN KEY ("partner_id") REFERENCES "sales"."partners"("id") ON DELETE RESTRICT ON UPDATE CASCADE;--> statement-breakpoint
ALTER TABLE "sales"."sales_orders" ADD CONSTRAINT "fk_sales_orders_confirmed_by" FOREIGN KEY ("confirmed_by") REFERENCES "security"."users"("userId") ON DELETE SET NULL ON UPDATE CASCADE;--> statement-breakpoint
ALTER TABLE "sales"."sales_orders" ADD CONSTRAINT "fk_sales_orders_user" FOREIGN KEY ("user_id") REFERENCES "security"."users"("userId") ON DELETE SET NULL ON UPDATE CASCADE;--> statement-breakpoint
ALTER TABLE "sales"."sales_orders" ADD CONSTRAINT "fk_sales_orders_currency" FOREIGN KEY ("currency_id") REFERENCES "reference"."currencies"("currency_id") ON DELETE SET NULL ON UPDATE CASCADE;--> statement-breakpoint
ALTER TABLE "sales"."sales_orders" ADD CONSTRAINT "fk_sales_orders_pricelist_snapshot" FOREIGN KEY ("pricelist_snapshot_id") REFERENCES "sales"."pricelists"("id") ON DELETE SET NULL ON UPDATE CASCADE;--> statement-breakpoint
ALTER TABLE "sales"."sales_orders" ADD CONSTRAINT "fk_sales_orders_credit_check_by" FOREIGN KEY ("credit_check_by") REFERENCES "security"."users"("userId") ON DELETE SET NULL ON UPDATE CASCADE;--> statement-breakpoint
ALTER TABLE "sales"."sales_orders" ADD CONSTRAINT "fk_sales_orders_invoice_address" FOREIGN KEY ("invoice_address_id") REFERENCES "sales"."partner_addresses"("id") ON DELETE SET NULL ON UPDATE CASCADE;--> statement-breakpoint
ALTER TABLE "sales"."sales_orders" ADD CONSTRAINT "fk_sales_orders_delivery_address" FOREIGN KEY ("delivery_address_id") REFERENCES "sales"."partner_addresses"("id") ON DELETE SET NULL ON UPDATE CASCADE;--> statement-breakpoint
ALTER TABLE "sales"."sales_team_members" ADD CONSTRAINT "fk_sales_sales_team_members_tenant" FOREIGN KEY ("tenant_id") REFERENCES "core"."tenants"("tenant_id") ON DELETE RESTRICT ON UPDATE CASCADE;--> statement-breakpoint
ALTER TABLE "sales"."sales_team_members" ADD CONSTRAINT "fk_sales_sales_team_members_team" FOREIGN KEY ("team_id") REFERENCES "sales"."sales_teams"("id") ON DELETE CASCADE ON UPDATE CASCADE;--> statement-breakpoint
ALTER TABLE "sales"."sales_team_members" ADD CONSTRAINT "fk_sales_sales_team_members_user" FOREIGN KEY ("user_id") REFERENCES "security"."users"("userId") ON DELETE RESTRICT ON UPDATE CASCADE;--> statement-breakpoint
ALTER TABLE "sales"."sales_teams" ADD CONSTRAINT "fk_sales_sales_teams_tenant" FOREIGN KEY ("tenant_id") REFERENCES "core"."tenants"("tenant_id") ON DELETE RESTRICT ON UPDATE CASCADE;--> statement-breakpoint
ALTER TABLE "sales"."sales_teams" ADD CONSTRAINT "fk_sales_sales_teams_manager" FOREIGN KEY ("manager_id") REFERENCES "security"."users"("userId") ON DELETE SET NULL ON UPDATE CASCADE;--> statement-breakpoint
ALTER TABLE "sales"."subscription_close_reasons" ADD CONSTRAINT "fk_sales_subscription_close_reasons_tenant" FOREIGN KEY ("tenant_id") REFERENCES "core"."tenants"("tenant_id") ON DELETE RESTRICT ON UPDATE CASCADE;--> statement-breakpoint
ALTER TABLE "sales"."subscription_lines" ADD CONSTRAINT "fk_sales_subscription_lines_tenant" FOREIGN KEY ("tenant_id") REFERENCES "core"."tenants"("tenant_id") ON DELETE RESTRICT ON UPDATE CASCADE;--> statement-breakpoint
ALTER TABLE "sales"."subscription_lines" ADD CONSTRAINT "fk_sales_subscription_lines_subscription" FOREIGN KEY ("subscription_id") REFERENCES "sales"."subscriptions"("id") ON DELETE CASCADE ON UPDATE CASCADE;--> statement-breakpoint
ALTER TABLE "sales"."subscription_lines" ADD CONSTRAINT "fk_sales_subscription_lines_product" FOREIGN KEY ("product_id") REFERENCES "sales"."products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;--> statement-breakpoint
ALTER TABLE "sales"."subscription_lines" ADD CONSTRAINT "fk_sales_subscription_lines_uom" FOREIGN KEY ("uom_id") REFERENCES "reference"."units_of_measure"("uom_id") ON DELETE RESTRICT ON UPDATE CASCADE;--> statement-breakpoint
ALTER TABLE "sales"."subscription_logs" ADD CONSTRAINT "fk_sales_subscription_logs_tenant" FOREIGN KEY ("tenant_id") REFERENCES "core"."tenants"("tenant_id") ON DELETE RESTRICT ON UPDATE CASCADE;--> statement-breakpoint
ALTER TABLE "sales"."subscription_logs" ADD CONSTRAINT "fk_sales_subscription_logs_subscription" FOREIGN KEY ("subscription_id") REFERENCES "sales"."subscriptions"("id") ON DELETE CASCADE ON UPDATE CASCADE;--> statement-breakpoint
ALTER TABLE "sales"."subscription_logs" ADD CONSTRAINT "fk_sales_subscription_logs_actor" FOREIGN KEY ("actor_id") REFERENCES "security"."users"("userId") ON DELETE SET NULL ON UPDATE CASCADE;--> statement-breakpoint
ALTER TABLE "sales"."subscription_templates" ADD CONSTRAINT "fk_sales_subscription_templates_tenant" FOREIGN KEY ("tenant_id") REFERENCES "core"."tenants"("tenant_id") ON DELETE RESTRICT ON UPDATE CASCADE;--> statement-breakpoint
ALTER TABLE "sales"."subscription_templates" ADD CONSTRAINT "fk_sales_subscription_templates_payment_term" FOREIGN KEY ("payment_term_id") REFERENCES "sales"."payment_terms"("id") ON DELETE SET NULL ON UPDATE CASCADE;--> statement-breakpoint
ALTER TABLE "sales"."subscription_templates" ADD CONSTRAINT "fk_sales_subscription_templates_pricelist" FOREIGN KEY ("pricelist_id") REFERENCES "sales"."pricelists"("id") ON DELETE SET NULL ON UPDATE CASCADE;--> statement-breakpoint
ALTER TABLE "sales"."subscriptions" ADD CONSTRAINT "fk_sales_subscriptions_tenant" FOREIGN KEY ("tenant_id") REFERENCES "core"."tenants"("tenant_id") ON DELETE RESTRICT ON UPDATE CASCADE;--> statement-breakpoint
ALTER TABLE "sales"."subscriptions" ADD CONSTRAINT "fk_sales_subscriptions_partner" FOREIGN KEY ("partner_id") REFERENCES "sales"."partners"("id") ON DELETE RESTRICT ON UPDATE CASCADE;--> statement-breakpoint
ALTER TABLE "sales"."subscriptions" ADD CONSTRAINT "fk_sales_subscriptions_template" FOREIGN KEY ("template_id") REFERENCES "sales"."subscription_templates"("id") ON DELETE RESTRICT ON UPDATE CASCADE;--> statement-breakpoint
ALTER TABLE "sales"."subscriptions" ADD CONSTRAINT "fk_sales_subscriptions_close_reason" FOREIGN KEY ("close_reason_id") REFERENCES "sales"."subscription_close_reasons"("id") ON DELETE SET NULL ON UPDATE CASCADE;--> statement-breakpoint
ALTER TABLE "sales"."tax_groups" ADD CONSTRAINT "fk_sales_tax_groups_tenant" FOREIGN KEY ("tenant_id") REFERENCES "core"."tenants"("tenant_id") ON DELETE RESTRICT ON UPDATE CASCADE;--> statement-breakpoint
ALTER TABLE "sales"."tax_groups" ADD CONSTRAINT "fk_sales_tax_groups_country" FOREIGN KEY ("country_id") REFERENCES "reference"."countries"("country_id") ON DELETE SET NULL ON UPDATE CASCADE;--> statement-breakpoint
ALTER TABLE "sales"."tax_rate_children" ADD CONSTRAINT "fk_sales_tax_rate_children_tenant" FOREIGN KEY ("tenant_id") REFERENCES "core"."tenants"("tenant_id") ON DELETE RESTRICT ON UPDATE CASCADE;--> statement-breakpoint
ALTER TABLE "sales"."tax_rate_children" ADD CONSTRAINT "fk_sales_tax_rate_children_parent" FOREIGN KEY ("parent_tax_id") REFERENCES "sales"."tax_rates"("id") ON DELETE CASCADE ON UPDATE CASCADE;--> statement-breakpoint
ALTER TABLE "sales"."tax_rate_children" ADD CONSTRAINT "fk_sales_tax_rate_children_child" FOREIGN KEY ("child_tax_id") REFERENCES "sales"."tax_rates"("id") ON DELETE RESTRICT ON UPDATE CASCADE;--> statement-breakpoint
ALTER TABLE "sales"."tax_rates" ADD CONSTRAINT "fk_sales_tax_rates_tenant" FOREIGN KEY ("tenant_id") REFERENCES "core"."tenants"("tenant_id") ON DELETE RESTRICT ON UPDATE CASCADE;--> statement-breakpoint
ALTER TABLE "sales"."tax_rates" ADD CONSTRAINT "fk_sales_tax_rates_group" FOREIGN KEY ("tax_group_id") REFERENCES "sales"."tax_groups"("id") ON DELETE SET NULL ON UPDATE CASCADE;--> statement-breakpoint
ALTER TABLE "sales"."tax_rates" ADD CONSTRAINT "fk_sales_tax_rates_country" FOREIGN KEY ("country_id") REFERENCES "reference"."countries"("country_id") ON DELETE SET NULL ON UPDATE CASCADE;--> statement-breakpoint
ALTER TABLE "sales"."tax_rates" ADD CONSTRAINT "fk_sales_tax_rates_replaced_by" FOREIGN KEY ("replaced_by") REFERENCES "sales"."tax_rates"("id") ON DELETE SET NULL ON UPDATE CASCADE;--> statement-breakpoint
ALTER TABLE "sales"."territories" ADD CONSTRAINT "fk_sales_territories_tenant" FOREIGN KEY ("tenant_id") REFERENCES "core"."tenants"("tenant_id") ON DELETE RESTRICT ON UPDATE CASCADE;--> statement-breakpoint
ALTER TABLE "sales"."territories" ADD CONSTRAINT "fk_sales_territories_parent" FOREIGN KEY ("parent_id") REFERENCES "sales"."territories"("id") ON DELETE SET NULL ON UPDATE CASCADE;--> statement-breakpoint
ALTER TABLE "sales"."territories" ADD CONSTRAINT "fk_sales_territories_default_salesperson" FOREIGN KEY ("default_salesperson_id") REFERENCES "security"."users"("userId") ON DELETE SET NULL ON UPDATE CASCADE;--> statement-breakpoint
ALTER TABLE "sales"."territories" ADD CONSTRAINT "fk_sales_territories_team" FOREIGN KEY ("team_id") REFERENCES "sales"."sales_teams"("id") ON DELETE SET NULL ON UPDATE CASCADE;--> statement-breakpoint
ALTER TABLE "sales"."territory_rules" ADD CONSTRAINT "fk_sales_territory_rules_tenant" FOREIGN KEY ("tenant_id") REFERENCES "core"."tenants"("tenant_id") ON DELETE RESTRICT ON UPDATE CASCADE;--> statement-breakpoint
ALTER TABLE "sales"."territory_rules" ADD CONSTRAINT "fk_sales_territory_rules_territory" FOREIGN KEY ("territory_id") REFERENCES "sales"."territories"("id") ON DELETE CASCADE ON UPDATE CASCADE;--> statement-breakpoint
ALTER TABLE "sales"."territory_rules" ADD CONSTRAINT "fk_sales_territory_rules_country" FOREIGN KEY ("country_id") REFERENCES "reference"."countries"("country_id") ON DELETE SET NULL ON UPDATE CASCADE;--> statement-breakpoint
ALTER TABLE "sales"."territory_rules" ADD CONSTRAINT "fk_sales_territory_rules_state" FOREIGN KEY ("state_id") REFERENCES "reference"."states"("state_id") ON DELETE SET NULL ON UPDATE CASCADE;--> statement-breakpoint
CREATE POLICY "reference_approval_logs_tenant_select" ON "reference"."approval_logs" AS PERMISSIVE FOR SELECT TO "app_user" USING ("tenant_id" = NULLIF(current_setting('afenda.tenant_id', true), '')::int);--> statement-breakpoint
CREATE POLICY "reference_approval_logs_tenant_insert" ON "reference"."approval_logs" AS PERMISSIVE FOR INSERT TO "app_user" WITH CHECK ("tenant_id" = NULLIF(current_setting('afenda.tenant_id', true), '')::int);--> statement-breakpoint
CREATE POLICY "reference_approval_logs_tenant_update" ON "reference"."approval_logs" AS PERMISSIVE FOR UPDATE TO "app_user" USING ("tenant_id" = NULLIF(current_setting('afenda.tenant_id', true), '')::int) WITH CHECK ("tenant_id" = NULLIF(current_setting('afenda.tenant_id', true), '')::int);--> statement-breakpoint
CREATE POLICY "reference_approval_logs_tenant_delete" ON "reference"."approval_logs" AS PERMISSIVE FOR DELETE TO "app_user" USING ("tenant_id" = NULLIF(current_setting('afenda.tenant_id', true), '')::int);--> statement-breakpoint
CREATE POLICY "reference_approval_logs_service_bypass" ON "reference"."approval_logs" AS PERMISSIVE FOR ALL TO "service_role" USING (true) WITH CHECK (true);--> statement-breakpoint
CREATE POLICY "reference_document_attachments_tenant_select" ON "reference"."document_attachments" AS PERMISSIVE FOR SELECT TO "app_user" USING ("tenant_id" = NULLIF(current_setting('afenda.tenant_id', true), '')::int);--> statement-breakpoint
CREATE POLICY "reference_document_attachments_tenant_insert" ON "reference"."document_attachments" AS PERMISSIVE FOR INSERT TO "app_user" WITH CHECK ("tenant_id" = NULLIF(current_setting('afenda.tenant_id', true), '')::int);--> statement-breakpoint
CREATE POLICY "reference_document_attachments_tenant_update" ON "reference"."document_attachments" AS PERMISSIVE FOR UPDATE TO "app_user" USING ("tenant_id" = NULLIF(current_setting('afenda.tenant_id', true), '')::int) WITH CHECK ("tenant_id" = NULLIF(current_setting('afenda.tenant_id', true), '')::int);--> statement-breakpoint
CREATE POLICY "reference_document_attachments_tenant_delete" ON "reference"."document_attachments" AS PERMISSIVE FOR DELETE TO "app_user" USING ("tenant_id" = NULLIF(current_setting('afenda.tenant_id', true), '')::int);--> statement-breakpoint
CREATE POLICY "reference_document_attachments_service_bypass" ON "reference"."document_attachments" AS PERMISSIVE FOR ALL TO "service_role" USING (true) WITH CHECK (true);--> statement-breakpoint
CREATE POLICY "reference_sequences_tenant_select" ON "reference"."sequences" AS PERMISSIVE FOR SELECT TO "app_user" USING ("tenant_id" = NULLIF(current_setting('afenda.tenant_id', true), '')::int);--> statement-breakpoint
CREATE POLICY "reference_sequences_tenant_insert" ON "reference"."sequences" AS PERMISSIVE FOR INSERT TO "app_user" WITH CHECK ("tenant_id" = NULLIF(current_setting('afenda.tenant_id', true), '')::int);--> statement-breakpoint
CREATE POLICY "reference_sequences_tenant_update" ON "reference"."sequences" AS PERMISSIVE FOR UPDATE TO "app_user" USING ("tenant_id" = NULLIF(current_setting('afenda.tenant_id', true), '')::int) WITH CHECK ("tenant_id" = NULLIF(current_setting('afenda.tenant_id', true), '')::int);--> statement-breakpoint
CREATE POLICY "reference_sequences_tenant_delete" ON "reference"."sequences" AS PERMISSIVE FOR DELETE TO "app_user" USING ("tenant_id" = NULLIF(current_setting('afenda.tenant_id', true), '')::int);--> statement-breakpoint
CREATE POLICY "reference_sequences_service_bypass" ON "reference"."sequences" AS PERMISSIVE FOR ALL TO "service_role" USING (true) WITH CHECK (true);--> statement-breakpoint
CREATE POLICY "users_tenant_select" ON "security"."users" AS PERMISSIVE FOR SELECT TO "app_user" USING ("tenant_id" = NULLIF(current_setting('afenda.tenant_id', true), '')::int);--> statement-breakpoint
CREATE POLICY "users_tenant_insert" ON "security"."users" AS PERMISSIVE FOR INSERT TO "app_user" WITH CHECK ("tenant_id" = NULLIF(current_setting('afenda.tenant_id', true), '')::int);--> statement-breakpoint
CREATE POLICY "users_tenant_update" ON "security"."users" AS PERMISSIVE FOR UPDATE TO "app_user" USING ("tenant_id" = NULLIF(current_setting('afenda.tenant_id', true), '')::int) WITH CHECK ("tenant_id" = NULLIF(current_setting('afenda.tenant_id', true), '')::int);--> statement-breakpoint
CREATE POLICY "users_tenant_delete" ON "security"."users" AS PERMISSIVE FOR DELETE TO "app_user" USING ("tenant_id" = NULLIF(current_setting('afenda.tenant_id', true), '')::int);--> statement-breakpoint
CREATE POLICY "users_service_bypass" ON "security"."users" AS PERMISSIVE FOR ALL TO "service_role" USING (true) WITH CHECK (true);--> statement-breakpoint
CREATE POLICY "sales_accounting_postings_tenant_select" ON "sales"."accounting_postings" AS PERMISSIVE FOR SELECT TO "app_user" USING ("tenant_id" = NULLIF(current_setting('afenda.tenant_id', true), '')::int);--> statement-breakpoint
CREATE POLICY "sales_accounting_postings_tenant_insert" ON "sales"."accounting_postings" AS PERMISSIVE FOR INSERT TO "app_user" WITH CHECK ("tenant_id" = NULLIF(current_setting('afenda.tenant_id', true), '')::int);--> statement-breakpoint
CREATE POLICY "sales_accounting_postings_tenant_update" ON "sales"."accounting_postings" AS PERMISSIVE FOR UPDATE TO "app_user" USING ("tenant_id" = NULLIF(current_setting('afenda.tenant_id', true), '')::int) WITH CHECK ("tenant_id" = NULLIF(current_setting('afenda.tenant_id', true), '')::int);--> statement-breakpoint
CREATE POLICY "sales_accounting_postings_tenant_delete" ON "sales"."accounting_postings" AS PERMISSIVE FOR DELETE TO "app_user" USING ("tenant_id" = NULLIF(current_setting('afenda.tenant_id', true), '')::int);--> statement-breakpoint
CREATE POLICY "sales_accounting_postings_service_bypass" ON "sales"."accounting_postings" AS PERMISSIVE FOR ALL TO "service_role" USING (true) WITH CHECK (true);--> statement-breakpoint
CREATE POLICY "sales_commission_entries_tenant_select" ON "sales"."commission_entries" AS PERMISSIVE FOR SELECT TO "app_user" USING ("tenant_id" = NULLIF(current_setting('afenda.tenant_id', true), '')::int);--> statement-breakpoint
CREATE POLICY "sales_commission_entries_tenant_insert" ON "sales"."commission_entries" AS PERMISSIVE FOR INSERT TO "app_user" WITH CHECK ("tenant_id" = NULLIF(current_setting('afenda.tenant_id', true), '')::int);--> statement-breakpoint
CREATE POLICY "sales_commission_entries_tenant_update" ON "sales"."commission_entries" AS PERMISSIVE FOR UPDATE TO "app_user" USING ("tenant_id" = NULLIF(current_setting('afenda.tenant_id', true), '')::int) WITH CHECK ("tenant_id" = NULLIF(current_setting('afenda.tenant_id', true), '')::int);--> statement-breakpoint
CREATE POLICY "sales_commission_entries_tenant_delete" ON "sales"."commission_entries" AS PERMISSIVE FOR DELETE TO "app_user" USING ("tenant_id" = NULLIF(current_setting('afenda.tenant_id', true), '')::int);--> statement-breakpoint
CREATE POLICY "sales_commission_entries_service_bypass" ON "sales"."commission_entries" AS PERMISSIVE FOR ALL TO "service_role" USING (true) WITH CHECK (true);--> statement-breakpoint
CREATE POLICY "sales_commission_plan_tiers_tenant_select" ON "sales"."commission_plan_tiers" AS PERMISSIVE FOR SELECT TO "app_user" USING ("tenant_id" = NULLIF(current_setting('afenda.tenant_id', true), '')::int);--> statement-breakpoint
CREATE POLICY "sales_commission_plan_tiers_tenant_insert" ON "sales"."commission_plan_tiers" AS PERMISSIVE FOR INSERT TO "app_user" WITH CHECK ("tenant_id" = NULLIF(current_setting('afenda.tenant_id', true), '')::int);--> statement-breakpoint
CREATE POLICY "sales_commission_plan_tiers_tenant_update" ON "sales"."commission_plan_tiers" AS PERMISSIVE FOR UPDATE TO "app_user" USING ("tenant_id" = NULLIF(current_setting('afenda.tenant_id', true), '')::int) WITH CHECK ("tenant_id" = NULLIF(current_setting('afenda.tenant_id', true), '')::int);--> statement-breakpoint
CREATE POLICY "sales_commission_plan_tiers_tenant_delete" ON "sales"."commission_plan_tiers" AS PERMISSIVE FOR DELETE TO "app_user" USING ("tenant_id" = NULLIF(current_setting('afenda.tenant_id', true), '')::int);--> statement-breakpoint
CREATE POLICY "sales_commission_plan_tiers_service_bypass" ON "sales"."commission_plan_tiers" AS PERMISSIVE FOR ALL TO "service_role" USING (true) WITH CHECK (true);--> statement-breakpoint
CREATE POLICY "sales_commission_plans_tenant_select" ON "sales"."commission_plans" AS PERMISSIVE FOR SELECT TO "app_user" USING ("tenant_id" = NULLIF(current_setting('afenda.tenant_id', true), '')::int);--> statement-breakpoint
CREATE POLICY "sales_commission_plans_tenant_insert" ON "sales"."commission_plans" AS PERMISSIVE FOR INSERT TO "app_user" WITH CHECK ("tenant_id" = NULLIF(current_setting('afenda.tenant_id', true), '')::int);--> statement-breakpoint
CREATE POLICY "sales_commission_plans_tenant_update" ON "sales"."commission_plans" AS PERMISSIVE FOR UPDATE TO "app_user" USING ("tenant_id" = NULLIF(current_setting('afenda.tenant_id', true), '')::int) WITH CHECK ("tenant_id" = NULLIF(current_setting('afenda.tenant_id', true), '')::int);--> statement-breakpoint
CREATE POLICY "sales_commission_plans_tenant_delete" ON "sales"."commission_plans" AS PERMISSIVE FOR DELETE TO "app_user" USING ("tenant_id" = NULLIF(current_setting('afenda.tenant_id', true), '')::int);--> statement-breakpoint
CREATE POLICY "sales_commission_plans_service_bypass" ON "sales"."commission_plans" AS PERMISSIVE FOR ALL TO "service_role" USING (true) WITH CHECK (true);--> statement-breakpoint
CREATE POLICY "sales_consignment_agreement_lines_tenant_select" ON "sales"."consignment_agreement_lines" AS PERMISSIVE FOR SELECT TO "app_user" USING ("tenant_id" = NULLIF(current_setting('afenda.tenant_id', true), '')::int);--> statement-breakpoint
CREATE POLICY "sales_consignment_agreement_lines_tenant_insert" ON "sales"."consignment_agreement_lines" AS PERMISSIVE FOR INSERT TO "app_user" WITH CHECK ("tenant_id" = NULLIF(current_setting('afenda.tenant_id', true), '')::int);--> statement-breakpoint
CREATE POLICY "sales_consignment_agreement_lines_tenant_update" ON "sales"."consignment_agreement_lines" AS PERMISSIVE FOR UPDATE TO "app_user" USING ("tenant_id" = NULLIF(current_setting('afenda.tenant_id', true), '')::int) WITH CHECK ("tenant_id" = NULLIF(current_setting('afenda.tenant_id', true), '')::int);--> statement-breakpoint
CREATE POLICY "sales_consignment_agreement_lines_tenant_delete" ON "sales"."consignment_agreement_lines" AS PERMISSIVE FOR DELETE TO "app_user" USING ("tenant_id" = NULLIF(current_setting('afenda.tenant_id', true), '')::int);--> statement-breakpoint
CREATE POLICY "sales_consignment_agreement_lines_service_bypass" ON "sales"."consignment_agreement_lines" AS PERMISSIVE FOR ALL TO "service_role" USING (true) WITH CHECK (true);--> statement-breakpoint
CREATE POLICY "sales_consignment_agreements_tenant_select" ON "sales"."consignment_agreements" AS PERMISSIVE FOR SELECT TO "app_user" USING ("tenant_id" = NULLIF(current_setting('afenda.tenant_id', true), '')::int);--> statement-breakpoint
CREATE POLICY "sales_consignment_agreements_tenant_insert" ON "sales"."consignment_agreements" AS PERMISSIVE FOR INSERT TO "app_user" WITH CHECK ("tenant_id" = NULLIF(current_setting('afenda.tenant_id', true), '')::int);--> statement-breakpoint
CREATE POLICY "sales_consignment_agreements_tenant_update" ON "sales"."consignment_agreements" AS PERMISSIVE FOR UPDATE TO "app_user" USING ("tenant_id" = NULLIF(current_setting('afenda.tenant_id', true), '')::int) WITH CHECK ("tenant_id" = NULLIF(current_setting('afenda.tenant_id', true), '')::int);--> statement-breakpoint
CREATE POLICY "sales_consignment_agreements_tenant_delete" ON "sales"."consignment_agreements" AS PERMISSIVE FOR DELETE TO "app_user" USING ("tenant_id" = NULLIF(current_setting('afenda.tenant_id', true), '')::int);--> statement-breakpoint
CREATE POLICY "sales_consignment_agreements_service_bypass" ON "sales"."consignment_agreements" AS PERMISSIVE FOR ALL TO "service_role" USING (true) WITH CHECK (true);--> statement-breakpoint
CREATE POLICY "sales_consignment_stock_report_lines_tenant_select" ON "sales"."consignment_stock_report_lines" AS PERMISSIVE FOR SELECT TO "app_user" USING ("tenant_id" = NULLIF(current_setting('afenda.tenant_id', true), '')::int);--> statement-breakpoint
CREATE POLICY "sales_consignment_stock_report_lines_tenant_insert" ON "sales"."consignment_stock_report_lines" AS PERMISSIVE FOR INSERT TO "app_user" WITH CHECK ("tenant_id" = NULLIF(current_setting('afenda.tenant_id', true), '')::int);--> statement-breakpoint
CREATE POLICY "sales_consignment_stock_report_lines_tenant_update" ON "sales"."consignment_stock_report_lines" AS PERMISSIVE FOR UPDATE TO "app_user" USING ("tenant_id" = NULLIF(current_setting('afenda.tenant_id', true), '')::int) WITH CHECK ("tenant_id" = NULLIF(current_setting('afenda.tenant_id', true), '')::int);--> statement-breakpoint
CREATE POLICY "sales_consignment_stock_report_lines_tenant_delete" ON "sales"."consignment_stock_report_lines" AS PERMISSIVE FOR DELETE TO "app_user" USING ("tenant_id" = NULLIF(current_setting('afenda.tenant_id', true), '')::int);--> statement-breakpoint
CREATE POLICY "sales_consignment_stock_report_lines_service_bypass" ON "sales"."consignment_stock_report_lines" AS PERMISSIVE FOR ALL TO "service_role" USING (true) WITH CHECK (true);--> statement-breakpoint
CREATE POLICY "sales_consignment_stock_reports_tenant_select" ON "sales"."consignment_stock_reports" AS PERMISSIVE FOR SELECT TO "app_user" USING ("tenant_id" = NULLIF(current_setting('afenda.tenant_id', true), '')::int);--> statement-breakpoint
CREATE POLICY "sales_consignment_stock_reports_tenant_insert" ON "sales"."consignment_stock_reports" AS PERMISSIVE FOR INSERT TO "app_user" WITH CHECK ("tenant_id" = NULLIF(current_setting('afenda.tenant_id', true), '')::int);--> statement-breakpoint
CREATE POLICY "sales_consignment_stock_reports_tenant_update" ON "sales"."consignment_stock_reports" AS PERMISSIVE FOR UPDATE TO "app_user" USING ("tenant_id" = NULLIF(current_setting('afenda.tenant_id', true), '')::int) WITH CHECK ("tenant_id" = NULLIF(current_setting('afenda.tenant_id', true), '')::int);--> statement-breakpoint
CREATE POLICY "sales_consignment_stock_reports_tenant_delete" ON "sales"."consignment_stock_reports" AS PERMISSIVE FOR DELETE TO "app_user" USING ("tenant_id" = NULLIF(current_setting('afenda.tenant_id', true), '')::int);--> statement-breakpoint
CREATE POLICY "sales_consignment_stock_reports_service_bypass" ON "sales"."consignment_stock_reports" AS PERMISSIVE FOR ALL TO "service_role" USING (true) WITH CHECK (true);--> statement-breakpoint
CREATE POLICY "sales_document_approvals_tenant_select" ON "sales"."document_approvals" AS PERMISSIVE FOR SELECT TO "app_user" USING ("tenant_id" = NULLIF(current_setting('afenda.tenant_id', true), '')::int);--> statement-breakpoint
CREATE POLICY "sales_document_approvals_tenant_insert" ON "sales"."document_approvals" AS PERMISSIVE FOR INSERT TO "app_user" WITH CHECK ("tenant_id" = NULLIF(current_setting('afenda.tenant_id', true), '')::int);--> statement-breakpoint
CREATE POLICY "sales_document_approvals_tenant_update" ON "sales"."document_approvals" AS PERMISSIVE FOR UPDATE TO "app_user" USING ("tenant_id" = NULLIF(current_setting('afenda.tenant_id', true), '')::int) WITH CHECK ("tenant_id" = NULLIF(current_setting('afenda.tenant_id', true), '')::int);--> statement-breakpoint
CREATE POLICY "sales_document_approvals_tenant_delete" ON "sales"."document_approvals" AS PERMISSIVE FOR DELETE TO "app_user" USING ("tenant_id" = NULLIF(current_setting('afenda.tenant_id', true), '')::int);--> statement-breakpoint
CREATE POLICY "sales_document_approvals_service_bypass" ON "sales"."document_approvals" AS PERMISSIVE FOR ALL TO "service_role" USING (true) WITH CHECK (true);--> statement-breakpoint
CREATE POLICY "sales_document_status_history_tenant_select" ON "sales"."document_status_history" AS PERMISSIVE FOR SELECT TO "app_user" USING ("tenant_id" = NULLIF(current_setting('afenda.tenant_id', true), '')::int);--> statement-breakpoint
CREATE POLICY "sales_document_status_history_tenant_insert" ON "sales"."document_status_history" AS PERMISSIVE FOR INSERT TO "app_user" WITH CHECK ("tenant_id" = NULLIF(current_setting('afenda.tenant_id', true), '')::int);--> statement-breakpoint
CREATE POLICY "sales_document_status_history_tenant_update" ON "sales"."document_status_history" AS PERMISSIVE FOR UPDATE TO "app_user" USING ("tenant_id" = NULLIF(current_setting('afenda.tenant_id', true), '')::int) WITH CHECK ("tenant_id" = NULLIF(current_setting('afenda.tenant_id', true), '')::int);--> statement-breakpoint
CREATE POLICY "sales_document_status_history_tenant_delete" ON "sales"."document_status_history" AS PERMISSIVE FOR DELETE TO "app_user" USING ("tenant_id" = NULLIF(current_setting('afenda.tenant_id', true), '')::int);--> statement-breakpoint
CREATE POLICY "sales_document_status_history_service_bypass" ON "sales"."document_status_history" AS PERMISSIVE FOR ALL TO "service_role" USING (true) WITH CHECK (true);--> statement-breakpoint
CREATE POLICY "sales_domain_event_logs_tenant_select" ON "sales"."domain_event_logs" AS PERMISSIVE FOR SELECT TO "app_user" USING ("tenant_id" = NULLIF(current_setting('afenda.tenant_id', true), '')::int);--> statement-breakpoint
CREATE POLICY "sales_domain_event_logs_tenant_insert" ON "sales"."domain_event_logs" AS PERMISSIVE FOR INSERT TO "app_user" WITH CHECK ("tenant_id" = NULLIF(current_setting('afenda.tenant_id', true), '')::int);--> statement-breakpoint
CREATE POLICY "sales_domain_event_logs_tenant_update" ON "sales"."domain_event_logs" AS PERMISSIVE FOR UPDATE TO "app_user" USING ("tenant_id" = NULLIF(current_setting('afenda.tenant_id', true), '')::int) WITH CHECK ("tenant_id" = NULLIF(current_setting('afenda.tenant_id', true), '')::int);--> statement-breakpoint
CREATE POLICY "sales_domain_event_logs_tenant_delete" ON "sales"."domain_event_logs" AS PERMISSIVE FOR DELETE TO "app_user" USING ("tenant_id" = NULLIF(current_setting('afenda.tenant_id', true), '')::int);--> statement-breakpoint
CREATE POLICY "sales_domain_event_logs_service_bypass" ON "sales"."domain_event_logs" AS PERMISSIVE FOR ALL TO "service_role" USING (true) WITH CHECK (true);--> statement-breakpoint
CREATE POLICY "sales_domain_invariant_logs_tenant_select" ON "sales"."domain_invariant_logs" AS PERMISSIVE FOR SELECT TO "app_user" USING ("tenant_id" = NULLIF(current_setting('afenda.tenant_id', true), '')::int);--> statement-breakpoint
CREATE POLICY "sales_domain_invariant_logs_tenant_insert" ON "sales"."domain_invariant_logs" AS PERMISSIVE FOR INSERT TO "app_user" WITH CHECK ("tenant_id" = NULLIF(current_setting('afenda.tenant_id', true), '')::int);--> statement-breakpoint
CREATE POLICY "sales_domain_invariant_logs_tenant_update" ON "sales"."domain_invariant_logs" AS PERMISSIVE FOR UPDATE TO "app_user" USING ("tenant_id" = NULLIF(current_setting('afenda.tenant_id', true), '')::int) WITH CHECK ("tenant_id" = NULLIF(current_setting('afenda.tenant_id', true), '')::int);--> statement-breakpoint
CREATE POLICY "sales_domain_invariant_logs_tenant_delete" ON "sales"."domain_invariant_logs" AS PERMISSIVE FOR DELETE TO "app_user" USING ("tenant_id" = NULLIF(current_setting('afenda.tenant_id', true), '')::int);--> statement-breakpoint
CREATE POLICY "sales_domain_invariant_logs_service_bypass" ON "sales"."domain_invariant_logs" AS PERMISSIVE FOR ALL TO "service_role" USING (true) WITH CHECK (true);--> statement-breakpoint
CREATE POLICY "sales_fiscal_position_account_maps_tenant_select" ON "sales"."fiscal_position_account_maps" AS PERMISSIVE FOR SELECT TO "app_user" USING ("tenant_id" = NULLIF(current_setting('afenda.tenant_id', true), '')::int);--> statement-breakpoint
CREATE POLICY "sales_fiscal_position_account_maps_tenant_insert" ON "sales"."fiscal_position_account_maps" AS PERMISSIVE FOR INSERT TO "app_user" WITH CHECK ("tenant_id" = NULLIF(current_setting('afenda.tenant_id', true), '')::int);--> statement-breakpoint
CREATE POLICY "sales_fiscal_position_account_maps_tenant_update" ON "sales"."fiscal_position_account_maps" AS PERMISSIVE FOR UPDATE TO "app_user" USING ("tenant_id" = NULLIF(current_setting('afenda.tenant_id', true), '')::int) WITH CHECK ("tenant_id" = NULLIF(current_setting('afenda.tenant_id', true), '')::int);--> statement-breakpoint
CREATE POLICY "sales_fiscal_position_account_maps_tenant_delete" ON "sales"."fiscal_position_account_maps" AS PERMISSIVE FOR DELETE TO "app_user" USING ("tenant_id" = NULLIF(current_setting('afenda.tenant_id', true), '')::int);--> statement-breakpoint
CREATE POLICY "sales_fiscal_position_account_maps_service_bypass" ON "sales"."fiscal_position_account_maps" AS PERMISSIVE FOR ALL TO "service_role" USING (true) WITH CHECK (true);--> statement-breakpoint
CREATE POLICY "sales_fiscal_position_tax_maps_tenant_select" ON "sales"."fiscal_position_tax_maps" AS PERMISSIVE FOR SELECT TO "app_user" USING ("tenant_id" = NULLIF(current_setting('afenda.tenant_id', true), '')::int);--> statement-breakpoint
CREATE POLICY "sales_fiscal_position_tax_maps_tenant_insert" ON "sales"."fiscal_position_tax_maps" AS PERMISSIVE FOR INSERT TO "app_user" WITH CHECK ("tenant_id" = NULLIF(current_setting('afenda.tenant_id', true), '')::int);--> statement-breakpoint
CREATE POLICY "sales_fiscal_position_tax_maps_tenant_update" ON "sales"."fiscal_position_tax_maps" AS PERMISSIVE FOR UPDATE TO "app_user" USING ("tenant_id" = NULLIF(current_setting('afenda.tenant_id', true), '')::int) WITH CHECK ("tenant_id" = NULLIF(current_setting('afenda.tenant_id', true), '')::int);--> statement-breakpoint
CREATE POLICY "sales_fiscal_position_tax_maps_tenant_delete" ON "sales"."fiscal_position_tax_maps" AS PERMISSIVE FOR DELETE TO "app_user" USING ("tenant_id" = NULLIF(current_setting('afenda.tenant_id', true), '')::int);--> statement-breakpoint
CREATE POLICY "sales_fiscal_position_tax_maps_service_bypass" ON "sales"."fiscal_position_tax_maps" AS PERMISSIVE FOR ALL TO "service_role" USING (true) WITH CHECK (true);--> statement-breakpoint
CREATE POLICY "sales_fiscal_positions_tenant_select" ON "sales"."fiscal_positions" AS PERMISSIVE FOR SELECT TO "app_user" USING ("tenant_id" = NULLIF(current_setting('afenda.tenant_id', true), '')::int);--> statement-breakpoint
CREATE POLICY "sales_fiscal_positions_tenant_insert" ON "sales"."fiscal_positions" AS PERMISSIVE FOR INSERT TO "app_user" WITH CHECK ("tenant_id" = NULLIF(current_setting('afenda.tenant_id', true), '')::int);--> statement-breakpoint
CREATE POLICY "sales_fiscal_positions_tenant_update" ON "sales"."fiscal_positions" AS PERMISSIVE FOR UPDATE TO "app_user" USING ("tenant_id" = NULLIF(current_setting('afenda.tenant_id', true), '')::int) WITH CHECK ("tenant_id" = NULLIF(current_setting('afenda.tenant_id', true), '')::int);--> statement-breakpoint
CREATE POLICY "sales_fiscal_positions_tenant_delete" ON "sales"."fiscal_positions" AS PERMISSIVE FOR DELETE TO "app_user" USING ("tenant_id" = NULLIF(current_setting('afenda.tenant_id', true), '')::int);--> statement-breakpoint
CREATE POLICY "sales_fiscal_positions_service_bypass" ON "sales"."fiscal_positions" AS PERMISSIVE FOR ALL TO "service_role" USING (true) WITH CHECK (true);--> statement-breakpoint
CREATE POLICY "sales_line_item_discounts_tenant_select" ON "sales"."line_item_discounts" AS PERMISSIVE FOR SELECT TO "app_user" USING ("tenant_id" = NULLIF(current_setting('afenda.tenant_id', true), '')::int);--> statement-breakpoint
CREATE POLICY "sales_line_item_discounts_tenant_insert" ON "sales"."line_item_discounts" AS PERMISSIVE FOR INSERT TO "app_user" WITH CHECK ("tenant_id" = NULLIF(current_setting('afenda.tenant_id', true), '')::int);--> statement-breakpoint
CREATE POLICY "sales_line_item_discounts_tenant_update" ON "sales"."line_item_discounts" AS PERMISSIVE FOR UPDATE TO "app_user" USING ("tenant_id" = NULLIF(current_setting('afenda.tenant_id', true), '')::int) WITH CHECK ("tenant_id" = NULLIF(current_setting('afenda.tenant_id', true), '')::int);--> statement-breakpoint
CREATE POLICY "sales_line_item_discounts_tenant_delete" ON "sales"."line_item_discounts" AS PERMISSIVE FOR DELETE TO "app_user" USING ("tenant_id" = NULLIF(current_setting('afenda.tenant_id', true), '')::int);--> statement-breakpoint
CREATE POLICY "sales_line_item_discounts_service_bypass" ON "sales"."line_item_discounts" AS PERMISSIVE FOR ALL TO "service_role" USING (true) WITH CHECK (true);--> statement-breakpoint
CREATE POLICY "sales_partner_addresses_tenant_select" ON "sales"."partner_addresses" AS PERMISSIVE FOR SELECT TO "app_user" USING ("tenant_id" = NULLIF(current_setting('afenda.tenant_id', true), '')::int);--> statement-breakpoint
CREATE POLICY "sales_partner_addresses_tenant_insert" ON "sales"."partner_addresses" AS PERMISSIVE FOR INSERT TO "app_user" WITH CHECK ("tenant_id" = NULLIF(current_setting('afenda.tenant_id', true), '')::int);--> statement-breakpoint
CREATE POLICY "sales_partner_addresses_tenant_update" ON "sales"."partner_addresses" AS PERMISSIVE FOR UPDATE TO "app_user" USING ("tenant_id" = NULLIF(current_setting('afenda.tenant_id', true), '')::int) WITH CHECK ("tenant_id" = NULLIF(current_setting('afenda.tenant_id', true), '')::int);--> statement-breakpoint
CREATE POLICY "sales_partner_addresses_tenant_delete" ON "sales"."partner_addresses" AS PERMISSIVE FOR DELETE TO "app_user" USING ("tenant_id" = NULLIF(current_setting('afenda.tenant_id', true), '')::int);--> statement-breakpoint
CREATE POLICY "sales_partner_addresses_service_bypass" ON "sales"."partner_addresses" AS PERMISSIVE FOR ALL TO "service_role" USING (true) WITH CHECK (true);--> statement-breakpoint
CREATE POLICY "sales_partner_bank_accounts_tenant_select" ON "sales"."partner_bank_accounts" AS PERMISSIVE FOR SELECT TO "app_user" USING ("tenant_id" = NULLIF(current_setting('afenda.tenant_id', true), '')::int);--> statement-breakpoint
CREATE POLICY "sales_partner_bank_accounts_tenant_insert" ON "sales"."partner_bank_accounts" AS PERMISSIVE FOR INSERT TO "app_user" WITH CHECK ("tenant_id" = NULLIF(current_setting('afenda.tenant_id', true), '')::int);--> statement-breakpoint
CREATE POLICY "sales_partner_bank_accounts_tenant_update" ON "sales"."partner_bank_accounts" AS PERMISSIVE FOR UPDATE TO "app_user" USING ("tenant_id" = NULLIF(current_setting('afenda.tenant_id', true), '')::int) WITH CHECK ("tenant_id" = NULLIF(current_setting('afenda.tenant_id', true), '')::int);--> statement-breakpoint
CREATE POLICY "sales_partner_bank_accounts_tenant_delete" ON "sales"."partner_bank_accounts" AS PERMISSIVE FOR DELETE TO "app_user" USING ("tenant_id" = NULLIF(current_setting('afenda.tenant_id', true), '')::int);--> statement-breakpoint
CREATE POLICY "sales_partner_bank_accounts_service_bypass" ON "sales"."partner_bank_accounts" AS PERMISSIVE FOR ALL TO "service_role" USING (true) WITH CHECK (true);--> statement-breakpoint
CREATE POLICY "sales_partner_tag_assignments_tenant_select" ON "sales"."partner_tag_assignments" AS PERMISSIVE FOR SELECT TO "app_user" USING ("tenant_id" = NULLIF(current_setting('afenda.tenant_id', true), '')::int);--> statement-breakpoint
CREATE POLICY "sales_partner_tag_assignments_tenant_insert" ON "sales"."partner_tag_assignments" AS PERMISSIVE FOR INSERT TO "app_user" WITH CHECK ("tenant_id" = NULLIF(current_setting('afenda.tenant_id', true), '')::int);--> statement-breakpoint
CREATE POLICY "sales_partner_tag_assignments_tenant_update" ON "sales"."partner_tag_assignments" AS PERMISSIVE FOR UPDATE TO "app_user" USING ("tenant_id" = NULLIF(current_setting('afenda.tenant_id', true), '')::int) WITH CHECK ("tenant_id" = NULLIF(current_setting('afenda.tenant_id', true), '')::int);--> statement-breakpoint
CREATE POLICY "sales_partner_tag_assignments_tenant_delete" ON "sales"."partner_tag_assignments" AS PERMISSIVE FOR DELETE TO "app_user" USING ("tenant_id" = NULLIF(current_setting('afenda.tenant_id', true), '')::int);--> statement-breakpoint
CREATE POLICY "sales_partner_tag_assignments_service_bypass" ON "sales"."partner_tag_assignments" AS PERMISSIVE FOR ALL TO "service_role" USING (true) WITH CHECK (true);--> statement-breakpoint
CREATE POLICY "sales_partner_tags_tenant_select" ON "sales"."partner_tags" AS PERMISSIVE FOR SELECT TO "app_user" USING ("tenant_id" = NULLIF(current_setting('afenda.tenant_id', true), '')::int);--> statement-breakpoint
CREATE POLICY "sales_partner_tags_tenant_insert" ON "sales"."partner_tags" AS PERMISSIVE FOR INSERT TO "app_user" WITH CHECK ("tenant_id" = NULLIF(current_setting('afenda.tenant_id', true), '')::int);--> statement-breakpoint
CREATE POLICY "sales_partner_tags_tenant_update" ON "sales"."partner_tags" AS PERMISSIVE FOR UPDATE TO "app_user" USING ("tenant_id" = NULLIF(current_setting('afenda.tenant_id', true), '')::int) WITH CHECK ("tenant_id" = NULLIF(current_setting('afenda.tenant_id', true), '')::int);--> statement-breakpoint
CREATE POLICY "sales_partner_tags_tenant_delete" ON "sales"."partner_tags" AS PERMISSIVE FOR DELETE TO "app_user" USING ("tenant_id" = NULLIF(current_setting('afenda.tenant_id', true), '')::int);--> statement-breakpoint
CREATE POLICY "sales_partner_tags_service_bypass" ON "sales"."partner_tags" AS PERMISSIVE FOR ALL TO "service_role" USING (true) WITH CHECK (true);--> statement-breakpoint
CREATE POLICY "sales_partners_tenant_select" ON "sales"."partners" AS PERMISSIVE FOR SELECT TO "app_user" USING ("tenant_id" = NULLIF(current_setting('afenda.tenant_id', true), '')::int);--> statement-breakpoint
CREATE POLICY "sales_partners_tenant_insert" ON "sales"."partners" AS PERMISSIVE FOR INSERT TO "app_user" WITH CHECK ("tenant_id" = NULLIF(current_setting('afenda.tenant_id', true), '')::int);--> statement-breakpoint
CREATE POLICY "sales_partners_tenant_update" ON "sales"."partners" AS PERMISSIVE FOR UPDATE TO "app_user" USING ("tenant_id" = NULLIF(current_setting('afenda.tenant_id', true), '')::int) WITH CHECK ("tenant_id" = NULLIF(current_setting('afenda.tenant_id', true), '')::int);--> statement-breakpoint
CREATE POLICY "sales_partners_tenant_delete" ON "sales"."partners" AS PERMISSIVE FOR DELETE TO "app_user" USING ("tenant_id" = NULLIF(current_setting('afenda.tenant_id', true), '')::int);--> statement-breakpoint
CREATE POLICY "sales_partners_service_bypass" ON "sales"."partners" AS PERMISSIVE FOR ALL TO "service_role" USING (true) WITH CHECK (true);--> statement-breakpoint
CREATE POLICY "sales_payment_term_lines_tenant_select" ON "sales"."payment_term_lines" AS PERMISSIVE FOR SELECT TO "app_user" USING ("tenant_id" = NULLIF(current_setting('afenda.tenant_id', true), '')::int);--> statement-breakpoint
CREATE POLICY "sales_payment_term_lines_tenant_insert" ON "sales"."payment_term_lines" AS PERMISSIVE FOR INSERT TO "app_user" WITH CHECK ("tenant_id" = NULLIF(current_setting('afenda.tenant_id', true), '')::int);--> statement-breakpoint
CREATE POLICY "sales_payment_term_lines_tenant_update" ON "sales"."payment_term_lines" AS PERMISSIVE FOR UPDATE TO "app_user" USING ("tenant_id" = NULLIF(current_setting('afenda.tenant_id', true), '')::int) WITH CHECK ("tenant_id" = NULLIF(current_setting('afenda.tenant_id', true), '')::int);--> statement-breakpoint
CREATE POLICY "sales_payment_term_lines_tenant_delete" ON "sales"."payment_term_lines" AS PERMISSIVE FOR DELETE TO "app_user" USING ("tenant_id" = NULLIF(current_setting('afenda.tenant_id', true), '')::int);--> statement-breakpoint
CREATE POLICY "sales_payment_term_lines_service_bypass" ON "sales"."payment_term_lines" AS PERMISSIVE FOR ALL TO "service_role" USING (true) WITH CHECK (true);--> statement-breakpoint
CREATE POLICY "sales_payment_terms_tenant_select" ON "sales"."payment_terms" AS PERMISSIVE FOR SELECT TO "app_user" USING ("tenant_id" = NULLIF(current_setting('afenda.tenant_id', true), '')::int);--> statement-breakpoint
CREATE POLICY "sales_payment_terms_tenant_insert" ON "sales"."payment_terms" AS PERMISSIVE FOR INSERT TO "app_user" WITH CHECK ("tenant_id" = NULLIF(current_setting('afenda.tenant_id', true), '')::int);--> statement-breakpoint
CREATE POLICY "sales_payment_terms_tenant_update" ON "sales"."payment_terms" AS PERMISSIVE FOR UPDATE TO "app_user" USING ("tenant_id" = NULLIF(current_setting('afenda.tenant_id', true), '')::int) WITH CHECK ("tenant_id" = NULLIF(current_setting('afenda.tenant_id', true), '')::int);--> statement-breakpoint
CREATE POLICY "sales_payment_terms_tenant_delete" ON "sales"."payment_terms" AS PERMISSIVE FOR DELETE TO "app_user" USING ("tenant_id" = NULLIF(current_setting('afenda.tenant_id', true), '')::int);--> statement-breakpoint
CREATE POLICY "sales_payment_terms_service_bypass" ON "sales"."payment_terms" AS PERMISSIVE FOR ALL TO "service_role" USING (true) WITH CHECK (true);--> statement-breakpoint
CREATE POLICY "sales_pricelist_items_tenant_select" ON "sales"."pricelist_items" AS PERMISSIVE FOR SELECT TO "app_user" USING ("tenant_id" = NULLIF(current_setting('afenda.tenant_id', true), '')::int);--> statement-breakpoint
CREATE POLICY "sales_pricelist_items_tenant_insert" ON "sales"."pricelist_items" AS PERMISSIVE FOR INSERT TO "app_user" WITH CHECK ("tenant_id" = NULLIF(current_setting('afenda.tenant_id', true), '')::int);--> statement-breakpoint
CREATE POLICY "sales_pricelist_items_tenant_update" ON "sales"."pricelist_items" AS PERMISSIVE FOR UPDATE TO "app_user" USING ("tenant_id" = NULLIF(current_setting('afenda.tenant_id', true), '')::int) WITH CHECK ("tenant_id" = NULLIF(current_setting('afenda.tenant_id', true), '')::int);--> statement-breakpoint
CREATE POLICY "sales_pricelist_items_tenant_delete" ON "sales"."pricelist_items" AS PERMISSIVE FOR DELETE TO "app_user" USING ("tenant_id" = NULLIF(current_setting('afenda.tenant_id', true), '')::int);--> statement-breakpoint
CREATE POLICY "sales_pricelist_items_service_bypass" ON "sales"."pricelist_items" AS PERMISSIVE FOR ALL TO "service_role" USING (true) WITH CHECK (true);--> statement-breakpoint
CREATE POLICY "sales_pricelists_tenant_select" ON "sales"."pricelists" AS PERMISSIVE FOR SELECT TO "app_user" USING ("tenant_id" = NULLIF(current_setting('afenda.tenant_id', true), '')::int);--> statement-breakpoint
CREATE POLICY "sales_pricelists_tenant_insert" ON "sales"."pricelists" AS PERMISSIVE FOR INSERT TO "app_user" WITH CHECK ("tenant_id" = NULLIF(current_setting('afenda.tenant_id', true), '')::int);--> statement-breakpoint
CREATE POLICY "sales_pricelists_tenant_update" ON "sales"."pricelists" AS PERMISSIVE FOR UPDATE TO "app_user" USING ("tenant_id" = NULLIF(current_setting('afenda.tenant_id', true), '')::int) WITH CHECK ("tenant_id" = NULLIF(current_setting('afenda.tenant_id', true), '')::int);--> statement-breakpoint
CREATE POLICY "sales_pricelists_tenant_delete" ON "sales"."pricelists" AS PERMISSIVE FOR DELETE TO "app_user" USING ("tenant_id" = NULLIF(current_setting('afenda.tenant_id', true), '')::int);--> statement-breakpoint
CREATE POLICY "sales_pricelists_service_bypass" ON "sales"."pricelists" AS PERMISSIVE FOR ALL TO "service_role" USING (true) WITH CHECK (true);--> statement-breakpoint
CREATE POLICY "sales_product_attribute_values_tenant_select" ON "sales"."product_attribute_values" AS PERMISSIVE FOR SELECT TO "app_user" USING ("tenant_id" = NULLIF(current_setting('afenda.tenant_id', true), '')::int);--> statement-breakpoint
CREATE POLICY "sales_product_attribute_values_tenant_insert" ON "sales"."product_attribute_values" AS PERMISSIVE FOR INSERT TO "app_user" WITH CHECK ("tenant_id" = NULLIF(current_setting('afenda.tenant_id', true), '')::int);--> statement-breakpoint
CREATE POLICY "sales_product_attribute_values_tenant_update" ON "sales"."product_attribute_values" AS PERMISSIVE FOR UPDATE TO "app_user" USING ("tenant_id" = NULLIF(current_setting('afenda.tenant_id', true), '')::int) WITH CHECK ("tenant_id" = NULLIF(current_setting('afenda.tenant_id', true), '')::int);--> statement-breakpoint
CREATE POLICY "sales_product_attribute_values_tenant_delete" ON "sales"."product_attribute_values" AS PERMISSIVE FOR DELETE TO "app_user" USING ("tenant_id" = NULLIF(current_setting('afenda.tenant_id', true), '')::int);--> statement-breakpoint
CREATE POLICY "sales_product_attribute_values_service_bypass" ON "sales"."product_attribute_values" AS PERMISSIVE FOR ALL TO "service_role" USING (true) WITH CHECK (true);--> statement-breakpoint
CREATE POLICY "sales_product_attributes_tenant_select" ON "sales"."product_attributes" AS PERMISSIVE FOR SELECT TO "app_user" USING ("tenant_id" = NULLIF(current_setting('afenda.tenant_id', true), '')::int);--> statement-breakpoint
CREATE POLICY "sales_product_attributes_tenant_insert" ON "sales"."product_attributes" AS PERMISSIVE FOR INSERT TO "app_user" WITH CHECK ("tenant_id" = NULLIF(current_setting('afenda.tenant_id', true), '')::int);--> statement-breakpoint
CREATE POLICY "sales_product_attributes_tenant_update" ON "sales"."product_attributes" AS PERMISSIVE FOR UPDATE TO "app_user" USING ("tenant_id" = NULLIF(current_setting('afenda.tenant_id', true), '')::int) WITH CHECK ("tenant_id" = NULLIF(current_setting('afenda.tenant_id', true), '')::int);--> statement-breakpoint
CREATE POLICY "sales_product_attributes_tenant_delete" ON "sales"."product_attributes" AS PERMISSIVE FOR DELETE TO "app_user" USING ("tenant_id" = NULLIF(current_setting('afenda.tenant_id', true), '')::int);--> statement-breakpoint
CREATE POLICY "sales_product_attributes_service_bypass" ON "sales"."product_attributes" AS PERMISSIVE FOR ALL TO "service_role" USING (true) WITH CHECK (true);--> statement-breakpoint
CREATE POLICY "sales_product_categories_tenant_select" ON "sales"."product_categories" AS PERMISSIVE FOR SELECT TO "app_user" USING ("tenant_id" = NULLIF(current_setting('afenda.tenant_id', true), '')::int);--> statement-breakpoint
CREATE POLICY "sales_product_categories_tenant_insert" ON "sales"."product_categories" AS PERMISSIVE FOR INSERT TO "app_user" WITH CHECK ("tenant_id" = NULLIF(current_setting('afenda.tenant_id', true), '')::int);--> statement-breakpoint
CREATE POLICY "sales_product_categories_tenant_update" ON "sales"."product_categories" AS PERMISSIVE FOR UPDATE TO "app_user" USING ("tenant_id" = NULLIF(current_setting('afenda.tenant_id', true), '')::int) WITH CHECK ("tenant_id" = NULLIF(current_setting('afenda.tenant_id', true), '')::int);--> statement-breakpoint
CREATE POLICY "sales_product_categories_tenant_delete" ON "sales"."product_categories" AS PERMISSIVE FOR DELETE TO "app_user" USING ("tenant_id" = NULLIF(current_setting('afenda.tenant_id', true), '')::int);--> statement-breakpoint
CREATE POLICY "sales_product_categories_service_bypass" ON "sales"."product_categories" AS PERMISSIVE FOR ALL TO "service_role" USING (true) WITH CHECK (true);--> statement-breakpoint
CREATE POLICY "sales_product_packaging_tenant_select" ON "sales"."product_packaging" AS PERMISSIVE FOR SELECT TO "app_user" USING ("tenant_id" = NULLIF(current_setting('afenda.tenant_id', true), '')::int);--> statement-breakpoint
CREATE POLICY "sales_product_packaging_tenant_insert" ON "sales"."product_packaging" AS PERMISSIVE FOR INSERT TO "app_user" WITH CHECK ("tenant_id" = NULLIF(current_setting('afenda.tenant_id', true), '')::int);--> statement-breakpoint
CREATE POLICY "sales_product_packaging_tenant_update" ON "sales"."product_packaging" AS PERMISSIVE FOR UPDATE TO "app_user" USING ("tenant_id" = NULLIF(current_setting('afenda.tenant_id', true), '')::int) WITH CHECK ("tenant_id" = NULLIF(current_setting('afenda.tenant_id', true), '')::int);--> statement-breakpoint
CREATE POLICY "sales_product_packaging_tenant_delete" ON "sales"."product_packaging" AS PERMISSIVE FOR DELETE TO "app_user" USING ("tenant_id" = NULLIF(current_setting('afenda.tenant_id', true), '')::int);--> statement-breakpoint
CREATE POLICY "sales_product_packaging_service_bypass" ON "sales"."product_packaging" AS PERMISSIVE FOR ALL TO "service_role" USING (true) WITH CHECK (true);--> statement-breakpoint
CREATE POLICY "sales_product_template_attribute_lines_tenant_select" ON "sales"."product_template_attribute_lines" AS PERMISSIVE FOR SELECT TO "app_user" USING ("tenant_id" = NULLIF(current_setting('afenda.tenant_id', true), '')::int);--> statement-breakpoint
CREATE POLICY "sales_product_template_attribute_lines_tenant_insert" ON "sales"."product_template_attribute_lines" AS PERMISSIVE FOR INSERT TO "app_user" WITH CHECK ("tenant_id" = NULLIF(current_setting('afenda.tenant_id', true), '')::int);--> statement-breakpoint
CREATE POLICY "sales_product_template_attribute_lines_tenant_update" ON "sales"."product_template_attribute_lines" AS PERMISSIVE FOR UPDATE TO "app_user" USING ("tenant_id" = NULLIF(current_setting('afenda.tenant_id', true), '')::int) WITH CHECK ("tenant_id" = NULLIF(current_setting('afenda.tenant_id', true), '')::int);--> statement-breakpoint
CREATE POLICY "sales_product_template_attribute_lines_tenant_delete" ON "sales"."product_template_attribute_lines" AS PERMISSIVE FOR DELETE TO "app_user" USING ("tenant_id" = NULLIF(current_setting('afenda.tenant_id', true), '')::int);--> statement-breakpoint
CREATE POLICY "sales_product_template_attribute_lines_service_bypass" ON "sales"."product_template_attribute_lines" AS PERMISSIVE FOR ALL TO "service_role" USING (true) WITH CHECK (true);--> statement-breakpoint
CREATE POLICY "sales_product_template_attribute_values_tenant_select" ON "sales"."product_template_attribute_values" AS PERMISSIVE FOR SELECT TO "app_user" USING ("tenant_id" = NULLIF(current_setting('afenda.tenant_id', true), '')::int);--> statement-breakpoint
CREATE POLICY "sales_product_template_attribute_values_tenant_insert" ON "sales"."product_template_attribute_values" AS PERMISSIVE FOR INSERT TO "app_user" WITH CHECK ("tenant_id" = NULLIF(current_setting('afenda.tenant_id', true), '')::int);--> statement-breakpoint
CREATE POLICY "sales_product_template_attribute_values_tenant_update" ON "sales"."product_template_attribute_values" AS PERMISSIVE FOR UPDATE TO "app_user" USING ("tenant_id" = NULLIF(current_setting('afenda.tenant_id', true), '')::int) WITH CHECK ("tenant_id" = NULLIF(current_setting('afenda.tenant_id', true), '')::int);--> statement-breakpoint
CREATE POLICY "sales_product_template_attribute_values_tenant_delete" ON "sales"."product_template_attribute_values" AS PERMISSIVE FOR DELETE TO "app_user" USING ("tenant_id" = NULLIF(current_setting('afenda.tenant_id', true), '')::int);--> statement-breakpoint
CREATE POLICY "sales_product_template_attribute_values_service_bypass" ON "sales"."product_template_attribute_values" AS PERMISSIVE FOR ALL TO "service_role" USING (true) WITH CHECK (true);--> statement-breakpoint
CREATE POLICY "sales_product_templates_tenant_select" ON "sales"."product_templates" AS PERMISSIVE FOR SELECT TO "app_user" USING ("tenant_id" = NULLIF(current_setting('afenda.tenant_id', true), '')::int);--> statement-breakpoint
CREATE POLICY "sales_product_templates_tenant_insert" ON "sales"."product_templates" AS PERMISSIVE FOR INSERT TO "app_user" WITH CHECK ("tenant_id" = NULLIF(current_setting('afenda.tenant_id', true), '')::int);--> statement-breakpoint
CREATE POLICY "sales_product_templates_tenant_update" ON "sales"."product_templates" AS PERMISSIVE FOR UPDATE TO "app_user" USING ("tenant_id" = NULLIF(current_setting('afenda.tenant_id', true), '')::int) WITH CHECK ("tenant_id" = NULLIF(current_setting('afenda.tenant_id', true), '')::int);--> statement-breakpoint
CREATE POLICY "sales_product_templates_tenant_delete" ON "sales"."product_templates" AS PERMISSIVE FOR DELETE TO "app_user" USING ("tenant_id" = NULLIF(current_setting('afenda.tenant_id', true), '')::int);--> statement-breakpoint
CREATE POLICY "sales_product_templates_service_bypass" ON "sales"."product_templates" AS PERMISSIVE FOR ALL TO "service_role" USING (true) WITH CHECK (true);--> statement-breakpoint
CREATE POLICY "sales_product_variants_tenant_select" ON "sales"."product_variants" AS PERMISSIVE FOR SELECT TO "app_user" USING ("tenant_id" = NULLIF(current_setting('afenda.tenant_id', true), '')::int);--> statement-breakpoint
CREATE POLICY "sales_product_variants_tenant_insert" ON "sales"."product_variants" AS PERMISSIVE FOR INSERT TO "app_user" WITH CHECK ("tenant_id" = NULLIF(current_setting('afenda.tenant_id', true), '')::int);--> statement-breakpoint
CREATE POLICY "sales_product_variants_tenant_update" ON "sales"."product_variants" AS PERMISSIVE FOR UPDATE TO "app_user" USING ("tenant_id" = NULLIF(current_setting('afenda.tenant_id', true), '')::int) WITH CHECK ("tenant_id" = NULLIF(current_setting('afenda.tenant_id', true), '')::int);--> statement-breakpoint
CREATE POLICY "sales_product_variants_tenant_delete" ON "sales"."product_variants" AS PERMISSIVE FOR DELETE TO "app_user" USING ("tenant_id" = NULLIF(current_setting('afenda.tenant_id', true), '')::int);--> statement-breakpoint
CREATE POLICY "sales_product_variants_service_bypass" ON "sales"."product_variants" AS PERMISSIVE FOR ALL TO "service_role" USING (true) WITH CHECK (true);--> statement-breakpoint
CREATE POLICY "sales_products_tenant_select" ON "sales"."products" AS PERMISSIVE FOR SELECT TO "app_user" USING ("tenant_id" = NULLIF(current_setting('afenda.tenant_id', true), '')::int);--> statement-breakpoint
CREATE POLICY "sales_products_tenant_insert" ON "sales"."products" AS PERMISSIVE FOR INSERT TO "app_user" WITH CHECK ("tenant_id" = NULLIF(current_setting('afenda.tenant_id', true), '')::int);--> statement-breakpoint
CREATE POLICY "sales_products_tenant_update" ON "sales"."products" AS PERMISSIVE FOR UPDATE TO "app_user" USING ("tenant_id" = NULLIF(current_setting('afenda.tenant_id', true), '')::int) WITH CHECK ("tenant_id" = NULLIF(current_setting('afenda.tenant_id', true), '')::int);--> statement-breakpoint
CREATE POLICY "sales_products_tenant_delete" ON "sales"."products" AS PERMISSIVE FOR DELETE TO "app_user" USING ("tenant_id" = NULLIF(current_setting('afenda.tenant_id', true), '')::int);--> statement-breakpoint
CREATE POLICY "sales_products_service_bypass" ON "sales"."products" AS PERMISSIVE FOR ALL TO "service_role" USING (true) WITH CHECK (true);--> statement-breakpoint
CREATE POLICY "sales_return_order_lines_tenant_select" ON "sales"."return_order_lines" AS PERMISSIVE FOR SELECT TO "app_user" USING ("tenant_id" = NULLIF(current_setting('afenda.tenant_id', true), '')::int);--> statement-breakpoint
CREATE POLICY "sales_return_order_lines_tenant_insert" ON "sales"."return_order_lines" AS PERMISSIVE FOR INSERT TO "app_user" WITH CHECK ("tenant_id" = NULLIF(current_setting('afenda.tenant_id', true), '')::int);--> statement-breakpoint
CREATE POLICY "sales_return_order_lines_tenant_update" ON "sales"."return_order_lines" AS PERMISSIVE FOR UPDATE TO "app_user" USING ("tenant_id" = NULLIF(current_setting('afenda.tenant_id', true), '')::int) WITH CHECK ("tenant_id" = NULLIF(current_setting('afenda.tenant_id', true), '')::int);--> statement-breakpoint
CREATE POLICY "sales_return_order_lines_tenant_delete" ON "sales"."return_order_lines" AS PERMISSIVE FOR DELETE TO "app_user" USING ("tenant_id" = NULLIF(current_setting('afenda.tenant_id', true), '')::int);--> statement-breakpoint
CREATE POLICY "sales_return_order_lines_service_bypass" ON "sales"."return_order_lines" AS PERMISSIVE FOR ALL TO "service_role" USING (true) WITH CHECK (true);--> statement-breakpoint
CREATE POLICY "sales_return_orders_tenant_select" ON "sales"."return_orders" AS PERMISSIVE FOR SELECT TO "app_user" USING ("tenant_id" = NULLIF(current_setting('afenda.tenant_id', true), '')::int);--> statement-breakpoint
CREATE POLICY "sales_return_orders_tenant_insert" ON "sales"."return_orders" AS PERMISSIVE FOR INSERT TO "app_user" WITH CHECK ("tenant_id" = NULLIF(current_setting('afenda.tenant_id', true), '')::int);--> statement-breakpoint
CREATE POLICY "sales_return_orders_tenant_update" ON "sales"."return_orders" AS PERMISSIVE FOR UPDATE TO "app_user" USING ("tenant_id" = NULLIF(current_setting('afenda.tenant_id', true), '')::int) WITH CHECK ("tenant_id" = NULLIF(current_setting('afenda.tenant_id', true), '')::int);--> statement-breakpoint
CREATE POLICY "sales_return_orders_tenant_delete" ON "sales"."return_orders" AS PERMISSIVE FOR DELETE TO "app_user" USING ("tenant_id" = NULLIF(current_setting('afenda.tenant_id', true), '')::int);--> statement-breakpoint
CREATE POLICY "sales_return_orders_service_bypass" ON "sales"."return_orders" AS PERMISSIVE FOR ALL TO "service_role" USING (true) WITH CHECK (true);--> statement-breakpoint
CREATE POLICY "sales_return_reason_codes_tenant_select" ON "sales"."return_reason_codes" AS PERMISSIVE FOR SELECT TO "app_user" USING ("tenant_id" = NULLIF(current_setting('afenda.tenant_id', true), '')::int);--> statement-breakpoint
CREATE POLICY "sales_return_reason_codes_tenant_insert" ON "sales"."return_reason_codes" AS PERMISSIVE FOR INSERT TO "app_user" WITH CHECK ("tenant_id" = NULLIF(current_setting('afenda.tenant_id', true), '')::int);--> statement-breakpoint
CREATE POLICY "sales_return_reason_codes_tenant_update" ON "sales"."return_reason_codes" AS PERMISSIVE FOR UPDATE TO "app_user" USING ("tenant_id" = NULLIF(current_setting('afenda.tenant_id', true), '')::int) WITH CHECK ("tenant_id" = NULLIF(current_setting('afenda.tenant_id', true), '')::int);--> statement-breakpoint
CREATE POLICY "sales_return_reason_codes_tenant_delete" ON "sales"."return_reason_codes" AS PERMISSIVE FOR DELETE TO "app_user" USING ("tenant_id" = NULLIF(current_setting('afenda.tenant_id', true), '')::int);--> statement-breakpoint
CREATE POLICY "sales_return_reason_codes_service_bypass" ON "sales"."return_reason_codes" AS PERMISSIVE FOR ALL TO "service_role" USING (true) WITH CHECK (true);--> statement-breakpoint
CREATE POLICY "sales_rounding_policies_tenant_select" ON "sales"."rounding_policies" AS PERMISSIVE FOR SELECT TO "app_user" USING ("tenant_id" = NULLIF(current_setting('afenda.tenant_id', true), '')::int);--> statement-breakpoint
CREATE POLICY "sales_rounding_policies_tenant_insert" ON "sales"."rounding_policies" AS PERMISSIVE FOR INSERT TO "app_user" WITH CHECK ("tenant_id" = NULLIF(current_setting('afenda.tenant_id', true), '')::int);--> statement-breakpoint
CREATE POLICY "sales_rounding_policies_tenant_update" ON "sales"."rounding_policies" AS PERMISSIVE FOR UPDATE TO "app_user" USING ("tenant_id" = NULLIF(current_setting('afenda.tenant_id', true), '')::int) WITH CHECK ("tenant_id" = NULLIF(current_setting('afenda.tenant_id', true), '')::int);--> statement-breakpoint
CREATE POLICY "sales_rounding_policies_tenant_delete" ON "sales"."rounding_policies" AS PERMISSIVE FOR DELETE TO "app_user" USING ("tenant_id" = NULLIF(current_setting('afenda.tenant_id', true), '')::int);--> statement-breakpoint
CREATE POLICY "sales_rounding_policies_service_bypass" ON "sales"."rounding_policies" AS PERMISSIVE FOR ALL TO "service_role" USING (true) WITH CHECK (true);--> statement-breakpoint
CREATE POLICY "sales_sale_order_line_taxes_tenant_select" ON "sales"."sale_order_line_taxes" AS PERMISSIVE FOR SELECT TO "app_user" USING ("tenant_id" = NULLIF(current_setting('afenda.tenant_id', true), '')::int);--> statement-breakpoint
CREATE POLICY "sales_sale_order_line_taxes_tenant_insert" ON "sales"."sale_order_line_taxes" AS PERMISSIVE FOR INSERT TO "app_user" WITH CHECK ("tenant_id" = NULLIF(current_setting('afenda.tenant_id', true), '')::int);--> statement-breakpoint
CREATE POLICY "sales_sale_order_line_taxes_tenant_update" ON "sales"."sale_order_line_taxes" AS PERMISSIVE FOR UPDATE TO "app_user" USING ("tenant_id" = NULLIF(current_setting('afenda.tenant_id', true), '')::int) WITH CHECK ("tenant_id" = NULLIF(current_setting('afenda.tenant_id', true), '')::int);--> statement-breakpoint
CREATE POLICY "sales_sale_order_line_taxes_tenant_delete" ON "sales"."sale_order_line_taxes" AS PERMISSIVE FOR DELETE TO "app_user" USING ("tenant_id" = NULLIF(current_setting('afenda.tenant_id', true), '')::int);--> statement-breakpoint
CREATE POLICY "sales_sale_order_line_taxes_service_bypass" ON "sales"."sale_order_line_taxes" AS PERMISSIVE FOR ALL TO "service_role" USING (true) WITH CHECK (true);--> statement-breakpoint
CREATE POLICY "sales_sale_order_option_lines_tenant_select" ON "sales"."sale_order_option_lines" AS PERMISSIVE FOR SELECT TO "app_user" USING ("tenant_id" = NULLIF(current_setting('afenda.tenant_id', true), '')::int);--> statement-breakpoint
CREATE POLICY "sales_sale_order_option_lines_tenant_insert" ON "sales"."sale_order_option_lines" AS PERMISSIVE FOR INSERT TO "app_user" WITH CHECK ("tenant_id" = NULLIF(current_setting('afenda.tenant_id', true), '')::int);--> statement-breakpoint
CREATE POLICY "sales_sale_order_option_lines_tenant_update" ON "sales"."sale_order_option_lines" AS PERMISSIVE FOR UPDATE TO "app_user" USING ("tenant_id" = NULLIF(current_setting('afenda.tenant_id', true), '')::int) WITH CHECK ("tenant_id" = NULLIF(current_setting('afenda.tenant_id', true), '')::int);--> statement-breakpoint
CREATE POLICY "sales_sale_order_option_lines_tenant_delete" ON "sales"."sale_order_option_lines" AS PERMISSIVE FOR DELETE TO "app_user" USING ("tenant_id" = NULLIF(current_setting('afenda.tenant_id', true), '')::int);--> statement-breakpoint
CREATE POLICY "sales_sale_order_option_lines_service_bypass" ON "sales"."sale_order_option_lines" AS PERMISSIVE FOR ALL TO "service_role" USING (true) WITH CHECK (true);--> statement-breakpoint
CREATE POLICY "sales_sale_order_status_history_tenant_select" ON "sales"."sale_order_status_history" AS PERMISSIVE FOR SELECT TO "app_user" USING ("tenant_id" = NULLIF(current_setting('afenda.tenant_id', true), '')::int);--> statement-breakpoint
CREATE POLICY "sales_sale_order_status_history_tenant_insert" ON "sales"."sale_order_status_history" AS PERMISSIVE FOR INSERT TO "app_user" WITH CHECK ("tenant_id" = NULLIF(current_setting('afenda.tenant_id', true), '')::int);--> statement-breakpoint
CREATE POLICY "sales_sale_order_status_history_tenant_update" ON "sales"."sale_order_status_history" AS PERMISSIVE FOR UPDATE TO "app_user" USING ("tenant_id" = NULLIF(current_setting('afenda.tenant_id', true), '')::int) WITH CHECK ("tenant_id" = NULLIF(current_setting('afenda.tenant_id', true), '')::int);--> statement-breakpoint
CREATE POLICY "sales_sale_order_status_history_tenant_delete" ON "sales"."sale_order_status_history" AS PERMISSIVE FOR DELETE TO "app_user" USING ("tenant_id" = NULLIF(current_setting('afenda.tenant_id', true), '')::int);--> statement-breakpoint
CREATE POLICY "sales_sale_order_status_history_service_bypass" ON "sales"."sale_order_status_history" AS PERMISSIVE FOR ALL TO "service_role" USING (true) WITH CHECK (true);--> statement-breakpoint
CREATE POLICY "sales_sale_order_tax_summary_tenant_select" ON "sales"."sale_order_tax_summary" AS PERMISSIVE FOR SELECT TO "app_user" USING ("tenant_id" = NULLIF(current_setting('afenda.tenant_id', true), '')::int);--> statement-breakpoint
CREATE POLICY "sales_sale_order_tax_summary_tenant_insert" ON "sales"."sale_order_tax_summary" AS PERMISSIVE FOR INSERT TO "app_user" WITH CHECK ("tenant_id" = NULLIF(current_setting('afenda.tenant_id', true), '')::int);--> statement-breakpoint
CREATE POLICY "sales_sale_order_tax_summary_tenant_update" ON "sales"."sale_order_tax_summary" AS PERMISSIVE FOR UPDATE TO "app_user" USING ("tenant_id" = NULLIF(current_setting('afenda.tenant_id', true), '')::int) WITH CHECK ("tenant_id" = NULLIF(current_setting('afenda.tenant_id', true), '')::int);--> statement-breakpoint
CREATE POLICY "sales_sale_order_tax_summary_tenant_delete" ON "sales"."sale_order_tax_summary" AS PERMISSIVE FOR DELETE TO "app_user" USING ("tenant_id" = NULLIF(current_setting('afenda.tenant_id', true), '')::int);--> statement-breakpoint
CREATE POLICY "sales_sale_order_tax_summary_service_bypass" ON "sales"."sale_order_tax_summary" AS PERMISSIVE FOR ALL TO "service_role" USING (true) WITH CHECK (true);--> statement-breakpoint
CREATE POLICY "sales_document_attachments_tenant_select" ON "sales"."document_attachments" AS PERMISSIVE FOR SELECT TO "app_user" USING ("tenant_id" = NULLIF(current_setting('afenda.tenant_id', true), '')::int);--> statement-breakpoint
CREATE POLICY "sales_document_attachments_tenant_insert" ON "sales"."document_attachments" AS PERMISSIVE FOR INSERT TO "app_user" WITH CHECK ("tenant_id" = NULLIF(current_setting('afenda.tenant_id', true), '')::int);--> statement-breakpoint
CREATE POLICY "sales_document_attachments_tenant_update" ON "sales"."document_attachments" AS PERMISSIVE FOR UPDATE TO "app_user" USING ("tenant_id" = NULLIF(current_setting('afenda.tenant_id', true), '')::int) WITH CHECK ("tenant_id" = NULLIF(current_setting('afenda.tenant_id', true), '')::int);--> statement-breakpoint
CREATE POLICY "sales_document_attachments_tenant_delete" ON "sales"."document_attachments" AS PERMISSIVE FOR DELETE TO "app_user" USING ("tenant_id" = NULLIF(current_setting('afenda.tenant_id', true), '')::int);--> statement-breakpoint
CREATE POLICY "sales_document_attachments_service_bypass" ON "sales"."document_attachments" AS PERMISSIVE FOR ALL TO "service_role" USING (true) WITH CHECK (true);--> statement-breakpoint
CREATE POLICY "sales_order_lines_tenant_select" ON "sales"."sales_order_lines" AS PERMISSIVE FOR SELECT TO "app_user" USING ("tenant_id" = NULLIF(current_setting('afenda.tenant_id', true), '')::int);--> statement-breakpoint
CREATE POLICY "sales_order_lines_tenant_insert" ON "sales"."sales_order_lines" AS PERMISSIVE FOR INSERT TO "app_user" WITH CHECK ("tenant_id" = NULLIF(current_setting('afenda.tenant_id', true), '')::int);--> statement-breakpoint
CREATE POLICY "sales_order_lines_tenant_update" ON "sales"."sales_order_lines" AS PERMISSIVE FOR UPDATE TO "app_user" USING ("tenant_id" = NULLIF(current_setting('afenda.tenant_id', true), '')::int) WITH CHECK ("tenant_id" = NULLIF(current_setting('afenda.tenant_id', true), '')::int);--> statement-breakpoint
CREATE POLICY "sales_order_lines_tenant_delete" ON "sales"."sales_order_lines" AS PERMISSIVE FOR DELETE TO "app_user" USING ("tenant_id" = NULLIF(current_setting('afenda.tenant_id', true), '')::int);--> statement-breakpoint
CREATE POLICY "sales_order_lines_service_bypass" ON "sales"."sales_order_lines" AS PERMISSIVE FOR ALL TO "service_role" USING (true) WITH CHECK (true);--> statement-breakpoint
CREATE POLICY "sales_orders_tenant_select" ON "sales"."sales_orders" AS PERMISSIVE FOR SELECT TO "app_user" USING ("tenant_id" = NULLIF(current_setting('afenda.tenant_id', true), '')::int);--> statement-breakpoint
CREATE POLICY "sales_orders_tenant_insert" ON "sales"."sales_orders" AS PERMISSIVE FOR INSERT TO "app_user" WITH CHECK ("tenant_id" = NULLIF(current_setting('afenda.tenant_id', true), '')::int);--> statement-breakpoint
CREATE POLICY "sales_orders_tenant_update" ON "sales"."sales_orders" AS PERMISSIVE FOR UPDATE TO "app_user" USING ("tenant_id" = NULLIF(current_setting('afenda.tenant_id', true), '')::int) WITH CHECK ("tenant_id" = NULLIF(current_setting('afenda.tenant_id', true), '')::int);--> statement-breakpoint
CREATE POLICY "sales_orders_tenant_delete" ON "sales"."sales_orders" AS PERMISSIVE FOR DELETE TO "app_user" USING ("tenant_id" = NULLIF(current_setting('afenda.tenant_id', true), '')::int);--> statement-breakpoint
CREATE POLICY "sales_orders_service_bypass" ON "sales"."sales_orders" AS PERMISSIVE FOR ALL TO "service_role" USING (true) WITH CHECK (true);--> statement-breakpoint
CREATE POLICY "sales_sales_team_members_tenant_select" ON "sales"."sales_team_members" AS PERMISSIVE FOR SELECT TO "app_user" USING ("tenant_id" = NULLIF(current_setting('afenda.tenant_id', true), '')::int);--> statement-breakpoint
CREATE POLICY "sales_sales_team_members_tenant_insert" ON "sales"."sales_team_members" AS PERMISSIVE FOR INSERT TO "app_user" WITH CHECK ("tenant_id" = NULLIF(current_setting('afenda.tenant_id', true), '')::int);--> statement-breakpoint
CREATE POLICY "sales_sales_team_members_tenant_update" ON "sales"."sales_team_members" AS PERMISSIVE FOR UPDATE TO "app_user" USING ("tenant_id" = NULLIF(current_setting('afenda.tenant_id', true), '')::int) WITH CHECK ("tenant_id" = NULLIF(current_setting('afenda.tenant_id', true), '')::int);--> statement-breakpoint
CREATE POLICY "sales_sales_team_members_tenant_delete" ON "sales"."sales_team_members" AS PERMISSIVE FOR DELETE TO "app_user" USING ("tenant_id" = NULLIF(current_setting('afenda.tenant_id', true), '')::int);--> statement-breakpoint
CREATE POLICY "sales_sales_team_members_service_bypass" ON "sales"."sales_team_members" AS PERMISSIVE FOR ALL TO "service_role" USING (true) WITH CHECK (true);--> statement-breakpoint
CREATE POLICY "sales_sales_teams_tenant_select" ON "sales"."sales_teams" AS PERMISSIVE FOR SELECT TO "app_user" USING ("tenant_id" = NULLIF(current_setting('afenda.tenant_id', true), '')::int);--> statement-breakpoint
CREATE POLICY "sales_sales_teams_tenant_insert" ON "sales"."sales_teams" AS PERMISSIVE FOR INSERT TO "app_user" WITH CHECK ("tenant_id" = NULLIF(current_setting('afenda.tenant_id', true), '')::int);--> statement-breakpoint
CREATE POLICY "sales_sales_teams_tenant_update" ON "sales"."sales_teams" AS PERMISSIVE FOR UPDATE TO "app_user" USING ("tenant_id" = NULLIF(current_setting('afenda.tenant_id', true), '')::int) WITH CHECK ("tenant_id" = NULLIF(current_setting('afenda.tenant_id', true), '')::int);--> statement-breakpoint
CREATE POLICY "sales_sales_teams_tenant_delete" ON "sales"."sales_teams" AS PERMISSIVE FOR DELETE TO "app_user" USING ("tenant_id" = NULLIF(current_setting('afenda.tenant_id', true), '')::int);--> statement-breakpoint
CREATE POLICY "sales_sales_teams_service_bypass" ON "sales"."sales_teams" AS PERMISSIVE FOR ALL TO "service_role" USING (true) WITH CHECK (true);--> statement-breakpoint
CREATE POLICY "sales_subscription_close_reasons_tenant_select" ON "sales"."subscription_close_reasons" AS PERMISSIVE FOR SELECT TO "app_user" USING ("tenant_id" = NULLIF(current_setting('afenda.tenant_id', true), '')::int);--> statement-breakpoint
CREATE POLICY "sales_subscription_close_reasons_tenant_insert" ON "sales"."subscription_close_reasons" AS PERMISSIVE FOR INSERT TO "app_user" WITH CHECK ("tenant_id" = NULLIF(current_setting('afenda.tenant_id', true), '')::int);--> statement-breakpoint
CREATE POLICY "sales_subscription_close_reasons_tenant_update" ON "sales"."subscription_close_reasons" AS PERMISSIVE FOR UPDATE TO "app_user" USING ("tenant_id" = NULLIF(current_setting('afenda.tenant_id', true), '')::int) WITH CHECK ("tenant_id" = NULLIF(current_setting('afenda.tenant_id', true), '')::int);--> statement-breakpoint
CREATE POLICY "sales_subscription_close_reasons_tenant_delete" ON "sales"."subscription_close_reasons" AS PERMISSIVE FOR DELETE TO "app_user" USING ("tenant_id" = NULLIF(current_setting('afenda.tenant_id', true), '')::int);--> statement-breakpoint
CREATE POLICY "sales_subscription_close_reasons_service_bypass" ON "sales"."subscription_close_reasons" AS PERMISSIVE FOR ALL TO "service_role" USING (true) WITH CHECK (true);--> statement-breakpoint
CREATE POLICY "sales_subscription_lines_tenant_select" ON "sales"."subscription_lines" AS PERMISSIVE FOR SELECT TO "app_user" USING ("tenant_id" = NULLIF(current_setting('afenda.tenant_id', true), '')::int);--> statement-breakpoint
CREATE POLICY "sales_subscription_lines_tenant_insert" ON "sales"."subscription_lines" AS PERMISSIVE FOR INSERT TO "app_user" WITH CHECK ("tenant_id" = NULLIF(current_setting('afenda.tenant_id', true), '')::int);--> statement-breakpoint
CREATE POLICY "sales_subscription_lines_tenant_update" ON "sales"."subscription_lines" AS PERMISSIVE FOR UPDATE TO "app_user" USING ("tenant_id" = NULLIF(current_setting('afenda.tenant_id', true), '')::int) WITH CHECK ("tenant_id" = NULLIF(current_setting('afenda.tenant_id', true), '')::int);--> statement-breakpoint
CREATE POLICY "sales_subscription_lines_tenant_delete" ON "sales"."subscription_lines" AS PERMISSIVE FOR DELETE TO "app_user" USING ("tenant_id" = NULLIF(current_setting('afenda.tenant_id', true), '')::int);--> statement-breakpoint
CREATE POLICY "sales_subscription_lines_service_bypass" ON "sales"."subscription_lines" AS PERMISSIVE FOR ALL TO "service_role" USING (true) WITH CHECK (true);--> statement-breakpoint
CREATE POLICY "sales_subscription_logs_tenant_select" ON "sales"."subscription_logs" AS PERMISSIVE FOR SELECT TO "app_user" USING ("tenant_id" = NULLIF(current_setting('afenda.tenant_id', true), '')::int);--> statement-breakpoint
CREATE POLICY "sales_subscription_logs_tenant_insert" ON "sales"."subscription_logs" AS PERMISSIVE FOR INSERT TO "app_user" WITH CHECK ("tenant_id" = NULLIF(current_setting('afenda.tenant_id', true), '')::int);--> statement-breakpoint
CREATE POLICY "sales_subscription_logs_tenant_update" ON "sales"."subscription_logs" AS PERMISSIVE FOR UPDATE TO "app_user" USING ("tenant_id" = NULLIF(current_setting('afenda.tenant_id', true), '')::int) WITH CHECK ("tenant_id" = NULLIF(current_setting('afenda.tenant_id', true), '')::int);--> statement-breakpoint
CREATE POLICY "sales_subscription_logs_tenant_delete" ON "sales"."subscription_logs" AS PERMISSIVE FOR DELETE TO "app_user" USING ("tenant_id" = NULLIF(current_setting('afenda.tenant_id', true), '')::int);--> statement-breakpoint
CREATE POLICY "sales_subscription_logs_service_bypass" ON "sales"."subscription_logs" AS PERMISSIVE FOR ALL TO "service_role" USING (true) WITH CHECK (true);--> statement-breakpoint
CREATE POLICY "sales_subscription_templates_tenant_select" ON "sales"."subscription_templates" AS PERMISSIVE FOR SELECT TO "app_user" USING ("tenant_id" = NULLIF(current_setting('afenda.tenant_id', true), '')::int);--> statement-breakpoint
CREATE POLICY "sales_subscription_templates_tenant_insert" ON "sales"."subscription_templates" AS PERMISSIVE FOR INSERT TO "app_user" WITH CHECK ("tenant_id" = NULLIF(current_setting('afenda.tenant_id', true), '')::int);--> statement-breakpoint
CREATE POLICY "sales_subscription_templates_tenant_update" ON "sales"."subscription_templates" AS PERMISSIVE FOR UPDATE TO "app_user" USING ("tenant_id" = NULLIF(current_setting('afenda.tenant_id', true), '')::int) WITH CHECK ("tenant_id" = NULLIF(current_setting('afenda.tenant_id', true), '')::int);--> statement-breakpoint
CREATE POLICY "sales_subscription_templates_tenant_delete" ON "sales"."subscription_templates" AS PERMISSIVE FOR DELETE TO "app_user" USING ("tenant_id" = NULLIF(current_setting('afenda.tenant_id', true), '')::int);--> statement-breakpoint
CREATE POLICY "sales_subscription_templates_service_bypass" ON "sales"."subscription_templates" AS PERMISSIVE FOR ALL TO "service_role" USING (true) WITH CHECK (true);--> statement-breakpoint
CREATE POLICY "sales_subscriptions_tenant_select" ON "sales"."subscriptions" AS PERMISSIVE FOR SELECT TO "app_user" USING ("tenant_id" = NULLIF(current_setting('afenda.tenant_id', true), '')::int);--> statement-breakpoint
CREATE POLICY "sales_subscriptions_tenant_insert" ON "sales"."subscriptions" AS PERMISSIVE FOR INSERT TO "app_user" WITH CHECK ("tenant_id" = NULLIF(current_setting('afenda.tenant_id', true), '')::int);--> statement-breakpoint
CREATE POLICY "sales_subscriptions_tenant_update" ON "sales"."subscriptions" AS PERMISSIVE FOR UPDATE TO "app_user" USING ("tenant_id" = NULLIF(current_setting('afenda.tenant_id', true), '')::int) WITH CHECK ("tenant_id" = NULLIF(current_setting('afenda.tenant_id', true), '')::int);--> statement-breakpoint
CREATE POLICY "sales_subscriptions_tenant_delete" ON "sales"."subscriptions" AS PERMISSIVE FOR DELETE TO "app_user" USING ("tenant_id" = NULLIF(current_setting('afenda.tenant_id', true), '')::int);--> statement-breakpoint
CREATE POLICY "sales_subscriptions_service_bypass" ON "sales"."subscriptions" AS PERMISSIVE FOR ALL TO "service_role" USING (true) WITH CHECK (true);--> statement-breakpoint
CREATE POLICY "sales_tax_groups_tenant_select" ON "sales"."tax_groups" AS PERMISSIVE FOR SELECT TO "app_user" USING ("tenant_id" = NULLIF(current_setting('afenda.tenant_id', true), '')::int);--> statement-breakpoint
CREATE POLICY "sales_tax_groups_tenant_insert" ON "sales"."tax_groups" AS PERMISSIVE FOR INSERT TO "app_user" WITH CHECK ("tenant_id" = NULLIF(current_setting('afenda.tenant_id', true), '')::int);--> statement-breakpoint
CREATE POLICY "sales_tax_groups_tenant_update" ON "sales"."tax_groups" AS PERMISSIVE FOR UPDATE TO "app_user" USING ("tenant_id" = NULLIF(current_setting('afenda.tenant_id', true), '')::int) WITH CHECK ("tenant_id" = NULLIF(current_setting('afenda.tenant_id', true), '')::int);--> statement-breakpoint
CREATE POLICY "sales_tax_groups_tenant_delete" ON "sales"."tax_groups" AS PERMISSIVE FOR DELETE TO "app_user" USING ("tenant_id" = NULLIF(current_setting('afenda.tenant_id', true), '')::int);--> statement-breakpoint
CREATE POLICY "sales_tax_groups_service_bypass" ON "sales"."tax_groups" AS PERMISSIVE FOR ALL TO "service_role" USING (true) WITH CHECK (true);--> statement-breakpoint
CREATE POLICY "sales_tax_rate_children_tenant_select" ON "sales"."tax_rate_children" AS PERMISSIVE FOR SELECT TO "app_user" USING ("tenant_id" = NULLIF(current_setting('afenda.tenant_id', true), '')::int);--> statement-breakpoint
CREATE POLICY "sales_tax_rate_children_tenant_insert" ON "sales"."tax_rate_children" AS PERMISSIVE FOR INSERT TO "app_user" WITH CHECK ("tenant_id" = NULLIF(current_setting('afenda.tenant_id', true), '')::int);--> statement-breakpoint
CREATE POLICY "sales_tax_rate_children_tenant_update" ON "sales"."tax_rate_children" AS PERMISSIVE FOR UPDATE TO "app_user" USING ("tenant_id" = NULLIF(current_setting('afenda.tenant_id', true), '')::int) WITH CHECK ("tenant_id" = NULLIF(current_setting('afenda.tenant_id', true), '')::int);--> statement-breakpoint
CREATE POLICY "sales_tax_rate_children_tenant_delete" ON "sales"."tax_rate_children" AS PERMISSIVE FOR DELETE TO "app_user" USING ("tenant_id" = NULLIF(current_setting('afenda.tenant_id', true), '')::int);--> statement-breakpoint
CREATE POLICY "sales_tax_rate_children_service_bypass" ON "sales"."tax_rate_children" AS PERMISSIVE FOR ALL TO "service_role" USING (true) WITH CHECK (true);--> statement-breakpoint
CREATE POLICY "sales_tax_rates_tenant_select" ON "sales"."tax_rates" AS PERMISSIVE FOR SELECT TO "app_user" USING ("tenant_id" = NULLIF(current_setting('afenda.tenant_id', true), '')::int);--> statement-breakpoint
CREATE POLICY "sales_tax_rates_tenant_insert" ON "sales"."tax_rates" AS PERMISSIVE FOR INSERT TO "app_user" WITH CHECK ("tenant_id" = NULLIF(current_setting('afenda.tenant_id', true), '')::int);--> statement-breakpoint
CREATE POLICY "sales_tax_rates_tenant_update" ON "sales"."tax_rates" AS PERMISSIVE FOR UPDATE TO "app_user" USING ("tenant_id" = NULLIF(current_setting('afenda.tenant_id', true), '')::int) WITH CHECK ("tenant_id" = NULLIF(current_setting('afenda.tenant_id', true), '')::int);--> statement-breakpoint
CREATE POLICY "sales_tax_rates_tenant_delete" ON "sales"."tax_rates" AS PERMISSIVE FOR DELETE TO "app_user" USING ("tenant_id" = NULLIF(current_setting('afenda.tenant_id', true), '')::int);--> statement-breakpoint
CREATE POLICY "sales_tax_rates_service_bypass" ON "sales"."tax_rates" AS PERMISSIVE FOR ALL TO "service_role" USING (true) WITH CHECK (true);--> statement-breakpoint
CREATE POLICY "sales_territories_tenant_select" ON "sales"."territories" AS PERMISSIVE FOR SELECT TO "app_user" USING ("tenant_id" = NULLIF(current_setting('afenda.tenant_id', true), '')::int);--> statement-breakpoint
CREATE POLICY "sales_territories_tenant_insert" ON "sales"."territories" AS PERMISSIVE FOR INSERT TO "app_user" WITH CHECK ("tenant_id" = NULLIF(current_setting('afenda.tenant_id', true), '')::int);--> statement-breakpoint
CREATE POLICY "sales_territories_tenant_update" ON "sales"."territories" AS PERMISSIVE FOR UPDATE TO "app_user" USING ("tenant_id" = NULLIF(current_setting('afenda.tenant_id', true), '')::int) WITH CHECK ("tenant_id" = NULLIF(current_setting('afenda.tenant_id', true), '')::int);--> statement-breakpoint
CREATE POLICY "sales_territories_tenant_delete" ON "sales"."territories" AS PERMISSIVE FOR DELETE TO "app_user" USING ("tenant_id" = NULLIF(current_setting('afenda.tenant_id', true), '')::int);--> statement-breakpoint
CREATE POLICY "sales_territories_service_bypass" ON "sales"."territories" AS PERMISSIVE FOR ALL TO "service_role" USING (true) WITH CHECK (true);--> statement-breakpoint
CREATE POLICY "sales_territory_rules_tenant_select" ON "sales"."territory_rules" AS PERMISSIVE FOR SELECT TO "app_user" USING ("tenant_id" = NULLIF(current_setting('afenda.tenant_id', true), '')::int);--> statement-breakpoint
CREATE POLICY "sales_territory_rules_tenant_insert" ON "sales"."territory_rules" AS PERMISSIVE FOR INSERT TO "app_user" WITH CHECK ("tenant_id" = NULLIF(current_setting('afenda.tenant_id', true), '')::int);--> statement-breakpoint
CREATE POLICY "sales_territory_rules_tenant_update" ON "sales"."territory_rules" AS PERMISSIVE FOR UPDATE TO "app_user" USING ("tenant_id" = NULLIF(current_setting('afenda.tenant_id', true), '')::int) WITH CHECK ("tenant_id" = NULLIF(current_setting('afenda.tenant_id', true), '')::int);--> statement-breakpoint
CREATE POLICY "sales_territory_rules_tenant_delete" ON "sales"."territory_rules" AS PERMISSIVE FOR DELETE TO "app_user" USING ("tenant_id" = NULLIF(current_setting('afenda.tenant_id', true), '')::int);--> statement-breakpoint
CREATE POLICY "sales_territory_rules_service_bypass" ON "sales"."territory_rules" AS PERMISSIVE FOR ALL TO "service_role" USING (true) WITH CHECK (true);