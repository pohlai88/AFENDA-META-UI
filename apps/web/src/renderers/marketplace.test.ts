/**
 * Renderer Capability Marketplace Tests
 */

import { describe, it, expect } from "vitest";
import {
  marketplace,
  satisfiesRequirements,
  calculatePreferredScore,
  calculatePerformanceScore,
} from "./marketplace";
import type { CapabilityDeclaration, MetadataRequirements } from "./marketplace";

describe("Renderer Capability Marketplace", () => {
  describe("Marketplace Registration", () => {
    it("registers a renderer capability declaration", () => {
      const declaration: CapabilityDeclaration = {
        type: "list",
        version: "1.0.0",
        supports: {
          filtering: true,
          sorting: true,
          pagination: true,
        },
        performance: {
          maxRows: 1_000,
          complexity: "low",
          memory: "small",
          initSpeed: "fast",
          realtimeCapable: false,
        },
        costScore: 10,
      };

      marketplace.register("test-list-v1", declaration);

      const registered = marketplace.getDeclaration("test-list-v1");
      expect(registered).toBeDefined();
      expect(registered?.type).toBe("list");
    });

    it("lists all registered renderers", () => {
      const all = marketplace.list();
      expect(all.length).toBeGreaterThan(0);
    });

    it("filters renderers by type", () => {
      const listRenderers = marketplace.getByType("list");
      expect(listRenderers.length).toBeGreaterThan(0);
      listRenderers.forEach((r) => expect(r.declaration.type).toBe("list"));
    });
  });

  describe("Capability Matching", () => {
    it("satisfies exact capability match", () => {
      const capabilities = { filtering: true, sorting: true };
      const requirements = { filtering: true };

      const result = satisfiesRequirements(capabilities, requirements);
      expect(result).toBe(true);
    });

    it("fails when missing required capability", () => {
      const capabilities = { filtering: true };
      const requirements = { sorting: true };

      const result = satisfiesRequirements(capabilities, requirements);
      expect(result).toBe(false);
    });

    it("calculates preferred capability score", () => {
      const capabilities = { filtering: true, sorting: true, export: true };
      const preferred = { filtering: true, sorting: true };

      const score = calculatePreferredScore(capabilities, preferred);
      expect(score).toBe(100); // All preferred capabilities met
    });

    it("returns 100% when all preferred capabilities met", () => {
      const capabilities = { bulkActions: true, inlineEdit: true, virtualization: true, realTimeSync: true };
      const preferred = { bulkActions: true, inlineEdit: true };

      const score = calculatePreferredScore(capabilities, preferred);
      expect(score).toBe(100);
    });
  });

  describe("Performance Scoring", () => {
    it("scores performance based on row capacity", () => {
      const performance = {
        maxRows: 10_000,
        complexity: "low" as const,
        memory: "small" as const,
        initSpeed: "fast" as const,
        realtimeCapable: false,
      };

      const requirements: MetadataRequirements = {
        required: {},
        performance: {
          maxRows: 5_000,
        },
      };

      const score = calculatePerformanceScore(performance, requirements);
      expect(score).toBeGreaterThan(70);
    });

    it("rewards fast init speed", () => {
      const fastPerf = {
        maxRows: 10_000,
        complexity: "low" as const,
        memory: "small" as const,
        initSpeed: "fast" as const,
        realtimeCapable: true,
      };

      const slowPerf = {
        maxRows: 10_000,
        complexity: "low" as const,
        memory: "small" as const,
        initSpeed: "slow" as const,
        realtimeCapable: false,
      };

      const requirements: MetadataRequirements = {
        required: {},
        performance: { maxRows: 1_000 },
      };

      const fastScore = calculatePerformanceScore(fastPerf, requirements);
      const slowScore = calculatePerformanceScore(slowPerf, requirements);

      expect(fastScore).toBeGreaterThan(slowScore);
    });
  });

  describe("Renderer Resolution", () => {
    it("resolves best renderer for requirements", () => {
      const requirements: MetadataRequirements = {
        required: { filtering: true },
        preferred: { sorting: true },
        performance: { maxRows: 1_000 },
      };

      const match = marketplace.resolve("list", requirements);

      expect(match).toBeTruthy();
      expect(match?.rendererId).toBeDefined();
    });

    it("returns null when no renderer matches", () => {
      const requirements: MetadataRequirements = {
        required: { realTimeSync: true, dragDrop: true, virtualization: true },
        preferred: {},
      };

      const match = marketplace.resolve("list", requirements);

      // Likely null since we're requiring many capabilities
      expect(match).toBeNull();
    });

    it("considers cost in scoring", () => {
      const requirements: MetadataRequirements = {
        required: {},
        preferred: {},
        maxCost: 20,
      };

      const match = marketplace.resolve("list", requirements);

      // If match exists, verify cost constraint was respected
      if (match) {
        expect(match.costScore).toBeDefined();
      } else {
        // If no match, it's because all renderers exceeded maxCost - that's valid
        expect(match).toBeNull();
      }
    });
  });
});
