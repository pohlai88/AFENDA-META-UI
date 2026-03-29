/**
 * Core utility type contract tests.
 *
 * Design intent: Brand, Opaque, DeepPartial, DeepReadonly, NonEmptyArray,
 * MaybePromise, and Resolved are foundational type utilities re-used by every
 * domain. Structural regressions here silently break compile-time safety.
 * Fix the contract, not the test.
 */
import { describe, expect, expectTypeOf, it } from "vitest";

import type {
  Brand,
  DeepPartial,
  DeepReadonly,
  MaybePromise,
  NonEmptyArray,
  Opaque,
  Resolved,
} from "../types.js";

// ---------------------------------------------------------------------------
// Brand — nominal typing
// ---------------------------------------------------------------------------

describe("Brand — nominal typing", () => {
  it("branded value retains the underlying string at runtime", () => {
    type UserId = Brand<string, "UserId">;
    const id = "user-001" as UserId;
    expect(typeof id).toBe("string");
    expect(id).toBe("user-001");
  });

  it("branded number retains numeric value at runtime", () => {
    type Price = Brand<number, "Price">;
    const price = 99.99 as Price;
    expect(typeof price).toBe("number");
    expect(price).toBeCloseTo(99.99);
  });

  it("brand tag does not appear at runtime (phantom field)", () => {
    type OrderId = Brand<string, "OrderId">;
    const id = "ord-001" as OrderId;
    // __brand is a phantom — only exists at type level, never serialised
    expect((id as unknown as Record<string, unknown>)["__brand"]).toBeUndefined();
  });

  it("two different brands on the same base type form distinct type identities", () => {
    type UserId = Brand<string, "UserId">;
    type OrderId = Brand<string, "OrderId">;
    const uid = "u1" as UserId;
    const oid = "o1" as OrderId;
    // At runtime both are strings — brand distinction is compile-time only
    expect(typeof uid).toBe(typeof oid);
    expect(uid).not.toBe(oid);
  });
});

// ---------------------------------------------------------------------------
// Opaque — alias for Brand
// ---------------------------------------------------------------------------

describe("Opaque — alias of Brand", () => {
  it("opaque value behaves identically to Brand at runtime", () => {
    type TenantSlug = Opaque<string, "TenantSlug">;
    const slug = "acme-corp" as TenantSlug;
    expect(slug).toBe("acme-corp");
    expect(typeof slug).toBe("string");
  });

  it("type check: Opaque<T,B> is assignable to same Brand<T,B> position", () => {
    type A = Opaque<string, "X">;
    type B = Brand<string, "X">;
    const a = "x" as A;
    // At runtime both are the same string
    expectTypeOf(a).toMatchTypeOf<B>();
  });
});

// ---------------------------------------------------------------------------
// DeepPartial<T> — recursive optional properties
// ---------------------------------------------------------------------------

describe("DeepPartial — recursive optional properties", () => {
  interface Config {
    host: string;
    port: number;
    tls: {
      enabled: boolean;
      cert: string;
    };
  }

  it("allows partial top-level properties", () => {
    const partial: DeepPartial<Config> = { host: "localhost" };
    expect(partial.host).toBe("localhost");
    expect(partial.port).toBeUndefined();
  });

  it("allows partial nested properties", () => {
    const partial: DeepPartial<Config> = {
      tls: { enabled: true },
    };
    expect(partial.tls?.enabled).toBe(true);
    expect(partial.tls?.cert).toBeUndefined();
  });

  it("allows an empty object (all optional)", () => {
    const partial: DeepPartial<Config> = {};
    expect(Object.keys(partial)).toHaveLength(0);
  });

  it("allows a fully populated object (subset of all keys)", () => {
    const partial: DeepPartial<Config> = {
      host: "prod.example.com",
      port: 443,
      tls: { enabled: true, cert: "cert.pem" },
    };
    expect(partial.port).toBe(443);
    expect(partial.tls?.cert).toBe("cert.pem");
  });
});

// ---------------------------------------------------------------------------
// DeepReadonly<T> — recursive readonly properties
// ---------------------------------------------------------------------------

describe("DeepReadonly — recursive readonly properties", () => {
  it("wraps a flat object with readonly at runtime as regular object", () => {
    interface Settings {
      timeout: number;
      retries: number;
    }
    const settings: DeepReadonly<Settings> = { timeout: 3000, retries: 3 };
    expect(settings.timeout).toBe(3000);
    expect(settings.retries).toBe(3);
  });

  it("wraps a nested object with readonly", () => {
    interface Nested {
      db: { host: string; port: number };
    }
    const config: DeepReadonly<Nested> = { db: { host: "localhost", port: 5432 } };
    expect(config.db.host).toBe("localhost");
    expect(config.db.port).toBe(5432);
  });

  it("wraps an array as ReadonlyArray", () => {
    const roles: DeepReadonly<string[]> = ["admin", "user"];
    expect(roles).toHaveLength(2);
    expect(roles[0]).toBe("admin");
    // runtime: ReadonlyArray is still indexable
    expectTypeOf(roles).toMatchTypeOf<ReadonlyArray<string>>();
  });
});

// ---------------------------------------------------------------------------
// NonEmptyArray<T> — at least one element
// ---------------------------------------------------------------------------

describe("NonEmptyArray — guaranteed non-empty", () => {
  it("single-element array satisfies NonEmptyArray", () => {
    const arr: NonEmptyArray<string> = ["admin"];
    expect(arr).toHaveLength(1);
    expect(arr[0]).toBe("admin");
  });

  it("multi-element array satisfies NonEmptyArray", () => {
    const arr: NonEmptyArray<number> = [1, 2, 3];
    expect(arr).toHaveLength(3);
  });

  it("first element is always accessible via tuple index 0", () => {
    const arr: NonEmptyArray<string> = ["first", "second"];
    const [first] = arr;
    expect(first).toBe("first");
    expectTypeOf(first).toMatchTypeOf<string>();
  });

  it("rest of the array remains a spread of T", () => {
    const arr: NonEmptyArray<string> = ["only"];
    expect(arr.length).toBeGreaterThanOrEqual(1);
  });
});

// ---------------------------------------------------------------------------
// MaybePromise<T> — synchronous or async value
// ---------------------------------------------------------------------------

describe("MaybePromise — sync or async union", () => {
  it("accepts a direct value (synchronous path)", () => {
    const v: MaybePromise<string> = "hello";
    expect(v).toBe("hello");
  });

  it("accepts a Promise (asynchronous path)", async () => {
    const v: MaybePromise<number> = Promise.resolve(42);
    const result = await v;
    expect(result).toBe(42);
  });

  it("accepts a resolved object directly", () => {
    const v: MaybePromise<{ ok: boolean }> = { ok: true };
    expect((v as { ok: boolean }).ok).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Resolved<T> — awaited type alias
// ---------------------------------------------------------------------------

describe("Resolved — Awaited<T> alias", () => {
  it("resolved type matches the wrapped value type at runtime", async () => {
    type AsyncResult = Promise<{ status: string }>;
    const promised: AsyncResult = Promise.resolve({ status: "ok" });
    const resolved: Resolved<AsyncResult> = await promised;
    expect(resolved.status).toBe("ok");
    expectTypeOf(resolved).toMatchTypeOf<{ status: string }>();
  });

  it("plain type is unchanged through Resolved<T>", () => {
    type Direct = Resolved<string>;
    const v: Direct = "no-op";
    expect(v).toBe("no-op");
    expectTypeOf(v).toMatchTypeOf<string>();
  });
});
