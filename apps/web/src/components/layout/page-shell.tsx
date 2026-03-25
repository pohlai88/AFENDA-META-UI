import React from "react";
import { cn } from "~/lib/utils";
import { ErrorBoundaryClass } from "~/components/error-boundary";

// ---------------------------------------------------------------------------
// PageShell
// ---------------------------------------------------------------------------

type PageShellVariant = "default" | "neutral" | "grid";

const variantClasses: Record<PageShellVariant, string> = {
  default: "bg-background",
  neutral: "bg-muted/30",
  // Subtle dot-grid background for analytics / dashboard pages
  grid: "bg-background [background-image:radial-gradient(var(--border)_1px,transparent_1px)] [background-size:24px_24px]",
};

interface PageShellProps {
  children: React.ReactNode;
  /** Slot rendered inside a semantic <header> above the main content */
  header?: React.ReactNode;
  /** Slot rendered inside a semantic <footer> below the main content */
  footer?: React.ReactNode;
  /** Background style variant. Defaults to "default". */
  variant?: PageShellVariant;
  className?: string;
}

export function PageShell({
  children,
  header,
  footer,
  variant = "default",
  className,
}: PageShellProps) {
  return (
    <div
      className={cn("min-h-screen flex flex-col", variantClasses[variant], className)}
      role="region"
      aria-label="Page"
    >
      {header && (
        <header className="border-b border-border shrink-0">{header}</header>
      )}
      <ErrorBoundaryClass>
        <div className="flex-1">{children}</div>
      </ErrorBoundaryClass>
      {footer && (
        <footer className="border-t border-border shrink-0">{footer}</footer>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// PageContainer
// ---------------------------------------------------------------------------

type PageContainerSpacing = "flush" | "sm" | "md" | "lg";

const spacingClasses: Record<PageContainerSpacing, string> = {
  flush: "",
  sm: "px-3 py-4 md:px-4 lg:px-6",
  md: "px-4 py-6 md:px-6 lg:px-8",
  lg: "px-6 py-8 md:px-8 lg:px-12",
};

interface PageContainerProps {
  children: React.ReactNode;
  /** Inner padding density. Defaults to "md". */
  spacing?: PageContainerSpacing;
  /** Optional landmark role when page is rendered outside AppShell main region. */
  landmark?: "main" | "region";
  /** Makes the container independently scrollable (useful inside fixed-height shells). */
  scrollable?: boolean;
  className?: string;
}

export function PageContainer({
  children,
  spacing = "md",
  landmark,
  scrollable = false,
  className,
}: PageContainerProps) {
  return (
    <div
      role={landmark}
      className={cn(
        "container mx-auto",
        spacingClasses[spacing],
        scrollable && "overflow-y-auto",
        className,
      )}
    >
      {children}
    </div>
  );
}
