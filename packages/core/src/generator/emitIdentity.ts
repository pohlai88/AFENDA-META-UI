import type { TruthSpecBundle } from "../truth/types.js";
import { tsFile } from "./format.js";

export function emitIdentity(bundle: TruthSpecBundle): string {
  const lines: string[] = [];
  for (const identity of bundle.identities) {
    const typeName = identity.brand;
    lines.push(`export type ${typeName} = string & { readonly __brand: "${typeName}" };`);
  }
  return tsFile("identity.ts", lines.join("\n"));
}
