/**
 * Schema Registry for Test Generation
 * ====================================
 * Centralized registry of all Zod schemas across the monorepo.
 * Uses dynamic discovery via namespace imports + filtering.
 *
 * Sources:
 *   - @afenda/meta-types (workflow, schema, rbac, platform, inventory)
 *   - @afenda/db (schema-domain: sales enums + branded UUIDs + regex strings)
 *   - @afenda/db (schema-platform: reference enums)
 */

import type { ZodSchema } from "zod";
import type { SchemaRegistry } from "./generate-zod-tests.js";

// ---------------------------------------------------------------------------
// Namespace imports — auto-discover all *Schema exports
// ---------------------------------------------------------------------------
import * as MetaWorkflow from "@afenda/meta-types/workflow";
import * as MetaSchema from "@afenda/meta-types/schema";
import * as MetaRbac from "@afenda/meta-types/rbac";
import * as MetaPlatform from "@afenda/meta-types/platform";
import * as MetaInventory from "@afenda/meta-types/inventory";
import * as DbSchema from "@afenda/db/schema";

// ---------------------------------------------------------------------------
// Dynamic schema collection
// ---------------------------------------------------------------------------

/** Runtime check: is this value a Zod 4 schema? */
function isZodSchema(value: unknown): value is ZodSchema {
  return (
    value != null &&
    typeof value === "object" &&
    "_zod" in (value as Record<string, unknown>)
  );
}

/**
 * Collect all exports ending with "Schema" that are actual Zod schemas.
 * Strip the "Schema" suffix for cleaner test names.
 */
function collectSchemas(
  mod: Record<string, unknown>,
): Record<string, ZodSchema> {
  const out: Record<string, ZodSchema> = {};
  for (const [key, value] of Object.entries(mod)) {
    if (key.endsWith("Schema") && isZodSchema(value)) {
      out[key.replace(/Schema$/, "")] = value;
    }
  }
  return out;
}

// ---------------------------------------------------------------------------
// Build the unified registry
// ---------------------------------------------------------------------------

export const schemaRegistry: SchemaRegistry = {
  // @afenda/meta-types
  ...collectSchemas(MetaWorkflow as unknown as Record<string, unknown>),
  ...collectSchemas(MetaSchema as unknown as Record<string, unknown>),
  ...collectSchemas(MetaRbac as unknown as Record<string, unknown>),
  ...collectSchemas(MetaPlatform as unknown as Record<string, unknown>),
  ...collectSchemas(MetaInventory as unknown as Record<string, unknown>),

  // @afenda/db — schema exports (sales + platform + meta domains)
  ...collectSchemas(DbSchema as unknown as Record<string, unknown>),
};

// ---------------------------------------------------------------------------
// Valid value overrides for regex-constrained string schemas
// These schemas use z.string().regex(...) which can't be auto-introspected
// ---------------------------------------------------------------------------

export const validValueOverrides: Record<string, unknown> = {
  positiveMoneyString: "12.50",
  quantityString: "100.1234",
  discountString: "50.00",
  percentageString: "99.5",
  positiveIntegerString: "42",
  employeeCode: "EMP-001",
  email: "valid@example.com",
};
