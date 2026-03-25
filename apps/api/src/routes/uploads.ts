import { Router, type NextFunction, type Request, type Response } from "express";
import multer, { MulterError } from "multer";
import { persistUploadFile } from "../uploads/storage.js";

const router = Router();

const MAX_UPLOAD_BYTES = Number(process.env.UPLOAD_MAX_BYTES ?? 10 * 1024 * 1024);

const allowedFileMimeTypes = new Set([
  "application/pdf",
  "text/plain",
  "text/csv",
  "application/json",
  "application/zip",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
]);

const allowedImageMimeTypes = new Set([
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/gif",
  "image/svg+xml",
]);

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: MAX_UPLOAD_BYTES,
    files: 1,
  },
});

function getUploadKind(req: Request): "file" | "image" {
  return req.query.kind === "image" ? "image" : "file";
}

function isAllowedMimeType(kind: "file" | "image", mimeType: string): boolean {
  if (kind === "image") {
    return allowedImageMimeTypes.has(mimeType);
  }

  return allowedFileMimeTypes.has(mimeType) || mimeType.startsWith("image/");
}

router.post("/uploads", upload.single("file"), async (req: Request, res: Response) => {
  if (!req.file) {
    res.status(400).json({ error: "No file uploaded. Use multipart field name 'file'." });
    return;
  }

  const kind = getUploadKind(req);
  const mimeType = req.file.mimetype || "application/octet-stream";

  if (!isAllowedMimeType(kind, mimeType)) {
    res.status(400).json({
      error: `Unsupported ${kind} MIME type: ${mimeType}`,
      code: "UNSUPPORTED_MIME_TYPE",
    });
    return;
  }

  if (kind === "image" && !mimeType.startsWith("image/")) {
    res.status(400).json({
      error: `Expected image upload, received ${mimeType}`,
      code: "INVALID_IMAGE_UPLOAD",
    });
    return;
  }

  try {
    const stored = await persistUploadFile({
      buffer: req.file.buffer,
      originalName: req.file.originalname,
      mimeType,
    });

    res.status(201).json({
      ...stored,
      kind,
    });
  } catch (error) {
    req.log?.error({ error }, "Upload persistence failed");
    res.status(500).json({ error: "Failed to persist uploaded file" });
  }
});

router.use((err: unknown, _req: Request, res: Response, next: NextFunction) => {
  if (err instanceof MulterError) {
    if (err.code === "LIMIT_FILE_SIZE") {
      res.status(413).json({
        error: `File exceeds maximum upload size of ${MAX_UPLOAD_BYTES} bytes`,
        code: "FILE_TOO_LARGE",
      });
      return;
    }

    res.status(400).json({
      error: err.message,
      code: err.code,
    });
    return;
  }

  next(err);
});

export default router;
