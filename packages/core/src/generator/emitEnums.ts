import type { TruthSpecBundle } from "../truth/types.js";
import { tsFile } from "./format.js";

function toConstName(key: string): string {
  return key.replace(/_([a-z])/g, (_, c: string) => c.toUpperCase());
}

function toTypeName(key: string): string {
  return key
    .split("_")
    .map((x) => x[0]!.toUpperCase() + x.slice(1))
    .join("");
}

export function emitEnums(bundle: TruthSpecBundle): string {
  const chunks: string[] = [];
  for (const spec of bundle.enums) {
    const constName = `${toConstName(spec.key)}Enum`;
    const typeName = toTypeName(spec.key);
    const values = spec.values.map((x) => `"${x.value}"`).join(", ");
    chunks.push(`export const ${constName} = [${values}] as const;`);
    chunks.push(`export type ${typeName} = (typeof ${constName})[number];`);
    chunks.push("");
  }
  return tsFile("enums.ts", chunks.join("\n"));
}
