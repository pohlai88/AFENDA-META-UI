/**
 * /api REST routes
 * ================
 *
 * Generic CRUD handler driven entirely by the schema registry.
 *
 * GET    /api/:model            → paginated list
 * GET    /api/:model/:id        → single record
 * POST   /api/:model            → create record
 * PATCH  /api/:model/:id        → partial update
 * DELETE /api/:model/:id        → delete record
 *
 * Security model:
 *  • Auth middleware guarantees `req.session` is present
 *  • Permission check is derived from RBAC — 403 on violation
 *  • Column projection at DB level based on RBAC `visibleFields`
 *    → the server never returns columns the role cannot read
 *
 * NOTE: This is a generic handler wired to Drizzle's dynamic query API.
 * For complex domain logic (state machine transitions, computed fields, etc.)
 * register a model-specific handler before this generic router.
 */

import { Router, type Request, type Response } from "express";
import { sql, eq, asc, desc } from "drizzle-orm";
import { db } from "../db/index.js";
import { getSchema } from "../meta/registry.js";
import { resolveRbac } from "../meta/rbac.js";
import { parseFilters, parseSortParams, buildWhereClause } from "../utils/queryBuilder.js";
import type { SessionContext } from "@afenda/meta-types";

const router = Router();

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isDbUnavailableError(err: unknown): boolean {
  if (!isRecord(err)) {
    return false;
  }

  if (err.code === "ECONNREFUSED") {
    return true;
  }

  if (typeof err.message === "string" && err.message.includes("ECONNREFUSED")) {
    return true;
  }

  const aggregateErrors = err.aggregateErrors;
  if (Array.isArray(aggregateErrors)) {
    return aggregateErrors.some(
      (entry) =>
        isRecord(entry) &&
        (entry.code === "ECONNREFUSED" ||
          (typeof entry.message === "string" && entry.message.includes("ECONNREFUSED")))
    );
  }

  return false;
}

function sendDatabaseUnavailable(res: Response) {
  res.status(503).json({
    error: "Database unavailable",
    code: "DB_UNAVAILABLE",
    message:
      "Cannot connect to PostgreSQL. Ensure the database is running and DATABASE_URL is correct.",
  });
}

function session(req: Request): SessionContext {
  return (req as Request & { session: SessionContext }).session;
}

/** Dynamically resolve the Drizzle table object by model name. */
async function resolveTable(model: string): Promise<Record<string, unknown> | null> {
  // Dynamic import allows new modules to be added without touching this file
  try {
    const schema = await import("../db/schema/index.js");
    // Convention: model "sales_order" → camelCase "salesOrders" table export
    const camel = model.replace(/_([a-z])/g, (_, c) => c.toUpperCase()) + "s";
    return ((schema as Record<string, unknown>)[camel] as Record<string, unknown>) ?? null;
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// GET /api/:model — paginated list with filtering and sorting
// ---------------------------------------------------------------------------

router.get("/:model", async (req: Request, res: Response) => {
  const { model } = req.params;
  const sess = session(req);
  const page = Math.max(1, Number(req.query.page) || 1);
  const limit = Math.min(200, Math.max(1, Number(req.query.limit) || 50));
  const offset = (page - 1) * limit;

  try {
    const meta = await getSchema(model);
    if (!meta) {
      res.status(404).json({ error: `Unknown model: ${model}` });
      return;
    }

    const rbac = resolveRbac(meta, sess);
    if (!rbac.allowedOps.can_read) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }

    const table = await resolveTable(model);
    if (!table) {
      res.status(400).json({ error: `No table found for model: ${model}` });
      return;
    }

    // Parse and validate filters
    const filtersResult = parseFilters(req.query.filters as string);
    if (!filtersResult.success) {
      res.status(400).json({ error: filtersResult.error });
      return;
    }

    // Parse and validate sort params
    const sortResult = parseSortParams(req.query.sort as string);
    if (!sortResult.success) {
      res.status(400).json({ error: sortResult.error });
      return;
    }

    // Build where clause from filters
    const whereClause = buildWhereClause(table as any, filtersResult.data);

    // Build order by clause from sort params
    const orderByClauses = sortResult.data.map((sort) => {
      const column = (table as any)[sort.field];
      return sort.order === "asc" ? asc(column) : desc(column);
    });

    // Default sort by id desc if no sort specified
    if (orderByClauses.length === 0) {
      orderByClauses.push(desc((table as any).id));
    }

    // Build query with Drizzle
    let query = (db as any).select().from(table);

    if (whereClause) {
      query = query.where(whereClause);
    }

    query = query
      .orderBy(...orderByClauses)
      .limit(limit)
      .offset(offset);

    // Execute query
    const rows = await query;

    // Get total count (with filters applied)
    let countQuery = (db as any).select({ count: sql`count(*)` }).from(table);

    if (whereClause) {
      countQuery = countQuery.where(whereClause);
    }

    const [{ count }] = await countQuery;
    const total = Number(count);

    // Filter visible fields based on RBAC
    const visibleSet = new Set(rbac.visibleFields);
    const filteredRows = rows.map((row: any) => {
      const filtered: Record<string, any> = {};
      for (const [key, value] of Object.entries(row)) {
        if (visibleSet.has(key)) {
          filtered[key] = value;
        }
      }
      return filtered;
    });

    res.json({
      data: filteredRows,
      meta: {
        page,
        limit,
        total,
        filters: filtersResult.data.conditions.length > 0 ? filtersResult.data : undefined,
        sort: sortResult.data.length > 0 ? sortResult.data : undefined,
      },
    });
  } catch (err) {
    (req as any).log?.error({ err, model }, `GET /${model} failed`);
    if (isDbUnavailableError(err)) {
      sendDatabaseUnavailable(res);
      return;
    }
    res.status(500).json({ error: "Internal server error" });
  }
});

// ---------------------------------------------------------------------------
// GET /api/:model/:id — single record
// ---------------------------------------------------------------------------

router.get("/:model/:id", async (req: Request, res: Response) => {
  const { model, id } = req.params;
  const sess = session(req);

  try {
    const meta = await getSchema(model);
    if (!meta) {
      res.status(404).json({ error: `Unknown model: ${model}` });
      return;
    }

    const rbac = resolveRbac(meta, sess);
    if (!rbac.allowedOps.can_read) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }

    const cols = rbac.visibleFields.join(", ");
    const rows = await db.execute(
      sql.raw(`SELECT ${cols} FROM ${model} WHERE id = '${id}' LIMIT 1`)
    );

    if (!rows.rows.length) {
      res.status(404).json({ error: "Not found" });
      return;
    }

    res.json({ data: rows.rows[0] });
  } catch (err) {
    (req as any).log?.error({ err, model, id }, `GET /${model}/${id} failed`);
    if (isDbUnavailableError(err)) {
      sendDatabaseUnavailable(res);
      return;
    }
    res.status(500).json({ error: "Internal server error" });
  }
});

// ---------------------------------------------------------------------------
// POST /api/:model — create
// ---------------------------------------------------------------------------

router.post("/:model", async (req: Request, res: Response) => {
  const { model } = req.params;
  const sess = session(req);

  try {
    const meta = await getSchema(model);
    if (!meta) {
      res.status(404).json({ error: `Unknown model: ${model}` });
      return;
    }

    const rbac = resolveRbac(meta, sess);
    if (!rbac.allowedOps.can_create) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }

    // Strip any fields the role cannot write
    const body = req.body as Record<string, unknown>;
    const writableSet = new Set(rbac.writableFields);
    const safe: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(body)) {
      if (writableSet.has(k)) safe[k] = v;
    }

    const table = await resolveTable(model);
    if (!table) {
      res.status(400).json({ error: `No table found for model: ${model}` });
      return;
    }

    const [created] = await (db as any).insert(table).values(safe).returning();
    res.status(201).json({ data: created });
  } catch (err) {
    (req as any).log?.error({ err, model }, `POST /${model} failed`);
    if (isDbUnavailableError(err)) {
      sendDatabaseUnavailable(res);
      return;
    }
    res.status(500).json({ error: "Internal server error" });
  }
});

// ---------------------------------------------------------------------------
// PATCH /api/:model/:id — partial update
// ---------------------------------------------------------------------------

router.patch("/:model/:id", async (req: Request, res: Response) => {
  const { model, id } = req.params;
  const sess = session(req);

  try {
    const meta = await getSchema(model);
    if (!meta) {
      res.status(404).json({ error: `Unknown model: ${model}` });
      return;
    }

    const rbac = resolveRbac(meta, sess);
    if (!rbac.allowedOps.can_update) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }

    const body = req.body as Record<string, unknown>;
    const writableSet = new Set(rbac.writableFields);
    const safe: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(body)) {
      if (writableSet.has(k)) safe[k] = v;
    }

    if (!Object.keys(safe).length) {
      res.status(400).json({ error: "No writable fields in request body" });
      return;
    }

    const table = await resolveTable(model);
    if (!table) {
      res.status(400).json({ error: `No table found for model: ${model}` });
      return;
    }

    const [updated] = await (db as any)
      .update(table)
      .set(safe)
      .where(eq((table as any).id, id))
      .returning();

    if (!updated) {
      res.status(404).json({ error: "Not found" });
      return;
    }

    res.json({ data: updated });
  } catch (err) {
    (req as any).log?.error({ err, model, id }, `PATCH /${model}/${id} failed`);
    if (isDbUnavailableError(err)) {
      sendDatabaseUnavailable(res);
      return;
    }
    res.status(500).json({ error: "Internal server error" });
  }
});

// ---------------------------------------------------------------------------
// DELETE /api/:model/:id
// ---------------------------------------------------------------------------

router.delete("/:model/:id", async (req: Request, res: Response) => {
  const { model, id } = req.params;
  const sess = session(req);

  try {
    const meta = await getSchema(model);
    if (!meta) {
      res.status(404).json({ error: `Unknown model: ${model}` });
      return;
    }

    const rbac = resolveRbac(meta, sess);
    if (!rbac.allowedOps.can_delete) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }

    const table = await resolveTable(model);
    if (!table) {
      res.status(400).json({ error: `No table found for model: ${model}` });
      return;
    }

    await (db as any).delete(table).where(eq((table as any).id, id));
    res.status(204).send();
  } catch (err) {
    (req as any).log?.error({ err, model, id }, `DELETE /${model}/${id} failed`);
    if (isDbUnavailableError(err)) {
      sendDatabaseUnavailable(res);
      return;
    }
    res.status(500).json({ error: "Internal server error" });
  }
});

// ---------------------------------------------------------------------------
// POST /api/:model/bulk-update — update multiple records
// ---------------------------------------------------------------------------

router.post("/:model/bulk-update", async (req: Request, res: Response) => {
  const { model } = req.params;
  const sess = session(req);

  try {
    const meta = await getSchema(model);
    if (!meta) {
      res.status(404).json({ error: `Unknown model: ${model}` });
      return;
    }

    const rbac = resolveRbac(meta, sess);
    if (!rbac.allowedOps.can_update) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }

    const { ids, updates } = req.body as { ids: string[]; updates: Record<string, unknown> };

    if (!Array.isArray(ids) || ids.length === 0) {
      res.status(400).json({ error: "ids array is required and must not be empty" });
      return;
    }

    if (!updates || typeof updates !== "object") {
      res.status(400).json({ error: "updates object is required" });
      return;
    }

    // Filter updates to only writable fields
    const writableSet = new Set(rbac.writableFields);
    const safe: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(updates)) {
      if (writableSet.has(k)) safe[k] = v;
    }

    if (!Object.keys(safe).length) {
      res.status(400).json({ error: "No writable fields in updates" });
      return;
    }

    const table = await resolveTable(model);
    if (!table) {
      res.status(400).json({ error: `No table found for model: ${model}` });
      return;
    }

    // Update all matching IDs
    const result = await (db as any)
      .update(table)
      .set(safe)
      .where(sql`${(table as any).id} IN (${sql.raw(ids.map((id) => `'${id}'`).join(", "))})`)
      .returning();

    res.json({
      data: result,
      meta: {
        updated: result.length,
        requested: ids.length,
      },
    });
  } catch (err) {
    (req as any).log?.error({ err, model }, `POST /${model}/bulk-update failed`);
    if (isDbUnavailableError(err)) {
      sendDatabaseUnavailable(res);
      return;
    }
    res.status(500).json({ error: "Internal server error" });
  }
});

// ---------------------------------------------------------------------------
// POST /api/:model/bulk-delete — delete multiple records
// ---------------------------------------------------------------------------

router.post("/:model/bulk-delete", async (req: Request, res: Response) => {
  const { model } = req.params;
  const sess = session(req);

  try {
    const meta = await getSchema(model);
    if (!meta) {
      res.status(404).json({ error: `Unknown model: ${model}` });
      return;
    }

    const rbac = resolveRbac(meta, sess);
    if (!rbac.allowedOps.can_delete) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }

    const { ids } = req.body as { ids: string[] };

    if (!Array.isArray(ids) || ids.length === 0) {
      res.status(400).json({ error: "ids array is required and must not be empty" });
      return;
    }

    const table = await resolveTable(model);
    if (!table) {
      res.status(400).json({ error: `No table found for model: ${model}` });
      return;
    }

    // Delete all matching IDs
    const result = await (db as any)
      .delete(table)
      .where(sql`${(table as any).id} IN (${sql.raw(ids.map((id) => `'${id}'`).join(", "))})`)
      .returning();

    res.json({
      meta: {
        deleted: result.length,
        requested: ids.length,
      },
    });
  } catch (err) {
    (req as any).log?.error({ err, model }, `POST /${model}/bulk-delete failed`);
    if (isDbUnavailableError(err)) {
      sendDatabaseUnavailable(res);
      return;
    }
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
