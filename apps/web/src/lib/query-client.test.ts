import { describe, expect, it } from "vitest";
import { QueryClient } from "@tanstack/react-query";
import { createAppQueryClient, getQueryClientConfig } from "./query-client";

describe("getQueryClientConfig", () => {
  it("uses production defaults when DEV is false", () => {
    const config = getQueryClientConfig({ DEV: false });
    const queries = config.defaultOptions?.queries;
    const mutations = config.defaultOptions?.mutations;

    expect(queries?.staleTime).toBe(5 * 60 * 1000);
    expect(queries?.gcTime).toBe(10 * 60 * 1000);
    expect(queries?.retry).toBe(1);
    expect(queries?.refetchOnWindowFocus).toBe(false);
    expect(queries?.refetchOnReconnect).toBe(true);
    expect(queries?.refetchOnMount).toBe(true);
    expect(mutations?.retry).toBe(0);
  });

  it("uses development overrides when DEV is true", () => {
    const config = getQueryClientConfig({ DEV: true });
    const queries = config.defaultOptions?.queries;

    expect(queries?.staleTime).toBe(0);
    expect(queries?.retry).toBe(0);
  });

  it("creates query and mutation caches for global error handling", () => {
    const config = getQueryClientConfig({ DEV: false });

    expect(config.queryCache).toBeDefined();
    expect(config.mutationCache).toBeDefined();
  });
});

describe("createAppQueryClient", () => {
  it("returns a QueryClient instance", () => {
    const client = createAppQueryClient({ DEV: false });
    expect(client).toBeInstanceOf(QueryClient);
  });
});
