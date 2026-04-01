import type { TruthSpecBundle } from "../truth/types.js";

export type InvariantDoctrineMapping = {
  invariantKey: string;
  doctrineRef: string;
};

export type InvariantResolutionMapping = {
  invariantKey: string;
  severity: string;
  resolutionRef?: string;
};

const ALLOWED_ACTION_TYPES = new Set([
  "navigate",
  "instruction",
  "workflow",
  "retry",
  "reference",
  "contact",
  "autofix",
]);

/** Workflow action targets are stable workflow identifiers, not routes. */
const WORKFLOW_TARGET_PATTERN = /^[a-z0-9._-]+$/;

function assertNavigateTargetFormat(resolutionKey: string, target: string): void {
  const t = String(target).trim();
  if (!t.startsWith("/") || t.startsWith("//")) {
    throw new Error(
      `Resolution ${resolutionKey} navigate action target must be a path starting with a single "/": ${JSON.stringify(target)}`,
    );
  }
}

function assertWorkflowTargetFormat(resolutionKey: string, target: string): void {
  const t = String(target).trim();
  if (!WORKFLOW_TARGET_PATTERN.test(t)) {
    throw new Error(
      `Resolution ${resolutionKey} workflow action target must match ${WORKFLOW_TARGET_PATTERN}: ${JSON.stringify(target)}`,
    );
  }
}

export function buildInvariantDoctrineMapping(
  bundle: TruthSpecBundle,
): InvariantDoctrineMapping[] {
  return bundle.invariants
    .map((invariant) => ({
      invariantKey: invariant.key,
      doctrineRef: invariant.doctrineRef,
    }))
    .sort((a, b) => a.invariantKey.localeCompare(b.invariantKey));
}

export function buildInvariantResolutionMapping(
  bundle: TruthSpecBundle,
): InvariantResolutionMapping[] {
  return bundle.invariants
    .map((invariant) => ({
      invariantKey: invariant.key,
      severity: invariant.severity,
      resolutionRef: invariant.resolutionRef,
    }))
    .sort((a, b) => a.invariantKey.localeCompare(b.invariantKey));
}

export function buildDoctrineCatalogExport(bundle: TruthSpecBundle) {
  const linkedByDoctrine = new Map<string, string[]>();
  for (const invariant of bundle.invariants) {
    const current = linkedByDoctrine.get(invariant.doctrineRef) ?? [];
    current.push(invariant.key);
    linkedByDoctrine.set(invariant.doctrineRef, current);
  }

  return bundle.doctrines
    .map((doctrine) => ({
      ...doctrine,
      linkedInvariants: (linkedByDoctrine.get(doctrine.key) ?? []).sort(),
    }))
    .sort((a, b) => a.key.localeCompare(b.key));
}

export function buildResolutionCatalogExport(bundle: TruthSpecBundle) {
  const linkedByResolution = new Map<string, string[]>();
  for (const invariant of bundle.invariants) {
    if (!invariant.resolutionRef) continue;
    const current = linkedByResolution.get(invariant.resolutionRef) ?? [];
    current.push(invariant.key);
    linkedByResolution.set(invariant.resolutionRef, current);
  }

  return bundle.resolutions
    .map((resolution) => ({
      ...resolution,
      linkedInvariants: (linkedByResolution.get(resolution.key) ?? []).sort(),
    }))
    .sort((a, b) => a.key.localeCompare(b.key));
}

export function validateDoctrineResolutionCatalogs(bundle: TruthSpecBundle): void {
  const doctrineKeys = new Set(bundle.doctrines.map((x) => x.key));
  const resolutionKeys = new Set(bundle.resolutions.map((x) => x.key));
  const doctrineMappings = buildInvariantDoctrineMapping(bundle);
  const resolutionMappings = buildInvariantResolutionMapping(bundle);

  for (const row of doctrineMappings) {
    if (!doctrineKeys.has(row.doctrineRef)) {
      throw new Error(
        `Invariant ${row.invariantKey} references unknown doctrineRef: ${row.doctrineRef}`,
      );
    }
  }

  for (const row of resolutionMappings) {
    if (row.severity === "critical" && !row.resolutionRef) {
      throw new Error(`Critical invariant ${row.invariantKey} must define resolutionRef`);
    }
    if (row.resolutionRef && !resolutionKeys.has(row.resolutionRef)) {
      throw new Error(
        `Invariant ${row.invariantKey} references unknown resolutionRef: ${row.resolutionRef}`,
      );
    }
  }

  const doctrineCatalog = buildDoctrineCatalogExport(bundle);
  for (const doctrine of doctrineCatalog) {
    if (doctrine.linkedInvariants.length === 0) {
      throw new Error(`Doctrine ${doctrine.key} is not linked from any invariant`);
    }
  }

  const resolutionCatalog = buildResolutionCatalogExport(bundle);
  for (const resolution of resolutionCatalog) {
    if (resolution.linkedInvariants.length === 0) {
      throw new Error(`Resolution ${resolution.key} is not linked from any invariant`);
    }
    if (resolution.resolutionClass === "role-resolvable" && !resolution.responsibleRole) {
      throw new Error(
        `Resolution ${resolution.key} is role-resolvable but missing responsibleRole`,
      );
    }
    if (resolution.allowedActions.length === 0) {
      throw new Error(`Resolution ${resolution.key} must contain at least one action`);
    }
    const actionsToCheck = resolution.escalation
      ? [...resolution.allowedActions, resolution.escalation]
      : resolution.allowedActions;
    for (const action of actionsToCheck) {
      if (!ALLOWED_ACTION_TYPES.has(action.type)) {
        throw new Error(
          `Resolution ${resolution.key} has unsupported action type: ${action.type}`,
        );
      }
      if (
        (action.type === "navigate" || action.type === "workflow") &&
        (!("target" in action) || !action.target || !String(action.target).trim())
      ) {
        throw new Error(`Resolution ${resolution.key} has invalid action target`);
      }
      if (action.type === "navigate" && "target" in action && action.target) {
        assertNavigateTargetFormat(resolution.key, String(action.target));
      }
      if (action.type === "workflow" && "target" in action && action.target) {
        assertWorkflowTargetFormat(resolution.key, String(action.target));
      }
    }
  }
}
