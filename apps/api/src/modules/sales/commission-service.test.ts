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
import { generateCommissionForOrder } from "./commission-service.js";

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
});