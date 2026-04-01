/**
 * Unit tests: FK catalog helpers (priority heuristics, schema defaults).
 */

import { describe, expect, it } from "vitest";
import {
  DEFAULT_ERP_SCHEMAS,
  determineFkValidationPriority,
  type FkConstraint,
} from "../fk-catalog.js";

const baseConstraint = (overrides: Partial<FkConstraint> = {}): FkConstraint => ({
  constraintName: "fk_test",
  childTableSchema: "sales",
  childTableName: "sales_orders",
  childColumnName: "partner_id",
  parentTableSchema: "sales",
  parentTableName: "partners",
  parentColumnName: "id",
  deleteRule: "RESTRICT",
  updateRule: "CASCADE",
  ...overrides,
});

describe("fk-catalog", () => {
  describe("DEFAULT_ERP_SCHEMAS", () => {
    it("includes core ERP pgSchema names", () => {
      expect(DEFAULT_ERP_SCHEMAS).toEqual(
        expect.arrayContaining(["core", "hr", "sales", "reference", "security"])
      );
    });
  });

  describe("determineFkValidationPriority", () => {
    it("marks tenant root FKs as P0", () => {
      expect(
        determineFkValidationPriority(
          baseConstraint({
            parentTableName: "tenants",
            childColumnName: "tenant_id",
            childTableName: "employees",
            parentTableSchema: "core",
          })
        )
      ).toBe("P0");
    });

    it("marks CASCADE relationships as P1", () => {
      expect(
        determineFkValidationPriority(
          baseConstraint({
            deleteRule: "CASCADE",
            parentTableName: "widgets",
          })
        )
      ).toBe("P1");
    });

    it("marks history tables as P1 even without CASCADE", () => {
      expect(
        determineFkValidationPriority(
          baseConstraint({
            childTableName: "invoice_history",
            deleteRule: "RESTRICT",
          })
        )
      ).toBe("P1");
    });

    it("marks tax configuration parents as P2", () => {
      expect(
        determineFkValidationPriority(
          baseConstraint({
            parentTableName: "tax_codes",
            childTableName: "lines",
            deleteRule: "RESTRICT",
          })
        )
      ).toBe("P2");
    });

    it("defaults unknown relationships to P3", () => {
      expect(
        determineFkValidationPriority(
          baseConstraint({
            parentTableName: "currencies",
            childTableName: "rates",
            deleteRule: "RESTRICT",
          })
        )
      ).toBe("P3");
    });
  });
});
