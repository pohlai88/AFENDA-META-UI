import { configureStore, type Middleware, type UnknownAction } from "@reduxjs/toolkit";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  configureAnalyticsClient,
  flushAnalytics,
  resetAnalyticsClientForTests,
  type AnalyticsProviderAdapter,
} from "../analytics";
import authReducer, { loginSuccess, logout } from "../slices/auth-slice";
import permissionsReducer, { bootstrapPermissionsSuccess } from "../slices/permissions-slice";
import {
  analytics,
  buildAnalyticsEvent,
  shouldTrackAnalytics,
} from "./analytics";

describe("analytics middleware", () => {
  let trackedEvents: unknown[];
  let batchedEvents: unknown[];

  beforeEach(() => {
    trackedEvents = [];
    batchedEvents = [];
    localStorage.clear();
    configureAnalyticsClient({
      providers: [
        {
          id: "console",
          track: (event) => {
            trackedEvents.push(event);
          },
          trackBatch: (events) => {
            batchedEvents.push(events);
          },
        } satisfies AnalyticsProviderAdapter,
      ],
      providerIds: ["console"],
      batchSize: 10,
      flushIntervalMs: 1000,
    });
  });

  afterEach(async () => {
    await flushAnalytics();
    resetAnalyticsClientForTests();
  });

  function createStore(extraMiddleware?: Middleware) {
    return configureStore({
      reducer: {
        auth: authReducer,
        permissions: permissionsReducer,
      },
      middleware: (getDefaultMiddleware) =>
        extraMiddleware
          ? getDefaultMiddleware().concat(analytics, extraMiddleware)
          : getDefaultMiddleware().concat(analytics),
    });
  }

  it("tracks auth namespace actions with post-dispatch user context", async () => {
    const store = createStore();

    store.dispatch(
      loginSuccess({
        user: {
          id: "u-1",
          name: "Amina",
          email: "amina@example.com",
          role: "manager",
        },
        token: "token-1",
      })
    );

    await flushAnalytics();

    expect(trackedEvents).toContainEqual(
      expect.objectContaining({
        event: "auth/loginSuccess",
        actionType: "auth/loginSuccess",
        userId: "u-1",
        role: "manager",
        isAuthenticated: true,
      })
    );
  });

  it("tracks metadata-declared events even when action type is outside tracked namespaces", async () => {
    const store = createStore();

    store.dispatch(
      {
        type: "salesOrder/bulkApprove",
        payload: { ids: ["SO-1", "SO-2"] },
        meta: {
          analytics: {
            event: "salesOrder.bulkApproved",
            category: "sales",
            label: "bulk-approve",
          },
          model: "sales_order",
          recordId: "SO-1",
          viewId: "orders.list",
        },
      } as UnknownAction
    );

    await flushAnalytics();

    expect(trackedEvents).toContainEqual(
      expect.objectContaining({
        event: "salesOrder.bulkApproved",
        actionType: "salesOrder/bulkApprove",
        model: "sales_order",
        recordId: "SO-1",
        viewId: "orders.list",
        category: "sales",
        label: "bulk-approve",
      })
    );
  });

  it("allows analytics metadata to suppress otherwise tracked namespaces", async () => {
    const store = createStore();

    store.dispatch({
      type: "auth/logout",
      meta: { analytics: false },
    } as UnknownAction);

    await flushAnalytics();

    expect(trackedEvents).toEqual([]);
  });

  it("captures permission bootstrap status in enriched events", async () => {
    const store = createStore();

    store.dispatch(
      bootstrapPermissionsSuccess({
        role: "manager",
        permissions: [],
      })
    );

    await flushAnalytics();

    expect(trackedEvents).toContainEqual(
      expect.objectContaining({
        actionType: "permissions/bootstrapPermissionsSuccess",
        permissionsBootstrapStatus: "ready",
        role: null,
      })
    );
  });

  it("returns the original dispatch result and does not track unrelated actions", () => {
    const store = createStore();

    const result = store.dispatch({ type: "notifications/enqueue" } as UnknownAction);

    expect(result).toEqual({ type: "notifications/enqueue" });
    expect(trackedEvents).toEqual([]);
  });

  it("batches events when metadata requests a flush", async () => {
    const store = createStore();

    store.dispatch({
      type: "erp/invoiceApproved",
      meta: {
        analytics: {
          event: "invoice.approved",
        },
      },
    } as UnknownAction);
    store.dispatch({
      type: "erp/invoiceRejected",
      meta: {
        analytics: {
          event: "invoice.rejected",
          flush: true,
        },
      },
    } as UnknownAction);

    expect(batchedEvents).toEqual([
      [
        expect.objectContaining({ event: "invoice.approved" }),
        expect.objectContaining({ event: "invoice.rejected" }),
      ],
    ]);
  });
});

describe("analytics helpers", () => {
  it("matches tracked namespaces and metadata overrides", () => {
    expect(shouldTrackAnalytics({ type: "auth/logout" })).toBe(true);
    expect(shouldTrackAnalytics({ type: "misc/action" })).toBe(false);
    expect(
      shouldTrackAnalytics({
        type: "misc/action",
        meta: { analytics: true },
      })
    ).toBe(true);
    expect(
      shouldTrackAnalytics({
        type: "auth/logout",
        meta: { analytics: false },
      })
    ).toBe(false);
  });

  it("builds a stable analytics event payload from state and action metadata", () => {
    const event = buildAnalyticsEvent(
      {
        type: "erp/invoiceApproved",
        meta: {
          analytics: {
            event: "invoice.approved",
            category: "finance",
          },
          model: "invoice",
          recordId: 42,
          viewId: "finance.invoices",
          label: "approve",
        },
      },
      {
        auth: {
          user: { id: "u-99", role: "controller" },
          isAuthenticated: true,
        },
        permissions: {
          bootstrapStatus: "ready",
        },
      }
    );

    expect(event).toEqual(
      expect.objectContaining({
        event: "invoice.approved",
        actionType: "erp/invoiceApproved",
        userId: "u-99",
        role: "controller",
        isAuthenticated: true,
        model: "invoice",
        recordId: "42",
        viewId: "finance.invoices",
        category: "finance",
        label: "approve",
        permissionsBootstrapStatus: "ready",
      })
    );
  });
});