import React from "react";
import { Link, useMatches } from "react-router-dom";
import { cn } from "~/lib/utils";
import { ChevronRight } from "lucide-react";
import {
  type BreadcrumbItem,
  getAutoBreadcrumbsFromMatches,
} from "~/lib/breadcrumb-utils";

interface PageHeaderProps {
  title: React.ReactNode;
  description?: React.ReactNode;
  breadcrumbs?: BreadcrumbItem[];
  actions?: React.ReactNode;
  className?: string;
}

function isExternalHref(href: string) {
  return /^(https?:|mailto:|tel:)/i.test(href);
}

function useSafeMatches() {
  try {
    return useMatches();
  } catch {
    return [];
  }
}

export function PageHeader({
  title,
  description,
  breadcrumbs,
  actions,
  className,
}: PageHeaderProps) {
  const matches = useSafeMatches();
  const autoBreadcrumbs = React.useMemo(
    () => getAutoBreadcrumbsFromMatches(matches),
    [matches]
  );
  const resolvedBreadcrumbs = breadcrumbs ?? autoBreadcrumbs;

  return (
    <div className={cn("mb-6 space-y-2", className)}>
      {resolvedBreadcrumbs && resolvedBreadcrumbs.length > 0 && (
        <nav aria-label="Breadcrumb">
          <ol className="flex items-center gap-2 text-sm text-muted-foreground">
            {resolvedBreadcrumbs.map((crumb, index) => {
              const isLast = index === resolvedBreadcrumbs.length - 1;

              return (
                <li key={`${crumb.label}-${index}`} className="flex items-center gap-2">
                  {index > 0 && <ChevronRight className="h-3.5 w-3.5 opacity-70" aria-hidden="true" />}
                  {crumb.href ? (
                    isExternalHref(crumb.href) ? (
                      <a
                        href={crumb.href}
                        className="hover:text-foreground transition-colors"
                        aria-current={isLast ? "page" : undefined}
                      >
                        {crumb.label}
                      </a>
                    ) : (
                      <Link
                        to={crumb.href}
                        className="hover:text-foreground transition-colors"
                        aria-current={isLast ? "page" : undefined}
                      >
                        {crumb.label}
                      </Link>
                    )
                  ) : (
                    <span
                      className={isLast ? "text-foreground font-medium" : ""}
                      aria-current={isLast ? "page" : undefined}
                    >
                      {crumb.label}
                    </span>
                  )}
                </li>
              );
            })}
          </ol>
        </nav>
      )}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold tracking-tight text-foreground">
            {title}
          </h1>
          {description && (
            <p className="max-w-prose text-muted-foreground">{description}</p>
          )}
        </div>
        {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
      </div>
    </div>
  );
}
