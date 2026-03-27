import express from "express";
import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { ensureTestEnv } = vi.hoisted(() => {
  process.env.DATABASE_URL ??= "postgres://postgres:postgres@localhost:5432/afenda_test";
  return { ensureTestEnv: true };
});

void ensureTestEnv;

const { selectMock } = vi.hoisted(() => ({
  selectMock: vi.fn(),
}));

vi.mock("../db/index.js", () => ({
  db: {
    select: (...args: unknown[]) => selectMock(...args),
  },
}));

import opsRouter from "./ops.js";
import { errorHandler } from "../middleware/errorHandler.js";

function createApp(session?: Record<string, unknown>) {
  const app = express();
  app.use(express.json());
  app.use((req, _res, next) => {
    req.session = session as typeof req.session;
    next();
  });
  app.use("/api/ops", opsRouter);
  app.use(errorHandler);
  return app;
}

function createListQuery<T>(rows: T[]) {
  return {
    where: vi.fn().mockReturnThis(),
    orderBy: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    offset: vi.fn().mockResolvedValue(rows),
  };
}

function createCountQuery(count: number) {
  return {
    where: vi.fn().mockResolvedValue([{ count }]),
  };
}

function createStatsQuery<T>(rows: T[]) {
  return {
    from: vi.fn().mockResolvedValue(rows),
  };
}

function createFromQuery<T>(query: T) {
  return {
    from: vi.fn().mockReturnValue(query),
  };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("/api/ops positive-path responses", () => {
  it("returns invariant violations list with pagination meta", async () => {
    const listRows = [
      {
        id: "inv-1",
        tenantId: 7,
        invariantCode: "SO_TOTAL_NON_NEGATIVE",
        entityType: "sales_order",
        entityId: "so-1",
        status: "fail",
        severity: "error",
        expectedValue: ">= 0",
        actualValue: "-1",
        context: null,
        evaluatedAt: new Date("2026-03-27T00:00:00.000Z"),
        createdBy: 21,
        updatedBy: 21,
      },
    ];

    const listQuery = createListQuery(listRows);
    const countQuery = createCountQuery(1);

    selectMock
      .mockImplementationOnce(() => createFromQuery(listQuery))
      .mockImplementationOnce(() => createFromQuery(countQuery));

    const response = await request(createApp({ uid: "21", roles: ["admin"] })).get(
      "/api/ops/invariant-violations?status=fail&page=1&limit=50"
    );

    expect(response.status).toBe(200);
    expect(response.body.data).toHaveLength(1);
    expect(response.body.meta.total).toBe(1);
    expect(response.body.meta.filters.status).toBe("fail");
  });

  it("returns invariant violation stats", async () => {
    const statsRows = [
      {
        total: 10,
        passCount: 6,
        failCount: 2,
        warningCount: 2,
        errorSeverityCount: 2,
        warningSeverityCount: 2,
        infoSeverityCount: 6,
        recentFailures24h: 1,
      },
    ];

    selectMock.mockImplementationOnce(() => createStatsQuery(statsRows));

    const response = await request(createApp({ uid: "21", roles: ["admin"] })).get(
      "/api/ops/invariant-violations/stats"
    );

    expect(response.status).toBe(200);
    expect(response.body.total).toBe(10);
    expect(response.body.byStatus.fail).toBe(2);
    expect(response.body.recentFailures24h).toBe(1);
  });

  it("returns domain events list with filters metadata", async () => {
    const eventRows = [
      {
        id: "evt-1",
        tenantId: 7,
        eventType: "order.created",
        entityType: "sales_order",
        entityId: "so-1",
        payload: "{\"id\":\"so-1\"}",
        triggeredBy: 21,
        createdAt: new Date("2026-03-27T00:00:00.000Z"),
      },
    ];

    const listQuery = createListQuery(eventRows);
    const countQuery = createCountQuery(1);

    selectMock
      .mockImplementationOnce(() => createFromQuery(listQuery))
      .mockImplementationOnce(() => createFromQuery(countQuery));

    const response = await request(createApp({ uid: "21", roles: ["admin"] })).get(
      "/api/ops/domain-events?eventType=order.created&entityType=sales_order&page=1&limit=50"
    );

    expect(response.status).toBe(200);
    expect(response.body.data).toHaveLength(1);
    expect(response.body.meta.total).toBe(1);
    expect(response.body.meta.filters.eventType).toBe("order.created");
    expect(response.body.meta.filters.entityType).toBe("sales_order");
  });
});

describe("/api/ops routes auth contract", () => {
  it("returns 401 for invariant violations list without auth", async () => {
    const response = await request(createApp()).get("/api/ops/invariant-violations");
    expect(response.status).toBe(401);
  });

  it("returns 401 for invariant stats without auth", async () => {
    const response = await request(createApp()).get("/api/ops/invariant-violations/stats");
    expect(response.status).toBe(401);
  });

  it("returns 401 for domain events list without auth", async () => {
    const response = await request(createApp()).get("/api/ops/domain-events");
    expect(response.status).toBe(401);
  });
});