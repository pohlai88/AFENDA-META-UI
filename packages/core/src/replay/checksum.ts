import { createHash } from "node:crypto";

export function stableStringify(value: unknown): string {
  if (value === undefined) {
    return '{"$type":"undefined"}';
  }

  if (value === null) {
    return "null";
  }

  if (typeof value !== "object") {
    const encoded = JSON.stringify(value);
    if (encoded !== undefined) {
      return encoded;
    }

    return `{"$type":"unsupported","value":${JSON.stringify(String(value))}}`;
  }

  if (Array.isArray(value)) {
    return `[${value.map(stableStringify).join(",")}]`;
  }

  const entries = Object.entries(value as Record<string, unknown>)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, val]) => `${JSON.stringify(key)}:${stableStringify(val)}`);

  return `{${entries.join(",")}}`;
}

export function checksumProjection(value: unknown): string {
  return createHash("sha256").update(stableStringify(value)).digest("hex");
}
