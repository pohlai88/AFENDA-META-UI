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
import { sql, eq, asc, desc, inArray, and, isNull, type SQL, type Column } from "drizzle-orm";
import { db } from "../db/index.js";
import { getSchema } from "../meta/registry.js";
import { resolveRbac } from "../meta/rbac.js";
import { evaluateInvariants } from "../policy/invariant-enforcer.js";
import {
  MutationPolicyViolationError,
  assertBulkMutationAllowed,
  executeMutationCommand,
} from "../policy/mutation-command-gateway.js";
import { parseFilters, parseSortParams, buildWhereClause } from "../utils/queryBuilder.js";
import type { SessionContext, MetaField } from "@afenda/meta-types";

const router = Router();

type RequestLog = {
  error: (obj: unknown, msg?: string) => void;
};

type RequestWithLog = Request & {
  log?: RequestLog;
};

type RowRecord = Record<string, unknown>;
type DynamicTableColumns = Record<string, Column>;

type QueryLike = {
  where: (clause: SQL) => QueryLike;
  orderBy: (...clauses: unknown[]) => QueryLike;
  limit: (value: number) => QueryLike;
  offset: (value: number) => QueryLike;
} & PromiseLike<RowRecord[]>;

type DbLike = {
  select: (...args: unknown[]) => {
    from: (table: unknown) => QueryLike | PromiseLike<RowRecord[]>;
  };
  insert: (table: unknown) => {
    values: (values: RowRecord) => { returning: () => Promise<RowRecord[]> };
  };
  update: (table: unknown) => {
    set: (values: RowRecord) => {
      where: (clause: unknown) => { returning: () => Promise<RowRecord[]> };
    };
  };
  delete: (table: unknown) => {
    where: (clause: unknown) => { returning: () => Promise<RowRecord[]> };
  };
};

const dbLike = db as unknown as DbLike;

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

function sendInvariantViolation(
  res: Response,
  model: string,
  operation: string,
  details: ReturnType<typeof evaluateInvariants>
) {
  res.status(400).json({
    error: "Invariant violation",
    code: "INVARIANT_VIOLATION",
    message: `Write rejected by truth invariants for model ${model}`,
    details: {
      model,
      operation,
      errors: details.errors,
      warnings: details.warnings,
    },
  });
}

function sendMutationPolicyViolation(res: Response, err: MutationPolicyViolationError) {
  res.status(err.statusCode).json({
    error: "Mutation policy violation",
    code: err.code,
    message: err.message,
    details: {
      model: err.model,
      operation: err.operation,
      mutationPolicy: err.mutationPolicy,
      policyId: err.policy?.id,
      source: err.source,
    },
  });
}

function session(req: Request): SessionContext {
  return (req as Request & { session: SessionContext }).session;
}

function resolveActorId(sess: SessionContext): string | undefined {
  const maybeRecord = sess as unknown as Record<string, unknown>;

  for (const candidate of [maybeRecord.uid, maybeRecord.userId, maybeRecord.id]) {
    if (typeof candidate === "string" && candidate.length > 0) {
      return candidate;
    }
  }

  return undefined;
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

async function loadRowById(table: Record<string, unknown>, id: string): Promise<RowRecord | null> {
  const tableColumns = table as DynamicTableColumns;
  const query = dbLike.select().from(table) as QueryLike;
  const rows = await query.where(eq(tableColumns.id, id)).limit(1);
  return rows[0] ?? null;
}

async function loadRowsByIds(table: Record<string, unknown>, ids: string[]): Promise<RowRecord[]> {
  const tableColumns = table as DynamicTableColumns;
  const query = dbLike.select().from(table) as QueryLike;
  return query.where(inArray(tableColumns.id, ids));
}

function parseCsvQueryParam(value: unknown): string[] {
  if (typeof value !== "string") return [];
  return value
    .split(",")
    .map((item) => item.trim())
    .filter((item) => item.length > 0);
}

function normalizeExpandAlias(fieldName: string): string {
  return fieldName.replace(/(_id|Id)$/u, "");
}

function isManyToOneRelation(field: MetaField): boolean {
  return field.type === "many2one" && typeof field.relation?.model === "string";
}

function selectFieldNames({
  requested,
  visible,
  metaFields,
  tableColumns,
}: {
  requested: string[];
  visible: Set<string>;
  metaFields: MetaField[];
  tableColumns: DynamicTableColumns;
}): string[] {
  const allowed = new Set(
    metaFields.map((f) => f.name).filter((name) => visible.has(name) && Boolean(tableColumns[name]))
  );

  if (!requested.length) {
    return Array.from(allowed);
  }

  return requested.filter((name) => allowed.has(name));
}

function resolveExpandFields({
  expandTokens,
  metaFields,
  visible,
}: {
  expandTokens: string[];
  metaFields: MetaField[];
  visible: Set<string>;
}): MetaField[] {
  if (!expandTokens.length) return [];

  const tokenSet = new Set(expandTokens);
  return metaFields.filter((field) => {
    if (!isManyToOneRelation(field)) return false;
    if (!visible.has(field.name)) return false;

    const alias = normalizeExpandAlias(field.name);
    const relationModel = field.relation?.model;
    return (
      tokenSet.has(field.name) ||
      tokenSet.has(alias) ||
      (relationModel ? tokenSet.has(relationModel) : false)
    );
  });
}

function buildSelectProjection(tableColumns: DynamicTableColumns, fieldNames: string[]): RowRecord {
  const projection: RowRecord = {};
  for (const fieldName of fieldNames) {
    const column = tableColumns[fieldName];
    if (column) {
      projection[fieldName] = column;
    }
  }
  return projection;
}

function findSoftDeleteColumn(tableColumns: DynamicTableColumns): string | null {
  if (tableColumns.deleted_at) return "deleted_at";
  if (tableColumns.deletedAt) return "deletedAt";
  return null;
}

function includeDeletedQueryParam(value: unknown): boolean {
  return typeof value === "string" && value.toLowerCase() === "true";
}

async function expandManyToOneRows(
  rows: RowRecord[],
  expandFields: MetaField[],
  sess: SessionContext
): Promise<RowRecord[]> {
  if (!rows.length || !expandFields.length) return rows;

  const expandedRows = rows.map((row) => ({ ...row }));

  for (const field of expandFields) {
    const relation = field.relation;
    if (!relation?.model) continue;

    const relatedMeta = await getSchema(relation.model);
    if (!relatedMeta) continue;

    const relatedRbac = resolveRbac(relatedMeta, sess);
    if (!relatedRbac.allowedOps.can_read) continue;

    const relatedTable = await resolveTable(relation.model);
    if (!relatedTable) continue;

    const relatedColumns = relatedTable as DynamicTableColumns;
    const foreignKey = relation.foreign_key ?? field.name;
    const valueField = relation.value_field ?? "id";
    const displayField = relation.display_field ?? relatedMeta.title_field ?? "name";

    const valueColumn = relatedColumns[valueField];
    if (!valueColumn) continue;

    const relationIds = Array.from(
      new Set(
        expandedRows
          .map((row) => row[foreignKey])
          .filter(
            (value): value is string | number =>
              typeof value === "string" || typeof value === "number"
          )
      )
    );

    if (!relationIds.length) continue;

    const relatedVisibleSet = new Set(relatedRbac.visibleFields);
    const relatedFieldNames = Array.from(new Set([valueField, displayField])).filter(
      (name) => relatedVisibleSet.has(name) && Boolean(relatedColumns[name])
    );
    if (!relatedFieldNames.length) continue;

    const projection = buildSelectProjection(relatedColumns, relatedFieldNames);
    let relatedQuery = dbLike.select(projection).from(relatedTable) as
      | QueryLike
      | PromiseLike<RowRecord[]>;
    relatedQuery = (relatedQuery as QueryLike).where(inArray(valueColumn, relationIds));
    const relatedRows = await (relatedQuery as unknown as PromiseLike<RowRecord[]>);

    const byId = new Map<string, RowRecord>();
    for (const relatedRow of relatedRows) {
      const key = relatedRow[valueField];
      if (typeof key === "string" || typeof key === "number") {
        byId.set(String(key), relatedRow);
      }
    }

    const expandedKey = `${field.name}__expanded`;
    for (const row of expandedRows) {
      const fkValue = row[foreignKey];
      if (typeof fkValue === "string" || typeof fkValue === "number") {
        row[expandedKey] = byId.get(String(fkValue)) ?? null;
      } else {
        row[expandedKey] = null;
      }
    }
  }

  return expandedRows;
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

    const tableColumns = table as DynamicTableColumns;
    const visibleSet = new Set(rbac.visibleFields);
    const includeDeleted = includeDeletedQueryParam(req.query.include_deleted);
    const softDeleteColumn = findSoftDeleteColumn(tableColumns);

    // Parse projected fields and expandable relations
    const requestedFields = parseCsvQueryParam(req.query.fields);
    const expandTokens = parseCsvQueryParam(req.query.expand);
    const responseFieldNames = selectFieldNames({
      requested: requestedFields,
      visible: visibleSet,
      metaFields: meta.fields,
      tableColumns,
    });

    if (!responseFieldNames.length) {
      res.status(400).json({ error: "No readable fields were selected" });
      return;
    }

    const expandFields = resolveExpandFields({
      expandTokens,
      metaFields: meta.fields,
      visible: visibleSet,
    });

    const queryFieldNames = [...responseFieldNames];
    for (const relationField of expandFields) {
      const foreignKey = relationField.relation?.foreign_key ?? relationField.name;
      if (!queryFieldNames.includes(foreignKey) && tableColumns[foreignKey]) {
        queryFieldNames.push(foreignKey);
      }
    }

    const projection = buildSelectProjection(tableColumns, queryFieldNames);

    // Build where clause from filters
    const whereClause = buildWhereClause(tableColumns, filtersResult.data);
    const effectiveWhereClause =
      softDeleteColumn && !includeDeleted
        ? whereClause
          ? and(whereClause, isNull(tableColumns[softDeleteColumn]))
          : isNull(tableColumns[softDeleteColumn])
        : whereClause;

    // Build order by clause from sort params
    const orderByClauses = sortResult.data.map((sort) => {
      const column = tableColumns[sort.field];
      return sort.order === "asc" ? asc(column) : desc(column);
    });

    // Default sort by id desc if no sort specified
    if (orderByClauses.length === 0) {
      orderByClauses.push(desc(tableColumns.id));
    }

    // Build query with Drizzle
    let query = dbLike.select(projection).from(table) as QueryLike | PromiseLike<RowRecord[]>;

    if (effectiveWhereClause) {
      query = (query as QueryLike).where(effectiveWhereClause);
    }

    query = (query as QueryLike)
      .orderBy(...orderByClauses)
      .limit(limit)
      .offset(offset);

    // Execute query
    const rows = await (query as unknown as PromiseLike<RowRecord[]>);

    // Get total count (with filters applied)
    let countQuery = dbLike.select({ count: sql`count(*)` }).from(table) as
      | { where: (clause: SQL) => PromiseLike<Array<{ count: number | string }>> }
      | PromiseLike<Array<{ count: number | string }>>;

    if (effectiveWhereClause) {
      countQuery = (
        countQuery as { where: (clause: SQL) => PromiseLike<Array<{ count: number | string }>> }
      ).where(effectiveWhereClause);
    }

    const [{ count }] = await (countQuery as PromiseLike<Array<{ count: number | string }>>);
    const total = Number(count);

    const expandedRows = await expandManyToOneRows(rows, expandFields, sess);

    const responseSet = new Set(responseFieldNames);
    const filteredRows = expandedRows.map((row: RowRecord) => {
      const filtered: RowRecord = {};
      for (const [key, value] of Object.entries(row)) {
        if (responseSet.has(key) || key.endsWith("__expanded")) {
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
        fields: requestedFields.length ? responseFieldNames : undefined,
        expand: expandFields.length ? expandFields.map((field) => field.name) : undefined,
        include_deleted: includeDeleted || undefined,
        filters: filtersResult.data.conditions.length > 0 ? filtersResult.data : undefined,
        sort: sortResult.data.length > 0 ? sortResult.data : undefined,
      },
    });
  } catch (err) {
    (req as RequestWithLog).log?.error({ err, model }, `GET /${model} failed`);
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

    const table = await resolveTable(model);
    if (!table) {
      res.status(400).json({ error: `No table found for model: ${model}` });
      return;
    }

    const tableColumns = table as DynamicTableColumns;
    const visibleSet = new Set(rbac.visibleFields);
    const includeDeleted = includeDeletedQueryParam(req.query.include_deleted);
    const softDeleteColumn = findSoftDeleteColumn(tableColumns);

    const requestedFields = parseCsvQueryParam(req.query.fields);
    const expandTokens = parseCsvQueryParam(req.query.expand);
    const responseFieldNames = selectFieldNames({
      requested: requestedFields,
      visible: visibleSet,
      metaFields: meta.fields,
      tableColumns,
    });

    if (!responseFieldNames.length) {
      res.status(400).json({ error: "No readable fields were selected" });
      return;
    }

    const expandFields = resolveExpandFields({
      expandTokens,
      metaFields: meta.fields,
      visible: visibleSet,
    });

    const queryFieldNames = [...responseFieldNames];
    for (const relationField of expandFields) {
      const foreignKey = relationField.relation?.foreign_key ?? relationField.name;
      if (!queryFieldNames.includes(foreignKey) && tableColumns[foreignKey]) {
        queryFieldNames.push(foreignKey);
      }
    }

    const projection = buildSelectProjection(tableColumns, queryFieldNames);
    const idClause = eq(tableColumns.id, id);
    const effectiveWhereClause =
      softDeleteColumn && !includeDeleted
        ? and(idClause, isNull(tableColumns[softDeleteColumn]))
        : idClause;
    const finalWhereClause = effectiveWhereClause ?? idClause;

    let query = dbLike.select(projection).from(table) as QueryLike | PromiseLike<RowRecord[]>;
    query = (query as QueryLike).where(finalWhereClause).limit(1);
    const rows = await (query as unknown as PromiseLike<RowRecord[]>);

    if (!rows.length) {
      res.status(404).json({ error: "Not found" });
      return;
    }

    const expandedRows = await expandManyToOneRows(rows, expandFields, sess);
    const responseSet = new Set(responseFieldNames);

    const record: RowRecord = {};
    for (const [key, value] of Object.entries(expandedRows[0])) {
      if (responseSet.has(key) || key.endsWith("__expanded")) {
        record[key] = value;
      }
    }

    res.json({
      data: record,
      meta: {
        fields: requestedFields.length ? responseFieldNames : undefined,
        expand: expandFields.length ? expandFields.map((field) => field.name) : undefined,
        include_deleted: includeDeleted || undefined,
      },
    });
  } catch (err) {
    (req as RequestWithLog).log?.error({ err, model, id }, `GET /${model}/${id} failed`);
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

    const invariantResult = evaluateInvariants({
      model,
      operation: "create",
      record: safe,
    });
    if (!invariantResult.passed) {
      sendInvariantViolation(res, model, "create", invariantResult);
      return;
    }

    const commandResult = await executeMutationCommand({
      model,
      operation: "create",
      actorId: resolveActorId(sess),
      nextRecord: safe,
      mutate: async () => {
        const [created] = await dbLike.insert(table).values(safe).returning();
        return created ?? null;
      },
    });

    res.status(201).json({
      data: commandResult.record,
      meta:
        commandResult.policy || commandResult.event
          ? {
              mutationPolicy: commandResult.mutationPolicy,
              policyId: commandResult.policy?.id,
              eventType: commandResult.event?.eventType,
              eventId: commandResult.event?.id,
            }
          : undefined,
    });
  } catch (err) {
    (req as RequestWithLog).log?.error({ err, model }, `POST /${model} failed`);
    if (err instanceof MutationPolicyViolationError) {
      sendMutationPolicyViolation(res, err);
      return;
    }
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

    const tableColumns = table as DynamicTableColumns;
    const existing = await loadRowById(table, id);

    if (!existing) {
      res.status(404).json({ error: "Not found" });
      return;
    }

    const invariantResult = evaluateInvariants({
      model,
      operation: "update",
      record: { ...existing, ...safe },
    });
    if (!invariantResult.passed) {
      sendInvariantViolation(res, model, "update", invariantResult);
      return;
    }

    const nextRecord = { ...existing, ...safe };
    const commandResult = await executeMutationCommand({
      model,
      operation: "update",
      recordId: id,
      actorId: resolveActorId(sess),
      existingRecord: existing,
      nextRecord,
      mutate: async () => {
        const [updated] = await dbLike
          .update(table)
          .set(safe)
          .where(eq(tableColumns.id, id))
          .returning();

        return updated ?? null;
      },
    });

    const updated = commandResult.record;

    if (!updated) {
      res.status(404).json({ error: "Not found" });
      return;
    }

    res.json({
      data: updated,
      meta:
        commandResult.policy || commandResult.event
          ? {
              mutationPolicy: commandResult.mutationPolicy,
              policyId: commandResult.policy?.id,
              eventType: commandResult.event?.eventType,
              eventId: commandResult.event?.id,
            }
          : undefined,
    });
  } catch (err) {
    (req as RequestWithLog).log?.error({ err, model, id }, `PATCH /${model}/${id} failed`);
    if (err instanceof MutationPolicyViolationError) {
      sendMutationPolicyViolation(res, err);
      return;
    }
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

    const tableColumns = table as DynamicTableColumns;
    const softDeleteColumn = findSoftDeleteColumn(tableColumns);
    const existing = await loadRowById(table, id);

    if (!existing) {
      res.status(404).json({ error: "Not found" });
      return;
    }

    const invariantResult = evaluateInvariants({
      model,
      operation: "delete",
      record: existing,
    });
    if (!invariantResult.passed) {
      sendInvariantViolation(res, model, "delete", invariantResult);
      return;
    }

    const actorId = resolveActorId(sess);

    if (softDeleteColumn) {
      const now = new Date();
      const updatePayload: RowRecord = { [softDeleteColumn]: now };
      if (tableColumns.updated_at) {
        updatePayload.updated_at = now;
      } else if (tableColumns.updatedAt) {
        updatePayload.updatedAt = now;
      }

      const commandResult = await executeMutationCommand({
        model,
        operation: "delete",
        recordId: id,
        actorId,
        existingRecord: existing,
        nextRecord: { ...existing, ...updatePayload },
        mutate: async () => {
          const [updated] = await dbLike
            .update(table)
            .set(updatePayload)
            .where(eq(tableColumns.id, id))
            .returning();

          return updated ?? null;
        },
      });

      const updated = commandResult.record;

      if (!updated) {
        res.status(404).json({ error: "Not found" });
        return;
      }
    } else {
      await executeMutationCommand({
        model,
        operation: "delete",
        recordId: id,
        actorId,
        existingRecord: existing,
        mutate: async () => {
          const deleted = await dbLike.delete(table).where(eq(tableColumns.id, id)).returning();
          return deleted[0] ?? existing;
        },
      });
    }

    res.status(204).send();
  } catch (err) {
    (req as RequestWithLog).log?.error({ err, model, id }, `DELETE /${model}/${id} failed`);
    if (err instanceof MutationPolicyViolationError) {
      sendMutationPolicyViolation(res, err);
      return;
    }
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

    assertBulkMutationAllowed({ model, operation: "update" });

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

    const existingRows = await loadRowsByIds(table, ids);
    for (const existing of existingRows) {
      const invariantResult = evaluateInvariants({
        model,
        operation: "update",
        record: { ...existing, ...safe },
      });
      if (!invariantResult.passed) {
        sendInvariantViolation(res, model, "update", invariantResult);
        return;
      }
    }

    // Update all matching IDs
    const tableColumns = table as DynamicTableColumns;

    const result = await dbLike
      .update(table)
      .set(safe)
      .where(inArray(tableColumns.id, ids))
      .returning();

    res.json({
      data: result,
      meta: {
        updated: result.length,
        requested: ids.length,
      },
    });
  } catch (err) {
    (req as RequestWithLog).log?.error({ err, model }, `POST /${model}/bulk-update failed`);
    if (err instanceof MutationPolicyViolationError) {
      sendMutationPolicyViolation(res, err);
      return;
    }
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

    assertBulkMutationAllowed({ model, operation: "delete" });

    if (!Array.isArray(ids) || ids.length === 0) {
      res.status(400).json({ error: "ids array is required and must not be empty" });
      return;
    }

    const table = await resolveTable(model);
    if (!table) {
      res.status(400).json({ error: `No table found for model: ${model}` });
      return;
    }

    const existingRows = await loadRowsByIds(table, ids);
    for (const existing of existingRows) {
      const invariantResult = evaluateInvariants({
        model,
        operation: "delete",
        record: existing,
      });
      if (!invariantResult.passed) {
        sendInvariantViolation(res, model, "delete", invariantResult);
        return;
      }
    }

    // Delete all matching IDs
    const tableColumns = table as DynamicTableColumns;

    const result = await dbLike.delete(table).where(inArray(tableColumns.id, ids)).returning();

    res.json({
      meta: {
        deleted: result.length,
        requested: ids.length,
      },
    });
  } catch (err) {
    (req as RequestWithLog).log?.error({ err, model }, `POST /${model}/bulk-delete failed`);
    if (err instanceof MutationPolicyViolationError) {
      sendMutationPolicyViolation(res, err);
      return;
    }
    if (isDbUnavailableError(err)) {
      sendDatabaseUnavailable(res);
      return;
    }
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
