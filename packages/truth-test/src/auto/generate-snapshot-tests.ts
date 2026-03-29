/**
 * API Snapshot Test Generator
 * ============================
 * Auto-generates snapshot tests for all API endpoints to detect
 * breaking changes in response contracts.
 *
 * Strategy:
 * - Discover all route handlers from Express routers
 * - Generate GET/POST/PUT/DELETE tests for each endpoint
 * - Use seeded test data for consistent snapshots
 * - Mask dynamic values (timestamps, IDs) for stable snapshots
 *
 * Generated tests:
 * - Response status code
 * - Response body shape
 * - Response headers (content-type, etc.)
 */

import request from "supertest";
import { describe, test, expect } from "vitest";

type HttpApp = Parameters<typeof request>[0];

/**
 * Route endpoint definition
 */
interface RouteDefinition {
  method: "GET" | "POST" | "PUT" | "DELETE" | "PATCH";
  path: string;
  authenticated: boolean;
  testData?: Record<string, unknown>;
}

/**
 * Snapshot masking configuration
 */
interface SnapshotMask {
  fields: string[]; // Fields to mask (e.g., 'id', 'createdAt')
  replacement: string; // Replacement value (e.g., '[MASKED]')
}

const defaultMask: SnapshotMask = {
  fields: ["id", "createdAt", "updatedAt", "timestamp"],
  replacement: "[MASKED]",
};

/**
 * Mask dynamic fields in response for stable snapshots
 */
function maskDynamicFields(obj: unknown, mask: SnapshotMask = defaultMask): unknown {
  if (obj === null || obj === undefined) return obj;

  if (Array.isArray(obj)) {
    return obj.map((item) => maskDynamicFields(item, mask));
  }

  if (typeof obj === "object") {
    const masked: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj)) {
      if (mask.fields.includes(key)) {
        masked[key] = mask.replacement;
      } else {
        masked[key] = maskDynamicFields(value, mask);
      }
    }
    return masked;
  }

  return obj;
}

/**
 * Generate snapshot tests for a single route
 */
function generateRouteSnapshotTest(route: RouteDefinition, getApp: () => HttpApp): void {
  const testName = `${route.method} ${route.path} returns expected response shape`;

  test(testName, async () => {
    const app = getApp();

    let req = request(app)[route.method.toLowerCase() as "get"](route.path);

    // Add authentication if required
    if (route.authenticated) {
      req = req.set("Authorization", "Bearer test-token");
    }

    // Add body data for POST/PUT/PATCH
    if (route.testData && ["POST", "PUT", "PATCH"].includes(route.method)) {
      req = req.send(route.testData);
    }

    const response = await req;

    // Snapshot the response
    const snapshot = {
      status: response.status,
      body: maskDynamicFields(response.body),
      contentType: response.headers["content-type"],
    };

    expect(snapshot).toMatchSnapshot();
  });
}

/**
 * Main generator: Create snapshot tests for all routes
 */
export function generateApiSnapshotTests(routes: RouteDefinition[], getApp: () => HttpApp): void {
  describe("API Snapshot Tests (Auto-Generated)", () => {
    // Group by path prefix for organization
    const groupedRoutes = routes.reduce(
      (acc, route) => {
        const prefix = route.path.split("/")[1] || "root";
        if (!acc[prefix]) acc[prefix] = [];
        acc[prefix].push(route);
        return acc;
      },
      {} as Record<string, RouteDefinition[]>
    );

    for (const [prefix, prefixRoutes] of Object.entries(groupedRoutes)) {
      describe(`/${prefix}`, () => {
        for (const route of prefixRoutes) {
          generateRouteSnapshotTest(route, getApp);
        }
      });
    }
  });
}

/**
 * Example usage:
 *
 * ```typescript
 * import { app } from './app'
 * import { generateApiSnapshotTests } from './generate-snapshot-tests'
 *
 * const routes: RouteDefinition[] = [
 *   { method: 'GET', path: '/sales/orders', authenticated: true },
 *   { method: 'POST', path: '/sales/orders', authenticated: true, testData: { ... } },
 * ]
 *
 * generateApiSnapshotTests(routes, () => app)
 * ```
 */
