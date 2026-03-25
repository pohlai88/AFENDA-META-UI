import { getTableColumns } from "drizzle-orm";
import { describe, expect, it } from "vitest";

import {
  auditLogs,
  entities,
  events,
  fields,
  layouts,
  policies,
  schemaRegistry,
} from "../schema/index.js";

describe("meta schema contracts", () => {
  it("schema registry keeps compiled meta documents", () => {
    const columns = getTableColumns(schemaRegistry);

    expect(columns.model).toBeDefined();
    expect(columns.meta).toBeDefined();
    expect(columns.permissions).toBeDefined();
    expect(columns.createdAt).toBeDefined();
  });

  it("entity metadata tables keep relational anchors", () => {
    expect(getTableColumns(entities).name).toBeDefined();
    expect(getTableColumns(fields).entityId).toBeDefined();
    expect(getTableColumns(layouts).entityId).toBeDefined();
  });

  it("policy metadata keeps validation DSL columns", () => {
    const columns = getTableColumns(policies);

    expect(columns.scopeEntity).toBeDefined();
    expect(columns.validateDsl).toBeDefined();
    expect(columns.severity).toBeDefined();
  });

  it("audit and event stores remain append-oriented", () => {
    expect(getTableColumns(auditLogs).diffJson).toBeDefined();
    expect(getTableColumns(auditLogs).timestamp).toBeDefined();
    expect(getTableColumns(events).eventPayload).toBeDefined();
    expect(getTableColumns(events).version).toBeDefined();
  });
});
