/**
 * Isolated synthetic data pass — does not clear canonical seed or touch snapshot.
 * Run after canonical `pnpm --filter @afenda/db seed`. Uses drizzle-seed on an allowlist only.
 *
 * Env: DATABASE_URL (pooled OK). Optional: SEED_SYNTHETIC_COUNT (default 5), SEED_TENANT_ID (default 1).
 */

import { config } from "dotenv";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { seed as drizzleSeed } from "drizzle-seed";

import { db } from "../drizzle/db.js";
import { partnerTags } from "../schema/index.js";
import { DEFAULT_TENANT_ID, SYSTEM_ACTOR_ID } from "./seed-types.js";

const rootEnv = path.resolve(import.meta.dirname, "../../../../.env");
config({ path: rootEnv });

const count = Math.min(500, Math.max(1, Number(process.env.SEED_SYNTHETIC_COUNT ?? "5") || 5));
const tenantId = Number(process.env.SEED_TENANT_ID ?? String(DEFAULT_TENANT_ID)) || DEFAULT_TENANT_ID;

async function main(): Promise<void> {
  console.log(`Synthetic seed: partner_tags × ${count} (tenantId=${tenantId})`);
  await drizzleSeed(db, { partnerTags }, { count, seed: 424242 }).refine((f) => ({
    partnerTags: {
      columns: {
        tenantId: f.int({ minValue: tenantId, maxValue: tenantId }),
        createdBy: f.int({ minValue: SYSTEM_ACTOR_ID, maxValue: SYSTEM_ACTOR_ID }),
        updatedBy: f.int({ minValue: SYSTEM_ACTOR_ID, maxValue: SYSTEM_ACTOR_ID }),
      },
    },
  }));
  console.log("✓ Synthetic seed complete (partner_tags only)");
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((e) => {
    console.error(e);
    process.exitCode = 1;
  });
}

export async function runSyntheticPartnerTagsSeed(
  database: typeof db,
  opts?: { count?: number; tenantId?: number; seed?: number }
): Promise<void> {
  const c = opts?.count ?? count;
  const tid = opts?.tenantId ?? tenantId;
  const s = opts?.seed ?? 424242;
  await drizzleSeed(database, { partnerTags }, { count: c, seed: s }).refine((f) => ({
    partnerTags: {
      columns: {
        tenantId: f.int({ minValue: tid, maxValue: tid }),
        createdBy: f.int({ minValue: SYSTEM_ACTOR_ID, maxValue: SYSTEM_ACTOR_ID }),
        updatedBy: f.int({ minValue: SYSTEM_ACTOR_ID, maxValue: SYSTEM_ACTOR_ID }),
      },
    },
  }));
}
