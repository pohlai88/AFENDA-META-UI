import React from "react";
import { toast } from "sonner";
import { useNotificationStore } from "~/stores/ui";
import { getAppConfig } from "~/lib/app-config";

type ToastVariant = "info" | "success" | "warning" | "error";

const toastByVariant: Record<ToastVariant, typeof toast.info> = {
  info: toast.info,
  success: toast.success,
  warning: toast.warning,
  error: toast.error,
};

export function NotificationToastBridge() {
  const dedupeWindowMs = React.useMemo(
    () => getAppConfig().notificationToastDedupeMs,
    []
  );
  const notifications = useNotificationStore((state) => state.notifications);
  const seenIdsRef = React.useRef(
    new Set(useNotificationStore.getState().notifications.map((item) => item.id))
  );
  const dedupeWindowRef = React.useRef<Map<string, number>>(new Map());

  React.useEffect(() => {
    const now = Date.now();

    for (const [fingerprint, timestamp] of dedupeWindowRef.current.entries()) {
      if (now - timestamp > dedupeWindowMs) {
        dedupeWindowRef.current.delete(fingerprint);
      }
    }

    // Only toast notifications created after this bridge has mounted.
    for (const notification of notifications) {
      if (seenIdsRef.current.has(notification.id)) {
        continue;
      }

      seenIdsRef.current.add(notification.id);
      const fingerprint = [notification.type, notification.title, notification.message].join("|");
      const lastShownAt = dedupeWindowRef.current.get(fingerprint);

      if (lastShownAt && now - lastShownAt < dedupeWindowMs) {
        continue;
      }

      dedupeWindowRef.current.set(fingerprint, now);
      const showToast = toastByVariant[notification.type];

      showToast(notification.title, {
        description: notification.message,
      });
    }
  }, [dedupeWindowMs, notifications]);

  return null;
}

export default NotificationToastBridge;