/** Thrown when tenant would exceed effective quota (hard + grace) or uploads are blocked. */
export class StorageQuotaExceededError extends Error {
  readonly name = "StorageQuotaExceededError";
  readonly code = "STORAGE_QUOTA_EXCEEDED" as const;

  constructor(
    message: string,
    public readonly remainingBytes: bigint,
    public readonly requiredBytes: bigint,
    public readonly effectiveLimitBytes: bigint
  ) {
    super(message);
  }
}

/** Operator / policy blocked all uploads for the tenant. */
export class StorageUploadBlockedError extends Error {
  readonly name = "StorageUploadBlockedError";
  readonly code = "STORAGE_UPLOAD_BLOCKED" as const;

  constructor(message = "Storage uploads are blocked for this tenant") {
    super(message);
  }
}

/** Idempotent upload already finished — caller should return existing artifact. */
export class StorageUploadAlreadyCompletedError extends Error {
  readonly name = "StorageUploadAlreadyCompletedError";
  readonly code = "STORAGE_UPLOAD_ALREADY_COMPLETED" as const;

  constructor(
    message: string,
    public readonly attachmentId: string,
    public readonly storageKey: string
  ) {
    super(message);
  }
}

/** Idempotency key points at a removed attachment — client must mint a new key. */
export class StorageIdempotencyInvalidError extends Error {
  readonly name = "StorageIdempotencyInvalidError";
  readonly code = "STORAGE_IDEMPOTENCY_INVALID" as const;

  constructor(message = "Idempotency key refers to a removed upload") {
    super(message);
  }
}
