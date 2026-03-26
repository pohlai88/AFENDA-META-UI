import { Decimal } from "decimal.js";
import { describe, it, expect } from "vitest";

import {
  generateCreditNote,
  inspectReturn,
  returnOrderStateMachine,
  validateReturnQuantities,
  type GenerateCreditNoteInput,
  type InspectReturnInput,
  type ValidateReturnQuantitiesInput,
} from "./returns-engine.js";

describe("validateReturnQuantities", () => {
  const baseInput: ValidateReturnQuantitiesInput = {
    returnOrder: {
      id: "return-1",
      sourceOrderId: "order-1",
      status: "draft",
    },
    returnLines: [
      {
        id: "return-line-1",
        productId: "product-1",
        quantity: "2.0000",
        unitPrice: "100.00",
        creditAmount: "200.00",
      },
    ],
    sourceOrder: {
      id: "order-1",
    },
    sourceOrderLines: [
      {
        id: "order-line-1",
        productId: "product-1",
        qtyDelivered: "5.0000",
        priceUnit: "100.00",
      },
    ],
  };

  it("passes validation for valid return quantities", () => {
    const result = validateReturnQuantities(baseInput);

    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
    expect(result.lineChecks).toHaveLength(1);
    expect(result.lineChecks[0].quantityValid).toBe(true);
    expect(result.lineChecks[0].creditValid).toBe(true);
  });

  it("fails when return quantity exceeds delivered quantity", () => {
    const input: ValidateReturnQuantitiesInput = {
      ...baseInput,
      returnLines: [
        {
          ...baseInput.returnLines[0],
          quantity: "10.0000", // Exceeds delivered 5
        },
      ],
    };

    const result = validateReturnQuantities(input);

    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
    expect(result.issues.some((i) => i.code === "QUANTITY_EXCEEDS_DELIVERED")).toBe(true);
  });

  it("fails when return quantity is zero", () => {
    const input: ValidateReturnQuantitiesInput = {
      ...baseInput,
      returnLines: [
        {
          ...baseInput.returnLines[0],
          quantity: "0.0000",
        },
      ],
    };

    const result = validateReturnQuantities(input);

    expect(result.valid).toBe(false);
    expect(result.issues.some((i) => i.code === "NEGATIVE_QUANTITY")).toBe(true);
  });

  it("fails when return quantity is negative", () => {
    const input: ValidateReturnQuantitiesInput = {
      ...baseInput,
      returnLines: [
        {
          ...baseInput.returnLines[0],
          quantity: "-1.0000",
        },
      ],
    };

    const result = validateReturnQuantities(input);

    expect(result.valid).toBe(false);
    expect(result.issues.some((i) => i.code === "NEGATIVE_QUANTITY")).toBe(true);
  });

  it("fails when credit amount mismatch exceeds tolerance", () => {
    const input: ValidateReturnQuantitiesInput = {
      ...baseInput,
      returnLines: [
        {
          ...baseInput.returnLines[0],
          quantity: "2.0000",
          unitPrice: "100.00",
          creditAmount: "150.00", // Should be 200.00
        },
      ],
    };

    const result = validateReturnQuantities(input);

    expect(result.valid).toBe(false);
    expect(result.issues.some((i) => i.code === "CREDIT_TOTAL_MISMATCH")).toBe(true);
  });

  it("passes when credit amount within $0.01 tolerance", () => {
    const input: ValidateReturnQuantitiesInput = {
      ...baseInput,
      returnLines: [
        {
          ...baseInput.returnLines[0],
          quantity: "2.0000",
          unitPrice: "100.00",
          creditAmount: "200.005", // Within tolerance
        },
      ],
    };

    const result = validateReturnQuantities(input);

    expect(result.valid).toBe(true);
    expect(result.lineChecks[0].creditValid).toBe(true);
  });

  it("fails when return has no lines", () => {
    const input: ValidateReturnQuantitiesInput = {
      ...baseInput,
      returnLines: [],
    };

    const result = validateReturnQuantities(input);

    expect(result.valid).toBe(false);
    expect(result.issues.some((i) => i.code === "EMPTY_RETURN")).toBe(true);
  });

  it("fails when source order is invalid", () => {
    const input: ValidateReturnQuantitiesInput = {
      ...baseInput,
      sourceOrder: null as any,
    };

    const result = validateReturnQuantities(input);

    expect(result.valid).toBe(false);
    expect(result.issues.some((i) => i.code === "INVALID_SOURCE_ORDER")).toBe(true);
  });

  it("fails when product not found in source order", () => {
    const input: ValidateReturnQuantitiesInput = {
      ...baseInput,
      returnLines: [
        {
          ...baseInput.returnLines[0],
          productId: "product-999", // Not in source order
        },
      ],
    };

    const result = validateReturnQuantities(input);

    expect(result.valid).toBe(false);
    expect(result.issues.some((i) => i.code === "QUANTITY_EXCEEDS_DELIVERED")).toBe(true);
  });

  it("fails when unit price is negative", () => {
    const input: ValidateReturnQuantitiesInput = {
      ...baseInput,
      returnLines: [
        {
          ...baseInput.returnLines[0],
          unitPrice: "-100.00",
          creditAmount: "-200.00",
        },
      ],
    };

    const result = validateReturnQuantities(input);

    expect(result.valid).toBe(false);
    expect(result.issues.some((i) => i.code === "NEGATIVE_PRICING")).toBe(true);
  });

  it("validates multiple return lines", () => {
    const input: ValidateReturnQuantitiesInput = {
      ...baseInput,
      returnLines: [
        {
          id: "return-line-1",
          productId: "product-1",
          quantity: "2.0000",
          unitPrice: "100.00",
          creditAmount: "200.00",
        },
        {
          id: "return-line-2",
          productId: "product-2",
          quantity: "1.0000",
          unitPrice: "50.00",
          creditAmount: "50.00",
        },
      ],
      sourceOrderLines: [
        {
          id: "order-line-1",
          productId: "product-1",
          qtyDelivered: "5.0000",
          priceUnit: "100.00",
        },
        {
          id: "order-line-2",
          productId: "product-2",
          qtyDelivered: "3.0000",
          priceUnit: "50.00",
        },
      ],
    };

    const result = validateReturnQuantities(input);

    expect(result.valid).toBe(true);
    expect(result.lineChecks).toHaveLength(2);
    expect(result.lineChecks.every((lc) => lc.quantityValid && lc.creditValid)).toBe(true);
  });
});

describe("generateCreditNote", () => {
  const baseInput: GenerateCreditNoteInput = {
    returnOrder: {
      id: "return-1",
      partnerId: "partner-1",
      sourceOrderId: "order-1",
      status: "inspected",
    },
    returnLines: [
      {
        id: "return-line-1",
        productId: "product-1",
        quantity: "2.0000",
        unitPrice: "100.00",
        creditAmount: "200.00",
      },
    ],
    validation: {
      valid: true,
      issues: [],
    },
  };

  it("generates credit note for valid inspected return", () => {
    const creditNote = generateCreditNote(baseInput);

    expect(creditNote.returnOrderId).toBe("return-1");
    expect(creditNote.partnerId).toBe("partner-1");
    expect(creditNote.sourceOrderId).toBe("order-1");
    expect(creditNote.lines).toHaveLength(1);
    expect(creditNote.amountUntaxed.toNumber()).toBe(200.0);
    expect(creditNote.amountTax.toNumber()).toBe(0); // Default tax policy
    expect(creditNote.amountTotal.toNumber()).toBe(200.0);
  });

  it("applies custom tax policy", () => {
    const input: GenerateCreditNoteInput = {
      ...baseInput,
      taxPolicy: {
        computeTax: (amountUntaxed) => amountUntaxed.mul(0.1), // 10% tax
        round: (amount) => amount.toDecimalPlaces(2),
      },
    };

    const creditNote = generateCreditNote(input);

    expect(creditNote.amountUntaxed.toNumber()).toBe(200.0);
    expect(creditNote.amountTax.toNumber()).toBe(20.0); // 10% of 200
    expect(creditNote.amountTotal.toNumber()).toBe(220.0);
  });

  it("generates credit note with multiple lines", () => {
    const input: GenerateCreditNoteInput = {
      ...baseInput,
      returnLines: [
        {
          id: "return-line-1",
          productId: "product-1",
          quantity: "2.0000",
          unitPrice: "100.00",
          creditAmount: "200.00",
        },
        {
          id: "return-line-2",
          productId: "product-2",
          quantity: "1.0000",
          unitPrice: "50.00",
          creditAmount: "50.00",
        },
      ],
    };

    const creditNote = generateCreditNote(input);

    expect(creditNote.lines).toHaveLength(2);
    expect(creditNote.amountUntaxed.toNumber()).toBe(250.0);
  });

  it("skips lines with zero credit amount", () => {
    const input: GenerateCreditNoteInput = {
      ...baseInput,
      returnLines: [
        {
          id: "return-line-1",
          productId: "product-1",
          quantity: "2.0000",
          unitPrice: "100.00",
          creditAmount: "200.00",
        },
        {
          id: "return-line-2",
          productId: "product-2",
          quantity: "0.0000",
          unitPrice: "50.00",
          creditAmount: "0.00",
        },
      ],
    };

    const creditNote = generateCreditNote(input);

    expect(creditNote.lines).toHaveLength(1);
    expect(creditNote.amountUntaxed.toNumber()).toBe(200.0);
  });

  it("throws error when return not in inspected status", () => {
    const input: GenerateCreditNoteInput = {
      ...baseInput,
      returnOrder: {
        ...baseInput.returnOrder,
        status: "draft",
      },
    };

    expect(() => generateCreditNote(input)).toThrow();
  });

  it("throws error when validation fails", () => {
    const input: GenerateCreditNoteInput = {
      ...baseInput,
      validation: {
        valid: false,
        issues: [
          {
            code: "QUANTITY_EXCEEDS_DELIVERED",
            severity: "error",
            message: "Quantity exceeds delivered",
          },
        ],
      },
    };

    expect(() => generateCreditNote(input)).toThrow();
  });

  it("throws error when no creditable lines", () => {
    const input: GenerateCreditNoteInput = {
      ...baseInput,
      returnLines: [
        {
          id: "return-line-1",
          productId: "product-1",
          quantity: "0.0000",
          unitPrice: "100.00",
          creditAmount: "0.00",
        },
      ],
    };

    // State machine guard (hasCreditableAmount) catches this first
    expect(() => generateCreditNote(input)).toThrow();
  });

  it("uses Decimal precision for calculations", () => {
    const input: GenerateCreditNoteInput = {
      ...baseInput,
      returnLines: [
        {
          id: "return-line-1",
          productId: "product-1",
          quantity: "1.3333",
          unitPrice: "7.49",
          creditAmount: "9.99",
        },
      ],
    };

    const creditNote = generateCreditNote(input);

    expect(creditNote.amountUntaxed.toFixed(2)).toBe("9.99");
    expect(creditNote.lines[0].creditAmount.toFixed(2)).toBe("9.99");
  });
});

describe("inspectReturn", () => {
  const baseInput: InspectReturnInput = {
    returnOrder: {
      id: "return-1",
      status: "received",
    },
    returnLines: [
      {
        id: "return-line-1",
        condition: "used",
      },
      {
        id: "return-line-2",
        condition: "used",
      },
    ],
    inspectionResults: [
      {
        lineId: "return-line-1",
        condition: "damaged",
        notes: "Screen cracked",
      },
      {
        lineId: "return-line-2",
        condition: "new",
        notes: "Unopened package",
      },
    ],
  };

  it("records inspection results for all lines", () => {
    const result = inspectReturn(baseInput);

    expect(result.returnOrderId).toBe("return-1");
    expect(result.linesInspected).toBe(2);
    expect(result.conditionUpdates).toHaveLength(2);
    expect(result.conditionUpdates[0].oldCondition).toBe("used");
    expect(result.conditionUpdates[0].newCondition).toBe("damaged");
    expect(result.conditionUpdates[1].newCondition).toBe("new");
  });

  it("throws error when return not in received status", () => {
    const input: InspectReturnInput = {
      ...baseInput,
      returnOrder: {
        ...baseInput.returnOrder,
        status: "draft",
      },
    };

    expect(() => inspectReturn(input)).toThrow();
  });

  it("throws error when inspection incomplete", () => {
    const input: InspectReturnInput = {
      ...baseInput,
      inspectionResults: [
        {
          lineId: "return-line-1",
          condition: "damaged",
        },
        // Missing return-line-2
      ],
    };

    expect(() => inspectReturn(input)).toThrow();
  });

  it("throws error when inspection for unknown line", () => {
    const input: InspectReturnInput = {
      ...baseInput,
      inspectionResults: [
        {
          lineId: "unknown-line",
          condition: "damaged",
        },
        {
          lineId: "return-line-2",
          condition: "new",
        },
      ],
    };

    expect(() => inspectReturn(input)).toThrow("unknown line");
  });
});

describe("returnOrderStateMachine", () => {
  it("allows draft → approved transition with valid validation", () => {
    const canTransition = returnOrderStateMachine.canTransition("draft", "approved", {
      validationValid: true,
    });

    expect(canTransition).toBe(true);
  });

  it("blocks draft → approved without valid validation", () => {
    const canTransition = returnOrderStateMachine.canTransition("draft", "approved", {
      validationValid: false,
    });

    expect(canTransition).toBe(false);
  });

  it("allows approved → received transition", () => {
    const canTransition = returnOrderStateMachine.canTransition("approved", "received");

    expect(canTransition).toBe(true);
  });

  it("allows received → inspected with complete inspection", () => {
    const canTransition = returnOrderStateMachine.canTransition("received", "inspected", {
      inspectionComplete: true,
    });

    expect(canTransition).toBe(true);
  });

  it("blocks received → inspected without complete inspection", () => {
    const canTransition = returnOrderStateMachine.canTransition("received", "inspected", {
      inspectionComplete: false,
    });

    expect(canTransition).toBe(false);
  });

  it("allows inspected → credited with valid validation and credit", () => {
    const canTransition = returnOrderStateMachine.canTransition("inspected", "credited", {
      validationValid: true,
      hasCreditableAmount: true,
    });

    expect(canTransition).toBe(true);
  });

  it("blocks inspected → credited without validation", () => {
    const canTransition = returnOrderStateMachine.canTransition("inspected", "credited", {
      validationValid: false,
      hasCreditableAmount: true,
    });

    expect(canTransition).toBe(false);
  });

  it("blocks inspected → credited without creditable amount", () => {
    const canTransition = returnOrderStateMachine.canTransition("inspected", "credited", {
      validationValid: true,
      hasCreditableAmount: false,
    });

    expect(canTransition).toBe(false);
  });

  it("allows draft → cancelled transition", () => {
    const canTransition = returnOrderStateMachine.canTransition("draft", "cancelled");

    expect(canTransition).toBe(true);
  });

  it("allows approved → cancelled transition", () => {
    const canTransition = returnOrderStateMachine.canTransition("approved", "cancelled");

    expect(canTransition).toBe(true);
  });

  it("returns valid transitions for draft status", () => {
    // Pass context with validationValid to satisfy guard for draft → approved
    const transitions = returnOrderStateMachine.getValidTransitions("draft", {
      validationValid: true,
    });

    expect(transitions).toContain("approved");
    expect(transitions).toContain("cancelled");
  });

  it("returns valid transitions for approved status", () => {
    const transitions = returnOrderStateMachine.getValidTransitions("approved");

    expect(transitions).toContain("received");
    expect(transitions).toContain("cancelled");
  });

  it("throws error for invalid transition", () => {
    expect(() => {
      returnOrderStateMachine.assertTransition("credited", "draft");
    }).toThrow();
  });
});
