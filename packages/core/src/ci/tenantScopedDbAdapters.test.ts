import { describe, expect, it } from "vitest";
import {
  createTenantScopedDbTruthVerificationAdapters,
  CrossTenantAccessError,
} from "./tenantScopedDbAdapters.js";

describe("tenant-scoped db truth verification adapters", () => {
  it("reads tenant-matched truth inputs successfully", async () => {
    const adapters = createTenantScopedDbTruthVerificationAdapters({
      tenantId: "tenant_a",
      readers: {
        async readMemoryEventRows() {
          return [
            {
              tenant_id: "tenant_a",
              event_id: "evt_1",
              entity_name: "sales_order",
              entity_id: "SO-1",
              present_state: { status: "posted", amount: 100 },
              supersedes_event_id: null,
            },
          ];
        },
        async readCurrentProjection() {
          return {
            tenantId: "tenant_a",
            projection: {
              "SO-1": { status: "posted", amount: 100 },
            },
          };
        },
        async readInvariantFailureRows() {
          return [
            {
              tenant_id: "tenant_a",
              invariant_name: "journal_must_balance",
              doctrine: {
                doctrineRef: "double_entry_balance",
                family: "Accounting-Control",
                standard: "Accounting Truth Contract",
                section: "Journal balance",
                title: "Every journal posting must remain balanced.",
                interpretation: "strict",
              },
              evidence: {
                summary: "Journal debits and credits are not equal.",
                facts: {
                  journalEntryId: "draft",
                  debitTotal: 100,
                  creditTotal: 90,
                },
              },
              resolution: undefined,
            },
          ];
        },
      },
    });

    await expect(adapters.readMemoryEvents()).resolves.toHaveLength(1);
    await expect(adapters.readCurrentProjection()).resolves.toEqual({
      "SO-1": { status: "posted", amount: 100 },
    });
    await expect(adapters.readInvariantFailures()).resolves.toHaveLength(1);
  });

  it("rejects cross-tenant memory event rows", async () => {
    const adapters = createTenantScopedDbTruthVerificationAdapters({
      tenantId: "tenant_a",
      readers: {
        async readMemoryEventRows() {
          return [
            {
              tenant_id: "tenant_b",
              event_id: "evt_1",
              entity_name: "sales_order",
              entity_id: "SO-1",
              present_state: { status: "posted", amount: 100 },
              supersedes_event_id: null,
            },
          ];
        },
        async readCurrentProjection() {
          return { tenantId: "tenant_a", projection: {} };
        },
        async readInvariantFailureRows() {
          return [];
        },
      },
    });

    await expect(adapters.readMemoryEvents()).rejects.toBeInstanceOf(
      CrossTenantAccessError,
    );
  });

  it("rejects cross-tenant projection reads", async () => {
    const adapters = createTenantScopedDbTruthVerificationAdapters({
      tenantId: "tenant_a",
      readers: {
        async readMemoryEventRows() {
          return [];
        },
        async readCurrentProjection() {
          return {
            tenantId: "tenant_b",
            projection: {
              "SO-1": { status: "posted", amount: 100 },
            },
          };
        },
        async readInvariantFailureRows() {
          return [];
        },
      },
    });

    await expect(adapters.readCurrentProjection()).rejects.toBeInstanceOf(
      CrossTenantAccessError,
    );
  });

  it("rejects cross-tenant invariant failure rows", async () => {
    const adapters = createTenantScopedDbTruthVerificationAdapters({
      tenantId: "tenant_a",
      readers: {
        async readMemoryEventRows() {
          return [];
        },
        async readCurrentProjection() {
          return { tenantId: "tenant_a", projection: {} };
        },
        async readInvariantFailureRows() {
          return [
            {
              tenant_id: "tenant_b",
              invariant_name: "journal_must_balance",
              doctrine: {
                doctrineRef: "double_entry_balance",
                family: "Accounting-Control",
                standard: "Accounting Truth Contract",
                section: "Journal balance",
                title: "Every journal posting must remain balanced.",
                interpretation: "strict",
              },
              evidence: {
                summary: "Journal debits and credits are not equal.",
                facts: {
                  journalEntryId: "draft",
                  debitTotal: 100,
                  creditTotal: 90,
                },
              },
              resolution: undefined,
            },
          ];
        },
      },
    });

    await expect(adapters.readInvariantFailures()).rejects.toBeInstanceOf(
      CrossTenantAccessError,
    );
  });
});
