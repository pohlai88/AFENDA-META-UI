/**
 * @module truth-compiler/generate-truth-sql
 * @description Truth Compiler pipeline entrypoint.
 *
 * Orchestrates the full pipeline:
 *   normalize → compileInvariants + compileTransitions + compileEvents → emit → write
 *
 * Usage:
 *   pnpm --filter @afenda/db truth:generate   — writes migrations/generated/truth-v1.sql
 *   pnpm --filter @afenda/db truth:check      — exits 1 if generated SQL differs from committed
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { buildDependencyGraph } from "./dependency-graph.js";
import { compileEvents } from "./event-compiler.js";
import { compileCrossInvariants } from "./cross-invariant-compiler.js";
import { compileInvariants } from "./invariant-compiler.js";
import { compileMutationPolicies } from "./mutation-policy-compiler.js";
import { normalize } from "./normalizer.js";
import { compileTransitions } from "./transition-compiler.js";
import { emit } from "./emitter.js";
import { COMPILER_INPUT } from "./truth-config.js";
import type { SqlSegment } from "./types.js";

const CURRENT_DIR = dirname(fileURLToPath(import.meta.url));
const OUTPUT_PATH = resolve(CURRENT_DIR, "../../migrations/generated/truth-v1.sql");

/** Strips the generated-at timestamp line for content-only comparison. */
function normaliseTimestamp(sql: string): string {
  return sql.replace(/^-- Generated at: .+$/m, "-- Generated at: <timestamp>");
}

function applyDependencyOrder(segments: SqlSegment[], order: string[]): SqlSegment[] {
  const orderIndex = new Map<string, number>();
  order.forEach((nodeId, index) => {
    orderIndex.set(nodeId, index);
  });

  return segments.map((segment) => ({
    ...segment,
    orderIndex: segment.nodeId ? orderIndex.get(segment.nodeId) ?? Number.MAX_SAFE_INTEGER : Number.MAX_SAFE_INTEGER,
  }));
}

function run(): void {
  const isCheck = process.argv.includes("--check");

  // 1. Normalize manifest into concrete resolved model
  const normalized = normalize(COMPILER_INPUT);
  const dependencyGraph = buildDependencyGraph(normalized);

  // 2. Run all compiler stages
  const segments = applyDependencyOrder([
    ...compileInvariants(normalized),
    ...compileCrossInvariants(normalized, { strict: true }),
    ...compileMutationPolicies(normalized, { strict: true }),
    ...compileTransitions(normalized),
    ...compileEvents(normalized),
  ], dependencyGraph.order);

  // 3. Emit deterministic SQL bundle
  const generated = emit(segments);

  // 4a. Check mode — fail if committed artifact differs
  if (isCheck) {
    if (!existsSync(OUTPUT_PATH)) {
      console.error(
        `truth:check FAILED — output file does not exist: ${OUTPUT_PATH}\n` +
          `Run: pnpm --filter @afenda/db truth:generate`
      );
      process.exitCode = 1;
      return;
    }

    const committed = readFileSync(OUTPUT_PATH, "utf-8");
    if (normaliseTimestamp(committed) !== normaliseTimestamp(generated)) {
      console.error(
        `truth:check FAILED — generated SQL differs from committed artifact.\n` +
          `Run: pnpm --filter @afenda/db truth:generate and commit the result.`
      );
      process.exitCode = 1;
      return;
    }

    console.log("truth:check PASSED — generated SQL is up to date.");
    return;
  }

  // 4b. Generate mode — write output file
  mkdirSync(dirname(OUTPUT_PATH), { recursive: true });
  writeFileSync(OUTPUT_PATH, generated, "utf-8");
  console.log(`truth:generate complete → ${OUTPUT_PATH}`);
}

run();
