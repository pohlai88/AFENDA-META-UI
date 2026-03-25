/**
 * Renderer Registry Integrity Tests
 * ==================================
 * Validates that all registered renderers are loadable and comply with contracts.
 */

import { describe, it, expect } from "vitest";
import {
  RendererRegistry,
  getRenderer,
  getLatestRenderer,
  getAvailableVersions,
  hasCapability,
  listRenderers,
  validateRegistration,
} from "./registry";
import type { RendererType, RendererVersion } from "./types/contracts";

describe("Renderer Registry Integrity", () => {
  describe("Registry Structure", () => {
    it("exports RendererRegistry object", () => {
      expect(RendererRegistry).toBeDefined();
      expect(typeof RendererRegistry).toBe("object");
    });

    it("has expected renderer types", () => {
      const types = Object.keys(RendererRegistry);
      expect(types).toContain("list");
      expect(types).toContain("form");
    });
  });

  describe("Registry Validation", () => {
    const allRenderers = listRenderers();

    it("has at least one renderer registered", () => {
      expect(allRenderers.length).toBeGreaterThan(0);
    });

    for (const { type, version } of allRenderers) {
      describe(`${type}@${version}`, () => {
        it("has valid registration", () => {
          const validation = validateRegistration(type, version);
          expect(validation.valid).toBe(true);
          if (!validation.valid) {
            console.error(`Validation errors for ${type}@${version}:`, validation.errors);
          }
        });

        it("has loader function", () => {
          const registration = getRenderer(type, version);
          expect(typeof registration?.loader).toBe("function");
        });

        it("has contract with required fields", () => {
          const contract = getRenderer(type, version)?.contract;
          expect(contract).toBeDefined();
          expect(contract?.rendererId).toBeTruthy();
          expect(contract?.version).toBe(version);
          expect(contract?.type).toBe(type);
          expect(Array.isArray(contract?.supportedMetaVersions)).toBe(true);
          expect(contract?.supportedMetaVersions.length).toBeGreaterThan(0);
        });

        it("has capabilities object", () => {
          const contract = getRenderer(type, version)?.contract;
          expect(contract?.capabilities).toBeDefined();
          expect(typeof contract?.capabilities).toBe("object");
        });

        it("can load module", async () => {
          const registration = getRenderer(type, version);
          expect(registration).toBeDefined();

          const module = await registration!.loader();
          expect(module).toBeDefined();
        });

        it("module exports expected component", async () => {
          const registration = getRenderer(type, version);
          const module = await registration!.loader();

          const exportName = registration!.exportName || "default";
          const component = module[exportName];

          expect(typeof component).toBe("function");
        });
      });
    }
  });

  describe("Registry Query Functions", () => {
    it("getRenderer returns correct registration", () => {
      const listV2 = getRenderer("list", "v2");
      expect(listV2).toBeDefined();
      expect(listV2?.contract.type).toBe("list");
      expect(listV2?.contract.version).toBe("v2");
    });

    it("getRenderer returns null for non-existent renderer", () => {
      const nonExistent = getRenderer("list" as RendererType, "v99" as RendererVersion);
      expect(nonExistent).toBeNull();
    });

    it("getLatestRenderer returns highest version", () => {
      const latest = getLatestRenderer("list");
      expect(latest).toBeDefined();

      const versions = getAvailableVersions("list");
      const sorted = [...versions].sort((a, b) => b.localeCompare(a));
      expect(latest?.contract.version).toBe(sorted[0]);
    });

    it("getAvailableVersions lists all versions", () => {
      const versions = getAvailableVersions("list");
      expect(Array.isArray(versions)).toBe(true);
      expect(versions.length).toBeGreaterThan(0);
      expect(versions).toContain("v1");
      expect(versions).toContain("v2");
    });

    it("hasCapability checks correctly", () => {
      // MetaListV2 should support bulk actions
      const hasBulkActions = hasCapability("list", "v2", "bulkActions");
      expect(hasBulkActions).toBe(true);

      // MetaList v1 should not support bulk actions
      const v1HasBulkActions = hasCapability("list", "v1", "bulkActions");
      expect(v1HasBulkActions).toBe(false);
    });

    it("listRenderers returns all registrations", () => {
      const all = listRenderers();
      expect(Array.isArray(all)).toBe(true);
      expect(all.length).toBeGreaterThan(0);

      // Should include list v1 and v2
      expect(all.some((r) => r.type === "list" && r.version === "v1")).toBe(true);
      expect(all.some((r) => r.type === "list" && r.version === "v2")).toBe(true);
    });
  });

  describe("Contract Compliance", () => {
    const allRenderers = listRenderers();

    for (const { type, version, contract } of allRenderers) {
      it(`${type}@${version} contract has description`, () => {
        expect(contract.description).toBeTruthy();
        expect(typeof contract.description).toBe("string");
      });

      it(`${type}@${version} declares at least one capability`, () => {
        const capabilities = Object.values(contract.capabilities || {});
        const hasAnyCapability = capabilities.some((v) => v === true);
        expect(hasAnyCapability).toBe(true);
      });
    }
  });
});
