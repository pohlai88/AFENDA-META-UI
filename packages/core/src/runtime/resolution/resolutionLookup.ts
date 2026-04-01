import type { TruthRegistry } from "../registry.js";

export function getResolutionByRef(args: {
  registry: TruthRegistry;
  resolutionRef: string;
}) {
  const resolution = args.registry.resolutionsByKey.get(args.resolutionRef);
  if (!resolution) {
    throw new Error(`Unknown resolutionRef: ${args.resolutionRef}`);
  }
  return resolution;
}
