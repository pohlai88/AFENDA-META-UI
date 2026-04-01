import { beforeEach, describe, expect, it, vi } from "vitest";

const { ensureTestEnv, selectMock, updateMock, insertMock, queueSelect, queueClear, setUpdateResult } =
  vi.hoisted(() => {
    process.env.DATABASE_URL ??= "postgres://postgres:postgres@localhost:5432/afenda_test";

    const selectQueue: unknown[][] = [];
    let updateResult: unknown[] = [];

    const createSelectChain = (rows: unknown[]) => {
      const chain = {
        from: vi.fn(() => chain),
        leftJoin: vi.fn(() => chain),
        where: vi.fn(() => chain),
        orderBy: vi.fn(() => chain),
        limit: vi.fn(async () => rows),
        prepare: vi.fn(() => ({
          execute: vi.fn(async () => rows),
        })),
        then: (resolve: (value: unknown[]) => unknown) => Promise.resolve(rows).then(resolve),
      };

      return chain;
    };

    return {
      ensureTestEnv: true,
      selectMock: vi.fn(() => createSelectChain(selectQueue.shift() ?? [])),
      updateMock: vi.fn(() => ({
        set: vi.fn(() => ({
          where: vi.fn(() => ({
            returning: vi.fn(async () => updateResult),
          })),
        })),
      })),
      insertMock: vi.fn(() => ({
        values: vi.fn(async () => []),
      })),
      queueSelect: (...rows: unknown[][]) => {
        selectQueue.push(...rows);
      },
      queueClear: () => {
        selectQueue.length = 0;
      },
      setUpdateResult: (rows: unknown[]) => {
        updateResult = rows;
      },
    };
  });

void ensureTestEnv;

let mockValidationResult: {
  valid: boolean;
  issues: Array<{ code: string; severity: "error" | "warning" | "info"; message: string }>;
  errors: string[];
  lineChecks: unknown[];
} = {
  valid: true,
  issues: [],
  errors: [],
  lineChecks: [],
};

vi.mock("../logic/subscription-engine.js", () => ({
  validateSubscription: vi.fn(() => mockValidationResult),
  computeMRR: vi.fn(() => ({
    lineTotal: { toDecimalPlaces: () => ({ toString: () => "200.00" }) },
    periodMultiplier: { toString: () => "1" },
    mrr: { toString: () => "200.00" },
    arr: { toString: () => "2400.00" },
  })),
  computeNextInvoiceDate: vi.fn(() => new Date("2026-02-05T00:00:00.000Z")),
  subscriptionStateMachine: {
    assertTransition: vi.fn((from: string, to: string, context?: Record<string, unknown>) => {
      if (from === to) {
        throw new Error(`Invalid state transition: '${from}' → '${to}'`);
      }
      if (from === "draft" && to === "active" && context?.hasLines === true) return;
      if (from === "active" && to === "paused") return;
      if (from === "paused" && to === "active") return;
      if (from === "past_due" && to === "active" && context?.paymentResolved === true) return;
      if (
        (from === "draft" || from === "active" || from === "paused" || from === "past_due") &&
        to === "cancelled" &&
        context?.hasCloseReason === true
      )
        return;
      throw new Error(`Invalid state transition: '${from}' → '${to}'`);
    }),
  },
}));

vi.mock("../../../utils/audit-logs.js", () => ({
  recordDomainEvent: vi.fn(),
  recordValidationIssues: vi.fn(),
}));

vi.mock("../../../db/index.js", () => ({
  db: {
    select: selectMock,
    selectDistinct: selectMock,
    update: updateMock,
    insert: insertMock,
  },
}));

vi.mock("@afenda/db", () => ({
  relations: {},
  schema: {},
  eq: vi.fn(),
  and: vi.fn(),
  or: vi.fn(),
  sql: vi.fn(),
}));

vi.mock("@afenda/db/schema/sales", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@afenda/db/schema/sales")>();
  return actual;
});

import { ValidationError } from "../../../middleware/errorHandler.js";
import {
  activateSubscription,
  cancelSubscription,
  pauseSubscription,
  renewSubscription,
  resumeSubscription,
  validateSubscription,
} from "../subscription-service.js";

const subscription = {
  id: "sub-1",
  tenantId: 7,
  templateId: "tmpl-1",
  status: "draft" as const,
  dateStart: new Date("2026-01-01T00:00:00.000Z"),
  billingAnchorDate: new Date("2026-01-01T00:00:00.000Z"),
  dateEnd: null,
  nextInvoiceDate: new Date("2026-01-05T00:00:00.000Z"),
  recurringTotal: "200.00",
  mrr: "200.00",
  arr: "2400.00",
  truthRevision: 1,
  pricingLockedAt: null,
  pricingSnapshot: {},
  currencyId: null as number | null,
  closeReasonId: null,
  lastInvoicedAt: null,
  deletedAt: null,
};

const template = {
  id: "tmpl-1",
  tenantId: 7,
  billingPeriod: "monthly" as const,
  billingDay: 5,
  renewalPeriod: 1,
  deletedAt: null,
};

const lines = [
  {
    id: "line-1",
    tenantId: 7,
    subscriptionId: "sub-1",
    productId: "prod-1",
    quantity: "2.0000",
    priceUnit: "100.00",
    discount: "0.00",
    subtotal: "200.00",
  },
];

beforeEach(() => {
  vi.clearAllMocks();
  queueClear();
  mockValidationResult = {
    valid: true,
    issues: [],
    errors: [],
    lineChecks: [],
  };
  setUpdateResult([]);
});

describe("subscription service", () => {
  it("validates subscription entities", async () => {
    queueSelect([subscription], [template], [...lines]);

    const result = await validateSubscription({
      tenantId: 7,
      subscriptionId: "sub-1",
    });

    expect(result.validation.valid).toBe(true);
    expect(result.lines).toHaveLength(1);
  });

  it("activates a valid draft subscription", async () => {
    queueSelect(
      [subscription],
      [template],
      [...lines],
      [{ currencyId: 1 }],
      [{ maxRev: 0 }]
    );
    setUpdateResult([
      {
        ...subscription,
        status: "active",
        truthRevision: 2,
      },
    ]);

    const result = await activateSubscription({
      tenantId: 7,
      subscriptionId: "sub-1",
      actorId: 99,
    });

    expect(result.subscription.status).toBe("active");
    expect(updateMock).toHaveBeenCalledTimes(1);
    expect(insertMock).toHaveBeenCalledTimes(2);
  });

  it("fails activation when validation has errors", async () => {
    mockValidationResult = {
      valid: false,
      issues: [{ code: "SUB-1", severity: "error", message: "Subscription must have lines" }],
      errors: ["Subscription must have lines"],
      lineChecks: [],
    };

    queueSelect([subscription], [template], []);

    await expect(
      activateSubscription({
        tenantId: 7,
        subscriptionId: "sub-1",
        actorId: 99,
      })
    ).rejects.toBeInstanceOf(ValidationError);
  });

  it("pauses an active subscription", async () => {
    queueSelect([{ ...subscription, status: "active" }]);
    setUpdateResult([{ ...subscription, status: "paused" }]);

    const result = await pauseSubscription({
      tenantId: 7,
      subscriptionId: "sub-1",
      actorId: 99,
    });

    expect(result.subscription.status).toBe("paused");
  });

  it("resumes a paused subscription", async () => {
    queueSelect([{ ...subscription, status: "paused" }], [template]);
    setUpdateResult([{ ...subscription, status: "active", truthRevision: 2 }]);

    const result = await resumeSubscription({
      tenantId: 7,
      subscriptionId: "sub-1",
      actorId: 99,
      reason: "Customer requested resume",
    });

    expect(result.subscription.status).toBe("active");
  });

  it("cancels a subscription with close reason", async () => {
    queueSelect([{ ...subscription, status: "active" }], [{ id: "close-1", tenantId: 7 }]);
    setUpdateResult([
      { ...subscription, status: "cancelled", closeReasonId: "close-1", mrr: "0.00", arr: "0.00" },
    ]);

    const result = await cancelSubscription({
      tenantId: 7,
      subscriptionId: "sub-1",
      actorId: 99,
      closeReasonId: "close-1",
    });

    expect(result.subscription.status).toBe("cancelled");
    expect(result.subscription.mrr).toBe("0.00");
  });

  it("renews an active subscription", async () => {
    queueSelect(
      [{ ...subscription, status: "active", dateEnd: new Date("2026-12-31T00:00:00.000Z") }],
      [template],
      [...lines],
      [{ maxRev: 0 }]
    );
    setUpdateResult([
      {
        ...subscription,
        status: "active",
        nextInvoiceDate: new Date("2026-02-05T00:00:00.000Z"),
      },
    ]);

    const result = await renewSubscription({
      tenantId: 7,
      subscriptionId: "sub-1",
      actorId: 99,
    });

    expect(result.subscription.status).toBe("active");
    expect(updateMock).toHaveBeenCalledTimes(1);
    expect(insertMock).toHaveBeenCalledTimes(2);
  });
});
