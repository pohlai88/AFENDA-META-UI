/**
 * OSS-inspired adjunct checks (Squawk-style migration lint, baseline drift, observability hints).
 * These complement graph-validation; they do not replace FK/orphan/tenant checks.
 */

import { createHash } from "node:crypto";
import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { spawnSync } from "node:child_process";
import type { FkValidationCatalog } from "./fk-catalog.js";
import type { AdjunctCheckResult, GraphValidationAdjunctsDto } from "./types.js";

/** Squawk rule names to exclude, one per line; # comments allowed. */
function loadSquawkExcludeArgs(): string[] {
  const path = process.env.GRAPH_VALIDATION_SQUAWK_ALLOWLIST?.trim();
  if (!path || !existsSync(path)) return [];
  const text = readFileSync(path, "utf-8");
  const rules = text
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.length > 0 && !l.startsWith("#"));
  return rules.map((rule) => `--exclude=${rule}`);
}

function collectSqlFiles(dir: string, acc: string[] = []): string[] {
  if (!existsSync(dir)) return acc;
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    const st = statSync(full);
    if (st.isDirectory()) {
      collectSqlFiles(full, acc);
    } else if (name.endsWith(".sql")) {
      acc.push(full);
    }
  }
  return acc;
}

/**
 * Run Squawk on migration SQL if available (PATH `squawk` or `SQUAWK_BIN`).
 * Skips when no migrations or binary missing.
 */
export function runMigrationSqlLint(migrationsRoot: string): AdjunctCheckResult {
  const sqlFiles = collectSqlFiles(migrationsRoot).sort();
  if (sqlFiles.length === 0) {
    return {
      id: "migration_sql_lint",
      status: "skipped",
      message: `No .sql files under ${migrationsRoot}`,
    };
  }

  const squawkBin = process.env.SQUAWK_BIN?.trim() || "squawk";
  const firstTry = spawnSync(squawkBin, ["--version"], {
    encoding: "utf-8",
    shell: process.platform === "win32",
  });
  if (firstTry.status !== 0) {
    return {
      id: "migration_sql_lint",
      status: "skipped",
      message:
        "Squawk not installed (install: https://github.com/sbdchd/squawk) or set SQUAWK_BIN. Migration SQL not linted.",
      details: { filesConsidered: sqlFiles.length },
    };
  }

  const excludeArgs = loadSquawkExcludeArgs();
  const args = [...excludeArgs, ...sqlFiles];
  const r = spawnSync(squawkBin, args, {
    encoding: "utf-8",
    maxBuffer: 10 * 1024 * 1024,
    shell: process.platform === "win32",
  });

  if (r.status === 0) {
    return {
      id: "migration_sql_lint",
      status: "passed",
      message: `Squawk: no issues in ${sqlFiles.length} migration file(s)`,
      details: {
        fileCount: sqlFiles.length,
        excludeRuleCount: excludeArgs.length,
        allowlistPath: process.env.GRAPH_VALIDATION_SQUAWK_ALLOWLIST?.trim() || undefined,
      },
    };
  }

  return {
    id: "migration_sql_lint",
    status: "failed",
    message: "Squawk reported migration SQL issues",
    details: {
      exitCode: r.status,
      stderr: r.stderr?.slice(0, 8000),
      stdout: r.stdout?.slice(0, 8000),
      fileCount: sqlFiles.length,
      excludeRuleCount: excludeArgs.length,
    },
  };
}

/** Fingerprint FK catalog for drift comparison (sorted constraint names). */
export function fingerprintFkCatalog(catalog: FkValidationCatalog): string {
  const names = catalog.relationships
    .map((r) => r.constraintName)
    .filter(Boolean)
    .sort();
  return createHash("sha256").update(names.join("\n")).digest("hex");
}

/**
 * Compare current catalog fingerprint to baseline file (JSON with `fingerprint` or raw catalog export).
 */
export function checkFkCatalogDrift(
  catalog: FkValidationCatalog,
  baselinePath: string | undefined
): AdjunctCheckResult {
  if (!baselinePath?.trim()) {
    return {
      id: "fk_catalog_drift",
      status: "skipped",
      message:
        "Set GRAPH_VALIDATION_FK_BASELINE_PATH to a prior fk-catalog.json (or file with { fingerprint }) for drift checks.",
    };
  }

  if (!existsSync(baselinePath)) {
    return {
      id: "fk_catalog_drift",
      status: "warning",
      message: `Baseline file missing: ${baselinePath}`,
    };
  }

  let baselineFp: string;
  try {
    const raw = readFileSync(baselinePath, "utf-8");
    const parsed = JSON.parse(raw) as { fingerprint?: string; relationships?: unknown[] };
    if (typeof parsed.fingerprint === "string") {
      baselineFp = parsed.fingerprint;
    } else if (Array.isArray(parsed.relationships)) {
      const names = (parsed.relationships as { constraintName?: string }[])
        .map((x) => x.constraintName)
        .filter(Boolean)
        .sort();
      baselineFp = createHash("sha256").update(names.join("\n")).digest("hex");
    } else {
      return {
        id: "fk_catalog_drift",
        status: "warning",
        message: "Baseline JSON has no fingerprint or relationships[]",
      };
    }
  } catch (e) {
    return {
      id: "fk_catalog_drift",
      status: "failed",
      message: `Failed to read baseline: ${baselinePath}`,
      details: { error: String(e) },
    };
  }

  const current = fingerprintFkCatalog(catalog);
  if (current === baselineFp) {
    return {
      id: "fk_catalog_drift",
      status: "passed",
      message: "FK catalog fingerprint matches baseline",
      details: { fingerprint: current.slice(0, 16) + "…" },
    };
  }

  return {
    id: "fk_catalog_drift",
    status: "warning",
    message: "FK catalog fingerprint differs from baseline (review intentional schema changes)",
    details: {
      current: current.slice(0, 16) + "…",
      baseline: baselineFp.slice(0, 16) + "…",
    },
  };
}

export function schemaObservabilityHint(repoRoot: string): AdjunctCheckResult {
  const migrationsAbs = join(repoRoot, "packages", "db", "migrations");
  const relMigrations = relative(repoRoot, migrationsAbs);
  const sqlFiles = collectSqlFiles(migrationsAbs).sort();
  const manifestDir = process.env.GRAPH_VALIDATION_SCHEMA_MANIFEST_DIR?.trim();
  let manifestPath: string | undefined;
  if (manifestDir) {
    try {
      mkdirSync(manifestDir, { recursive: true });
      manifestPath = join(manifestDir, "schema-manifest.json");
      const manifest = {
        generatedAt: new Date().toISOString(),
        repoRoot: relative(manifestDir, repoRoot) || ".",
        migrationsPath: relMigrations,
        sqlFiles: sqlFiles.map((f) => relative(repoRoot, f)),
      };
      writeFileSync(manifestPath, JSON.stringify(manifest, null, 2), "utf-8");
    } catch (e) {
      return {
        id: "schema_observability",
        status: "warning",
        message: `Could not write schema manifest: ${String(e)}`,
        details: { schemaCrawler: "https://github.com/schemacrawler/SchemaCrawler", migrationsPath: relMigrations },
      };
    }
  }
  return {
    id: "schema_observability",
    status: "passed",
    message: manifestPath
      ? `Schema manifest written: ${manifestPath}`
      : "For ER diagrams and schema docs, run SchemaCrawler or export FK catalog via graph-validation export-catalog",
    details: {
      schemaCrawler: "https://github.com/schemacrawler/SchemaCrawler",
      migrationsPath: relMigrations,
      migrationSqlCount: sqlFiles.length,
      ...(manifestPath ? { manifestPath } : {}),
    },
  };
}

export function runGraphValidationAdjuncts(options: {
  repoRoot: string;
  catalog: FkValidationCatalog;
}): GraphValidationAdjunctsDto {
  const migrationsRoot = join(options.repoRoot, "packages", "db", "migrations");
  const baselinePath = process.env.GRAPH_VALIDATION_FK_BASELINE_PATH?.trim();

  const checks: AdjunctCheckResult[] = [
    runMigrationSqlLint(migrationsRoot),
    checkFkCatalogDrift(options.catalog, baselinePath),
    schemaObservabilityHint(options.repoRoot),
  ];

  return { checks };
}
