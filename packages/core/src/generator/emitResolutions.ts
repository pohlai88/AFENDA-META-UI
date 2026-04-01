import type { TruthSpecBundle } from "../truth/types.js";
import { tsFile } from "./format.js";

export function emitResolutions(bundle: TruthSpecBundle): string {
  return tsFile(
    "resolutions.ts",
    `export const resolutions = ${JSON.stringify(bundle.resolutions, null, 2)} as const;`
  );
}
