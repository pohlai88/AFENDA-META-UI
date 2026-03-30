import { z } from "zod/v4";

import type { R2RepoCredentials } from "./objectRepo.types.js";

const accountIdPattern = /^[a-f0-9]{32}$/i;
const bucketPattern = /^[a-z0-9](?:[a-z0-9-]{1,61}[a-z0-9])?$/;

const r2EnvSchema = z.object({
  R2_ACCOUNT_ID: z
    .string()
    .trim()
    .regex(accountIdPattern, "R2_ACCOUNT_ID must be a 32-char Cloudflare account id"),
  R2_BUCKET_NAME: z
    .string()
    .trim()
    .regex(bucketPattern, "R2_BUCKET_NAME must follow Cloudflare bucket naming rules"),
  R2_ACCESS_KEY_ID: z.string().trim().min(8, "R2_ACCESS_KEY_ID is required"),
  R2_SECRET_ACCESS_KEY: z.string().trim().min(16, "R2_SECRET_ACCESS_KEY is required"),
  R2_KEY_PREFIX: z
    .string()
    .trim()
    .optional()
    .transform((v) => (v && v.length > 0 ? v.replace(/^\/+|\/+$/g, "") : undefined)),
  R2_JURISDICTION: z.enum(["eu", "fedramp"]).optional(),
});

export type R2EnvInput = Partial<Record<keyof z.input<typeof r2EnvSchema>, string | undefined>>;
export type R2EnvValidated = z.output<typeof r2EnvSchema>;

/**
 * Parse and validate R2 env vars into strongly-typed repo credentials.
 * Throws with all validation issues grouped when invalid.
 */
export function loadR2RepoCredentialsFromEnv(env: R2EnvInput = process.env): R2RepoCredentials {
  const parsed = r2EnvSchema.safeParse({
    R2_ACCOUNT_ID: env.R2_ACCOUNT_ID,
    R2_BUCKET_NAME: env.R2_BUCKET_NAME,
    R2_ACCESS_KEY_ID: env.R2_ACCESS_KEY_ID,
    R2_SECRET_ACCESS_KEY: env.R2_SECRET_ACCESS_KEY,
    R2_KEY_PREFIX: env.R2_KEY_PREFIX,
    R2_JURISDICTION: env.R2_JURISDICTION,
  });
  if (!parsed.success) {
    const details = parsed.error.issues.map((i) => `- ${i.path.join(".")}: ${i.message}`).join("\n");
    throw new Error(`Invalid R2 environment configuration:\n${details}`);
  }
  return {
    accountId: parsed.data.R2_ACCOUNT_ID,
    bucketName: parsed.data.R2_BUCKET_NAME,
    accessKeyId: parsed.data.R2_ACCESS_KEY_ID,
    secretAccessKey: parsed.data.R2_SECRET_ACCESS_KEY,
    keyPrefix: parsed.data.R2_KEY_PREFIX,
    jurisdiction: parsed.data.R2_JURISDICTION,
  };
}

export const requiredR2EnvVarNames = [
  "R2_ACCOUNT_ID",
  "R2_BUCKET_NAME",
  "R2_ACCESS_KEY_ID",
  "R2_SECRET_ACCESS_KEY",
] as const;
