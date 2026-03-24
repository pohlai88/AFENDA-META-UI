import { QueryClient } from "@tanstack/react-query";
import { describe, expect, it, vi } from "vitest";
import { queryKeys } from "./query-keys";
import { invalidateDomain } from "./query-invalidation";

describe("invalidateDomain", () => {
  it("invalidates model domain using top-level key definition", async () => {
    const queryClient = new QueryClient();
    const invalidateSpy = vi
      .spyOn(queryClient, "invalidateQueries")
      .mockResolvedValue();

    await invalidateDomain(queryClient, "models");

    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: queryKeys.models._def,
    });
  });

  it("invalidates purchaseOrders domain using top-level key definition", async () => {
    const queryClient = new QueryClient();
    const invalidateSpy = vi
      .spyOn(queryClient, "invalidateQueries")
      .mockResolvedValue();

    await invalidateDomain(queryClient, "purchaseOrders");

    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: queryKeys.purchaseOrders._def,
    });
  });
});
