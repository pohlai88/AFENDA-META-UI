import { describe, expect, it } from "vitest";
import type { MetaField } from "@afenda/meta-types";
import type { FilterCondition } from "~/hooks/useModel";
import {
  buildConditionSummary,
  filterEnumOptions,
  getEnumInValues,
  getDisplayValue,
  getOperatorsForField,
  getValueInputKind,
  needsValue,
  parseConditionValue,
  sanitizeLikeValue,
  selectVisibleEnumInValues,
  toggleEnumInValue,
} from "./filter-config";

const enumField: MetaField = {
  name: "status",
  label: "Status",
  type: "enum",
  options: [
    { value: "draft", label: "Draft" },
    { value: "confirmed", label: "Confirmed" },
  ],
};

const numberField: MetaField = {
  name: "amount",
  label: "Amount",
  type: "decimal",
};

const booleanField: MetaField = {
  name: "isActive",
  label: "Active",
  type: "boolean",
};

describe("filter-config", () => {
  it("returns enum operators including 'in'", () => {
    const operators = getOperatorsForField(enumField).map((operator) => operator.value);
    expect(operators).toContain("in");
  });

  it("recognizes operators without value", () => {
    expect(needsValue("is_null")).toBe(false);
    expect(needsValue("eq")).toBe(true);
  });

  it("sanitizes like/ilike values consistently", () => {
    expect(sanitizeLikeValue(" Corp ")).toBe("%Corp%");
    expect(sanitizeLikeValue("%Corp%")).toBe("%Corp%");
  });

  it("parses numeric and enum 'in' values correctly", () => {
    expect(parseConditionValue(numberField, "eq", "12.5")).toBe(12.5);
    expect(parseConditionValue(numberField, "eq", "")).toBeUndefined();
    expect(parseConditionValue(enumField, "in", "draft, confirmed")).toEqual([
      "draft",
      "confirmed",
    ]);
  });

  it("normalizes enum in values from arrays and comma strings", () => {
    expect(getEnumInValues(["draft", "confirmed"])).toEqual(["draft", "confirmed"]);
    expect(getEnumInValues("draft, confirmed")).toEqual(["draft", "confirmed"]);
    expect(getEnumInValues(undefined)).toEqual([]);
  });

  it("toggles enum values predictably", () => {
    expect(toggleEnumInValue(["draft"], "confirmed")).toEqual(["draft", "confirmed"]);
    expect(toggleEnumInValue(["draft", "confirmed"], "draft")).toEqual(["confirmed"]);
  });

  it("filters enum options by label or value", () => {
    expect(filterEnumOptions(enumField.options ?? [], "dra")).toEqual([
      { value: "draft", label: "Draft" },
    ]);
    expect(filterEnumOptions(enumField.options ?? [], "confirm")).toEqual([
      { value: "confirmed", label: "Confirmed" },
    ]);
  });

  it("returns all enum options for empty query", () => {
    expect(filterEnumOptions(enumField.options ?? [], " ")).toHaveLength(2);
  });

  it("selects all visible enum values while preserving existing selections", () => {
    expect(selectVisibleEnumInValues(["draft"], ["confirmed"]))
      .toEqual(["draft", "confirmed"]);
  });

  it("provides display value without wildcard wrappers", () => {
    const condition: FilterCondition = {
      field: "name",
      op: "like",
      value: "%AFENDA%",
    };

    expect(getDisplayValue(condition)).toBe("AFENDA");
  });

  it("builds concise summaries for conditions", () => {
    const condition: FilterCondition = {
      field: "status",
      op: "in",
      value: ["draft", "confirmed"],
    };

    expect(buildConditionSummary(condition, [enumField])).toContain("Status");
    expect(buildConditionSummary(condition, [enumField])).toContain("draft, confirmed");
  });

  it("resolves value input kind from field + operator", () => {
    expect(getValueInputKind(booleanField, "eq")).toBe("boolean");
    expect(getValueInputKind(enumField, "in")).toBe("enum-multi");
    expect(getValueInputKind(enumField, "eq")).toBe("enum-single");
    expect(getValueInputKind(numberField, "gte")).toBe("number");
    expect(getValueInputKind(numberField, "is_null")).toBe("none");
  });
});
