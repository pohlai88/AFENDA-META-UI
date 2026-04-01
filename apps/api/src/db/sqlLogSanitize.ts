const SENSITIVE_STRING = /password|secret|token|apikey|api_key|authorization|bearer|credential|private[_-]?key/i;

/**
 * Shapes SQL bind parameters for logs: truncates large strings, redacts obvious secret-like values.
 * Does not guarantee zero leakage — prefer parameterized queries and never log raw connection URLs.
 */
export function sanitizeSqlParamsForLog(params: unknown[]): unknown[] {
  return params.map((p) => {
    if (p === null || p === undefined) return p;
    if (typeof p === "string") {
      if (p.length > 8 && SENSITIVE_STRING.test(p)) return "[REDACTED]";
      if (p.length > 240) return `${p.slice(0, 240)}…[truncated]`;
      return p;
    }
    if (typeof p === "number" || typeof p === "boolean" || typeof p === "bigint") return p;
    try {
      const s = JSON.stringify(p);
      if (s.length > 400) return "[value:truncated]";
      return p;
    } catch {
      return "[value:unserializable]";
    }
  });
}

export function truncateSqlForLog(query: string, maxLen = 4000): string {
  if (query.length <= maxLen) return query;
  return `${query.slice(0, maxLen)}…[truncated]`;
}
