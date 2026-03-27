import { beforeEach, describe, expect, it } from "vitest";
import { useNotificationStore } from "../notification-store";

describe("useNotificationStore", () => {
  beforeEach(() => {
    useNotificationStore.getState().clearAll();
  });

  it("adds notifications and increments unread count", () => {
    useNotificationStore.getState().addNotification({
      title: "Saved",
      message: "Record saved successfully",
      type: "success",
    });

    const state = useNotificationStore.getState();
    expect(state.notifications).toHaveLength(1);
    expect(state.unreadCount).toBe(1);
    expect(state.notifications[0].read).toBe(false);
  });

  it("marks a single notification as read", () => {
    useNotificationStore.getState().addNotification({
      title: "Warning",
      message: "Validation warning",
      type: "warning",
    });

    const id = useNotificationStore.getState().notifications[0].id;
    useNotificationStore.getState().markAsRead(id);

    const state = useNotificationStore.getState();
    expect(state.notifications[0].read).toBe(true);
    expect(state.unreadCount).toBe(0);
  });

  it("marks all notifications as read", () => {
    useNotificationStore.getState().addNotification({
      title: "Info",
      message: "Info 1",
      type: "info",
    });
    useNotificationStore.getState().addNotification({
      title: "Error",
      message: "Info 2",
      type: "error",
    });

    useNotificationStore.getState().markAllAsRead();

    const state = useNotificationStore.getState();
    expect(state.unreadCount).toBe(0);
    expect(state.notifications.every((n) => n.read)).toBe(true);
  });

  it("removes notification and updates unread count", () => {
    useNotificationStore.getState().addNotification({
      title: "One",
      message: "One",
      type: "info",
    });
    useNotificationStore.getState().addNotification({
      title: "Two",
      message: "Two",
      type: "info",
    });

    const targetId = useNotificationStore.getState().notifications[0].id;
    useNotificationStore.getState().removeNotification(targetId);

    const state = useNotificationStore.getState();
    expect(state.notifications).toHaveLength(1);
    expect(state.unreadCount).toBe(1);
  });
});
