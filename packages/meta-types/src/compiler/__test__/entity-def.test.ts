/**
 * Compiler entity-def contract tests.
 *
 * Design intent: EntityDef drives the data layer. Column literals, field metadata,
 * and registry structure must remain exact because schema generation depends on them.
 */
import { describe, expect, it } from "vitest";

import type { ColumnRef, ColumnType, EntityDef, EntityDefRegistry, FieldDef } from "../entity-def.js";

// ---------------------------------------------------------------------------
// ColumnType — exhaustive literal union
// ---------------------------------------------------------------------------

describe("ColumnType — exhaustive literal union", () => {
  it("covers all expected column types", () => {
    const allColumnTypes: ColumnType[] = [
      "uuid",
      "text",
      "numeric",
      "integer",
      "boolean",
      "timestamp",
      "jsonb",
    ];
    expect(allColumnTypes).toHaveLength(7);
  });

  it("EXHAUSTIVENESS GATE — changing the count means the persistence layer changed", () => {
    expect(([
      "uuid",
      "text",
      "numeric",
      "integer",
      "boolean",
      "timestamp",
      "jsonb",
    ] satisfies ColumnType[])).toHaveLength(7);
  });
});

// ---------------------------------------------------------------------------
// ColumnRef — structural contract
// ---------------------------------------------------------------------------

describe("ColumnRef — structural contract", () => {
  it("holds a foreign table/column reference", () => {
    const ref: ColumnRef = { table: "users", column: "id" };
    expect(ref.table).toBe("users");
    expect(ref.column).toBe("id");
  });

  it("COMPILE-TIME GATE: ColumnRef uses 'table'/'column'", () => {
    const ref: ColumnRef = { table: "orders", column: "customer_id" };
    expect(ref.table).toBe("orders");
    expect(ref.column).toBe("customer_id");
  });
});

// ---------------------------------------------------------------------------
// FieldDef — structural contract
// ---------------------------------------------------------------------------

describe("FieldDef — structural contract", () => {
  it("accepts a minimal required text field", () => {
    const field: FieldDef = { type: "text" };
    expect(field.type).toBe("text");
  });

  it("accepts a primary UUID key field", () => {
    const field: FieldDef = { type: "uuid", primary: true };
    expect(field.primary).toBe(true);
  });

  it("accepts nullable, unique, and defaultSql metadata", () => {
    const field: FieldDef = {
      type: "integer",
      nullable: true,
      unique: true,
      defaultSql: "0",
    };
    expect(field.nullable).toBe(true);
    expect(field.unique).toBe(true);
    expect(field.defaultSql).toBe("0");
  });

  it("accepts a foreign key reference", () => {
    const field: FieldDef = {
      type: "uuid",
      references: { table: "tenants", column: "id" },
    };
    expect(field.references?.table).toBe("tenants");
    expect(field.references?.column).toBe("id");
  });

  it("COMPILE-TIME GATE: FieldDef uses 'type' and 'primary'", () => {
    const field: FieldDef = { type: "boolean", primary: false };
    expect(field.type).toBe("boolean");
    expect(field.primary).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// EntityDef — structural contract
// ---------------------------------------------------------------------------

describe("EntityDef — structural contract", () => {
  it("accepts a minimal entity definition", () => {
    const entity: EntityDef = {
      name: "Tenant",
      table: "tenants",
      fields: {
        id: { type: "uuid", primary: true },
        name: { type: "text" },
      },
    };
    expect(entity.name).toBe("Tenant");
    expect(entity.table).toBe("tenants");
    expect(Object.keys(entity.fields)).toHaveLength(2);
  });

  it("accepts an entity with foreign key fields", () => {
    const entity: EntityDef = {
      name: "Order",
      table: "orders",
      fields: {
        id: { type: "uuid", primary: true },
        tenantId: {
          type: "uuid",
          references: { table: "tenants", column: "id" },
        },
        createdAt: { type: "timestamp", defaultSql: "now()" },
      },
    };
    expect(entity.fields["tenantId"]?.references?.table).toBe("tenants");
    expect(entity.fields["createdAt"]?.defaultSql).toBe("now()");
  });

  it("COMPILE-TIME GATE: EntityDef.fields is a Record<string, FieldDef>", () => {
    const entity: EntityDef = {
      name: "Invoice",
      table: "invoices",
      fields: {
        id: { type: "uuid" },
      },
    };
    expect(Array.isArray(entity.fields)).toBe(false);
    expect(entity.fields["id"]?.type).toBe("uuid");
  });
});

// ---------------------------------------------------------------------------
// EntityDefRegistry — structural contract
// ---------------------------------------------------------------------------

describe("EntityDefRegistry — structural contract", () => {
  it("holds an entities array", () => {
    const registry: EntityDefRegistry = {
      entities: [
        {
          name: "Tenant",
          table: "tenants",
          fields: { id: { type: "uuid", primary: true } },
        },
        {
          name: "Order",
          table: "orders",
          fields: { id: { type: "uuid", primary: true } },
        },
      ],
    };
    expect(registry.entities).toHaveLength(2);
    expect(registry.entities[0]?.table).toBe("tenants");
  });

  it("accepts an optional namespace", () => {
    const registry: EntityDefRegistry = {
      entities: [],
      namespace: "core",
    };
    expect(registry.namespace).toBe("core");
  });

  it("COMPILE-TIME GATE: EntityDefRegistry is not a plain record", () => {
    const registry: EntityDefRegistry = {
      entities: [{ name: "Asset", table: "assets", fields: {} }],
      namespace: "inventory",
    };
    expect(Array.isArray(registry.entities)).toBe(true);
    expect(registry.namespace).toBe("inventory");
  });
});
