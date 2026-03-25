/**
 * RBAC Filter
 * ===========
 * Takes a raw ModelMeta and applies the caller's SessionContext to produce a
 * MetaResponse that is safe to send to the client:
 *
 *  • Fields the role cannot read are removed from every view
 *  • Actions whose `visible_when` evaluates false (or role not in allowed_roles)
 *    are pruned
 *  • The resulting `permissions` block contains only the ops allowed for the role
 *
 * IMPORTANT: MetaExpression evaluation is intentionally minimal here — for now
 * the expressions are stubs. A full VM (e.g. safe-eval with a limited sandbox)
 * should be wired in before production use.
 */

import type {
  ModelMeta,
  MetaField,
  MetaAction,
  MetaFormView,
  MetaListView,
  MetaKanbanView,
  MetaResponse,
  SessionContext,
  RbacResult,
} from "@afenda/meta-types";
import { compileExpression } from "filtrex";

// ---------------------------------------------------------------------------
// Core RBAC resolver
// ---------------------------------------------------------------------------

/** Derive the effective RbacResult for a session against a model's meta. */
export function resolveRbac(meta: ModelMeta, session: SessionContext): RbacResult {
  const { roles } = session;
  const { default_role_permissions: drp = {}, field_permissions: fp = {} } =
    meta.permissions ?? {};

  // Merge permissions across all roles the user holds (additive)
  const allowedOps = {
    can_create: false,
    can_read: false,
    can_update: false,
    can_delete: false,
  };

  for (const role of roles) {
    const rp = drp[role];
    if (!rp) continue;
    if (rp.can_create) allowedOps.can_create = true;
    if (rp.can_read) allowedOps.can_read = true;
    if (rp.can_update) allowedOps.can_update = true;
    if (rp.can_delete) allowedOps.can_delete = true;
  }

  // Field-level visibility and writability
  const allFieldNames = meta.fields.map((f) => f.name);
  const visibleFields: string[] = [];
  const writableFields: string[] = [];

  for (const fieldName of allFieldNames) {
    const fieldPerm = fp[fieldName];
    if (!fieldPerm) {
      // No explicit rule → inherit model-level read/write
      if (allowedOps.can_read) visibleFields.push(fieldName);
      if (allowedOps.can_update) writableFields.push(fieldName);
      continue;
    }

    // Check if any of the session roles grants visibility
    const canSee = roles.some((r) => fieldPerm.visible_to?.includes(r) ?? true);
    const canWrite = roles.some((r) => fieldPerm.writable_by?.includes(r) ?? allowedOps.can_update);

    if (canSee) visibleFields.push(fieldName);
    if (canWrite) writableFields.push(fieldName);
  }

  return { allowedOps, visibleFields, writableFields };
}

// ---------------------------------------------------------------------------
// View pruning
// ---------------------------------------------------------------------------

function pruneFormView(view: MetaFormView, visibleFields: Set<string>): MetaFormView {
  return {
    ...view,
    groups: view.groups.map((g) => ({
      ...g,
      fields: g.fields.filter((f) => visibleFields.has(f)),
      tabs: g.tabs?.map((tab) => ({
        ...tab,
        groups: tab.groups.map((tg) => ({
          ...tg,
          fields: tg.fields.filter((f) => visibleFields.has(f)),
        })),
      })),
    })),
  };
}

function pruneListView(view: MetaListView, visibleFields: Set<string>): MetaListView {
  return {
    ...view,
    columns: view.columns.filter((c) => visibleFields.has(c)),
  };
}

// ---------------------------------------------------------------------------
// Action visibility evaluation
// ---------------------------------------------------------------------------

/**
 * Safely evaluate a visibility expression using filtrex.
 * 
 * Available context variables:
 * - role: first role in the session (string)
 * - roles: array of all roles (converted to hasRole function)
 * - uid: user ID (string)
 * - lang: user language (string)
 * 
 * Filtrex expression syntax:
 * - Comparison: = (equals), != (not equals), <, >, <=, >=
 * - Logical: and, or, not
 * - Strings: use single or double quotes
 * 
 * Example expressions:
 * - "role = 'admin'"
 * - "role = 'admin' or role = 'manager'"
 * - "hasRole('admin')"
 * - "hasRole('admin') or hasRole('manager')"
 * 
 * @param expression MetaExpression string (optional)
 * @param session Current user session
 * @returns boolean result of expression evaluation
 */
function evalVisibility(
  expression: string | undefined,
  session: SessionContext
): boolean {
  if (!expression) return true;

  try {
    // Build context from session
    const context = {
      role: session.roles[0] ?? "viewer",
      uid: session.uid,
      lang: session.lang ?? "en",
    };

    // Compile and execute the expression with filtrex
    // filtrex provides a safe sandbox - no access to globals, eval, or functions
    const compiledExpr = compileExpression(expression, {
      extraFunctions: {
        // Helper: check if any role in session matches
        hasRole: (roleName: string) => session.roles.includes(roleName),
        // Helper: check if session has all specified roles
        hasAllRoles: (...roleNames: string[]) => 
          roleNames.every((r) => session.roles.includes(r)),
      },
    });

    const result = compiledExpr(context);
    
    // Ensure boolean result
    return Boolean(result);
  } catch (error) {
    // Log error and fail-safe to hidden (security default)
    console.error(`[RBAC] Expression evaluation failed: ${expression}`, error);
    return false;
  }
}

function filterActions(
  actions: MetaAction[],
  session: SessionContext
): MetaAction[] {
  return actions.filter((action) => {
    // Role whitelist check
    if (action.allowed_roles?.length) {
      const hasRole = action.allowed_roles.some((r) => session.roles.includes(r));
      if (!hasRole) return false;
    }
    // Expression check
    return evalVisibility(action.visible_when, session);
  });
}

// ---------------------------------------------------------------------------
// Public entry point
// ---------------------------------------------------------------------------

/**
 * Apply RBAC to a ModelMeta and return a client-safe MetaResponse.
 *
 * @param meta     Raw ModelMeta from schema registry
 * @param session  Caller's session (roles, uid, lang)
 */
export function applyRbac(meta: ModelMeta, session: SessionContext): MetaResponse {
  const rbac = resolveRbac(meta, session);
  const visibleSet = new Set(rbac.visibleFields);

  // Prune fields list
  const filteredFields: MetaField[] = meta.fields
    .filter((f) => visibleSet.has(f.name))
    .map((f) => {
      // Mark non-writable fields as readonly in the schema sent to client
      const writable = rbac.writableFields.includes(f.name);
      return writable ? f : { ...f, readonly: true };
    });

  // Prune views
  const filteredMeta: ModelMeta = {
    ...meta,
    fields: filteredFields,
    views: {
      ...meta.views,
      ...(meta.views.form
        ? { form: pruneFormView(meta.views.form, visibleSet) }
        : {}),
      ...(meta.views.list
        ? { list: pruneListView(meta.views.list, visibleSet) }
        : {}),
    },
    actions: filterActions(meta.actions ?? [], session),
  };

  return {
    meta: filteredMeta,
    effective_role: session.roles[0] ?? "viewer",
    permissions: rbac.allowedOps,
  };
}
