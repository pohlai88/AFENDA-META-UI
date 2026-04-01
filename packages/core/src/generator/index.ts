import path from "node:path";
import { fileURLToPath } from "node:url";
import { emitDoctrines } from "./emitDoctrines.js";
import { emitEnums } from "./emitEnums.js";
import { emitIdentity } from "./emitIdentity.js";
import { emitInvariants } from "./emitInvariants.js";
import { emitManifest } from "./emitManifest.js";
import { emitRelations } from "./emitRelations.js";
import { emitResolutions } from "./emitResolutions.js";
import { loadSpecs } from "./loadSpecs.js";
import { validateSpecs } from "./validateSpecs.js";
import { writeGeneratedFile } from "./writeFile.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const generatedDir = path.resolve(__dirname, "../generated");

async function main(): Promise<void> {
  const bundle = loadSpecs();
  validateSpecs(bundle);

  await writeGeneratedFile(generatedDir, "identity.ts", emitIdentity(bundle));
  await writeGeneratedFile(generatedDir, "enums.ts", emitEnums(bundle));
  await writeGeneratedFile(generatedDir, "relations.ts", emitRelations(bundle));
  await writeGeneratedFile(generatedDir, "invariants.ts", emitInvariants(bundle));
  await writeGeneratedFile(generatedDir, "doctrines.ts", emitDoctrines(bundle));
  await writeGeneratedFile(generatedDir, "resolutions.ts", emitResolutions(bundle));
  await writeGeneratedFile(generatedDir, "manifest.json", emitManifest(bundle));

  process.stdout.write(`Generated truth artifacts in ${generatedDir}\n`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
