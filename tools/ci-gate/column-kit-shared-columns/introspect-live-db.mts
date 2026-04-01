#!/usr/bin/env tsx
/**
 * Live DB introspection for column-kit governance.
 *
 * Compares actual PostgreSQL column metadata against
 * `@afenda/db/columns` fingerprints via `evaluateSharedColumnCoverageWithShapes`.
 *
 * Usage:
 *   pnpm exec tsx tools/ci-gate/column-kit-shared-columns/introspect-live-db.mts
 *   pnpm exec tsx tools/ci-gate/column-kit-shared-columns/introspect-live-db.mts --schema=security --schema=hr
 *   pnpm exec tsx tools/ci-gate/column-kit-shared-columns/introspect-live-db.mts --format=json
 *   pnpm exec tsx tools/ci-gate/column-kit-shared-columns/introspect-live-db.mts --baseline=tools/ci-gate/column-kit-shared-columns/live-db-baseline.json --verbose
 *   pnpm exec tsx tools/ci-gate/column-kit-shared-columns/introspect-live-db.mts --update-baseline
 *   pnpm exec tsx tools/ci-gate/column-kit-shared-columns/introspect-live-db.mts --update-baseline --write-baseline
 *
 * Notes:
 * - Fails by default when DATABASE_URL is absent (to avoid false-green/self-happy checks).
 * - Use --allow-missing-db-url to downgrade missing DB URL to a skipped check.
 */

import { neon, type NeonQueryFunction } from "@neondatabase/serverless";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, isAbsolute, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { config as loadDotEnv } from "dotenv";

import {
  evaluateSharedColumnCoverageWithShapes,
  type ColumnCoverageViolation,
  type SharedColumnShapeCandidate,
} from "../../../packages/db/src/column-kit/index.ts";
import {
  loadGovernanceMatrix,
  matrixExemptsCoverageViolation,
  resolveGovernanceProfile,
} from "./governance-policy.mts";

type OutputFormat = "console" | "json";
type Severity = "error" | "warn";
type SeverityThreshold = "error" | "warn";

interface CliOptions {
  readonly databaseUrl?: string;
  readonly schemas: readonly string[];
  readonly tables: readonly string[];
  readonly format: OutputFormat;
  readonly severityThreshold: SeverityThreshold;
  readonly allowMissingDbUrl: boolean;
  readonly baselinePath?: string;
  readonly verbose: boolean;
  readonly updateBaseline: boolean;
  readonly writeBaseline: boolean;
  readonly includeAllSchemas: boolean;
}

interface IntrospectedColumnRow {
  readonly tableSchema: string;
  readonly tableName: string;
  readonly columnName: string;
  readonly dataType: string | null;
  readonly udtName: string | null;
  readonly isNullable: string | null;
  readonly columnDefault: string | null;
  readonly characterMaximumLength: number | null;
  readonly fkReference: string | null;
}

interface Finding {
  readonly key: string;
  readonly severity: Severity;
  readonly table: string;
  readonly kind:
    | "missingMandatory"
    | "missingRecommended"
    | "unexpectedCritical"
    | "unexpectedInformational"
    | "shapeMismatch"
    | "unclassifiedGovernance";
  readonly message: string;
}

interface TableReport {
  readonly table: string;
  readonly evaluatedColumns: readonly string[];
  readonly findings: readonly Finding[];
  readonly isCompliant: boolean;
  readonly isShapeCompliant: boolean;
}

interface RunReport {
  readonly summary: {
    readonly tablesWithTrackedColumns: number;
    readonly tablesEvaluated: number;
    readonly errorCount: number;
    readonly warnCount: number;
    readonly suppressedByBaseline: number;
    readonly isCompliant: boolean;
  };
  readonly tableReports: readonly TableReport[];
}

interface BaselineEntry {
  readonly key: string;
  readonly reason: string;
  readonly severity?: Severity;
}

interface BaselineFile {
  readonly _comment?: string;
  readonly baseline: Record<string, { reason: string; severity?: Severity }>;
}

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(SCRIPT_DIR, "..", "..", "..");
const DEFAULT_BASELINE_PATH = resolve(SCRIPT_DIR, "live-db-baseline.json");
const DEFAULT_DOMAIN_SCHEMAS = Object.freeze([
  "core",
  "security",
  "reference",
  "sales",
  "hr",
  "meta",
  "accounting",
  "inventory",
  "purchasing",
]);
// Ensure local runs can resolve DATABASE_URL from repo root .env
loadDotEnv({ path: resolve(REPO_ROOT, ".env"), override: false });

const SQL_TO_KIT_COLUMN_NAME = {
  created_at: "createdAt",
  updated_at: "updatedAt",
  deleted_at: "deletedAt",
  created_by: "createdBy",
  updated_by: "updatedBy",
  occurred_at: "createdAt",
  recorded_at: "createdAt",
  resolved_at: "createdAt",
  locked_at: "createdAt",
  name: "name",
} as const;

const CREATED_AT_SQL_PRIORITY: Readonly<Record<string, number>> = {
  created_at: 100,
  resolved_at: 92,
  occurred_at: 88,
  recorded_at: 88,
  locked_at: 70,
};

const TRACKED_SQL_COLUMN_NAMES = Object.freeze(
  Object.keys(SQL_TO_KIT_COLUMN_NAME)
) as readonly (keyof typeof SQL_TO_KIT_COLUMN_NAME)[];

function findingKey(table: string, kind: Finding["kind"], subject: string): string {
  return `${table}::${kind}::${subject}`;
}

function resolveBaselinePath(pathFromArg?: string): string {
  if (!pathFromArg || pathFromArg.trim() === "") {
    return DEFAULT_BASELINE_PATH;
  }
  return isAbsolute(pathFromArg) ? pathFromArg : resolve(process.cwd(), pathFromArg);
}

function loadBaselineEntries(pathToBaseline: string): readonly BaselineEntry[] {
  if (!existsSync(pathToBaseline)) return [];
  const raw = readFileSync(pathToBaseline, "utf8");
  const parsed = JSON.parse(raw) as {
    baseline?: Record<string, { reason?: unknown; severity?: unknown }>;
  };
  const map = parsed.baseline ?? {};
  const entries: BaselineEntry[] = [];
  for (const [key, value] of Object.entries(map)) {
    if (key.startsWith("_")) continue;
    if (!value || typeof value !== "object") {
      throw new Error(`invalid baseline entry for ${JSON.stringify(key)}; expected object`);
    }
    if (typeof value.reason !== "string" || value.reason.trim() === "") {
      throw new Error(`baseline reason is required for ${JSON.stringify(key)}`);
    }
    const severity =
      value.severity === "error" || value.severity === "warn" ? value.severity : undefined;
    entries.push({ key, reason: value.reason.trim(), severity });
  }
  return Object.freeze(entries);
}

function loadBaselineFile(pathToBaseline: string): BaselineFile {
  if (!existsSync(pathToBaseline)) {
    return {
      _comment:
        "baseline.{table::kind::subject} = { reason, severity? }. Keep entries narrow and time-bound.",
      baseline: {},
    };
  }
  const raw = readFileSync(pathToBaseline, "utf8");
  const parsed = JSON.parse(raw) as BaselineFile;
  const baseline = parsed.baseline ?? {};
  return {
    _comment: parsed._comment,
    baseline: { ...baseline },
  };
}

function collectFindings(report: RunReport): readonly Finding[] {
  return Object.freeze(report.tableReports.flatMap((r) => r.findings));
}

function toStableBaselineJson(file: BaselineFile): string {
  const orderedKeys = Object.keys(file.baseline).sort((a, b) =>
    a.localeCompare(b, "en", { sensitivity: "base" })
  );
  const baseline: Record<string, { reason: string; severity?: Severity }> = {};
  for (const key of orderedKeys) {
    baseline[key] = file.baseline[key]!;
  }
  const normalized: BaselineFile = {
    ...(file._comment ? { _comment: file._comment } : {}),
    baseline,
  };
  return `${JSON.stringify(normalized, null, 2)}\n`;
}

function applyBaseline(
  report: RunReport,
  baseline: readonly BaselineEntry[],
  verbose = false
): { report: RunReport; suppressed: readonly { finding: Finding; entry: BaselineEntry }[] } {
  if (baseline.length === 0) return { report, suppressed: Object.freeze([]) };

  const baselineByKey = new Map(baseline.map((b) => [b.key, b]));
  const suppressed: { finding: Finding; entry: BaselineEntry }[] = [];

  const tableReports = report.tableReports.map((tableReport) => {
    const findings = tableReport.findings.filter((finding) => {
      const entry = baselineByKey.get(finding.key);
      if (!entry) return true;
      if (entry.severity && entry.severity !== finding.severity) return true;
      suppressed.push({ finding, entry });
      if (verbose) {
        console.log(
          `column-kit live-db governance: suppressed ${finding.key} - ${entry.reason}`
        );
      }
      return false;
    });
    return {
      ...tableReport,
      findings: Object.freeze(findings),
      isCompliant: !findings.some((f) => f.severity === "error"),
      isShapeCompliant: !findings.some((f) => f.kind === "shapeMismatch"),
    };
  });

  const allFindings = tableReports.flatMap((t) => t.findings);
  const errorCount = allFindings.filter((f) => f.severity === "error").length;
  const warnCount = allFindings.filter((f) => f.severity === "warn").length;
  return {
    report: {
      summary: {
        ...report.summary,
        errorCount,
        warnCount,
        suppressedByBaseline: suppressed.length,
        isCompliant: errorCount === 0,
      },
      tableReports: Object.freeze(tableReports),
    },
    suppressed: Object.freeze(suppressed),
  };
}

function parseArgs(argv: readonly string[]): CliOptions {
  const schemas: string[] = [];
  const tables: string[] = [];
  let databaseUrl = process.env.DATABASE_URL;
  let format: OutputFormat = "console";
  let severityThreshold: SeverityThreshold = "error";
  let allowMissingDbUrl = false;
  let baselinePath: string | undefined;
  let verbose = false;
  let updateBaseline = false;
  let writeBaseline = false;
  let includeAllSchemas = false;

  for (const arg of argv) {
    if (arg.startsWith("--database-url=")) {
      databaseUrl = arg.slice("--database-url=".length);
    } else if (arg.startsWith("--schema=")) {
      schemas.push(arg.slice("--schema=".length));
    } else if (arg.startsWith("--table=")) {
      tables.push(arg.slice("--table=".length));
    } else if (arg === "--format=json") {
      format = "json";
    } else if (arg.startsWith("--severity-threshold=")) {
      const value = arg.slice("--severity-threshold=".length);
      if (value === "error" || value === "warn") severityThreshold = value;
    } else if (arg === "--allow-missing-db-url") {
      allowMissingDbUrl = true;
    } else if (arg.startsWith("--baseline=")) {
      baselinePath = arg.slice("--baseline=".length);
    } else if (arg === "--verbose") {
      verbose = true;
    } else if (arg === "--update-baseline") {
      updateBaseline = true;
    } else if (arg === "--write-baseline") {
      writeBaseline = true;
    } else if (arg === "--all-schemas") {
      includeAllSchemas = true;
    }
  }

  return {
    databaseUrl: databaseUrl?.trim() || undefined,
    schemas: Object.freeze(schemas),
    tables: Object.freeze(tables),
    format,
    severityThreshold,
    allowMissingDbUrl,
    baselinePath,
    verbose,
    updateBaseline,
    writeBaseline,
    includeAllSchemas,
  };
}

function isDefaultNowExpression(columnDefault: string | null): boolean {
  if (!columnDefault) return false;
  return /(now\(\)|current_timestamp|statement_timestamp\(\)|transaction_timestamp\(\))/i.test(
    columnDefault
  );
}

function normalizeFkReference(reference: string | null): string | undefined {
  if (!reference) return undefined;
  // Preserve canonical `schema.table.column` shape from information_schema.
  return reference;
}

function shapeCandidateScore(c: SharedColumnShapeCandidate): number {
  let s = 0;
  if (c.type === "timestamp") {
    if (c.defaultNow) s += 4;
    if (c.notNull) s += 2;
  } else if (c.type === "integer" && c.notNull) {
    s += 2;
  } else if (c.type === "text" && c.notNull) {
    s += 1;
  }
  return s;
}

function coalesceShapeCandidatesWithSqlSource(
  rows: readonly { sqlName: string; cand: SharedColumnShapeCandidate }[]
): SharedColumnShapeCandidate[] {
  const byKit = new Map<string, { cand: SharedColumnShapeCandidate; rank: number }>();
  for (const { sqlName, cand } of rows) {
    const score = shapeCandidateScore(cand);
    const sourcePri =
      cand.name === "createdAt" ? CREATED_AT_SQL_PRIORITY[sqlName] ?? 0 : 1000;
    const rank = sourcePri * 10 + score;
    const prev = byKit.get(cand.name);
    if (!prev || rank > prev.rank) {
      byKit.set(cand.name, { cand, rank });
    }
  }
  return [...byKit.values()].map((x) => x.cand);
}

function toShapeCandidate(row: IntrospectedColumnRow): SharedColumnShapeCandidate | null {
  const key = SQL_TO_KIT_COLUMN_NAME[row.columnName as keyof typeof SQL_TO_KIT_COLUMN_NAME];
  if (!key) return null;

  if (key === "createdAt" || key === "updatedAt" || key === "deletedAt") {
    return {
      name: key,
      type: "timestamp",
      timezone:
        row.udtName === "timestamptz" || row.dataType === "timestamp with time zone",
      notNull: row.isNullable === "NO",
      defaultNow: isDefaultNowExpression(row.columnDefault),
    };
  }

  if (key === "createdBy" || key === "updatedBy") {
    return {
      name: key,
      type: "integer",
      notNull: row.isNullable === "NO",
      references: normalizeFkReference(row.fkReference),
    };
  }

  return {
    name: key,
    type: "text",
    notNull: row.isNullable === "NO",
    ...(row.characterMaximumLength != null ? { maxLength: row.characterMaximumLength } : {}),
  };
}

function findFromCoverageViolation(table: string, violation: ColumnCoverageViolation): Finding {
  if (violation.kind === "missingMandatory") {
    return {
      key: findingKey(table, "missingMandatory", violation.column),
      severity: "error",
      table,
      kind: "missingMandatory",
      message: `missing mandatory column-kit field: ${violation.column}`,
    };
  }
  if (violation.kind === "missingRecommended") {
    return {
      key: findingKey(table, "missingRecommended", violation.column),
      severity: "warn",
      table,
      kind: "missingRecommended",
      message: `missing recommended column-kit field: ${violation.column}`,
    };
  }

  return {
    key: findingKey(
      table,
      violation.severity === "critical" ? "unexpectedCritical" : "unexpectedInformational",
      violation.column
    ),
    severity: violation.severity === "critical" ? "error" : "warn",
    table,
    kind:
      violation.severity === "critical"
        ? "unexpectedCritical"
        : "unexpectedInformational",
    message: `unexpected shared-style column: ${violation.column} (${violation.severity})`,
  };
}

function shouldFail(findings: readonly Finding[], threshold: SeverityThreshold): boolean {
  if (findings.some((f) => f.severity === "error")) return true;
  if (threshold === "warn" && findings.some((f) => f.severity === "warn")) return true;
  return false;
}

async function fetchTargetSchemas(
  sql: NeonQueryFunction<false, false>,
  requestedSchemas: readonly string[],
  includeAllSchemas: boolean
): Promise<readonly string[]> {
  if (requestedSchemas.length > 0) {
    return requestedSchemas;
  }
  if (!includeAllSchemas) {
    return DEFAULT_DOMAIN_SCHEMAS;
  }

  const rows = (await sql.query(
    `
      select schema_name
      from information_schema.schemata
      where schema_name not in ('pg_catalog', 'information_schema')
        and schema_name not like 'pg_toast%'
      order by schema_name
    `,
    []
  )) as { schema_name: string }[];

  return Object.freeze(rows.map((r) => r.schema_name));
}

async function fetchIntrospectedRows(
  sql: NeonQueryFunction<false, false>,
  schemas: readonly string[],
  tables: readonly string[]
): Promise<readonly IntrospectedColumnRow[]> {
  const rows = (await sql.query(
    `
      with fk_map as (
        select
          kcu.table_schema,
          kcu.table_name,
          kcu.column_name,
          concat(ccu.table_schema, '.', ccu.table_name, '.', ccu.column_name) as fk_reference
        from information_schema.table_constraints tc
        join information_schema.key_column_usage kcu
          on tc.constraint_name = kcu.constraint_name
         and tc.table_schema = kcu.table_schema
        join information_schema.constraint_column_usage ccu
          on ccu.constraint_name = tc.constraint_name
         and ccu.constraint_schema = tc.constraint_schema
        where tc.constraint_type = 'FOREIGN KEY'
      )
      select
        c.table_schema,
        c.table_name,
        c.column_name,
        c.data_type,
        c.udt_name,
        c.is_nullable,
        c.column_default,
        c.character_maximum_length,
        f.fk_reference
      from information_schema.columns c
      left join fk_map f
        on f.table_schema = c.table_schema
       and f.table_name = c.table_name
       and f.column_name = c.column_name
      where c.table_schema = any($1::text[])
        and c.column_name = any($2::text[])
        and (
          cardinality($3::text[]) = 0
          or concat(c.table_schema, '.', c.table_name) = any($3::text[])
        )
      order by c.table_schema, c.table_name, c.ordinal_position
    `,
    [schemas, TRACKED_SQL_COLUMN_NAMES, tables]
  )) as {
    table_schema: string;
    table_name: string;
    column_name: string;
    data_type: string | null;
    udt_name: string | null;
    is_nullable: string | null;
    column_default: string | null;
    character_maximum_length: number | null;
    fk_reference: string | null;
  }[];

  return Object.freeze(
    rows.map((r) => ({
      tableSchema: r.table_schema,
      tableName: r.table_name,
      columnName: r.column_name,
      dataType: r.data_type,
      udtName: r.udt_name,
      isNullable: r.is_nullable,
      columnDefault: r.column_default,
      characterMaximumLength: r.character_maximum_length,
      fkReference: r.fk_reference,
    }))
  );
}

function buildReport(rows: readonly IntrospectedColumnRow[]): RunReport {
  const matrix = loadGovernanceMatrix();
  const byTable = new Map<string, { sqlName: string; cand: SharedColumnShapeCandidate }[]>();
  const tablesWithTrackedColumns = new Set<string>();

  for (const row of rows) {
    const table = `${row.tableSchema}.${row.tableName}`;
    tablesWithTrackedColumns.add(table);
    const candidate = toShapeCandidate(row);
    if (!candidate) continue;
    const list = byTable.get(table) ?? [];
    list.push({ sqlName: row.columnName, cand: candidate });
    byTable.set(table, list);
  }

  const tableReports: TableReport[] = [];
  for (const [table, rawRows] of [...byTable.entries()].sort((a, b) =>
    a[0].localeCompare(b[0], "en", { sensitivity: "base" })
  )) {
    const candidates = coalesceShapeCandidatesWithSqlSource(rawRows);
    const report = evaluateSharedColumnCoverageWithShapes(candidates);
    const resolvedProfile = resolveGovernanceProfile(matrix, table);
    const findings: Finding[] = report.violations
      .filter((v) => {
        if (v.kind !== "missingMandatory" && v.kind !== "missingRecommended") return true;
        if (!resolvedProfile) return true;
        return !matrixExemptsCoverageViolation(matrix, resolvedProfile.profile, v);
      })
      .map((v) => findFromCoverageViolation(table, v));
    if (!resolvedProfile && matrix.failOnUnclassified) {
      findings.push({
        key: findingKey(table, "unclassifiedGovernance", table),
        severity: "error",
        table,
        kind: "unclassifiedGovernance",
        message: "table is not classified by governance matrix (add explicit or pattern rule)",
      });
    }
    for (const violation of report.shapeViolations) {
      findings.push({
        key: findingKey(table, "shapeMismatch", violation.column),
        severity: "error",
        table,
        kind: "shapeMismatch",
        message: `shape mismatch for ${violation.column}: expected=${JSON.stringify(
          violation.expected
        )} actual=${JSON.stringify(violation.actual)}`,
      });
    }
    tableReports.push({
      table,
      evaluatedColumns: Object.freeze(candidates.map((c) => c.name)),
      findings: Object.freeze(findings),
      isCompliant: report.isCompliant,
      isShapeCompliant: report.isShapeCompliant,
    });
  }

  const allFindings = tableReports.flatMap((t) => t.findings);
  const errorCount = allFindings.filter((f) => f.severity === "error").length;
  const warnCount = allFindings.filter((f) => f.severity === "warn").length;

  return {
    summary: {
      tablesWithTrackedColumns: tablesWithTrackedColumns.size,
      tablesEvaluated: tableReports.length,
      errorCount,
      warnCount,
      suppressedByBaseline: 0,
      isCompliant: errorCount === 0,
    },
    tableReports: Object.freeze(tableReports),
  };
}

function printConsole(report: RunReport): void {
  console.log("column-kit live-db governance\n");
  console.log(
    `tables with tracked columns=${report.summary.tablesWithTrackedColumns}, evaluated=${report.summary.tablesEvaluated}, ` +
      `errors=${report.summary.errorCount}, warnings=${report.summary.warnCount}, ` +
      `suppressed=${report.summary.suppressedByBaseline}`
  );
  if (report.tableReports.length === 0) {
    console.log("no tables with tracked column-kit SQL columns were found.");
    return;
  }
  console.log("");

  for (const table of report.tableReports) {
    console.log(`${table.table}`);
    if (table.findings.length === 0) {
      console.log("  [ok] compliant");
      continue;
    }
    for (const finding of table.findings) {
      console.log(`  [${finding.severity}] ${finding.kind} - ${finding.message}`);
      console.log(`      key: ${finding.key}`);
    }
  }
}

async function main(): Promise<void> {
  const options = parseArgs(process.argv.slice(2));
  const baselinePath = resolveBaselinePath(options.baselinePath);
  const baseline = loadBaselineEntries(baselinePath);

  if (!options.databaseUrl) {
    const message =
      "column-kit live-db governance: DATABASE_URL is required (or pass --database-url=...).";
    if (options.allowMissingDbUrl) {
      if (options.format === "json") {
        console.log(
          JSON.stringify(
            {
              summary: {
                skipped: true,
                reason: "missing DATABASE_URL",
                baselinePath,
              },
            },
            null,
            2
          )
        );
      } else {
        console.warn(`${message} skipped due to --allow-missing-db-url.`);
      }
      process.exit(0);
    }
    console.error(message);
    process.exit(1);
  }

  const sql = neon(options.databaseUrl);
  const schemas = await fetchTargetSchemas(sql, options.schemas, options.includeAllSchemas);
  const rows = await fetchIntrospectedRows(sql, schemas, options.tables);
  const initialReport = buildReport(rows);
  const { report, suppressed } = applyBaseline(initialReport, baseline, options.verbose);
  const findingsAfterBaseline = collectFindings(report);
  let baselineUpdateResult:
    | {
        baselinePath: string;
        baselineUpdated: boolean;
        entriesAdded: number;
        proposedBaseline?: BaselineFile;
      }
    | undefined;

  if (options.updateBaseline) {
    const baselineFile = loadBaselineFile(baselinePath);
    let added = 0;
    for (const finding of findingsAfterBaseline) {
      if (baselineFile.baseline[finding.key]) continue;
      baselineFile.baseline[finding.key] = {
        reason: "TODO: justify suppression and track expiration ticket",
        severity: finding.severity,
      };
      added += 1;
    }
    const rendered = toStableBaselineJson(baselineFile);
    if (options.writeBaseline) {
      writeFileSync(baselinePath, rendered, "utf8");
      baselineUpdateResult = {
        baselinePath,
        baselineUpdated: true,
        entriesAdded: added,
      };
    } else {
      baselineUpdateResult = {
        baselinePath,
        baselineUpdated: false,
        entriesAdded: added,
        proposedBaseline: JSON.parse(rendered) as BaselineFile,
      };
    }
  }

  if (options.format === "json") {
    console.log(
      JSON.stringify(
        {
          baselinePath,
          suppressedByBaseline: suppressed,
          ...(baselineUpdateResult ? { baselineUpdate: baselineUpdateResult } : {}),
          ...report,
        },
        null,
        2
      )
    );
  } else {
    if (baselineUpdateResult) {
      if (baselineUpdateResult.baselineUpdated) {
        console.log(
          `baseline updated: ${baselineUpdateResult.baselinePath} (added ${baselineUpdateResult.entriesAdded} entr${
            baselineUpdateResult.entriesAdded === 1 ? "y" : "ies"
          })`
        );
      } else {
        console.log(
          `baseline proposal: ${baselineUpdateResult.baselinePath} (would add ${baselineUpdateResult.entriesAdded} entr${
            baselineUpdateResult.entriesAdded === 1 ? "y" : "ies"
          })`
        );
        if (baselineUpdateResult.proposedBaseline) {
          console.log(`${JSON.stringify(baselineUpdateResult.proposedBaseline, null, 2)}\n`);
        }
      }
    }
    console.log(`baseline: ${baselinePath}`);
    printConsole(report);
  }

  const fail = shouldFail(findingsAfterBaseline, options.severityThreshold);
  process.exit(fail ? 1 : 0);
}

main().catch((err) => {
  console.error("column-kit live-db governance failed:", err);
  process.exit(1);
});
