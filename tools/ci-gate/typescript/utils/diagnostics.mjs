/**
 * TypeScript Gate Diagnostics
 * ===========================
 * Formats categorized diagnostics in the same style as other CI gates.
 */

function icon(category) {
  const map = {
    TS_BASELINE_MISSING: "🧱",
    TS_INCREMENTAL_DRIFT: "⚡",
    TS_DIAGNOSTIC_SCRIPT_MISSING: "🩺",
    TS_EXPORT_CONTRACT_MISSING: "📦",
    TS_DOC_MISSING: "📚",
    TS_TYPECHECK_FAILED: "❌",
    TS_ANY_BUDGET_EXCEEDED: "🚫",
    TS_UNSAFE_CAST_BUDGET_EXCEEDED: "⛔",
    TS_EXHAUSTIVENESS_MISSING: "🔍",
    TS_WIDENING_CAST_BUDGET_EXCEEDED: "🪣",
    TS_TYPE_GUARD_MISSING_PREDICATE: "🛡️",
  };

  return map[category] || "⚠️";
}

function title(category) {
  const map = {
    TS_BASELINE_MISSING: "TypeScript Baseline Drift",
    TS_INCREMENTAL_DRIFT: "Incremental Build Drift",
    TS_DIAGNOSTIC_SCRIPT_MISSING: "Diagnostic Script Drift",
    TS_EXPORT_CONTRACT_MISSING: "Declaration Export Contract Drift",
    TS_DOC_MISSING: "TypeScript DX Documentation Drift",
    TS_TYPECHECK_FAILED: "Typecheck Execution Failure",
    TS_ANY_BUDGET_EXCEEDED: "any Budget Exceeded",
    TS_UNSAFE_CAST_BUDGET_EXCEEDED: "as-unknown-as Budget Exceeded",
    TS_EXHAUSTIVENESS_MISSING: "Discriminated Union Exhaustiveness Missing",
    TS_WIDENING_CAST_BUDGET_EXCEEDED: "Object Widening Cast Budget Exceeded",
    TS_TYPE_GUARD_MISSING_PREDICATE: "Type Guard Missing Predicate Annotation",
  };

  return map[category] || category;
}

function groupByCategory(issues) {
  const grouped = new Map();
  for (const issue of issues) {
    if (!grouped.has(issue.category)) grouped.set(issue.category, []);
    grouped.get(issue.category).push(issue);
  }
  return grouped;
}

export function formatTypescriptIssues(issues) {
  if (!issues.length) return "";

  const grouped = groupByCategory(issues);
  const lines = [];

  for (const [category, items] of grouped.entries()) {
    lines.push("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    lines.push(`${icon(category)} ${title(category)} (${items.length})`);
    lines.push("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

    for (const issue of items) {
      lines.push("");
      lines.push(`❌ ${issue.message}`);
      if (issue.explanation) {
        lines.push("💡 Explanation:");
        lines.push(`   ${issue.explanation}`);
      }

      if (issue.relatedFiles?.length) {
        lines.push("📂 Related files:");
        for (const file of issue.relatedFiles) {
          lines.push(`   • ${file}`);
        }
      }

      if (issue.fixes?.length) {
        lines.push("🔧 Fix suggestions:");
        for (const fix of issue.fixes) {
          lines.push(`   - ${fix}`);
        }
      }

      if (issue.details?.length) {
        lines.push("🧾 Inline diagnostics:");
        for (const detail of issue.details) {
          lines.push(`   - ${detail}`);
        }
      }
    }
  }

  return lines.join("\n");
}

export function summarizeTypescriptIssues(errors, warnings) {
  const count = (issues) => {
    const counts = new Map();
    for (const issue of issues) {
      counts.set(issue.category, (counts.get(issue.category) || 0) + 1);
    }
    return counts;
  };

  const errorCounts = count(errors);
  const warningCounts = count(warnings);

  const lines = [
    "",
    "📊 TypeScript Gate Summary",
    "════════════════════════════════════════════════════════════",
    `Errors: ${errors.length}`,
  ];

  for (const [category, n] of errorCounts.entries()) {
    lines.push(`  ${icon(category)} ${title(category)}: ${n}`);
  }

  lines.push(`Warnings: ${warnings.length}`);
  for (const [category, n] of warningCounts.entries()) {
    lines.push(`  ${icon(category)} ${title(category)}: ${n}`);
  }

  return lines.join("\n");
}
