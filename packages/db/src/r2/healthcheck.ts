#!/usr/bin/env tsx

import "dotenv/config";

import { randomUUID } from "node:crypto";
import { access } from "node:fs/promises";
import { resolve } from "node:path";
import { parseArgs } from "node:util";
import { config as loadDotenv } from "dotenv";

import { createR2ObjectRepo } from "./createR2ObjectRepo.js";
import { loadR2RepoCredentialsFromEnv } from "./credentials.js";

async function loadEnvFiles(): Promise<void> {
  const candidates = [
    resolve(process.cwd(), ".env"),
    resolve(process.cwd(), ".env.local"),
    resolve(process.cwd(), "../../.env"),
    resolve(process.cwd(), "../../.env.local"),
  ];
  for (const p of candidates) {
    try {
      await access(p);
      loadDotenv({ path: p, override: false });
    } catch {
      // Ignore missing files.
    }
  }
}

async function main(): Promise<void> {
  const { values } = parseArgs({
    args: process.argv.slice(2),
    options: {
      write: { type: "boolean", default: false },
      prefix: { type: "string", default: "healthcheck/system/r2" },
    },
  });

  await loadEnvFiles();

  const creds = loadR2RepoCredentialsFromEnv(process.env);
  const repo = createR2ObjectRepo(creds);

  const startedAt = Date.now();
  const readPage = await repo.listObjectsByPrefix({ prefix: "", maxKeys: 1 });

  const summary: Record<string, unknown> = {
    ok: true,
    bucket: repo.bucket,
    keyPrefix: repo.keyPrefix,
    read: {
      sampled: readPage.objects.length,
      truncated: readPage.isTruncated,
    },
    durationMs: 0,
  };

  if (values.write) {
    const basePrefix = String(values.prefix || "healthcheck/system/r2").replace(/^\/+|\/+$/g, "");
    const key = `${basePrefix}/${Date.now()}-${randomUUID()}.txt`;
    const body = Buffer.from(`r2-healthcheck ${new Date().toISOString()}`, "utf8");

    await repo.putObject({
      key,
      body,
      contentType: "text/plain",
    });

    const head = await repo.headObject(key);
    if (!head) {
      throw new Error("Write check failed: object missing after upload");
    }

    await repo.deleteObject(key);
    const afterDelete = await repo.headObject(key);
    if (afterDelete) {
      throw new Error("Write check failed: object still exists after delete");
    }

    summary.write = { verified: true, canaryKey: key };
  }

  summary.durationMs = Date.now() - startedAt;
  console.log(JSON.stringify(summary, null, 2));
}

main().catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(
    JSON.stringify(
      {
        ok: false,
        error: message,
      },
      null,
      2
    )
  );
  process.exit(1);
});
