import { GetObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

import { applicationStorageKeySchema, resolveFullObjectKey } from "./objectKey.js";
import type { ObjectReadOptions, R2RepoCredentials, SseCustomerKeyParams } from "./objectRepo.types.js";
import { createR2S3Client } from "./s3Client.js";

function sseHeaders(sse?: SseCustomerKeyParams) {
  if (!sse) return {};
  return {
    SSECustomerAlgorithm: sse.algorithm,
    SSECustomerKey: sse.customerKey,
    SSECustomerKeyMD5: sse.customerKeyMd5,
  };
}

function normalizePresignExpiry(expiresInSeconds: number): number {
  if (!Number.isFinite(expiresInSeconds) || expiresInSeconds < 1 || expiresInSeconds > 604800) {
    throw new Error("expiresInSeconds must be between 1 and 604800 (7 days)");
  }
  return Math.floor(expiresInSeconds);
}

/**
 * Presigned GET for a private object. URLs are short-lived; do not persist them as the source of truth.
 * @see https://developers.cloudflare.com/r2/api/s3/presigned-urls/
 */
export async function presignR2GetUrl(
  creds: R2RepoCredentials,
  key: string,
  expiresInSeconds = 3600,
  options?: ObjectReadOptions
): Promise<string> {
  applicationStorageKeySchema.parse(key);
  const expiresIn = normalizePresignExpiry(expiresInSeconds);
  const client = createR2S3Client(creds);
  const fullKey = resolveFullObjectKey(creds.keyPrefix, key);
  const cmd = new GetObjectCommand({
    Bucket: creds.bucketName,
    Key: fullKey,
    ...sseHeaders(options?.sseCustomerKey),
  });
  return getSignedUrl(client, cmd, { expiresIn });
}

/**
 * Presigned PUT for direct browser/client upload.
 * Configure bucket CORS to allow required headers (Content-Type, checksums, metadata).
 */
export async function presignR2PutUrl(
  creds: R2RepoCredentials,
  key: string,
  contentType: string,
  expiresInSeconds = 3600,
  options?: { cacheControl?: string; sseCustomerKey?: SseCustomerKeyParams }
): Promise<string> {
  applicationStorageKeySchema.parse(key);
  const expiresIn = normalizePresignExpiry(expiresInSeconds);
  const client = createR2S3Client(creds);
  const fullKey = resolveFullObjectKey(creds.keyPrefix, key);
  const cmd = new PutObjectCommand({
    Bucket: creds.bucketName,
    Key: fullKey,
    ContentType: contentType,
    CacheControl: options?.cacheControl,
    ...sseHeaders(options?.sseCustomerKey),
  });
  return getSignedUrl(client, cmd, { expiresIn });
}
