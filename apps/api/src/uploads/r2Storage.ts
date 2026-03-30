import {
  applicationStorageKeySchema,
  createR2ObjectRepo,
  loadR2RepoCredentialsFromEnv,
  resolveFullObjectKey,
} from "@afenda/db/r2";

interface R2Config {
  bucketName: string;
  keyPrefix: string;
  publicBaseUrl?: string;
}

function normalizePrefix(prefix: string | undefined): string {
  if (!prefix) {
    return "";
  }

  return prefix.replace(/^\/+|\/+$/g, "");
}

function getR2Config(): R2Config {
  const creds = loadR2RepoCredentialsFromEnv(process.env);
  return {
    bucketName: creds.bucketName,
    keyPrefix: normalizePrefix(creds.keyPrefix),
    publicBaseUrl: process.env.R2_PUBLIC_BASE_URL?.trim(),
  };
}

let r2Repo: ReturnType<typeof createR2ObjectRepo> | null = null;
let cachedAccountId: string | null = null;

function getR2Repo(): ReturnType<typeof createR2ObjectRepo> {
  const creds = loadR2RepoCredentialsFromEnv(process.env);
  if (!r2Repo || cachedAccountId !== creds.accountId) {
    r2Repo = createR2ObjectRepo(creds);
    cachedAccountId = creds.accountId;
  }
  return r2Repo;
}

function encodeObjectPath(key: string): string {
  return key
    .split("/")
    .filter(Boolean)
    .map((segment) => encodeURIComponent(segment))
    .join("/");
}

export function resolveR2ObjectUrl(config: R2Config, fullObjectKey: string): string {
  const encodedKey = encodeObjectPath(fullObjectKey);

  if (config.publicBaseUrl && config.publicBaseUrl.length > 0) {
    const base = config.publicBaseUrl.replace(/\/+$/, "");
    return `${base}/${encodedKey}`;
  }

  return `https://${config.bucketName}.r2.dev/${encodedKey}`;
}

/** Public URL for a logical application key (`tenant/...`); applies configured repo prefix. */
export function buildR2PublicUrlForLogicalKey(logicalKey: string): string {
  applicationStorageKeySchema.parse(logicalKey);
  const config = getR2Config();
  const fullKey = resolveFullObjectKey(config.keyPrefix || undefined, logicalKey);
  return resolveR2ObjectUrl(config, fullKey);
}

export async function uploadBufferToR2(params: {
  key: string;
  buffer: Buffer;
  mimeType: string;
}): Promise<string> {
  applicationStorageKeySchema.parse(params.key);
  const config = getR2Config();
  const repo = getR2Repo();

  await repo.putObject({
    key: params.key,
    body: params.buffer,
    contentType: params.mimeType,
  });

  const fullKey = resolveFullObjectKey(config.keyPrefix || undefined, params.key);
  return resolveR2ObjectUrl(config, fullKey);
}

export async function pruneR2UploadsOlderThan(olderThanMs: number): Promise<number> {
  const repo = getR2Repo();
  const cutoffMs = Date.now() - olderThanMs;

  const staleKeys: string[] = [];
  let continuationToken: string | undefined;

  do {
    const listResponse = await repo.listObjectsByPrefix({
      prefix: "",
      maxKeys: 1000,
      continuationToken,
    });

    for (const object of listResponse.objects) {
      if (!object.key || !object.lastModified) {
        continue;
      }

      if (object.lastModified.getTime() <= cutoffMs) {
        staleKeys.push(object.key);
      }
    }

    continuationToken = listResponse.isTruncated ? listResponse.nextContinuationToken : undefined;
  } while (continuationToken);

  if (staleKeys.length === 0) {
    return 0;
  }

  await repo.deleteObjects(staleKeys);
  return staleKeys.length;
}
