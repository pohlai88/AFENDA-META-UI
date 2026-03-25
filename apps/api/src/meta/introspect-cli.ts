#!/usr/bin/env node
/**
 * meta:introspect CLI
 * ===================
 * Run via:  pnpm --filter @afenda/api meta:introspect
 *
 * Steps:
 *  1. Execute GraphQL introspection query against the local drizzle-graphql schema
 *  2. Parse the introspection result into IntrospectedModel[]
 *  3. Compile each model into a ModelMeta via the meta compiler
 *  4. Upsert into the schema_registry table (skips models with manual_override = true)
 */

import { execute } from "../graphql/schema.js";
import { compileModel } from "./compiler.js";
import { upsertSchema, getRegistryEntry } from "./registry.js";
import type { IntrospectedModel, IntrospectedField } from "@afenda/meta-types";
import { parse } from "graphql";

// ---------------------------------------------------------------------------
// Introspection query
// ---------------------------------------------------------------------------

const INTROSPECT_QUERY = `
  query IntrospectSchema {
    __schema {
      types {
        name
        kind
        fields {
          name
          type {
            name
            kind
            ofType {
              name
              kind
              ofType {
                name
                kind
              }
            }
          }
        }
        enumValues {
          name
        }
      }
    }
  }
`;

// ---------------------------------------------------------------------------
// Parse introspection result → IntrospectedModel[]
// ---------------------------------------------------------------------------

interface GqlType {
  name: string;
  kind: string;
  ofType?: GqlType | null;
}

interface GqlField {
  name: string;
  type: GqlType;
}

interface GqlSchemaType {
  name: string;
  kind: string;
  fields: GqlField[] | null;
  enumValues: { name: string }[] | null;
}

/**
 * Unwrap NON_NULL / LIST wrappers and return the named type + whether it is a
 * list and whether it is non-null.
 */
function unwrap(t: GqlType): { name: string; kind: string; isList: boolean; isRequired: boolean } {
  let isList = false;
  let isRequired = false;
  let cur: GqlType | null | undefined = t;
  let depth = 0;

  // Defensive unwrap for nested NON_NULL/LIST wrappers from introspection.
  while (cur && depth < 10) {
    if (cur.kind === "NON_NULL") {
      if (depth === 0) {
        isRequired = true;
      }
      cur = cur.ofType;
      depth++;
      continue;
    }

    if (cur.kind === "LIST") {
      isList = true;
      cur = cur.ofType;
      depth++;
      continue;
    }

    break;
  }

  return {
    name: cur?.name ?? "Unknown",
    kind: cur?.kind ?? "SCALAR",
    isList,
    isRequired,
  };
}

const SKIP_TYPES = new Set([
  "Query", "Mutation", "Subscription",
  "String", "Boolean", "Int", "Float", "ID",
  "__Schema", "__Type", "__Field", "__InputValue", "__EnumValue", "__Directive",
  "PageInfo", "OrderByDirection",
]);

const INPUT_SUFFIX = /Input$|OrderBy$|Filters$|InnerFilter$/;

function singularize(s: string): string {
  if (s === "sales") {
    return s;
  }

  if (s.endsWith("ies") && s.length > 3) {
    return `${s.slice(0, -3)}y`;
  }

  if (s.endsWith("s") && !s.endsWith("ss") && s.length > 1) {
    return s.slice(0, -1);
  }

  return s;
}

function normalizeModelName(typeName: string): string {
  const snake = typeName
    .replace(/([A-Z])/g, (m) => `_${m.toLowerCase()}`)
    .replace(/^_/, "");

  const withoutWrapperSuffix = snake
    .replace(/_select_item$/, "")
    .replace(/_item$/, "");

  return withoutWrapperSuffix
    .split("_")
    .map((segment) => singularize(segment))
    .join("_");
}

function parseIntrospection(result: {
  data: { __schema: { types: GqlSchemaType[] } };
}): IntrospectedModel[] {
  const types = result.data.__schema.types;

  // Build enum map for quick lookup
  const enumMap = new Map<string, string[]>();
  for (const t of types) {
    if (t.kind === "ENUM" && !SKIP_TYPES.has(t.name)) {
      enumMap.set(t.name, t.enumValues?.map((e) => e.name) ?? []);
    }
  }

  const models: IntrospectedModel[] = [];

  for (const t of types) {
    if (t.kind !== "OBJECT") continue;
    if (SKIP_TYPES.has(t.name)) continue;
    if (INPUT_SUFFIX.test(t.name)) continue;
    if (t.name.endsWith("SelectItem")) continue;
    if (t.name.endsWith("Relation")) continue;
    if (!t.name.endsWith("Item")) continue;
    if (!t.fields?.length) continue;

    const fields: IntrospectedField[] = t.fields.map((f) => {
      const { name: typeName, kind, isList, isRequired } = unwrap(f.type);
      const isEnum = enumMap.has(typeName);
      const isRelation = kind === "OBJECT" && !SKIP_TYPES.has(typeName);

      return {
        name: f.name,
        typeName,
        kind,
        isList,
        isRequired,
        hasDefault: false, // drizzle-graphql doesn't expose this; safe default
        isEnum,
        isRelation,
        enumValues: isEnum ? enumMap.get(typeName) : undefined,
        relationModel: isRelation ? typeName : undefined,
      };
    });

    models.push({ name: t.name, fields });
  }

  return models;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  console.log("▶  Running GraphQL introspection…");

  const document = parse(INTROSPECT_QUERY);
  const result = (await execute({ document })) as {
    data: { __schema: { types: GqlSchemaType[] } };
    errors?: unknown[];
  };

  if (result.errors?.length) {
    console.error("Introspection errors:", result.errors);
    process.exit(1);
  }

  const models = parseIntrospection(result);
  console.log(`   Found ${models.length} model(s): ${models.map((m) => m.name).join(", ")}`);

  let inserted = 0;
  let skipped = 0;

  for (const model of models) {
    const snakeName = normalizeModelName(model.name);

    const existing = await getRegistryEntry(snakeName);

    // Respect developer overrides — don't clobber manual customisations
    if ((existing as any)?.manual_override) {
      console.log(`   ⏩  Skipping ${snakeName} (manual_override = true)`);
      skipped++;
      continue;
    }

    const compiled = compileModel(model);
    await upsertSchema(snakeName, compiled);
    console.log(`   ✔  Upserted ${snakeName}`);
    inserted++;
  }

  console.log(`\n✅  Done — ${inserted} upserted, ${skipped} skipped.\n`);
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
