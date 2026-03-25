import {
  DeleteObjectsCommand,
  ListObjectsV2Command,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";

interface R2Config {
  accountId: string;
  bucketName: string;
  accessKeyId: string;
  secretAccessKey: string;
  keyPrefix: string;
  publicBaseUrl?: string;
}

function getRequiredEnv(name: string): string {
  const value = process.env[name];
  if (!value || !value.trim()) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value.trim();
}

function normalizePrefix(prefix: string | undefined): string {
  if (!prefix) {
    return "";
  }

  return prefix.replace(/^\/+|\/+$/g, "");
}

function getR2Config(): R2Config {
  return {
    accountId: getRequiredEnv("R2_ACCOUNT_ID"),
    bucketName: getRequiredEnv("R2_BUCKET_NAME"),
    accessKeyId: getRequiredEnv("R2_ACCESS_KEY_ID"),
    secretAccessKey: getRequiredEnv("R2_SECRET_ACCESS_KEY"),
    keyPrefix: normalizePrefix(process.env.R2_KEY_PREFIX),
    publicBaseUrl: process.env.R2_PUBLIC_BASE_URL?.trim(),
  };
}

let r2Client: S3Client | null = null;
let cachedAccountId: string | null = null;

function getR2Client(config: R2Config): S3Client {
  if (!r2Client || cachedAccountId !== config.accountId) {
    r2Client = new S3Client({
      region: "auto",
      endpoint: `https://${config.accountId}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: config.accessKeyId,
        secretAccessKey: config.secretAccessKey,
      },
    });
    cachedAccountId = config.accountId;
  }

  return r2Client;
}

function joinKey(prefix: string, fileName: string): string {
  if (!prefix) {
    return fileName;
  }

  return `${prefix}/${fileName}`;
}

function encodeObjectPath(key: string): string {
  return key
    .split("/")
    .filter(Boolean)
    .map((segment) => encodeURIComponent(segment))
    .join("/");
}

function resolveR2ObjectUrl(config: R2Config, key: string): string {
  const encodedKey = encodeObjectPath(key);

  if (config.publicBaseUrl && config.publicBaseUrl.length > 0) {
    const base = config.publicBaseUrl.replace(/\/+$/, "");
    return `${base}/${encodedKey}`;
  }

  return `https://${config.bucketName}.r2.dev/${encodedKey}`;
}

export async function uploadBufferToR2(params: {
  key: string;
  buffer: Buffer;
  mimeType: string;
}): Promise<string> {
  const config = getR2Config();
  const key = joinKey(config.keyPrefix, params.key);
  const client = getR2Client(config);

  await client.send(
    new PutObjectCommand({
      Bucket: config.bucketName,
      Key: key,
      Body: params.buffer,
      ContentType: params.mimeType,
    })
  );

  return resolveR2ObjectUrl(config, key);
}

export async function pruneR2UploadsOlderThan(olderThanMs: number): Promise<number> {
  const config = getR2Config();
  const client = getR2Client(config);
  const cutoffMs = Date.now() - olderThanMs;

  const staleKeys: string[] = [];
  let continuationToken: string | undefined;

  do {
    const listResponse = await client.send(
      new ListObjectsV2Command({
        Bucket: config.bucketName,
        Prefix: config.keyPrefix || undefined,
        ContinuationToken: continuationToken,
      })
    );

    for (const object of listResponse.Contents ?? []) {
      if (!object.Key || !object.LastModified) {
        continue;
      }

      if (object.LastModified.getTime() <= cutoffMs) {
        staleKeys.push(object.Key);
      }
    }

    continuationToken = listResponse.IsTruncated
      ? listResponse.NextContinuationToken
      : undefined;
  } while (continuationToken);

  if (staleKeys.length === 0) {
    return 0;
  }

  for (let i = 0; i < staleKeys.length; i += 1000) {
    const batch = staleKeys.slice(i, i + 1000);

    await client.send(
      new DeleteObjectsCommand({
        Bucket: config.bucketName,
        Delete: {
          Objects: batch.map((Key) => ({ Key })),
        },
      })
    );
  }

  return staleKeys.length;
}
