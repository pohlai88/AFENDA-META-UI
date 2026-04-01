import { loadGeneratedTruthArtifacts } from "./loadGenerated.js";

export function buildTruthRegistry() {
  const { doctrines, invariants, resolutions } = loadGeneratedTruthArtifacts();

  return {
    doctrinesByKey: new Map<string, (typeof doctrines)[number]>(
      doctrines.map((x) => [x.key, x]),
    ),
    invariantsByKey: new Map<string, (typeof invariants)[number]>(
      invariants.map((x) => [x.key, x]),
    ),
    resolutionsByKey: new Map<string, (typeof resolutions)[number]>(
      resolutions.map((x) => [x.key, x]),
    ),
  };
}

export type TruthRegistry = ReturnType<typeof buildTruthRegistry>;
