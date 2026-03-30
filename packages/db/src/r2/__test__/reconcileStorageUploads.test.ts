import { describe, expect, it, vi } from "vitest";

import { reconcilePendingStorageUploads } from "../reconcileStorageUploads.js";
import type { HeadObjectResult, R2ObjectRepo } from "../objectRepo.types.js";

function repoWithHead(result: HeadObjectResult | null): R2ObjectRepo {
  return {
    bucket: "b",
    keyPrefix: "",
    putObject: vi.fn(),
    uploadLargeObject: vi.fn(),
    getObjectStream: vi.fn(),
    headObject: vi.fn(async () => result),
    deleteObject: vi.fn(),
    deleteObjects: vi.fn(),
    listObjectsByPrefix: vi.fn(),
    copyObjectTransitionStorageClass: vi.fn(),
  } as unknown as R2ObjectRepo;
}

describe("reconcilePendingStorageUploads", () => {
  it("calls applyOutcome with still_missing when head is null", async () => {
    const applyOutcome = vi.fn(async () => {});
    const out = await reconcilePendingStorageUploads({
      repo: repoWithHead(null),
      fetchStaleRows: async () => [{ rowId: "1", storageKey: "k" }],
      applyOutcome,
    });
    expect(out).toEqual({ examined: 1, resolved: 1 });
    expect(applyOutcome).toHaveBeenCalledWith(
      { rowId: "1", storageKey: "k" },
      "still_missing"
    );
  });

  it("calls applyOutcome with uploaded when head exists", async () => {
    const applyOutcome = vi.fn(async () => {});
    await reconcilePendingStorageUploads({
      repo: repoWithHead({ key: "k", metadata: {}, contentLength: 1 }),
      fetchStaleRows: async () => [{ rowId: "1", storageKey: "k" }],
      applyOutcome,
    });
    expect(applyOutcome).toHaveBeenCalledWith(
      { rowId: "1", storageKey: "k" },
      "uploaded"
    );
  });
});
