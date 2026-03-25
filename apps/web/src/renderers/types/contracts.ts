/**
 * Renderer Contract System
 * =========================
 * Formal interface definitions for metadata-driven renderers.
 * Treat renderers like APIs — they must declare compatibility and capabilities.
 */

/**
 * Renderer version identifier
 * Follow semantic versioning: v1, v2, v3
 */
export type RendererVersion = "v1" | "v2" | "v3";

/**
 * Renderer type categories
 */
export type RendererType = "list" | "form" | "dashboard" | "detail" | "grid" | "calendar" | "kanban";

/**
 * Renderer capabilities flags
 * Declares what the renderer can do — engine enables features dynamically
 */
export interface RendererCapabilities {
  /** Supports bulk selection and actions */
  bulkActions?: boolean;
  
  /** Supports inline editing of fields */
  inlineEdit?: boolean;
  
  /** Uses virtualization for large datasets */
  virtualization?: boolean;
  
  /** Supports real-time updates */
  realTimeSync?: boolean;
  
  /** Supports drag-and-drop reordering */
  dragDrop?: boolean;
  
  /** Supports responsive/mobile layout */
  responsive?: boolean;
  
  /** Supports custom action buttons */
  customActions?: boolean;
  
  /** Supports filtering */
  filtering?: boolean;
  
  /** Supports sorting */
  sorting?: boolean;
  
  /** Supports pagination */
  pagination?: boolean;
  
  /** Supports export to CSV/Excel */
  export?: boolean;
}

/**
 * Renderer Contract
 * Every renderer must export this to declare its identity and capabilities
 */
export interface RendererContract {
  /** Unique identifier for this renderer family */
  rendererId: string;
  
  /** Semantic version (v1, v2, v3) */
  version: RendererVersion;
  
  /** Renderer type category */
  type: RendererType;
  
  /** Metadata schema versions this renderer supports */
  supportedMetaVersions: string[];
  
  /** Declared capabilities */
  capabilities: RendererCapabilities;
  
  /** Human-readable description */
  description?: string;
  
  /** Minimum metadata fields required */
  requiredMetaFields?: string[];
  
  /** Optional metadata fields this renderer can enhance */
  optionalMetaFields?: string[];
}

/**
 * Renderer component props interface
 * All renderers should accept these base props
 */
export interface RendererBaseProps {
  /** Model name (e.g., "contacts", "opportunities") */
  model: string;
  
  /** Metadata definition for this model */
  meta?: any;
  
  /** Embedded mode (no chrome/borders) */
  embedded?: boolean;
  
  /** Custom CSS class for styling */
  className?: string;
}

/**
 * List renderer specific props
 */
export interface ListRendererProps extends RendererBaseProps {
  /** Callback when a row is clicked */
  onRowClick?: (id: string, record: any) => void;
  
  /** Callback when "New" button is clicked */
  onNew?: () => void;
  
  /** Callback when selection state changes */
  onSelectionChange?: (selection: any) => void;
}

/**
 * Form renderer specific props
 */
export interface FormRendererProps extends RendererBaseProps {
  /** Record ID for editing (undefined for create) */
  id?: string;
  
  /** Callback when form is successfully saved */
  onSaved?: (record: any) => void;
  
  /** Callback when cancel is clicked */
  onCancel?: () => void;
}

/**
 * Dashboard renderer specific props
 */
export interface DashboardRendererProps extends RendererBaseProps {
  /** Dashboard configuration */
  config?: any;
  
  /** Refresh interval in seconds */
  refreshInterval?: number;
}

/**
 * Renderer module shape
 * What we expect after dynamic import
 */
export type RendererModule = {
  /** Default export (optional) */
  default?: React.ComponentType<any>;
  /** The contract declaration (optional) */
  contract?: RendererContract;
  /** Named exports */
  [key: string]: any;
};

/**
 * Renderer registration entry
 */
export interface RendererRegistration {
  /** Lazy loader function */
  loader: () => Promise<RendererModule>;
  
  /** Contract (can be inline or from module) */
  contract: RendererContract;
  
  /** Component export name (if not default) */
  exportName?: string;
}

/**
 * Metadata adapter function signature
 * Transforms raw metadata into renderer-safe format
 */
export type MetadataAdapter<TRaw = any, TSafe = any> = (meta: TRaw) => TSafe;

/**
 * Error types for renderer loading
 */
export enum RendererError {
  MODULE_NOT_FOUND = "MODULE_NOT_FOUND",
  EXPORT_MISSING = "EXPORT_MISSING",
  CONTRACT_INVALID = "CONTRACT_INVALID",
  METADATA_INCOMPATIBLE = "METADATA_INCOMPATIBLE",
  CAPABILITY_UNSUPPORTED = "CAPABILITY_UNSUPPORTED",
}

/**
 * Renderer loading error
 */
export class RendererLoadError extends Error {
  constructor(
    public errorType: RendererError,
    message: string,
    public rendererId?: string,
    public version?: RendererVersion
  ) {
    super(message);
    this.name = "RendererLoadError";
  }
}
