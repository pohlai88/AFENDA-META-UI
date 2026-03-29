/**
 * Error Boundary
 * ===============
 * Catches React errors and displays a user-friendly error page.
 * Supports retry functionality and error logging.
 */

import React, { Component, ErrorInfo, ReactNode } from "react";
import { isRouteErrorResponse, useRouteError, Link } from "react-router-dom";
import { RefreshCw, Home } from "lucide-react";
import { Button } from "@afenda/ui";
import { CardDescription, CardTitle } from "@afenda/ui";
import { ErrorCard } from "~/components/error-card";
import { useRetryBootstrap } from "~/bootstrap/permissions-context";

interface Props {
  children?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  resetKey: number;
}

/**
 * Class-based Error Boundary (required for componentDidCatch)
 */
export class ErrorBoundaryClass extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    resetKey: 0,
  };

  public static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("ErrorBoundary caught an error:", error, errorInfo);

    // Send to error tracking service if configured
    if (import.meta.env.VITE_SENTRY_DSN) {
      // Sentry integration would be initialized in bootstrap
      // window.Sentry?.captureException(error, { contexts: { react: errorInfo } });
    }

    // Log structured error for production debugging
    if (import.meta.env.PROD) {
      console.error(JSON.stringify({
        type: 'react-error-boundary',
        error: { name: error.name, message: error.message, stack: error.stack },
        componentStack: errorInfo.componentStack,
        timestamp: new Date().toISOString(),
      }));
    }
  }

  private handleReset = () => {
    this.setState((previous) => ({
      hasError: false,
      error: null,
      resetKey: previous.resetKey + 1,
    }));
  };

  public render() {
    if (this.state.hasError) {
      return <ErrorBoundaryWithRetry error={this.state.error} onReset={this.handleReset} />;
    }

    return <React.Fragment key={this.state.resetKey}>{this.props.children}</React.Fragment>;
  }
}

function ErrorBoundaryWithRetry({ error, onReset }: { error: Error | null; onReset: () => void }) {
  const retryBootstrap = useRetryBootstrap();

  return (
    <ErrorCard
      title="Something went wrong"
      description="An unexpected error occurred."
      message={error?.message}
      stack={error?.stack}
      actions={
        <>
          <Button onClick={onReset} className="flex-1">
            <RefreshCw className="w-4 h-4 mr-2" />
            Reset Component
          </Button>
          <Button onClick={retryBootstrap} variant="secondary" className="flex-1">
            Retry Permissions
          </Button>
          <Button variant="outline" asChild className="flex-1">
            <Link to="/">
              <Home className="w-4 h-4 mr-2" />
              Go Home
            </Link>
          </Button>
        </>
      }
    />
  );
}

/**
 * Router Error Boundary (for react-router-dom errors)
 */
export function RouterErrorBoundary() {
  const error = useRouteError();
  const retryBootstrap = useRetryBootstrap();
  const handleRetry = React.useCallback(() => {
    if (typeof window !== "undefined") {
      window.location.reload();
    }
  }, []);

  React.useEffect(() => {
    if (!isRouteErrorResponse(error)) {
      console.error("RouterErrorBoundary caught unknown error:", error);
    }
  }, [error]);

  if (isRouteErrorResponse(error)) {
    // 404, 403, etc.
    if (error.status === 403) {
      return (
        <ErrorCard
          statusCode={403}
          title="Access Denied"
          description="You don't have permission to view this page."
          actions={
            <>
              <Button onClick={retryBootstrap} className="flex-1">
                <RefreshCw className="w-4 h-4 mr-2" />
                Retry Permissions
              </Button>
              <Button onClick={handleRetry} variant="secondary" className="flex-1">
                <RefreshCw className="w-4 h-4 mr-2" />
                Reload Page
              </Button>
              <Button variant="outline" asChild className="flex-1">
                <Link to="/">
                  <Home className="w-4 h-4 mr-2" />
                  Go Home
                </Link>
              </Button>
            </>
          }
        />
      );
    }

    if (error.status === 404) {
      return (
        <ErrorCard
          title="Page not found"
          description="Page not found"
          headline={
            <>
              <CardTitle className="text-center text-6xl font-bold">404</CardTitle>
              <CardDescription className="text-center">Page not found</CardDescription>
            </>
          }
          primaryAction={
            <Button asChild className="w-full">
              <Link to="/">
                <Home className="w-4 h-4 mr-2" />
                Back to Home
              </Link>
            </Button>
          }
        />
      );
    }

    const isTransientError = error.status >= 500;

    return (
      <ErrorCard
        statusCode={error.status}
        title="Request Error"
        description={error.statusText}
        primaryAction={
          isTransientError ? (
            <Button onClick={handleRetry} className="flex-1">
              <RefreshCw className="w-4 h-4 mr-2" />
              Retry
            </Button>
          ) : (
            <Button asChild className="w-full">
              <Link to="/">
                <Home className="w-4 h-4 mr-2" />
                Back to Home
              </Link>
            </Button>
          )
        }
        secondaryAction={
          isTransientError ? (
            <Button variant="outline" asChild className="flex-1">
              <Link to="/">
                <Home className="w-4 h-4 mr-2" />
                Back to Home
              </Link>
            </Button>
          ) : undefined
        }
      />
    );
  }

  // Unknown error
  return (
    <ErrorCard
      title="Unexpected Error"
      description="Something went wrong. Please try again later."
      message={error instanceof Error ? error.message : undefined}
      stack={error instanceof Error ? error.stack : undefined}
      rawErrorDetails={error}
      primaryAction={
        <Button onClick={handleRetry} className="flex-1">
          <RefreshCw className="w-4 h-4 mr-2" />
          Retry
        </Button>
      }
      secondaryAction={
        <Button variant="outline" asChild className="flex-1">
          <Link to="/">
            <Home className="w-4 h-4 mr-2" />
            Back to Home
          </Link>
        </Button>
      }
    />
  );
}

export default RouterErrorBoundary;
