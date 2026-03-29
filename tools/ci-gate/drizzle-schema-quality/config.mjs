/**
 * Drizzle schema quality gate — discovery config (repo-root relative).
 */
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));

/** Repo root: tools/ci-gate/drizzle-schema-quality → ../../../ */
export const REPO_ROOT = resolve(__dirname, "..", "..", "..");

/** Glob pattern (forward slashes); cwd = REPO_ROOT */
export const SCHEMA_GLOB = "packages/db/src/schema/**/*.ts";

/** Basename starts with underscore → infra, not table modules */
export const IGNORE_BASENAME_PREFIX = "_";

/** Barrel files */
export const IGNORE_BASENAMES = new Set(["index.ts"]);

/**
 * Known stub / pointer files (relative to repo root, posix slashes).
 * Example: HR onboarding lives in operations.ts; this file is documentation-only.
 */
export const EXTRA_IGNORE_RELATIVE = new Set([
  "packages/db/src/schema/hr/onboarding.ts",
]);

/**
 * Schema files under these path prefixes may define tables without per-table RLS helpers
 * (platform tables, auth, metadata, shared reference data).
 * Repo-relative posix paths; must end with `/`.
 */
export const RLS_OPTIONAL_PATH_PREFIXES = [
  "packages/db/src/schema/core/",
  "packages/db/src/schema/security/",
  "packages/db/src/schema/meta/",
  "packages/db/src/schema/reference/",
];

/**
 * @param {string} repoRelativePosix
 */
export function isRlsOptionalPath(repoRelativePosix) {
  return RLS_OPTIONAL_PATH_PREFIXES.some((p) => repoRelativePosix.startsWith(p));
}

/**
 * @param {string} absolutePath
 * @returns {string} posix path relative to repo root
 */
export function toRepoRelative(absolutePath) {
  const rel = absolutePath.slice(REPO_ROOT.length).replace(/^[/\\]/, "");
  return rel.split(/[/\\]/).join("/");
}

/**
 * @param {string} repoRelativePosix
 */
export function shouldIgnoreFile(repoRelativePosix) {
  if (EXTRA_IGNORE_RELATIVE.has(repoRelativePosix)) return true;
  const base = repoRelativePosix.split("/").pop() ?? "";
  if (IGNORE_BASENAMES.has(base)) return true;
  if (base.startsWith(`${IGNORE_BASENAME_PREFIX}`) && base.endsWith(".ts")) return true;
  return false;
}
