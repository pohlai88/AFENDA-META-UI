/**
 * Row Actions Menu Component
 * ==========================
 * Renders available actions for a single record in MetaListV2.
 *
 * Features:
 * - Display model actions as dropdown menu
 * - Execute actions with record context
 * - Show loading state during execution
 * - Toast notifications on success/error
 */

import React from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@afenda/ui";
import { MoreVerticalIcon } from "lucide-react";
import { useActions } from "~/hooks/useActions";
import type { MetaAction } from "@afenda/meta-types";
import { logger } from "../lib/logger";
const log = logger.child({ module: "RowActionsMenu" });

export interface RowActionsMenuProps {
  model: string;
  recordId: string;
  record: Record<string, unknown>;
  actions?: MetaAction[];
}

export function RowActionsMenu({ model, recordId, record, actions = [] }: RowActionsMenuProps) {
  const [isOpen, setIsOpen] = React.useState(false);
  const { execute, isExecuting } = useActions(model);

  const handleExecuteAction = React.useCallback(
    async (action: MetaAction) => {
      try {
        await execute(action.id, {
          model,
          recordId,
          data: record,
        });
        setIsOpen(false);
      } catch (error) {
        log.error("Failed to execute action:", error);
      }
    },
    [execute, model, recordId, record]
  );

  // Early return AFTER all hooks
  if (actions.length === 0) {
    return null;
  }

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="p-1 hover:bg-accent rounded"
          disabled={isExecuting}
          aria-label="Row actions"
        >
          <MoreVerticalIcon className="h-4 w-4" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {actions.map((action) => (
          <DropdownMenuItem
            key={action.id}
            onClick={() => handleExecuteAction(action)}
            disabled={isExecuting}
            className={
              action.style === "danger" ? "text-destructive focus:text-destructive" : undefined
            }
          >
            {action.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
