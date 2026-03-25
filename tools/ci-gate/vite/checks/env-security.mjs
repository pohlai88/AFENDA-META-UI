/**
 * Environment Security Check
 * ===========================
 * Validates that no secrets are exposed via VITE_* environment variables.
 * 
 * Industry Best Practice:
 *   All VITE_* variables are inlined at build time and visible in the browser.
 *   Never use VITE_* prefix for secrets, tokens, or credentials.
 * 
 * Validates:
 *  - No secrets in .env files with VITE_ prefix
 *  - No API keys/tokens in VITE_ variables
 *  - Proper .env.*.local gitignore
 *  - Type definitions exist for env variables
 */

import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

const WORKSPACE_ROOT = join(import.meta.dirname, "../../../..");
const WEB_APP = join(WORKSPACE_ROOT, "apps/web");

// Patterns that indicate secrets (case-insensitive)
const SECRET_PATTERNS = [
  /secret/i,
  /password/i,
  /private[_-]?key/i,
  /api[_-]?key/i,
  /access[_-]?token/i,
  /auth[_-]?token/i,
  /bearer/i,
  /credential/i,
  /database[_-]?url/i,
  /db[_-]?connection/i,
];

// Allowed public variables (PostHog API key is intentionally public)
const ALLOWED_PUBLIC_VARS = [
  "VITE_POSTHOG_API_KEY",  // PostHog project keys are public by design
  "VITE_POSTHOG_HOST",
  "VITE_APP_TITLE",
  "VITE_APP_ENV",
  "VITE_API_URL",
  "VITE_ANALYTICS_PROVIDERS",
  "VITE_ANALYTICS_BATCH_SIZE",
  "VITE_ANALYTICS_FLUSH_INTERVAL_MS",
  "VITE_NOTIFICATION_TOAST_DEDUPE_MS",
  "VITE_PERMISSIONS_BOOTSTRAP_ENDPOINT",
];

/**
 * Check .env files for secret patterns in VITE_* variables
 */
function checkEnvFiles() {
  const errors = [];
  const warnings = [];
  
  // Find all .env* files in web app
  const envFiles = readdirSync(WEB_APP).filter(f => 
    f.startsWith(".env") && !f.endsWith(".example")
  );
  
  for (const envFile of envFiles) {
    const filePath = join(WEB_APP, envFile);
    const content = readFileSync(filePath, "utf-8");
    const lines = content.split("\n");
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      // Skip comments and empty lines
      if (!line || line.startsWith("#")) continue;
      
      // Match VITE_* variables
      const match = line.match(/^(VITE_[A-Z_]+)\s*=/);
      if (!match) continue;
      
      const varName = match[1];
      
      // Skip if in allowed list
      if (ALLOWED_PUBLIC_VARS.includes(varName)) continue;
      
      // Check if variable name contains secret patterns
      const hasSecretPattern = SECRET_PATTERNS.some(pattern => pattern.test(varName));
      
      if (hasSecretPattern) {
        errors.push({
          message: `Potential secret in public variable: ${varName}`,
          file: `apps/web/${envFile}:${i + 1}`,
          suggestion: `Remove VITE_ prefix. All VITE_* variables are public and inlined in the browser bundle.`
        });
      }
      
      // Check if value looks like a secret (long random strings, tokens)
      const value = line.split("=")[1]?.trim().replace(/['"]/g, "");
      if (value && value.length > 32 && /^[A-Za-z0-9+/=_-]{32,}$/.test(value)) {
        warnings.push({
          message: `${varName} contains a long token-like value`,
          file: `apps/web/${envFile}:${i + 1}`,
          suggestion: "Verify this is intentionally public. If not, remove VITE_ prefix and access server-side only."
        });
      }
    }
  }
  
  return { errors, warnings };
}

/**
 * Check that .env.*.local is gitignored
 */
function checkGitignore() {
  const errors = [];
  const gitignorePath = join(WORKSPACE_ROOT, ".gitignore");
  
  if (!existsSync(gitignorePath)) {
    errors.push({
      message: ".gitignore not found",
      file: ".gitignore",
      suggestion: "Create .gitignore with .env.* pattern"
    });
    return { errors, warnings: [] };
  }
  
  const gitignore = readFileSync(gitignorePath, "utf-8");
  
  // Check for .env.* or .env.*.local pattern
  if (!gitignore.includes(".env.*") && !gitignore.includes(".env.*.local")) {
    errors.push({
      message: ".env files not properly gitignored",
      file: ".gitignore",
      suggestion: "Add '.env.*' and '!.env.example' to .gitignore"
    });
  }
  
  return { errors, warnings: [] };
}

/**
 * Check that vite-env.d.ts exists with proper types
 */
function checkEnvTypes() {
  const warnings = [];
  const envDtsPath = join(WEB_APP, "src/vite-env.d.ts");
  
  if (!existsSync(envDtsPath)) {
    warnings.push({
      message: "vite-env.d.ts not found",
      file: "apps/web/src/vite-env.d.ts",
      suggestion: "Create type definitions for environment variables for better IntelliSense"
    });
    return { errors: [], warnings };
  }
  
  const content = readFileSync(envDtsPath, "utf-8");
  
  // Check if ImportMetaEnv interface is defined
  if (!content.includes("interface ImportMetaEnv")) {
    warnings.push({
      message: "ImportMetaEnv interface not defined in vite-env.d.ts",
      file: "apps/web/src/vite-env.d.ts",
      suggestion: "Define environment variable types for better type safety"
    });
  }
  
  return { errors: [], warnings };
}

/**
 * Check vite.config.ts for loadEnv usage
 */
function checkLoadEnvUsage() {
  const warnings = [];
  const viteConfigPath = join(WEB_APP, "vite.config.ts");
  
  if (!existsSync(viteConfigPath)) {
    return { errors: [], warnings: [] };
  }
  
  const content = readFileSync(viteConfigPath, "utf-8");
  
  // Check if loadEnv is used
  if (content.includes("loadEnv(")) {
    // Check if it's used with empty prefix (exposes all vars)
    const loadEnvMatch = content.match(/loadEnv\([^)]+\)/);
    if (loadEnvMatch && loadEnvMatch[0].includes('""') && loadEnvMatch[0].includes("process.cwd()")) {
      warnings.push({
        message: "loadEnv used with empty prefix exposes all environment variables",
        file: "apps/web/vite.config.ts",
        suggestion: "Use loadEnv with 'VITE' prefix unless you specifically need access to non-VITE vars at config-time"
      });
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
  
  // Check .env files for secrets
  const envResult = checkEnvFiles();
  errors.push(...envResult.errors);
  warnings.push(...envResult.warnings);
  
  // Check gitignore
  const gitignoreResult = checkGitignore();
  errors.push(...gitignoreResult.errors);
  warnings.push(...gitignoreResult.warnings);
  
  // Check env types
  const typesResult = checkEnvTypes();
  errors.push(...typesResult.errors);
  warnings.push(...typesResult.warnings);
  
  // Check loadEnv usage
  const loadEnvResult = checkLoadEnvUsage();
  errors.push(...loadEnvResult.errors);
  warnings.push(...loadEnvResult.warnings);
  
  return { errors, warnings };
}
