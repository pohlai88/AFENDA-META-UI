/**
 * Error Reporter
 * ==============
 * Formats CI gate results with categorized diagnostics, explanations,
 * and fix suggestions similar to the contracts gate.
 */

const CHECK_CATEGORY = {
  "No Console Usage": {
    key: "NO_CONSOLE_USAGE",
    icon: "🚫",
    title: "No Console Usage",
    explanation:
      "Console logging bypasses structured logs and request correlation. Use the Pino logger instead.",
    fixes: [
      "Replace console.* with logger.* in shared modules.",
      "In request handlers, use req.log.* for requestId traceability.",
    ],
  },
  "Proper Imports": {
    key: "DEPRECATED_LOGGER_IMPORT",
    icon: "📦",
    title: "Deprecated Logger Imports",
    explanation:
      "Winston and morgan are deprecated in this codebase. All logging should use Pino.",
    fixes: [
      "Replace deprecated imports with ../logging/index.js.",
      "Remove require('winston') / require('morgan') usage.",
    ],
  },
  "req.log Usage": {
    key: "REQUEST_SCOPED_LOGGING",
    icon: "🧭",
    title: "Request Scoped Logging",
    explanation:
      "Route handlers should log through req.log to keep request correlation metadata in every log entry.",
    fixes: [
      "Replace logger.error(...) with (req as any).log?.error(...).",
      "Prefer req.log.warn/info/debug in route handlers.",
    ],
  },
  "Message Format": {
    key: "PINO_SIGNATURE_MISMATCH",
    icon: "🧩",
    title: "Pino Signature Mismatch",
    explanation:
      "Pino expects object-first signatures. Message-first signatures are Winston style and lose structured context.",
    fixes: [
      "Use logger.info({ context }, 'message') format.",
      "Do not use logger.info('message', { context }).",
    ],
  },
};

function toIssue(checkName, item, level) {
  const meta = CHECK_CATEGORY[checkName] || {
    key: "LOGGER_POLICY",
    icon: "⚠️",
    title: checkName,
    explanation: "Logger policy violation detected.",
    fixes: ["Review logger gate policy and apply the expected logging pattern."],
  };

  return {
    level,
    category: meta.key,
    icon: meta.icon,
    title: meta.title,
    explanation: meta.explanation,
    fixes: meta.fixes,
    file: item.file,
    line: item.line,
    column: item.column,
    message: item.message,
  };
}

function printGroupedIssues(issues) {
  const byCategory = new Map();

  for (const issue of issues) {
    if (!byCategory.has(issue.category)) byCategory.set(issue.category, []);
    byCategory.get(issue.category).push(issue);
  }

  for (const [, grouped] of byCategory) {
    const first = grouped[0];
    console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log(`${first.icon} ${first.title} (${grouped.length})`);
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

    for (const issue of grouped) {
      console.log(`\n📍 Location: ${issue.file}:${issue.line}:${issue.column}`);
      console.log(`❌ ${issue.message}`);
      console.log("💡 Explanation:");
      console.log(`   ${issue.explanation}`);
      console.log("🔧 Fix suggestions:");
      for (const fix of issue.fixes) {
        console.log(`   - ${fix}`);
      }
    }
  }
}

export function reportResults(results) {
  let totalErrors = 0;
  let totalWarnings = 0;
  const allIssues = [];

  for (const result of results) {
    const { name, errors = [], warnings = [] } = result;
    totalErrors += errors.length;
    totalWarnings += warnings.length;

    if (errors.length === 0 && warnings.length === 0) {
      console.log(`✅ ${name}: PASSED`);
      continue;
    }

    console.log(`\n❌ ${name}: ${errors.length} error(s), ${warnings.length} warning(s)`);

    for (const error of errors) {
      allIssues.push(toIssue(name, error, "error"));
    }
    for (const warning of warnings) {
      allIssues.push(toIssue(name, warning, "warning"));
    }
  }

  if (allIssues.length > 0) {
    printGroupedIssues(allIssues);
  }

  console.log("\n📊 Logger Gate Summary");
  console.log("════════════════════════════════════════════════════════════");
  console.log(`Total issues: ${totalErrors + totalWarnings}`);
  console.log(`  Errors: ${totalErrors}`);
  console.log(`  Warnings: ${totalWarnings}`);

  return totalErrors;
}
