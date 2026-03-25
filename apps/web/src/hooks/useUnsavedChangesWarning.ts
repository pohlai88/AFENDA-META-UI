/**
 * Unsaved Changes Hook
 * ====================
 * Prevents accidental navigation away from forms with unsaved changes.
 *
 * Features:
 * - Browser navigation warning (beforeunload)
 * - React Router navigation blocking (useBlocker)
 * - Custom confirmation dialog
 *
 * Usage:
 * ```tsx
 * const methods = useForm();
 * useUnsavedChangesWarning(methods.formState.isDirty);
 * ```
 */

import { useEffect, useCallback } from "react";
import { useBlocker } from "react-router-dom";

export interface UseUnsavedChangesWarningOptions {
  /**
   * Whether there are unsaved changes
   */
  isDirty: boolean;

  /**
   * Custom message for browser confirmation
   */
  message?: string;

  /**
   * Whether to enable the warning (default: true)
   */
  enabled?: boolean;
}

/**
 * Hook to warn users about unsaved changes
 */
export function useUnsavedChangesWarning(isDirty: boolean, message?: string): void;
export function useUnsavedChangesWarning(options: UseUnsavedChangesWarningOptions): void;
export function useUnsavedChangesWarning(
  isDirtyOrOptions: boolean | UseUnsavedChangesWarningOptions,
  message?: string
): void {
  // Normalize parameters
  const options: UseUnsavedChangesWarningOptions =
    typeof isDirtyOrOptions === "boolean"
      ? { isDirty: isDirtyOrOptions, message, enabled: true }
      : isDirtyOrOptions;

  const {
    isDirty,
    message: confirmMessage = "You have unsaved changes. Are you sure you want to leave?",
    enabled = true,
  } = options;

  const shouldBlock = enabled && isDirty;

  // -------------------------------------------------------------------------
  // Browser navigation warning (page unload/refresh)
  // -------------------------------------------------------------------------

  useEffect(() => {
    if (!shouldBlock) return;

    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      // Modern browsers ignore custom messages and show a generic one
      event.returnValue = confirmMessage;
      return confirmMessage;
    };

    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [shouldBlock, confirmMessage]);

  // -------------------------------------------------------------------------
  // React Router navigation blocking
  // -------------------------------------------------------------------------

  const blocker = useBlocker(
    useCallback(
      ({ currentLocation, nextLocation }: { currentLocation: any; nextLocation: any }) => {
        // Only block if:
        // 1. shouldBlock is true (form is dirty)
        // 2. Navigation is to a different path
        return shouldBlock && currentLocation.pathname !== nextLocation.pathname;
      },
      [shouldBlock]
    )
  );

  // Handle blocker state
  useEffect(() => {
    if (blocker.state === "blocked") {
      const confirmed = window.confirm(confirmMessage);

      if (confirmed) {
        blocker.proceed();
      } else {
        blocker.reset();
      }
    }
  }, [blocker, confirmMessage]);
}
