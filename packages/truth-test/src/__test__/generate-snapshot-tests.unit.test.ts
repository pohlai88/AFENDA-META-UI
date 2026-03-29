import { IncomingMessage, ServerResponse } from "node:http";
import { generateApiSnapshotTests } from "../auto/generate-snapshot-tests.js";

const app = (req: IncomingMessage, res: ServerResponse) => {
  const auth = req.headers["authorization"];

  if (req.method === "GET" && req.url === "/health") {
    res.statusCode = 200;
    res.setHeader("content-type", "application/json; charset=utf-8");
    res.end(
      JSON.stringify({
        id: "health-1",
        createdAt: "2026-01-01T00:00:00.000Z",
        nested: { updatedAt: "2026-01-01T00:00:00.000Z" },
      })
    );
    return;
  }

  if (req.method === "POST" && req.url === "/orders") {
    if (!auth) {
      res.statusCode = 401;
      res.setHeader("content-type", "application/json");
      res.end(JSON.stringify({ error: "unauthorized" }));
      return;
    }

    res.statusCode = 201;
    res.setHeader("content-type", "application/json");
    res.end(
      JSON.stringify({
        id: "order-1",
        timestamp: "2026-01-01T00:00:00.000Z",
        data: { createdAt: "2026-01-01T00:00:00.000Z" },
      })
    );
    return;
  }

  res.statusCode = 404;
  res.setHeader("content-type", "application/json");
  res.end(JSON.stringify({ error: "not-found" }));
};

generateApiSnapshotTests(
  [
    {
      method: "GET",
      path: "/health",
      authenticated: false,
    },
    {
      method: "POST",
      path: "/orders",
      authenticated: true,
      testData: { sample: true },
    },
  ],
  () => app as any,
);
