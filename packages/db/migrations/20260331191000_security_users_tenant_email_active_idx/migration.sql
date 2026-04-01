CREATE INDEX IF NOT EXISTS "users_tenant_email_active_idx" ON "security"."users" ("tenantId","email") WHERE "deleted_at" IS NULL;--> statement-breakpoint

-- Rollback: DROP INDEX IF EXISTS "security"."users_tenant_email_active_idx";
