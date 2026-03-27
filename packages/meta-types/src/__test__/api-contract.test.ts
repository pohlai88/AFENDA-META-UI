import { describe, expect, it } from "vitest";

import * as publicApi from "../index.js";

function sorted(values: string[]): string[] {
  return [...values].sort((left, right) => left.localeCompare(right, "en"));
}

describe("public api contract", () => {
  it("matches runtime public export surface", () => {
    const exportNames = sorted(Object.keys(publicApi));

    expect(exportNames).toMatchInlineSnapshot(`
      [
        "assertDirectMutationAllowed",
        "assertNever",
        "DEFAULT_MASKING_RULES",
        "getGlobalResolutionCache",
        "isDirectMutationAllowed",
        "isJsonArray",
        "isJsonObject",
        "isJsonPrimitive",
        "ResolutionCache",
        "ResolutionCacheService",
        "resolveMutationPolicy",
        "TRUTH_PRIORITY",
      ]
    `);
  });

  it("tracks barrel exports for type and runtime symbols", async () => {
    const indexModulePath = new URL("../index.ts", import.meta.url);
    const indexSource = await import("node:fs/promises").then(({ readFile }) =>
      readFile(indexModulePath, "utf-8")
    );

    const exportLines = indexSource
      .split(/\r?\n/u)
      .map((line) => line.trim())
      .filter((line) => line.startsWith("export "))
      .map((line) => line.replaceAll('"', "'"));

    expect(exportLines).toMatchInlineSnapshot(`
      [
        "export type * from './schema.js';",
        "export type * from './rbac.js';",
        "export type * from './module.js';",
        "export type * from './layout.js';",
        "export type * from './policy.js';",
        "export * from './audit.js';",
        "export type * from './events.js';",
        "export type * from './entity-def.js';",
        "export type * from './invariants.js';",
        "export type * from './sandbox.js';",
        "export * from './graph.js';",
        "export type * from './mesh.js';",
        "export * from './mutation-policy.js';",
        "export type * from './state-machine.js';",
        "export type * from './truth-model.js';",
        "export type * from './workflow.js';",
        "export type * from './tenant.js';",
        "export * from './resolutionCache.js';",
        "export * from './utils.js';",
      ]
    `);
  });
});
