CREATE INDEX IF NOT EXISTS "user_roles_tenant_expires_idx" ON "security"."user_roles" ("tenantId","expiresAt");--> statement-breakpoint

-- Rollback: DROP INDEX IF EXISTS "security"."user_roles_tenant_expires_idx";
