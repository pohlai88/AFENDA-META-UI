import { useState } from "react";
import { Button } from "@afenda/ui";
import type { MetaAction } from "@afenda/meta-types/schema";
import { useModelAction } from "~/hooks/useModelAction";

type ButtonVariant = "default" | "secondary" | "destructive" | "outline" | "ghost";

const STYLE_TO_VARIANT: Record<NonNullable<MetaAction["style"]>, ButtonVariant> = {
  primary: "default",
  secondary: "secondary",
  danger: "destructive",
  warning: "outline",
  ghost: "ghost",
};

export interface ActionButtonsProps {
  /** RBAC-filtered MetaAction list — only actions the current user may perform */
  actions: MetaAction[];
  size?: "sm" | "default";
  /**
   * Override for executing an action.
   * Use this for domain-specific mutations that need optimistic updates, Redux
   * dispatch, or audit logging (e.g. purchase order approve/reject).
   * When omitted, a generic fetch against action.url is used via useModelAction.
   */
  onAction?: (action: MetaAction) => void | Promise<void>;
  /** Required only when onAction is NOT provided */
  model?: string;
  recordId?: string;
}

export function ActionButtons({
  actions,
  size = "sm",
  onAction,
  model = "",
  recordId = "",
}: ActionButtonsProps) {
  const [pendingId, setPendingId] = useState<string | null>(null);

  // Instantiated unconditionally (hook rules) — only triggered when onAction is absent
  const mutation = useModelAction({ model, recordId });

  if (!actions.length) return null;

  const handleClick = async (action: MetaAction) => {
    if (action.confirm_message && !window.confirm(action.confirm_message)) {
      return;
    }

    setPendingId(action.id);
    try {
      if (onAction) {
        await onAction(action);
      } else {
        await mutation.mutateAsync(action);
      }
    } finally {
      setPendingId(null);
    }
  };

  return (
    <div className="flex gap-2 flex-wrap">
      {actions.map((action) => {
        const isPending = pendingId === action.id;
        const variant = action.style ? STYLE_TO_VARIANT[action.style] : "outline";
        return (
          <Button
            key={action.id}
            variant={variant}
            size={size}
            disabled={isPending || mutation.isPending}
            onClick={() => void handleClick(action)}
          >
            {isPending ? `${action.label}…` : action.label}
          </Button>
        );
      })}
    </div>
  );
}
