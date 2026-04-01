import { checksumProjection } from "../replay/checksum.js";
import { replayLatestStateProjection } from "../replay/replayProjection.js";
import type { VerifyReplayArgs, VerifyReplayResult } from "./types.js";

export function verifyReplay(
  args: VerifyReplayArgs<Record<string, Record<string, unknown>>>,
): VerifyReplayResult<Record<string, Record<string, unknown>>> {
  const replayResult = replayLatestStateProjection(args.events);
  const currentProjectionChecksum = checksumProjection(args.currentProjection);

  return {
    replayProjection: replayResult.projection,
    replayChecksum: replayResult.checksum,
    currentProjectionChecksum,
    matches: replayResult.checksum === currentProjectionChecksum,
  };
}
