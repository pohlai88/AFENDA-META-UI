#!/usr/bin/env node

/**
 * TypeScript DX CI Gate
 *
 * Enforces the TypeScript developer experience baseline established for this
 * monorepo: strict typing defaults, incremental build caching, declaration
 * export hygiene, and availability of inline diagnostic scripts.
 */

import { readFileSync, existsSync, readdirSync, statSync } from "node:fs";
import { join, dirname, resolve, extname } from "node:path";
import { fileURLToPath } from "node:url";
import { execSync } from "node:child_process";
import { formatTypescriptIssues, summarizeTypescriptIssues } from "./utils/diagnostics.mjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const repoRoot = join(__dirname, "..", "..", "..");

const STRICT = process.argv.includes("--strict");
const VERBOSE = process.argv.includes("--verbose") || process.argv.includes("-v");

const colors = {
  reset: "\x1b[0m",
  bright: "\x1b[1m",
  dim: "\x1b[2m",
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  cyan: "\x1b[36m",
};

function rel(absPath) {
  return absPath.replace(`${repoRoot}\\`, "").replaceAll("\\", "/");
}

function readJson(filePath) {
  return JSON.parse(readFileSync(filePath, "utf-8"));
}

function createIssue({
  level,
  category,
  message,
  explanation,
  relatedFiles = [],
  fixes = [],
  details = [],
}) {
  return {
    level,
    category,
    message,
    explanation,
    relatedFiles,
    fixes,
    details,
  };
}

function mergeCompilerOptions(base, current) {
  return {
    ...base,
    ...current,
    paths: {
      ...(base.paths || {}),
      ...(current.paths || {}),
    },
  };
}

function resolveTsConfig(absPath) {
  const visited = new Set();

  function walk(tsconfigPath) {
    const normalized = resolve(tsconfigPath);
    if (visited.has(normalized)) {
      return { compilerOptions: {}, include: [], exclude: [] };
    }
    visited.add(normalized);

    const current = readJson(normalized);
    const extendsRef = current.extends;

    if (!extendsRef) {
      return current;
    }

    const baseConfigPath = resolve(dirname(normalized), extendsRef);
    const base = walk(baseConfigPath);

    return {
      ...base,
      ...current,
      compilerOptions: mergeCompilerOptions(base.compilerOptions || {}, current.compilerOptions || {}),
    };
  }

  return walk(absPath);
}

function checkRootScripts(errors) {
  const rootPkgPath = join(repoRoot, "package.json");
  const rootPkg = readJson(rootPkgPath);
  const scripts = rootPkg.scripts || {};

  const expected = {
    typecheck: "turbo run typecheck",
    "typecheck:verbose": "turbo run typecheck -- --listFilesOnly --explainFiles",
    "typecheck:debug": "turbo run typecheck -- --listFiles --pretty=false",
  };

  for (const [name, command] of Object.entries(expected)) {
    if (!scripts[name]) {
      errors.push(
        createIssue({
          level: "error",
          category: "TS_DIAGNOSTIC_SCRIPT_MISSING",
          message: `Missing root script \"${name}\" in package.json.`,
          explanation:
            "TypeScript diagnostics should be available through stable root scripts so developers can debug strict-mode failures quickly.",
          relatedFiles: ["package.json"],
          fixes: [`Add \"${name}\": \"${command}\" under root scripts.`],
        })
      );
      continue;
    }

    if (scripts[name] !== command) {
      errors.push(
        createIssue({
          level: "error",
          category: "TS_DIAGNOSTIC_SCRIPT_MISSING",
          message: `Root script \"${name}\" does not match the expected command.`,
          explanation:
            "This gate standardizes diagnostic commands to keep local and CI troubleshooting output consistent.",
          relatedFiles: ["package.json"],
          fixes: [`Set \"${name}\" to \"${command}\".`],
          details: [`Current value: ${scripts[name]}`],
        })
      );
    }
  }
}

function checkTsConfigBaseline(errors) {
  const tsconfigPath = join(repoRoot, "tsconfig.base.json");
  const base = readJson(tsconfigPath);
  const c = base.compilerOptions || {};

  const required = [
    ["strict", true],
    ["isolatedModules", true],
    ["declaration", true],
    ["declarationMap", true],
    ["incremental", true],
  ];

  for (const [key, expected] of required) {
    if (c[key] !== expected) {
      errors.push(
        createIssue({
          level: "error",
          category: "TS_BASELINE_MISSING",
          message: `tsconfig baseline drift: compilerOptions.${key} should be ${expected}.`,
          explanation:
            "The monorepo TypeScript baseline relies on strict + incremental + declaration defaults to maintain fast, predictable builds and type exports.",
          relatedFiles: ["tsconfig.base.json"],
          fixes: [`Set compilerOptions.${key} to ${expected} in tsconfig.base.json.`],
        })
      );
    }
  }

  if (c.tsBuildInfoFile !== "node_modules/.tsbuildinfo") {
    errors.push(
      createIssue({
        level: "error",
        category: "TS_INCREMENTAL_DRIFT",
        message: "compilerOptions.tsBuildInfoFile must be 'node_modules/.tsbuildinfo'.",
        explanation:
          "A centralized tsbuildinfo path keeps incremental caching deterministic and easy to ignore in version control.",
        relatedFiles: ["tsconfig.base.json"],
        fixes: ["Set compilerOptions.tsBuildInfoFile to 'node_modules/.tsbuildinfo'."],
        details: [`Current value: ${String(c.tsBuildInfoFile)}`],
      })
    );
  }
}

function checkProjectIncremental(errors) {
  const targets = [
    "apps/api/tsconfig.json",
    "apps/web/tsconfig.json",
    "packages/db/tsconfig.json",
    "packages/ui/tsconfig.json",
    "packages/meta-types/tsconfig.json",
  ];

  for (const target of targets) {
    const abs = join(repoRoot, target);
    const merged = resolveTsConfig(abs);
    const incremental = merged.compilerOptions?.incremental;

    if (incremental !== true) {
      errors.push(
        createIssue({
          level: "error",
          category: "TS_INCREMENTAL_DRIFT",
          message: `${target} does not resolve to compilerOptions.incremental=true.`,
          explanation:
            "All TypeScript workspaces should resolve incremental mode to true for fast local and CI feedback loops.",
          relatedFiles: [target, "tsconfig.base.json"],
          fixes: [
            `Ensure ${target} extends tsconfig.base.json and does not override incremental to false.`,
            "Set compilerOptions.incremental to true where required.",
          ],
        })
      );
    }
  }
}

function checkDeclarationExports(errors) {
  const packages = [
    {
      pkgPath: "packages/db/package.json",
      name: "@afenda/db",
    },
    {
      pkgPath: "packages/ui/package.json",
      name: "@afenda/ui",
    },
    {
      pkgPath: "packages/meta-types/package.json",
      name: "@afenda/meta-types",
    },
  ];

  for (const entry of packages) {
    const pkg = readJson(join(repoRoot, entry.pkgPath));

    if (!pkg.types || typeof pkg.types !== "string") {
      errors.push(
        createIssue({
          level: "error",
          category: "TS_EXPORT_CONTRACT_MISSING",
          message: `${entry.name} is missing a root \"types\" field.`,
          explanation:
            "Library packages should expose declaration entrypoints so editors and dependent workspaces resolve types reliably.",
          relatedFiles: [entry.pkgPath],
          fixes: ["Add a root 'types' field pointing to dist declaration output."],
        })
      );
    }

    const exportsField = pkg.exports || {};
    for (const [subpath, def] of Object.entries(exportsField)) {
      if (!def || typeof def !== "object") {
        continue;
      }

      if (!def.types) {
        errors.push(
          createIssue({
            level: "error",
            category: "TS_EXPORT_CONTRACT_MISSING",
            message: `${entry.name} export '${subpath}' is missing a \"types\" mapping.`,
            explanation:
              "Each object-style export path should provide type metadata to prevent module resolution and IntelliSense drift.",
            relatedFiles: [entry.pkgPath],
            fixes: [
              `Add \"types\" for export '${subpath}' to match the emitted declaration file path.`,
            ],
          })
        );
      }
    }
  }
}

function checkDocsAndBoundaryArtifacts(warnings) {
  const expectedDocs = [
    "docs/TYPESCRIPT_EXPORTS.md",
    "packages/db/src/_private/README.md",
    "packages/ui/src/_private/README.md",
  ];

  for (const doc of expectedDocs) {
    const abs = join(repoRoot, doc);
    if (!existsSync(abs)) {
      warnings.push(
        createIssue({
          level: "warning",
          category: "TS_DOC_MISSING",
          message: `Expected TypeScript DX artifact is missing: ${doc}.`,
          explanation:
            "These docs codify package boundaries and type export policies, which reduces recurring type mismatch issues.",
          relatedFiles: [doc],
          fixes: ["Restore the missing file and keep boundary guidance up to date."],
        })
      );
    }
  }
}

/**
 * No-new-any budget for Tier-1 boundary files.
 * Each entry is the MAXIMUM allowed raw `any` count in that file.
 * The budget can only go down, never up.
 * Pattern: `: any`, `, any`, `as any`, `<any>` — excludes generic extends constraints and comments.
 */
const ANY_BUDGET = {
  "apps/web/src/renderers/types/contracts.ts": 0,
  "apps/web/src/renderers/adapters.ts": 0,
  "apps/web/src/renderers/safeLazy.tsx": 2, // React.ComponentType<any> in generic constraints
  "apps/web/src/renderers/rule-engine.ts": 0,
  "apps/web/src/renderers/plugin-engine.ts": 0,
  "apps/web/src/renderers/conditions.ts": 0,
  "apps/web/src/renderers/schema-evolution.ts": 0,
};

/**
 * Maximum allowed `as unknown as` double-casts in each boundary area.
 * These casts are a code smell — they suppress the type system rather than fix it.
 */
const UNSAFE_CAST_BUDGET = {
  "apps/web/src": 4,
  "apps/api/src": 6,
};

/** Count bare `any` usages (excluding generic extends constraints and comments). */
function countAny(source) {
  const lines = source.split("\n");
  let count = 0;
  for (const raw of lines) {
    const line = raw.trim();
    // Skip single-line comments
    if (line.startsWith("//")) continue;
    // Strip inline comments before counting
    const code = line.replace(/\/\/.*$/, "");
    // Match `: any`, `, any`, `as any`, `<any>`, ` any>`, `= any` — bare usages
    const matches = code.match(/(?::\s*any\b|,\s*any\b|\bas\s+any\b|<any>|\bany>|=\s*any\b)/g);
    if (matches) count += matches.length;
  }
  return count;
}

function checkNoNewAny(warnings) {
  for (const [relFile, budget] of Object.entries(ANY_BUDGET)) {
    const abs = join(repoRoot, relFile.replaceAll("/", "\\\ ".trim()));
    // platform-safe path
    const filePath = join(repoRoot, ...relFile.split("/"));
    if (!existsSync(filePath)) {
      // File doesn't exist yet — skip gracefully
      continue;
    }

    const source = readFileSync(filePath, "utf-8");
    const actual = countAny(source);

    if (actual > budget) {
      warnings.push(
        createIssue({
          level: "warning",
          category: "TS_ANY_BUDGET_EXCEEDED",
          message: `any-budget exceeded in ${relFile}: found ${actual}, budget is ${budget}.`,
          explanation:
            "This file is on the Tier-1 boundary path. Introducing new \`any\` usages widens the unsound surface. Reduce or use \`unknown\` instead.",
          relatedFiles: [relFile],
          fixes: [
            `Replace \`any\` with \`unknown\` and add a narrowing type guard, or use \`JsonValue\` / \`JsonObject\` from @afenda/meta-types.`,
            "If this is intentional (e.g., a React generic constraint), increase the budget in tools/ci-gate/typescript/index.mjs and document the reason.",
          ],
          details: [`Found: ${actual} occurrence(s)`, `Budget: ${budget}`],
        })
      );
    } else if (actual < budget) {
      // Budget can be tightened — emit informational nudge in verbose mode
      if (VERBOSE) {
        console.log(
          `  ${colors.green}↓ any-budget can be tightened for ${relFile}: actual=${actual}, budget=${budget}${colors.reset}`
        );
      }
    }
  }
}

/** Recursively collect .ts/.tsx files under a directory. */
function collectTsFiles(dir) {
  const results = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      results.push(...collectTsFiles(full));
    } else {
      const ext = extname(full);
      if (ext === ".ts" || ext === ".tsx") results.push(full);
    }
  }
  return results;
}

function checkAsUnknownAs(warnings) {
  for (const [relDir, budget] of Object.entries(UNSAFE_CAST_BUDGET)) {
    const absDir = join(repoRoot, ...relDir.split("/"));
    if (!existsSync(absDir)) continue;

    const files = collectTsFiles(absDir);
    let total = 0;
    const hotspots = [];

    for (const file of files) {
      const source = readFileSync(file, "utf-8");
      const matches = source.match(/as\s+unknown\s+as\b/g);
      const count = matches ? matches.length : 0;
      if (count > 0) {
        total += count;
        hotspots.push(`${rel(file)}: ${count}`);
      }
    }

    if (total > budget) {
      warnings.push(
        createIssue({
          level: "warning",
          category: "TS_UNSAFE_CAST_BUDGET_EXCEEDED",
          message: `as-unknown-as budget exceeded in ${relDir}: found ${total}, budget is ${budget}.`,
          explanation:
            "`as unknown as T` bypasses the type system rather than fixing the actual type mismatch. Each occurrence is a risk site where TypeScript cannot protect you.",
          relatedFiles: [relDir],
          fixes: [
            "Trace back why the cast is needed and fix the upstream type so the cast is unnecessary.",
            "If unavoidable (e.g., internal React.lazy return type), wrap in a named helper and document the invariant.",
          ],
          details: [`Total: ${total}`, `Budget: ${budget}`, ...hotspots.map((h) => `  ${h}`)],
        })
      );
    } else if (VERBOSE && total < budget) {
      console.log(
        `  ${colors.green}↓ as-unknown-as budget can be tightened for ${relDir}: actual=${total}, budget=${budget}${colors.reset}`
      );
    }
  }
}

/**
 * Confirms that `assertNever` is exported from packages/meta-types/src/core/guards.ts.
 * This function is the cornerstone of discriminated union exhaustiveness checking
 * (SKILL.md Pattern 6). If it disappears, switch statements over union variants
 * silently lose their compile-time coverage guarantee.
 */
function checkAssertNeverExport(warnings) {
  const guardsPath = join(repoRoot, "packages", "meta-types", "src", "core", "guards.ts");
  if (!existsSync(guardsPath)) {
    warnings.push(
      createIssue({
        level: "warning",
        category: "TS_EXHAUSTIVENESS_MISSING",
        message: "packages/meta-types/src/core/guards.ts does not exist — assertNever infrastructure is gone.",
        explanation:
          "assertNever enables compile-time exhaustiveness checking for discriminated unions. Without it, switch statements over union variants cannot be verified by the type system (SKILL.md Pattern 6).",
        relatedFiles: ["packages/meta-types/src/core/guards.ts"],
        fixes: [
          "Restore packages/meta-types/src/core/guards.ts and export assertNever.",
          "Signature: export function assertNever(value: never): never { throw new Error(`Unhandled variant: ${String(value)}`); }",
        ],
      })
    );
    return;
  }

  const source = readFileSync(guardsPath, "utf-8");
  if (!/export\s+function\s+assertNever/.test(source)) {
    warnings.push(
      createIssue({
        level: "warning",
        category: "TS_EXHAUSTIVENESS_MISSING",
        message: "assertNever is not exported from packages/meta-types/src/core/guards.ts.",
        explanation:
          "assertNever enables compile-time exhaustiveness checking for discriminated unions. Every switch over a `type` or `status` discriminant should have a `default: assertNever(x)` branch so TypeScript catches unhandled variants at compile time (SKILL.md Pattern 6).",
        relatedFiles: ["packages/meta-types/src/core/guards.ts"],
        fixes: [
          "Add: export function assertNever(value: never): never { throw new Error(`Unhandled variant: ${String(value)}`); }",
          "Import at call sites: import { assertNever } from '@afenda/meta-types/core';",
        ],
      })
    );
  }
}

/**
 * Object widening cast budget for Tier-1 boundary files.
 * `} as TypeName` forces the type system to accept a shape without verifying it.
 * Use the `satisfies` operator instead:  `} satisfies TypeName`
 * Budget tracks allowed occurrences — tighten over time, never loosen.
 * (SKILL.md Best Practice #6: Use const assertions / satisfies)
 */
const WIDENING_CAST_BUDGET = {
  "apps/web/src/renderers/types/contracts.ts": 0,
  "apps/web/src/renderers/adapters.ts": 0,
  "apps/web/src/renderers/safeLazy.tsx": 0,
  "apps/web/src/renderers/rule-engine.ts": 0,
  "apps/web/src/renderers/plugin-engine.ts": 0,
  "apps/web/src/renderers/conditions.ts": 0,
  "apps/web/src/renderers/schema-evolution.ts": 0,
  "packages/meta-types/src/utils.ts": 0,
};

/** Count `} as TypeName` widening casts; skip `as never`, `as const`, `as unknown`, `as any`. */
function countWideningCasts(source) {
  const lines = source.split("\n");
  let count = 0;
  for (const raw of lines) {
    const line = raw.trim();
    if (line.startsWith("//")) continue;
    const code = line.replace(/\/\/.*$/, "");
    // Match `} as TypeName` where TypeName starts with uppercase — exclude the safe keywords
    const matches = code.match(/\}\s+as\s+(?!never\b|const\b|unknown\b|any\b)[A-Z][A-Za-z<[]/g);
    if (matches) count += matches.length;
  }
  return count;
}

function checkObjectWideningCasts(warnings) {
  for (const [relFile, budget] of Object.entries(WIDENING_CAST_BUDGET)) {
    const filePath = join(repoRoot, ...relFile.split("/"));
    if (!existsSync(filePath)) continue;

    const source = readFileSync(filePath, "utf-8");
    const actual = countWideningCasts(source);

    if (actual > budget) {
      warnings.push(
        createIssue({
          level: "warning",
          category: "TS_WIDENING_CAST_BUDGET_EXCEEDED",
          message: `Widening-cast budget exceeded in ${relFile}: found ${actual}, budget is ${budget}.`,
          explanation:
            "Using `} as TypeName` forces the type system to accept an object shape without verifying it matches the target type. This silently suppresses shape mismatches. Use `satisfies` instead to get compile-time shape validation while preserving the inferred type.",
          relatedFiles: [relFile],
          fixes: [
            "Replace `const x = { ... } as TypeName` with `const x = { ... } satisfies TypeName`.",
            "The `satisfies` operator validates the shape at compile time without widening the inferred type.",
            "If cross-boundary coercion is truly required, use `as unknown as TargetType` and document the invariant.",
          ],
          details: [`Found: ${actual} widening cast(s)`, `Budget: ${budget}`],
        })
      );
    } else if (VERBOSE && actual < budget) {
      console.log(
        `  ${colors.green}↓ widening-cast budget can be tightened for ${relFile}: actual=${actual}, budget=${budget}${colors.reset}`
      );
    }
  }
}

/**
 * Type guard predicate check for boundary library files.
 * Exported `is*` functions that accept `unknown` parameters should declare a
 * type predicate return (`value is Type`) so callers get automatic narrowing.
 * Returning plain `boolean` defeats the narrowing benefit (SKILL.md Type Guards section).
 */
const TYPE_GUARD_SCOPE = [
  "packages/meta-types/src/utils.ts",
  "apps/web/src/renderers/adapters.ts",
  "apps/web/src/renderers/rule-engine.ts",
];

function checkTypeGuardPredicates(warnings) {
  for (const relFile of TYPE_GUARD_SCOPE) {
    const filePath = join(repoRoot, ...relFile.split("/"));
    if (!existsSync(filePath)) continue;

    const source = readFileSync(filePath, "utf-8");
    const lines = source.split("\n");
    const missing = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (line.startsWith("//")) continue;

      // Only flag exported `is*` functions that take `unknown` as their parameter type
      // (indicating they are TypeScript type guards, not domain-level predicates)
      const fnMatch = line.match(/export\s+function\s+(is[A-Z][A-Za-z]*)\s*\(/);
      if (!fnMatch) continue;

      const scanLines = lines.slice(i, i + 5).join(" ");

      // Only apply the check if the function accepts `unknown`
      const acceptsUnknown = /:\s*unknown/.test(scanLines);
      if (!acceptsUnknown) continue;

      // Detect type predicate return annotation (`param is Type`)
      const hasTypePredicate = /\)\s*:\s*\w+\s+is\s+[A-Za-z]/.test(scanLines);
      // Detect plain boolean return without predicate
      const hasPlainBoolean = /\)\s*:\s*boolean\b/.test(scanLines);

      if (hasPlainBoolean && !hasTypePredicate) {
        missing.push(`${fnMatch[1]} at line ${i + 1}`);
      }
    }

    if (missing.length > 0) {
      warnings.push(
        createIssue({
          level: "warning",
          category: "TS_TYPE_GUARD_MISSING_PREDICATE",
          message: `Type guard(s) in ${relFile} return \`:boolean\` instead of a type predicate.`,
          explanation:
            "Exported `is*` functions that accept `unknown` are TypeScript type guards. They should declare a type predicate return type (`value is TypeName`) so TypeScript can automatically narrow the caller's type after the check. Returning plain `boolean` forces callers to cast manually.",
          relatedFiles: [relFile],
          fixes: [
            "Change `: boolean` to `: value is TypeName` for the specific narrowed type.",
            "Example: `export function isUser(v: unknown): v is User { return typeof v === 'object' && v !== null && 'id' in v; }`",
          ],
          details: missing.map((m) => `Missing type predicate: ${m}`),
        })
      );
    }
  }
}

/**
 * Structural lint: enforce that @afenda/meta-types main barrel only uses
 * `export type *` for domain re-exports (except core/ which has runtime guards).
 * Prevents accidental runtime leakage into the types package.
 */
function checkMetaTypesBarrelStructure(warnings) {
  const barrelPath = join(repoRoot, "packages", "meta-types", "src", "index.ts");
  if (!existsSync(barrelPath)) return;

  const source = readFileSync(barrelPath, "utf-8");
  const lines = source.split(/\r?\n/u);

  for (const line of lines) {
    const trimmed = line.trim();
    // Skip empty, comments, core (allowed runtime), and non-export lines
    if (!trimmed.startsWith("export ")) continue;
    if (trimmed.startsWith("export type ")) continue;
    if (trimmed.includes("/core/")) continue;

    // Any bare `export *` (not `export type *`) to a non-core domain is a violation
    if (/^export\s+\*\s+from\b/.test(trimmed)) {
      warnings.push(
        createIssue({
          level: "warning",
          category: "TS_BARREL_RUNTIME_LEAK",
          message: `meta-types barrel has runtime re-export: ${trimmed}`,
          explanation:
            "The main @afenda/meta-types barrel should only use 'export type *' for domain re-exports (except core/ which exports runtime guards). Runtime Zod schemas are accessed via domain subpath imports.",
          relatedFiles: ["packages/meta-types/src/index.ts"],
          fixes: [
            `Change to: export type * from "${trimmed.match(/from\s+["']([^"']+)/)?.[1] ?? "..."}";`,
          ],
        })
      );
    }
  }
}

function runTypecheck(errors) {
  try {
    const output = execSync("pnpm typecheck", {
      cwd: repoRoot,
      encoding: "utf-8",
      stdio: VERBOSE ? "inherit" : "pipe",
    });

    if (VERBOSE) {
      console.log(output);
    }
  } catch (error) {
    const output = String(error.stdout || error.stderr || error.message || "");
    const lines = output
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean)
      .slice(-12);

    errors.push(
      createIssue({
        level: "error",
        category: "TS_TYPECHECK_FAILED",
        message: "pnpm typecheck failed.",
        explanation:
          "The DX baseline requires a clean, reproducible typecheck in CI. Failing this command means at least one workspace has unresolved type errors.",
        relatedFiles: ["package.json", "turbo.json"],
        fixes: [
          "Run 'pnpm run typecheck:verbose' to see file-level compiler reasoning.",
          "Run 'pnpm run typecheck:debug' to inspect detailed compiler file lists.",
          "Fix the reported type errors and rerun this gate.",
        ],
        details: lines,
      })
    );
  }
}

function main() {
  console.log(`${colors.bright}${colors.blue}TypeScript DX CI Gate${colors.reset}`);
  console.log(`${colors.dim}Checking TypeScript configuration baseline and diagnostics...${colors.reset}`);

  const errors = [];
  const warnings = [];

  checkRootScripts(errors);
  checkTsConfigBaseline(errors);
  checkProjectIncremental(errors);
  checkDeclarationExports(errors);
  checkDocsAndBoundaryArtifacts(warnings);
  checkNoNewAny(warnings);
  checkAsUnknownAs(warnings);
  runTypecheck(errors);
  checkAssertNeverExport(warnings);
  checkObjectWideningCasts(warnings);
  checkTypeGuardPredicates(warnings);
  checkMetaTypesBarrelStructure(warnings);

  const hasWarnings = warnings.length > 0;

  if (errors.length > 0) {
    console.error(formatTypescriptIssues(errors));
  }

  if (hasWarnings) {
    console.log(formatTypescriptIssues(warnings));
  }

  console.log(summarizeTypescriptIssues(errors, warnings));

  if (errors.length > 0 || (STRICT && hasWarnings)) {
    console.error(`\n${colors.red}❌ TypeScript DX gate failed${colors.reset}`);
    console.log(`${colors.cyan}Next steps:${colors.reset}`);
    console.log(`  1. Apply the fix suggestions above`);
    console.log(`  2. Re-run ${colors.bright}node tools/ci-gate/typescript/index.mjs${colors.reset}`);
    console.log(`  3. Re-run ${colors.bright}pnpm ci:gate${colors.reset}\n`);
    process.exit(1);
  }

  console.log(`\n${colors.green}✅ TypeScript DX gate passed${colors.reset}\n`);
  process.exit(0);
}

main();
