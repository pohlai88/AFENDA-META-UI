/**
 * Metadata Adapters
 * ==================
 * Transforms raw metadata into renderer-safe formats.
 * Ensures backward compatibility across metadata schema versions.
 */

import type { MetadataAdapter } from "./types/contracts";

/**
 * Raw metadata from legacy system (v1.0)
 */
export interface LegacyListMeta {
  model: string;
  fields?: any[];
  /** Legacy field name */
  columns?: any[];
  actions?: any[];
}

/**
 * Modern list metadata (v2.0)
 */
export interface ModernListMeta {
  model: string;
  fields: any[];
  /** New: default sort configuration */
  defaultSort?: { field: string; direction: "asc" | "desc" };
  /** New: filter presets */
  filters?: any[];
  /** New: bulk action definitions */
  bulkActions?: any[];
  /** New: permission requirements */
  permissions?: { can_create?: boolean; can_update?: boolean; can_delete?: boolean };
  actions?: any[];
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
  fields?: any[];
  /** Legacy validation format */
  validation?: any;
}

/**
 * Modern form metadata (v2.0)
 */
export interface ModernFormMeta {
  model: string;
  fields: any[];
  /** New: sections for grouping fields */
  sections?: Array<{ title: string; fields: string[] }>;
  /** New: layout configuration */
  layout?: "single-column" | "two-column" | "grid";
  /** New: Zod validation schema */
  validation?: any;
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
export function polyfillMetadata<T extends Record<string, any>>(meta: Partial<T>, defaults: T): T {
  return { ...defaults, ...meta };
}

/**
 * Capability-aware metadata adapter
 * Only includes features the renderer declares support for
 */
export function adaptToCapabilities<T extends Record<string, any>>(
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
export function detectMetadataVersion(meta: any): string {
  // v2.0 indicators
  if (meta.bulkActions || meta.defaultSort || meta.permissions) {
    return "2.0";
  }

  // v1.1 indicators
  if (meta.filters && Array.isArray(meta.filters)) {
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
  meta: any,
  targetVersion: string = "2.0"
): ModernListMeta | ModernFormMeta {
  const sourceVersion = detectMetadataVersion(meta);

  // If already at target version, return as-is
  if (sourceVersion === targetVersion) {
    return meta;
  }

  // Apply version-specific adapters
  if (sourceVersion === "1.0" && targetVersion === "2.0") {
    // Detect type and apply appropriate adapter
    if (meta.fields && !meta.sections) {
      // Looks like a list
      return adaptLegacyListMeta(meta);
    } else {
      // Looks like a form
      return adaptLegacyFormMeta(meta);
    }
  }

  // No adapter needed or available
  return meta;
}
