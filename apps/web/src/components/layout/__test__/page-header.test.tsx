import { MemoryRouter, Outlet, RouterProvider, createMemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import { renderWithProviders, screen } from "~/test/utils";
import { PageHeader } from "../page-header";

const routerFuture = {
  v7_startTransition: true,
  v7_relativeSplatPath: true,
} as const;

describe("PageHeader", () => {
  it("renders semantic breadcrumb navigation with aria-current on current page", () => {
    renderWithProviders(
      <MemoryRouter future={routerFuture}>
        <PageHeader
          title="Orders"
          breadcrumbs={[
            { label: "Home", href: "/" },
            { label: "Sales", href: "/sales" },
            { label: "Orders" },
          ]}
        />
      </MemoryRouter>
    );

    expect(screen.getByRole("navigation", { name: "Breadcrumb" })).toBeInTheDocument();
    expect(screen.getByRole("list")).toBeInTheDocument();
    expect(
      screen.getByText("Orders", { selector: "span[aria-current='page']" })
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Home" })).toHaveAttribute("href", "/");
  });

  it("renders external breadcrumb links as anchors", () => {
    renderWithProviders(
      <MemoryRouter future={routerFuture}>
        <PageHeader
          title="Docs"
          breadcrumbs={[{ label: "API Docs", href: "https://example.com/docs" }]}
        />
      </MemoryRouter>
    );

    expect(screen.getByRole("link", { name: "API Docs" })).toHaveAttribute(
      "href",
      "https://example.com/docs"
    );
  });

  it("auto-generates breadcrumbs from route metadata when breadcrumbs prop is not provided", () => {
    const router = createMemoryRouter(
      [
        {
          path: "/",
          element: <Outlet />,
          handle: { breadcrumb: "Dashboard" },
          children: [
            {
              path: "sales",
              element: <Outlet />,
              handle: { breadcrumb: "Sales" },
              children: [
                {
                  path: "orders",
                  element: <PageHeader title="Orders" />,
                  handle: { breadcrumb: "Orders" },
                },
              ],
            },
          ],
        },
      ],
      {
        initialEntries: ["/sales/orders"],
        future: routerFuture,
      }
    );

    renderWithProviders(
      <RouterProvider
        router={router}
        future={{
          v7_startTransition: true,
        }}
      />
    );

    expect(screen.getByRole("link", { name: "Dashboard" })).toHaveAttribute("href", "/");
    expect(screen.getByRole("link", { name: "Sales" })).toHaveAttribute("href", "/sales");
    expect(
      screen.getByText("Orders", { selector: "span[aria-current='page']" })
    ).toBeInTheDocument();
  });

  it("uses manual breadcrumbs as override when provided", () => {
    const router = createMemoryRouter(
      [
        {
          path: "/",
          element: <Outlet />,
          handle: { breadcrumb: "Dashboard" },
          children: [
            {
              path: "sales",
              element: (
                <PageHeader
                  title="Orders"
                  breadcrumbs={[{ label: "Manual", href: "/manual" }, { label: "Override" }]}
                />
              ),
              handle: { breadcrumb: "Sales" },
            },
          ],
        },
      ],
      {
        initialEntries: ["/sales"],
        future: routerFuture,
      }
    );

    renderWithProviders(
      <RouterProvider
        router={router}
        future={{
          v7_startTransition: true,
        }}
      />
    );

    expect(screen.getByRole("link", { name: "Manual" })).toHaveAttribute("href", "/manual");
    expect(
      screen.getByText("Override", { selector: "span[aria-current='page']" })
    ).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Dashboard" })).not.toBeInTheDocument();
  });
});
