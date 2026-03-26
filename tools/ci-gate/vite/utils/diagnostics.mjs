/**
 * Vite Gate Diagnostics
 * =====================
 * Provides categorized, actionable diagnostics for Vite configuration and performance issues.
 */

function icon(category) {
  const map = {
    BUILD_PERFORMANCE: "⚡",
    ENV_SECURITY: "🔒",
    CONFIG_QUALITY: "⚙️",
    ASSET_OPTIMIZATION: "🖼️",
    PLUGIN_HEALTH: "🔌",
    VITE_CONFIG: "📋",
    PERFORMANCE_BUDGET: "⏱️",
  };

  return map[category] || "⚠️";
}

function title(category) {
  const map = {
    BUILD_PERFORMANCE: "Build Performance Issue",
    ENV_SECURITY: "Environment Variable Security",
    CONFIG_QUALITY: "Configuration Quality",
    ASSET_OPTIMIZATION: "Asset Optimization",
    PLUGIN_HEALTH: "Plugin Health",
    VITE_CONFIG: "Vite Configuration",
    PERFORMANCE_BUDGET: "Performance Budget",
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

export function formatViteIssues(issues) {
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

export function summarizeViteIssues(errors, warnings) {
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
    "📊 Vite Gate Summary",
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
 * Convert check results to structured issues
 */
export function convertCheckResult(checkName, result) {
  const errors = [];
  const warnings = [];

  // Convert errors
  if (result.errors && result.errors.length > 0) {
    for (const error of result.errors) {
      errors.push(
        createIssue({
          level: "error",
          category: inferCategory(checkName, error),
          message: error.message || `Issue in ${checkName}`,
          explanation: error.explanation || inferExplanation(checkName, error),
          relatedFiles: error.file ? [error.file] : (error.relatedFiles || []),
          fixes: error.suggestion ? [error.suggestion] : (error.fixes || inferFixes(checkName, error)),
          details: error.details || [],
        })
      );
    }
  }

  // Convert warnings
  if (result.warnings && result.warnings.length > 0) {
    for (const warning of result.warnings) {
      warnings.push(
        createIssue({
          level: "warning",
          category: inferCategory(checkName, warning),
          message: warning.message || `Warning in ${checkName}`,
          explanation: warning.explanation || inferExplanation(checkName, warning),
          relatedFiles: warning.file ? [warning.file] : (warning.relatedFiles || []),
          fixes: warning.suggestion ? [warning.suggestion] : (warning.fixes || inferFixes(checkName, warning)),
          details: warning.details || [],
        })
      );
    }
  }

  return { errors, warnings };
}

function inferCategory(checkName, issue) {
  const categoryMap = {
    "Build Performance": "BUILD_PERFORMANCE",
    "Environment Security": "ENV_SECURITY",
    "Configuration Quality": "CONFIG_QUALITY",
    "Asset Optimization": "ASSET_OPTIMIZATION",
    "Plugin Health": "PLUGIN_HEALTH",
  };

  return issue.category || categoryMap[checkName] || "VITE_CONFIG";
}

function inferExplanation(checkName, issue) {
  const explanations = {
    "Build Performance":
      "Build performance issues can slow down development feedback loops and CI/CD pipelines.",
    "Environment Security":
      "Environment variables prefixed with VITE_ are embedded in the client bundle and become public. Sensitive data should never use this prefix.",
    "Configuration Quality":
      "Vite configuration quality issues can lead to suboptimal builds, missing features, or production problems.",
    "Asset Optimization":
      "Unoptimized assets increase bundle size and page load times, hurting user experience.",
    "Plugin Health":
      "Plugin configuration issues can cause build failures, performance problems, or incorrect output.",
  };

  return explanations[checkName] || "Vite configuration or build issue detected.";
}

function inferFixes(checkName, issue) {
  const defaultFixes = {
    "Build Performance": [
      "Review plugin configurations for performance bottlenecks",
      "Enable Vite's build cache if disabled",
      "Consider using esbuild for faster transformations",
    ],
    "Environment Security": [
      "Remove VITE_ prefix from sensitive environment variables",
      "Use server-side environment variables instead",
      "Review .env files for exposed secrets",
    ],
    "Configuration Quality": [
      "Review vite.config.ts against Vite best practices",
      "Ensure build.manifest is enabled for production",
      "Validate build.target compatibility",
    ],
    "Asset Optimization": [
      "Optimize images using tools like sharp or squoosh",
      "Enable asset inlining for small files",
      "Review asset size budgets",
    ],
    "Plugin Health": [
      "Review plugin order and dependencies",
      "Ensure plugins are compatible with current Vite version",
      "Check for conflicting plugin configurations",
    ],
  };

  return defaultFixes[checkName] || ["Review vite.config.ts and related configuration"];
}
