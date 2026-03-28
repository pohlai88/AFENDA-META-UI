/**
 * @module truth-compiler/schema-compiler
 * @description Compare Truth DSL entity tables against Drizzle schema exports.
 * @layer db/truth-compiler
 */

import { getTableConfig, type AnyPgTable } from "drizzle-orm/pg-core";

import * as schemaExports from "../schema/index.js";

import type { NormalizedTruthModel } from "./types.js";

const DEFAULT_NAMESPACE = "public";

export interface SchemaCompareOptions {
  namespace?: string;
  drizzleQualifiedTables?: readonly string[];
  includeUnmanagedTables?: boolean;
  failOnUnmanagedTables?: boolean;
}

export interface SchemaCompareResult {
  namespace: string;
  status: "ok" | "drift";
  truthTables: string[];
  drizzleTables: string[];
  missingInDrizzle: string[];
  unmanagedInDrizzle: string[];
}

function sortUnique(values: readonly string[]): string[] {
  return [...new Set(values)].sort((left, right) =>
    left.localeCompare(right, "en", { sensitivity: "base" })
  );
}

function resolveNamespace(normalized: NormalizedTruthModel, namespace?: string): string {
  return namespace ?? normalized.namespace ?? DEFAULT_NAMESPACE;
}

function toQualified(schemaName: string, tableName: string): string {
  return `${schemaName}.${tableName}`;
}

export function collectDrizzleQualifiedTables(namespace?: string): string[] {
  const discovered: string[] = [];

  for (const candidate of Object.values(schemaExports)) {
    try {
      const table = candidate as AnyPgTable;
      const config = getTableConfig(table);
      const schemaName = config.schema ?? DEFAULT_NAMESPACE;
      if (namespace && schemaName !== namespace) {
        continue;
      }
      discovered.push(toQualified(schemaName, config.name));
    } catch {
      // Not a table export; ignore and continue scanning.
    }
  }

  return sortUnique(discovered);
}

export function compareTruthToSchema(
  normalized: NormalizedTruthModel,
  options: SchemaCompareOptions = {}
): SchemaCompareResult {
  const namespace = resolveNamespace(normalized, options.namespace);
  const truthTables = sortUnique(
    normalized.entities.map((entity) => toQualified(namespace, entity.table))
  );
  const drizzleTables = sortUnique(
    options.drizzleQualifiedTables ?? collectDrizzleQualifiedTables(namespace)
  );

  const truthSet = new Set(truthTables);
  const drizzleSet = new Set(drizzleTables);

  const missingInDrizzle = truthTables.filter((qualifiedTable) => !drizzleSet.has(qualifiedTable));
  const unmanagedInDrizzle =
    (options.includeUnmanagedTables ?? true)
      ? drizzleTables.filter((qualifiedTable) => !truthSet.has(qualifiedTable))
      : [];

  const status =
    missingInDrizzle.length > 0 ||
    (Boolean(options.failOnUnmanagedTables) && unmanagedInDrizzle.length > 0)
      ? "drift"
      : "ok";

  return {
    namespace,
    status,
    truthTables,
    drizzleTables,
    missingInDrizzle,
    unmanagedInDrizzle,
  };
}

function formatSection(title: string, items: readonly string[]): string[] {
  if (items.length === 0) {
    return [`- ${title}: none`];
  }
  return [`- ${title}:`, ...items.map((item) => `  - ${item}`)];
}

export function formatSchemaCompareReport(result: SchemaCompareResult): string {
  const lines = [
    `truth:schema:compare ${result.status.toUpperCase()}`,
    `- namespace: ${result.namespace}`,
    `- truth tables: ${result.truthTables.length}`,
    `- drizzle tables: ${result.drizzleTables.length}`,
    ...formatSection("missing in drizzle", result.missingInDrizzle),
    ...formatSection("unmanaged in truth", result.unmanagedInDrizzle),
  ];

  return `${lines.join("\n")}\n`;
}
