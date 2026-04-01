import type { TruthSpecBundle } from "../truth/types.js";
import { stableJson } from "./format.js";

export function emitManifest(bundle: TruthSpecBundle): string {
  return stableJson({
    generatedAt: "deterministic",
    counts: {
      identities: bundle.identities.length,
      enums: bundle.enums.length,
      relations: bundle.relations.length,
      doctrines: bundle.doctrines.length,
      resolutions: bundle.resolutions.length,
      invariants: bundle.invariants.length,
    },
    keys: {
      identities: bundle.identities.map((x) => x.key),
      enums: bundle.enums.map((x) => x.key),
      relations: bundle.relations.map((x) => x.key),
      doctrines: bundle.doctrines.map((x) => x.key),
      resolutions: bundle.resolutions.map((x) => x.key),
      invariants: bundle.invariants.map((x) => x.key),
    },
  });
}
