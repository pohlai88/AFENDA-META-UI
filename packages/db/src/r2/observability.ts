import { createR2ObjectRepo } from "./createR2ObjectRepo.js";
import type { R2ObjectRepo, R2RepoCredentials, R2RepoOptions, R2Event } from "./objectRepo.types.js";

/**
 * Preferred pattern: `createR2ObjectRepo(creds, { onEvent })`.
 * Use this when multiple sinks (metrics + logs) should receive the same stream.
 */
export function createR2ObjectRepoWithObservability(
  creds: R2RepoCredentials,
  sinks: Array<(event: R2Event) => void>
): R2ObjectRepo {
  const onEvent: R2RepoOptions["onEvent"] = (e) => {
    for (const s of sinks) s(e);
  };
  return createR2ObjectRepo(creds, { onEvent });
}
