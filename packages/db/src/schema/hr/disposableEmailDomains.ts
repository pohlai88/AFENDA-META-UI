/**
 * Default disposable / throwaway domains blocked by `businessEmailSchema`.
 * Tenants tune the effective set via {@link disposableEmailDomainSet} /
 * {@link createBusinessEmailSchema} in `_zodShared.ts`.
 */
export const DEFAULT_DISPOSABLE_EMAIL_DOMAINS = [
  "tempmail.com",
  "guerrillamail.com",
  "10minutemail.com",
  "mailinator.com",
  "throwaway.email",
] as const;

/** Hostname-style label list entry after trim/lowercase/dot strip (not a full URL). */
const DISPOSABLE_DOMAIN_ENTRY_RE = /^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)+$/i;

/**
 * Normalize a blocklist entry: trim, lowercase, strip leading/trailing dots.
 */
export function normalizeDisposableEmailDomain(input: string): string {
  return input.trim().toLowerCase().replace(/^\.+|\.+$/g, "");
}

function parseListEntry(raw: string, strictDomainShape: boolean): string | null {
  const n = normalizeDisposableEmailDomain(raw);
  if (!n) return null;
  if (!strictDomainShape) return n;
  return DISPOSABLE_DOMAIN_ENTRY_RE.test(n) ? n : null;
}

export type DisposableEmailDomainSetOptions = {
  /** Extra domains to block (invalid entries skipped when `strictDomainShape` is true). */
  additional?: readonly string[];
  /**
   * Default domains to allow for this tenant (e.g. allow `mailinator.com` in non-prod).
   * Labels are normalized the same way as additions.
   */
  removeDefaults?: readonly string[];
  /**
   * When true (default), `additional` / `removeDefaults` entries must look like hostnames.
   * Set false only if you intentionally allow odd internal suffixes.
   */
  strictDomainShape?: boolean;
};

/**
 * Build the effective blocked-domain set: defaults minus `removeDefaults`, plus `additional`.
 */
export function disposableEmailDomainSet(options?: DisposableEmailDomainSetOptions): Set<string> {
  const strict = options?.strictDomainShape !== false;
  const blocked = new Set<string>();
  for (const d of DEFAULT_DISPOSABLE_EMAIL_DOMAINS) {
    blocked.add(normalizeDisposableEmailDomain(d));
  }
  for (const raw of options?.removeDefaults ?? []) {
    const n = parseListEntry(raw, strict);
    if (n) blocked.delete(n);
  }
  for (const raw of options?.additional ?? []) {
    const n = parseListEntry(raw, strict);
    if (n) blocked.add(n);
  }
  return blocked;
}

/**
 * Domain part of an email (after trim / lower / dot normalization), using the last `@`.
 * Returns null if there is no usable domain.
 */
export function extractEmailDomainForDisposableCheck(email: string): string | null {
  const lower = email.trim().toLowerCase();
  const at = lower.lastIndexOf("@");
  if (at < 0 || at === lower.length - 1) return null;
  const host = normalizeDisposableEmailDomain(lower.slice(at + 1));
  return host || null;
}

/**
 * True when the email’s domain is in `blocked` (e.g. from {@link disposableEmailDomainSet}).
 * Use in tests or custom refinements alongside {@link createBusinessEmailSchema}.
 */
export function isDisposableEmail(email: string, blocked: Set<string>): boolean {
  const domain = extractEmailDomainForDisposableCheck(email);
  return domain != null && blocked.has(domain);
}
