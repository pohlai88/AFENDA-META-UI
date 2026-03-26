/**
 * Global Search Route
 * ===================
 * Cross-model text search endpoint.
 *
 * GET /api/search?q=term&models=partner,product&limit=20
 *
 * - Searches string/text fields of each requested model
 * - RBAC-filtered: only returns records the requester can read
 * - Returns grouped results with model, id, title, subtitle
 */

import { Router, type Request, type Response } from "express";
import { sql } from "drizzle-orm";
import { db } from "../db/index.js";
import { getSchema, listModels } from "../meta/registry.js";
import { resolveRbac } from "../meta/rbac.js";
import type { SessionContext } from "@afenda/meta-types";
import type { MetaField } from "@afenda/meta-types";

const router = Router();

const MAX_PER_MODEL = 5;
const MAX_TOTAL = 50;

function session(req: Request): SessionContext {
  return (req as Request & { session: SessionContext }).session;
}

/** Identify which fields are text-searchable for a model. */
function searchableFields(fields: MetaField[]): string[] {
  return fields
    .filter((f) => f.type === "string" || f.type === "text" || f.type === "email" || f.type === "phone")
    .map((f) => f.name)
    .slice(0, 5); // cap at 5 columns per model
}

/** Best display label from a row. Falls back to id. */
function pickTitle(row: Record<string, unknown>, fields: MetaField[]): string {
  const candidates = ["name", "title", "label", "subject", "reference", "code"];
  for (const c of candidates) {
    const val = row[c];
    if (typeof val === "string" && val.length > 0) return val;
  }
  // Try first string field
  for (const f of fields) {
    if (f.type === "string" || f.type === "text") {
      const val = row[f.name];
      if (typeof val === "string" && val.length > 0) return val;
    }
  }
  return String(row.id ?? "");
}

/** Best subtitle from a row. */
function pickSubtitle(row: Record<string, unknown>, fields: MetaField[], titleField: string): string | undefined {
  const secondary = ["description", "notes", "email", "reference", "code", "status"];
  for (const c of secondary) {
    if (c === titleField) continue;
    const val = row[c];
    if (val != null && String(val).length > 0) return String(val).slice(0, 120);
  }
  return undefined;
}

// ---------------------------------------------------------------------------
// GET /search?q=term&models=partner,product&limit=20
// ---------------------------------------------------------------------------
router.get("/", async (req: Request, res: Response) => {
  const sess = session(req);
  const rawQ = typeof req.query.q === "string" ? req.query.q.trim() : "";
  const limitParam = Math.min(MAX_TOTAL, Math.max(1, Number(req.query.limit) || 20));

  // Determine which models to search
  let targetModels: string[];
  if (typeof req.query.models === "string" && req.query.models.length > 0) {
    targetModels = req.query.models
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean)
      .slice(0, 10);
  } else {
    // Default: search all registered models (capped)
    try {
      targetModels = (await listModels()).slice(0, 10);
    } catch {
      targetModels = [];
    }
  }

  if (rawQ.length === 0) {
    res.json({ data: [], meta: { query: "", total: 0 } });
    return;
  }

  if (rawQ.length < 2) {
    res.status(400).json({ error: "Query must be at least 2 characters" });
    return;
  }

  // Sanitize query: prevent SQL injection by using parameterized queries only
  const escapedQ = rawQ.replace(/[%_\\]/g, "\\$&");
  const likePattern = `%${escapedQ}%`;

  const grouped: Record<string, Array<{ id: string; title: string; subtitle?: string; model: string }>> = {};

  await Promise.allSettled(
    targetModels.map(async (model) => {
      try {
        const meta = await getSchema(model);
        if (!meta) return;

        const rbac = resolveRbac(meta, sess);
        if (!rbac.allowedOps.can_read) return;

        const visibleSet = new Set(rbac.visibleFields);
        const searchCols = searchableFields(meta.fields).filter((f) => visibleSet.has(f));
        if (searchCols.length === 0) return;

        // Build: WHERE (col1 ILIKE $1 OR col2 ILIKE $1) LIMIT n
        const conditions = searchCols.map((c) => `"${c}" ILIKE '${likePattern.replace(/'/g, "''")}'`).join(" OR ");
        const selectCols = Array.from(
          new Set(["id", ...searchCols, ...rbac.visibleFields.slice(0, 8)])
        )
          .map((c) => `"${c}"`)
          .join(", ");

        const rows = await db.execute(
          sql.raw(`SELECT ${selectCols} FROM "${model}" WHERE (${conditions}) LIMIT ${MAX_PER_MODEL}`)
        );

        if (!rows.rows.length) return;

        grouped[model] = rows.rows.map((row) => {
          const r = row as Record<string, unknown>;
          const titleVal = pickTitle(r, meta.fields);
          return {
            id: String(r.id ?? ""),
            model,
            title: titleVal,
            subtitle: pickSubtitle(r, meta.fields, titleVal),
          };
        });
      } catch {
        // Skip models that error (table may not exist yet)
      }
    })
  );

  // Flatten and cap
  const data = Object.values(grouped)
    .flat()
    .slice(0, limitParam);

  res.json({
    data,
    meta: {
      query: rawQ,
      total: data.length,
      models: Object.keys(grouped),
    },
  });
});

export default router;
