import { doctrineSpec } from "../truth/doctrineSpec.js";
import { enumSpec } from "../truth/enumSpec.js";
import { identitySpec } from "../truth/identitySpec.js";
import { invariantSpec } from "../truth/invariantSpec.js";
import { relationSpec } from "../truth/relationSpec.js";
import { resolutionSpec } from "../truth/resolutionSpec.js";
import type { TruthSpecBundle } from "../truth/types.js";

export function loadSpecs(): TruthSpecBundle {
  return {
    identities: identitySpec,
    enums: enumSpec,
    relations: relationSpec,
    doctrines: doctrineSpec,
    resolutions: resolutionSpec,
    invariants: invariantSpec,
  };
}
