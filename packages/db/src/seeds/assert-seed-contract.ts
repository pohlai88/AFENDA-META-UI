import { and, count, eq, isNull, sql } from "drizzle-orm";

import {
  currencies,
  employees,
  partners,
  products,
  salesOrders,
  tenants,
  users,
} from "../schema/index.js";
import {
  type SeedContract,
  type SeedContractContext,
  type SeedDb,
  seedContract,
} from "./seed.contract.js";
import {
  DEFAULT_TENANT_ID,
  DEFAULT_SYSTEM_USER_EMAIL,
  DEFAULT_TENANT_CODE,
} from "./seed-types.js";

export class SeedContractError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SeedContractError";
  }
}

async function countTenantScoped(
  db: SeedDb,
  tenantId: number,
  table: typeof employees | typeof partners | typeof products | typeof salesOrders
): Promise<number> {
  const [row] = await db
    .select({ n: count() })
    .from(table)
    .where(and(eq(table.tenantId, tenantId), isNull(table.deletedAt)));
  return Number(row?.n ?? 0);
}

async function resolveEntityCount(
  ctx: SeedContractContext,
  key: string
): Promise<number> {
  const { db, tenantId } = ctx;
  switch (key) {
    case "tenantRow": {
      const [row] = await db
        .select({ n: count() })
        .from(tenants)
        .where(
          and(
            sql`lower(${tenants.tenantCode}) = lower(${DEFAULT_TENANT_CODE})`,
            isNull(tenants.deletedAt)
          )
        );
      return Number(row?.n ?? 0);
    }
    case "systemUser": {
      const [row] = await db
        .select({ n: count() })
        .from(users)
        .where(
          and(
            eq(users.tenantId, tenantId),
            isNull(users.deletedAt),
            sql`lower(${users.email}) = lower(${DEFAULT_SYSTEM_USER_EMAIL})`
          )
        );
      return Number(row?.n ?? 0);
    }
    case "partner":
      return countTenantScoped(db, tenantId, partners);
    case "product":
      return countTenantScoped(db, tenantId, products);
    case "salesOrder":
      return countTenantScoped(db, tenantId, salesOrders);
    case "employee":
      return countTenantScoped(db, tenantId, employees);
    default:
      throw new SeedContractError(`[seed.contract] unknown entity key: ${key}`);
  }
}

async function assertRequiredIds(
  ctx: SeedContractContext,
  key: string,
  ids: readonly string[]
): Promise<void> {
  const { db, tenantId } = ctx;
  const table =
    key === "partner"
      ? partners
      : key === "product"
        ? products
        : key === "salesOrder"
          ? salesOrders
          : key === "employee"
            ? employees
            : null;
  if (!table) {
    throw new SeedContractError(`[seed.contract] requiredIds not supported for entity: ${key}`);
  }
  for (const id of ids) {
    const [row] = await db
      .select({ one: sql`1` })
      .from(table)
      .where(and(eq(table.id, id), eq(table.tenantId, tenantId), isNull(table.deletedAt)))
      .limit(1);
    if (!row) {
      throw new SeedContractError(`[seed.contract] ${key} missing required id ${id}`);
    }
  }
}

async function assertGuarantees(ctx: SeedContractContext, contract: SeedContract): Promise<void> {
  const { db, tenantId } = ctx;
  const g = contract.guarantees;
  if (g.defaultTenant) {
    const [row] = await db
      .select()
      .from(tenants)
      .where(
        and(
          sql`lower(${tenants.tenantCode}) = lower(${DEFAULT_TENANT_CODE})`,
          isNull(tenants.deletedAt)
        )
      )
      .limit(1);
    if (!row) {
      throw new SeedContractError(
        `[seed.contract] default tenant missing (code=${DEFAULT_TENANT_CODE})`
      );
    }
  }
  if (g.systemUser) {
    const [row] = await db
      .select()
      .from(users)
      .where(
        and(
          eq(users.tenantId, tenantId),
          isNull(users.deletedAt),
          sql`lower(${users.email}) = lower(${DEFAULT_SYSTEM_USER_EMAIL})`
        )
      )
      .limit(1);
    if (!row) {
      throw new SeedContractError(`[seed.contract] system user missing (${DEFAULT_SYSTEM_USER_EMAIL})`);
    }
  }
  if (g.baseCurrency) {
    const code = g.baseCurrency.toUpperCase();
    const [row] = await db
      .select()
      .from(currencies)
      .where(and(isNull(currencies.deletedAt), sql`upper(${currencies.code}) = ${code}`))
      .limit(1);
    if (!row) {
      throw new SeedContractError(`[seed.contract] base currency ${g.baseCurrency} missing`);
    }
  }
}

/**
 * Validates DB state against the seed contract. Throws SeedContractError on failure.
 */
export async function assertSeedContract(
  db: SeedDb,
  options: { tenantId: number; contract?: SeedContract }
): Promise<void> {
  const contract = options.contract ?? seedContract;
  const ctx: SeedContractContext = { db, tenantId: options.tenantId };

  await assertGuarantees(ctx, contract);

  for (const [key, rules] of Object.entries(contract.entities)) {
    const n = await resolveEntityCount(ctx, key);
    if (rules.exactCount !== undefined && n !== rules.exactCount) {
      throw new SeedContractError(
        `[seed.contract] entity "${key}" expected count ${rules.exactCount}, got ${n}`
      );
    }
    if (rules.minCount !== undefined && n < rules.minCount) {
      throw new SeedContractError(
        `[seed.contract] entity "${key}" expected count >= ${rules.minCount}, got ${n}`
      );
    }
    if (rules.requiredIds?.length) {
      await assertRequiredIds(ctx, key, rules.requiredIds);
    }
  }

  for (const inv of contract.invariants) {
    const ok = await inv.check(ctx);
    if (!ok) {
      throw new SeedContractError(`[seed.contract] invariant failed: ${inv.name}`);
    }
  }
}
