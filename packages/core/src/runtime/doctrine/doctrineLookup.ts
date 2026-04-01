import type { TruthRegistry } from "../registry.js";

export function getDoctrineByRef(args: {
  registry: TruthRegistry;
  doctrineRef: string;
}) {
  const doctrine = args.registry.doctrinesByKey.get(args.doctrineRef);
  if (!doctrine) {
    throw new Error(`Unknown doctrineRef: ${args.doctrineRef}`);
  }
  return doctrine;
}
