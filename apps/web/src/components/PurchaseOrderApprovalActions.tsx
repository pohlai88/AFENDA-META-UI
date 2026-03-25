import { Button, toast } from "@afenda/ui";
import { useModelWithMeta } from "~/hooks/useModelWithMeta";
import { usePurchaseOrderActions } from "~/hooks/usePurchaseOrderActions";
import type { PurchaseOrderStatus } from "~/api/purchase-orders";

interface PurchaseOrderApprovalActionsProps {
  orderId: string;
  status: PurchaseOrderStatus;
}

function formatRoleLabel(role: string) {
  return role
    .split(/[_-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(" ");
}

export function PurchaseOrderApprovalActions({
  orderId,
  status,
}: PurchaseOrderApprovalActionsProps) {
  const { permissions, effectiveRole, isReady, isMetaLoading } = useModelWithMeta("purchase_order");
  const { submit, approve, reject } = usePurchaseOrderActions();

  const canTransition = !!permissions?.can_update;

  const submitPending = submit.isPending && submit.variables === orderId;
  const approvePending = approve.isPending && approve.variables === orderId;
  const rejectPending = reject.isPending && reject.variables === orderId;

  const isAnyPending = submitPending || approvePending || rejectPending;

  const guardPermission = () => {
    if (!isReady || !canTransition) {
      toast.error("You do not have permission to perform this action");
      return false;
    }
    return true;
  };

  const handleSubmit = async () => {
    if (!guardPermission()) return;
    await submit.mutateAsync(orderId);
  };

  const handleApprove = async () => {
    if (!guardPermission()) return;
    await approve.mutateAsync(orderId);
  };

  const handleReject = async () => {
    if (!guardPermission()) return;
    await reject.mutateAsync(orderId);
  };

  if (isMetaLoading || !isReady) {
    return null;
  }

  return (
    <div className="space-y-2">
      {effectiveRole ? (
        <p className="text-xs text-muted-foreground">Acting as {formatRoleLabel(effectiveRole)}</p>
      ) : null}

      <div className="flex gap-2 flex-wrap">
        {status === "draft" && (
          <Button size="sm" onClick={() => void handleSubmit()} disabled={isAnyPending}>
            {submitPending ? "Submitting..." : "Submit"}
          </Button>
        )}

        {status === "submitted" && (
          <>
            <Button
              size="sm"
              variant="secondary"
              onClick={() => void handleApprove()}
              disabled={isAnyPending}
            >
              {approvePending ? "Approving..." : "Approve"}
            </Button>

            <Button
              size="sm"
              variant="destructive"
              onClick={() => void handleReject()}
              disabled={isAnyPending}
            >
              {rejectPending ? "Rejecting..." : "Reject"}
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
