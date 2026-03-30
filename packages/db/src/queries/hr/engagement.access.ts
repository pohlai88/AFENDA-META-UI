// @generated
// Full access scaffold — tools/ci-gate/db-access-layer (emit-full).
// Human-owned reporting: use separate modules (not *.access.ts).

import { and, eq, isNull } from "drizzle-orm";
import type { Database } from "../../db.js";
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

/** List all rows for tenant including soft-deleted. */
export async function listBonusPointRulesAll(
  db: Database,
  tenantId: (typeof bonusPointRules.$inferSelect)["tenantId"],
) {
  return await db.select().from(bonusPointRules).where(eq(bonusPointRules.tenantId, tenantId));
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

/** List all rows for tenant including soft-deleted. */
export async function listBonusPointRewardCatalogAll(
  db: Database,
  tenantId: (typeof bonusPointRewardCatalog.$inferSelect)["tenantId"],
) {
  return await db
    .select()
    .from(bonusPointRewardCatalog)
    .where(eq(bonusPointRewardCatalog.tenantId, tenantId));
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

/** List all rows for tenant including soft-deleted. */
export async function listEmployeeBonusPointsAll(
  db: Database,
  tenantId: (typeof employeeBonusPoints.$inferSelect)["tenantId"],
) {
  return await db.select().from(employeeBonusPoints).where(eq(employeeBonusPoints.tenantId, tenantId));
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

/** List all rows for tenant including soft-deleted. */
export async function listBonusPointTransactionsAll(
  db: Database,
  tenantId: (typeof bonusPointTransactions.$inferSelect)["tenantId"],
) {
  return await db.select().from(bonusPointTransactions).where(eq(bonusPointTransactions.tenantId, tenantId));
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

/** List rows for tenant excluding soft-deleted. */
export async function listBonusPointRedemptionRequestsActive(
  db: Database,
  tenantId: (typeof bonusPointRedemptionRequests.$inferSelect)["tenantId"],
) {
  return await db
    .select()
    .from(bonusPointRedemptionRequests)
    .where(
      and(eq(bonusPointRedemptionRequests.tenantId, tenantId), isNull(bonusPointRedemptionRequests.deletedAt)),
    );
}

/** List all rows for tenant including soft-deleted. */
export async function listBonusPointRedemptionRequestsAll(
  db: Database,
  tenantId: (typeof bonusPointRedemptionRequests.$inferSelect)["tenantId"],
) {
  return await db
    .select()
    .from(bonusPointRedemptionRequests)
    .where(eq(bonusPointRedemptionRequests.tenantId, tenantId));
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
    .where(
      and(eq(bonusPointRedemptionRequests.tenantId, tenantId), eq(bonusPointRedemptionRequests.id, id)),
    );
}
