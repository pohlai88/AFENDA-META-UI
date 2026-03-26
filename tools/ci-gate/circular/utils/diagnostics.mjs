/**
 * Circular Dependency Gate Diagnostics
 * ====================================
 * Provides categorized, actionable diagnostics for circular dependency violations.
 */

function icon(category) {
  const map = {
    CIRCULAR_DEPENDENCY: "🔄",
    MODULE_CYCLE: "♻️",
    DEPENDENCY_CYCLE: "🔁",
    MADGE_ERROR: "❌",
  };

  return map[category] || "⚠️";
}

function title(category) {
  const map = {
    CIRCULAR_DEPENDENCY: "Circular Dependency Detected",
    MODULE_CYCLE: "Module Import Cycle",
    DEPENDENCY_CYCLE: "Dependency Cycle",
    MADGE_ERROR: "Madge Analysis Error",
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

export function formatCircularIssues(issues) {
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

export function summarizeCircularIssues(errors, warnings) {
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
    "📊 Circular Dependency Gate Summary",
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
 * Parse circular dependency patterns from madge output
 */
export function parseCircularDependencyErrors(output, label) {
  const errors = [];
  const lines = output.split("\n");

  // Track if we found any circular dependencies
  let foundCircular = false;
  let cycleLines = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    // Match circular dependency cycle patterns
    // Example: "1) src/a.ts > src/b.ts > src/a.ts"
    const cycleMatch = line.match(/^\d+\)\s+(.+)$/);
    if (cycleMatch) {
      foundCircular = true;
      const cycle = cycleMatch[1];
      const files = cycle.split(/\s*>\s*/);
      
      cycleLines.push(line);
      
      errors.push(
        createIssue({
          level: "error",
          category: "CIRCULAR_DEPENDENCY",
          message: `Circular dependency in ${label}`,
          explanation:
            "Circular dependencies can cause build order problems, runtime initialization issues, and make code harder to maintain and understand.",
          relatedFiles: files.map(f => `${label}/${f}`),
          fixes: [
            "Extract shared functionality into a separate module",
            "Use dependency injection or callbacks to break the cycle",
            "Refactor to establish a clear dependency hierarchy",
            "Consider using an event emitter pattern for communication",
          ],
          details: [cycle],
        })
      );
    }

    // Collect additional context lines
    if (foundCircular && line && !cycleMatch && cycleLines.length > 0) {
      // This might be additional context
      if (line.includes("->") || line.includes("=>") || line.includes("imports")) {
        cycleLines.push(line);
      }
    }
  }

  // If no structured cycles found but output contains errors
  if (!foundCircular && (output.includes("circular") || output.includes("Error"))) {
    errors.push(
      createIssue({
        level: "error",
        category: "CIRCULAR_DEPENDENCY",
        message: `Circular dependency detected in ${label}`,
        explanation:
          "Circular dependencies indicate architectural issues that can cause build and runtime problems.",
        relatedFiles: [],
        fixes: [
          "Review the madge output below for cycle details",
          "Refactor modules to establish clear dependency direction",
          "Extract shared code into independent modules",
        ],
        details: lines.filter(l => l.trim()).slice(0, 15),
      })
    );
  }

  return errors;
}

/**
 * Create a warning issue for circular dependencies in non-strict mode
 */
export function createCircularWarning(label, output) {
  const lines = output.split("\n").filter(l => l.trim());
  const cycleDetails = lines.slice(0, 10);

  return createIssue({
    level: "warning",
    category: "CIRCULAR_DEPENDENCY",
    message: `Circular dependencies detected in ${label}`,
    explanation:
      "Circular dependencies are detected but not blocking in non-strict mode. Consider resolving them to improve code maintainability.",
    relatedFiles: [],
    fixes: [
      "Run with --strict flag to treat as errors",
      "Refactor modules to break circular dependencies",
      "Extract shared functionality into separate modules",
    ],
    details: cycleDetails,
  });
}
