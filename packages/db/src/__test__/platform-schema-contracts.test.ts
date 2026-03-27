import { getTableColumns } from "drizzle-orm";
import { describe, expect, it } from "vitest";

import {
  appModules,
  approvalLogs,
  countries,
  currencies,
  documentAttachments,
  permissions,
  roles,
  sequences,
  tenants,
  unitsOfMeasure,
  userRoles,
  users,
} from "../schema/index.js";

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

  it("reference tables expose global localization and currency columns", () => {
    expect(getTableColumns(countries).code).toBeDefined();
    expect(getTableColumns(countries).vatLabel).toBeDefined();
    expect(getTableColumns(currencies).code).toBeDefined();
    expect(getTableColumns(currencies).rounding).toBeDefined();
    expect(getTableColumns(unitsOfMeasure).factor).toBeDefined();
    expect(getTableColumns(unitsOfMeasure).uomType).toBeDefined();
  });

  it("reference sequences and audit tables stay tenant-scoped", () => {
    expect(getTableColumns(sequences).tenantId).toBeDefined();
    expect(getTableColumns(sequences).resetPeriod).toBeDefined();
    expect(getTableColumns(documentAttachments).tenantId).toBeDefined();
    expect(getTableColumns(documentAttachments).entityType).toBeDefined();
    expect(getTableColumns(approvalLogs).actorRoleSnapshot).toBeDefined();
    expect(getTableColumns(approvalLogs).decidedAt).toBeDefined();
  });
});
