import type { TruthSpecBundle } from "../truth/types.js";

function assertUnique(keys: readonly string[], label: string): void {
  const seen = new Set<string>();
  for (const key of keys) {
    if (seen.has(key)) {
      throw new Error(`Duplicate ${label} key: ${key}`);
    }
    seen.add(key);
  }
}

export function validateSpecs(bundle: TruthSpecBundle): void {
  assertUnique(
    bundle.identities.map((x) => x.key),
    "identity"
  );
  assertUnique(
    bundle.enums.map((x) => x.key),
    "enum"
  );
  assertUnique(
    bundle.relations.map((x) => x.key),
    "relation"
  );
  assertUnique(
    bundle.doctrines.map((x) => x.key),
    "doctrine"
  );
  assertUnique(
    bundle.resolutions.map((x) => x.key),
    "resolution"
  );
  assertUnique(
    bundle.invariants.map((x) => x.key),
    "invariant"
  );

  const doctrineKeys = new Set(bundle.doctrines.map((x) => x.key));
  const resolutionKeys = new Set(bundle.resolutions.map((x) => x.key));

  for (const invariant of bundle.invariants) {
    if (!invariant.doctrineRef) {
      throw new Error(`Invariant ${invariant.key} is missing doctrineRef`);
    }

    if (!doctrineKeys.has(invariant.doctrineRef)) {
      throw new Error(
        `Invariant ${invariant.key} references unknown doctrineRef: ${invariant.doctrineRef}`
      );
    }

    if (invariant.resolutionRef && !resolutionKeys.has(invariant.resolutionRef)) {
      throw new Error(
        `Invariant ${invariant.key} references unknown resolutionRef: ${invariant.resolutionRef}`
      );
    }

    if (invariant.severity === "critical" && !invariant.resolutionRef) {
      throw new Error(`Critical invariant ${invariant.key} must define resolutionRef`);
    }
  }

  for (const resolution of bundle.resolutions) {
    if (resolution.responsibleRole && !resolution.escalation) {
      throw new Error(`Resolution ${resolution.key} has responsibleRole but missing escalation`);
    }

    if (resolution.allowedActions.length === 0) {
      throw new Error(`Resolution ${resolution.key} must contain at least one allowedAction`);
    }

    const validateAction = (action: (typeof resolution.allowedActions)[number], label: string) => {
      if (
        (action.type === "navigate" || action.type === "workflow") &&
        (!("target" in action) || !String(action.target).trim())
      ) {
        throw new Error(`Resolution ${resolution.key} has invalid ${label} target`);
      }

      if (!action.label.trim()) {
        throw new Error(`Resolution ${resolution.key} has invalid ${label} label`);
      }
    };

    for (const action of resolution.allowedActions) {
      validateAction(action, "action");
    }

    if (resolution.escalation) {
      validateAction(resolution.escalation, "escalation");
    }
  }

  for (const doctrine of bundle.doctrines) {
    const linked = bundle.invariants.some((x) => x.doctrineRef === doctrine.key);
    if (!linked) {
      throw new Error(`Doctrine ${doctrine.key} is not linked from any invariant`);
    }
  }
}
