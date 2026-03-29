import { describe, expect, it } from "vitest";

import * as publicApi from "../index.js";

function sorted(values: string[]): string[] {
  return [...values].sort((left, right) => left.localeCompare(right, "en"));
}

async function readExportLines(relativePath: string): Promise<string[]> {
  const modulePath = new URL(relativePath, import.meta.url);
  const source = await import("node:fs/promises").then(({ readFile }) =>
    readFile(modulePath, "utf-8")
  );

  return source
    .split(/\r?\n/u)
    .map((line) => line.trim())
    .filter((line) => line.startsWith("export "))
    .map((line) => line.replaceAll('"', "'"));
}

describe("public api contract", () => {
  it("matches runtime public export surface", () => {
    const exportNames = sorted(Object.keys(publicApi));

    expect(exportNames).toMatchInlineSnapshot(`
      [
        "assertNever",
        "isJsonArray",
        "isJsonObject",
        "isJsonPrimitive",
      ]
    `);
  });

  it("tracks root and non-core domain barrel exports explicitly", async () => {
    const nonCoreBarrelPaths = [
      ["schema", "../schema/index.ts"],
      ["rbac", "../rbac/index.ts"],
      ["compiler", "../compiler/index.ts"],
      ["module", "../module/index.ts"],
      ["layout", "../layout/index.ts"],
      ["policy", "../policy/index.ts"],
      ["audit", "../audit/index.ts"],
      ["events", "../events/index.ts"],
      ["graph", "../graph/index.ts"],
      ["mesh", "../mesh/index.ts"],
      ["workflow", "../workflow/index.ts"],
      ["platform", "../platform/index.ts"],
      ["inventory", "../inventory/index.ts"],
    ] as const;

    const snapshot = {
      root: await readExportLines("../index.ts"),
      nonCoreDomains: Object.fromEntries(
        await Promise.all(
          nonCoreBarrelPaths.map(async ([domain, relativePath]) => [
            domain,
            await readExportLines(relativePath),
          ])
        )
      ),
    };

    expect(snapshot).toMatchInlineSnapshot(`
      {
        "nonCoreDomains": {
          "audit": [
            "export type * from './types.js';",
          ],
          "compiler": [
            "export type * from './entity-def.js';",
            "export type * from './truth-model.js';",
            "export type * from './state-machine.js';",
            "export type * from './record-bridge.js';",
          ],
          "events": [
            "export type * from './types.js';",
          ],
          "graph": [
            "export type * from './types.js';",
          ],
          "inventory": [
            "export type * from './types.js';",
            "export * from './types.schema.js';",
          ],
          "layout": [
            "export type * from './types.js';",
          ],
          "mesh": [
            "export type * from './types.js';",
          ],
          "module": [
            "export type * from './types.js';",
          ],
          "platform": [
            "export type * from './tenant.js';",
            "export type * from './organization.js';",
            "export type * from './cache.js';",
            "export * from './tenant.schema.js';",
          ],
          "policy": [
            "export type * from './types.js';",
            "export type * from './invariants.js';",
            "export type * from './sandbox.js';",
            "export type * from './mutation-policy.js';",
          ],
          "rbac": [
            "export type * from './types.js';",
            "export * from './session.schema.js';",
          ],
          "schema": [
            "export type * from './types.js';",
            "export * from './field-types.schema.js';",
          ],
          "workflow": [
            "export type * from './types.js';",
            "export * from './types.schema.js';",
          ],
        },
        "root": [
          "export * from './core/index.js';",
          "export type * from './schema/index.js';",
          "export type * from './rbac/index.js';",
          "export type * from './compiler/index.js';",
          "export type * from './module/index.js';",
          "export type * from './layout/index.js';",
          "export type * from './policy/index.js';",
          "export type * from './audit/index.js';",
          "export type * from './events/index.js';",
          "export type * from './graph/index.js';",
          "export type * from './mesh/index.js';",
          "export type * from './workflow/index.js';",
          "export type * from './platform/index.js';",
          "export type * from './inventory/index.js';",
        ],
      }
    `);
  });
});
