/**
 * Side-effect: load `.env` before any module reads `DATABASE_URL` / `DATABASE_URL_MIGRATIONS`.
 *
 * Order: repo root `.env` (pnpm env:sync output), then `packages/db/.env` (mirror, optional overrides).
 * Import as the first line of CLI entrypoints that use DB without going through apps/api dotenv.
 *
 * Paths are resolved from this file’s location (`packages/db/src/env/`), so cwd does not matter.
 */
import path from "node:path";
import { fileURLToPath } from "node:url";
import { config } from "dotenv";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PKG_ROOT = path.resolve(__dirname, "..", "..");
const REPO_ROOT = path.resolve(PKG_ROOT, "..", "..");

config({ path: path.join(REPO_ROOT, ".env"), override: false, quiet: true });
config({ path: path.join(PKG_ROOT, ".env"), override: true, quiet: true });
