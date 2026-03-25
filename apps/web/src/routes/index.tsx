/**
 * Route Definitions
 * ==================
 * Central routing configuration using react-router-dom v6
 *
 * Route Structure:
 * /                            → Home/Dashboard
 * /:module                     → Module landing page
 * /:module/:model              → List view (MetaListV2)
 * /:module/:model/new          → Create form (MetaFormV2)
 * /:module/:model/:id          → Edit form (MetaFormV2)
 * /:module/:model/:id/:view    → Specific view (kanban, dashboard)
 */

import { createBrowserRouter, Navigate, RouterProvider } from "react-router-dom";
import { lazy } from "react";
import AppShell from "~/components/layout/app-shell";
import ErrorBoundary from "~/components/error-boundary";
import { toTitle, type BreadcrumbHandle } from "~/lib/breadcrumb-utils";

const HomePage = lazy(() => import("../pages/home"));
const ModuleLandingPage = lazy(() => import("../pages/module-landing"));
const ModelListPage = lazy(() => import("../pages/model-list"));
const ModelFormPage = lazy(() => import("../pages/model-form"));
const ModelViewPage = lazy(() => import("../pages/model-view"));
const NotFoundPage = lazy(() => import("../pages/404"));
const UnauthorizedPage = lazy(() => import("../pages/401"));
const ForbiddenPage = lazy(() => import("../pages/403"));
const RequestTimeoutPage = lazy(() => import("../pages/408"));
const ConflictPage = lazy(() => import("../pages/409"));
const ValidationErrorPage = lazy(() => import("../pages/422"));
const TooManyRequestsPage = lazy(() => import("../pages/429"));
const ServerErrorPage = lazy(() => import("../pages/500"));
const ServiceUnavailablePage = lazy(() => import("../pages/503"));
const ErrorCatalogPage = lazy(() => import("../pages/errors"));
const PurchaseOrdersExamplePage = lazy(() => import("../pages/purchase-orders-example"));
const PaymentHubPage = lazy(() => import("../pages/payment-hub"));
const SuggestionsDemoPage = lazy(() => import("../pages/suggestions-demo"));

const breadcrumbFromParam = (paramName: string) => (
  { params }: { params: Record<string, string | undefined> }
) => toTitle(params[paramName]);

const errorRouteDefinitions = [
  {
    code: "401",
    label: "Unauthorized",
    element: <UnauthorizedPage />,
  },
  {
    code: "403",
    label: "Forbidden",
    element: <ForbiddenPage />,
  },
  {
    code: "408",
    label: "Request Timeout",
    element: <RequestTimeoutPage />,
  },
  {
    code: "409",
    label: "Conflict",
    element: <ConflictPage />,
  },
  {
    code: "422",
    label: "Validation Error",
    element: <ValidationErrorPage />,
  },
  {
    code: "429",
    label: "Too Many Requests",
    element: <TooManyRequestsPage />,
  },
  {
    code: "500",
    label: "Server Error",
    element: <ServerErrorPage />,
  },
  {
    code: "503",
    label: "Service Unavailable",
    element: <ServiceUnavailablePage />,
  },
] as const;

const routerFuture = {
  v7_startTransition: true,
  v7_relativeSplatPath: true,
} as const;

const router: ReturnType<typeof createBrowserRouter> = createBrowserRouter([
  {
    path: "/",
    element: <AppShell />,
    errorElement: <ErrorBoundary />,
    children: [
      {
        index: true,
        element: <HomePage />,
        handle: {
          breadcrumb: "Dashboard",
        } satisfies BreadcrumbHandle,
      },
      {
        path: ":module",
        handle: {
          breadcrumb: breadcrumbFromParam("module"),
        } satisfies BreadcrumbHandle,
        children: [
          {
            index: true,
            element: <ModuleLandingPage />,
          },
          {
            path: ":model",
            handle: {
              breadcrumb: breadcrumbFromParam("model"),
            } satisfies BreadcrumbHandle,
            children: [
              {
                index: true,
                element: <ModelListPage />,
              },
              {
                path: "new",
                element: <ModelFormPage />,
                handle: {
                  breadcrumb: "New",
                } satisfies BreadcrumbHandle,
              },
              {
                path: ":id",
                handle: {
                  breadcrumb: ({ params }: { params: { id?: string } }) =>
                    params.id ? `Record ${params.id}` : "Record",
                } satisfies BreadcrumbHandle,
                children: [
                  {
                    index: true,
                    element: <ModelFormPage />,
                  },
                  {
                    path: ":view",
                    element: <ModelViewPage />,
                    handle: {
                      breadcrumb: breadcrumbFromParam("view"),
                    } satisfies BreadcrumbHandle,
                  },
                ],
              },
            ],
          },
        ],
      },
      {
        path: "examples/purchase-orders",
        element: <PurchaseOrdersExamplePage />,
        handle: {
          breadcrumb: "Purchase Orders",
        } satisfies BreadcrumbHandle,
      },
      {
        path: "payment-hub",
        element: <PaymentHubPage />,
        handle: {
          breadcrumb: "Payment Hub",
        } satisfies BreadcrumbHandle,
      },
      {
        path: "demo/suggestions",
        element: <SuggestionsDemoPage />,
        handle: {
          breadcrumb: "Personalized Suggestions",
        } satisfies BreadcrumbHandle,
      },
      {
        path: "errors",
        children: [
          {
            index: true,
            element: <ErrorCatalogPage />,
            handle: {
              breadcrumb: "Error Catalog",
            } satisfies BreadcrumbHandle,
          },
          ...errorRouteDefinitions.map(({ code, label, element }) => ({
            path: code,
            element,
            handle: {
              breadcrumb: label,
            } satisfies BreadcrumbHandle,
          })),
        ],
      },
      {
        path: "404",
        element: <NotFoundPage />,
        handle: {
          breadcrumb: "Not Found",
        } satisfies BreadcrumbHandle,
      },
      ...errorRouteDefinitions.map(({ code }) => ({
        path: code,
        element: <Navigate to={`/errors/${code}`} replace />,
      })),
      {
        path: "*",
        element: <NotFoundPage />,
        handle: {
          breadcrumb: "Not Found",
        } satisfies BreadcrumbHandle,
      },
    ],
  },
], {
  future: routerFuture,
});

export function AppRouter() {
  return (
    <RouterProvider
      router={router}
      future={{
        v7_startTransition: true,
      }}
    />
  );
}

export default router;
