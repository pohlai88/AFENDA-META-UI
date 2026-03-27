import { describe, expect, it } from "vitest";
import { queryKeys } from "../query-keys";

describe("queryKeys.models.list", () => {
  it("serializes empty options into a stable token", () => {
    expect(queryKeys.models.list("sales_order")).toEqual(["model", "sales_order", "list", "{}"]);
  });

  it("produces the same key when option property order differs", () => {
    const keyA = queryKeys.models.list("sales_order", {
      page: 1,
      limit: 50,
      orderBy: "created_at",
      orderDir: "desc",
    });

    const keyB = queryKeys.models.list("sales_order", {
      orderDir: "desc",
      orderBy: "created_at",
      limit: 50,
      page: 1,
    });

    expect(keyA).toEqual(keyB);
  });

  it("omits undefined values from serialized options", () => {
    const key = queryKeys.models.list("sales_order", {
      page: 1,
      orderBy: undefined,
    });

    expect(key).toEqual(["model", "sales_order", "list", '{"page":1}']);
  });
});

describe("queryKeys.models.detail", () => {
  it("always includes a non-empty string id when called", () => {
    expect(queryKeys.models.detail("sales_order", "SO-1")).toEqual([
      "model",
      "sales_order",
      "SO-1",
    ]);
  });
});
