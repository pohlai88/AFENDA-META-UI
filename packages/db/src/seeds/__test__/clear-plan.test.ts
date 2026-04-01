import { describe, expect, it } from "vitest";

import { TRUNCATE_MANAGED_SCHEMAS } from "../clear-hr-schema.js";
import {
  fqnsMissingFromClearList,
  getSeedClearTableFqns,
  validateClearOrderAgainstFkConstraints,
} from "../clear-plan.js";

describe("clear-plan", () => {
  it("has no duplicate FQNs in delete order", () => {
    const fqns = getSeedClearTableFqns();
    const set = new Set(fqns);
    expect(set.size).toBe(fqns.length);
  });

  it("flags FK violation when child deletes after parent", () => {
    const clear = ["public.a", "public.b"];
    const constraints = [
      {
        constraintName: "fk_b_a",
        childTableSchema: "public",
        childTableName: "b",
        childColumnName: "a_id",
        parentTableSchema: "public",
        parentTableName: "a",
        parentColumnName: "id",
        deleteRule: "RESTRICT" as const,
        updateRule: "CASCADE" as const,
      },
    ];
    const r = validateClearOrderAgainstFkConstraints(clear, constraints);
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.violations.length).toBeGreaterThan(0);
    }
  });

  it("fqnsMissingFromClearList finds gaps", () => {
    const clear = ["sales.a", "sales.b"];
    expect(fqnsMissingFromClearList(["sales.a", "sales.b", "sales.c"], clear)).toEqual(["sales.c"]);
    expect(fqnsMissingFromClearList(["sales.A"], ["sales.a"])).toEqual([]);
  });

  it("truncate-managed schemas are excluded from clear-manifest coverage", () => {
    const tenantScoped = ["sales.orders", "hr.employees", "hr.departments", "sales.teams"];
    const truncateSchemas = new Set<string>(TRUNCATE_MANAGED_SCHEMAS);
    const mustManifest = tenantScoped.filter((fqn) => !truncateSchemas.has(fqn.split(".")[0] ?? ""));
    expect(mustManifest).toEqual(["sales.orders", "sales.teams"]);
  });

  it("accepts valid child-before-parent order", () => {
    const clear = ["public.b", "public.a"];
    const constraints = [
      {
        constraintName: "fk_b_a",
        childTableSchema: "public",
        childTableName: "b",
        childColumnName: "a_id",
        parentTableSchema: "public",
        parentTableName: "a",
        parentColumnName: "id",
        deleteRule: "RESTRICT" as const,
        updateRule: "CASCADE" as const,
      },
    ];
    const r = validateClearOrderAgainstFkConstraints(clear, constraints);
    expect(r.ok).toBe(true);
  });
});
