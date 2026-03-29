import { describe, it, expect } from "vitest";
import { detectChanges, trackCreate, trackDelete } from "../changeDetector.js";
import type { MetaField } from "@afenda/meta-types/schema";
const fields: MetaField[] = [
  { name: "status", type: "string", label: "Status" },
  { name: "total", type: "integer", label: "Total" },
];

describe("changeDetector", () => {
  describe("detectChanges", () => {
    it("returns an AuditEntry for actual changes", () => {
      const entry = detectChanges(
        "invoice",
        "inv-1",
        "update",
        "user-1",
        { status: "draft", total: 100 },
        { status: "posted", total: 100 },
        fields
      );
      expect(entry).not.toBeNull();
      expect(entry!.entity).toBe("invoice");
      expect(entry!.entityId).toBe("inv-1");
      expect(entry!.operation).toBe("update");
      expect(entry!.actor).toBe("user-1");
      expect(entry!.changes).toHaveLength(1);
      expect(entry!.source).toBe("api");
    });

    it("returns null when update has no changes", () => {
      const entry = detectChanges(
        "invoice",
        "inv-1",
        "update",
        "user-1",
        { status: "draft" },
        { status: "draft" },
        fields
      );
      expect(entry).toBeNull();
    });

    it("includes source and reason when provided", () => {
      const entry = detectChanges(
        "invoice",
        "inv-1",
        "update",
        "user-1",
        { total: 100 },
        { total: 200 },
        fields,
        "ui",
        "Correction per client request"
      );
      expect(entry!.source).toBe("ui");
      expect(entry!.reason).toBe("Correction per client request");
    });
  });

  describe("trackCreate", () => {
    it("creates an audit entry with all fields as new", () => {
      const entry = trackCreate(
        "invoice",
        "inv-2",
        { status: "draft", total: 500 },
        "user-1",
        fields
      );
      expect(entry.operation).toBe("create");
      expect(entry.changes.length).toBeGreaterThanOrEqual(2);
      expect(entry.changes.every((c) => c.oldValue === undefined)).toBe(true);
    });
  });

  describe("trackDelete", () => {
    it("creates an audit entry with all fields as removed", () => {
      const entry = trackDelete(
        "invoice",
        "inv-3",
        { status: "posted", total: 1000 },
        "user-1",
        fields
      );
      expect(entry.operation).toBe("delete");
      expect(entry.changes.length).toBeGreaterThanOrEqual(2);
      expect(entry.changes.every((c) => c.newValue === undefined)).toBe(true);
    });
  });
});
