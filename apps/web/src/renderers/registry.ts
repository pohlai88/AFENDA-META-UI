/**
 * Renderer Registry
 * =================
 * Central orchestration point for all metadata-driven renderers.
 * Enables versioned renderer coexistence and safe lazy loading.
 */

import type {
  RendererType,
  RendererVersion,
  RendererRegistration,
  RendererContract,
  RendererCapabilities,
} from "./types/contracts";

/**
 * Registry structure: type -> version -> registration
 */
type RendererRegistryMap = Record<
  RendererType,
  Partial<Record<RendererVersion, RendererRegistration>>
>;

/**
 * Renderer Registry
 */
export const RendererRegistry: RendererRegistryMap = {
  list: {
    v1: {
      loader: () => import("./MetaList"),
      exportName: "MetaList",
      contract: {
        rendererId: "meta-list",
        version: "v1",
        type: "list",
        supportedMetaVersions: ["1.0", "1.1"],
        capabilities: {
          filtering: true,
          sorting: true,
          pagination: true,
          bulkActions: false,
          inlineEdit: false,
        },
        description: "Legacy list renderer with basic table functionality",
      },
    },
    v2: {
      loader: () => import("./MetaListV2"),
      exportName: "MetaListV2",
      contract: {
        rendererId: "meta-list",
        version: "v2",
        type: "list",
        supportedMetaVersions: ["1.0", "1.1", "2.0"],
        capabilities: {
          filtering: true,
          sorting: true,
          pagination: true,
          bulkActions: true,
          inlineEdit: false,
          customActions: true,
          responsive: true,
        },
        description: "Enhanced list renderer with query-wide selection and permission-gated actions",
        requiredMetaFields: ["fields"],
        optionalMetaFields: ["actions", "filters", "defaultSort"],
      },
    },
  },
  
  form: {
    v1: {
      loader: () => import("./MetaForm"),
      exportName: "MetaForm",
      contract: {
        rendererId: "meta-form",
        version: "v1",
        type: "form",
        supportedMetaVersions: ["1.0"],
        capabilities: {
          inlineEdit: true,
          responsive: false,
        },
        description: "Legacy form renderer",
      },
    },
    v2: {
      loader: () => import("./MetaFormV2"),
      exportName: "MetaFormV2",
      contract: {
        rendererId: "meta-form",
        version: "v2",
        type: "form",
        supportedMetaVersions: ["1.0", "2.0"],
        capabilities: {
          inlineEdit: true,
          responsive: true,
          realTimeSync: false,
        },
        description: "Enhanced form renderer with React Hook Form and Zod validation",
        requiredMetaFields: ["fields"],
        optionalMetaFields: ["validation", "layout", "sections"],
      },
    },
  },
  
  dashboard: {
    v1: {
      loader: () => import("./MetaDashboard"),
      exportName: "MetaDashboard",
      contract: {
        rendererId: "meta-dashboard",
        version: "v1",
        type: "dashboard",
        supportedMetaVersions: ["1.0"],
        capabilities: {
          realTimeSync: false,
          responsive: true,
        },
        description: "Dashboard renderer with widget support",
      },
    },
  },
  
  detail: {
    // Placeholder for future detail view renderer
  },
  
  grid: {
    // Placeholder for future grid renderer (cards, tiles)
  },
  
  calendar: {
    // Placeholder for future calendar renderer
  },
  
  kanban: {
    // Placeholder for future kanban board renderer
  },
};

/**
 * Get renderer registration by type and version
 */
export function getRenderer(
  type: RendererType,
  version: RendererVersion = "v1"
): RendererRegistration | null {
  return RendererRegistry[type]?.[version] || null;
}

/**
 * Get latest version of a renderer type
 */
export function getLatestRenderer(type: RendererType): RendererRegistration | null {
  const versions = Object.keys(RendererRegistry[type] || {}) as RendererVersion[];
  if (versions.length === 0) return null;
  
  // Sort versions (v3 > v2 > v1)
  const sorted = versions.sort((a, b) => b.localeCompare(a));
  return RendererRegistry[type]?.[sorted[0]] || null;
}

/**
 * Get all available versions for a renderer type
 */
export function getAvailableVersions(type: RendererType): RendererVersion[] {
  return Object.keys(RendererRegistry[type] || {}) as RendererVersion[];
}

/**
 * Check if a renderer supports a specific capability
 */
export function hasCapability(
  type: RendererType,
  version: RendererVersion,
  capability: keyof RendererCapabilities
): boolean {
  const registration = getRenderer(type, version);
  return registration?.contract.capabilities[capability] === true;
}

/**
 * Get renderer contract without loading the module
 */
export function getContract(
  type: RendererType,
  version: RendererVersion
): RendererContract | null {
  return getRenderer(type, version)?.contract || null;
}

/**
 * List all registered renderers
 */
export function listRenderers(): Array<{
  type: RendererType;
  version: RendererVersion;
  contract: RendererContract;
}> {
  const renderers: Array<{
    type: RendererType;
    version: RendererVersion;
    contract: RendererContract;
  }> = [];
  
  for (const type of Object.keys(RendererRegistry) as RendererType[]) {
    const versions = RendererRegistry[type];
    for (const version of Object.keys(versions) as RendererVersion[]) {
      const registration = versions[version];
      if (registration) {
        renderers.push({
          type,
          version,
          contract: registration.contract,
        });
      }
    }
  }
  
  return renderers;
}

/**
 * Validate that a renderer registration is complete
 */
export function validateRegistration(
  type: RendererType,
  version: RendererVersion
): { valid: boolean; errors: string[] } {
  const registration = getRenderer(type, version);
  const errors: string[] = [];
  
  if (!registration) {
    errors.push(`No registration found for ${type}@${version}`);
    return { valid: false, errors };
  }
  
  if (!registration.loader) {
    errors.push("Missing loader function");
  }
  
  if (!registration.contract) {
    errors.push("Missing contract");
  } else {
    if (!registration.contract.rendererId) {
      errors.push("Contract missing rendererId");
    }
    if (!registration.contract.version) {
      errors.push("Contract missing version");
    }
    if (!registration.contract.type) {
      errors.push("Contract missing type");
    }
    if (!registration.contract.supportedMetaVersions || registration.contract.supportedMetaVersions.length === 0) {
      errors.push("Contract missing supportedMetaVersions");
    }
  }
  
  return { valid: errors.length === 0, errors };
}
