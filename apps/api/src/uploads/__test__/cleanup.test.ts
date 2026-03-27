import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { pruneOrphanedUploadsMock } = vi.hoisted(() => ({
  pruneOrphanedUploadsMock: vi.fn(async () => 3),
}));

vi.mock("../storage.js", () => ({
  pruneOrphanedUploads: pruneOrphanedUploadsMock,
}));

import { startUploadRetentionJob } from "../cleanup.js";

describe("upload retention job", () => {
  const logger = {
    info: vi.fn(),
    error: vi.fn(),
  };

  beforeEach(() => {
    vi.useFakeTimers();
    logger.info.mockReset();
    logger.error.mockReset();
    pruneOrphanedUploadsMock.mockClear();
    delete process.env.UPLOAD_RETENTION_ENABLED;
    delete process.env.UPLOAD_RETENTION_INTERVAL_MS;
    delete process.env.UPLOAD_RETENTION_MAX_AGE_MS;
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("does not schedule job when retention is disabled", () => {
    const stop = startUploadRetentionJob(logger);

    expect(logger.info).toHaveBeenCalledWith("[Uploads] Retention job is disabled");
    expect(pruneOrphanedUploadsMock).not.toHaveBeenCalled();

    stop();
  });

  it("runs cleanup immediately and on interval when enabled", async () => {
    process.env.UPLOAD_RETENTION_ENABLED = "true";
    process.env.UPLOAD_RETENTION_INTERVAL_MS = "1000";
    process.env.UPLOAD_RETENTION_MAX_AGE_MS = "2000";

    const stop = startUploadRetentionJob(logger);

    await vi.waitFor(() => {
      expect(pruneOrphanedUploadsMock).toHaveBeenCalledTimes(1);
    });

    vi.advanceTimersByTime(1000);

    await vi.waitFor(() => {
      expect(pruneOrphanedUploadsMock).toHaveBeenCalledTimes(2);
    });

    stop();
  });
});
