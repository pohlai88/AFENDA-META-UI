/**
 * Layout Engine — Server-side
 * ===========================
 * Resolves, normalizes, and validates layout trees for a given model+role+viewType.
 *
 * Pipeline:
 *   Layout Tree → Normalize → Resolve Visibility → Flatten Render Plan
 *
 * NEW: Tenant-aware layout resolution via ResolutionContext
 * =========================================================
 * Layouts can now be tenant/department/industry-specific:
 *  • Global layouts (applies to all tenants)
 *  • Industry-specific layouts (e.g., all "retail" tenants)
 *  • Tenant-specific layouts (e.g., "acme-corp")
 *  • Department-specific layouts (under a tenant)
 *  • User-specific layouts (narrowest scope)
 *
 * resolveLayoutWithContext() picks the best match using hierarchy.
 */

import type {
  LayoutDefinition,
  LayoutNode,
  LayoutField,
  LayoutViewType,
  ResolvedLayout,
  ResolutionContext,
  ModelMeta,
} from "@afenda/meta-types";
import { resolveMetadata } from "../tenant/index.js";

// ---------------------------------------------------------------------------
// Layout Registry (in-memory, swap for DB in production)
// ---------------------------------------------------------------------------

const layoutStore = new Map<string, LayoutDefinition>();

export function registerLayout(layout: LayoutDefinition): void {
  layoutStore.set(layout.id, layout);
}

export function removeLayout(id: string): boolean {
  return layoutStore.delete(id);
}

export function clearLayouts(): void {
  layoutStore.clear();
}

export function getLayout(id: string): LayoutDefinition | undefined {
  return layoutStore.get(id);
}

export function getAllLayouts(): LayoutDefinition[] {
  return Array.from(layoutStore.values());
}

// ---------------------------------------------------------------------------
// Layout Resolution — pick the best layout for a context
// ---------------------------------------------------------------------------

export interface LayoutResolutionContext {
  model: string;
  viewType: LayoutViewType;
  roles: string[];
}

/**
 * Resolve the best layout for a given model + viewType + user roles.
 *
 * Priority:
 * 1. Role-specific layout (most specific roles match)
 * 2. Default layout for model+viewType
 * 3. null (no layout found — fall back to auto-generated)
 */
export function resolveLayout(ctx: LayoutResolutionContext): ResolvedLayout | null {
  const candidates = Array.from(layoutStore.values()).filter(
    (l) => l.model === ctx.model && l.viewType === ctx.viewType,
  );

  if (candidates.length === 0) return null;

  // Find role-specific match first
  const roleMatch = candidates.find(
    (l) =>
      l.roles &&
      l.roles.length > 0 &&
      l.roles.some((r) => ctx.roles.includes(r)),
  );

  // Then default
  const defaultMatch = candidates.find((l) => l.isDefault);

  // Then any
  const layout = roleMatch ?? defaultMatch ?? candidates[0];

  return {
    layout,
    referencedFieldIds: collectFieldIds(layout.root),
  };
}

/**
 * Resolve layout with tenant context — selects layout based on tenant/department/industry.
 *
 * Enhanced priority (tenant-aware):
 * 1. User-specific layout (userId match)
 * 2. Department-specific layout (departmentId match)
 * 3. Industry-specific layout (industry match)
 * 4. Tenant-specific layout (tenantId match)
 * 5. Global layout (no scope)
 *
 * Within each tier, role-specific beats default.
 */
export interface TenantAwareLayoutResolutionContext {
  model: string;
  viewType: LayoutViewType;
  roles: string[];
  tenantContext: ResolutionContext;
}

export function resolveLayoutWithContext(
  ctx: TenantAwareLayoutResolutionContext,
): ResolvedLayout | null {
  const candidates = Array.from(layoutStore.values()).filter(
    (l) => l.model === ctx.model && l.viewType === ctx.viewType,
  );

  if (candidates.length === 0) return null;

  // Sort candidates by scope specificity (most specific first)
  // Scope format: "global", "industry:retail", "tenant:acme", "dept:sales", "user:john"
  const scored = candidates.map((layout) => {
    let score = 0;
    const scope = layout.scope || "global";

    // Match against context hierarchy (highest score = most specific)
    if (ctx.tenantContext.userId && scope.startsWith("user:")) {
      if (scope === `user:${ctx.tenantContext.userId}`) score = 500;
    } else if (ctx.tenantContext.departmentId && scope.startsWith("dept:")) {
      if (scope === `dept:${ctx.tenantContext.departmentId}`) score = 400;
    } else if (ctx.tenantContext.industry && scope.startsWith("industry:")) {
      if (scope === `industry:${ctx.tenantContext.industry}`) score = 300;
    } else if (scope.startsWith("tenant:")) {
      if (scope === `tenant:${ctx.tenantContext.tenantId}`) score = 200;
    } else if (scope === "global") {
      score = 100;
    }

    return { layout, score };
  });

  // Filter to only relevant layouts
  const relevant = scored.filter((s) => s.score > 0);
  if (relevant.length === 0) return null;

  // Group by score; within each group, prefer role-specific
  const maxScore = Math.max(...relevant.map((s) => s.score));
  const topTier = relevant.filter((s) => s.score === maxScore);

  // Among top-tier layouts, prefer role match, then default
  const roleMatch = topTier.find(
    (s) =>
      s.layout.roles &&
      s.layout.roles.length > 0 &&
      s.layout.roles.some((r) => ctx.roles.includes(r)),
  );

  const defaultMatch = topTier.find((s) => s.layout.isDefault);
  const chosen = roleMatch ?? defaultMatch ?? topTier[0];

  return {
    layout: chosen.layout,
    referencedFieldIds: collectFieldIds(chosen.layout.root),
  };
}

// ---------------------------------------------------------------------------
// Field collection — gather all fieldIds referenced in a tree
// ---------------------------------------------------------------------------

function collectFieldIds(node: LayoutNode): string[] {
  const ids: string[] = [];
  collectFieldIdsRecursive(node, ids);
  return [...new Set(ids)];
}

function collectFieldIdsRecursive(node: LayoutNode, ids: string[]): void {
  switch (node.type) {
    case "field":
      ids.push(node.fieldId);
      break;
    case "section":
    case "grid":
      for (const child of node.children) {
        collectFieldIdsRecursive(child, ids);
      }
      break;
    case "tabs":
      for (const tab of node.tabs) {
        for (const child of tab.children) {
          collectFieldIdsRecursive(child, ids);
        }
      }
      break;
    case "custom":
      // Custom components don't reference fields directly
      break;
  }
}

// ---------------------------------------------------------------------------
// Validation — check that a layout tree references valid field IDs
// ---------------------------------------------------------------------------

export interface LayoutValidationError {
  path: string;
  message: string;
}

export function validateLayout(
  layout: LayoutDefinition,
  validFieldIds: Set<string>,
): LayoutValidationError[] {
  const errors: LayoutValidationError[] = [];
  validateNode(layout.root, "root", validFieldIds, errors);
  return errors;
}

function validateNode(
  node: LayoutNode,
  path: string,
  validFieldIds: Set<string>,
  errors: LayoutValidationError[],
): void {
  switch (node.type) {
    case "field":
      if (!validFieldIds.has(node.fieldId)) {
        errors.push({
          path,
          message: `Unknown field ID: "${node.fieldId}"`,
        });
      }
      break;
    case "section":
      node.children.forEach((child, i) =>
        validateNode(child, `${path}.children[${i}]`, validFieldIds, errors),
      );
      break;
    case "grid":
      if (node.columns < 1 || node.columns > 12) {
        errors.push({
          path,
          message: `Grid columns must be 1-12, got ${node.columns}`,
        });
      }
      node.children.forEach((child, i) =>
        validateNode(child, `${path}.children[${i}]`, validFieldIds, errors),
      );
      break;
    case "tabs":
      node.tabs.forEach((tab, i) => {
        tab.children.forEach((child, j) =>
          validateNode(
            child,
            `${path}.tabs[${i}].children[${j}]`,
            validFieldIds,
            errors,
          ),
        );
      });
      break;
    case "custom":
      // Custom nodes are always valid from a field perspective
      break;
  }
}

// ---------------------------------------------------------------------------
// Flatten — produce a flat render plan from the tree
// ---------------------------------------------------------------------------

export interface RenderPlanItem {
  type: LayoutNode["type"];
  depth: number;
  node: LayoutNode;
  /** For field nodes, the fieldId */
  fieldId?: string;
  /** Parent path key for grouping */
  parentPath: string;
}

/**
 * Flatten a layout tree into a render plan — a flat array of items
 * that can be rendered sequentially or used for virtual scrolling.
 */
export function flattenRenderPlan(root: LayoutNode): RenderPlanItem[] {
  const plan: RenderPlanItem[] = [];
  flattenNode(root, 0, "root", plan);
  return plan;
}

function flattenNode(
  node: LayoutNode,
  depth: number,
  parentPath: string,
  plan: RenderPlanItem[],
): void {
  const item: RenderPlanItem = {
    type: node.type,
    depth,
    node,
    parentPath,
    fieldId: node.type === "field" ? (node as LayoutField).fieldId : undefined,
  };
  plan.push(item);

  switch (node.type) {
    case "section":
    case "grid":
      node.children.forEach((child, i) =>
        flattenNode(child, depth + 1, `${parentPath}.${i}`, plan),
      );
      break;
    case "tabs":
      node.tabs.forEach((tab, i) =>
        tab.children.forEach((child, j) =>
          flattenNode(child, depth + 1, `${parentPath}.tab${i}.${j}`, plan),
        ),
      );
      break;
  }
}
