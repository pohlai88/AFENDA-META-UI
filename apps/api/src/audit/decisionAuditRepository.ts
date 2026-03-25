/**
 * Decision Audit Repository — DB-backed persistence layer
 * ========================================================
 * Persists decision audit entries and chains to PostgreSQL via Drizzle.
 *
 * Design:
 *   - logDecisionAudit() is fire-and-forget (non-blocking writes)
 *   - Entries are buffered and flushed in batches for throughput
 *   - Queries always hit DB for authoritative results
 *   - Chain tracking uses upsert for atomic counter updates
 */

import { eq, and, desc, gte, lte, sql } from "drizzle-orm";
import { db } from "../db/index.js";
import {
  decisionAuditEntries,
  decisionAuditChains,
} from "../db/schema/index.js";
import type {
  DecisionAuditEntry,
  DecisionAuditQuery,
  DecisionAuditChain,
} from "@afenda/meta-types";

// ── Write Buffer ───────────────────────────────────────────────────────────

const FLUSH_INTERVAL_MS = 2000;
const MAX_BUFFER_SIZE = 100;
let buffer: Array<DecisionAuditEntry & { chainId?: string }> = [];
let flushTimer: ReturnType<typeof setInterval> | null = null;

function startFlusher(): void {
  if (flushTimer) return;
  flushTimer = setInterval(flushBuffer, FLUSH_INTERVAL_MS);
}

export async function flushBuffer(): Promise<number> {
  if (buffer.length === 0) return 0;

  const batch = buffer.splice(0, buffer.length);
  try {
    await db.insert(decisionAuditEntries).values(
      batch.map((entry) => ({
        id: entry.id,
        timestamp: new Date(entry.timestamp),
        tenantId: entry.tenantId,
        userId: entry.userId ?? null,
        eventType: entry.eventType as typeof decisionAuditEntries.$inferInsert["eventType"],
        scope: entry.scope,
        context: entry.context,
        decision: entry.decision,
        durationMs: entry.durationMs,
        status: entry.status as typeof decisionAuditEntries.$inferInsert["status"],
        error: entry.error ?? null,
        chainId: entry.chainId ?? null,
      })),
    );
    return batch.length;
  } catch (err) {
    // On failure, re-queue entries (best-effort)
    buffer.unshift(...batch);
    console.error("[decision-audit] flush failed, re-queued", batch.length, "entries:", err);
    return 0;
  }
}

export function stopFlusher(): void {
  if (flushTimer) {
    clearInterval(flushTimer);
    flushTimer = null;
  }
}

// ── Write Operations ───────────────────────────────────────────────────────

export function dbLogDecisionAudit(entry: DecisionAuditEntry, chainId?: string): void {
  buffer.push({ ...entry, chainId });
  startFlusher();
  if (buffer.length >= MAX_BUFFER_SIZE) {
    void flushBuffer();
  }
}

export function dbLogDecisionAuditBatch(entries: DecisionAuditEntry[]): void {
  buffer.push(...entries);
  startFlusher();
  if (buffer.length >= MAX_BUFFER_SIZE) {
    void flushBuffer();
  }
}

export async function dbLinkToChain(
  chainId: string,
  entry: DecisionAuditEntry,
): Promise<void> {
  dbLogDecisionAudit(entry, chainId);

  // Upsert chain summary
  const existing = await db
    .select()
    .from(decisionAuditChains)
    .where(eq(decisionAuditChains.rootId, chainId))
    .limit(1);

  if (existing.length) {
    await db
      .update(decisionAuditChains)
      .set({
        totalDurationMs: sql`${decisionAuditChains.totalDurationMs} + ${entry.durationMs}`,
        entryCount: sql`${decisionAuditChains.entryCount} + 1`,
        errorCount:
          entry.status === "error"
            ? sql`${decisionAuditChains.errorCount} + 1`
            : decisionAuditChains.errorCount,
        updatedAt: new Date(),
      })
      .where(eq(decisionAuditChains.rootId, chainId));
  } else {
    await db.insert(decisionAuditChains).values({
      rootId: chainId,
      totalDurationMs: entry.durationMs,
      entryCount: 1,
      errorCount: entry.status === "error" ? 1 : 0,
    });
  }
}

// ── Query Operations ───────────────────────────────────────────────────────

export async function dbQueryDecisionAuditLog(
  query: DecisionAuditQuery,
): Promise<DecisionAuditEntry[]> {
  const conditions = [eq(decisionAuditEntries.tenantId, query.tenantId)];

  if (query.eventType) {
    conditions.push(
      eq(
        decisionAuditEntries.eventType,
        query.eventType as typeof decisionAuditEntries.$inferInsert["eventType"],
      ),
    );
  }
  if (query.userId) {
    conditions.push(eq(decisionAuditEntries.userId, query.userId));
  }
  if (query.fromTimestamp) {
    conditions.push(gte(decisionAuditEntries.timestamp, new Date(query.fromTimestamp)));
  }
  if (query.toTimestamp) {
    conditions.push(lte(decisionAuditEntries.timestamp, new Date(query.toTimestamp)));
  }

  const offset = query.offset ?? 0;
  const limit = query.limit ?? 100;

  const rows = await db
    .select()
    .from(decisionAuditEntries)
    .where(and(...conditions))
    .orderBy(desc(decisionAuditEntries.timestamp))
    .limit(limit)
    .offset(offset);

  return rows.map(rowToEntry);
}

export async function dbGetDecisionChain(chainId: string): Promise<DecisionAuditChain | null> {
  await flushBuffer(); // ensure pending writes are committed

  const chainRows = await db
    .select()
    .from(decisionAuditChains)
    .where(eq(decisionAuditChains.rootId, chainId))
    .limit(1);

  if (!chainRows.length) return null;

  const entries = await db
    .select()
    .from(decisionAuditEntries)
    .where(eq(decisionAuditEntries.chainId, chainId))
    .orderBy(decisionAuditEntries.timestamp);

  const chain = chainRows[0];
  return {
    rootId: chain.rootId,
    entries: entries.map(rowToEntry),
    totalDurationMs: chain.totalDurationMs,
    errors: entries
      .filter((e) => e.status === "error" && e.error)
      .map((e) => e.error as DecisionAuditEntry["error"]),
  };
}

export async function dbGetDecisionStats(
  tenantId: string,
  eventType: string,
  timeWindowMs = 3600000,
): Promise<{
  count: number;
  avgDurationMs: number;
  minDurationMs: number;
  maxDurationMs: number;
  errorRate: number;
}> {
  const cutoff = new Date(Date.now() - timeWindowMs);

  const result = await db
    .select({
      count: sql<number>`count(*)::int`,
      avgDuration: sql<number>`coalesce(avg(${decisionAuditEntries.durationMs}), 0)`,
      minDuration: sql<number>`coalesce(min(${decisionAuditEntries.durationMs}), 0)`,
      maxDuration: sql<number>`coalesce(max(${decisionAuditEntries.durationMs}), 0)`,
      errorCount: sql<number>`count(*) filter (where ${decisionAuditEntries.status} = 'error')::int`,
    })
    .from(decisionAuditEntries)
    .where(
      and(
        eq(decisionAuditEntries.tenantId, tenantId),
        eq(
          decisionAuditEntries.eventType,
          eventType as typeof decisionAuditEntries.$inferInsert["eventType"],
        ),
        gte(decisionAuditEntries.timestamp, cutoff),
      ),
    );

  const row = result[0];
  return {
    count: row.count,
    avgDurationMs: Number(row.avgDuration),
    minDurationMs: Number(row.minDuration),
    maxDurationMs: Number(row.maxDuration),
    errorRate: row.count > 0 ? row.errorCount / row.count : 0,
  };
}

export async function dbGetSlowDecisions(
  tenantId: string,
  thresholdMs: number,
  limit = 10,
): Promise<DecisionAuditEntry[]> {
  const rows = await db
    .select()
    .from(decisionAuditEntries)
    .where(
      and(
        eq(decisionAuditEntries.tenantId, tenantId),
        gte(decisionAuditEntries.durationMs, thresholdMs),
      ),
    )
    .orderBy(desc(decisionAuditEntries.durationMs))
    .limit(limit);
  return rows.map(rowToEntry);
}

export async function dbGetAuditFailures(
  tenantId: string,
  limit = 50,
): Promise<DecisionAuditEntry[]> {
  const rows = await db
    .select()
    .from(decisionAuditEntries)
    .where(
      and(
        eq(decisionAuditEntries.tenantId, tenantId),
        eq(decisionAuditEntries.status, "error"),
      ),
    )
    .orderBy(desc(decisionAuditEntries.timestamp))
    .limit(limit);
  return rows.map(rowToEntry);
}

export async function dbGetUserAuditTrail(
  tenantId: string,
  userId: string,
  limit = 100,
): Promise<DecisionAuditEntry[]> {
  const rows = await db
    .select()
    .from(decisionAuditEntries)
    .where(
      and(
        eq(decisionAuditEntries.tenantId, tenantId),
        eq(decisionAuditEntries.userId, userId),
      ),
    )
    .orderBy(desc(decisionAuditEntries.timestamp))
    .limit(limit);
  return rows.map(rowToEntry);
}

export async function dbPruneOldDecisions(olderThanMs: number): Promise<number> {
  const cutoff = new Date(Date.now() - olderThanMs);
  const result = await db
    .delete(decisionAuditEntries)
    .where(lte(decisionAuditEntries.timestamp, cutoff));
  return (result as { rowCount?: number }).rowCount ?? 0;
}

// ── Row Mapper ─────────────────────────────────────────────────────────────

function rowToEntry(row: typeof decisionAuditEntries.$inferSelect): DecisionAuditEntry {
  return {
    id: row.id,
    timestamp: row.timestamp.toISOString(),
    tenantId: row.tenantId,
    userId: row.userId ?? undefined,
    eventType: row.eventType as DecisionAuditEntry["eventType"],
    scope: row.scope,
    context: (row.context ?? {}) as DecisionAuditEntry["context"],
    decision: row.decision as DecisionAuditEntry["decision"],
    durationMs: row.durationMs,
    status: row.status as DecisionAuditEntry["status"],
    error: row.error as DecisionAuditEntry["error"],
  };
}
