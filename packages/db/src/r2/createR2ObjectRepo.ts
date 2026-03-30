import {
  CopyObjectCommand,
  DeleteObjectCommand,
  DeleteObjectsCommand,
  GetObjectCommand,
  HeadObjectCommand,
  ListObjectsV2Command,
  PutObjectCommand,
} from "@aws-sdk/client-s3";
import { Upload } from "@aws-sdk/lib-storage";
import { Readable } from "node:stream";

import { hexToBase64 } from "./checksumWire.js";
import { joinObjectKey, resolveFullObjectKey, resolveListPrefix } from "./objectKey.js";
import type {
  DeleteObjectsResult,
  GetObjectResult,
  HeadObjectResult,
  ListObjectsInput,
  ListObjectsPage,
  ObjectReadOptions,
  PutObjectInput,
  PutObjectResult,
  R2ObjectRepo,
  R2RepoCredentials,
  R2RepoOptions,
  RetryPolicy,
  UploadLargeObjectInput,
} from "./objectRepo.types.js";
import { createR2S3Client } from "./s3Client.js";

function normalizePrefix(prefix: string | undefined): string {
  if (!prefix?.trim()) return "";
  return prefix.replace(/^\/+|\/+$/g, "");
}

function toFullObjectKey(repoPrefix: string, key: string): string {
  return resolveFullObjectKey(repoPrefix || undefined, key);
}

function copySourceForSameBucket(bucket: string, key: string): string {
  const encodedKey = key.split("/").map(encodeURIComponent).join("/");
  return `${bucket}/${encodedKey}`;
}

function sseParams(sse?: ObjectReadOptions["sseCustomerKey"]) {
  if (!sse) return {};
  return {
    SSECustomerAlgorithm: sse.algorithm,
    SSECustomerKey: sse.customerKey,
    SSECustomerKeyMD5: sse.customerKeyMd5,
  };
}

function putChecksumFields(
  algorithm: NonNullable<PutObjectInput["checksumAlgorithm"]>,
  hex: string
): Record<string, string | undefined> {
  const b64 = hexToBase64(hex);
  switch (algorithm) {
    case "SHA256":
      return { ChecksumSHA256: b64 };
    case "SHA1":
      return { ChecksumSHA1: b64 };
    case "CRC32":
      return { ChecksumCRC32: b64 };
    default:
      return {};
  }
}

function bodyByteLength(body: Buffer | Uint8Array | Readable): number {
  if (body instanceof Readable) return 0;
  return body.byteLength;
}

function waitMs(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isRetryableError(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const maybe = error as {
    name?: string;
    code?: string;
    $metadata?: { httpStatusCode?: number };
  };
  const status = maybe.$metadata?.httpStatusCode;
  if (status != null && (status === 408 || status === 429 || status >= 500)) return true;
  const code = String(maybe.code ?? "");
  const name = String(maybe.name ?? "");
  return (
    code === "ECONNRESET" ||
    code === "ETIMEDOUT" ||
    code === "ENOTFOUND" ||
    code === "EAI_AGAIN" ||
    name === "TimeoutError" ||
    name === "Throttling" ||
    name === "ThrottlingException" ||
    name === "RequestTimeout" ||
    name === "NetworkingError"
  );
}

function computeBackoffMs(attempt: number, policy: Required<RetryPolicy>): number {
  const exp = Math.min(policy.baseDelayMs * 2 ** (attempt - 1), policy.maxDelayMs);
  if (!policy.jitter) return exp;
  const spread = Math.floor(exp * 0.2);
  const delta = Math.floor(Math.random() * (spread * 2 + 1)) - spread;
  return Math.max(0, exp + delta);
}

function checksumFieldsFromOutput(out: {
  ChecksumSHA256?: string;
  ChecksumSHA1?: string;
  ChecksumCRC32?: string;
}): Pick<PutObjectResult, "checksumSha256" | "checksumSha1" | "checksumCrc32"> {
  return {
    checksumSha256: out.ChecksumSHA256,
    checksumSha1: out.ChecksumSHA1,
    checksumCrc32: out.ChecksumCRC32,
  };
}

export function createR2ObjectRepo(
  creds: R2RepoCredentials,
  options: R2RepoOptions = {}
): R2ObjectRepo {
  const keyPrefix = normalizePrefix(creds.keyPrefix);
  const client = createR2S3Client(creds);
  const bucket = creds.bucketName;
  const onEvent = options.onEvent;
  const retryPolicy: Required<RetryPolicy> = {
    maxRetries: options.retry?.maxRetries ?? 3,
    baseDelayMs: options.retry?.baseDelayMs ?? 250,
    maxDelayMs: options.retry?.maxDelayMs ?? 4000,
    jitter: options.retry?.jitter ?? true,
  };

  const emit = onEvent ?? (() => {});

  async function withRetry<T>(
    operation: string,
    run: () => Promise<T>,
    key?: string
  ): Promise<T> {
    let attempt = 0;
    while (true) {
      try {
        return await run();
      } catch (e) {
        attempt += 1;
        const shouldRetry = attempt <= retryPolicy.maxRetries && isRetryableError(e);
        if (!shouldRetry) throw e;
        const delayMs = computeBackoffMs(attempt, retryPolicy);
        emit({
          type: "ObjectRetryScheduled",
          operation,
          key,
          attempt,
          delayMs,
          error: e instanceof Error ? e.message : String(e),
        });
        await waitMs(delayMs);
      }
    }
  }

  async function putObjectInternal(
    input: PutObjectInput,
    multipart: boolean
  ): Promise<PutObjectResult> {
    const key = toFullObjectKey(keyPrefix, input.key);
    const meta =
      input.metadata &&
      Object.fromEntries(Object.entries(input.metadata).map(([k, v]) => [k.toLowerCase(), v]));

    const checksumPart =
      input.checksumAlgorithm && input.checksumHex
        ? putChecksumFields(input.checksumAlgorithm, input.checksumHex)
        : {};

    const ssePut = input.sseCustomerKey
      ? {
          SSECustomerAlgorithm: input.sseCustomerKey.algorithm,
          SSECustomerKey: input.sseCustomerKey.customerKey,
          SSECustomerKeyMD5: input.sseCustomerKey.customerKeyMd5,
        }
      : {};

    const t0 = performance.now();
    const canReplayBody = !(input.body instanceof Readable);
    const large = input as UploadLargeObjectInput;
    const sizeBytes =
      multipart && typeof large.contentLength === "number" && Number.isFinite(large.contentLength)
        ? large.contentLength
        : bodyByteLength(input.body);
    emit({ type: "ObjectUploadStarted", key, contentType: input.contentType });
    if (multipart) emit({ type: "ObjectMultipartUploadStarted", key });

    try {
      if (multipart) {
        const runUpload = async () => {
          const upload = new Upload({
            client,
            params: {
              Bucket: bucket,
              Key: key,
              Body: input.body,
              ContentType: input.contentType,
              CacheControl: input.cacheControl,
              Metadata: meta,
              StorageClass: input.storageClass,
              ...checksumPart,
              ...ssePut,
            },
            partSize: (input as UploadLargeObjectInput).partSize ?? 8 * 1024 * 1024,
            queueSize: (input as UploadLargeObjectInput).queueSize ?? 4,
          });
          return upload.done();
        };
        const out = canReplayBody ? await withRetry("UploadMultipart", runUpload, key) : await runUpload();
        const durationMs = performance.now() - t0;
        emit({
          type: "ObjectUploadCompleted",
          key,
          etag: out.ETag?.replace(/"/g, ""),
          durationMs,
          sizeBytes,
          multipart: true,
        });
        return {
          key,
          etag: out.ETag?.replace(/"/g, ""),
          ...checksumFieldsFromOutput(out),
          multipartUploadId: undefined,
        };
      }

      const runPut = () =>
        client.send(
          new PutObjectCommand({
            Bucket: bucket,
            Key: key,
            Body: input.body,
            ContentType: input.contentType,
            CacheControl: input.cacheControl,
            Metadata: meta,
            StorageClass: input.storageClass,
            ...checksumPart,
            ...ssePut,
          })
        );
      const out = canReplayBody ? await withRetry("PutObject", runPut, key) : await runPut();

      const durationMs = performance.now() - t0;
      emit({
        type: "ObjectUploadCompleted",
        key,
        etag: out.ETag?.replace(/"/g, ""),
        durationMs,
        sizeBytes,
        multipart: false,
      });

      return {
        key,
        etag: out.ETag?.replace(/"/g, ""),
        ...checksumFieldsFromOutput(out),
      };
    } catch (e: unknown) {
      const err = e instanceof Error ? e.message : String(e);
      emit({ type: "ObjectUploadFailed", key, error: err, retryCount: 0 });
      throw e;
    }
  }

  return {
    bucket,
    keyPrefix,

    async putObject(input: PutObjectInput): Promise<PutObjectResult> {
      return putObjectInternal(input, false);
    },

    async uploadLargeObject(input: UploadLargeObjectInput): Promise<PutObjectResult> {
      return putObjectInternal(input, true);
    },

    async getObjectStream(key: string, readOpts?: ObjectReadOptions): Promise<GetObjectResult> {
      const k = toFullObjectKey(keyPrefix, key);
      const t0 = performance.now();
      emit({ type: "ObjectGetStarted", key: k });
      const out = await withRetry(
        "GetObject",
        () =>
          client.send(
            new GetObjectCommand({
              Bucket: bucket,
              Key: k,
              ...sseParams(readOpts?.sseCustomerKey),
            })
          ),
        k
      );

      const body = out.Body;
      if (!body || !(body instanceof Readable)) {
        throw new Error(`R2 getObject: missing stream for key ${k}`);
      }

      const metadata: Record<string, string> = {};
      if (out.Metadata) {
        for (const [mk, mv] of Object.entries(out.Metadata)) {
          if (mv != null) metadata[mk] = mv;
        }
      }

      emit({
        type: "ObjectGetCompleted",
        key: k,
        durationMs: performance.now() - t0,
        sizeBytes: out.ContentLength,
      });

      return {
        key: k,
        body,
        contentType: out.ContentType,
        contentLength: out.ContentLength,
        metadata,
      };
    },

    async headObject(key: string, readOpts?: ObjectReadOptions): Promise<HeadObjectResult | null> {
      const k = toFullObjectKey(keyPrefix, key);
      try {
        const out = await withRetry(
          "HeadObject",
          () =>
            client.send(
              new HeadObjectCommand({
                Bucket: bucket,
                Key: k,
                ...sseParams(readOpts?.sseCustomerKey),
              })
            ),
          k
        );
        const metadata: Record<string, string> = {};
        if (out.Metadata) {
          for (const [mk, mv] of Object.entries(out.Metadata)) {
            if (mv != null) metadata[mk] = mv;
          }
        }
        return {
          key: k,
          contentLength: out.ContentLength,
          contentType: out.ContentType,
          lastModified: out.LastModified,
          metadata,
        };
      } catch (e: unknown) {
        const name = e && typeof e === "object" && "name" in e ? String((e as { name: string }).name) : "";
        if (name === "NotFound" || (e as { $metadata?: { httpStatusCode?: number } }).$metadata?.httpStatusCode === 404) {
          return null;
        }
        throw e;
      }
    },

    async deleteObject(key: string): Promise<void> {
      const k = toFullObjectKey(keyPrefix, key);
      await withRetry(
        "DeleteObject",
        () =>
          client.send(
            new DeleteObjectCommand({
              Bucket: bucket,
              Key: k,
            })
          ),
        k
      );
      emit({ type: "ObjectDeleted", key: k });
    },

    async deleteObjects(keys: string[]): Promise<DeleteObjectsResult> {
      const deletedKeys: string[] = [];
      const errors: Array<{ key: string; message: string }> = [];

      for (let i = 0; i < keys.length; i += 1000) {
        const batch = keys.slice(i, i + 1000).map((key) => toFullObjectKey(keyPrefix, key));
        const out = await withRetry(
          "DeleteObjects",
          () =>
            client.send(
              new DeleteObjectsCommand({
                Bucket: bucket,
                Delete: {
                  Objects: batch.map((Key) => ({ Key })),
                  Quiet: false,
                },
              })
            )
        );
        for (const d of out.Deleted ?? []) {
          if (d.Key) {
            deletedKeys.push(d.Key);
            emit({ type: "ObjectDeleted", key: d.Key });
          }
        }
        for (const err of out.Errors ?? []) {
          if (err.Key) {
            errors.push({ key: err.Key, message: err.Message ?? "Unknown error" });
          }
        }
      }

      return { deletedKeys, errors };
    },

    async listObjectsByPrefix(input: ListObjectsInput): Promise<ListObjectsPage> {
      const prefix = resolveListPrefix(keyPrefix || undefined, input.prefix);
      const t0 = performance.now();
      emit({ type: "ObjectListStarted", prefix });
      const out = await withRetry(
        "ListObjectsV2",
        () =>
          client.send(
            new ListObjectsV2Command({
              Bucket: bucket,
              Prefix: prefix,
              MaxKeys: input.maxKeys ?? 1000,
              ContinuationToken: input.continuationToken,
            })
          ),
        prefix
      );

      const objects =
        out.Contents?.map((c) => ({
          key: c.Key ?? "",
          size: c.Size ?? 0,
          lastModified: c.LastModified,
        })).filter((o) => o.key.length > 0) ?? [];

      emit({
        type: "ObjectListCompleted",
        prefix,
        objectCount: objects.length,
        durationMs: performance.now() - t0,
      });

      return {
        objects,
        isTruncated: Boolean(out.IsTruncated),
        nextContinuationToken: out.NextContinuationToken,
      };
    },

    async copyObjectTransitionStorageClass(key: string, storageClass: "STANDARD" | "STANDARD_IA"): Promise<void> {
      const k = toFullObjectKey(keyPrefix, key);
      await withRetry(
        "CopyObject",
        () =>
          client.send(
            new CopyObjectCommand({
              Bucket: bucket,
              Key: k,
              CopySource: copySourceForSameBucket(bucket, k),
              StorageClass: storageClass,
              MetadataDirective: "COPY",
            })
          ),
        k
      );
    },
  };
}
