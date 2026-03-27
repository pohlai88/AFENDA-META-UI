import { describe, expect, it } from "vitest";
import { getAutoBreadcrumbsFromMatches, toTitle } from "../breadcrumb-utils";

describe("toTitle", () => {
  it("converts kebab and snake case", () => {
    expect(toTitle("purchase-orders")).toBe("Purchase Orders");
    expect(toTitle("purchase_orders")).toBe("Purchase Orders");
  });

  it("converts camelCase", () => {
    expect(toTitle("purchaseOrders")).toBe("Purchase Orders");
  });

  it("returns empty string for empty input", () => {
    expect(toTitle("")).toBe("");
    expect(toTitle(undefined)).toBe("");
  });
});

describe("getAutoBreadcrumbsFromMatches", () => {
  it("builds breadcrumbs from handle labels and marks last item as non-clickable", () => {
    const items = getAutoBreadcrumbsFromMatches([
      {
        pathname: "/sales",
        params: {},
        handle: { breadcrumb: "Sales" },
      },
      {
        pathname: "/sales/purchaseOrders",
        params: {},
        handle: {
          breadcrumb: ({ params }: { params: Record<string, string | undefined> }) =>
            params.model ?? "Purchase Orders",
        },
      },
    ]);

    expect(items).toEqual([
      { label: "Sales", href: "/sales" },
      { label: "Purchase Orders", href: null },
    ]);
  });

  it("normalizes relative breadcrumbHref values", () => {
    const items = getAutoBreadcrumbsFromMatches([
      {
        pathname: "/sales",
        params: {},
        handle: {
          breadcrumb: "Sales",
          breadcrumbHref: "sales",
        },
      },
      {
        pathname: "/sales/orders",
        params: {},
        handle: {
          breadcrumb: "Orders",
        },
      },
    ]);

    expect(items).toEqual([
      { label: "Sales", href: "/sales" },
      { label: "Orders", href: null },
    ]);
  });

  it("uses pathname fallback when breadcrumbHref is undefined", () => {
    const items = getAutoBreadcrumbsFromMatches([
      {
        pathname: "/sales",
        params: {},
        handle: {
          breadcrumb: "Sales",
        },
      },
      {
        pathname: "/sales/orders",
        params: {},
        handle: {
          breadcrumb: "Orders",
          breadcrumbHref: ({ pathname }: { pathname: string }) => pathname,
        },
      },
    ]);

    expect(items).toEqual([
      { label: "Sales", href: "/sales" },
      { label: "Orders", href: null },
    ]);
  });

  it("falls back to a single breadcrumb derived from the last pathname segment", () => {
    const items = getAutoBreadcrumbsFromMatches([
      {
        pathname: "/sales/purchaseOrders",
        params: {},
      },
    ]);

    expect(items).toEqual([{ label: "Purchase Orders", href: null }]);
  });

  it("falls back to Home when matches are empty", () => {
    const items = getAutoBreadcrumbsFromMatches([]);
    expect(items).toEqual([{ label: "Home", href: null }]);
  });
});
