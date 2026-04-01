import type { TruthSpecBundle } from "../truth/types.js";
import { tsFile } from "./format.js";

export function emitDoctrines(bundle: TruthSpecBundle): string {
  return tsFile(
    "doctrines.ts",
    `export const doctrines = ${JSON.stringify(bundle.doctrines, null, 2)} as const;`
  );
}
