import type { TruthSpecBundle } from "../truth/types.js";
import { tsFile } from "./format.js";

export function emitInvariants(bundle: TruthSpecBundle): string {
  return tsFile(
    "invariants.ts",
    `export const invariants = ${JSON.stringify(bundle.invariants, null, 2)} as const;`
  );
}
