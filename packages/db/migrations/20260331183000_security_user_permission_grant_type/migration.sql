CREATE TYPE "security"."permission_grant_type" AS ENUM('GRANT', 'DENY');--> statement-breakpoint
ALTER TABLE "security"."user_permissions" ADD COLUMN "grant_type" "security"."permission_grant_type" DEFAULT 'GRANT' NOT NULL;--> statement-breakpoint

-- Rollback (run manually if reverting this migration):
-- ALTER TABLE "security"."user_permissions" DROP COLUMN IF EXISTS "grant_type";
-- DROP TYPE IF EXISTS "security"."permission_grant_type";
