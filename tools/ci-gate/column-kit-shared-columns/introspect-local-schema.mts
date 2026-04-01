#!/usr/bin/env tsx
/**
 * Local TS schema introspection for column-kit governance.
 *
 * Evaluates Drizzle table definitions exported from `packages/db/src/schema/index.ts`
 * against `@afenda/db/columns` fingerprints, without requiring a live database.
 */

import {
  getTableConfig,
  type AnyPgTable,
  type PgColumn,
} from "drizzle-orm/pg-core";
import * as schemaExports from "../../../packages/db/src/schema/index.ts";
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
  readonly schemas: readonly string[];
  readonly tables: readonly string[];
  readonly format: OutputFormat;
  readonly severityThreshold: SeverityThreshold;
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
  readonly findings: readonly Finding[];
  readonly evaluatedColumns: readonly string[];
  readonly isCompliant: boolean;
  readonly isShapeCompliant: boolean;
}

interface RunReport {
  readonly summary: {
    readonly tablesDiscovered: number;
    readonly tablesEvaluated: number;
    readonly errorCount: number;
    readonly warnCount: number;
    readonly isCompliant: boolean;
  };
  readonly tableReports: readonly TableReport[];
}

const SQL_TO_KIT_COLUMN_NAME = {
  created_at: "createdAt",
  updated_at: "updatedAt",
  deleted_at: "deletedAt",
  created_by: "createdBy",
  updated_by: "updatedBy",
  /** Append-only / audit tables that anchor on a business instant instead of created_at. */
  occurred_at: "createdAt",
  recorded_at: "createdAt",
  resolved_at: "createdAt",
  locked_at: "createdAt",
  name: "name",
} as const;

/** When multiple physical columns map to the same kit name (e.g. created_at + locked_at → createdAt), pick the canonical source. */
const CREATED_AT_SQL_PRIORITY: Readonly<Record<string, number>> = {
  created_at: 100,
  resolved_at: 92,
  occurred_at: 88,
  recorded_at: 88,
  locked_at: 70,
};

function parseArgs(argv: readonly string[]): CliOptions {
  const schemas: string[] = [];
  const tables: string[] = [];
  let format: OutputFormat = "console";
  let severityThreshold: SeverityThreshold = "error";

  for (const arg of argv) {
    if (arg.startsWith("--schema=")) {
      schemas.push(arg.slice("--schema=".length));
    } else if (arg.startsWith("--table=")) {
      tables.push(arg.slice("--table=".length));
    } else if (arg === "--format=json") {
      format = "json";
    } else if (arg.startsWith("--severity-threshold=")) {
      const value = arg.slice("--severity-threshold=".length);
      if (value === "error" || value === "warn") severityThreshold = value;
    }
  }

  return {
    schemas: Object.freeze(schemas),
    tables: Object.freeze(tables),
    format,
    severityThreshold,
  };
}

function findingKey(table: string, kind: Finding["kind"], subject: string): string {
  return `${table}::${kind}::${subject}`;
}

function defaultToString(defaultValue: unknown): string {
  if (!defaultValue || typeof defaultValue !== "object") return "";
  const maybeSql = defaultValue as { queryChunks?: Array<{ value?: unknown }> };
  if (!Array.isArray(maybeSql.queryChunks)) return "";
  return maybeSql.queryChunks
    .flatMap((chunk) => {
      if (!chunk || !("value" in chunk)) return [];
      const value = chunk.value;
      if (Array.isArray(value)) return value.map((v) => String(v));
      return [String(value)];
    })
    .join("")
    .toLowerCase();
}

function isDefaultNow(column: PgColumn): boolean {
  if (!column.hasDefault) return false;
  const rendered = defaultToString(column.default);
  return /now\(\)|current_timestamp|statement_timestamp\(\)|transaction_timestamp\(\)/i.test(
    rendered
  );
}

function referenceMapForTable(table: AnyPgTable): Map<string, string> {
  const cfg = getTableConfig(table);
  const out = new Map<string, string>();
  for (const fk of cfg.foreignKeys) {
    const ref = fk.reference();
    const foreignCfg = getTableConfig(ref.foreignTable as AnyPgTable);
    const foreignSchema = foreignCfg.schema ?? "public";
    for (let i = 0; i < ref.columns.length; i += 1) {
      const local = ref.columns[i]?.name;
      const foreign = ref.foreignColumns[i]?.name;
      if (!local || !foreign) continue;
      out.set(local, `${foreignSchema}.${foreignCfg.name}.${foreign}`);
    }
  }
  return out;
}

function toCandidate(
  column: PgColumn,
  referencesByColumn: ReadonlyMap<string, string>
): SharedColumnShapeCandidate | null {
  const key = SQL_TO_KIT_COLUMN_NAME[column.name as keyof typeof SQL_TO_KIT_COLUMN_NAME];
  if (!key) return null;

  const sqlType = column.getSQLType().toLowerCase();
  if (key === "createdAt" || key === "updatedAt" || key === "deletedAt") {
    return {
      name: key,
      type: "timestamp",
      timezone: sqlType.includes("with time zone"),
      notNull: column.notNull,
      defaultNow: isDefaultNow(column),
    };
  }

  if (key === "createdBy" || key === "updatedBy") {
    return {
      name: key,
      type: "integer",
      notNull: column.notNull,
      ...(referencesByColumn.get(column.name)
        ? { references: referencesByColumn.get(column.name)! }
        : {}),
    };
  }

  return {
    name: key,
    type: "text",
    notNull: column.notNull,
    ...(typeof column.length === "number" ? { maxLength: column.length } : {}),
  };
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

/**
 * Merge duplicate kit fingerprints (same `name`) from aliases like `locked_at` / `occurred_at` → `createdAt`.
 */
function coalesceShapeCandidatesFromPgColumns(
  columns: readonly PgColumn[],
  referencesByColumn: ReadonlyMap<string, string>
): SharedColumnShapeCandidate[] {
  const byKit = new Map<string, { cand: SharedColumnShapeCandidate; rank: number }>();

  for (const col of columns) {
    const cand = toCandidate(col, referencesByColumn);
    if (!cand) continue;
    const score = shapeCandidateScore(cand);
    const sourcePri =
      cand.name === "createdAt" ? CREATED_AT_SQL_PRIORITY[col.name] ?? 0 : 1000;
    const rank = sourcePri * 10 + score;

    const prev = byKit.get(cand.name);
    if (!prev || rank > prev.rank) {
      byKit.set(cand.name, { cand, rank });
    }
  }
  return [...byKit.values()].map((x) => x.cand);
}

function fromCoverageViolation(table: string, violation: ColumnCoverageViolation): Finding {
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

function buildReport(options: CliOptions): RunReport {
  const matrix = loadGovernanceMatrix();
  const reports: TableReport[] = [];
  let discovered = 0;

  for (const candidate of Object.values(schemaExports)) {
    try {
      const table = candidate as AnyPgTable;
      const cfg = getTableConfig(table);
      const schema = cfg.schema ?? "public";
      const qualified = `${schema}.${cfg.name}`;
      discovered += 1;

      if (options.schemas.length > 0 && !options.schemas.includes(schema)) continue;
      if (options.tables.length > 0 && !options.tables.includes(qualified)) continue;

      const referencesByColumn = referenceMapForTable(table);
      const shapeCandidates = coalesceShapeCandidatesFromPgColumns(
        cfg.columns,
        referencesByColumn
      );

      const gov = evaluateSharedColumnCoverageWithShapes(shapeCandidates);
      const resolvedProfile = resolveGovernanceProfile(matrix, qualified);
      const findings: Finding[] = gov.violations
        .filter((v) => {
          if (v.kind !== "missingMandatory" && v.kind !== "missingRecommended") return true;
          if (!resolvedProfile) return true;
          return !matrixExemptsCoverageViolation(matrix, resolvedProfile.profile, v);
        })
        .map((v) => fromCoverageViolation(qualified, v));
      if (!resolvedProfile && matrix.failOnUnclassified) {
        findings.push({
          key: findingKey(qualified, "unclassifiedGovernance", qualified),
          severity: "error",
          table: qualified,
          kind: "unclassifiedGovernance",
          message: "table is not classified by governance matrix (add explicit or pattern rule)",
        });
      }
      for (const v of gov.shapeViolations) {
        findings.push({
          key: findingKey(qualified, "shapeMismatch", v.column),
          severity: "error",
          table: qualified,
          kind: "shapeMismatch",
          message: `shape mismatch for ${v.column}: expected=${JSON.stringify(
            v.expected
          )} actual=${JSON.stringify(v.actual)}`,
        });
      }

      reports.push({
        table: qualified,
        findings: Object.freeze(findings),
        evaluatedColumns: Object.freeze(shapeCandidates.map((c) => c.name)),
        isCompliant: gov.isCompliant,
        isShapeCompliant: gov.isShapeCompliant,
      });
    } catch {
      // not a Drizzle table export
    }
  }

  reports.sort((a, b) => a.table.localeCompare(b.table, "en", { sensitivity: "base" }));
  const findings = reports.flatMap((r) => r.findings);
  const errorCount = findings.filter((f) => f.severity === "error").length;
  const warnCount = findings.filter((f) => f.severity === "warn").length;

  return {
    summary: {
      tablesDiscovered: discovered,
      tablesEvaluated: reports.length,
      errorCount,
      warnCount,
      isCompliant: errorCount === 0,
    },
    tableReports: Object.freeze(reports),
  };
}

function printConsole(report: RunReport): void {
  console.log("column-kit local-ts governance\n");
  console.log(
    `tables discovered=${report.summary.tablesDiscovered}, evaluated=${report.summary.tablesEvaluated}, ` +
      `errors=${report.summary.errorCount}, warnings=${report.summary.warnCount}`
  );
  console.log("");

  for (const table of report.tableReports) {
    console.log(table.table);
    if (table.findings.length === 0) {
      console.log("  [ok] compliant");
      continue;
    }
    for (const f of table.findings) {
      console.log(`  [${f.severity}] ${f.kind} - ${f.message}`);
      console.log(`      key: ${f.key}`);
    }
  }
}

function main(): void {
  const options = parseArgs(process.argv.slice(2));
  const report = buildReport(options);
  const findings = report.tableReports.flatMap((r) => r.findings);
  const fail = shouldFail(findings, options.severityThreshold);

  if (options.format === "json") {
    console.log(JSON.stringify(report, null, 2));
  } else {
    printConsole(report);
  }

  process.exit(fail ? 1 : 0);
}

try {
  main();
} catch (err) {
  console.error("column-kit local-ts governance failed:", err);
  process.exit(1);
}
