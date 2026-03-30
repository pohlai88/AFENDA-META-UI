import type { Readable } from "node:stream";

/** Customer-provided encryption (SSE-C); pass-through to S3 API only. */
export type SseCustomerKeyParams = {
  algorithm: "AES256";
  /** Base64-encoded 256-bit key. */
  customerKey: string;
  /** Base64-encoded MD5 of the raw key bytes. */
  customerKeyMd5: string;
};

export type R2StorageClass = "STANDARD" | "STANDARD_IA";

export type ObjectChecksumAlgorithm = "SHA256" | "SHA1" | "CRC32";

/** Functional object-storage port (R2, MinIO, S3). */
export type R2ObjectRepo = {
  readonly bucket: string;
  readonly keyPrefix: string;

  putObject(input: PutObjectInput): Promise<PutObjectResult>;
  /** Multipart upload for large bodies or streams (uses @aws-sdk/lib-storage). */
  uploadLargeObject(input: UploadLargeObjectInput): Promise<PutObjectResult>;
  getObjectStream(key: string, options?: ObjectReadOptions): Promise<GetObjectResult>;
  headObject(key: string, options?: ObjectReadOptions): Promise<HeadObjectResult | null>;
  deleteObject(key: string): Promise<void>;
  /** Batch delete (S3 DeleteObjects, chunks of 1000). */
  deleteObjects(keys: string[]): Promise<DeleteObjectsResult>;
  listObjectsByPrefix(input: ListObjectsInput): Promise<ListObjectsPage>;
  /**
   * Copy object onto itself to change storage class (R2: STANDARD / STANDARD_IA).
   * @see https://developers.cloudflare.com/r2/buckets/storage-classes/
   */
  copyObjectTransitionStorageClass(key: string, storageClass: R2StorageClass): Promise<void>;
};

export type PutObjectInput = {
  /** Full object key (prefix applied by repo if configured). */
  key: string;
  body: Buffer | Uint8Array | Readable;
  contentType?: string;
  /** S3 user metadata (x-amz-meta-*), string values only. */
  metadata?: Record<string, string>;
  cacheControl?: string;
  storageClass?: R2StorageClass;
  /** Optional integrity: hex digest; mapped to SDK checksum fields (base64 on wire). */
  checksumAlgorithm?: ObjectChecksumAlgorithm;
  /** Hex-encoded digest matching checksumAlgorithm (e.g. 64 chars for SHA-256). */
  checksumHex?: string;
  sseCustomerKey?: SseCustomerKeyParams;
};

export type UploadLargeObjectInput = PutObjectInput & {
  /** Part size in bytes (default 8 MiB). */
  partSize?: number;
  /** Concurrent multipart parts (default 4). */
  queueSize?: number;
  /**
   * When `body` is a stream, set known total size so upload observability (`ObjectUploadCompleted.sizeBytes`) is accurate.
   */
  contentLength?: number;
};

export type ObjectReadOptions = {
  sseCustomerKey?: SseCustomerKeyParams;
};

export type PutObjectResult = {
  key: string;
  etag?: string;
  /** Server-side checksums if returned by provider (wire format per SDK, typically base64). */
  checksumSha256?: string;
  checksumSha1?: string;
  checksumCrc32?: string;
  multipartUploadId?: string;
};

export type GetObjectResult = {
  key: string;
  body: Readable;
  contentType?: string;
  contentLength?: number;
  metadata: Record<string, string>;
};

export type HeadObjectResult = {
  key: string;
  contentLength?: number;
  contentType?: string;
  lastModified?: Date;
  metadata: Record<string, string>;
};

export type ListObjectsInput = {
  prefix: string;
  maxKeys?: number;
  continuationToken?: string;
};

export type ObjectSummary = {
  key: string;
  size: number;
  lastModified?: Date;
};

export type ListObjectsPage = {
  objects: ObjectSummary[];
  isTruncated: boolean;
  nextContinuationToken?: string;
};

export type DeleteObjectsResult = {
  deletedKeys: string[];
  errors: Array<{ key: string; message: string }>;
};

export type R2RepoCredentials = {
  accountId: string;
  bucketName: string;
  accessKeyId: string;
  secretAccessKey: string;
  /** Prepended to every key (normalized, no leading/trailing slashes). */
  keyPrefix?: string;
  jurisdiction?: "eu" | "fedramp";
};

export type R2Event =
  | { type: "ObjectUploadStarted"; key: string; contentType?: string }
  | {
      type: "ObjectUploadCompleted";
      key: string;
      etag?: string;
      durationMs: number;
      sizeBytes: number;
      multipart: boolean;
    }
  | { type: "ObjectUploadFailed"; key: string; error: string; retryCount: number }
  | { type: "ObjectDeleted"; key: string }
  | { type: "ObjectGetStarted"; key: string }
  | {
      type: "ObjectGetCompleted";
      key: string;
      durationMs: number;
      sizeBytes?: number;
    }
  | { type: "ObjectMultipartUploadStarted"; key: string }
  | {
      type: "ObjectRetryScheduled";
      operation: string;
      key?: string;
      attempt: number;
      delayMs: number;
      error: string;
    }
  | { type: "ObjectListStarted"; prefix: string }
  | { type: "ObjectListCompleted"; prefix: string; objectCount: number; durationMs: number };

export type RetryPolicy = {
  /**
   * Number of retries after the initial attempt.
   * Example: 3 means total attempts can be up to 4.
   */
  maxRetries?: number;
  /** Base backoff in milliseconds (default 250). */
  baseDelayMs?: number;
  /** Upper bound for backoff delay (default 4000). */
  maxDelayMs?: number;
  /** Add +/- up to 20% jitter to reduce thundering herd (default true). */
  jitter?: boolean;
};

export type R2RepoOptions = {
  /** Structured observability hook (metrics, logs, domain events). */
  onEvent?: (event: R2Event) => void;
  /** Retry policy for retryable network / throttling / transient server errors. */
  retry?: RetryPolicy;
};

/**
 * Payload shape for R2 bucket event notifications delivered to Cloudflare Queues.
 * @see https://developers.cloudflare.com/r2/buckets/event-notifications/
 */
export type R2BucketEventNotificationMessage = {
  account: string;
  action: string;
  bucket: string;
  object: {
    key: string;
    size?: number;
    eTag?: string;
  };
  eventTime: string;
  copySource?: {
    bucket: string;
    object: string;
  };
};
