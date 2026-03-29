/**
 * Route Registry for Snapshot Testing
 * ====================================
 * Manually-maintained registry of API routes for snapshot testing.
 *
 * This is intentionally simple - we list routes explicitly rather than
 * trying to discover them automatically. This makes it clear what's being
 * tested and easier to maintain.
 *
 * Add new routes here as they're implemented.
 */

export interface RouteDefinition {
  method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  path: string;
  description: string;
  requiresAuth: boolean;
  sampleBody?: Record<string, unknown>;
  sampleParams?: Record<string, string>;
}

/**
 * Registry of routes to snapshot test
 *
 * Note: Start with read-only GET endpoints first
 * Add POST/PUT/DELETE operations after confirming snapshots work
 */
export const snapshotRoutes: RouteDefinition[] = [
  // Health check (no auth required)
  {
    method: "GET",
    path: "/health",
    description: "Health check endpoint",
    requiresAuth: false,
  },

  // Meta endpoints (schema registry)
  {
    method: "GET",
    path: "/meta/models",
    description: "List all models in schema registry",
    requiresAuth: true,
  },
  {
    method: "GET",
    path: "/meta/models/partners",
    description: "Get partners model metadata",
    requiresAuth: true,
  },

  // API CRUD endpoints (examples)
  {
    method: "GET",
    path: "/api/partners",
    description: "List partners",
    requiresAuth: true,
  },
  {
    method: "GET",
    path: "/api/products",
    description: "List products",
    requiresAuth: true,
  },

  // Add more routes as needed...
  // {
  //   method: "POST",
  //   path: "/api/partners",
  //   description: "Create partner",
  //   requiresAuth: true,
  //   sampleBody: {
  //     name: "ACME Corp",
  //     type: "customer",
  //     email: "contact@acme.com"
  //   }
  // },
];

/**
 * Group routes by prefix for organized test output
 */
export function groupRoutesByPrefix(routes: RouteDefinition[]): Map<string, RouteDefinition[]> {
  const groups = new Map<string, RouteDefinition[]>();

  for (const route of routes) {
    const prefix = route.path.split("/")[1] || "root";
    if (!groups.has(prefix)) {
      groups.set(prefix, []);
    }
    groups.get(prefix)!.push(route);
  }

  return groups;
}
