import { doctrines } from "../generated/doctrines.js";
import { invariants } from "../generated/invariants.js";
import { resolutions } from "../generated/resolutions.js";

export function loadGeneratedTruthArtifacts() {
  return {
    doctrines,
    invariants,
    resolutions,
  };
}
