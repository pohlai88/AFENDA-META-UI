import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  buildDoctrineCatalogExport,
  buildInvariantDoctrineMapping,
  buildInvariantResolutionMapping,
  buildResolutionCatalogExport,
} from "../src/ci/catalogChecks.js";
import { writeArtifact } from "../src/ci/writeArtifact.js";
import { loadSpecs } from "../src/generator/loadSpecs.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const artifactDir = path.resolve(__dirname, "../artifacts/truth");

async function main(): Promise<void> {
  const bundle = loadSpecs();
  const doctrineCatalog = buildDoctrineCatalogExport(bundle);
  const resolutionCatalog = buildResolutionCatalogExport(bundle);
  const invariantDoctrineMapping = buildInvariantDoctrineMapping(bundle);
  const invariantResolutionMapping = buildInvariantResolutionMapping(bundle);

  await writeArtifact({
    outputDir: artifactDir,
    filename: "doctrine-catalog-export.json",
    value: doctrineCatalog,
  });

  await writeArtifact({
    outputDir: artifactDir,
    filename: "resolution-catalog-export.json",
    value: resolutionCatalog,
  });

  await writeArtifact({
    outputDir: artifactDir,
    filename: "invariant-doctrine-mapping.json",
    value: invariantDoctrineMapping,
  });

  await writeArtifact({
    outputDir: artifactDir,
    filename: "invariant-resolution-mapping.json",
    value: invariantResolutionMapping,
  });

  process.stdout.write(`Generated truth catalog artifacts in ${artifactDir}\n`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
