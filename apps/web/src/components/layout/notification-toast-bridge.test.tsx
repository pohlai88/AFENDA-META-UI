import React from "react";
import { act, render, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { NotificationToastBridge } from "./notification-toast-bridge";
import { useNotificationStore } from "~/stores/ui";

const { toastMock } = vi.hoisted(() => ({
  toastMock: {
    info: vi.fn(),
    success: vi.fn(),
    warning: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock("sonner", () => ({
  toast: toastMock,
}));

describe("NotificationToastBridge", () => {
  beforeEach(() => {
    useNotificationStore.getState().clearAll();
    vi.clearAllMocks();
    vi.useRealTimers();
  });

  it("shows a toast for newly added notifications", async () => {
    render(<NotificationToastBridge />);

    act(() => {
      useNotificationStore.getState().addNotification({
        title: "Navigation opened",
        message: "Sidebar navigation is now visible.",
        type: "info",
      });
    });

    await waitFor(() => {
      expect(toastMock.info).toHaveBeenCalledTimes(1);
    });

    expect(toastMock.info).toHaveBeenCalledWith("Navigation opened", {
      description: "Sidebar navigation is now visible.",
    });
  });

  it("does not replay notifications that already existed before mount", async () => {
    act(() => {
      useNotificationStore.getState().addNotification({
        title: "Existing",
        message: "Should not replay",
        type: "warning",
      });
    });

    render(<NotificationToastBridge />);

    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(toastMock.warning).not.toHaveBeenCalled();

    act(() => {
      useNotificationStore.getState().addNotification({
        title: "New warning",
        message: "Should toast",
        type: "warning",
      });
    });

    await waitFor(() => {
      expect(toastMock.warning).toHaveBeenCalledTimes(1);
    });
  });

  it("suppresses duplicate notifications inside the dedupe window", async () => {
    const nowSpy = vi.spyOn(Date, "now");
    nowSpy.mockReturnValue(10_000);

    render(<NotificationToastBridge />);

    act(() => {
      useNotificationStore.getState().addNotification({
        title: "Navigation opened",
        message: "Sidebar navigation is now visible.",
        type: "info",
      });
      useNotificationStore.getState().addNotification({
        title: "Navigation opened",
        message: "Sidebar navigation is now visible.",
        type: "info",
      });
    });

    await waitFor(() => {
      expect(toastMock.info).toHaveBeenCalledTimes(1);
    });

    nowSpy.mockReturnValue(13_000);

    act(() => {
      useNotificationStore.getState().addNotification({
        title: "Navigation opened",
        message: "Sidebar navigation is now visible.",
        type: "info",
      });
    });

    await waitFor(() => {
      expect(toastMock.info).toHaveBeenCalledTimes(2);
    });

    nowSpy.mockRestore();
  });
});
