export type RouteParams = Record<string, string | undefined>;

export interface BreadcrumbItem {
  label: string;
  href?: string | null;
}

export type BreadcrumbLabelResolver =
  | string
  | ((args: { params: RouteParams }) => string);

export type BreadcrumbHrefResolver =
  | string
  | ((args: { pathname: string; params: RouteParams }) =>
      string | null | undefined);

export interface BreadcrumbHandle {
  breadcrumb?: BreadcrumbLabelResolver;
  breadcrumbHref?: BreadcrumbHrefResolver;
}

export interface BreadcrumbMatchLike {
  pathname: string;
  params: RouteParams;
  handle?: unknown;
}

function isBreadcrumbHandle(value: unknown): value is BreadcrumbHandle {
  if (!value || typeof value !== "object") {
    return false;
  }

  const maybeHandle = value as BreadcrumbHandle;

  const isLabelValid =
    maybeHandle.breadcrumb === undefined ||
    typeof maybeHandle.breadcrumb === "string" ||
    typeof maybeHandle.breadcrumb === "function";
  const isHrefValid =
    maybeHandle.breadcrumbHref === undefined ||
    typeof maybeHandle.breadcrumbHref === "string" ||
    typeof maybeHandle.breadcrumbHref === "function";

  return isLabelValid && isHrefValid;
}

function isExternalHref(href: string) {
  return /^(https?:|mailto:|tel:)/i.test(href);
}

function normalizeBreadcrumbHref(
  resolvedHref: string | null | undefined,
  pathname: string
): string | null {
  if (resolvedHref === null) {
    return null;
  }

  const fallback = pathname.trim();
  const raw = (resolvedHref ?? fallback).trim();

  if (!raw) {
    return fallback || "/";
  }

  if (isExternalHref(raw) || raw.startsWith("/")) {
    return raw;
  }

  return `/${raw}`;
}

function getLastPathSegment(pathname?: string) {
  if (!pathname) {
    return "";
  }

  const segments = pathname.split("/").filter(Boolean);
  return segments.at(-1) ?? "";
}

export function toTitle(value?: string) {
  if (!value) {
    return "";
  }

  return value
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .split(/[-_\s]/)
    .filter(Boolean)
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(" ");
}

export function getAutoBreadcrumbsFromMatches(matches: BreadcrumbMatchLike[]) {
  const items: Array<BreadcrumbItem | null> = matches.map((match) => {
    const handle = isBreadcrumbHandle(match.handle) ? match.handle : undefined;

    if (!handle?.breadcrumb) {
      return null;
    }

    const label =
      typeof handle.breadcrumb === "function"
        ? handle.breadcrumb({ params: match.params })
        : handle.breadcrumb;

    if (!label) {
      return null;
    }

    const resolvedHref =
      typeof handle.breadcrumbHref === "function"
        ? handle.breadcrumbHref({
            pathname: match.pathname,
            params: match.params,
          })
        : handle.breadcrumbHref;

    return {
      label,
      href: normalizeBreadcrumbHref(resolvedHref, match.pathname),
    };
  });

  const nonNullItems = items.filter(
    (item): item is BreadcrumbItem => item !== null
  );

  const resolvedItems = nonNullItems.map((item, index) =>
    index === nonNullItems.length - 1
      ? {
          ...item,
          href: null,
        }
      : item
  );

  if (resolvedItems.length > 0) {
    return resolvedItems;
  }

  const lastMatch = matches.at(-1);
  const fallbackLabel = toTitle(getLastPathSegment(lastMatch?.pathname)) || "Home";

  return [{ label: fallbackLabel, href: null }];
}