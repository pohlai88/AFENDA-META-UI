import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { calcLineSubtotal, calcOrderTotals, money } from "./money.js";
import { SEED_IDS } from "./seed-ids.js";

/**
 * Generates a deterministic SHA-256 hash of the canonical seed definition.
 * Hashes SEED_IDS + monetary computation results — no DB required.
 * Committed as seed.snapshot; CI recomputes and compares.
 * Any unintentional change to UUIDs, prices, or quantities will alter the hash.
 */
export function generateSeedHash(): string {
  const l1 = calcLineSubtotal(2, 599.99, 10.0);
  const l2 = calcLineSubtotal(2, 29.99, 0);
  const l3 = calcLineSubtotal(1, 149.99, 0);
  const l4 = calcLineSubtotal(1, 1299.99, 0);
  const l5 = calcLineSubtotal(2, 1899.99, 50.0);
  const l6 = calcLineSubtotal(1, 4999.99, 0);

  const o1 = calcOrderTotals([l1, l2, l3]);
  const o2 = calcOrderTotals([l4]);
  const o3 = calcOrderTotals([l5, l6]);

  const manifest = {
    version: 1,
    ids: SEED_IDS,
    computedTotals: {
      lines: [money(l1), money(l2), money(l3), money(l4), money(l5), money(l6)],
      orders: [
        { amountUntaxed: o1.amountUntaxed, amountTax: o1.amountTax, amountTotal: o1.amountTotal },
        { amountUntaxed: o2.amountUntaxed, amountTax: o2.amountTax, amountTotal: o2.amountTotal },
        { amountUntaxed: o3.amountUntaxed, amountTax: o3.amountTax, amountTotal: o3.amountTotal },
      ],
    },
  };

  return crypto.createHash("sha256").update(JSON.stringify(manifest)).digest("hex");
}

export async function saveSnapshot(hash: string): Promise<void> {
  const dir = path.dirname(fileURLToPath(import.meta.url));
  const snapshotPath = path.resolve(dir, "../../..", "seed.snapshot");
  await fs.writeFile(snapshotPath, hash + "\n", "utf8");
  console.log(`✓ Snapshot saved: ${hash.slice(0, 12)}... → seed.snapshot`);
}

export async function verifySnapshot(hash: string): Promise<void> {
  const dir = path.dirname(fileURLToPath(import.meta.url));
  const snapshotPath = path.resolve(dir, "../../..", "seed.snapshot");

  try {
    const committed = (await fs.readFile(snapshotPath, "utf8")).trim();
    if (committed !== hash) {
      console.error("❌ Snapshot mismatch — seed definition has drifted from committed snapshot");
      console.error(`   Committed: ${committed.slice(0, 12)}...`);
      console.error(`   Computed:  ${hash.slice(0, 12)}...`);
      console.error("   Run 'pnpm seed' to regenerate seed.snapshot, then commit it.");
      process.exitCode = 1;
    } else {
      console.log(`✓ Snapshot verified: hash matches committed snapshot`);
    }
  } catch {
    // No snapshot file yet — create it on first run
    await saveSnapshot(hash);
  }
}
