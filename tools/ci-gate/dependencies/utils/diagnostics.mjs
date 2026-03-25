/**
 * Dependencies Gate Diagnostics
 * =============================
 * Provides categorized, actionable diagnostics similar to contracts gate output.
 */

function icon(category) {
  const map = {
    ROOT_OVERRIDE_MISSING: "🧭",
    VERSION_DRIFT: "🔀",
    SERVER_CLIENT_BOUNDARY: "🧱",
    SHADCN_RUNTIME_DEP: "📦",
    REACT_TYPES_MISMATCH: "⚛️",
    INTERNAL_WORKSPACE_SPEC: "🔗",
    TYPESCRIPT_RANGE_DRIFT: "🧪",
    SECURITY_AUDIT: "🔒",
    OUTDATED_PARSE: "📊",
  };

  return map[category] || "⚠️";
}

function title(category) {
  const map = {
    ROOT_OVERRIDE_MISSING: "Missing Root Override",
    VERSION_DRIFT: "Critical Version Drift",
    SERVER_CLIENT_BOUNDARY: "Server/Client Boundary Violation",
    SHADCN_RUNTIME_DEP: "shadcn Runtime Dependency",
    REACT_TYPES_MISMATCH: "React/@types Major Mismatch",
    INTERNAL_WORKSPACE_SPEC: "Internal Workspace Spec Violation",
    TYPESCRIPT_RANGE_DRIFT: "TypeScript Range Drift",
    SECURITY_AUDIT: "High Severity Vulnerabilities",
    OUTDATED_PARSE: "Outdated Report Parse Failure",
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

export function formatDependencyIssues(issues) {
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
    }
  }

  return lines.join("\n");
}

export function summarizeDependencyIssues(errors, warnings) {
  const summarize = (issues) => {
    const counts = new Map();
    for (const issue of issues) {
      counts.set(issue.category, (counts.get(issue.category) || 0) + 1);
    }
    return counts;
  };

  const errorCounts = summarize(errors);
  const warningCounts = summarize(warnings);

  const lines = [
    "",
    "📊 Dependency Gate Summary",
    "════════════════════════════════════════════════════════════",
    `Errors: ${errors.length}`,
  ];

  for (const [category, count] of errorCounts.entries()) {
    lines.push(`  ${icon(category)} ${title(category)}: ${count}`);
  }

  lines.push(`Warnings: ${warnings.length}`);
  for (const [category, count] of warningCounts.entries()) {
    lines.push(`  ${icon(category)} ${title(category)}: ${count}`);
  }

  return lines.join("\n");
}
