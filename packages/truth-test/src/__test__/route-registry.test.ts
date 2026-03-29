import { describe, expect, it } from "vitest";
import { groupRoutesByPrefix, snapshotRoutes } from "../auto/route-registry.js";

describe("route-registry", () => {
  it("exports baseline snapshot routes", () => {
    expect(snapshotRoutes.length).toBeGreaterThan(0);
    expect(snapshotRoutes.some((r) => r.path === "/health" && r.method === "GET")).toBe(true);
    expect(snapshotRoutes.every((r) => typeof r.description === "string" && r.description.length > 0)).toBe(true);
  });

  it("groups routes by first path segment", () => {
    const grouped = groupRoutesByPrefix([
      { method: "GET", path: "/health", description: "health", requiresAuth: false },
      { method: "GET", path: "/meta/models", description: "meta", requiresAuth: true },
      { method: "GET", path: "/api/orders", description: "api", requiresAuth: true },
      { method: "POST", path: "/api/orders", description: "api-post", requiresAuth: true },
      { method: "GET", path: "/", description: "root", requiresAuth: false },
    ]);

    expect(grouped.get("health")?.length).toBe(1);
    expect(grouped.get("meta")?.length).toBe(1);
    expect(grouped.get("api")?.length).toBe(2);
    expect(grouped.get("root")?.length).toBe(1);
  });
});
