import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  ensureTestEnv,
  selectMock,
  insertMock,
  updateMock,
  queueSelect,
  setInsertResult,
  setUpdateResult,
} = vi.hoisted(() => {
  process.env.DATABASE_URL ??= "postgres://postgres:postgres@localhost:5432/afenda_test";

  const selectQueue: unknown[][] = [];
  let insertResult: unknown[] = [];
  let updateResult: unknown[] = [];

  const createSelectChain = (rows: unknown[]) => {
    const chain = {
      from: vi.fn(() => chain),
      where: vi.fn(() => chain),
      orderBy: vi.fn(() => chain),
      limit: vi.fn(async () => rows),
      then: (resolve: (value: unknown[]) => unknown) => Promise.resolve(rows).then(resolve),
    };

    return chain;
  };

  return {
    ensureTestEnv: true,
    selectMock: vi.fn(() => createSelectChain(selectQueue.shift() ?? [])),
    insertMock: vi.fn(() => ({
      values: vi.fn(() => ({
        returning: vi.fn(async () => insertResult),
      })),
    })),
    updateMock: vi.fn(() => ({
      set: vi.fn(() => ({
        where: vi.fn(() => ({
          returning: vi.fn(async () => updateResult),
        })),
      })),
    })),
    queueSelect: (...rows: unknown[][]) => {
      selectQueue.push(...rows);
    },
    setInsertResult: (rows: unknown[]) => {
      insertResult = rows;
    },
    setUpdateResult: (rows: unknown[]) => {
      updateResult = rows;
    },
  };
});

void ensureTestEnv;

vi.mock("../../db/index.js", () => ({
  db: {
    select: selectMock,
    insert: insertMock,
    update: updateMock,
  },
}));

import { ConflictError, ValidationError } from "../../middleware/errorHandler.js";
import {
  approveCommissionEntries,
  generateCommissionForOrder,
  getCommissionReport,
  payCommissionEntries,
} from "./commission-service.js";

const order = {
  id: "order-1",
  tenantId: 7,
  userId: 21,
  orderDate: new Date("2026-03-15T12:00:00.000Z"),
  amountUntaxed: "2400.00",
  deletedAt: null,
} as const;

const plan = {
  id: "plan-1",
  tenantId: 7,
  name: "Revenue Plan",
  type: "percentage",
  base: "revenue",
  isActive: true,
  deletedAt: null,
} as const;

const tier = {
  id: "tier-1",
  tenantId: 7,
  planId: plan.id,
  minAmount: "0.00",
  maxAmount: "5000.00",
  rate: "10.0000",
  sequence: 10,
} as const;

beforeEach(() => {
  vi.clearAllMocks();
});

describe("sales commission service", () => {
  it("creates a commission entry from DB-loaded order and plan data", async () => {
    queueSelect([order], [plan], [tier], []);
    setInsertResult([
      {
        id: "entry-1",
        tenantId: 7,
        orderId: order.id,
        salespersonId: 21,
        planId: plan.id,
        baseAmount: "2400.00",
        commissionAmount: "240.00",
        status: "draft",
        paidDate: null,
      },
    ]);

    const result = await generateCommissionForOrder({
      tenantId: 7,
      actorId: 21,
      orderId: order.id,
      planId: plan.id,
    });

    expect(result.persistence).toBe("created");
    expect(result.calculation.commissionAmount).toBe("240.00");
    expect(result.entry.id).toBe("entry-1");
    expect(insertMock).toHaveBeenCalledTimes(1);
  });

  it("updates an existing unpaid commission entry when replaceExisting is enabled", async () => {
    queueSelect(
      [order],
      [plan],
      [tier],
      [
        {
          id: "entry-1",
          tenantId: 7,
          orderId: order.id,
          salespersonId: 21,
          planId: plan.id,
          createdBy: 99,
          notes: "old",
          status: "draft",
          paidDate: null,
        },
      ]
    );
    setUpdateResult([
      {
        id: "entry-1",
        tenantId: 7,
        orderId: order.id,
        salespersonId: 21,
        planId: plan.id,
        baseAmount: "2400.00",
        commissionAmount: "240.00",
        status: "approved",
        paidDate: null,
      },
    ]);

    const result = await generateCommissionForOrder({
      tenantId: 7,
      actorId: 21,
      orderId: order.id,
      planId: plan.id,
      status: "approved",
      replaceExisting: true,
    });

    expect(result.persistence).toBe("updated");
    expect(updateMock).toHaveBeenCalledTimes(1);
  });

  it("fails when a duplicate commission entry exists and replaceExisting is false", async () => {
    queueSelect(
      [order],
      [plan],
      [tier],
      [
        {
          id: "entry-1",
          tenantId: 7,
          orderId: order.id,
          salespersonId: 21,
          planId: plan.id,
          createdBy: 99,
          notes: null,
          status: "draft",
          paidDate: null,
        },
      ]
    );

    await expect(
      generateCommissionForOrder({
        tenantId: 7,
        actorId: 21,
        orderId: order.id,
        planId: plan.id,
      })
    ).rejects.toBeInstanceOf(ConflictError);
  });

  it("requires explicit profit data for profit-based plans", async () => {
    queueSelect(
      [order],
      [
        {
          ...plan,
          id: "plan-profit",
          base: "profit",
        },
      ],
      [
        {
          ...tier,
          planId: "plan-profit",
        },
      ]
    );

    await expect(
      generateCommissionForOrder({
        tenantId: 7,
        actorId: 21,
        orderId: order.id,
        planId: "plan-profit",
      })
    ).rejects.toBeInstanceOf(ValidationError);
  });

  it("uses territory default salesperson when order has no assigned user", async () => {
    queueSelect(
      [{ ...order, userId: null, partnerId: "partner-1" }],
      [plan],
      [tier],
      [
        {
          id: "partner-1",
          tenantId: 7,
          countryId: 840,
          stateId: 5,
          deletedAt: null,
        },
      ],
      [
        {
          id: "rule-1",
          tenantId: 7,
          territoryId: "territory-1",
          countryId: 840,
          stateId: 5,
          zipFrom: null,
          zipTo: null,
          priority: 20,
          isActive: true,
          deletedAt: null,
        },
      ],
      [
        {
          id: "territory-1",
          tenantId: 7,
          code: "NA-WEST",
          teamId: "team-1",
          defaultSalespersonId: 77,
          isActive: true,
          deletedAt: null,
        },
      ],
      []
    );
    setInsertResult([
      {
        id: "entry-2",
        tenantId: 7,
        orderId: order.id,
        salespersonId: 77,
        planId: plan.id,
        baseAmount: "2400.00",
        commissionAmount: "240.00",
        status: "draft",
        paidDate: null,
      },
    ]);

    const result = await generateCommissionForOrder({
      tenantId: 7,
      actorId: 21,
      orderId: order.id,
      planId: plan.id,
    });

    expect(result.assignment.salespersonId).toBe(77);
    expect(result.assignment.selectedBy).toBe("territory_default");
    expect(result.entry.salespersonId).toBe(77);
  });

  it("approves draft commission entries and leaves approved entries unchanged", async () => {
    queueSelect([
      {
        id: "entry-draft",
        tenantId: 7,
        status: "draft",
        paidDate: null,
        salespersonId: 21,
        periodStart: new Date("2026-03-01T00:00:00.000Z"),
        periodEnd: new Date("2026-03-31T23:59:59.000Z"),
        deletedAt: null,
      },
      {
        id: "entry-approved",
        tenantId: 7,
        status: "approved",
        paidDate: null,
        salespersonId: 21,
        periodStart: new Date("2026-03-01T00:00:00.000Z"),
        periodEnd: new Date("2026-03-31T23:59:59.000Z"),
        deletedAt: null,
      },
    ]);
    setUpdateResult([
      {
        id: "entry-draft",
        tenantId: 7,
        status: "approved",
        paidDate: null,
      },
    ]);

    const result = await approveCommissionEntries({
      tenantId: 7,
      actorId: 21,
      salespersonId: 21,
    });

    expect(result.updatedCount).toBe(1);
    expect(result.unchangedCount).toBe(1);
  });

  it("blocks paying draft entries directly", async () => {
    queueSelect([
      {
        id: "entry-draft",
        tenantId: 7,
        status: "draft",
        paidDate: null,
        salespersonId: 21,
        periodStart: new Date("2026-03-01T00:00:00.000Z"),
        periodEnd: new Date("2026-03-31T23:59:59.000Z"),
        deletedAt: null,
      },
    ]);

    await expect(
      payCommissionEntries({
        tenantId: 7,
        actorId: 21,
      })
    ).rejects.toBeInstanceOf(ValidationError);
  });

  it("returns filtered commission report with summary totals", async () => {
    queueSelect([
      {
        id: "entry-1",
        tenantId: 7,
        status: "draft",
        baseAmount: "1000.00",
        commissionAmount: "100.00",
        salespersonId: 21,
        periodStart: new Date("2026-03-01T00:00:00.000Z"),
        periodEnd: new Date("2026-03-31T23:59:59.000Z"),
        createdAt: new Date("2026-03-15T00:00:00.000Z"),
        deletedAt: null,
      },
      {
        id: "entry-2",
        tenantId: 7,
        status: "approved",
        baseAmount: "500.00",
        commissionAmount: "50.00",
        salespersonId: 22,
        periodStart: new Date("2026-03-01T00:00:00.000Z"),
        periodEnd: new Date("2026-03-31T23:59:59.000Z"),
        createdAt: new Date("2026-03-14T00:00:00.000Z"),
        deletedAt: null,
      },
    ]);

    const result = await getCommissionReport({
      tenantId: 7,
      salespersonId: 21,
    });

    expect(result.entries).toHaveLength(1);
    expect(result.summary.count).toBe(1);
    expect(result.summary.commissionAmountTotal).toBe("100.00");
  });
});
