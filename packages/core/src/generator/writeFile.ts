import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

export async function writeGeneratedFile(
  root: string,
  filename: string,
  content: string
): Promise<void> {
  await mkdir(root, { recursive: true });
  await writeFile(path.join(root, filename), content, "utf8");
}
