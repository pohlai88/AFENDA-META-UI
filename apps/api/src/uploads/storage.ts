import { createHash, randomUUID } from "node:crypto";
import { mkdir, readdir, stat, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  claimTenantAttachmentUpload,
  completeTenantAttachmentUploadFailure,
  completeTenantAttachmentUploadSuccess,
  StorageIdempotencyInvalidError,
  StorageQuotaExceededError,
  StorageUploadAlreadyCompletedError,
  StorageUploadBlockedError,
} from "@afenda/db/queries/storage";
import { runDocumentTruthCompiler } from "@afenda/db/queries/truth";
import { tenantObjectKey } from "@afenda/db/r2";

import { db } from "../db/index.js";
import {
  buildR2PublicUrlForLogicalKey,
  pruneR2UploadsOlderThan,
  uploadBufferToR2,
} from "./r2Storage.js";

export const UPLOADS_PUBLIC_DIR = fileURLToPath(new URL("../../uploads", import.meta.url));

const MAX_EXTENSION_LENGTH = 12;

function sha256Hex(buffer: Buffer): string {
  return createHash("sha256").update(buffer).digest("hex");
}

export type UploadStorageProvider = "local" | "r2";

export interface StoredUpload {
  fileName: string;
  originalName: string;
  mimeType: string;
  size: number;
  url: string;
  uploadedAt: string;
  attachmentId?: string;
  storageKey?: string;
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

function isR2QuotaEnforced(): boolean {
  const raw = process.env.STORAGE_QUOTA_ENFORCE;
  if (raw === undefined || raw === "") {
    return true;
  }
  return raw.toLowerCase() !== "false" && raw !== "0";
}

export function shouldServeLocalUploadsStatic(): boolean {
  return getUploadStorageProvider() === "local";
}

export function buildStoredUploadName(originalName: string): string {
  const extension = sanitizeExtension(originalName);
  return `${Date.now()}-${randomUUID()}${extension}`;
}

export function buildUntrackedR2StorageKey(params: {
  kind: "file" | "image";
  originalName: string;
  tenantNumericId?: number | null;
}): { storageKey: string; fileName: string } {
  const fileName = buildStoredUploadName(params.originalName);
  const tenantScope = params.tenantNumericId ?? "shared";
  const storageKey = tenantObjectKey({
    tenantId: tenantScope,
    domain: "uploads",
    kind: params.kind,
    objectId: fileName,
  });
  return { storageKey, fileName };
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

export type PersistUploadFileParams = {
  buffer: Buffer;
  originalName: string;
  mimeType: string;
  kind?: "file" | "image";
  /** Resolved `core.tenants.tenant_id` — required for R2 when quota enforcement is on. */
  tenantNumericId?: number | null;
  uploadedByUserId?: number | null;
  idempotencyKey?: string | null;
};

export async function persistUploadFile(params: PersistUploadFileParams): Promise<StoredUpload> {
  const provider = getUploadStorageProvider();
  const enforceQuota = provider === "r2" && isR2QuotaEnforced();
  const kind = params.kind ?? "file";

  if (provider === "r2" && enforceQuota && params.tenantNumericId == null) {
    const err = new Error(
      "Tenant is required for R2 uploads when storage quota enforcement is enabled (X-Tenant-Id / tenant context)."
    );
    (err as Error & { code?: string }).code = "STORAGE_TENANT_REQUIRED";
    throw err;
  }

  if (provider === "local" || !enforceQuota) {
    const { storageKey, fileName } = buildUntrackedR2StorageKey({
      kind,
      originalName: params.originalName,
      tenantNumericId: params.tenantNumericId,
    });
    const url =
      provider === "r2"
        ? await uploadBufferToR2({
            key: storageKey,
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

  const tenantId = params.tenantNumericId!;
  const attachmentId = randomUUID();
  const extension = sanitizeExtension(params.originalName);
  const fileName = `${attachmentId}${extension}`;
  const storageKey = tenantObjectKey({
    tenantId,
    domain: "uploads",
    kind,
    objectId: attachmentId,
  });

  try {
    await claimTenantAttachmentUpload(db, {
      tenantId,
      byteSize: params.buffer.byteLength,
      idempotencyKey: params.idempotencyKey ?? undefined,
      attachmentId,
      storageKey,
      filename: fileName,
      contentType: params.mimeType,
      uploadedBy: params.uploadedByUserId ?? null,
    });
  } catch (uncaught) {
    if (uncaught instanceof StorageUploadAlreadyCompletedError) {
      const e: StorageUploadAlreadyCompletedError = uncaught;
      return {
        fileName,
        originalName: params.originalName,
        mimeType: params.mimeType,
        size: params.buffer.byteLength,
        url: buildR2PublicUrlForLogicalKey(e.storageKey),
        uploadedAt: new Date().toISOString(),
        attachmentId: e.attachmentId,
        storageKey: e.storageKey,
      };
    }
    throw uncaught;
  }

  try {
    await uploadBufferToR2({
      key: storageKey,
      buffer: params.buffer,
      mimeType: params.mimeType,
    });

    await completeTenantAttachmentUploadSuccess(db, {
      tenantId,
      attachmentId,
      byteSize: params.buffer.byteLength,
      checksum: sha256Hex(params.buffer),
    });

    if (process.env.TRUTH_COMPILER_ENABLED !== "false") {
      try {
        await runDocumentTruthCompiler(
          db,
          { tenantId, attachmentId },
          { shadowMode: process.env.TRUTH_COMPILER_SHADOW === "true" }
        );
      } catch (truthErr) {
        console.error("[TruthCompiler] post-upload compile failed", truthErr);
      }
    }

    return {
      fileName,
      originalName: params.originalName,
      mimeType: params.mimeType,
      size: params.buffer.byteLength,
      url: buildR2PublicUrlForLogicalKey(storageKey),
      uploadedAt: new Date().toISOString(),
      attachmentId,
      storageKey,
    };
  } catch (err) {
    await completeTenantAttachmentUploadFailure(db, {
      tenantId,
      attachmentId,
      byteSize: params.buffer.byteLength,
    });
    throw err;
  }
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

export {
  StorageQuotaExceededError,
  StorageUploadBlockedError,
  StorageUploadAlreadyCompletedError,
  StorageIdempotencyInvalidError,
} from "@afenda/db/queries/storage";
