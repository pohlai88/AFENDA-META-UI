import { createHash } from "node:crypto";

/**
 * Stable JSON serialization (sorted keys recursively) for deterministic digests.
 */
export function stableStringify(value: unknown): string {
  if (value === null || typeof value !== "object") {
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    return `[${value.map((v) => stableStringify(v)).join(",")}]`;
  }
  const obj = value as Record<string, unknown>;
  const keys = Object.keys(obj).sort();
  const entries = keys.map((k) => `${JSON.stringify(k)}:${stableStringify(obj[k])}`);
  return `{${entries.join(",")}}`;
}

/**
 * Canonical digest for `pricing_decisions.document_inputs_digest` (includes engine version in the preimage).
 */
export function computePricingDocumentInputsDigest(
  documentInputs: Record<string, unknown>,
  pricingEngineVersion: string
): string {
  const body = `${pricingEngineVersion}\0${stableStringify(documentInputs)}`;
  return createHash("sha256").update(body, "utf8").digest("hex");
}
