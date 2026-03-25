/**
 * Plugin Health Check
 * ====================
 * Validates Vite plugin configuration and best practices.
 * 
 * Validates:
 *  - Plugin ordering
 *  - Filter patterns on expensive plugins
 *  - Virtual module patterns
 *  - Plugin mode guards
 *  - Deprecated plugin usage
 */

import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const WORKSPACE_ROOT = join(import.meta.dirname, "../../../..");
const WEB_APP = join(WORKSPACE_ROOT, "apps/web");
const VITE_CONFIG = join(WEB_APP, "vite.config.ts");

// Known plugin ordering requirements
const PLUGIN_ORDER_RULES = [
  {
    first: "react",
    reason: "React plugin should run before other transform plugins"
  },
];

// Plugins that should have mode guards
const MODE_SENSITIVE_PLUGINS = [
  "visualizer",
  "analyzer",
  "bundle-analyzer",
];

/**
 * Check plugin ordering
 */
function checkPluginOrdering() {
  const warnings = [];
  
  if (!existsSync(VITE_CONFIG)) {
    return { errors: [], warnings: [] };
  }
  
  const content = readFileSync(VITE_CONFIG, "utf-8");
  
  // Extract plugins array
  const pluginsMatch = content.match(/plugins:\s*\[([\s\S]*?)\]/);
  if (!pluginsMatch) {
    return { errors: [], warnings: [] };
  }
  
  const pluginsArray = pluginsMatch[1];
  
  // Find all plugin calls
  const pluginCalls = [...pluginsArray.matchAll(/(\w+)\(/g)].map(m => m[1]);
  
  // Check React plugin is first (if present)
  if (pluginCalls.includes("react")) {
    const reactIndex = pluginCalls.indexOf("react");
    if (reactIndex > 0) {
      warnings.push({
        message: "React plugin is not first in plugins array",
        file: "apps/web/vite.config.ts",
        suggestion: "Move react() plugin to the beginning of plugins array for optimal transform order"
      });
    }
  }
  
  return { errors: [], warnings };
}

/**
 * Check for mode guards on analysis plugins
 */
function checkModeGuards() {
  const warnings = [];
  
  if (!existsSync(VITE_CONFIG)) {
    return { errors: [], warnings: [] };
  }
  
  const content = readFileSync(VITE_CONFIG, "utf-8");
  
  for (const pluginName of MODE_SENSITIVE_PLUGINS) {
    const regex = new RegExp(`${pluginName}\\(`, "g");
    if (regex.test(content)) {
      // Check if there's a mode/environment check before it
      const lines = content.split("\n");
      
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        
        if (line.includes(`${pluginName}(`)) {
          // Look backward for conditional
          let hasGuard = false;
          for (let j = Math.max(0, i - 3); j < i; j++) {
            const prevLine = lines[j];
            if (
              prevLine.includes("if") ||
              prevLine.includes("&&") ||
              prevLine.includes("isAnalyze") ||
              prevLine.includes("mode ===") ||
              prevLine.includes("process.env.ANALYZE")
            ) {
              hasGuard = true;
              break;
            }
          }
          
          if (!hasGuard) {
            warnings.push({
              message: `${pluginName} plugin runs in all modes`,
              file: "apps/web/vite.config.ts",
              suggestion: `Guard ${pluginName}() with mode check: isAnalyze && ${pluginName}(...)`
            });
          }
        }
      }
    }
  }
  
  return { errors: [], warnings };
}

/**
 * Check for filter patterns on transform plugins
 */
function checkFilterPatterns() {
  const warnings = [];
  
  if (!existsSync(VITE_CONFIG)) {
    return { errors: [], warnings: [] };
  }
  
  const content = readFileSync(VITE_CONFIG, "utf-8");
  
  // Check if there are custom plugins with transform hooks
  if (content.includes("transform(") && content.includes("code")) {
    // Look for filter patterns
    const hasFilter = 
      content.includes("include:") ||
      content.includes("exclude:") ||
      content.includes("filter:");
    
    if (!hasFilter) {
      warnings.push({
        message: "Custom transform plugin without filter pattern",
        file: "apps/web/vite.config.ts",
        suggestion: "Add include/exclude patterns to transform plugins to avoid processing unnecessary files"
      });
    }
  }
  
  return { errors: [], warnings };
}

/**
 * Check virtual module patterns
 */
function checkVirtualModules() {
  const warnings = [];
  
  if (!existsSync(VITE_CONFIG)) {
    return { errors: [], warnings: [] };
  }
  
  const content = readFileSync(VITE_CONFIG, "utf-8");
  
  // Check for virtual module patterns
  if (content.includes("resolveId") && content.includes("virtual:")) {
    // Check if virtual modules follow naming convention
    const virtualModules = [...content.matchAll(/["']virtual:([^"']+)["']/g)];
    
    for (const match of virtualModules) {
      const moduleName = match[1];
      
      // Virtual modules should start with resolved ID check
      if (!content.includes(`const resolved = "\\0virtual:${moduleName}"`)) {
        warnings.push({
          message: `Virtual module 'virtual:${moduleName}' may not follow resolution pattern`,
          file: "apps/web/vite.config.ts",
          suggestion: "Virtual modules should use \\0 prefix in resolved ID: const resolved = '\\0virtual:${moduleName}'"
        });
      }
    }
  }
  
  return { errors: [], warnings };
}

/**
 * Check for deprecated plugin patterns
 */
function checkDeprecatedPatterns() {
  const warnings = [];
  
  if (!existsSync(VITE_CONFIG)) {
    return { errors: [], warnings: [] };
  }
  
  const content = readFileSync(VITE_CONFIG, "utf-8");
  
  // Check for deprecated @vitejs/plugin-react-refresh
  if (content.includes("@vitejs/plugin-react-refresh")) {
    warnings.push({
      message: "@vitejs/plugin-react-refresh is deprecated",
      file: "apps/web/vite.config.ts",
      suggestion: "Use @vitejs/plugin-react instead"
    });
  }
  
  // Check for deprecated vite-plugin-react
  if (content.includes("vite-plugin-react") && !content.includes("@vitejs/plugin-react")) {
    warnings.push({
      message: "vite-plugin-react is deprecated",
      file: "apps/web/vite.config.ts",
      suggestion: "Use official @vitejs/plugin-react plugin"
    });
  }
  
  return { errors: [], warnings };
}

/**
 * Check plugin configuration object structure
 */
function checkPluginConfig() {
  const warnings = [];
  
  if (!existsSync(VITE_CONFIG)) {
    return { errors: [], warnings: [] };
  }
  
  const content = readFileSync(VITE_CONFIG, "utf-8");
  
  // Check if plugins use { name, enforce, apply } pattern
  if (content.includes("enforce:")) {
    const enforceMatches = [...content.matchAll(/enforce:\s*["']([^"']+)["']/g)];
    
    for (const match of enforceMatches) {
      const enforceValue = match[1];
      
      if (!["pre", "post"].includes(enforceValue)) {
        warnings.push({
          message: `Invalid enforce value: '${enforceValue}'`,
          file: "apps/web/vite.config.ts",
          suggestion: "enforce must be 'pre' or 'post'"
        });
      }
    }
  }
  
  return { errors: [], warnings };
}

/**
 * Main check function
 */
export default async function check(options = {}) {
  const errors = [];
  const warnings = [];
  
  // Check plugin ordering
  const orderResult = checkPluginOrdering();
  errors.push(...orderResult.errors);
  warnings.push(...orderResult.warnings);
  
  // Check mode guards
  const modeGuardsResult = checkModeGuards();
  errors.push(...modeGuardsResult.errors);
  warnings.push(...modeGuardsResult.warnings);
  
  // Check filter patterns
  const filterResult = checkFilterPatterns();
  errors.push(...filterResult.errors);
  warnings.push(...filterResult.warnings);
  
  // Check virtual modules
  const virtualResult = checkVirtualModules();
  errors.push(...virtualResult.errors);
  warnings.push(...virtualResult.warnings);
  
  // Check deprecated patterns
  const deprecatedResult = checkDeprecatedPatterns();
  errors.push(...deprecatedResult.errors);
  warnings.push(...deprecatedResult.warnings);
  
  // Check plugin configuration
  const configResult = checkPluginConfig();
  errors.push(...configResult.errors);
  warnings.push(...configResult.warnings);
  
  return { errors, warnings };
}
