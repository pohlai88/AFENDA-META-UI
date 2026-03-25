import { randomUUID } from "node:crypto";
import { mkdir, readdir, stat, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { pruneR2UploadsOlderThan, uploadBufferToR2 } from "./r2Storage.js";

export const UPLOADS_PUBLIC_DIR = fileURLToPath(new URL("../../uploads", import.meta.url));

const MAX_EXTENSION_LENGTH = 12;

export type UploadStorageProvider = "local" | "r2";

export interface StoredUpload {
  fileName: string;
  originalName: string;
  mimeType: string;
  size: number;
  url: string;
  uploadedAt: string;
}

function sanitizeExtension(originalName: string): string {
  const extension = path.extname(originalName).toLowerCase();

  if (!extension || extension.length > MAX_EXTENSION_LENGTH) {
    return "";
  }

  return /^[a-z0-9.]+$/.test(extension) ? extension : "";
}

export function getUploadStorageProvider(): UploadStorageProvider {
  const provider = (process.env.UPLOAD_STORAGE_PROVIDER ?? "local").toLowerCase();
  return provider === "r2" ? "r2" : "local";
}

export function shouldServeLocalUploadsStatic(): boolean {
  return getUploadStorageProvider() === "local";
}

export function buildStoredUploadName(originalName: string): string {
  const extension = sanitizeExtension(originalName);
  return `${Date.now()}-${randomUUID()}${extension}`;
}

export function resolvePublicUploadUrl(fileName: string): string {
  return `/uploads/${encodeURIComponent(fileName)}`;
}

async function persistLocalUploadFile(params: {
  fileName: string;
  buffer: Buffer;
}): Promise<string> {
  await mkdir(UPLOADS_PUBLIC_DIR, { recursive: true });

  const absolutePath = path.join(UPLOADS_PUBLIC_DIR, params.fileName);
  await writeFile(absolutePath, params.buffer);

  return resolvePublicUploadUrl(params.fileName);
}

export async function persistUploadFile(params: {
  buffer: Buffer;
  originalName: string;
  mimeType: string;
}): Promise<StoredUpload> {
  const fileName = buildStoredUploadName(params.originalName);
  const provider = getUploadStorageProvider();

  const url =
    provider === "r2"
      ? await uploadBufferToR2({
          key: fileName,
          buffer: params.buffer,
          mimeType: params.mimeType,
        })
      : await persistLocalUploadFile({
          fileName,
          buffer: params.buffer,
        });

  return {
    fileName,
    originalName: params.originalName,
    mimeType: params.mimeType,
    size: params.buffer.byteLength,
    url,
    uploadedAt: new Date().toISOString(),
  };
}

async function pruneLocalUploadsOlderThan(olderThanMs: number): Promise<number> {
  await mkdir(UPLOADS_PUBLIC_DIR, { recursive: true });

  const entries = await readdir(UPLOADS_PUBLIC_DIR, { withFileTypes: true });
  const cutoffMs = Date.now() - olderThanMs;
  let pruned = 0;

  for (const entry of entries) {
    if (!entry.isFile()) {
      continue;
    }

    const absolutePath = path.join(UPLOADS_PUBLIC_DIR, entry.name);
    const metadata = await stat(absolutePath);

    if (metadata.mtimeMs <= cutoffMs) {
      await unlink(absolutePath);
      pruned += 1;
    }
  }

  return pruned;
}

export async function pruneOrphanedUploads(olderThanMs: number): Promise<number> {
  const provider = getUploadStorageProvider();

  if (provider === "r2") {
    return pruneR2UploadsOlderThan(olderThanMs);
  }

  return pruneLocalUploadsOlderThan(olderThanMs);
}
