import { readFileSync } from "node:fs";

import { extractSchema } from "../postgres-schema/extractors/drizzle-schema.mjs";
import { extractExportedTables } from "./extract-tables.mjs";

/**
 * @param {string} s
 */
function cap(s) {
  if (!s) return s;
  return s[0].toUpperCase() + s.slice(1);
}

/**
 * @param {{ symbol: string; sqlName: string; hasTenant: boolean; hasId: boolean; hasSoftDelete: boolean }} t
 * @returns {string[]}
 */
function emitTableFunctions(t) {
  const { symbol, hasTenant, hasId, hasSoftDelete } = t;
  const S = cap(symbol);
  const lines = [];

  if (hasTenant && hasId && hasSoftDelete) {
    lines.push(`
/** Safe by ID: tenant + not soft-deleted. */
export async function get${S}ByIdSafe(
  db: Database,
  tenantId: (typeof ${symbol}.$inferSelect)["tenantId"],
  id: (typeof ${symbol}.$inferSelect)["id"],
) {
  const rows = await db
    .select()
    .from(${symbol})
    .where(
      and(
        eq(${symbol}.tenantId, tenantId),
        eq(${symbol}.id, id),
        isNull(${symbol}.deletedAt),
      ),
    )
    .limit(1);
  return rows[0] ?? null;
}

/** Same as get${S}ByIdSafe; asserts graph-validation policy when GRAPH_VALIDATION_POLICY_JSON is set. */
export async function get${S}ByIdSafeGuarded(
  db: Database,
  tenantId: (typeof ${symbol}.$inferSelect)["tenantId"],
  id: (typeof ${symbol}.$inferSelect)["id"],
) {
  await assertGraphGuardrailAllowsRead();
  return get${S}ByIdSafe(db, tenantId, id);
}

/** List rows for tenant excluding soft-deleted. */
export async function list${S}Active(
  db: Database,
  tenantId: (typeof ${symbol}.$inferSelect)["tenantId"],
) {
  return await db
    .select()
    .from(${symbol})
    .where(and(eq(${symbol}.tenantId, tenantId), isNull(${symbol}.deletedAt)));
}

export async function list${S}ActiveGuarded(
  db: Database,
  tenantId: (typeof ${symbol}.$inferSelect)["tenantId"],
) {
  await assertGraphGuardrailAllowsRead();
  return list${S}Active(db, tenantId);
}

/** List all rows for tenant including soft-deleted. */
export async function list${S}All(
  db: Database,
  tenantId: (typeof ${symbol}.$inferSelect)["tenantId"],
) {
  return await db.select().from(${symbol}).where(eq(${symbol}.tenantId, tenantId));
}

export async function list${S}AllGuarded(
  db: Database,
  tenantId: (typeof ${symbol}.$inferSelect)["tenantId"],
) {
  await assertGraphGuardrailAllowsRead();
  return list${S}All(db, tenantId);
}

/** Soft-archive (mechanical delete flag). */
export async function archive${S}(
  db: Database,
  tenantId: (typeof ${symbol}.$inferSelect)["tenantId"],
  id: (typeof ${symbol}.$inferSelect)["id"],
) {
  return await db
    .update(${symbol})
    .set({ deletedAt: new Date() })
    .where(and(eq(${symbol}.tenantId, tenantId), eq(${symbol}.id, id)));
}

export async function archive${S}Guarded(
  db: Database,
  tenantId: (typeof ${symbol}.$inferSelect)["tenantId"],
  id: (typeof ${symbol}.$inferSelect)["id"],
) {
  await assertGraphGuardrailAllowsRead();
  return archive${S}(db, tenantId, id);
}
`);
  } else if (hasTenant && hasId) {
    lines.push(`
/** By ID for tenant (no soft-delete column on table). */
export async function get${S}ById(
  db: Database,
  tenantId: (typeof ${symbol}.$inferSelect)["tenantId"],
  id: (typeof ${symbol}.$inferSelect)["id"],
) {
  const rows = await db
    .select()
    .from(${symbol})
    .where(and(eq(${symbol}.tenantId, tenantId), eq(${symbol}.id, id)))
    .limit(1);
  return rows[0] ?? null;
}

export async function get${S}ByIdGuarded(
  db: Database,
  tenantId: (typeof ${symbol}.$inferSelect)["tenantId"],
  id: (typeof ${symbol}.$inferSelect)["id"],
) {
  await assertGraphGuardrailAllowsRead();
  return get${S}ById(db, tenantId, id);
}

/** List rows for tenant. */
export async function list${S}(
  db: Database,
  tenantId: (typeof ${symbol}.$inferSelect)["tenantId"],
) {
  return await db.select().from(${symbol}).where(eq(${symbol}.tenantId, tenantId));
}

export async function list${S}Guarded(
  db: Database,
  tenantId: (typeof ${symbol}.$inferSelect)["tenantId"],
) {
  await assertGraphGuardrailAllowsRead();
  return list${S}(db, tenantId);
}
`);
  } else if (hasTenant) {
    lines.push(`
/** List rows for tenant. */
export async function list${S}(
  db: Database,
  tenantId: (typeof ${symbol}.$inferSelect)["tenantId"],
) {
  return await db.select().from(${symbol}).where(eq(${symbol}.tenantId, tenantId));
}

export async function list${S}Guarded(
  db: Database,
  tenantId: (typeof ${symbol}.$inferSelect)["tenantId"],
) {
  await assertGraphGuardrailAllowsRead();
  return list${S}(db, tenantId);
}
`);
  }

  return lines;
}

/**
 * @param {{ domain: string; basename: string; absolutePath: string }} mod
 * @returns {string}
 */
export function emitAccessModuleSource(mod) {
  const source = readFileSync(mod.absolutePath, "utf8");
  const pairs = extractExportedTables(source);
  const model = extractSchema(mod.absolutePath, { silent: true });

  /** @type {Array<{ symbol: string; sqlName: string; hasTenant: boolean; hasId: boolean; hasSoftDelete: boolean }>} */
  const tables = [];

  for (const { symbol, sqlName } of pairs) {
    const t = model.tables[sqlName];
    if (!t || t._parseError) continue;
    const cols = t.columns || [];
    const hasTenant = cols.includes("tenant_id");
    const hasId = cols.includes("id");
    const hasSoftDelete = Boolean(t.hasSoftDeleteColumns);
    if (!hasTenant && !hasId) continue;
    tables.push({ symbol, sqlName, hasTenant, hasId, hasSoftDelete });
  }

  if (tables.length === 0) {
    return `// @generated
// No extractable tables with tenant_id and/or id — extend manually if needed.

export {};
`;
  }

  const symbols = [...new Set(tables.map((x) => x.symbol))].sort();
  const importList = symbols.join(",\n  ");

  const body = tables.flatMap((t) => emitTableFunctions(t)).join("\n");

  return `// @generated
// Full access scaffold — tools/ci-gate/db-access-layer (emit-full).
// Human-owned reporting: use separate modules (not *.access.ts).
// Drizzle: prefer db.select here; use relational Queries API (db.query) only in app/report modules — see queries/ARCHITECTURE.md.

import { and, eq, isNull } from "drizzle-orm";
import type { Database } from "../../drizzle/db.js";
import { assertGraphGuardrailAllowsRead } from "../_shared/graph-guardrail.js";
import {
  ${importList},
} from "../../schema/${mod.domain}/${mod.basename}.js";
${body}
`;
}
