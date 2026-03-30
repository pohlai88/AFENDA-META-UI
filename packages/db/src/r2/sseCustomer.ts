import { createHash } from "node:crypto";

import type { SseCustomerKeyParams } from "./objectRepo.types.js";

/**
 * Build SSE-C headers params from a raw 32-byte AES-256 key.
 * R2/S3 expect base64 key and base64 MD5 of raw key bytes.
 */
export function sseCustomerKeyFromRaw256BitKey(rawKey: Buffer): SseCustomerKeyParams {
  if (rawKey.length !== 32) {
    throw new Error("SSE-C raw key must be exactly 32 bytes (256 bits)");
  }
  return {
    algorithm: "AES256",
    customerKey: rawKey.toString("base64"),
    customerKeyMd5: createHash("md5").update(rawKey).digest("base64"),
  };
}
