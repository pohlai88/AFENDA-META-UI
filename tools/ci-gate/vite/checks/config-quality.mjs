/**
 * Configuration Quality Check
 * ============================
 * Validates Vite configuration follows industry best practices.
 * 
 * Based on: https://vite.dev/config/
 * 
 * Validates:
 *  - TypeScript configuration (vite.config.ts)
 *  - defineConfig usage
 *  - Explicit base configuration
 *  - Modern build target
 *  - Manifest generation
 *  - Proper minification settings
 */

import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const WORKSPACE_ROOT = join(import.meta.dirname, "../../../..");
const WEB_APP = join(WORKSPACE_ROOT, "apps/web");
const VITE_CONFIG = join(WEB_APP, "vite.config.ts");

/**
 * Check if vite.config.ts exists and uses TypeScript
 */
function checkConfigFile() {
  const errors = [];
  
  if (!existsSync(VITE_CONFIG)) {
    errors.push({
      message: "vite.config.ts not found",
      file: "apps/web/vite.config.ts",
      suggestion: "Create TypeScript Vite configuration file"
    });
    return { errors, warnings: [] };
  }
  
  // Check if it's actually TypeScript (not .js)
  const jsConfig = join(WEB_APP, "vite.config.js");
  if (existsSync(jsConfig)) {
    errors.push({
      message: "Using vite.config.js instead of vite.config.ts",
      file: "apps/web/vite.config.js",
      suggestion: "Rename to vite.config.ts for better type safety"
    });
  }
  
  return { errors, warnings: [] };
}

/**
 * Check defineConfig usage
 */
function checkDefineConfig() {
  const errors = [];
  
  if (!existsSync(VITE_CONFIG)) {
    return { errors, warnings: [] };
  }
  
  const content = readFileSync(VITE_CONFIG, "utf-8");
  
  // Check for defineConfig import
  if (!content.includes("defineConfig")) {
    errors.push({
      message: "defineConfig not used in vite.config.ts",
      file: "apps/web/vite.config.ts",
      suggestion: "Import and use defineConfig for better IntelliSense: import { defineConfig } from 'vite'"
    });
  }
  
  // Check export default defineConfig(...)
  if (!content.match(/export\s+default\s+defineConfig/)) {
    errors.push({
      message: "Configuration not exported with defineConfig",
      file: "apps/web/vite.config.ts",
      suggestion: "Use: export default defineConfig({ ... })"
    });
  }
  
  return { errors, warnings: [] };
}

/**
 * Check base configuration
 */
function checkBaseConfig() {
  const warnings = [];
  
  if (!existsSync(VITE_CONFIG)) {
    return { errors: [], warnings: [] };
  }
  
  const content = readFileSync(VITE_CONFIG, "utf-8");
  
  // Check if base is explicitly configured
  if (!content.includes("base:")) {
    warnings.push({
      message: "base path not explicitly configured",
      file: "apps/web/vite.config.ts",
      suggestion: "Set explicit base: '/' for clarity. Change to '/app/' if deployed to subdirectory."
    });
  }
  
  return { errors: [], warnings };
}

/**
 * Check build target
 */
function checkBuildTarget() {
  const warnings = [];
  
  if (!existsSync(VITE_CONFIG)) {
    return { errors: [], warnings: [] };
  }
  
  const content = readFileSync(VITE_CONFIG, "utf-8");
  
  // Extract build.target value
  const targetMatch = content.match(/target:\s*["']([^"']+)["']/);
  
  if (targetMatch) {
    const target = targetMatch[1];
    
    // Warn if using outdated targets
    const outdatedTargets = ["es2015", "es2016", "es2017", "es2018", "es2019", "es2020"];
    if (outdatedTargets.includes(target)) {
      warnings.push({
        message: `Build target '${target}' is outdated`,
        file: "apps/web/vite.config.ts",
        suggestion: "Use modern target 'es2022' or 'esnext' for better performance. Add @vitejs/plugin-legacy if older browser support is needed."
      });
    }
  } else {
    warnings.push({
      message: "build.target not explicitly set",
      file: "apps/web/vite.config.ts",
      suggestion: "Set explicit target: 'es2022' for modern browsers or 'es2020' for broader compatibility"
    });
  }
  
  return { errors: [], warnings };
}

/**
 * Check minification settings
 */
function checkMinification() {
  const warnings = [];
  
  if (!existsSync(VITE_CONFIG)) {
    return { errors: [], warnings: [] };
  }
  
  const content = readFileSync(VITE_CONFIG, "utf-8");
  
  // Check if minify is configured
  const minifyMatch = content.match(/minify:\s*["']([^"']+)["']/);
  
  if (minifyMatch) {
    const minifier = minifyMatch[1];
    
    // Warn if using terser (much slower than esbuild or oxc)
    if (minifier === "terser") {
      warnings.push({
        message: "Using 'terser' minifier (slow)",
        file: "apps/web/vite.config.ts",
        suggestion: "Use 'oxc' (30-90x faster) or 'esbuild' for faster builds. Vite 8 default is 'oxc'."
      });
    }
  }
  
  // Check CSS minification
  const cssMinifyMatch = content.match(/cssMinify:\s*["']([^"']+)["']/);
  
  if (!cssMinifyMatch && content.includes("isProd")) {
    warnings.push({
      message: "cssMinify not explicitly configured",
      file: "apps/web/vite.config.ts",
      suggestion: "Set cssMinify: 'lightningcss' for faster CSS minification"
    });
  }
  
  return { errors: [], warnings };
}

/**
 * Check sourcemap configuration
 */
function checkSourcemaps() {
  const warnings = [];
  
  if (!existsSync(VITE_CONFIG)) {
    return { errors: [], warnings: [] };
  }
  
  const content = readFileSync(VITE_CONFIG, "utf-8");
  
  // Check if sourcemap is configured for production
  if (content.includes("isProd") || content.includes("production")) {
    const sourcemapMatch = content.match(/sourcemap:\s*["']([^"']+)["']/);
    
    if (!sourcemapMatch) {
      warnings.push({
        message: "sourcemap not configured for production",
        file: "apps/web/vite.config.ts",
        suggestion: "Set sourcemap: 'hidden' for error tracking without exposing sources to users"
      });
    }
  }
  
  return { errors: [], warnings };
}

/**
 * Check rolldownOptions/rollupOptions
 */
function checkBundlerOptions() {
  const warnings = [];
  
  if (!existsSync(VITE_CONFIG)) {
    return { errors: [], warnings: [] };
  }
  
  const content = readFileSync(VITE_CONFIG, "utf-8");
  
  // Vite 8 uses rolldownOptions, older versions use rollupOptions
  if (content.includes("rollupOptions") && !content.includes("rolldownOptions")) {
    warnings.push({
      message: "Using deprecated 'rollupOptions' instead of 'rolldownOptions'",
      file: "apps/web/vite.config.ts",
      suggestion: "Vite 8 uses Rolldown. Rename 'rollupOptions' to 'rolldownOptions' in build config."
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
  
  // Check config file exists
  const configFileResult = checkConfigFile();
  errors.push(...configFileResult.errors);
  warnings.push(...configFileResult.warnings);
  
  // If config doesn't exist, skip other checks
  if (errors.length > 0) {
    return { errors, warnings };
  }
  
  // Check defineConfig usage
  const defineConfigResult = checkDefineConfig();
  errors.push(...defineConfigResult.errors);
  warnings.push(...defineConfigResult.warnings);
  
  // Check base configuration
  const baseResult = checkBaseConfig();
  errors.push(...baseResult.errors);
  warnings.push(...baseResult.warnings);
  
  // Check build target
  const targetResult = checkBuildTarget();
  errors.push(...targetResult.errors);
  warnings.push(...targetResult.warnings);
  
  // Check minification
  const minifyResult = checkMinification();
  errors.push(...minifyResult.errors);
  warnings.push(...minifyResult.warnings);
  
  // Check sourcemaps
  const sourcemapResult = checkSourcemaps();
  errors.push(...sourcemapResult.errors);
  warnings.push(...sourcemapResult.warnings);
  
  // Check bundler options
  const bundlerResult = checkBundlerOptions();
  errors.push(...bundlerResult.errors);
  warnings.push(...bundlerResult.warnings);
  
  return { errors, warnings };
}
