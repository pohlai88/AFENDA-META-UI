-- Security domain: composite tenant-safe FKs, supporting unique indexes, CHECK on user_roles,
-- RLS + service bypass on all tenant-scoped security tables (Drizzle: packages/db/src/schema/security).
-- Idempotent: safe to re-run when objects already exist.

-- ---------------------------------------------------------------------------
-- 1) Drop legacy single-column FKs (replaced by tenant + id composites)
-- ---------------------------------------------------------------------------
ALTER TABLE "security"."users" DROP CONSTRAINT IF EXISTS "fk_users_created_by_user";
ALTER TABLE "security"."users" DROP CONSTRAINT IF EXISTS "fk_users_updated_by_user";

-- Drizzle `.references()` on audit columns (names vary by kit version)
ALTER TABLE "security"."roles" DROP CONSTRAINT IF EXISTS "roles_created_by_users_userId_fk";
ALTER TABLE "security"."roles" DROP CONSTRAINT IF EXISTS "roles_updated_by_users_userId_fk";

ALTER TABLE "security"."permissions" DROP CONSTRAINT IF EXISTS "permissions_created_by_users_userId_fk";
ALTER TABLE "security"."permissions" DROP CONSTRAINT IF EXISTS "permissions_updated_by_users_userId_fk";

ALTER TABLE "security"."role_permissions" DROP CONSTRAINT IF EXISTS "role_permissions_created_by_users_userId_fk";
ALTER TABLE "security"."role_permissions" DROP CONSTRAINT IF EXISTS "role_permissions_updated_by_users_userId_fk";

ALTER TABLE "security"."role_permissions" DROP CONSTRAINT IF EXISTS "fk_role_permissions_role";
ALTER TABLE "security"."role_permissions" DROP CONSTRAINT IF EXISTS "fk_role_permissions_permission";

ALTER TABLE "security"."user_permissions" DROP CONSTRAINT IF EXISTS "user_permissions_created_by_users_userId_fk";
ALTER TABLE "security"."user_permissions" DROP CONSTRAINT IF EXISTS "user_permissions_updated_by_users_userId_fk";

ALTER TABLE "security"."user_permissions" DROP CONSTRAINT IF EXISTS "fk_user_permissions_user";
ALTER TABLE "security"."user_permissions" DROP CONSTRAINT IF EXISTS "fk_user_permissions_permission";

ALTER TABLE "security"."user_roles" DROP CONSTRAINT IF EXISTS "fk_user_roles_user";
ALTER TABLE "security"."user_roles" DROP CONSTRAINT IF EXISTS "fk_user_roles_role";
ALTER TABLE "security"."user_roles" DROP CONSTRAINT IF EXISTS "fk_user_roles_assigned_by";

-- If a previous partial run added composites, drop before re-adding
ALTER TABLE "security"."users" DROP CONSTRAINT IF EXISTS "fk_users_created_by_user_tenant";
ALTER TABLE "security"."users" DROP CONSTRAINT IF EXISTS "fk_users_updated_by_user_tenant";
ALTER TABLE "security"."roles" DROP CONSTRAINT IF EXISTS "fk_roles_created_by_user_tenant";
ALTER TABLE "security"."roles" DROP CONSTRAINT IF EXISTS "fk_roles_updated_by_user_tenant";
ALTER TABLE "security"."role_permissions" DROP CONSTRAINT IF EXISTS "fk_role_permissions_role_tenant";
ALTER TABLE "security"."role_permissions" DROP CONSTRAINT IF EXISTS "fk_role_permissions_permission_tenant";
ALTER TABLE "security"."role_permissions" DROP CONSTRAINT IF EXISTS "fk_role_permissions_created_by_user_tenant";
ALTER TABLE "security"."role_permissions" DROP CONSTRAINT IF EXISTS "fk_role_permissions_updated_by_user_tenant";
ALTER TABLE "security"."user_permissions" DROP CONSTRAINT IF EXISTS "fk_user_permissions_user_tenant";
ALTER TABLE "security"."user_permissions" DROP CONSTRAINT IF EXISTS "fk_user_permissions_permission_tenant";
ALTER TABLE "security"."user_permissions" DROP CONSTRAINT IF EXISTS "fk_user_permissions_created_by_user_tenant";
ALTER TABLE "security"."user_permissions" DROP CONSTRAINT IF EXISTS "fk_user_permissions_updated_by_user_tenant";
ALTER TABLE "security"."user_roles" DROP CONSTRAINT IF EXISTS "fk_user_roles_user_tenant";
ALTER TABLE "security"."user_roles" DROP CONSTRAINT IF EXISTS "fk_user_roles_role_tenant";
ALTER TABLE "security"."user_roles" DROP CONSTRAINT IF EXISTS "fk_user_roles_assigned_by_tenant";

-- ---------------------------------------------------------------------------
-- 2) Supporting unique indexes for composite FK targets
-- ---------------------------------------------------------------------------
CREATE UNIQUE INDEX IF NOT EXISTS "users_tenant_user_id_unique"
  ON "security"."users" ("tenantId", "userId");

CREATE UNIQUE INDEX IF NOT EXISTS "roles_tenant_role_id_unique"
  ON "security"."roles" ("tenantId", "roleId");

CREATE UNIQUE INDEX IF NOT EXISTS "permissions_tenant_permission_id_unique"
  ON "security"."permissions" ("tenantId", "permissionId");

-- ---------------------------------------------------------------------------
-- 3) Composite foreign keys
-- ---------------------------------------------------------------------------
ALTER TABLE "security"."users"
  ADD CONSTRAINT "fk_users_created_by_user_tenant"
  FOREIGN KEY ("tenantId", "created_by") REFERENCES "security"."users" ("tenantId", "userId")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "security"."users"
  ADD CONSTRAINT "fk_users_updated_by_user_tenant"
  FOREIGN KEY ("tenantId", "updated_by") REFERENCES "security"."users" ("tenantId", "userId")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "security"."roles"
  ADD CONSTRAINT "fk_roles_created_by_user_tenant"
  FOREIGN KEY ("tenantId", "created_by") REFERENCES "security"."users" ("tenantId", "userId")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "security"."roles"
  ADD CONSTRAINT "fk_roles_updated_by_user_tenant"
  FOREIGN KEY ("tenantId", "updated_by") REFERENCES "security"."users" ("tenantId", "userId")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "security"."role_permissions"
  ADD CONSTRAINT "fk_role_permissions_role_tenant"
  FOREIGN KEY ("tenantId", "roleId") REFERENCES "security"."roles" ("tenantId", "roleId")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "security"."role_permissions"
  ADD CONSTRAINT "fk_role_permissions_permission_tenant"
  FOREIGN KEY ("tenantId", "permissionId") REFERENCES "security"."permissions" ("tenantId", "permissionId")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "security"."role_permissions"
  ADD CONSTRAINT "fk_role_permissions_created_by_user_tenant"
  FOREIGN KEY ("tenantId", "created_by") REFERENCES "security"."users" ("tenantId", "userId")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "security"."role_permissions"
  ADD CONSTRAINT "fk_role_permissions_updated_by_user_tenant"
  FOREIGN KEY ("tenantId", "updated_by") REFERENCES "security"."users" ("tenantId", "userId")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "security"."user_permissions"
  ADD CONSTRAINT "fk_user_permissions_user_tenant"
  FOREIGN KEY ("tenantId", "userId") REFERENCES "security"."users" ("tenantId", "userId")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "security"."user_permissions"
  ADD CONSTRAINT "fk_user_permissions_permission_tenant"
  FOREIGN KEY ("tenantId", "permissionId") REFERENCES "security"."permissions" ("tenantId", "permissionId")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "security"."user_permissions"
  ADD CONSTRAINT "fk_user_permissions_created_by_user_tenant"
  FOREIGN KEY ("tenantId", "created_by") REFERENCES "security"."users" ("tenantId", "userId")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "security"."user_permissions"
  ADD CONSTRAINT "fk_user_permissions_updated_by_user_tenant"
  FOREIGN KEY ("tenantId", "updated_by") REFERENCES "security"."users" ("tenantId", "userId")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "security"."user_roles"
  ADD CONSTRAINT "fk_user_roles_user_tenant"
  FOREIGN KEY ("tenantId", "userId") REFERENCES "security"."users" ("tenantId", "userId")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "security"."user_roles"
  ADD CONSTRAINT "fk_user_roles_role_tenant"
  FOREIGN KEY ("tenantId", "roleId") REFERENCES "security"."roles" ("tenantId", "roleId")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "security"."user_roles"
  ADD CONSTRAINT "fk_user_roles_assigned_by_tenant"
  FOREIGN KEY ("tenantId", "assignedBy") REFERENCES "security"."users" ("tenantId", "userId")
  ON DELETE RESTRICT ON UPDATE CASCADE;

-- ---------------------------------------------------------------------------
-- 4) user_roles: expires after assigned_at (matches Drizzle check)
-- ---------------------------------------------------------------------------
ALTER TABLE "security"."user_roles" DROP CONSTRAINT IF EXISTS "user_roles_expires_after_assigned";
ALTER TABLE "security"."user_roles"
  ADD CONSTRAINT "user_roles_expires_after_assigned" CHECK (
    "expiresAt" IS NULL OR "expiresAt" > "assignedAt"
  );

-- ---------------------------------------------------------------------------
-- 5) RLS + service bypass (tenant column = "tenantId" for security.*)
-- ---------------------------------------------------------------------------
ALTER TABLE "security"."roles" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "security"."permissions" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "security"."role_permissions" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "security"."user_permissions" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "security"."user_roles" ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  -- roles
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'security' AND tablename = 'roles' AND policyname = 'roles_tenant_select') THEN
    CREATE POLICY "roles_tenant_select" ON "security"."roles" AS PERMISSIVE FOR SELECT TO "app_user"
      USING ("tenantId" = NULLIF(current_setting('afenda.tenant_id', true), '')::int);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'security' AND tablename = 'roles' AND policyname = 'roles_tenant_insert') THEN
    CREATE POLICY "roles_tenant_insert" ON "security"."roles" AS PERMISSIVE FOR INSERT TO "app_user"
      WITH CHECK ("tenantId" = NULLIF(current_setting('afenda.tenant_id', true), '')::int);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'security' AND tablename = 'roles' AND policyname = 'roles_tenant_update') THEN
    CREATE POLICY "roles_tenant_update" ON "security"."roles" AS PERMISSIVE FOR UPDATE TO "app_user"
      USING ("tenantId" = NULLIF(current_setting('afenda.tenant_id', true), '')::int)
      WITH CHECK ("tenantId" = NULLIF(current_setting('afenda.tenant_id', true), '')::int);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'security' AND tablename = 'roles' AND policyname = 'roles_tenant_delete') THEN
    CREATE POLICY "roles_tenant_delete" ON "security"."roles" AS PERMISSIVE FOR DELETE TO "app_user"
      USING ("tenantId" = NULLIF(current_setting('afenda.tenant_id', true), '')::int);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'security' AND tablename = 'roles' AND policyname = 'roles_service_bypass') THEN
    CREATE POLICY "roles_service_bypass" ON "security"."roles" AS PERMISSIVE FOR ALL TO "service_role" USING (true) WITH CHECK (true);
  END IF;

  -- permissions
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'security' AND tablename = 'permissions' AND policyname = 'permissions_tenant_select') THEN
    CREATE POLICY "permissions_tenant_select" ON "security"."permissions" AS PERMISSIVE FOR SELECT TO "app_user"
      USING ("tenantId" = NULLIF(current_setting('afenda.tenant_id', true), '')::int);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'security' AND tablename = 'permissions' AND policyname = 'permissions_tenant_insert') THEN
    CREATE POLICY "permissions_tenant_insert" ON "security"."permissions" AS PERMISSIVE FOR INSERT TO "app_user"
      WITH CHECK ("tenantId" = NULLIF(current_setting('afenda.tenant_id', true), '')::int);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'security' AND tablename = 'permissions' AND policyname = 'permissions_tenant_update') THEN
    CREATE POLICY "permissions_tenant_update" ON "security"."permissions" AS PERMISSIVE FOR UPDATE TO "app_user"
      USING ("tenantId" = NULLIF(current_setting('afenda.tenant_id', true), '')::int)
      WITH CHECK ("tenantId" = NULLIF(current_setting('afenda.tenant_id', true), '')::int);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'security' AND tablename = 'permissions' AND policyname = 'permissions_tenant_delete') THEN
    CREATE POLICY "permissions_tenant_delete" ON "security"."permissions" AS PERMISSIVE FOR DELETE TO "app_user"
      USING ("tenantId" = NULLIF(current_setting('afenda.tenant_id', true), '')::int);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'security' AND tablename = 'permissions' AND policyname = 'permissions_service_bypass') THEN
    CREATE POLICY "permissions_service_bypass" ON "security"."permissions" AS PERMISSIVE FOR ALL TO "service_role" USING (true) WITH CHECK (true);
  END IF;

  -- role_permissions
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'security' AND tablename = 'role_permissions' AND policyname = 'role_permissions_tenant_select') THEN
    CREATE POLICY "role_permissions_tenant_select" ON "security"."role_permissions" AS PERMISSIVE FOR SELECT TO "app_user"
      USING ("tenantId" = NULLIF(current_setting('afenda.tenant_id', true), '')::int);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'security' AND tablename = 'role_permissions' AND policyname = 'role_permissions_tenant_insert') THEN
    CREATE POLICY "role_permissions_tenant_insert" ON "security"."role_permissions" AS PERMISSIVE FOR INSERT TO "app_user"
      WITH CHECK ("tenantId" = NULLIF(current_setting('afenda.tenant_id', true), '')::int);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'security' AND tablename = 'role_permissions' AND policyname = 'role_permissions_tenant_update') THEN
    CREATE POLICY "role_permissions_tenant_update" ON "security"."role_permissions" AS PERMISSIVE FOR UPDATE TO "app_user"
      USING ("tenantId" = NULLIF(current_setting('afenda.tenant_id', true), '')::int)
      WITH CHECK ("tenantId" = NULLIF(current_setting('afenda.tenant_id', true), '')::int);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'security' AND tablename = 'role_permissions' AND policyname = 'role_permissions_tenant_delete') THEN
    CREATE POLICY "role_permissions_tenant_delete" ON "security"."role_permissions" AS PERMISSIVE FOR DELETE TO "app_user"
      USING ("tenantId" = NULLIF(current_setting('afenda.tenant_id', true), '')::int);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'security' AND tablename = 'role_permissions' AND policyname = 'role_permissions_service_bypass') THEN
    CREATE POLICY "role_permissions_service_bypass" ON "security"."role_permissions" AS PERMISSIVE FOR ALL TO "service_role" USING (true) WITH CHECK (true);
  END IF;

  -- user_permissions
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'security' AND tablename = 'user_permissions' AND policyname = 'user_permissions_tenant_select') THEN
    CREATE POLICY "user_permissions_tenant_select" ON "security"."user_permissions" AS PERMISSIVE FOR SELECT TO "app_user"
      USING ("tenantId" = NULLIF(current_setting('afenda.tenant_id', true), '')::int);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'security' AND tablename = 'user_permissions' AND policyname = 'user_permissions_tenant_insert') THEN
    CREATE POLICY "user_permissions_tenant_insert" ON "security"."user_permissions" AS PERMISSIVE FOR INSERT TO "app_user"
      WITH CHECK ("tenantId" = NULLIF(current_setting('afenda.tenant_id', true), '')::int);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'security' AND tablename = 'user_permissions' AND policyname = 'user_permissions_tenant_update') THEN
    CREATE POLICY "user_permissions_tenant_update" ON "security"."user_permissions" AS PERMISSIVE FOR UPDATE TO "app_user"
      USING ("tenantId" = NULLIF(current_setting('afenda.tenant_id', true), '')::int)
      WITH CHECK ("tenantId" = NULLIF(current_setting('afenda.tenant_id', true), '')::int);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'security' AND tablename = 'user_permissions' AND policyname = 'user_permissions_tenant_delete') THEN
    CREATE POLICY "user_permissions_tenant_delete" ON "security"."user_permissions" AS PERMISSIVE FOR DELETE TO "app_user"
      USING ("tenantId" = NULLIF(current_setting('afenda.tenant_id', true), '')::int);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'security' AND tablename = 'user_permissions' AND policyname = 'user_permissions_service_bypass') THEN
    CREATE POLICY "user_permissions_service_bypass" ON "security"."user_permissions" AS PERMISSIVE FOR ALL TO "service_role" USING (true) WITH CHECK (true);
  END IF;

  -- user_roles
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'security' AND tablename = 'user_roles' AND policyname = 'user_roles_tenant_select') THEN
    CREATE POLICY "user_roles_tenant_select" ON "security"."user_roles" AS PERMISSIVE FOR SELECT TO "app_user"
      USING ("tenantId" = NULLIF(current_setting('afenda.tenant_id', true), '')::int);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'security' AND tablename = 'user_roles' AND policyname = 'user_roles_tenant_insert') THEN
    CREATE POLICY "user_roles_tenant_insert" ON "security"."user_roles" AS PERMISSIVE FOR INSERT TO "app_user"
      WITH CHECK ("tenantId" = NULLIF(current_setting('afenda.tenant_id', true), '')::int);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'security' AND tablename = 'user_roles' AND policyname = 'user_roles_tenant_update') THEN
    CREATE POLICY "user_roles_tenant_update" ON "security"."user_roles" AS PERMISSIVE FOR UPDATE TO "app_user"
      USING ("tenantId" = NULLIF(current_setting('afenda.tenant_id', true), '')::int)
      WITH CHECK ("tenantId" = NULLIF(current_setting('afenda.tenant_id', true), '')::int);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'security' AND tablename = 'user_roles' AND policyname = 'user_roles_tenant_delete') THEN
    CREATE POLICY "user_roles_tenant_delete" ON "security"."user_roles" AS PERMISSIVE FOR DELETE TO "app_user"
      USING ("tenantId" = NULLIF(current_setting('afenda.tenant_id', true), '')::int);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'security' AND tablename = 'user_roles' AND policyname = 'user_roles_service_bypass') THEN
    CREATE POLICY "user_roles_service_bypass" ON "security"."user_roles" AS PERMISSIVE FOR ALL TO "service_role" USING (true) WITH CHECK (true);
  END IF;
END $$;
