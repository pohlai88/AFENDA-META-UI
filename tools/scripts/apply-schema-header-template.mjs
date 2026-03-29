#!/usr/bin/env node

import fs from "fs";
import path from "path";

function printHelp() {
  console.log("Apply Schema Header Template");
  console.log("");
  console.log("Usage:");
  console.log(
    "  node tools/scripts/apply-schema-header-template.mjs --file <path> --schema <SCHEMA> --domain <DOMAIN> --phase <PHASE> --description <text> --tables <comma,separated> [--dry-run]"
  );
  console.log(
    "  node tools/scripts/apply-schema-header-template.mjs --file <path> --schema <SCHEMA> --infra-name <NAME> --description <text> [--dry-run]"
  );
  console.log(
    "  node tools/scripts/apply-schema-header-template.mjs --directory <path> --schema <SCHEMA> --from-current-header [--dry-run] [--report <path>]"
  );
  console.log(
    "  node tools/scripts/apply-schema-header-template.mjs --directory <path> --schema <SCHEMA> --from-current-header --strict [--dry-run] [--report <path>]"
  );
  console.log("");
  console.log("Examples:");
  console.log(
    '  node tools/scripts/apply-schema-header-template.mjs --file packages/db/src/schema/hr/people.ts --schema HR --domain "PEOPLE & ORG STRUCTURE" --phase "Phase 0" --description "Defines departments, job titles, employees, dependents, and addresses." --tables "departments,job_titles,job_positions,employees"'
  );
  console.log(
    '  node tools/scripts/apply-schema-header-template.mjs --file packages/db/src/schema/hr/_schema.ts --schema HR --infra-name "Schema Infrastructure" --description "Configures the shared pgSchema(\\"hr\\") namespace that every file imports."'
  );
  console.log(
    "  node tools/scripts/apply-schema-header-template.mjs --directory packages/db/src/schema/hr --schema HR --from-current-header --dry-run --report packages/db/src/schema/hr/hr-docs/.schema-header-dry-run-report.md"
  );
}

function parseArgs(argv) {
  const args = argv.slice(2);

  if (args.includes("--help") || args.includes("-h")) {
    printHelp();
    process.exit(0);
  }

  const result = {
    file: "",
    directory: "",
    schema: "",
    domain: "",
    phase: "",
    description: "",
    tables: "",
    infraName: "",
    fromCurrentHeader: args.includes("--from-current-header"),
    report: "",
    strict: args.includes("--strict"),
    dryRun: args.includes("--dry-run"),
  };

  for (let i = 0; i < args.length; i += 1) {
    const key = args[i];
    const value = args[i + 1];

    if (!key.startsWith("--")) {
      continue;
    }

    if (key === "--dry-run" || key === "--from-current-header" || key === "--strict") {
      continue;
    }

    if (!value || value.startsWith("--")) {
      throw new Error(`Missing value for ${key}`);
    }

    switch (key) {
      case "--file":
        result.file = value;
        break;
      case "--directory":
        result.directory = value;
        break;
      case "--schema":
        result.schema = value;
        break;
      case "--domain":
        result.domain = value;
        break;
      case "--phase":
        result.phase = value;
        break;
      case "--description":
        result.description = value;
        break;
      case "--tables":
        result.tables = value;
        break;
      case "--infra-name":
        result.infraName = value;
        break;
      case "--report":
        result.report = value;
        break;
      default:
        throw new Error(`Unknown argument: ${key}`);
    }

    i += 1;
  }

  return result;
}

function normalizeFilePath(inputPath) {
  return path.isAbsolute(inputPath) ? inputPath : path.resolve(process.cwd(), inputPath);
}

function listTsFilesRecursively(rootDir) {
  const output = [];

  function walk(current) {
    const entries = fs.readdirSync(current, { withFileTypes: true });
    for (const entry of entries) {
      const next = path.join(current, entry.name);
      if (entry.isDirectory()) {
        if (entry.name === "node_modules" || entry.name === "dist" || entry.name === ".cache") {
          continue;
        }
        walk(next);
      } else if (entry.isFile() && entry.name.endsWith(".ts") && !entry.name.endsWith(".d.ts")) {
        output.push(next);
      }
    }
  }

  walk(rootDir);
  return output;
}

function buildDomainHeader(schema, domain, phase, description, tablesCsv) {
  if (!schema || !domain || !phase || !description || !tablesCsv) {
    throw new Error("Domain mode requires: --schema, --domain, --phase, --description, --tables");
  }

  const tableList = tablesCsv
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean)
    .join(", ");

  if (!tableList) {
    throw new Error("--tables must contain at least one table name");
  }

  return [
    "// ============================================================================",
    `// ${schema.toUpperCase()} DOMAIN: ${domain} (${phase})`,
    `// ${description}`,
    `// Tables: ${tableList}`,
    "// ============================================================================",
    "",
  ].join("\n");
}

function buildInfrastructureHeader(schema, infraName, description) {
  if (!schema || !infraName || !description) {
    throw new Error("Infrastructure mode requires: --schema, --infra-name, --description");
  }

  return [
    "// ============================================================================",
    `// ${schema.toUpperCase()} ${infraName}`,
    `// ${description}`,
    "// ============================================================================",
    "",
  ].join("\n");
}

function findHeaderBlock(content) {
  const lines = content.split(/\r?\n/);

  let firstNonEmpty = 0;
  while (firstNonEmpty < lines.length && lines[firstNonEmpty].trim() === "") {
    firstNonEmpty += 1;
  }

  if (
    !lines[firstNonEmpty] ||
    lines[firstNonEmpty].trim() !==
      "// ============================================================================"
  ) {
    return null;
  }

  let end = -1;
  for (let i = firstNonEmpty + 1; i < lines.length; i += 1) {
    if (
      lines[i].trim() ===
      "// ============================================================================"
    ) {
      end = i;
      break;
    }
  }

  if (end === -1) {
    return null;
  }

  let startOffset = 0;
  for (let i = 0; i < firstNonEmpty; i += 1) {
    startOffset += lines[i].length + 1;
  }

  let endOffset = startOffset;
  for (let i = firstNonEmpty; i <= end; i += 1) {
    endOffset += lines[i].length + 1;
  }

  while (end + 1 < lines.length && lines[end + 1].trim() === "") {
    end += 1;
    endOffset += lines[end].length + 1;
  }

  return { startOffset, endOffset };
}

function applyHeader(content, header) {
  const existing = findHeaderBlock(content);
  if (existing) {
    return `${header}${content.slice(existing.endOffset)}`;
  }
  return `${header}${content}`;
}

function readHeaderLines(content) {
  const lines = content.split(/\r?\n/);

  let headerStart = -1;
  for (let i = 0; i < lines.length; i += 1) {
    if (
      lines[i].trim() ===
      "// ============================================================================"
    ) {
      headerStart = i;
      break;
    }
  }

  if (headerStart === -1) {
    return null;
  }

  let end = -1;
  for (let i = headerStart + 1; i < lines.length; i += 1) {
    if (
      lines[i].trim() ===
      "// ============================================================================"
    ) {
      end = i;
      break;
    }
  }

  if (end === -1) {
    return null;
  }

  return lines.slice(headerStart, end + 1);
}

function inferTableNamesFromSource(content) {
  const matches = [...content.matchAll(/hrSchema\.table\(\s*"([^"]+)"/g)];
  const unique = [];
  const seen = new Set();

  for (const match of matches) {
    const table = match[1]?.trim();
    if (!table || seen.has(table)) {
      continue;
    }
    seen.add(table);
    unique.push(table);
  }

  return unique;
}

function parseCurrentHeader(content, fallbackSchema) {
  const headerLines = readHeaderLines(content);
  if (!headerLines || headerLines.length < 3) {
    return null;
  }

  const second = headerLines[1].replace(/^\/\/\s?/, "").trim();
  const third = headerLines[2].replace(/^\/\/\s?/, "").trim();

  const domainMatch = second.match(/^([A-Z]+) DOMAIN:\s+(.+)\s+\((.+)\)$/);
  if (domainMatch) {
    const schema = domainMatch[1] || fallbackSchema;
    const domain = domainMatch[2];
    const phase = domainMatch[3];
    const tableLine = headerLines.find((line) => line.trim().startsWith("// Tables:"));
    const implementsLine = headerLines.find((line) => line.trim().startsWith("// Implements:"));
    const inferredTables = inferTableNamesFromSource(content);

    let tables = "";
    if (tableLine) {
      tables = tableLine.replace(/^\s*\/\/\s*Tables:\s*/, "").trim();
    } else if (implementsLine) {
      tables = implementsLine.replace(/^\s*\/\/\s*Implements:\s*/, "").trim();
    }

    if (!tables && inferredTables.length > 0) {
      tables = inferredTables.join(", ");
    }

    if (!tables) {
      throw new Error("Domain header missing Tables/Implements and no tables inferred from source");
    }

    return {
      mode: "domain",
      schema,
      domain,
      phase,
      description: third,
      tables: tables.replace(/\s+/g, " "),
    };
  }

  const infraMatch = second.match(/^([A-Z]+)\s+(.+)$/);
  if (infraMatch) {
    const schema = infraMatch[1] || fallbackSchema;
    const infraName = infraMatch[2];
    return {
      mode: "infra",
      schema,
      infraName,
      description: third,
    };
  }

  throw new Error("Unsupported header format");
}

function renderReport(reportPath, summary, results) {
  const lines = [
    "# Schema Header Dry-Run Report",
    "",
    `- Generated: ${new Date().toISOString()}`,
    `- Scope: ${summary.scope}`,
    `- Dry run: ${summary.dryRun ? "yes" : "no"}`,
    "",
    "## Summary",
    "",
    `- Total files: ${summary.total}`,
    `- Would update: ${summary.wouldUpdate}`,
    `- No changes: ${summary.noChanges}`,
    `- Skipped: ${summary.skipped}`,
    `- Errors: ${summary.errors}`,
    "",
    "## Details",
    "",
    "| File | Status | Message |",
    "| --- | --- | --- |",
  ];

  for (const item of results) {
    const file = item.file.replace(/\\/g, "/");
    const status = item.status;
    const message = (item.message || "").replace(/\|/g, "\\|");
    lines.push(`| ${file} | ${status} | ${message} |`);
  }

  const resolved = normalizeFilePath(reportPath);
  fs.writeFileSync(resolved, `${lines.join("\n")}\n`, "utf8");
  return resolved;
}

function processSingleFile(targetFile, args) {
  if (!fs.existsSync(targetFile)) {
    return { file: targetFile, status: "error", message: "Target file not found" };
  }

  const original = fs.readFileSync(targetFile, "utf8");
  const header = args.infraName
    ? buildInfrastructureHeader(args.schema, args.infraName, args.description)
    : buildDomainHeader(args.schema, args.domain, args.phase, args.description, args.tables);

  const next = applyHeader(original, header);
  if (next === original) {
    return { file: targetFile, status: "no_change", message: "Header already up-to-date" };
  }

  if (args.dryRun) {
    return { file: targetFile, status: "would_update", message: "Header would be updated" };
  }

  fs.writeFileSync(targetFile, next, "utf8");
  return { file: targetFile, status: "updated", message: "Header updated" };
}

function processDirectoryFromCurrentHeaders(args) {
  if (!args.directory) {
    throw new Error("--directory is required for directory mode");
  }

  const root = normalizeFilePath(args.directory);
  if (!fs.existsSync(root)) {
    throw new Error(`Directory not found: ${root}`);
  }

  const files = listTsFilesRecursively(root);
  const results = [];

  for (const file of files) {
    const original = fs.readFileSync(file, "utf8");
    try {
      const parsed = parseCurrentHeader(original, args.schema ? args.schema.toUpperCase() : "");
      if (!parsed) {
        results.push({ file, status: "skipped", message: "No header block found" });
        continue;
      }

      const header =
        parsed.mode === "infra"
          ? buildInfrastructureHeader(parsed.schema, parsed.infraName, parsed.description)
          : buildDomainHeader(
              parsed.schema,
              parsed.domain,
              parsed.phase,
              parsed.description,
              parsed.tables
            );

      const next = applyHeader(original, header);
      if (next === original) {
        results.push({ file, status: "no_change", message: "Header already normalized" });
        continue;
      }

      if (args.dryRun) {
        results.push({ file, status: "would_update", message: "Header would be normalized" });
        continue;
      }

      fs.writeFileSync(file, next, "utf8");
      results.push({ file, status: "updated", message: "Header normalized" });
    } catch (error) {
      results.push({ file, status: "error", message: error.message });
    }
  }

  return results;
}

function summarize(results, scope, dryRun) {
  const summary = {
    scope,
    dryRun,
    total: results.length,
    wouldUpdate: 0,
    noChanges: 0,
    skipped: 0,
    errors: 0,
  };

  for (const result of results) {
    if (result.status === "would_update" || result.status === "updated") {
      summary.wouldUpdate += 1;
    } else if (result.status === "no_change") {
      summary.noChanges += 1;
    } else if (result.status === "skipped") {
      summary.skipped += 1;
    } else if (result.status === "error") {
      summary.errors += 1;
    }
  }

  return summary;
}

function run() {
  const args = parseArgs(process.argv);

  let results = [];
  let scope = "single-file";

  if (args.directory && args.fromCurrentHeader) {
    scope = `directory:${normalizeFilePath(args.directory)}`;
    results = processDirectoryFromCurrentHeaders(args);
  } else if (args.file) {
    const targetFile = normalizeFilePath(args.file);
    scope = `file:${targetFile}`;
    results = [processSingleFile(targetFile, args)];
  } else {
    throw new Error(
      "Provide either --file for single mode, or --directory with --from-current-header for batch mode"
    );
  }

  const summary = summarize(results, scope, args.dryRun);

  console.log("Schema header template run");
  console.log(`scope=${summary.scope}`);
  console.log(`total=${summary.total}`);
  console.log(`wouldUpdate=${summary.wouldUpdate}`);
  console.log(`noChanges=${summary.noChanges}`);
  console.log(`skipped=${summary.skipped}`);
  console.log(`errors=${summary.errors}`);

  if (args.report) {
    const reportFile = renderReport(args.report, summary, results);
    console.log(`report=${reportFile}`);
  }

  if (summary.errors > 0 && args.strict) {
    process.exitCode = 1;
  }
}

try {
  run();
} catch (error) {
  console.error(`Error: ${error.message}`);
  console.error("Run with --help for usage.");
  process.exit(1);
}
