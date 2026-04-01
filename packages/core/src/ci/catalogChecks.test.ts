import { describe, expect, it } from "vitest";
import { validateDoctrineResolutionCatalogs } from "./catalogChecks.js";
import type { TruthSpecBundle } from "../truth/types.js";

const minimalBundle = (): TruthSpecBundle => ({
  identities: [],
  enums: [],
  relations: [],
  doctrines: [
    {
      key: "d1",
      family: "f",
      standard: "s",
      section: "1",
      title: "T",
      interpretation: "strict",
    },
  ],
  resolutions: [
    {
      key: "r1",
      resolutionId: "r1",
      resolutionClass: "user-resolvable",
      title: "R",
      summary: "S",
      actions: [{ type: "instruction", label: "x" }],
    },
  ],
  invariants: [
    {
      key: "i1",
      description: "d",
      severity: "minor",
      failurePolicy: "alert-only",
      timing: "post-commit",
      doctrineRef: "d1",
      resolutionRef: "r1",
      evidenceShape: [],
    },
  ],
});

describe("validateDoctrineResolutionCatalogs — action target formats", () => {
  it("accepts navigate paths starting with / and workflow identifier targets", () => {
    const bundle = minimalBundle();
    bundle.resolutions = [
      {
        key: "r1",
        resolutionId: "r1",
        resolutionClass: "user-resolvable",
        title: "R",
        summary: "S",
        actions: [
          { type: "navigate", target: "/finance/periods", label: "Open" },
          { type: "workflow", target: "economic-effect-review", label: "WF" },
        ],
      },
    ];
    expect(() => validateDoctrineResolutionCatalogs(bundle)).not.toThrow();
  });

  it("rejects navigate targets that do not start with /", () => {
    const bundle = minimalBundle();
    bundle.resolutions = [
      {
        key: "r1",
        resolutionId: "r1",
        resolutionClass: "user-resolvable",
        title: "R",
        summary: "S",
        actions: [{ type: "navigate", target: "finance/periods", label: "Open" }],
      },
    ];
    expect(() => validateDoctrineResolutionCatalogs(bundle)).toThrow(/navigate action target/);
  });

  it("rejects navigate targets that start with //", () => {
    const bundle = minimalBundle();
    bundle.resolutions = [
      {
        key: "r1",
        resolutionId: "r1",
        resolutionClass: "user-resolvable",
        title: "R",
        summary: "S",
        actions: [{ type: "navigate", target: "//evil", label: "Open" }],
      },
    ];
    expect(() => validateDoctrineResolutionCatalogs(bundle)).toThrow(/navigate action target/);
  });

  it("rejects workflow targets that look like routes or contain invalid characters", () => {
    const bundle = minimalBundle();
    bundle.resolutions = [
      {
        key: "r1",
        resolutionId: "r1",
        resolutionClass: "user-resolvable",
        title: "R",
        summary: "S",
        actions: [{ type: "workflow", target: "/workflows/foo", label: "WF" }],
      },
    ];
    expect(() => validateDoctrineResolutionCatalogs(bundle)).toThrow(/workflow action target/);
  });
});
