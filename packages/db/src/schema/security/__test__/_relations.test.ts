import { describe, expect, it } from "vitest";

import {
  expandSecurityRelationsForDiagram,
  securityRelations,
} from "../_relations.js";

describe("securityRelations", () => {
  it("has one catalog entry per Drizzle security→security FK leg (drift-checked)", () => {
    expect(Object.keys(securityRelations)).toHaveLength(17);
  });
});

describe("expandSecurityRelationsForDiagram", () => {
  it("doubles non–self-reference many-to-one edges as parent→child one-to-many views", () => {
    const expanded = expandSecurityRelationsForDiagram();
    const forward = Object.values(securityRelations).length;
    const manyToOne = Object.values(securityRelations).filter((r) => r.kind === "many-to-one").length;
    const selfRef = Object.values(securityRelations).filter((r) => r.kind === "self-reference").length;
    expect(expanded.length).toBe(forward + manyToOne + selfRef);
  });

  it("includes an inverse one-to-many for userRolesToUsers", () => {
    const expanded = expandSecurityRelationsForDiagram();
    const inv = expanded.find(
      (r) =>
        r.kind === "one-to-many" &&
        r.from === "users" &&
        r.to === "user_roles" &&
        r.fromField === "userId" &&
        r.toField === "userId"
    );
    expect(inv).toBeDefined();
  });
});
