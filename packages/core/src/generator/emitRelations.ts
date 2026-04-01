import type { TruthSpecBundle } from "../truth/types.js";
import { tsFile } from "./format.js";

export function emitRelations(bundle: TruthSpecBundle): string {
  return tsFile(
    "relations.ts",
    `export const relations = ${JSON.stringify(bundle.relations, null, 2)} as const;`
  );
}
