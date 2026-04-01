import { doctrines } from "../../generated/doctrines.js";

export type GeneratedDoctrineRecord = (typeof doctrines)[number];

export function getDoctrineByRef(doctrineRef: string): GeneratedDoctrineRecord {
  const doctrine = doctrines.find((entry) => entry.key === doctrineRef);

  if (!doctrine) {
    throw new Error(`Unknown doctrineRef: ${doctrineRef}`);
  }

  return doctrine;
}
