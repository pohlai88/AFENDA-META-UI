import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { performance } from "node:perf_hooks";

import { and, asc, desc, eq, gte, sql } from "drizzle-orm";

import { db, pool } from "./index.js";
import { decisionAuditEntries, events } from "./schema/index.js";

const DEFAULT_ITERATIONS = 300;

type TimingResult = {
  totalMs: number;
  avgMs: number;
};

type SummaryInputRow = {
  name: string;
  dynamic: TimingResult;
  prepared: TimingResult;
};

type SummaryRow = {
  name: string;
  dynamicAvgMs: number;
  preparedAvgMs: number;
  speedup: number;
  deltaPct: number;
};

type ExportFormat = "json" | "csv";

function useSyntheticMode(): boolean {
  return process.argv.includes("--synthetic");
}

function parseIterations(): number {
  const arg = process.argv.find((entry) => entry.startsWith("--iterations="));
  if (!arg) return DEFAULT_ITERATIONS;
  const value = Number.parseInt(arg.split("=")[1] ?? "", 10);
  return Number.isFinite(value) && value > 0 ? value : DEFAULT_ITERATIONS;
}

function parseArg(name: string): string | undefined {
  const prefix = `--${name}=`;
  const arg = process.argv.find((entry) => entry.startsWith(prefix));
  if (!arg) return undefined;
  return arg.slice(prefix.length);
}

function resolveExportFormat(outputPath?: string): ExportFormat {
  const arg = parseArg("format")?.toLowerCase();
  if (arg === "csv" || arg === "json") return arg;

  if (outputPath?.toLowerCase().endsWith(".csv")) return "csv";
  return "json";
}

async function timeRun(
  label: string,
  fn: () => Promise<void>,
  iterations: number
): Promise<TimingResult> {
  const startedAt = performance.now();
  for (let index = 0; index < iterations; index += 1) {
    await fn();
  }
  const elapsedMs = performance.now() - startedAt;
  const avgMs = elapsedMs / iterations;
  console.log(`${label.padEnd(36)} total=${elapsedMs.toFixed(1)}ms avg=${avgMs.toFixed(3)}ms`);
  return { totalMs: elapsedMs, avgMs };
}

function printSpeedupSummary(rows: Array<SummaryInputRow>): SummaryRow[] {
  if (rows.length === 0) return [];

  const summary = rows.map((row) => {
    const speedup = row.dynamic.avgMs / row.prepared.avgMs;
    const delta = ((row.dynamic.avgMs - row.prepared.avgMs) / row.dynamic.avgMs) * 100;
    return {
      name: row.name,
      dynamicAvgMs: row.dynamic.avgMs,
      preparedAvgMs: row.prepared.avgMs,
      speedup,
      deltaPct: delta,
    };
  });

  console.log("");
  console.log("Speedup Summary (prepared vs dynamic)");
  for (const row of summary) {
    console.log(
      `${row.name.padEnd(30)} ${row.speedup.toFixed(2)}x faster (${row.deltaPct.toFixed(1)}% lower avg latency)`
    );
  }

  return summary;
}

function toCsv(summary: SummaryRow[]): string {
  const header = "query,dynamic_avg_ms,prepared_avg_ms,speedup,delta_pct";
  const lines = summary.map((row) =>
    [
      JSON.stringify(row.name),
      row.dynamicAvgMs.toFixed(6),
      row.preparedAvgMs.toFixed(6),
      row.speedup.toFixed(6),
      row.deltaPct.toFixed(6),
    ].join(",")
  );
  return [header, ...lines].join("\n");
}

async function writeSummaryExport(params: {
  outputPath?: string;
  format: ExportFormat;
  mode: "synthetic" | "real";
  iterations: number;
  summary: SummaryRow[];
}): Promise<void> {
  const { outputPath, format, mode, iterations, summary } = params;
  if (!outputPath || summary.length === 0) return;

  const resolvedPath = path.resolve(outputPath);
  const directory = path.dirname(resolvedPath);
  await mkdir(directory, { recursive: true });

  if (format === "csv") {
    await writeFile(resolvedPath, toCsv(summary), "utf8");
  } else {
    const payload = {
      generatedAt: new Date().toISOString(),
      mode,
      iterations,
      summary,
    };
    await writeFile(resolvedPath, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
  }

  console.log(`Saved benchmark summary to ${resolvedPath}`);
}

async function tableExists(tableName: string): Promise<boolean> {
  const result = await db.execute(sql`
    SELECT EXISTS (
      SELECT 1
      FROM information_schema.tables
      WHERE table_schema = 'public'
        AND table_name = ${tableName}
    )
  `);

  const row = (result as unknown as { rows?: Array<{ exists?: boolean }> }).rows?.[0];
  return Boolean(row?.exists);
}

async function runSyntheticBenchmark(
  iterations: number,
  tenantId: string,
  userId: string,
  aggregateType: string,
  aggregateId: string,
  outputPath?: string,
  format: ExportFormat = "json"
): Promise<void> {
  const client = await pool.connect();
  const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);

  try {
    const summaryRows: SummaryInputRow[] = [];

    await client.query("BEGIN");
    await client.query(`
      CREATE TEMP TABLE decision_audit_entries (
        id text PRIMARY KEY,
        timestamp timestamptz NOT NULL,
        tenant_id text NOT NULL,
        user_id text,
        event_type text NOT NULL,
        duration_ms real NOT NULL,
        status text NOT NULL
      ) ON COMMIT DROP;
    `);
    await client.query(`
      CREATE TEMP TABLE events (
        id text PRIMARY KEY,
        aggregate_type text NOT NULL,
        aggregate_id text NOT NULL,
        event_type text NOT NULL,
        version integer NOT NULL,
        timestamp timestamptz NOT NULL
      ) ON COMMIT DROP;
    `);

    await client.query(
      `
      INSERT INTO decision_audit_entries (id, timestamp, tenant_id, user_id, event_type, duration_ms, status)
      SELECT
        'dae-' || gs::text,
        now() - ((gs % 2000)::text || ' seconds')::interval,
        $1,
        CASE WHEN gs % 3 = 0 THEN $2 ELSE NULL END,
        CASE WHEN gs % 4 = 0 THEN 'metadata_resolved' ELSE 'rule_evaluated' END,
        ((gs % 500)::real + 1),
        CASE WHEN gs % 7 = 0 THEN 'error' ELSE 'success' END
      FROM generate_series(1, 5000) AS gs;
      `,
      [tenantId, userId]
    );

    await client.query(
      `
      INSERT INTO events (id, aggregate_type, aggregate_id, event_type, version, timestamp)
      SELECT
        'evt-' || gs::text,
        $1,
        CASE WHEN gs % 2 = 0 THEN $2 ELSE 'other' END,
        'event_' || (gs % 10)::text,
        gs,
        now() - ((gs % 2000)::text || ' seconds')::interval
      FROM generate_series(1, 5000) AS gs;
      `,
      [aggregateType, aggregateId]
    );

    const auditFailuresDynamic = await timeRun(
      "audit failures dynamic (synthetic)",
      async () => {
        await client.query(
          `
          SELECT id, timestamp, tenant_id, user_id, event_type, duration_ms, status
          FROM decision_audit_entries
          WHERE tenant_id = $1 AND status = $2
          ORDER BY timestamp DESC
          LIMIT 50
          `,
          [tenantId, "error"]
        );
      },
      iterations
    );

    const auditFailuresPrepared = await timeRun(
      "audit failures prepared (synthetic)",
      async () => {
        await client.query({
          name: "synthetic_audit_failures",
          text: `
            SELECT id, timestamp, tenant_id, user_id, event_type, duration_ms, status
            FROM decision_audit_entries
            WHERE tenant_id = $1 AND status = $2
            ORDER BY timestamp DESC
            LIMIT 50
          `,
          values: [tenantId, "error"],
        });
      },
      iterations
    );
    summaryRows.push({
      name: "audit failures",
      dynamic: auditFailuresDynamic,
      prepared: auditFailuresPrepared,
    });

    const userTrailDynamic = await timeRun(
      "user trail dynamic (synthetic)",
      async () => {
        await client.query(
          `
          SELECT id, timestamp, tenant_id, user_id, event_type, duration_ms, status
          FROM decision_audit_entries
          WHERE tenant_id = $1 AND user_id = $2
          ORDER BY timestamp DESC
          LIMIT 100
          `,
          [tenantId, userId]
        );
      },
      iterations
    );

    const userTrailPrepared = await timeRun(
      "user trail prepared (synthetic)",
      async () => {
        await client.query({
          name: "synthetic_user_trail",
          text: `
            SELECT id, timestamp, tenant_id, user_id, event_type, duration_ms, status
            FROM decision_audit_entries
            WHERE tenant_id = $1 AND user_id = $2
            ORDER BY timestamp DESC
            LIMIT 100
          `,
          values: [tenantId, userId],
        });
      },
      iterations
    );
    summaryRows.push({
      name: "user trail",
      dynamic: userTrailDynamic,
      prepared: userTrailPrepared,
    });

    const statsDynamic = await timeRun(
      "stats dynamic (synthetic)",
      async () => {
        await client.query(
          `
          SELECT
            count(*)::int AS count,
            coalesce(avg(duration_ms), 0) AS avg_duration,
            coalesce(min(duration_ms), 0) AS min_duration,
            coalesce(max(duration_ms), 0) AS max_duration,
            count(*) FILTER (WHERE status = 'error')::int AS error_count
          FROM decision_audit_entries
          WHERE tenant_id = $1
            AND event_type = $2
            AND timestamp >= $3
          `,
          [tenantId, "metadata_resolved", cutoff]
        );
      },
      iterations
    );

    const statsPrepared = await timeRun(
      "stats prepared (synthetic)",
      async () => {
        await client.query({
          name: "synthetic_stats",
          text: `
            SELECT
              count(*)::int AS count,
              coalesce(avg(duration_ms), 0) AS avg_duration,
              coalesce(min(duration_ms), 0) AS min_duration,
              coalesce(max(duration_ms), 0) AS max_duration,
              count(*) FILTER (WHERE status = 'error')::int AS error_count
            FROM decision_audit_entries
            WHERE tenant_id = $1
              AND event_type = $2
              AND timestamp >= $3
          `,
          values: [tenantId, "metadata_resolved", cutoff],
        });
      },
      iterations
    );
    summaryRows.push({
      name: "stats",
      dynamic: statsDynamic,
      prepared: statsPrepared,
    });

    const aggregateEventsDynamic = await timeRun(
      "aggregate events dynamic (synthetic)",
      async () => {
        await client.query(
          `
          SELECT id, aggregate_type, aggregate_id, event_type, version, timestamp
          FROM events
          WHERE aggregate_type = $1 AND aggregate_id = $2
          ORDER BY version ASC
          `,
          [aggregateType, aggregateId]
        );
      },
      iterations
    );

    const aggregateEventsPrepared = await timeRun(
      "aggregate events prepared (synthetic)",
      async () => {
        await client.query({
          name: "synthetic_events_aggregate",
          text: `
            SELECT id, aggregate_type, aggregate_id, event_type, version, timestamp
            FROM events
            WHERE aggregate_type = $1 AND aggregate_id = $2
            ORDER BY version ASC
          `,
          values: [aggregateType, aggregateId],
        });
      },
      iterations
    );
    summaryRows.push({
      name: "aggregate events",
      dynamic: aggregateEventsDynamic,
      prepared: aggregateEventsPrepared,
    });

    const summary = printSpeedupSummary(summaryRows) ?? [];
    await writeSummaryExport({
      outputPath,
      format,
      mode: "synthetic",
      iterations,
      summary,
    });

    await client.query("ROLLBACK");
  } finally {
    client.release();
  }
}

async function main(): Promise<void> {
  const iterations = parseIterations();
  const tenantId = process.env.BENCH_TENANT_ID ?? "1";
  const userId = process.env.BENCH_USER_ID ?? "1";
  const aggregateType = process.env.BENCH_AGGREGATE_TYPE ?? "order";
  const aggregateId = process.env.BENCH_AGGREGATE_ID ?? "seed";
  const outputPath = parseArg("output");
  const exportFormat = resolveExportFormat(outputPath);

  console.log("Prepared Query Benchmark");
  console.log(`iterations=${iterations}`);
  console.log(`tenantId=${tenantId}`);
  console.log("");

  const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const summaryRows: SummaryInputRow[] = [];
  const hasDecisionAuditEntries = await tableExists("decision_audit_entries");
  const hasEvents = await tableExists("events");
  const forceSynthetic = useSyntheticMode();

  if (forceSynthetic || (!hasDecisionAuditEntries && !hasEvents)) {
    console.log("Running synthetic benchmark mode (temp tables + rollback).");
    await runSyntheticBenchmark(
      iterations,
      tenantId,
      userId,
      aggregateType,
      aggregateId,
      outputPath,
      exportFormat
    );
    await pool.end();
    return;
  }

  const preparedAuditFailures = db
    .select()
    .from(decisionAuditEntries)
    .where(
      and(
        eq(decisionAuditEntries.tenantId, sql.placeholder("tenantId")),
        eq(decisionAuditEntries.status, "error")
      )
    )
    .orderBy(desc(decisionAuditEntries.timestamp))
    .limit(50)
    .prepare("bench_audit_failures_prepared");

  const preparedUserTrail = db
    .select()
    .from(decisionAuditEntries)
    .where(
      and(
        eq(decisionAuditEntries.tenantId, sql.placeholder("tenantId")),
        eq(decisionAuditEntries.userId, sql.placeholder("userId"))
      )
    )
    .orderBy(desc(decisionAuditEntries.timestamp))
    .limit(100)
    .prepare("bench_audit_user_trail_prepared");

  const preparedEventAggregate = db
    .select()
    .from(events)
    .where(
      and(
        eq(events.aggregateType, sql.placeholder("aggregateType")),
        eq(events.aggregateId, sql.placeholder("aggregateId"))
      )
    )
    .orderBy(asc(events.version))
    .prepare("bench_event_aggregate_prepared");

  if (hasDecisionAuditEntries) {
    // Warmup to reduce first-run compilation noise.
    await preparedAuditFailures.execute({ tenantId });
    await preparedUserTrail.execute({ tenantId, userId });

    const auditFailuresDynamic = await timeRun(
      "audit failures dynamic",
      async () => {
        await db
          .select()
          .from(decisionAuditEntries)
          .where(
            and(
              eq(decisionAuditEntries.tenantId, tenantId),
              eq(decisionAuditEntries.status, "error")
            )
          )
          .orderBy(desc(decisionAuditEntries.timestamp))
          .limit(50);
      },
      iterations
    );

    const auditFailuresPrepared = await timeRun(
      "audit failures prepared",
      async () => {
        await preparedAuditFailures.execute({ tenantId });
      },
      iterations
    );
    summaryRows.push({
      name: "audit failures",
      dynamic: auditFailuresDynamic,
      prepared: auditFailuresPrepared,
    });

    const userTrailDynamic = await timeRun(
      "user trail dynamic",
      async () => {
        await db
          .select()
          .from(decisionAuditEntries)
          .where(
            and(
              eq(decisionAuditEntries.tenantId, tenantId),
              eq(decisionAuditEntries.userId, userId)
            )
          )
          .orderBy(desc(decisionAuditEntries.timestamp))
          .limit(100);
      },
      iterations
    );

    const userTrailPrepared = await timeRun(
      "user trail prepared",
      async () => {
        await preparedUserTrail.execute({ tenantId, userId });
      },
      iterations
    );
    summaryRows.push({
      name: "user trail",
      dynamic: userTrailDynamic,
      prepared: userTrailPrepared,
    });

    const statsDynamic = await timeRun(
      "stats dynamic",
      async () => {
        await db
          .select({
            count: sql<number>`count(*)::int`,
            avgDuration: sql<number>`coalesce(avg(${decisionAuditEntries.durationMs}), 0)`,
            minDuration: sql<number>`coalesce(min(${decisionAuditEntries.durationMs}), 0)`,
            maxDuration: sql<number>`coalesce(max(${decisionAuditEntries.durationMs}), 0)`,
            errorCount: sql<number>`count(*) filter (where ${decisionAuditEntries.status} = 'error')::int`,
          })
          .from(decisionAuditEntries)
          .where(
            and(
              eq(decisionAuditEntries.tenantId, tenantId),
              eq(decisionAuditEntries.eventType, "metadata_resolved"),
              gte(decisionAuditEntries.timestamp, cutoff)
            )
          );
      },
      iterations
    );

    const preparedStats = db
      .select({
        count: sql<number>`count(*)::int`,
        avgDuration: sql<number>`coalesce(avg(${decisionAuditEntries.durationMs}), 0)`,
        minDuration: sql<number>`coalesce(min(${decisionAuditEntries.durationMs}), 0)`,
        maxDuration: sql<number>`coalesce(max(${decisionAuditEntries.durationMs}), 0)`,
        errorCount: sql<number>`count(*) filter (where ${decisionAuditEntries.status} = 'error')::int`,
      })
      .from(decisionAuditEntries)
      .where(
        and(
          eq(decisionAuditEntries.tenantId, sql.placeholder("tenantId")),
          eq(decisionAuditEntries.eventType, sql.placeholder("eventType")),
          gte(decisionAuditEntries.timestamp, sql.placeholder("cutoff"))
        )
      )
      .prepare("bench_audit_stats_prepared");

    const statsPrepared = await timeRun(
      "stats prepared",
      async () => {
        await preparedStats.execute({
          tenantId,
          eventType: "metadata_resolved",
          cutoff,
        });
      },
      iterations
    );
    summaryRows.push({
      name: "stats",
      dynamic: statsDynamic,
      prepared: statsPrepared,
    });
  } else {
    console.log("Skipping decision audit benchmarks: decision_audit_entries table not found.");
  }

  if (hasEvents) {
    await preparedEventAggregate.execute({ aggregateType, aggregateId });

    const aggregateEventsDynamic = await timeRun(
      "aggregate events dynamic",
      async () => {
        await db
          .select()
          .from(events)
          .where(and(eq(events.aggregateType, aggregateType), eq(events.aggregateId, aggregateId)))
          .orderBy(asc(events.version));
      },
      iterations
    );

    const aggregateEventsPrepared = await timeRun(
      "aggregate events prepared",
      async () => {
        await preparedEventAggregate.execute({ aggregateType, aggregateId });
      },
      iterations
    );
    summaryRows.push({
      name: "aggregate events",
      dynamic: aggregateEventsDynamic,
      prepared: aggregateEventsPrepared,
    });
  } else {
    console.log("Skipping event benchmarks: events table not found.");
  }

  const summary = printSpeedupSummary(summaryRows) ?? [];
  await writeSummaryExport({
    outputPath,
    format: exportFormat,
    mode: "real",
    iterations,
    summary,
  });

  await pool.end();
}

void main().catch(async (error) => {
  console.error("Prepared benchmark failed", error);
  await pool.end();
  process.exitCode = 1;
});
