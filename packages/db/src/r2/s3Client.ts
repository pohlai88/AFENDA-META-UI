import { S3Client } from "@aws-sdk/client-s3";

import type { R2RepoCredentials } from "./objectRepo.types.js";

function r2Endpoint(accountId: string, jurisdiction?: "eu" | "fedramp"): string {
  const j = jurisdiction ? `.${jurisdiction}` : "";
  return `https://${accountId}${j}.r2.cloudflarestorage.com`;
}

/** Shared S3 client for R2 (presign, repo, tests). */
export function createR2S3Client(creds: R2RepoCredentials): S3Client {
  return new S3Client({
    region: "auto",
    endpoint: r2Endpoint(creds.accountId, creds.jurisdiction),
    credentials: {
      accessKeyId: creds.accessKeyId,
      secretAccessKey: creds.secretAccessKey,
    },
  });
}

export { r2Endpoint };
