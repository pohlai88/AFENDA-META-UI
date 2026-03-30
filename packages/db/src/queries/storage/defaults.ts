const TEN_GIB = 10n * 1024n * 1024n * 1024n;

function parseBigIntEnv(raw: string | undefined, fallback: bigint): bigint {
  if (raw == null || raw.trim() === "") return fallback;
  try {
    const v = BigInt(raw.trim());
    if (v < 0n) return fallback;
    return v;
  } catch {
    return fallback;
  }
}

/** Default hard quota for new `tenant_storage_policies` rows (bytes). */
export function defaultHardQuotaBytesFromEnv(
  env: NodeJS.ProcessEnv = process.env
): bigint {
  return parseBigIntEnv(env.DEFAULT_TENANT_STORAGE_QUOTA_BYTES, TEN_GIB);
}
