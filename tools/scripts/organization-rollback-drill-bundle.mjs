import fs from "node:fs";
import path from "node:path";
import {
  LOCAL_REHEARSAL_CONTEXT,
} from "./_shared/promotion-context.mjs";
import { createNonSalesParityChecks } from "./_shared/non-sales-checks.mjs";
import {
  executeCheckStep,
  resolveNonSalesGovernanceContext,
} from "./_shared/non-sales-governance-engine.mjs";

const ROOT = process.cwd();
const args = new Set(process.argv.slice(2));
const skipRun = args.has("--skip-run");
const context = resolveNonSalesGovernanceContext({ root: ROOT, args: [...args] });
const { evidenceDir, rollbackEvidencePath, parityChecklistPath } = context.evidencePaths;
const localRehearsal = context.localRehearsal;

const evidenceFile = rollbackEvidencePath;
const parityChecklistFile = parityChecklistPath;

const bundle = [
  ...createNonSalesParityChecks().map((check) => ({
    title: check.label,
    command: check.command,
    args: check.args,
  })),
  {
    title: "Non-sales parity execution checks",
    command: "pnpm",
    args: ["ci:parity:non-sales"],
  },
];

function runCommand(step) {
  return executeCheckStep(step, {
    root: ROOT,
    captureOutput: true,
    skipRun,
  });
}

function setChecklistItem(content, text, checked) {
  const escaped = text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const pattern = new RegExp(`^- \\[([ x])\\] (${escaped})$`, "m");
  const replacement = `- [${checked ? "x" : " "}] ${text}`;
  if (!pattern.test(content)) {
    return content;
  }

  return content.replace(pattern, replacement);
}

function updateTimestampItem(content, label, value, checked) {
  const escapedLabel = label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const pattern = new RegExp("^- \\[([ x])\\] " + escapedLabel + ": `[^`]*`$", "m");
  const replacement = `- [${checked ? "x" : " "}] ${label}: \`${value}\``;
  if (!pattern.test(content)) {
    return content;
  }

  return content.replace(pattern, replacement);
}

function extractTimestamp(content, label) {
  const escapedLabel = label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const pattern = new RegExp("^- \\[([ x])\\] " + escapedLabel + ": `([^`]*)`$", "m");
  const match = content.match(pattern);
  return match?.[2] ?? null;
}

function updateParityChecklist(report, startedAt, finishedAt) {
  if (!fs.existsSync(parityChecklistFile)) {
    console.warn(
      `⚠️ Parity checklist not found, skipping automation: ${path.relative(ROOT, parityChecklistFile)}`
    );
    return;
  }

  let content = fs.readFileSync(parityChecklistFile, "utf8");
  const skipped = report.some((entry) => entry.output.stdout === "(skipped)");

  const currentStart = extractTimestamp(content, "Start timestamp recorded (UTC)");
  const startValue =
    currentStart && currentStart !== "YYYY-MM-DDTHH:mm:ssZ" ? currentStart : startedAt;

  content = updateTimestampItem(content, "Start timestamp recorded (UTC)", startValue, true);
  content = updateTimestampItem(content, "End timestamp recorded (UTC)", finishedAt, !skipped);

  const parsedStart = new Date(startValue);
  const parsedEnd = new Date(finishedAt);
  const hasValidRange =
    !Number.isNaN(parsedStart.valueOf()) &&
    !Number.isNaN(parsedEnd.valueOf()) &&
    parsedEnd.valueOf() >= parsedStart.valueOf();
  const durationHours = hasValidRange
    ? (parsedEnd.valueOf() - parsedStart.valueOf()) / (1000 * 60 * 60)
    : 0;

  content = setChecklistItem(
    content,
    "Window duration >= 24h",
    !localRehearsal && !skipped && durationHours >= 24
  );
  content = setChecklistItem(
    content,
    "Local rehearsal waiver applied (non-production only)",
    localRehearsal
  );
  content = setChecklistItem(content, "Pause promotion", localRehearsal);

  for (const { step, output } of report) {
    const commandText = `\`${output.command}\``;
    content = setChecklistItem(content, commandText, !skipped && output.status === 0);
  }

  fs.writeFileSync(parityChecklistFile, content, "utf8");
  console.log(
    `✅ Parity checklist evidence capture updated: ${path.relative(ROOT, parityChecklistFile)}`
  );
}

const startedAt = new Date().toISOString();
const report = [];

for (const step of bundle) {
  const output = runCommand(step);
  report.push({ step, output });

  if (output.status !== 0) {
    console.error(`❌ Rollback drill step failed: ${step.title}`);
    if (output.stderr) {
      console.error(output.stderr);
    }
    process.exit(output.status);
  }
}

const finishedAt = new Date().toISOString();
updateParityChecklist(report, startedAt, finishedAt);

fs.mkdirSync(evidenceDir, { recursive: true });

const lines = [];
lines.push("# Organization Rollback Drill Evidence");
lines.push("");
lines.push(`- Generated at (UTC): ${finishedAt}`);
lines.push("- Aggregate: organization");
lines.push(`- Execution context: ${context.mode}`);
lines.push("- Rollback path validated: event-only -> dual-write");
lines.push("");
lines.push("## Command Bundle Results");
lines.push("");

for (const { step, output } of report) {
  lines.push(`### ${step.title}`);
  lines.push("");
  lines.push(`- Command: \`${output.command}\``);
  lines.push(`- Exit code: ${output.status}`);
  lines.push("");
  lines.push("```text");
  lines.push(output.stdout || "(no stdout)");
  if (output.stderr) {
    lines.push(output.stderr);
  }
  lines.push("```");
  lines.push("");
}

fs.writeFileSync(evidenceFile, `${lines.join("\n")}\n`, "utf8");
console.log(`✅ Rollback drill evidence written to ${path.relative(ROOT, evidenceFile)}`);