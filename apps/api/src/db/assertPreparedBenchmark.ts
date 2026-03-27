type SummaryRow = {
  name: string;
  speedup: number;
};

type BenchmarkPayload = {
  generatedAt: string;
  mode: "synthetic" | "real";
  iterations: number;
  summary: SummaryRow[];
};

function normalizeName(name: string): string {
  return name.trim().toLowerCase().replace(/\s+/g, "-");
}

function parseArg(name: string): string | undefined {
  const prefix = `--${name}=`;
  const arg = process.argv.find((entry) => entry.startsWith(prefix));
  if (!arg) return undefined;
  return arg.slice(prefix.length);
}

function parseNumber(value: string | undefined, fallback: number): number {
  if (!value) return fallback;
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function parseList(value: string | undefined): string[] {
  if (!value) return [];
  return value
    .split(",")
    .map((entry) => normalizeName(entry))
    .filter((entry) => entry.length > 0);
}

function parseOverrides(value: string | undefined): Map<string, number> {
  const overrides = new Map<string, number>();
  if (!value) return overrides;

  for (const item of value.split(",")) {
    const [rawName, rawThreshold] = item.split("=").map((entry) => entry.trim());
    const name = normalizeName(rawName ?? "");
    if (!name || !rawThreshold) continue;
    const threshold = Number.parseFloat(rawThreshold);
    if (Number.isFinite(threshold)) {
      overrides.set(name, threshold);
    }
  }

  return overrides;
}

async function loadPayload(inputPath: string): Promise<BenchmarkPayload> {
  const { readFile } = await import("node:fs/promises");
  const text = await readFile(inputPath, "utf8");
  const parsed = JSON.parse(text) as BenchmarkPayload;
  if (!parsed?.summary || !Array.isArray(parsed.summary)) {
    throw new Error("Invalid benchmark payload: missing summary array");
  }
  return parsed;
}

async function main(): Promise<void> {
  const inputPath = parseArg("input") ?? ".artifacts/bench/prepared-bench.json";
  const defaultMinSpeedup = parseNumber(
    parseArg("min-speedup") ?? process.env.BENCH_MIN_SPEEDUP,
    1
  );
  const required = parseList(parseArg("require") ?? process.env.BENCH_REQUIRE_QUERIES);
  const overrides = parseOverrides(parseArg("override") ?? process.env.BENCH_SPEEDUP_OVERRIDES);

  const payload = await loadPayload(inputPath);
  const rows = payload.summary;

  const normalizedNameToRow = new Map(rows.map((row) => [normalizeName(row.name), row] as const));

  const requiredSet = new Set(required);
  const rowsToCheck =
    requiredSet.size === 0 ? rows : rows.filter((row) => requiredSet.has(normalizeName(row.name)));

  if (rowsToCheck.length === 0) {
    throw new Error("No benchmark rows matched assertion criteria");
  }

  for (const name of requiredSet) {
    if (!normalizedNameToRow.has(name)) {
      throw new Error(`Required benchmark row not found: ${name}`);
    }
  }

  const failures: Array<{ name: string; speedup: number; threshold: number }> = [];
  for (const row of rowsToCheck) {
    const threshold = overrides.get(normalizeName(row.name)) ?? defaultMinSpeedup;
    if (row.speedup < threshold) {
      failures.push({ name: row.name, speedup: row.speedup, threshold });
    }
  }

  console.log("Prepared benchmark assertion");
  console.log(`input=${inputPath}`);
  console.log(`mode=${payload.mode} iterations=${payload.iterations}`);
  console.log(`defaultMinSpeedup=${defaultMinSpeedup}`);
  if (overrides.size > 0) {
    console.log(`overrides=${[...overrides.entries()].map(([k, v]) => `${k}=${v}`).join(", ")}`);
  }

  if (failures.length > 0) {
    console.error("Speedup assertion failed:");
    for (const failure of failures) {
      console.error(
        `- ${failure.name}: speedup=${failure.speedup.toFixed(3)} threshold=${failure.threshold.toFixed(3)}`
      );
    }
    process.exitCode = 1;
    return;
  }

  console.log("Speedup assertion passed.");
}

void main().catch((error) => {
  console.error("Prepared benchmark assertion failed", error);
  process.exitCode = 1;
});
