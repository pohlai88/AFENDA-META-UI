/**
 * ApprovalActions
 * ================
 * Domain-specific workflow component that demonstrates full integration:
 * - useModelWithMeta: RBAC permissions + effective role context
 * - useModelAction: generic action execution with cache invalidation
 * - Audit logging: fire-and-forget tracking of user actions
 * - Permission checks: ensures user can perform the action
 *
 * This is the **production pattern** for any approval/workflow component.
 * Extend by changing actionToAuditKey mapping or permission logic.
 */

import { toast } from "@afenda/ui";
import { useMeta } from "~/hooks/useMeta";
import { useModelAction } from "~/hooks/useModelAction";
import { useModelWithMeta } from "~/hooks/useModelWithMeta";
import { ActionButtons } from "~/components/ActionButtons";
import { emitAuditLog, type AuditAction } from "~/api/audit-log";
import type { MetaAction } from "@afenda/meta-types/schema";
interface ApprovalActionsProps {
  /** Model name (e.g. "sales_order", "purchase_order") */
  model: string;
  /** Record ID to perform actions against */
  recordId: string;
  /** Current record status (used to filter relevant actions) */
  status?: string;
  /** Optional: Map MetaAction IDs to audit log actions for compliance tracking */
  actionToAuditKey?: Record<string, AuditAction>;
  /** Optional: Size of buttons */
  size?: "sm" | "default";
}

/**
 * Default audit key mappings for common approvals.
 * Extend this for your domain-specific actions.
 */
const DEFAULT_AUDIT_MAPPINGS: Record<string, AuditAction> = {
  approve: "purchaseOrder.approve",
  reject: "purchaseOrder.reject",
  submit: "purchaseOrder.submit",
};

function formatRoleLabel(role: string) {
  return role
    .split(/[_-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(" ");
}

export function ApprovalActions({
  model,
  recordId,
  status,
  actionToAuditKey = DEFAULT_AUDIT_MAPPINGS,
  size = "sm",
}: ApprovalActionsProps) {
  // RBAC permissions come from useModelWithMeta so this component aligns with CRUD guardrails.
  const { permissions, effectiveRole, isMetaLoading, isReady } = useModelWithMeta(model);

  // Metadata provides the action definitions/labels/URLs.
  const { data: metaResponse, error: metaError } = useMeta(model);

  // Generic action executor
  const actionMutation = useModelAction({ model, recordId });

  if (isMetaLoading || !isReady) return null;
  if (metaError) return <span className="text-xs text-destructive">Failed to load actions</span>;

  // Get available actions from metadata
  const allActions = metaResponse?.meta.actions ?? [];

  const canExecuteAction = (action: MetaAction): boolean => {
    if (!permissions) return false;
    switch (action.method) {
      case "GET":
        return permissions.can_read;
      case "DELETE":
        return permissions.can_delete;
      case "PATCH":
      case "PUT":
        return permissions.can_update;
      case "POST":
      default:
        return permissions.can_update || permissions.can_create;
    }
  };

  // Filter actions by status context (if provided)
  const relevantActions = (
    status
      ? allActions.filter((action) => {
          // Example: only show approve/reject for "submitted" status
          if (status === "draft" && action.id === "submit") return true;
          if (status === "submitted" && ["approve", "reject"].includes(action.id)) return true;
          return false;
        })
      : allActions
  ).filter(canExecuteAction);

  // Handler that wraps action execution with audit logging
  const handleAction = async (action: MetaAction) => {
    const auditKey = actionToAuditKey[action.id] || (action.id as AuditAction);

    if (!canExecuteAction(action)) {
      toast.error("You do not have permission to perform this action");
      await emitAuditLog({
        action: auditKey,
        outcome: "error",
        entityId: recordId,
        message: `Forbidden action attempt: ${action.label}`,
        metadata: {
          model,
          action: action.id,
          method: action.method,
          reason: "permission_denied_client_guard",
        },
      });
      return;
    }

    try {
      await actionMutation.mutateAsync(action);

      // Audit: success
      await emitAuditLog({
        action: auditKey,
        outcome: "success",
        entityId: recordId,
        message: `${action.label} executed on ${model} ${recordId}`,
        metadata: {
          model,
          action: action.id,
          method: action.method,
        },
      });
    } catch (error) {
      // Audit: failure
      await emitAuditLog({
        action: auditKey,
        outcome: "error",
        entityId: recordId,
        message: error instanceof Error ? error.message : "Unknown error",
        metadata: {
          model,
          action: action.id,
          method: action.method,
        },
      });

      // Error is already shown via toast by useModelAction
      throw error;
    }
  };

  if (!relevantActions.length) {
    return null;
  }

  return (
    <div className="space-y-2">
      {effectiveRole ? (
        <p className="text-xs text-muted-foreground">Acting as {formatRoleLabel(effectiveRole)}</p>
      ) : null}
      <ActionButtons actions={relevantActions} size={size} onAction={handleAction} />
    </div>
  );
}
