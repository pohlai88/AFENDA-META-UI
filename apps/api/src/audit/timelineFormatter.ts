/**
 * Timeline Formatter
 * ==================
 * Transforms raw AuditEntry records into human-readable timeline entries,
 * applying sensitivity masking where needed.
 */

import type {
  AuditEntry,
  AuditTimelineEntry,
  FieldChange,
  MaskingRule,
  SensitivityLevel,
} from "@afenda/meta-types";

type MaskingRules = Record<SensitivityLevel, MaskingRule>;

// Re-import the constant at runtime for default masking behavior
const BUILTIN_MASKING_RULES: MaskingRules = {
  low: { threshold: "low", strategy: "full" },
  medium: { threshold: "medium", strategy: "partial", revealChars: 2 },
  high: { threshold: "high", strategy: "full" },
};

/**
 * Mask a value based on its sensitivity level and the masking rules.
 * Returns a display-safe string representation.
 */
export function maskValue(
  value: unknown,
  sensitivity: SensitivityLevel,
  viewerSensitivityClearance: SensitivityLevel = "low",
  rules: MaskingRules = BUILTIN_MASKING_RULES
): string {
  const sensitivityRank: Record<SensitivityLevel, number> = {
    low: 0,
    medium: 1,
    high: 2,
  };

  // Viewer has clearance to see this sensitivity level
  if (sensitivityRank[viewerSensitivityClearance] >= sensitivityRank[sensitivity]) {
    return formatValue(value);
  }

  const rule = rules[sensitivity];

  switch (rule.strategy) {
    case "partial": {
      const str = formatValue(value);
      const reveal = rule.revealChars ?? 2;
      if (str.length <= reveal * 2) return "******";
      return `${str.slice(0, reveal)}${"*".repeat(str.length - reveal * 2)}${str.slice(-reveal)}`;
    }
    case "hash":
      return `[REDACTED-${sensitivity.toUpperCase()}]`;
    case "full":
    default:
      return "******";
  }
}

function formatValue(value: unknown): string {
  if (value === null || value === undefined) return "(empty)";
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  if (value instanceof Date) return value.toISOString();
  if (Array.isArray(value)) return `[${value.length} items]`;
  return JSON.stringify(value);
}

/**
 * Build a human-readable summary for an audit entry.
 */
function buildSummary(entry: AuditEntry): string {
  switch (entry.operation) {
    case "create":
      return `Created ${entry.entity} #${entry.entityId}`;
    case "delete":
      return `Deleted ${entry.entity} #${entry.entityId}`;
    case "update": {
      const fieldNames = entry.changes.map((c) => c.field).join(", ");
      return `Updated ${entry.entity} #${entry.entityId}: ${fieldNames}`;
    }
    default:
      return `${entry.operation} on ${entry.entity} #${entry.entityId}`;
  }
}

/**
 * Apply sensitivity masking to a list of FieldChanges.
 */
function maskChanges(
  changes: FieldChange[],
  viewerClearance: SensitivityLevel,
  rules: MaskingRules
): FieldChange[] {
  return changes.map((change) => ({
    ...change,
    oldValue: maskValue(change.oldValue, change.sensitivity, viewerClearance, rules),
    newValue: maskValue(change.newValue, change.sensitivity, viewerClearance, rules),
  }));
}

/**
 * Transform AuditEntry records into timeline-friendly entries.
 *
 * @param entries           - Raw audit entries (already sorted)
 * @param actorResolver     - Resolves actor IDs to display names
 * @param viewerClearance   - Viewer's maximum sensitivity clearance
 * @param rules             - Custom masking rules (defaults to built-in)
 */
export function formatTimeline(
  entries: AuditEntry[],
  actorResolver: (actorId: string) => string = (id) => id,
  viewerClearance: SensitivityLevel = "low",
  rules: MaskingRules = BUILTIN_MASKING_RULES
): AuditTimelineEntry[] {
  return entries.map((entry) => ({
    displayTime: entry.timestamp,
    actorName: actorResolver(entry.actor),
    summary: buildSummary(entry),
    changes: maskChanges(entry.changes, viewerClearance, rules),
    operation: entry.operation,
    source: entry.source,
  }));
}
