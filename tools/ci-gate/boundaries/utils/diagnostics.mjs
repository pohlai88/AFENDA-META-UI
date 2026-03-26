/**
 * Boundaries Gate Diagnostics
 * ============================
 * Provides categorized, actionable diagnostics for architectural boundary violations.
 */

function icon(category) {
  const map = {
    TURBOREPO_BOUNDARY_VIOLATION: "🏗️",
    ARCHITECTURE_TIER_VIOLATION: "🧱",
    CIRCULAR_DEPENDENCY: "🔄",
    INVALID_IMPORT: "❌",
  };

  return map[category] || "⚠️";
}

function title(category) {
  const map = {
    TURBOREPO_BOUNDARY_VIOLATION: "Turborepo Boundary Violation",
    ARCHITECTURE_TIER_VIOLATION: "Architecture Tier Violation",
    CIRCULAR_DEPENDENCY: "Circular Dependency Detected",
    INVALID_IMPORT: "Invalid Import",
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

export function formatBoundariesIssues(issues) {
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

export function summarizeBoundariesIssues(errors, warnings) {
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
    "📊 Boundaries Gate Summary",
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

/**
 * Create a structured issue object
 */
export function createIssue({
  level,
  category,
  message,
  explanation,
  relatedFiles = [],
  fixes = [],
  details = [],
}) {
  return {
    level,
    category,
    message,
    explanation,
    relatedFiles,
    fixes,
    details,
  };
}

/**
 * Parse Turborepo boundary violations from output
 */
export function parseTurboBoundaryErrors(output) {
  const errors = [];
  const lines = output.split("\n");

  let currentViolation = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Look for violation patterns in turbo output
    // Example: "Package @afenda/api cannot depend on @afenda/web (violates tag rules)"
    const violationMatch = line.match(/Package\s+([@\w/-]+)\s+cannot\s+depend\s+on\s+([@\w/-]+)/);
    if (violationMatch) {
      const [, fromPkg, toPkg] = violationMatch;
      
      errors.push(
        createIssue({
          level: "error",
          category: "TURBOREPO_BOUNDARY_VIOLATION",
          message: `Package ${fromPkg} cannot depend on ${toPkg}`,
          explanation:
            "This violates the architecture tier rules. Packages can only depend on allowed tiers per the architecture.",
          relatedFiles: [
            `${fromPkg.replace("@afenda/", "packages/")}/package.json`,
            `${toPkg.replace("@afenda/", "packages/")}/package.json`,
          ],
          fixes: [
            `Review the import in ${fromPkg} that references ${toPkg}`,
            "Move code to appropriate packages or refactor imports",
            "Consult docs/DEPENDENCY_GOVERNANCE_POLICY.md for architecture rules",
          ],
          details: [line.trim()],
        })
      );
    }

    // Look for generic error patterns
    if (line.includes("Error:") || line.includes("violation") || line.includes("violates")) {
      // Collect context for generic errors
      const contextLines = [];
      for (let j = Math.max(0, i - 2); j <= Math.min(lines.length - 1, i + 2); j++) {
        if (lines[j].trim()) {
          contextLines.push(lines[j].trim());
        }
      }

      if (!violationMatch && contextLines.length > 0) {
        errors.push(
          createIssue({
            level: "error",
            category: "ARCHITECTURE_TIER_VIOLATION",
            message: line.trim(),
            explanation:
              "An architectural boundary was violated. Review the import statements and package dependencies.",
            relatedFiles: [],
            fixes: [
              "Review the error context below",
              "Move code to appropriate packages or refactor imports",
              "Ensure packages only depend on allowed tiers",
            ],
            details: contextLines,
          })
        );
      }
    }
  }

  return errors;
}
