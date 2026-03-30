import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const {
  uploadBufferToR2Mock,
  claimTenantAttachmentUploadMock,
  completeTenantAttachmentUploadFailureMock,
  completeTenantAttachmentUploadSuccessMock,
} = vi.hoisted(() => ({
  uploadBufferToR2Mock: vi.fn(async ({ key }: { key: string }) => `https://files.example.test/${key}`),
  claimTenantAttachmentUploadMock: vi.fn(),
  completeTenantAttachmentUploadFailureMock: vi.fn(),
  completeTenantAttachmentUploadSuccessMock: vi.fn(),
}));

vi.mock("../r2Storage.js", () => ({
  buildR2PublicUrlForLogicalKey: vi.fn((key: string) => `https://files.example.test/${key}`),
  pruneR2UploadsOlderThan: vi.fn(async () => 0),
  uploadBufferToR2: uploadBufferToR2Mock,
}));

vi.mock("../../db/index.js", () => ({
  db: {},
}));

vi.mock("@afenda/db/queries/storage", () => {
  class StorageIdempotencyInvalidError extends Error {}
  class StorageQuotaExceededError extends Error {}
  class StorageUploadAlreadyCompletedError extends Error {}
  class StorageUploadBlockedError extends Error {}

  return {
    claimTenantAttachmentUpload: claimTenantAttachmentUploadMock,
    completeTenantAttachmentUploadFailure: completeTenantAttachmentUploadFailureMock,
    completeTenantAttachmentUploadSuccess: completeTenantAttachmentUploadSuccessMock,
    StorageIdempotencyInvalidError,
    StorageQuotaExceededError,
    StorageUploadAlreadyCompletedError,
    StorageUploadBlockedError,
  };
});

import { persistUploadFile } from "../storage.js";

describe("persistUploadFile (r2 unenforced mode)", () => {
  const previousEnv = {
    provider: process.env.UPLOAD_STORAGE_PROVIDER,
    enforce: process.env.STORAGE_QUOTA_ENFORCE,
  };

  beforeEach(() => {
    process.env.UPLOAD_STORAGE_PROVIDER = "r2";
    process.env.STORAGE_QUOTA_ENFORCE = "false";
    uploadBufferToR2Mock.mockClear();
    claimTenantAttachmentUploadMock.mockClear();
    completeTenantAttachmentUploadFailureMock.mockClear();
    completeTenantAttachmentUploadSuccessMock.mockClear();
  });

  afterEach(() => {
    if (previousEnv.provider === undefined) {
      delete process.env.UPLOAD_STORAGE_PROVIDER;
    } else {
      process.env.UPLOAD_STORAGE_PROVIDER = previousEnv.provider;
    }
    if (previousEnv.enforce === undefined) {
      delete process.env.STORAGE_QUOTA_ENFORCE;
    } else {
      process.env.STORAGE_QUOTA_ENFORCE = previousEnv.enforce;
    }
  });

  it("uploads with schema-safe R2 key and skips quota workflow", async () => {
    const result = await persistUploadFile({
      buffer: Buffer.from("contract"),
      originalName: "contract.pdf",
      mimeType: "application/pdf",
      kind: "file",
      tenantNumericId: null,
    });

    expect(uploadBufferToR2Mock).toHaveBeenCalledTimes(1);
    expect(uploadBufferToR2Mock).toHaveBeenCalledWith(
      expect.objectContaining({
        key: expect.stringMatching(/^shared\/uploads\/file\/\d+-[a-f0-9-]{36}\.pdf$/),
      })
    );
    expect(result.url).toMatch(/^https:\/\/files\.example\.test\/shared\/uploads\/file\//);
    expect(result.fileName.endsWith(".pdf")).toBe(true);

    expect(claimTenantAttachmentUploadMock).not.toHaveBeenCalled();
    expect(completeTenantAttachmentUploadSuccessMock).not.toHaveBeenCalled();
    expect(completeTenantAttachmentUploadFailureMock).not.toHaveBeenCalled();
  });
});
