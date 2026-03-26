import { WifiOffIcon } from "lucide-react";
import { useOnlineStatus } from "~/hooks/useOnlineStatus";

/**
 * Displays a persistent warning when network connectivity is lost.
 */
export function OfflineBanner() {
  const isOnline = useOnlineStatus();

  if (isOnline) {
    return null;
  }

  return (
    <div
      role="status"
      aria-live="polite"
      className="border-b border-amber-300 bg-amber-100 px-4 py-2 text-sm text-amber-900"
    >
      <div className="mx-auto flex max-w-screen-2xl items-center gap-2">
        <WifiOffIcon className="h-4 w-4" aria-hidden="true" />
        <span>You are offline. Changes may not sync until your connection is restored.</span>
      </div>
    </div>
  );
}
