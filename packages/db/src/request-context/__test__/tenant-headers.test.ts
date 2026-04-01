import { describe, expect, it } from "vitest";

import {
  getTenantContextFromHeaders,
  requireTenantContextFromHeaders,
} from "../tenant-headers.js";
import { TENANT_CONTEXT_HEADERS } from "../header-names.js";

function headersFrom(entries: Record<string, string>): Headers {
  return new Headers(entries);
}

describe("getTenantContextFromHeaders", () => {
  it("returns null when tenant header is missing", () => {
    expect(getTenantContextFromHeaders(new Headers())).toBeNull();
  });

  it("returns null for non-positive or non-integer tenant id", () => {
    expect(
      getTenantContextFromHeaders(headersFrom({ [TENANT_CONTEXT_HEADERS.tenantId]: "0" }))
    ).toBeNull();
    expect(
      getTenantContextFromHeaders(headersFrom({ [TENANT_CONTEXT_HEADERS.tenantId]: "-1" }))
    ).toBeNull();
    expect(
      getTenantContextFromHeaders(headersFrom({ [TENANT_CONTEXT_HEADERS.tenantId]: "abc" }))
    ).toBeNull();
  });

  it("parses tenant and optional user; infers actor when actor header absent", () => {
    const a = getTenantContextFromHeaders(
      headersFrom({
        [TENANT_CONTEXT_HEADERS.tenantId]: " 42 ",
        [TENANT_CONTEXT_HEADERS.userId]: "7",
      })
    );
    expect(a).toEqual({
      tenantId: 42,
      userId: 7,
      actorType: "user",
    });

    const b = getTenantContextFromHeaders(
      headersFrom({ [TENANT_CONTEXT_HEADERS.tenantId]: "1" })
    );
    expect(b).toEqual({ tenantId: 1, actorType: "system" });
  });

  it("respects x-actor-type when valid", () => {
    const ctx = getTenantContextFromHeaders(
      headersFrom({
        [TENANT_CONTEXT_HEADERS.tenantId]: "1",
        [TENANT_CONTEXT_HEADERS.actorType]: "service_principal",
      })
    );
    expect(ctx?.actorType).toBe("service_principal");
  });

  it("maps tracing headers", () => {
    const ctx = getTenantContextFromHeaders(
      headersFrom({
        [TENANT_CONTEXT_HEADERS.tenantId]: "2",
        [TENANT_CONTEXT_HEADERS.correlationId]: "corr-1",
        [TENANT_CONTEXT_HEADERS.requestId]: "req-1",
        [TENANT_CONTEXT_HEADERS.sessionId]: "sess-1",
      })
    );
    expect(ctx).toMatchObject({
      tenantId: 2,
      correlationId: "corr-1",
      requestId: "req-1",
      sessionId: "sess-1",
      actorType: "system",
    });
  });
});

describe("requireTenantContextFromHeaders", () => {
  it("throws when context is invalid", () => {
    expect(() => requireTenantContextFromHeaders(new Headers())).toThrow(
      /Missing or invalid x-tenant-id/
    );
  });

  it("returns context when valid", () => {
    expect(
      requireTenantContextFromHeaders(
        headersFrom({ [TENANT_CONTEXT_HEADERS.tenantId]: "99" })
      )
    ).toMatchObject({ tenantId: 99 });
  });
});
