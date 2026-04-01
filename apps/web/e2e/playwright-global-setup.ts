/**
 * Playwright global setup — fail-closed DB gate: migrate + canonical seed (includes contract assert).
 * Set E2E_SKIP_SEED_GATE=1 to skip. Requires DATABASE_URL (direct URL recommended for migrate + seed).
 */

import { execSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

export default async function playwrightGlobalSetup(): Promise<void> {
  if (process.env.E2E_SKIP_SEED_GATE === "1") {
    console.log("[e2e] E2E_SKIP_SEED_GATE=1 — skipping migrate/seed gate");
    return;
  }

  const dbUrl = process.env.DATABASE_URL_MIGRATIONS ?? process.env.DATABASE_URL;
  if (!dbUrl) {
    console.warn(
      "[e2e] DATABASE_URL / DATABASE_URL_MIGRATIONS not set — skipping migrate/seed gate (set E2E_SKIP_SEED_GATE=1 to silence)"
    );
    return;
  }

  const here = path.dirname(fileURLToPath(import.meta.url));
  const repoRoot = path.resolve(here, "../..");
  const env = { ...process.env, FORCE_COLOR: "0" };

  console.log("[e2e] db:migrate …");
  execSync("pnpm --filter @afenda/db db:migrate", { cwd: repoRoot, stdio: "inherit", env });

  console.log("[e2e] db:seed (baseline + contract) …");
  execSync("pnpm --filter @afenda/db db:seed -- --scenario=baseline", {
    cwd: repoRoot,
    stdio: "inherit",
    env,
  });
}
