/**
 * Map hex content digests to AWS SDK v3 checksum fields (base64 on the wire).
 */

export function hexToBase64(hex: string): string {
  const normalized = hex.trim().toLowerCase();
  if (!/^[0-9a-f]+$/i.test(normalized) || normalized.length % 2 !== 0) {
    throw new Error("checksumHex must be an even-length hex string");
  }
  return Buffer.from(normalized, "hex").toString("base64");
}
