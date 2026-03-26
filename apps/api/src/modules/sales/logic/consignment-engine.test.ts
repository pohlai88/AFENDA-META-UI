import { describe, expect, it } from "vitest";
import { Decimal } from "decimal.js";
import {
  ConsignmentEngineError,
  assertCanInvoiceReport,
  canInvoiceReport,
  checkAgreementExpiry,
  computeExpectedClosingQty,
  generateInvoiceFromReport,
  validateStockReport,
} from "./consignment-engine.js";

describe("consignment engine", () => {
  describe("invariant helpers", () => {
    it("computes expected closing quantity deterministically", () => {
      const result = computeExpectedClosingQty({
        opening: new Decimal(10),
        received: new Decimal(5),
        sold: new Decimal(8),
        returned: new Decimal(1),
      });

      expect(result.toFixed(4)).toBe("6.0000");
    });

    it("exposes report invoice guard helpers", () => {
      expect(canInvoiceReport("confirmed")).toBe(true);
      expect(canInvoiceReport("draft")).toBe(false);
      expect(() => assertCanInvoiceReport("draft")).toThrow(
        "Only confirmed reports can be invoiced"
      );
    });
  });

  describe("validateStockReport", () => {
    it("validates balanced stock and line totals", () => {
      const result = validateStockReport({
        report: {
          id: "report-1",
          status: "confirmed",
        },
        lines: [
          {
            id: "line-1",
            productId: "prod-1",
            openingQty: "10",
            receivedQty: "5",
            soldQty: "8",
            returnedQty: "1",
            closingQty: "6",
            unitPrice: "100.00",
            lineTotal: "800.00",
          },
        ],
      });

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.issues).toHaveLength(0);
      expect(result.lineChecks).toEqual([
        {
          lineId: "line-1",
          expectedClosingQty: "6.0000",
          actualClosingQty: "6.0000",
          isBalanced: true,
        },
      ]);
    });

    it("fails when stock balance is violated", () => {
      const result = validateStockReport({
        report: {
          id: "report-1",
          status: "confirmed",
        },
        lines: [
          {
            id: "line-1",
            productId: "prod-1",
            openingQty: "10",
            receivedQty: "5",
            soldQty: "8",
            returnedQty: "1",
            closingQty: "7",
            unitPrice: "100.00",
            lineTotal: "800.00",
          },
        ],
      });

      expect(result.valid).toBe(false);
      expect(result.errors).toContain(
        "Line 'line-1' stock mismatch: expected closing 6.0000, got 7.0000."
      );
      expect(result.issues).toContainEqual(
        expect.objectContaining({
          code: "STOCK_BALANCE_MISMATCH",
          severity: "error",
        })
      );
    });

    it("fails when report status is not confirmable", () => {
      const result = validateStockReport({
        report: {
          id: "report-1",
          status: "draft",
        },
        lines: [
          {
            id: "line-1",
            productId: "prod-1",
            openingQty: "1",
            receivedQty: "0",
            soldQty: "1",
            returnedQty: "0",
            closingQty: "0",
            unitPrice: "10.00",
            lineTotal: "10.00",
          },
        ],
      });

      expect(result.valid).toBe(false);
      expect(result.errors).toContain(
        "Report status 'draft' cannot be validated for stock posting."
      );
      expect(result.issues).toContainEqual(
        expect.objectContaining({
          code: "INVALID_REPORT_STATUS",
          severity: "error",
        })
      );
    });

    it("fails when line total does not match sold quantity × unit price", () => {
      const result = validateStockReport({
        report: {
          id: "report-1",
          status: "confirmed",
        },
        lines: [
          {
            id: "line-1",
            productId: "prod-1",
            openingQty: "1",
            receivedQty: "0",
            soldQty: "1",
            returnedQty: "0",
            closingQty: "0",
            unitPrice: "10.00",
            lineTotal: "11.00",
          },
        ],
      });

      expect(result.valid).toBe(false);
      expect(result.errors).toContain(
        "Line 'line-1' total mismatch: expected 10.00, got 11.00."
      );
      expect(result.issues).toContainEqual(
        expect.objectContaining({
          code: "PRICE_TOTAL_MISMATCH",
          severity: "error",
        })
      );
    });

    it("fails when report has no lines", () => {
      const result = validateStockReport({
        report: {
          id: "report-1",
          status: "confirmed",
        },
        lines: [],
      });

      expect(result.valid).toBe(false);
      expect(result.errors).toContain("Consignment report must include at least one line.");
      expect(result.issues).toContainEqual(
        expect.objectContaining({
          code: "EMPTY_REPORT",
          severity: "error",
        })
      );
    });
  });

  describe("generateInvoiceFromReport", () => {
    const agreement = {
      id: "agreement-1",
      partnerId: "partner-1",
      status: "active",
    } as const;

    const report = {
      id: "report-1",
      agreementId: "agreement-1",
      status: "confirmed",
    } as const;

    it("builds invoice lines from sold quantities only", () => {
      const result = generateInvoiceFromReport({
        agreement,
        report,
        lines: [
          {
            id: "line-1",
            productId: "prod-1",
            soldQty: "3",
            unitPrice: "100.00",
            lineTotal: "300.00",
          },
          {
            id: "line-2",
            productId: "prod-2",
            soldQty: "0",
            unitPrice: "50.00",
            lineTotal: "0.00",
          },
        ],
      });

      expect(result.partnerId).toBe("partner-1");
      expect(result.lines).toHaveLength(1);
      expect(result.lines[0]).toMatchObject({
        reportLineId: "line-1",
        productId: "prod-1",
      });
      expect(result.amountUntaxed.toFixed(2)).toBe("300.00");
      expect(result.amountTax.toFixed(2)).toBe("0.00");
      expect(result.amountTotal.toFixed(2)).toBe("300.00");
    });

    it("rejects non-active agreements", () => {
      expect(() =>
        generateInvoiceFromReport({
          agreement: { ...agreement, status: "expired" },
          report,
          lines: [
            {
              id: "line-1",
              productId: "prod-1",
              soldQty: "1",
              unitPrice: "10.00",
              lineTotal: "10.00",
            },
          ],
        })
      ).toThrow("Cannot invoice consignment report for agreement in status 'expired'.");
    });

    it("rejects non-confirmed reports", () => {
      expect(() =>
        generateInvoiceFromReport({
          agreement,
          report: { ...report, status: "draft" },
          lines: [
            {
              id: "line-1",
              productId: "prod-1",
              soldQty: "1",
              unitPrice: "10.00",
              lineTotal: "10.00",
            },
          ],
        })
      ).toThrow("Cannot transition report from 'draft' to 'invoiced'");
    });

    it("rejects inconsistent line totals", () => {
      expect(() =>
        generateInvoiceFromReport({
          agreement,
          report,
          lines: [
            {
              id: "line-1",
              productId: "prod-1",
              soldQty: "2",
              unitPrice: "10.00",
              lineTotal: "30.00",
            },
          ],
        })
      ).toThrow(ConsignmentEngineError);
    });

    it("rejects reports without sold quantities", () => {
      expect(() =>
        generateInvoiceFromReport({
          agreement,
          report,
          lines: [
            {
              id: "line-1",
              productId: "prod-1",
              soldQty: "0",
              unitPrice: "10.00",
              lineTotal: "0.00",
            },
          ],
        })
      ).toThrow("No sold quantities found to invoice.");
    });

    it("rejects invoice generation when validation context is invalid", () => {
      expect(() =>
        generateInvoiceFromReport({
          agreement,
          report,
          validation: {
            valid: false,
            issues: [
              {
                code: "STOCK_BALANCE_MISMATCH",
                severity: "error",
                message: "invalid",
              },
            ],
          },
          lines: [
            {
              id: "line-1",
              productId: "prod-1",
              soldQty: "1",
              unitPrice: "10.00",
              lineTotal: "10.00",
            },
          ],
        })
      ).toThrow("Cannot invoice invalid report. Resolve validation issues first.");
    });
  });

  describe("checkAgreementExpiry", () => {
    it("marks active agreement as expired when end date is in the past", () => {
      const result = checkAgreementExpiry({
        agreement: {
          status: "active",
          startDate: new Date("2026-01-01T00:00:00.000Z"),
          endDate: new Date("2026-01-31T23:59:59.000Z"),
        },
        evaluatedAt: new Date("2026-02-01T00:00:00.000Z"),
      });

      expect(result.expired).toBe(true);
      expect(result.shouldTransition).toBe(true);
      expect(result.nextStatus).toBe("expired");
      expect(result.transition).toEqual({
        type: "EXPIRE",
        effectiveAt: new Date("2026-02-01T00:00:00.000Z"),
      });
    });

    it("keeps active agreement active when end date is not reached", () => {
      const result = checkAgreementExpiry({
        agreement: {
          status: "active",
          startDate: new Date("2026-01-01T00:00:00.000Z"),
          endDate: new Date("2026-03-31T23:59:59.000Z"),
        },
        evaluatedAt: new Date("2026-02-01T00:00:00.000Z"),
      });

      expect(result.expired).toBe(false);
      expect(result.shouldTransition).toBe(false);
      expect(result.nextStatus).toBe("active");
      expect(result.transition).toEqual({ type: "NOOP" });
    });

    it("does not transition already expired agreements", () => {
      const result = checkAgreementExpiry({
        agreement: {
          status: "expired",
          startDate: new Date("2026-01-01T00:00:00.000Z"),
          endDate: new Date("2026-01-31T23:59:59.000Z"),
        },
      });

      expect(result.expired).toBe(true);
      expect(result.shouldTransition).toBe(false);
      expect(result.nextStatus).toBe("expired");
      expect(result.transition).toEqual({ type: "NOOP" });
    });

    it("keeps terminated agreements terminated", () => {
      const result = checkAgreementExpiry({
        agreement: {
          status: "terminated",
          startDate: new Date("2026-01-01T00:00:00.000Z"),
          endDate: new Date("2026-01-31T23:59:59.000Z"),
        },
      });

      expect(result.expired).toBe(false);
      expect(result.shouldTransition).toBe(false);
      expect(result.nextStatus).toBe("terminated");
      expect(result.transition).toEqual({ type: "NOOP" });
    });
  });
});
