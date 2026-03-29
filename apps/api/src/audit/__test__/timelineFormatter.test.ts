import { describe, it, expect } from "vitest";
import { maskValue, formatTimeline } from "../timelineFormatter.js";
import type { AuditEntry } from "@afenda/meta-types/audit";
describe("timelineFormatter", () => {
  describe("maskValue", () => {
    it("shows low-sensitivity values to any viewer", () => {
      expect(maskValue("hello", "low", "low")).toBe("hello");
    });

    it("shows medium-sensitivity values when viewer has medium clearance", () => {
      expect(maskValue("hello", "medium", "medium")).toBe("hello");
    });

    it("shows high-sensitivity values when viewer has high clearance", () => {
      expect(maskValue("secret@email.com", "high", "high")).toBe("secret@email.com");
    });

    it("partially masks medium-sensitivity values for low-clearance viewer", () => {
      const masked = maskValue("secret@email.com", "medium", "low");
      expect(masked).toMatch(/^se\*+om$/);
    });

    it("fully masks high-sensitivity values for low-clearance viewer", () => {
      expect(maskValue("secret", "high", "low")).toBe("******");
    });

    it("fully masks high-sensitivity values for medium-clearance viewer", () => {
      expect(maskValue("secret", "high", "medium")).toBe("******");
    });

    it("formats null as (empty)", () => {
      expect(maskValue(null, "low", "high")).toBe("(empty)");
    });

    it("formats numbers as strings", () => {
      expect(maskValue(42, "low", "low")).toBe("42");
    });

    it("returns ****** for short strings with partial masking", () => {
      // short string where length <= revealChars*2
      expect(maskValue("ab", "medium", "low")).toBe("******");
    });
  });

  describe("formatTimeline", () => {
    const entries: AuditEntry[] = [
      {
        id: "a1",
        entity: "invoice",
        entityId: "inv-1",
        timestamp: "2024-06-01T10:00:00Z",
        actor: "user-1",
        operation: "create",
        changes: [{ field: "status", oldValue: undefined, newValue: "draft", sensitivity: "low" }],
        source: "api",
      },
      {
        id: "a2",
        entity: "invoice",
        entityId: "inv-1",
        timestamp: "2024-06-02T10:00:00Z",
        actor: "user-2",
        operation: "update",
        changes: [{ field: "total", oldValue: 100, newValue: 200, sensitivity: "low" }],
        source: "ui",
      },
    ];

    it("formats entries with default actor resolver", () => {
      const timeline = formatTimeline(entries);
      expect(timeline).toHaveLength(2);
      expect(timeline[0].actorName).toBe("user-1");
      expect(timeline[0].summary).toContain("Created invoice");
      expect(timeline[1].summary).toContain("Updated invoice");
    });

    it("uses custom actor resolver", () => {
      const resolver = (id: string) => (id === "user-1" ? "Alice" : "Bob");
      const timeline = formatTimeline(entries, resolver);
      expect(timeline[0].actorName).toBe("Alice");
      expect(timeline[1].actorName).toBe("Bob");
    });

    it("applies masking to change values", () => {
      const sensitiveEntries: AuditEntry[] = [
        {
          id: "a3",
          entity: "contact",
          entityId: "c-1",
          timestamp: "2024-06-01T10:00:00Z",
          actor: "user-1",
          operation: "update",
          changes: [
            {
              field: "email",
              oldValue: "old@email.com",
              newValue: "new@email.com",
              sensitivity: "high",
            },
          ],
          source: "api",
        },
      ];

      const timeline = formatTimeline(sensitiveEntries, undefined, "low");
      // High sensitivity, low viewer → fully masked
      expect(timeline[0].changes[0].oldValue).toBe("******");
      expect(timeline[0].changes[0].newValue).toBe("******");
    });

    it("reveals values when viewer has sufficient clearance", () => {
      const sensitiveEntries: AuditEntry[] = [
        {
          id: "a4",
          entity: "contact",
          entityId: "c-1",
          timestamp: "2024-06-01T10:00:00Z",
          actor: "user-1",
          operation: "update",
          changes: [
            {
              field: "email",
              oldValue: "old@email.com",
              newValue: "new@email.com",
              sensitivity: "high",
            },
          ],
          source: "api",
        },
      ];

      const timeline = formatTimeline(sensitiveEntries, undefined, "high");
      expect(timeline[0].changes[0].oldValue).toBe("old@email.com");
      expect(timeline[0].changes[0].newValue).toBe("new@email.com");
    });
  });
});
