import { pruneOrphanedUploads } from "./storage.js";

const DEFAULT_RETENTION_MS = 30 * 24 * 60 * 60 * 1000;
const DEFAULT_INTERVAL_MS = 6 * 60 * 60 * 1000;

function readBooleanEnv(name: string, fallback: boolean): boolean {
  const raw = process.env[name];
  if (!raw) {
    return fallback;
  }

  return raw.toLowerCase() === "true";
}

function readNumberEnv(name: string, fallback: number): number {
  const raw = process.env[name];
  if (!raw) {
    return fallback;
  }

  const parsed = Number(raw);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

export interface UploadCleanupLogger {
  info: (objOrMsg: Record<string, unknown> | string, message?: string) => void;
  error: (objOrMsg: Record<string, unknown> | string, message?: string) => void;
}

export function startUploadRetentionJob(logger: UploadCleanupLogger): () => void {
  const enabled = readBooleanEnv("UPLOAD_RETENTION_ENABLED", false);

  if (!enabled) {
    logger.info("[Uploads] Retention job is disabled");
    return () => undefined;
  }

  const retentionMs = readNumberEnv("UPLOAD_RETENTION_MAX_AGE_MS", DEFAULT_RETENTION_MS);
  const intervalMs = readNumberEnv("UPLOAD_RETENTION_INTERVAL_MS", DEFAULT_INTERVAL_MS);

  const runCleanup = async () => {
    try {
      const pruned = await pruneOrphanedUploads(retentionMs);
      logger.info(
        {
          pruned,
          retentionMs,
        },
        "[Uploads] Retention cleanup completed"
      );
    } catch (error) {
      logger.error(
        {
          error: error instanceof Error ? error.message : String(error),
        },
        "[Uploads] Retention cleanup failed"
      );
    }
  };

  void runCleanup();
  const interval = setInterval(() => {
    void runCleanup();
  }, intervalMs);

  logger.info(
    {
      intervalMs,
      retentionMs,
    },
    "[Uploads] Retention job started"
  );

  return () => {
    clearInterval(interval);
    logger.info("[Uploads] Retention job stopped");
  };
}
