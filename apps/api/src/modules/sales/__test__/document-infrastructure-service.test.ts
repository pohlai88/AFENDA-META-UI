import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  ensureTestEnv,
  selectMock,
  updateMock,
  insertMock,
  queueSelect,
  queueInsert,
  setUpdateResult,
  recordDomainEventMock,
} = vi.hoisted(() => {
  process.env.DATABASE_URL ??= "postgres://postgres:postgres@localhost:5432/afenda_test";

  const selectQueue: unknown[][] = [];
  const insertQueue: unknown[][] = [];
  let updateResult: unknown[] = [];

  const createSelectChain = (rows: unknown[]) => {
    const chain = {
      from: vi.fn(() => chain),
      where: vi.fn(() => chain),
      orderBy: vi.fn(() => chain),
      limit: vi.fn(async () => rows),
      then: (resolve: (value: unknown[]) => unknown) => Promise.resolve(rows).then(resolve),
    };

    return chain;
  };

  return {
    ensureTestEnv: true,
    selectMock: vi.fn(() => createSelectChain(selectQueue.shift() ?? [])),
    updateMock: vi.fn(() => ({
      set: vi.fn(() => ({
        where: vi.fn(() => ({
          returning: vi.fn(async () => updateResult),
        })),
      })),
    })),
    insertMock: vi.fn(() => ({
      values: vi.fn(() => ({
        returning: vi.fn(async () => insertQueue.shift() ?? []),
      })),
    })),
    queueSelect: (...rows: unknown[][]) => {
      selectQueue.push(...rows);
    },
    queueInsert: (...rows: unknown[][]) => {
      insertQueue.push(...rows);
    },
    setUpdateResult: (rows: unknown[]) => {
      updateResult = rows;
    },
    recordDomainEventMock: vi.fn(),
  };
});

void ensureTestEnv;

vi.mock("../../../db/index.js", () => ({
  db: {
    select: selectMock,
    update: updateMock,
    insert: insertMock,
  },
}));

vi.mock("../../../utils/audit-logs.js", () => ({
  recordDomainEvent: recordDomainEventMock,
}));

vi.mock("@afenda/db/schema-domain", () => ({
  accountingPostings: {},
  documentApprovals: {},
  documentStatusHistory: {},
  roundingPolicies: {},
  salesDocumentAttachments: {},
}));

import { NotFoundError, ValidationError } from "../../../middleware/errorHandler.js";
import {
  approveDocument,
  createDocumentApprovalRequest,
  postAccountingEntry,
  recordDocumentStatusHistory,
  registerDocumentAttachment,
  rejectDocument,
  resolveRoundingPolicy,
  reverseAccountingPosting,
} from "../document-infrastructure-service.js";

beforeEach(() => {
  vi.clearAllMocks();
  setUpdateResult([]);
});

describe("document infrastructure service", () => {
  it("records document status history", async () => {
    queueInsert([
      {
        id: "status-1",
        tenantId: 7,
        documentType: "sales_order",
        documentId: "00000000-0000-4000-8000-000000000101",
        fromStatus: "draft",
        toStatus: "confirmed",
      },
    ]);

    const result = await recordDocumentStatusHistory({
      tenantId: 7,
      actorId: 99,
      documentType: "sales_order",
      documentId: "00000000-0000-4000-8000-000000000101",
      fromStatus: "draft",
      toStatus: "confirmed",
    });

    expect(result.entry.id).toBe("status-1");
    expect(recordDomainEventMock).toHaveBeenCalledTimes(1);
  });

  it("creates approval requests", async () => {
    queueInsert([
      {
        id: "approval-1",
        tenantId: 7,
        documentType: "sales_order",
        documentId: "00000000-0000-4000-8000-000000000102",
        status: "pending",
      },
    ]);

    const result = await createDocumentApprovalRequest({
      tenantId: 7,
      actorId: 99,
      documentType: "sales_order",
      documentId: "00000000-0000-4000-8000-000000000102",
      approvalLevel: 1,
      approverUserId: 42,
    });

    expect(result.approval.status).toBe("pending");
  });

  it("approves pending requests assigned to actor", async () => {
    queueSelect([
      {
        id: "approval-2",
        tenantId: 7,
        documentType: "sales_order",
        documentId: "00000000-0000-4000-8000-000000000103",
        approvalLevel: 1,
        approverUserId: 42,
        comments: null,
        status: "pending",
      },
    ]);
    setUpdateResult([
      {
        id: "approval-2",
        tenantId: 7,
        documentType: "sales_order",
        documentId: "00000000-0000-4000-8000-000000000103",
        approvalLevel: 1,
        approverUserId: 42,
        comments: "approved",
        status: "approved",
      },
    ]);

    const result = await approveDocument({
      tenantId: 7,
      actorId: 42,
      approvalId: "approval-2",
      comments: "approved",
    });

    expect(result.approval.status).toBe("approved");
  });

  it("rejects pending requests assigned to actor", async () => {
    queueSelect([
      {
        id: "approval-3",
        tenantId: 7,
        documentType: "return_order",
        documentId: "00000000-0000-4000-8000-000000000104",
        approvalLevel: 2,
        approverUserId: 15,
        comments: null,
        status: "pending",
      },
    ]);
    setUpdateResult([
      {
        id: "approval-3",
        tenantId: 7,
        documentType: "return_order",
        documentId: "00000000-0000-4000-8000-000000000104",
        approvalLevel: 2,
        approverUserId: 15,
        comments: "insufficient documentation",
        status: "rejected",
      },
    ]);

    const result = await rejectDocument({
      tenantId: 7,
      actorId: 15,
      approvalId: "approval-3",
      comments: "insufficient documentation",
    });

    expect(result.approval.status).toBe("rejected");
  });

  it("registers document attachments", async () => {
    queueInsert([
      {
        id: "attach-1",
        tenantId: 7,
        documentType: "sales_order",
        documentId: "00000000-0000-4000-8000-000000000105",
        fileName: "invoice.pdf",
        fileSize: 1024,
        storageProvider: "s3",
      },
    ]);

    const result = await registerDocumentAttachment({
      tenantId: 7,
      actorId: 5,
      documentType: "sales_order",
      documentId: "00000000-0000-4000-8000-000000000105",
      fileName: "invoice.pdf",
      fileSize: 1024,
      mimeType: "application/pdf",
      storageProvider: "s3",
      storagePath: "tenant-7/sales/order-105/invoice.pdf",
    });

    expect(result.attachment.id).toBe("attach-1");
  });

  it("posts and reverses accounting entries", async () => {
    queueInsert([
      {
        id: "posting-1",
        tenantId: 7,
        sourceDocumentType: "sales_order",
        sourceDocumentId: "00000000-0000-4000-8000-000000000106",
        amount: "1200.00",
        currencyCode: "USD",
        postingStatus: "posted",
      },
    ]);

    const posted = await postAccountingEntry({
      tenantId: 7,
      actorId: 88,
      sourceDocumentType: "sales_order",
      sourceDocumentId: "00000000-0000-4000-8000-000000000106",
      amount: "1200.00",
      currencyCode: "USD",
    });

    expect(posted.posting.postingStatus).toBe("posted");

    queueSelect([
      {
        id: "posting-1",
        tenantId: 7,
        sourceDocumentType: "sales_order",
        sourceDocumentId: "00000000-0000-4000-8000-000000000106",
        amount: "1200.00",
        currencyCode: "USD",
        postingStatus: "posted",
        reversedAt: null,
        journalEntryId: null,
        debitAccountCode: "4000",
        creditAccountCode: "1100",
      },
    ]);
    queueInsert([
      {
        id: "posting-rev-1",
        tenantId: 7,
        sourceDocumentType: "sales_order",
        sourceDocumentId: "00000000-0000-4000-8000-000000000106",
        amount: "1200.00",
        currencyCode: "USD",
        postingStatus: "posted",
      },
    ]);
    setUpdateResult([
      {
        id: "posting-1",
        tenantId: 7,
        sourceDocumentType: "sales_order",
        sourceDocumentId: "00000000-0000-4000-8000-000000000106",
        amount: "1200.00",
        currencyCode: "USD",
        postingStatus: "reversed",
        reversalEntryId: "posting-rev-1",
      },
    ]);

    const reversed = await reverseAccountingPosting({
      tenantId: 7,
      actorId: 88,
      postingId: "posting-1",
      reversalReason: "duplicate",
    });

    expect(reversed.posting.postingStatus).toBe("reversed");
    expect(reversed.reversalPosting.id).toBe("posting-rev-1");
  });

  it("resolves rounding policies with fallback", async () => {
    queueSelect(
      [],
      [
        {
          id: "policy-1",
          tenantId: 7,
          policyKey: "default-price",
          appliesTo: "sales_order",
          roundingMethod: "round",
          roundingPrecision: 2,
          currencyCode: null,
        },
      ]
    );

    const result = await resolveRoundingPolicy({
      tenantId: 7,
      policyKey: "default-price",
      appliesTo: "sales_order",
      currencyCode: "USD",
    });

    expect(result.policy.id).toBe("policy-1");
    expect(result.resolution).toBe("default-currency");
  });

  it("throws when no rounding policy exists", async () => {
    queueSelect([], []);

    await expect(
      resolveRoundingPolicy({
        tenantId: 7,
        policyKey: "missing",
        appliesTo: "sales_order",
      })
    ).rejects.toBeInstanceOf(NotFoundError);
  });

  it("throws when non-posted entry is reversed", async () => {
    queueSelect([
      {
        id: "posting-2",
        tenantId: 7,
        sourceDocumentType: "sales_order",
        sourceDocumentId: "00000000-0000-4000-8000-000000000107",
        amount: "100.00",
        currencyCode: "USD",
        postingStatus: "draft",
        reversedAt: null,
      },
    ]);

    await expect(
      reverseAccountingPosting({
        tenantId: 7,
        actorId: 88,
        postingId: "posting-2",
      })
    ).rejects.toBeInstanceOf(ValidationError);
  });
});
