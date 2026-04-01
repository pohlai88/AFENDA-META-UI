/**
 * Machine-verifiable seed contract: DB state ↔ tests ↔ scenarios.
 * Not a loose config file — assertions fail CI/E2E when drift occurs.
 */

import { and, isNull, ne, sql } from "drizzle-orm";

import type { db } from "../drizzle/db.js";
import { employees, salesOrders } from "../schema/index.js";
import { SEED_IDS } from "./seed-ids.js";

export type SeedPhase = "foundation" | "business" | "scenario" | "synthetic";

export type SeedDb = typeof db;

export type SeedContractContext = {
  db: SeedDb;
  tenantId: number;
};

export type SeedContract = {
  version: string;
  environment: { tenantLabel: string; seedName: string };
  guarantees: {
    systemUser: boolean;
    defaultTenant: boolean;
    baseCurrency?: string;
  };
  entities: Record<
    string,
    { minCount?: number; exactCount?: number; requiredIds?: readonly string[] }
  >;
  invariants: Array<{
    name: string;
    description: string;
    check: (ctx: SeedContractContext) => Promise<boolean>;
  }>;
  phases: { required: readonly SeedPhase[]; optional?: readonly SeedPhase[] };
};

/** Canonical contract for baseline / demo / stress scenarios (after full seed). */
export const seedContract: SeedContract = {
  version: "v1",
  environment: { tenantLabel: "default", seedName: "canonical" },
  guarantees: {
    systemUser: true,
    defaultTenant: true,
    baseCurrency: "USD",
  },
  entities: {
    tenantRow: { exactCount: 1 },
    systemUser: { minCount: 1 },
    partner: {
      minCount: 4,
      requiredIds: [
        SEED_IDS.partnerAccentCorp,
        SEED_IDS.partnerBetaTech,
        SEED_IDS.partnerGammaServices,
        SEED_IDS.partnerDeltaInc,
      ],
    },
    product: {
      minCount: 6,
      requiredIds: [
        SEED_IDS.productLaptop,
        SEED_IDS.productDesktop,
        SEED_IDS.productMonitor,
        SEED_IDS.productMouse,
        SEED_IDS.productKeyboard,
        SEED_IDS.productLicense,
      ],
    },
    salesOrder: {
      minCount: 4,
      requiredIds: [SEED_IDS.orderOne, SEED_IDS.orderTwo, SEED_IDS.orderThree, SEED_IDS.orderFour],
    },
    employee: {
      minCount: 2,
      requiredIds: [SEED_IDS.hrEmployeeAlexChen, SEED_IDS.hrEmployeeJordanLee],
    },
  },
  invariants: [
    {
      name: "sales_orders_tenant_scope",
      description: "Non-deleted sales orders use the seeded tenant_id",
      check: async ({ db, tenantId }) => {
        const [row] = await db
          .select({ n: sql<number>`count(*)::int` })
          .from(salesOrders)
          .where(and(isNull(salesOrders.deletedAt), ne(salesOrders.tenantId, tenantId)));
        return (row?.n ?? 0) === 0;
      },
    },
    {
      name: "hr_employees_tenant_scope",
      description: "Non-deleted HR employees use the seeded tenant_id",
      check: async ({ db, tenantId }) => {
        const [row] = await db
          .select({ n: sql<number>`count(*)::int` })
          .from(employees)
          .where(and(isNull(employees.deletedAt), ne(employees.tenantId, tenantId)));
        return (row?.n ?? 0) === 0;
      },
    },
  ],
  phases: {
    required: ["foundation", "business"],
    optional: ["scenario", "synthetic"],
  },
};
