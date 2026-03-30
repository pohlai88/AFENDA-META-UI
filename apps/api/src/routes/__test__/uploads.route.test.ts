import express from "express";
import request from "supertest";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { persistUploadFileMock } = vi.hoisted(() => ({
  persistUploadFileMock: vi.fn(
    async (params: { originalName: string; mimeType: string; buffer: Buffer }) => ({
      fileName: `stored-${params.originalName}`,
      originalName: params.originalName,
      mimeType: params.mimeType,
      size: params.buffer.byteLength,
      url: `/uploads/stored-${params.originalName}`,
      uploadedAt: new Date("2026-03-25T00:00:00.000Z").toISOString(),
    })
  ),
}));

vi.mock("../../uploads/storage.js", () => ({
  persistUploadFile: persistUploadFileMock,
}));

vi.mock("../../db/index.js", () => ({
  db: {},
}));

vi.mock("../../tenant/resolveNumericTenantId.js", () => ({
  resolveNumericTenantId: vi.fn().mockResolvedValue(null),
}));

vi.mock("../../policy/mutation-command-gateway.js", () => {
  class MutationPolicyViolationError extends Error {
    declare statusCode: number;
    declare code: string;
    declare model: string;
    declare operation: string;
    declare mutationPolicy: string;
    declare policy: unknown;
    declare source: string;
    constructor(
      message: string,
      model = "",
      operation = "",
      mutationPolicy = "",
      policy: unknown = undefined,
      source = ""
    ) {
      super(message);
      this.statusCode = 409;
      this.code = "MUTATION_POLICY_VIOLATION";
      this.model = model;
      this.operation = operation;
      this.mutationPolicy = mutationPolicy;
      this.policy = policy;
      this.source = source;
    }
  }
  return { MutationPolicyViolationError };
});

import { AppError } from "../../middleware/errorHandler.js";
import uploadsRouter from "../uploads.js";

function createApp() {
  const app = express();
  app.use("/api", uploadsRouter);
  app.use(
    (error: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
      if (error instanceof AppError) {
        res.status(error.statusCode).json({
          error: error.name,
          message: error.message,
          code: error.code,
          details: error.details,
        });
        return;
      }
      res.status(500).json({
        error: error instanceof Error ? error.message : "Unhandled error",
      });
    }
  );
  return app;
}

describe("/api/uploads route contract", () => {
  beforeEach(() => {
    persistUploadFileMock.mockClear();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("returns 400 when multipart file field is missing", async () => {
    const app = createApp();

    const response = await request(app)
      .post("/api/uploads?kind=file")
      .field("note", "missing file field");

    expect(response.status).toBe(400);
    expect(response.body.message).toContain("No file uploaded");
    expect(persistUploadFileMock).not.toHaveBeenCalled();
  });

  it("returns 201 and the upload contract for file kind", async () => {
    const app = createApp();

    const response = await request(app)
      .post("/api/uploads?kind=file")
      .attach("file", Buffer.from("contract"), {
        filename: "contract.pdf",
        contentType: "application/pdf",
      });

    expect(response.status).toBe(201);
    expect(response.body).toEqual({
      fileName: "stored-contract.pdf",
      originalName: "contract.pdf",
      mimeType: "application/pdf",
      size: 8,
      url: "/uploads/stored-contract.pdf",
      uploadedAt: "2026-03-25T00:00:00.000Z",
      kind: "file",
    });
    expect(persistUploadFileMock).toHaveBeenCalledTimes(1);
  });

  it("returns 201 and kind=image for image uploads", async () => {
    const app = createApp();

    const response = await request(app)
      .post("/api/uploads?kind=image")
      .attach("file", Buffer.from("img"), {
        filename: "avatar.png",
        contentType: "image/png",
      });

    expect(response.status).toBe(201);
    expect(response.body.kind).toBe("image");
    expect(response.body.mimeType).toBe("image/png");
  });

  it("returns 400 with UNSUPPORTED_MIME_TYPE for invalid image MIME", async () => {
    const app = createApp();

    const response = await request(app)
      .post("/api/uploads?kind=image")
      .attach("file", Buffer.from("not-image"), {
        filename: "note.txt",
        contentType: "text/plain",
      });

    expect(response.status).toBe(400);
    expect(response.body.code).toBe("VALIDATION_ERROR");
    expect(
      (response.body.details as { code?: string } | undefined)?.code
    ).toBe("UNSUPPORTED_MIME_TYPE");
    expect(persistUploadFileMock).not.toHaveBeenCalled();
  });

  it("returns 413 FILE_TOO_LARGE when upload exceeds max size", async () => {
    const app = createApp();

    const oversized = Buffer.alloc(11 * 1024 * 1024, 1);

    const response = await request(app).post("/api/uploads?kind=file").attach("file", oversized, {
      filename: "too-large.bin",
      contentType: "application/octet-stream",
    });

    expect(response.status).toBe(413);
    expect(response.body.code).toBe("FILE_TOO_LARGE");
    expect(persistUploadFileMock).not.toHaveBeenCalled();
  });

  it("returns 500 when persistence layer fails", async () => {
    const app = createApp();
    persistUploadFileMock.mockRejectedValueOnce(new Error("r2 unavailable"));

    const response = await request(app)
      .post("/api/uploads?kind=file")
      .attach("file", Buffer.from("contract"), {
        filename: "contract.pdf",
        contentType: "application/pdf",
      });

    expect(response.status).toBe(500);
    expect(response.body.error).toBe("r2 unavailable");
  });
});
