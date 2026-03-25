/**
 * Schema Registry
 * ===============
 * Thin CRUD layer over the `schema_registry` Postgres table.
 *
 * Responsibilities:
 *  • Store compiled ModelMeta documents as JSONB
 *  • Allow incremental patching (developer overrides on top of compiled base)
 *  • Cache-bust on write (in-memory LRU in prod; simple Map here for clarity)
 */

import { eq } from "drizzle-orm";
import { db } from "../db/index.js";
import { schemaRegistry } from "../db/schema/index.js";
import type { ModelMeta, SchemaRegistryEntry } from "@afenda/meta-types";

// ---------------------------------------------------------------------------
// Simple in-process cache
// ---------------------------------------------------------------------------

const cache = new Map<string, ModelMeta>();

function bust(model: string) {
  cache.delete(model);
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/** Retrieve a ModelMeta from the registry (uses cache). Returns null if unknown. */
export async function getSchema(model: string): Promise<ModelMeta | null> {
  const cached = cache.get(model);
  if (cached) return cached;

  const rows = await db
    .select()
    .from(schemaRegistry)
    .where(eq(schemaRegistry.model, model))
    .limit(1);

  if (!rows.length) return null;

  const meta = rows[0].meta as ModelMeta;
  cache.set(model, meta);
  return meta;
}

/** Insert or replace a ModelMeta for a given model key. */
export async function upsertSchema(
  model: string,
  meta: ModelMeta,
  version?: number
): Promise<void> {
  const existing = await db
    .select({ model: schemaRegistry.model })
    .from(schemaRegistry)
    .where(eq(schemaRegistry.model, model))
    .limit(1);

  if (existing.length) {
    await db
      .update(schemaRegistry)
      .set({ meta, version: version ?? 1 })
      .where(eq(schemaRegistry.model, model));
  } else {
    await db.insert(schemaRegistry).values({
      model,
      meta,
      version: version ?? 1,
    });
  }

  bust(model);
}

/** List all registered model names. */
export async function listModels(): Promise<string[]> {
  const rows = await db
    .select({ model: schemaRegistry.model })
    .from(schemaRegistry);
  return rows.map((r) => r.model);
}

/** Remove a model from the registry (irreversible). */
export async function deleteSchema(model: string): Promise<void> {
  await db.delete(schemaRegistry).where(eq(schemaRegistry.model, model));
  bust(model);
}

/** Retrieve the full registry entry (includes version, timestamps). */
export async function getRegistryEntry(
  model: string
): Promise<SchemaRegistryEntry | null> {
  const rows = await db
    .select()
    .from(schemaRegistry)
    .where(eq(schemaRegistry.model, model))
    .limit(1);

  return rows.length ? (rows[0] as unknown as SchemaRegistryEntry) : null;
}
