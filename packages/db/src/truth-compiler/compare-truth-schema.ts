/**
 * @module truth-compiler/compare-truth-schema
 * @description CLI entrypoint for Truth DSL vs Drizzle schema drift reporting.
 * @layer db/truth-compiler
 */

import { normalize } from "./normalizer.js";
import { compareTruthToSchema, formatSchemaCompareReport } from "./schema-compiler.js";
import { COMPILER_INPUT } from "./truth-config.js";

function getArgValue(prefix: string): string | undefined {
  const arg = process.argv.find((value) => value.startsWith(prefix));
  return arg ? arg.slice(prefix.length) : undefined;
}

async function main(): Promise<void> {
  const asJson = process.argv.includes("--json");
  const failOnUnmanagedTables = process.argv.includes("--fail-on-unmanaged");
  const namespace = getArgValue("--namespace=");

  const normalized = normalize(COMPILER_INPUT);
  const result = compareTruthToSchema(normalized, {
    namespace,
    includeUnmanagedTables: true,
    failOnUnmanagedTables,
  });

  if (asJson) {
    console.log(JSON.stringify(result, null, 2));
  } else {
    console.log(formatSchemaCompareReport(result));
  }

  if (result.status === "drift") {
    process.exitCode = 1;
  }
}

void main();
