/**
 * Assert seed contract only (DB must already match a full baseline seed).
 * Usage: DATABASE_URL=... pnpm --filter @afenda/db exec tsx src/seeds/assert-contract-cli.ts
 */

import { config } from "dotenv";
import path from "node:path";
import { pathToFileURL } from "node:url";

import { db } from "../drizzle/db.js";
import { assertSeedContract } from "./assert-seed-contract.js";
import { DEFAULT_TENANT_ID } from "./seed-types.js";

const rootEnv = path.resolve(import.meta.dirname, "../../../../.env");
config({ path: rootEnv });

async function main(): Promise<void> {
  const tenantId = Number(process.env.SEED_CONTRACT_TENANT_ID ?? String(DEFAULT_TENANT_ID));
  await assertSeedContract(db, { tenantId });
  console.log("✓ assertSeedContract passed");
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((e) => {
    console.error(e);
    process.exitCode = 1;
  });
}
