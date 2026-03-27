import { beforeEach, describe, expect, it, vi } from "vitest";

const { ensureTestEnv, selectMock, updateMock, queueSelect, setUpdateResult } = vi.hoisted(() => {
  process.env.DATABASE_URL ??= "postgres://postgres:postgres@localhost:5432/afenda_test";

  const selectQueue: unknown[][] = [];
  let updateResult: unknown[] = [];

  const createSelectChain = () => {
    const chain = {
      from: vi.fn(() => chain),
      where: vi.fn(() => chain),
      orderBy: vi.fn(() => chain),
      limit: vi.fn(() => chain),
      prepare: vi.fn(() => ({
        execute: vi.fn(async () => selectQueue.shift() ?? []),
      })),
      then: (resolve: (value: unknown[]) => unknown) => {
        const rows = selectQueue.shift() ?? [];
        return Promise.resolve(rows).then(resolve);
      },
    };

    return chain;
  };

  return {
    ensureTestEnv: true,
    selectMock: vi.fn(() => createSelectChain()),
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
    setUpdateResult: (rows: unknown[]) => {
      updateResult = rows;
    },
  };
});

void ensureTestEnv;

vi.mock("../../../db/index.js", () => ({
  db: {
    select: selectMock,
    update: updateMock,
  },
}));

import { ValidationError } from "../../../middleware/errorHandler.js";
import {
  expireConsignmentAgreementIfNeeded,
  generateConsignmentInvoiceDraft,
  validateConsignmentStockReport,
} from "../consignment-service.js";

const report = {
  id: "report-1",
  tenantId: 7,
  agreementId: "agreement-1",
  status: "confirmed",
  deletedAt: null,
} as const;

const agreement = {
  id: "agreement-1",
  tenantId: 7,
  partnerId: "partner-1",
  status: "active",
  startDate: new Date("2026-01-01T00:00:00.000Z"),
  endDate: new Date("2026-03-01T00:00:00.000Z"),
  deletedAt: null,
} as const;

const lines = [
  {
    id: "line-1",
    tenantId: 7,
    reportId: "report-1",
    productId: "product-1",
    openingQty: "10",
    receivedQty: "5",
    soldQty: "8",
    returnedQty: "1",
    closingQty: "6",
    unitPrice: "25.00",
    lineTotal: "200.00",
  },
] as const;

beforeEach(() => {
  vi.clearAllMocks();
});

describe("consignment service", () => {
  it("loads and validates consignment stock report data", async () => {
    queueSelect([report], [agreement], [...lines]);

    const result = await validateConsignmentStockReport({
      tenantId: 7,
      reportId: report.id,
    });

    expect(result.validation.valid).toBe(true);
    expect(result.lines).toHaveLength(1);
  });

  it("throws validation error when invoice draft is requested for invalid report lines", async () => {
    queueSelect(
      [report],
      [agreement],
      [
        {
          ...lines[0],
          closingQty: "7",
        },
      ]
    );

    await expect(
      generateConsignmentInvoiceDraft({
        tenantId: 7,
        reportId: report.id,
      })
    ).rejects.toBeInstanceOf(ValidationError);
  });

  it("generates an invoice draft for sold consignment quantities", async () => {
    queueSelect([report], [agreement], [...lines]);

    const result = await generateConsignmentInvoiceDraft({
      tenantId: 7,
      reportId: report.id,
    });

    expect(result.draft.lines).toHaveLength(1);
    expect(result.draft.amountUntaxed.toFixed(2)).toBe("200.00");
  });

  it("updates agreement status when it has expired", async () => {
    queueSelect([
      {
        ...agreement,
        status: "active",
        endDate: new Date("2026-02-01T00:00:00.000Z"),
      },
    ]);
    setUpdateResult([
      {
        ...agreement,
        status: "expired",
      },
    ]);

    const result = await expireConsignmentAgreementIfNeeded({
      tenantId: 7,
      agreementId: agreement.id,
      actorId: 99,
      evaluatedAt: new Date("2026-03-10T00:00:00.000Z"),
    });

    expect(result.persistence).toBe("updated");
    expect(result.agreement.status).toBe("expired");
    expect(updateMock).toHaveBeenCalledTimes(1);
  });

  it("does not update agreement status when still active in date range", async () => {
    queueSelect([
      {
        ...agreement,
        status: "active",
        endDate: new Date("2026-12-01T00:00:00.000Z"),
      },
    ]);

    const result = await expireConsignmentAgreementIfNeeded({
      tenantId: 7,
      agreementId: agreement.id,
      actorId: 99,
      evaluatedAt: new Date("2026-03-10T00:00:00.000Z"),
    });

    expect(result.persistence).toBe("unchanged");
    expect(updateMock).not.toHaveBeenCalled();
  });
});
