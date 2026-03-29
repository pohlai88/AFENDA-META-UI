/**
 * Metadata Adapters
 * ==================
 * Transforms raw metadata into renderer-safe formats.
 * Ensures backward compatibility across metadata schema versions.
 */

import type { MetaField, MetaAction, ConditionExpression } from "@afenda/meta-types/schema";
import type { MetadataAdapter } from "./types/contracts";

/**
 * Supported metadata schema versions.
 * Use this union instead of bare strings wherever a version is passed around.
 */
export type MetaSchemaVersion = "1.0" | "1.1" | "2.0";

/**
 * Raw metadata from legacy system (v1.0)
 */
export interface LegacyListMeta {
  model: string;
  fields?: MetaField[];
  /** Legacy field name */
  columns?: MetaField[];
  actions?: MetaAction[];
}

/**
 * Modern list metadata (v2.0)
 */
export interface ModernListMeta {
  model: string;
  fields: MetaField[];
  /** New: default sort configuration */
  defaultSort?: { field: string; direction: "asc" | "desc" };
  /** New: filter presets */
  filters?: ConditionExpression[];
  /** New: bulk action definitions */
  bulkActions?: MetaAction[];
  /** New: permission requirements */
  permissions?: { can_create?: boolean; can_update?: boolean; can_delete?: boolean };
  actions?: MetaAction[];
}

/**
 * Adapter: Legacy list meta → Modern list meta
 * Ensures v2 renderers can handle v1 metadata
 */
export const adaptLegacyListMeta: MetadataAdapter<LegacyListMeta, ModernListMeta> = (meta) => {
  return {
    model: meta.model,
    // Use 'fields' if present, fallback to 'columns' (legacy name)
    fields: meta.fields || meta.columns || [],
    // Provide safe defaults for new v2 features
    defaultSort: undefined,
    filters: [],
    bulkActions: [],
    permissions: {},
    actions: meta.actions || [],
  };
};

/**
 * Raw form metadata (v1.0)
 */
export interface LegacyFormMeta {
  model: string;
  fields?: MetaField[];
  /** Legacy validation format (opaque at this layer) */
  validation?: unknown;
}

/**
 * Modern form metadata (v2.0)
 */
export interface ModernFormMeta {
  model: string;
  fields: MetaField[];
  /** New: sections for grouping fields */
  sections?: Array<{ title: string; fields: string[] }>;
  /** New: layout configuration */
  layout?: "single-column" | "two-column" | "grid";
  /** New: Zod validation schema (opaque at this layer) */
  validation?: unknown;
}

/**
 * Adapter: Legacy form meta → Modern form meta
 */
export const adaptLegacyFormMeta: MetadataAdapter<LegacyFormMeta, ModernFormMeta> = (meta) => {
  return {
    model: meta.model,
    fields: meta.fields || [],
    // Default to single column for legacy forms
    layout: "single-column",
    sections: undefined,
    validation: meta.validation,
  };
};

/**
 * Generic metadata polyfill helper
 * Fills in missing fields with safe defaults
 */
export function polyfillMetadata<T extends Record<string, unknown>>(
  meta: Partial<T>,
  defaults: T
): T {
  return { ...defaults, ...meta };
}

/**
 * Capability-aware metadata adapter
 * Only includes features the renderer declares support for
 */
export function adaptToCapabilities<T extends Record<string, unknown>>(
  meta: T,
  capabilities: Record<string, boolean>
): Partial<T> {
  const adapted: Partial<T> = { ...meta };

  // Remove features not supported by renderer
  if (!capabilities.bulkActions) {
    delete adapted.bulkActions;
  }
  if (!capabilities.filtering) {
    delete adapted.filters;
  }
  if (!capabilities.sorting) {
    delete adapted.defaultSort;
  }

  return adapted;
}

/**
 * Metadata version detector
 * Infers metadata schema version from structure
 */
export function detectMetadataVersion(meta: unknown): MetaSchemaVersion {
  if (meta === null || typeof meta !== "object") return "1.0";
  const m = meta as Record<string, unknown>;

  // v2.0 indicators
  if (m.bulkActions || m.defaultSort || m.permissions) {
    return "2.0";
  }

  // v1.1 indicators
  if (m.filters && Array.isArray(m.filters)) {
    return "1.1";
  }

  // Default to v1.0
  return "1.0";
}

/**
 * Smart metadata adapter
 * Automatically detects version and applies appropriate adapter
 */
export function adaptMetadata(
  meta: unknown,
  targetVersion: MetaSchemaVersion = "2.0"
): ModernListMeta | ModernFormMeta {
  const sourceVersion = detectMetadataVersion(meta);

  // If already at target version, return as-is
  if (sourceVersion === targetVersion) {
    return meta as ModernListMeta | ModernFormMeta;
  }

  // Apply version-specific adapters
  if (sourceVersion === "1.0" && targetVersion === "2.0") {
    const m = meta as Record<string, unknown>;
    // Detect type and apply appropriate adapter
    if (m.fields && !m.sections) {
      // Looks like a list
      return adaptLegacyListMeta(meta as LegacyListMeta);
    } else {
      // Looks like a form
      return adaptLegacyFormMeta(meta as LegacyFormMeta);
    }
  }

  // No adapter needed or available
  return meta as ModernListMeta | ModernFormMeta;
}
