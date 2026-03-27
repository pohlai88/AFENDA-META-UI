ALTER TYPE "sales"."domain_event_type" ADD VALUE 'ORDER_MUTATED';--> statement-breakpoint
ALTER TYPE "sales"."domain_event_type" ADD VALUE 'ORDER_DELETED';--> statement-breakpoint
ALTER TYPE "sales"."domain_event_type" ADD VALUE 'SUBSCRIPTION_MUTATED';--> statement-breakpoint
ALTER TYPE "sales"."domain_event_type" ADD VALUE 'SUBSCRIPTION_DELETED';--> statement-breakpoint
ALTER TYPE "sales"."domain_event_type" ADD VALUE 'COMMISSION_ENTRY_MUTATED';--> statement-breakpoint
ALTER TYPE "sales"."domain_event_type" ADD VALUE 'COMMISSION_ENTRY_DELETED';--> statement-breakpoint
ALTER TYPE "sales"."domain_event_type" ADD VALUE 'RETURN_ORDER_MUTATED';--> statement-breakpoint
ALTER TYPE "sales"."domain_event_type" ADD VALUE 'RETURN_ORDER_DELETED';--> statement-breakpoint
ALTER TYPE "sales"."domain_event_type" ADD VALUE 'CONSIGNMENT_AGREEMENT_MUTATED';--> statement-breakpoint
ALTER TYPE "sales"."domain_event_type" ADD VALUE 'CONSIGNMENT_AGREEMENT_DELETED';
