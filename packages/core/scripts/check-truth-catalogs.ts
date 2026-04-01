import { loadSpecs } from "../src/generator/loadSpecs.js";
import { validateDoctrineResolutionCatalogs } from "../src/ci/catalogChecks.js";

function main(): void {
  const bundle = loadSpecs();
  validateDoctrineResolutionCatalogs(bundle);
  process.stdout.write("Doctrine/resolution catalog checks passed.\n");
}

main();
