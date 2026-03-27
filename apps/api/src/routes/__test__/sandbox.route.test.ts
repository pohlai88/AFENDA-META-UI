import express from "express";
import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { ensureTestEnv } = vi.hoisted(() => {
  process.env.DATABASE_URL ??= "postgres://postgres:postgres@localhost:5432/afenda_test";
  return { ensureTestEnv: true };
});

void ensureTestEnv;

import sandboxRouter from "../sandbox.js";
import { errorHandler } from "../../middleware/errorHandler.js";

function createApp(session?: Record<string, unknown>) {
  const app = express();
  app.use(express.json());
  app.use((req, _res, next) => {
    req.session = session as typeof req.session;
    next();
  });
  app.use("/api/sandbox", sandboxRouter);
  app.use(errorHandler);
  return app;
}

describe("/api/sandbox/simulate route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 200 for a valid simulation payload", async () => {
    const response = await request(createApp({ uid: "21", roles: ["admin"] }))
      .post("/api/sandbox/simulate")
      .send({
        scenario: {
          id: "scenario-1",
          name: "Sales sanity",
          entity: "sales_order",
          record: { total_amount: 100 },
          actor: { uid: "21", roles: ["admin"] },
          operation: "create",
        },
        policies: [
          {
            id: "policy-1",
            scope: "sales_order",
            name: "Positive total",
            validate: "total_amount > 0",
            message: "Total must be positive",
            severity: "error",
          },
        ],
      });

    expect(response.status).toBe(200);
    expect(response.body.aggregate).toBeDefined();
    expect(Array.isArray(response.body.results)).toBe(true);
    expect(response.body.results).toHaveLength(1);
  });

  it("returns 400 for invalid payload", async () => {
    const response = await request(createApp({ uid: "21", roles: ["admin"] }))
      .post("/api/sandbox/simulate")
      .send({
        scenario: {
          id: "",
        },
      });

    expect(response.status).toBe(400);
    expect(response.body.code).toBe("VALIDATION_ERROR");
  });

  it("returns 401 when authentication is missing", async () => {
    const response = await request(createApp())
      .post("/api/sandbox/simulate")
      .send({
        scenario: {
          id: "scenario-1",
          name: "Sales sanity",
          entity: "sales_order",
          record: { total_amount: 100 },
          actor: { uid: "21", roles: ["admin"] },
          operation: "create",
        },
      });

    expect(response.status).toBe(401);
  });
});

describe("/api/sandbox/blast-radius route", () => {
  it("returns 200 for a valid blast-radius payload", async () => {
    const response = await request(createApp({ uid: "21", roles: ["admin"] }))
      .post("/api/sandbox/blast-radius")
      .send({
        policy: {
          id: "policy-1",
          scope: "sales_order",
          name: "Positive total",
          validate: "total_amount > 0",
          message: "Total must be positive",
          severity: "error",
          when: "total_amount >= 0",
        },
        records: {
          sales_order: [
            { id: "so-1", total_amount: 10 },
            { id: "so-2", total_amount: 0 },
          ],
        },
      });

    expect(response.status).toBe(200);
    expect(response.body.affectedRecordCount).toBe(2);
    expect(Array.isArray(response.body.affectedEntities)).toBe(true);
  });
});