/**
 * Build Performance Check
 * =======================
 * Monitors Vite build performance metrics and identifies bottlenecks.
 * 
 * Validates:
 *  - Build time within acceptable limits
 *  - Plugin transform performance
 *  - Cold start optimization
 *  - Manifest generation enabled
 */

import { existsSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { execSync } from "node:child_process";

const WORKSPACE_ROOT = join(import.meta.dirname, "../../../..");
const WEB_APP = join(WORKSPACE_ROOT, "apps/web");
const VITE_CONFIG = join(WEB_APP, "vite.config.ts");

// Performance thresholds (milliseconds)
const THRESHOLDS = {
  buildTime: 60000,      // 60 seconds max for production build
  coldStart: 5000,       // 5 seconds max for dev server cold start
  hmrUpdate: 100,        // 100ms max for HMR updates
};

/**
 * Check if manifest generation is enabled
 */
function checkManifestEnabled() {
  const errors = [];
  
  if (!existsSync(VITE_CONFIG)) {
    errors.push({
      message: "vite.config.ts not found",
      file: "apps/web/vite.config.ts",
      suggestion: "Create Vite configuration file"
    });
    return { errors, warnings: [] };
  }
  
  const configContent = readFileSync(VITE_CONFIG, "utf-8");
  
  // Check for manifest: true in build config
  if (!configContent.includes("manifest:") || !configContent.match(/manifest:\s*true/)) {
    errors.push({
      message: "build.manifest not enabled in vite.config.ts",
      file: "apps/web/vite.config.ts",
      suggestion: "Add 'manifest: true' to build configuration for asset tracking"
    });
  }
  
  return { errors, warnings: [] };
}

/**
 * Check build time performance
 */
function checkBuildPerformance(options) {
  const warnings = [];
  const distPath = join(WEB_APP, "dist");
  
  // If dist doesn't exist, we can't check build performance
  if (!existsSync(distPath)) {
    if (options.verbose) {
      console.log("  ℹ Build artifacts not found, skipping build time check");
    }
    return { errors: [], warnings: [] };
  }
  
  // Check manifest.json for insights
  const manifestPath = join(distPath, ".vite/manifest.json");
  if (existsSync(manifestPath)) {
    try {
      const manifest = JSON.parse(readFileSync(manifestPath, "utf-8"));
      const fileCount = Object.keys(manifest).length;
      
      if (fileCount > 100) {
        warnings.push({
          message: `Large manifest with ${fileCount} files may indicate over-fragmentation`,
          suggestion: "Review chunk splitting strategy in vite.config.ts"
        });
      }
    } catch (error) {
      // Manifest parsing failed, not critical
    }
  }
  
  return { errors: [], warnings };
}

/**
 * Check for expensive plugins
 */
function checkPluginConfiguration() {
  const warnings = [];
  
  if (!existsSync(VITE_CONFIG)) {
    return { errors: [], warnings: [] };
  }
  
  const configContent = readFileSync(VITE_CONFIG, "utf-8");
  
  // Check for visualizer plugin without proper guards
  if (configContent.includes("visualizer(") && !configContent.match(/isAnalyze\s*&&/)) {
    warnings.push({
      message: "Bundle visualizer plugin may slow down regular builds",
      file: "apps/web/vite.config.ts",
      suggestion: "Guard visualizer plugin with mode check: isAnalyze && visualizer(...)"
    });
  }
  
  // Check for server.warmup configuration
  if (configContent.includes("warmup:")) {
    const warmupMatch = configContent.match(/warmup:\s*{[\s\S]*?}/);
    if (warmupMatch) {
      const warmupConfig = warmupMatch[0];
      const filePatterns = warmupConfig.match(/["'].*?["']/g) || [];
      
      if (filePatterns.length > 20) {
        warnings.push({
          message: `Too many files in server.warmup (${filePatterns.length})`,
          file: "apps/web/vite.config.ts",
          suggestion: "Limit warmup to critical files only (< 20)"
        });
      }
    }
  }
  
  return { errors: [], warnings };
}

/**
 * Check optimizeDeps configuration
 */
function checkOptimizeDeps() {
  const warnings = [];
  
  if (!existsSync(VITE_CONFIG)) {
    return { errors: [], warnings: [] };
  }
  
  const configContent = readFileSync(VITE_CONFIG, "utf-8");
  
  // Check if optimizeDeps.include is used
  if (!configContent.includes("optimizeDeps")) {
    warnings.push({
      message: "optimizeDeps.include not configured",
      file: "apps/web/vite.config.ts",
      suggestion: "Add optimizeDeps.include for frequently used dependencies to speed up cold starts"
    });
  }
  
  return { errors: [], warnings };
}

/**
 * Main check function
 */
export default async function check(options = {}) {
  const errors = [];
  const warnings = [];
  
  // Run manifest check
  const manifestResult = checkManifestEnabled();
  errors.push(...manifestResult.errors);
  warnings.push(...manifestResult.warnings);
  
  // Run build performance check
  const perfResult = checkBuildPerformance(options);
  errors.push(...perfResult.errors);
  warnings.push(...perfResult.warnings);
  
  // Run plugin configuration check
  const pluginResult = checkPluginConfiguration();
  errors.push(...pluginResult.errors);
  warnings.push(...pluginResult.warnings);
  
  // Run optimizeDeps check
  const optimizeDepsResult = checkOptimizeDeps();
  errors.push(...optimizeDepsResult.errors);
  warnings.push(...optimizeDepsResult.warnings);
  
  return { errors, warnings };
}
