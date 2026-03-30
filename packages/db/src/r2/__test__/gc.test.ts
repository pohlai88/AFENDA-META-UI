import { describe, expect, it, vi } from "vitest";

import { findOrphanObjectKeys } from "../gc.js";
import type { ListObjectsInput, ListObjectsPage, R2ObjectRepo } from "../objectRepo.types.js";

function mockRepo(
  keyPrefix: string,
  listImpl: (input: ListObjectsInput) => Promise<ListObjectsPage>
): R2ObjectRepo {
  return {
    bucket: "b",
    keyPrefix,
    putObject: vi.fn(),
    uploadLargeObject: vi.fn(),
    getObjectStream: vi.fn(),
    headObject: vi.fn(),
    deleteObject: vi.fn(),
    deleteObjects: vi.fn(),
    listObjectsByPrefix: vi.fn(listImpl),
    copyObjectTransitionStorageClass: vi.fn(),
  } as unknown as R2ObjectRepo;
}

describe("findOrphanObjectKeys", () => {
  it("returns keys not present in known set (strips repo prefix)", async () => {
    const repo = mockRepo("prod", async () => ({
      objects: [
        { key: "prod/t1/a.pdf", size: 1 },
        { key: "prod/t1/b.pdf", size: 1 },
      ],
      isTruncated: false,
    }));

    const out = await findOrphanObjectKeys(repo, "t1/", new Set(["t1/a.pdf"]));
    expect(out.orphanKeys).toEqual(["prod/t1/b.pdf"]);
  });

  it("paginates using continuation tokens", async () => {
    const repo = mockRepo("", async (input) => {
      if (!input.continuationToken) {
        return {
          objects: [{ key: "x/a", size: 1 }],
          isTruncated: true,
          nextContinuationToken: "next",
        };
      }
      if (input.continuationToken === "next") {
        return {
          objects: [{ key: "x/b", size: 1 }],
          isTruncated: false,
        };
      }
      return { objects: [], isTruncated: false };
    });

    const out = await findOrphanObjectKeys(repo, "x/", new Set([]));
    expect(out.orphanKeys).toEqual(["x/a", "x/b"]);
  });
});
