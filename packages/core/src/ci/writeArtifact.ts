import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { stableStringify } from "../replay/checksum.js";

export async function writeArtifact(args: {
  outputDir: string;
  filename: string;
  value: unknown;
}): Promise<string> {
  await mkdir(args.outputDir, { recursive: true });

  const filepath = path.join(args.outputDir, args.filename);
  await writeFile(filepath, `${stableStringify(args.value)}\n`, "utf8");

  return filepath;
}
