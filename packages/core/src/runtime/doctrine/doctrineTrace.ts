import type { InvariantFailurePayload } from "../../contracts/failures.js";
import type { TruthRegistry } from "../registry.js";
import { getDoctrineByRef } from "./doctrineLookup.js";

export function buildDoctrineTrace(args: {
  registry: TruthRegistry;
  doctrineRef?: string;
}): InvariantFailurePayload["doctrine"] | undefined {
  if (!args.doctrineRef) {
    return undefined;
  }

  const doctrine = getDoctrineByRef({
    registry: args.registry,
    doctrineRef: args.doctrineRef,
  });

  return {
    doctrineRef: doctrine.key,
    family: doctrine.family,
    standard: doctrine.standard,
    section: doctrine.section,
    clauseRef: "clauseRef" in doctrine ? doctrine.clauseRef : undefined,
    title: doctrine.title,
    interpretation: doctrine.interpretation,
  };
}
