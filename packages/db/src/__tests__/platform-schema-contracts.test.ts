import { getTableColumns } from "drizzle-orm";
import { describe, expect, it } from "vitest";

import { appModules, tenants, users, roles, permissions, userRoles } from "../schema/index.js";

describe("platform schema contracts", () => {
  it("core.tenants exposes the expected base columns", () => {
    const columns = getTableColumns(tenants);

    expect(columns.tenantId).toBeDefined();
    expect(columns.tenantCode).toBeDefined();
    expect(columns.name).toBeDefined();
    expect(columns.status).toBeDefined();
    expect(columns.createdAt).toBeDefined();
    expect(columns.updatedAt).toBeDefined();
    expect(columns.deletedAt).toBeDefined();
  });

  it("core.appModules is tenant-scoped and audited", () => {
    const columns = getTableColumns(appModules);

    expect(columns.tenantId).toBeDefined();
    expect(columns.code).toBeDefined();
    expect(columns.basePath).toBeDefined();
    expect(columns.createdBy).toBeDefined();
    expect(columns.updatedBy).toBeDefined();
  });

  it("security.users is tenant-scoped with audit columns", () => {
    const columns = getTableColumns(users);

    expect(columns.userId).toBeDefined();
    expect(columns.tenantId).toBeDefined();
    expect(columns.email).toBeDefined();
    expect(columns.displayName).toBeDefined();
    expect(columns.createdBy).toBeDefined();
    expect(columns.updatedBy).toBeDefined();
  });

  it("security roles and permissions have normalized identifiers", () => {
    expect(getTableColumns(roles).roleCode).toBeDefined();
    expect(getTableColumns(permissions).key).toBeDefined();
  });

  it("security.userRoles keeps composite assignment identifiers", () => {
    const columns = getTableColumns(userRoles);

    expect(columns.userId).toBeDefined();
    expect(columns.roleId).toBeDefined();
    expect(columns.tenantId).toBeDefined();
    expect(columns.assignedBy).toBeDefined();
  });
});