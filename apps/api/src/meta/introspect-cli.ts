#!/usr/bin/env node
/**
 * meta:introspect CLI
 * ===================
 * Run via:  pnpm --filter @afenda/api meta:introspect
 *
 * Steps:
 *  1. Introspect Drizzle table exports from the local schema barrel
 *  2. Convert table/column metadata into IntrospectedModel[]
 *  3. Compile each model into a ModelMeta via the meta compiler
 *  4. Upsert into the schema_registry table (skips models with manual_override = true)
 */

import { getTableColumns } from "drizzle-orm";
import { compileModel } from "./compiler.js";
import { upsertSchema, getRegistryEntry } from "./registry.js";
import type { IntrospectedModel, IntrospectedField } from "@afenda/meta-types/schema";
import * as schemaExports from "../db/schema/index.js";

// ---------------------------------------------------------------------------
// Drizzle export introspection → IntrospectedModel[]
// ---------------------------------------------------------------------------

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
  const snake = typeName.replace(/([A-Z])/g, (m) => `_${m.toLowerCase()}`).replace(/^_/, "");

  return snake
    .split("_")
    .map((segment) => singularize(segment))
    .join("_");
}

function parseIntrospectionFromSchemaExports(): IntrospectedModel[] {
  const models: IntrospectedModel[] = [];

  for (const [exportName, exported] of Object.entries(schemaExports)) {
    const columns = safeGetColumns(exported);
    if (!columns) {
      continue;
    }

    const fields: IntrospectedField[] = Object.entries(columns).map(([columnName, column]) =>
      compileIntrospectedField(columnName, column)
    );

    if (fields.length === 0) {
      continue;
    }

    models.push({
      name: snakeToPascal(normalizeModelName(exportName)),
      fields,
    });
  }

  return models;
}

function safeGetColumns(exported: unknown): Record<string, unknown> | null {
  try {
    const columns = getTableColumns(exported as Parameters<typeof getTableColumns>[0]);
    return Object.keys(columns).length > 0 ? (columns as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}

function compileIntrospectedField(columnName: string, column: unknown): IntrospectedField {
  const col = column as {
    dataType?: string;
    columnType?: string;
    enumValues?: string[];
    notNull?: boolean;
    hasDefault?: boolean;
  };

  const isEnum = Array.isArray(col.enumValues) && col.enumValues.length > 0;
  const isList = col.dataType === "array";
  const isRelation = /(_id|Id)$/u.test(columnName) && columnName !== "id";

  const kind = isRelation ? "OBJECT" : "SCALAR";
  const typeName = isRelation
    ? snakeToPascal(stripIdSuffix(columnName))
    : mapColumnToGraphqlScalar(col, isEnum);

  return {
    name: columnName,
    typeName,
    kind,
    isList,
    isRequired: Boolean(col.notNull),
    hasDefault: Boolean(col.hasDefault),
    isEnum,
    isRelation,
    enumValues: isEnum ? col.enumValues : undefined,
    relationModel: isRelation ? snakeToPascal(stripIdSuffix(columnName)) : undefined,
  };
}

function stripIdSuffix(fieldName: string): string {
  return fieldName.replace(/Id$/u, "").replace(/_id$/u, "");
}

function mapColumnToGraphqlScalar(
  column: { dataType?: string; columnType?: string },
  isEnum: boolean
): string {
  if (isEnum) {
    return "String";
  }

  if (column.dataType === "boolean") {
    return "Boolean";
  }

  if (column.dataType === "date") {
    return "DateTime";
  }

  if (column.dataType === "json") {
    return "JSON";
  }

  if (column.dataType === "number") {
    return /int|serial/i.test(column.columnType ?? "") ? "Int" : "Float";
  }

  return "String";
}

function snakeToPascal(value: string): string {
  return value
    .split("_")
    .filter(Boolean)
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join("");
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  console.warn("▶  Running Drizzle schema introspection…");

  const models = parseIntrospectionFromSchemaExports();
  console.warn(`   Found ${models.length} model(s): ${models.map((m) => m.name).join(", ")}`);

  let inserted = 0;
  let skipped = 0;

  for (const model of models) {
    const snakeName = normalizeModelName(model.name);

    const existing = await getRegistryEntry(snakeName);

    // Respect developer overrides — don't clobber manual customisations
    if ((existing as { manual_override?: boolean } | null)?.manual_override) {
      console.warn(`   ⏩  Skipping ${snakeName} (manual_override = true)`);
      skipped++;
      continue;
    }

    const compiled = compileModel(model);
    await upsertSchema(snakeName, compiled);
    console.warn(`   ✔  Upserted ${snakeName}`);
    inserted++;
  }

  console.warn(`\n✅  Done — ${inserted} upserted, ${skipped} skipped.\n`);
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
