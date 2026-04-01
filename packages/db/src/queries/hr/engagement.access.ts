// @generated
// Full access scaffold — tools/ci-gate/db-access-layer (emit-full).
// Human-owned reporting: use separate modules (not *.access.ts).

import { and, eq, isNull } from "drizzle-orm";
import type { Database } from "../../drizzle/db.js";
import { assertGraphGuardrailAllowsRead } from "../_shared/graph-guardrail.js";
import {
  bonusPointRedemptionRequests,
  bonusPointRewardCatalog,
  bonusPointRules,
  bonusPointTransactions,
  employeeBonusPoints,
} from "../../schema/hr/engagement.js";

/** Safe by ID: tenant + not soft-deleted. */
export async function getBonusPointRulesByIdSafe(
  db: Database,
  tenantId: (typeof bonusPointRules.$inferSelect)["tenantId"],
  id: (typeof bonusPointRules.$inferSelect)["id"],
) {
  const rows = await db
    .select()
    .from(bonusPointRules)
    .where(
      and(
        eq(bonusPointRules.tenantId, tenantId),
        eq(bonusPointRules.id, id),
        isNull(bonusPointRules.deletedAt),
      ),
    )
    .limit(1);
  return rows[0] ?? null;
}

/** Same as getBonusPointRulesByIdSafe; asserts graph-validation policy when GRAPH_VALIDATION_POLICY_JSON is set. */
export async function getBonusPointRulesByIdSafeGuarded(
  db: Database,
  tenantId: (typeof bonusPointRules.$inferSelect)["tenantId"],
  id: (typeof bonusPointRules.$inferSelect)["id"],
) {
  await assertGraphGuardrailAllowsRead();
  return getBonusPointRulesByIdSafe(db, tenantId, id);
}

/** List rows for tenant excluding soft-deleted. */
export async function listBonusPointRulesActive(
  db: Database,
  tenantId: (typeof bonusPointRules.$inferSelect)["tenantId"],
) {
  return await db
    .select()
    .from(bonusPointRules)
    .where(and(eq(bonusPointRules.tenantId, tenantId), isNull(bonusPointRules.deletedAt)));
}

export async function listBonusPointRulesActiveGuarded(
  db: Database,
  tenantId: (typeof bonusPointRules.$inferSelect)["tenantId"],
) {
  await assertGraphGuardrailAllowsRead();
  return listBonusPointRulesActive(db, tenantId);
}

/** List all rows for tenant including soft-deleted. */
export async function listBonusPointRulesAll(
  db: Database,
  tenantId: (typeof bonusPointRules.$inferSelect)["tenantId"],
) {
  return await db.select().from(bonusPointRules).where(eq(bonusPointRules.tenantId, tenantId));
}

export async function listBonusPointRulesAllGuarded(
  db: Database,
  tenantId: (typeof bonusPointRules.$inferSelect)["tenantId"],
) {
  await assertGraphGuardrailAllowsRead();
  return listBonusPointRulesAll(db, tenantId);
}

/** Soft-archive (mechanical delete flag). */
export async function archiveBonusPointRules(
  db: Database,
  tenantId: (typeof bonusPointRules.$inferSelect)["tenantId"],
  id: (typeof bonusPointRules.$inferSelect)["id"],
) {
  return await db
    .update(bonusPointRules)
    .set({ deletedAt: new Date() })
    .where(and(eq(bonusPointRules.tenantId, tenantId), eq(bonusPointRules.id, id)));
}

export async function archiveBonusPointRulesGuarded(
  db: Database,
  tenantId: (typeof bonusPointRules.$inferSelect)["tenantId"],
  id: (typeof bonusPointRules.$inferSelect)["id"],
) {
  await assertGraphGuardrailAllowsRead();
  return archiveBonusPointRules(db, tenantId, id);
}


/** Safe by ID: tenant + not soft-deleted. */
export async function getEmployeeBonusPointsByIdSafe(
  db: Database,
  tenantId: (typeof employeeBonusPoints.$inferSelect)["tenantId"],
  id: (typeof employeeBonusPoints.$inferSelect)["id"],
) {
  const rows = await db
    .select()
    .from(employeeBonusPoints)
    .where(
      and(
        eq(employeeBonusPoints.tenantId, tenantId),
        eq(employeeBonusPoints.id, id),
        isNull(employeeBonusPoints.deletedAt),
      ),
    )
    .limit(1);
  return rows[0] ?? null;
}

/** Same as getEmployeeBonusPointsByIdSafe; asserts graph-validation policy when GRAPH_VALIDATION_POLICY_JSON is set. */
export async function getEmployeeBonusPointsByIdSafeGuarded(
  db: Database,
  tenantId: (typeof employeeBonusPoints.$inferSelect)["tenantId"],
  id: (typeof employeeBonusPoints.$inferSelect)["id"],
) {
  await assertGraphGuardrailAllowsRead();
  return getEmployeeBonusPointsByIdSafe(db, tenantId, id);
}

/** List rows for tenant excluding soft-deleted. */
export async function listEmployeeBonusPointsActive(
  db: Database,
  tenantId: (typeof employeeBonusPoints.$inferSelect)["tenantId"],
) {
  return await db
    .select()
    .from(employeeBonusPoints)
    .where(and(eq(employeeBonusPoints.tenantId, tenantId), isNull(employeeBonusPoints.deletedAt)));
}

export async function listEmployeeBonusPointsActiveGuarded(
  db: Database,
  tenantId: (typeof employeeBonusPoints.$inferSelect)["tenantId"],
) {
  await assertGraphGuardrailAllowsRead();
  return listEmployeeBonusPointsActive(db, tenantId);
}

/** List all rows for tenant including soft-deleted. */
export async function listEmployeeBonusPointsAll(
  db: Database,
  tenantId: (typeof employeeBonusPoints.$inferSelect)["tenantId"],
) {
  return await db.select().from(employeeBonusPoints).where(eq(employeeBonusPoints.tenantId, tenantId));
}

export async function listEmployeeBonusPointsAllGuarded(
  db: Database,
  tenantId: (typeof employeeBonusPoints.$inferSelect)["tenantId"],
) {
  await assertGraphGuardrailAllowsRead();
  return listEmployeeBonusPointsAll(db, tenantId);
}

/** Soft-archive (mechanical delete flag). */
export async function archiveEmployeeBonusPoints(
  db: Database,
  tenantId: (typeof employeeBonusPoints.$inferSelect)["tenantId"],
  id: (typeof employeeBonusPoints.$inferSelect)["id"],
) {
  return await db
    .update(employeeBonusPoints)
    .set({ deletedAt: new Date() })
    .where(and(eq(employeeBonusPoints.tenantId, tenantId), eq(employeeBonusPoints.id, id)));
}

export async function archiveEmployeeBonusPointsGuarded(
  db: Database,
  tenantId: (typeof employeeBonusPoints.$inferSelect)["tenantId"],
  id: (typeof employeeBonusPoints.$inferSelect)["id"],
) {
  await assertGraphGuardrailAllowsRead();
  return archiveEmployeeBonusPoints(db, tenantId, id);
}


/** Safe by ID: tenant + not soft-deleted. */
export async function getBonusPointTransactionsByIdSafe(
  db: Database,
  tenantId: (typeof bonusPointTransactions.$inferSelect)["tenantId"],
  id: (typeof bonusPointTransactions.$inferSelect)["id"],
) {
  const rows = await db
    .select()
    .from(bonusPointTransactions)
    .where(
      and(
        eq(bonusPointTransactions.tenantId, tenantId),
        eq(bonusPointTransactions.id, id),
        isNull(bonusPointTransactions.deletedAt),
      ),
    )
    .limit(1);
  return rows[0] ?? null;
}

/** Same as getBonusPointTransactionsByIdSafe; asserts graph-validation policy when GRAPH_VALIDATION_POLICY_JSON is set. */
export async function getBonusPointTransactionsByIdSafeGuarded(
  db: Database,
  tenantId: (typeof bonusPointTransactions.$inferSelect)["tenantId"],
  id: (typeof bonusPointTransactions.$inferSelect)["id"],
) {
  await assertGraphGuardrailAllowsRead();
  return getBonusPointTransactionsByIdSafe(db, tenantId, id);
}

/** List rows for tenant excluding soft-deleted. */
export async function listBonusPointTransactionsActive(
  db: Database,
  tenantId: (typeof bonusPointTransactions.$inferSelect)["tenantId"],
) {
  return await db
    .select()
    .from(bonusPointTransactions)
    .where(and(eq(bonusPointTransactions.tenantId, tenantId), isNull(bonusPointTransactions.deletedAt)));
}

export async function listBonusPointTransactionsActiveGuarded(
  db: Database,
  tenantId: (typeof bonusPointTransactions.$inferSelect)["tenantId"],
) {
  await assertGraphGuardrailAllowsRead();
  return listBonusPointTransactionsActive(db, tenantId);
}

/** List all rows for tenant including soft-deleted. */
export async function listBonusPointTransactionsAll(
  db: Database,
  tenantId: (typeof bonusPointTransactions.$inferSelect)["tenantId"],
) {
  return await db.select().from(bonusPointTransactions).where(eq(bonusPointTransactions.tenantId, tenantId));
}

export async function listBonusPointTransactionsAllGuarded(
  db: Database,
  tenantId: (typeof bonusPointTransactions.$inferSelect)["tenantId"],
) {
  await assertGraphGuardrailAllowsRead();
  return listBonusPointTransactionsAll(db, tenantId);
}

/** Soft-archive (mechanical delete flag). */
export async function archiveBonusPointTransactions(
  db: Database,
  tenantId: (typeof bonusPointTransactions.$inferSelect)["tenantId"],
  id: (typeof bonusPointTransactions.$inferSelect)["id"],
) {
  return await db
    .update(bonusPointTransactions)
    .set({ deletedAt: new Date() })
    .where(and(eq(bonusPointTransactions.tenantId, tenantId), eq(bonusPointTransactions.id, id)));
}

export async function archiveBonusPointTransactionsGuarded(
  db: Database,
  tenantId: (typeof bonusPointTransactions.$inferSelect)["tenantId"],
  id: (typeof bonusPointTransactions.$inferSelect)["id"],
) {
  await assertGraphGuardrailAllowsRead();
  return archiveBonusPointTransactions(db, tenantId, id);
}


/** Safe by ID: tenant + not soft-deleted. */
export async function getBonusPointRewardCatalogByIdSafe(
  db: Database,
  tenantId: (typeof bonusPointRewardCatalog.$inferSelect)["tenantId"],
  id: (typeof bonusPointRewardCatalog.$inferSelect)["id"],
) {
  const rows = await db
    .select()
    .from(bonusPointRewardCatalog)
    .where(
      and(
        eq(bonusPointRewardCatalog.tenantId, tenantId),
        eq(bonusPointRewardCatalog.id, id),
        isNull(bonusPointRewardCatalog.deletedAt),
      ),
    )
    .limit(1);
  return rows[0] ?? null;
}

/** Same as getBonusPointRewardCatalogByIdSafe; asserts graph-validation policy when GRAPH_VALIDATION_POLICY_JSON is set. */
export async function getBonusPointRewardCatalogByIdSafeGuarded(
  db: Database,
  tenantId: (typeof bonusPointRewardCatalog.$inferSelect)["tenantId"],
  id: (typeof bonusPointRewardCatalog.$inferSelect)["id"],
) {
  await assertGraphGuardrailAllowsRead();
  return getBonusPointRewardCatalogByIdSafe(db, tenantId, id);
}

/** List rows for tenant excluding soft-deleted. */
export async function listBonusPointRewardCatalogActive(
  db: Database,
  tenantId: (typeof bonusPointRewardCatalog.$inferSelect)["tenantId"],
) {
  return await db
    .select()
    .from(bonusPointRewardCatalog)
    .where(and(eq(bonusPointRewardCatalog.tenantId, tenantId), isNull(bonusPointRewardCatalog.deletedAt)));
}

export async function listBonusPointRewardCatalogActiveGuarded(
  db: Database,
  tenantId: (typeof bonusPointRewardCatalog.$inferSelect)["tenantId"],
) {
  await assertGraphGuardrailAllowsRead();
  return listBonusPointRewardCatalogActive(db, tenantId);
}

/** List all rows for tenant including soft-deleted. */
export async function listBonusPointRewardCatalogAll(
  db: Database,
  tenantId: (typeof bonusPointRewardCatalog.$inferSelect)["tenantId"],
) {
  return await db.select().from(bonusPointRewardCatalog).where(eq(bonusPointRewardCatalog.tenantId, tenantId));
}

export async function listBonusPointRewardCatalogAllGuarded(
  db: Database,
  tenantId: (typeof bonusPointRewardCatalog.$inferSelect)["tenantId"],
) {
  await assertGraphGuardrailAllowsRead();
  return listBonusPointRewardCatalogAll(db, tenantId);
}

/** Soft-archive (mechanical delete flag). */
export async function archiveBonusPointRewardCatalog(
  db: Database,
  tenantId: (typeof bonusPointRewardCatalog.$inferSelect)["tenantId"],
  id: (typeof bonusPointRewardCatalog.$inferSelect)["id"],
) {
  return await db
    .update(bonusPointRewardCatalog)
    .set({ deletedAt: new Date() })
    .where(and(eq(bonusPointRewardCatalog.tenantId, tenantId), eq(bonusPointRewardCatalog.id, id)));
}

export async function archiveBonusPointRewardCatalogGuarded(
  db: Database,
  tenantId: (typeof bonusPointRewardCatalog.$inferSelect)["tenantId"],
  id: (typeof bonusPointRewardCatalog.$inferSelect)["id"],
) {
  await assertGraphGuardrailAllowsRead();
  return archiveBonusPointRewardCatalog(db, tenantId, id);
}


/** Safe by ID: tenant + not soft-deleted. */
export async function getBonusPointRedemptionRequestsByIdSafe(
  db: Database,
  tenantId: (typeof bonusPointRedemptionRequests.$inferSelect)["tenantId"],
  id: (typeof bonusPointRedemptionRequests.$inferSelect)["id"],
) {
  const rows = await db
    .select()
    .from(bonusPointRedemptionRequests)
    .where(
      and(
        eq(bonusPointRedemptionRequests.tenantId, tenantId),
        eq(bonusPointRedemptionRequests.id, id),
        isNull(bonusPointRedemptionRequests.deletedAt),
      ),
    )
    .limit(1);
  return rows[0] ?? null;
}

/** Same as getBonusPointRedemptionRequestsByIdSafe; asserts graph-validation policy when GRAPH_VALIDATION_POLICY_JSON is set. */
export async function getBonusPointRedemptionRequestsByIdSafeGuarded(
  db: Database,
  tenantId: (typeof bonusPointRedemptionRequests.$inferSelect)["tenantId"],
  id: (typeof bonusPointRedemptionRequests.$inferSelect)["id"],
) {
  await assertGraphGuardrailAllowsRead();
  return getBonusPointRedemptionRequestsByIdSafe(db, tenantId, id);
}

/** List rows for tenant excluding soft-deleted. */
export async function listBonusPointRedemptionRequestsActive(
  db: Database,
  tenantId: (typeof bonusPointRedemptionRequests.$inferSelect)["tenantId"],
) {
  return await db
    .select()
    .from(bonusPointRedemptionRequests)
    .where(and(eq(bonusPointRedemptionRequests.tenantId, tenantId), isNull(bonusPointRedemptionRequests.deletedAt)));
}

export async function listBonusPointRedemptionRequestsActiveGuarded(
  db: Database,
  tenantId: (typeof bonusPointRedemptionRequests.$inferSelect)["tenantId"],
) {
  await assertGraphGuardrailAllowsRead();
  return listBonusPointRedemptionRequestsActive(db, tenantId);
}

/** List all rows for tenant including soft-deleted. */
export async function listBonusPointRedemptionRequestsAll(
  db: Database,
  tenantId: (typeof bonusPointRedemptionRequests.$inferSelect)["tenantId"],
) {
  return await db.select().from(bonusPointRedemptionRequests).where(eq(bonusPointRedemptionRequests.tenantId, tenantId));
}

export async function listBonusPointRedemptionRequestsAllGuarded(
  db: Database,
  tenantId: (typeof bonusPointRedemptionRequests.$inferSelect)["tenantId"],
) {
  await assertGraphGuardrailAllowsRead();
  return listBonusPointRedemptionRequestsAll(db, tenantId);
}

/** Soft-archive (mechanical delete flag). */
export async function archiveBonusPointRedemptionRequests(
  db: Database,
  tenantId: (typeof bonusPointRedemptionRequests.$inferSelect)["tenantId"],
  id: (typeof bonusPointRedemptionRequests.$inferSelect)["id"],
) {
  return await db
    .update(bonusPointRedemptionRequests)
    .set({ deletedAt: new Date() })
    .where(and(eq(bonusPointRedemptionRequests.tenantId, tenantId), eq(bonusPointRedemptionRequests.id, id)));
}

export async function archiveBonusPointRedemptionRequestsGuarded(
  db: Database,
  tenantId: (typeof bonusPointRedemptionRequests.$inferSelect)["tenantId"],
  id: (typeof bonusPointRedemptionRequests.$inferSelect)["id"],
) {
  await assertGraphGuardrailAllowsRead();
  return archiveBonusPointRedemptionRequests(db, tenantId, id);
}

