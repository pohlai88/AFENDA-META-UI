import { describe, it, expect } from "vitest";
import { buildDiff } from "./diffBuilder.js";
import type { MetaField } from "@afenda/meta-types";

const fields: MetaField[] = [
  { name: "status", type: "string", label: "Status" },
  { name: "total", type: "integer", label: "Total" },
  {
    name: "email",
    type: "string",
    label: "Email",
    audit: { trackChanges: true, sensitivityLevel: "high" },
  },
  { name: "notes", type: "string", label: "Notes" },
];

describe("diffBuilder", () => {
  it("detects primitive value changes", () => {
    const diff = buildDiff(
      { status: "draft", total: 100 },
      { status: "posted", total: 100 },
      fields
    );
    expect(diff).toHaveLength(1);
    expect(diff[0]).toEqual({
      field: "status",
      oldValue: "draft",
      newValue: "posted",
      sensitivity: "low",
    });
  });

  it("detects numeric changes", () => {
    const diff = buildDiff({ total: 100 }, { total: 200 }, fields);
    expect(diff).toHaveLength(1);
    expect(diff[0].field).toBe("total");
    expect(diff[0].oldValue).toBe(100);
    expect(diff[0].newValue).toBe(200);
  });

  it("returns empty array when nothing changed", () => {
    const record = { status: "draft", total: 100 };
    expect(buildDiff(record, { ...record }, fields)).toHaveLength(0);
  });

  it("detects new fields (create scenario)", () => {
    const diff = buildDiff({}, { status: "new", total: 50 }, fields);
    expect(diff.length).toBeGreaterThanOrEqual(2);
    expect(diff.find((d) => d.field === "status")?.newValue).toBe("new");
    expect(diff.find((d) => d.field === "status")?.oldValue).toBeUndefined();
  });

  it("detects removed fields (delete scenario)", () => {
    const diff = buildDiff({ status: "old" }, {}, fields);
    expect(diff).toHaveLength(1);
    expect(diff[0].newValue).toBeUndefined();
  });

  it("respects sensitivity from MetaField.audit", () => {
    const diff = buildDiff({ email: "old@a.com" }, { email: "new@b.com" }, fields);
    expect(diff[0].sensitivity).toBe("high");
  });

  it("defaults sensitivity to low for fields without audit config", () => {
    const diff = buildDiff({ notes: "a" }, { notes: "b" }, fields);
    expect(diff[0].sensitivity).toBe("low");
  });

  it("compares arrays deeply", () => {
    const arrFields: MetaField[] = [{ name: "tags", type: "string", label: "Tags" }];
    const diff = buildDiff({ tags: [1, 2, 3] }, { tags: [1, 2, 4] }, arrFields);
    expect(diff).toHaveLength(1);
  });

  it("treats identical arrays as no change", () => {
    const arrFields: MetaField[] = [{ name: "tags", type: "string", label: "Tags" }];
    expect(buildDiff({ tags: [1, 2, 3] }, { tags: [1, 2, 3] }, arrFields)).toHaveLength(0);
  });

  it("compares Date objects by time value", () => {
    const dateFields: MetaField[] = [{ name: "createdAt", type: "string", label: "Created" }];
    const d = new Date("2024-01-01");
    expect(
      buildDiff({ createdAt: d }, { createdAt: new Date(d.getTime()) }, dateFields)
    ).toHaveLength(0);
  });
});
