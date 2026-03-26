/**
 * Bundle Gate Diagnostics
 * =======================
 * Provides categorized, actionable diagnostics for bundle size and performance issues.
 */

function icon(category) {
  const map = {
    TOTAL_JS_EXCEEDED: "📦",
    TOTAL_CSS_EXCEEDED: "🎨",
    CHUNK_COUNT_HIGH: "🔢",
    ENTRY_CHUNK_EXCEEDED: "🚀",
    VENDOR_CHUNK_EXCEEDED: "📚",
    ASYNC_CHUNK_LARGE: "⚡",
    JS_SIZE_REGRESSION: "📈",
    CSS_SIZE_REGRESSION: "📊",
    CHUNK_COUNT_REGRESSION: "🔼",
  };

  return map[category] || "⚠️";
}

function title(category) {
  const map = {
    TOTAL_JS_EXCEEDED: "Total JS Budget Exceeded",
    TOTAL_CSS_EXCEEDED: "Total CSS Budget Exceeded",
    CHUNK_COUNT_HIGH: "High Chunk Count",
    ENTRY_CHUNK_EXCEEDED: "Entry Chunk Budget Exceeded",
    VENDOR_CHUNK_EXCEEDED: "Vendor Chunk Budget Exceeded",
    ASYNC_CHUNK_LARGE: "Large Async Chunk",
    JS_SIZE_REGRESSION: "JS Size Regression",
    CSS_SIZE_REGRESSION: "CSS Size Regression",
    CHUNK_COUNT_REGRESSION: "Chunk Count Regression",
  };

  return map[category] || category;
}

function groupByCategory(issues) {
  const grouped = new Map();
  for (const issue of issues) {
    if (!grouped.has(issue
.category)) grouped.set(issue.category, []);
    grouped.get(issue.category).push(issue);
  }
  return grouped;
}

export function formatBundleIssues(issues) {
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

export function summarizeBundleIssues(errors, warnings) {
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
    "📊 Bundle Gate Summary",
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
 * Convert bundle validation errors to structured issues
 */
export function convertBudgetErrors(errors) {
  return errors.map((error) => {
    const explanation = getExplanation(error.category);
    const fixes = getFixes(error.category, error);
    const details = [];

    if (error.actual !== undefined && error.budget !== undefined) {
      details.push(`Actual: ${formatSize(error.actual)}`);
      details.push(`Budget: ${formatSize(error.budget)}`);
      details.push(`Exceeded by: ${formatSize(error.actual - error.budget)}`);
    }

    return createIssue({
      level: "error",
      category: error.category,
      message: error.message,
      explanation,
      relatedFiles: error.file ? [error.file] : [],
      fixes,
      details,
    });
  });
}

/**
 * Convert bundle validation warnings to structured issues
 */
export function convertBudgetWarnings(warnings) {
  return warnings.map((warning) => {
    const explanation = getExplanation(warning.category);
    const fixes = getFixes(warning.category, warning);
    const details = [];

    if (warning.actual !== undefined && warning.budget !== undefined) {
      details.push(`Actual: ${formatSize(warning.actual)}`);
      details.push(`Recommended: ${formatSize(warning.budget)}`);
      details.push(`Exceeds by: ${formatSize(warning.actual - warning.budget)}`);
    }

    return createIssue({
      level: "warning",
      category: warning.category,
      message: warning.message,
      explanation,
      relatedFiles: warning.file ? [warning.file] : [],
      fixes,
      details,
    });
  });
}

/**
 * Convert baseline regression errors to structured issues
 */
export function convertBaselineErrors(errors) {
  return errors.map((error) => {
    const details = [];

    if (error.baseline !== undefined && error.current !== undefined) {
      details.push(`Baseline: ${formatSize(error.baseline)}`);
      details.push(`Current: ${formatSize(error.current)}`);
      if (error.change !== undefined) {
        details.push(`Change: +${error.change.toFixed(1)}%`);
      }
    }

    return createIssue({
      level: "error",
      category: error.category,
      message: error.message,
      explanation: getExplanation(error.category),
      relatedFiles: [],
      fixes: getFixes(error.category, error),
      details,
    });
  });
}

function getExplanation(category) {
  const explanations = {
    TOTAL_JS_EXCEEDED:
      "The total JavaScript bundle size exceeds the performance budget. Large JS bundles increase page load time and hurt user experience, especially on slower networks.",
    TOTAL_CSS_EXCEEDED:
      "The total CSS size exceeds the performance budget. Large CSS files block rendering and can significantly impact First Contentful Paint (FCP).",
    CHUNK_COUNT_HIGH:
      "Excessive chunk count can cause too many HTTP requests and hurt performance. Consider consolidating related chunks or adjusting code splitting strategy.",
    ENTRY_CHUNK_EXCEEDED:
      "The main entry chunk is too large. This is the critical path code loaded on initial page load. Large entry chunks delay Time to Interactive (TTI).",
    VENDOR_CHUNK_EXCEEDED:
      "A vendor chunk containing third-party dependencies is too large. Consider splitting large vendors or lazy-loading non-critical dependencies.",
    ASYNC_CHUNK_LARGE:
      "An async (lazy-loaded) chunk is larger than recommended. While not blocking initial load, large async chunks can cause delays when navigating to features that load them.",
    JS_SIZE_REGRESSION:
      "The JavaScript bundle size has increased significantly compared to the baseline. This regression can impact load performance for users.",
    CSS_SIZE_REGRESSION:
      "The CSS size has increased significantly compared to the baseline. This can impact render performance.",
    CHUNK_COUNT_REGRESSION:
      "The number of chunks has increased significantly. This may indicate that code splitting has become overly fragmented.",
  };

  return explanations[category] || "Bundle performance issue detected.";
}

function getFixes(category, issue) {
  const baseFixes = {
    TOTAL_JS_EXCEEDED: [
      "Run 'pnpm --filter web analyze' to visualize bundle composition",
      "Look for accidentally included large dependencies",
      "Implement lazy loading for routes and heavy components",
      "Use dynamic imports for non-critical features",
      "Consider tree-shaking optimizations",
    ],
    TOTAL_CSS_EXCEEDED: [
      "Audit unused CSS with tools like PurgeCSS",
      "Remove or lazy-load non-critical CSS",
      "Check for duplicate styles or vendor CSS bloat",
      "Consider CSS-in-JS with code splitting",
    ],
    CHUNK_COUNT_HIGH: [
      "Review Vite's manualChunks configuration",
      "Consolidate related modules into fewer chunks",
      "Increase the minChunkSize threshold",
      "Avoid over-aggressive code splitting",
    ],
    ENTRY_CHUNK_EXCEEDED: [
      "Move non-critical code to async chunks",
      "Lazy load heavy components and utilities",
      "Review vendor chunk configuration",
      "Split large entry files into smaller modules",
    ],
    VENDOR_CHUNK_EXCEEDED: [
      "Identify the large vendor dependency causing bloat",
      "Consider lighter alternatives to heavy libraries",
      "Split vendor chunks by usage frequency",
      "Lazy load vendor code when possible",
    ],
    ASYNC_CHUNK_LARGE: [
      "Split the large async module into smaller pieces",
      "Review imports in the async chunk",
      "Ensure tree-shaking is working correctly",
      "Consider preloading if the chunk is frequently used",
    ],
    JS_SIZE_REGRESSION: [
      "Review recent dependency additions or updates",
      "Check for accidental inclusion of dev dependencies",
      "Audit bundle with 'pnpm --filter web analyze'",
      "Update baseline if the increase is intentional",
    ],
    CSS_SIZE_REGRESSION: [
      "Check for new CSS frameworks or component libraries",
      "Audit for duplicate or unused styles",
      "Review Tailwind/CSS config for unnecessary utilities",
      "Update baseline if the increase is intentional",
    ],
    CHUNK_COUNT_REGRESSION: [
      "Review recent code splitting changes",
      "Check if modules were accidentally fragmented",
      "Consolidate similar chunks",
      "Update baseline if the change is intentional",
    ],
  };

  return baseFixes[category] || ["Review bundle configuration and recent changes"];
}

function formatSize(kb) {
  const num = parseFloat(kb);
  if (Number.isNaN(num)) return "0 B";
  if (num < 1) return `${(num * 1024).toFixed(0)} B`;
  if (num < 1024) return `${num.toFixed(2)} KB`;
  return `${(num / 1024).toFixed(2)} MB`;
}
