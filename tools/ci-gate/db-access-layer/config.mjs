/**
 * db-access-layer — align ERP schema modules with queries/*.access.ts
 */
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));

/** Repo root: tools/ci-gate/db-access-layer → ../../.. */
export const REPO_ROOT = resolve(__dirname, "..", "..", "..");

export const SCHEMA_ROOT = resolve(REPO_ROOT, "packages/db/src/schema");

export const QUERIES_ROOT = resolve(REPO_ROOT, "packages/db/src/queries");

/** ERP domains that require a sibling `.access.ts` per schema module. */
export const ALLOWED_DOMAINS = ["hr", "sales", "inventory", "accounting", "purchasing"];

/** Directory names to skip when walking schema (documentation, etc.). */
export const SKIP_SUBDIRS = new Set(["hr-docs"]);

export const PLACEHOLDER = `// @generated
// Placeholder — run: pnpm ci:gate:db-access:generate
// to emit tenant-safe access functions (or implement manually per ARCHITECTURE.md).

export {};
`;
