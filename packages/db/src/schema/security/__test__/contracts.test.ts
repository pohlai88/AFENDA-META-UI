import path from "node:path";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";

import { describe, expect, it } from "vitest";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "../../../../../../");

const securityDir = path.join(repoRoot, "packages/db/src/schema/security");
const dataFiles: readonly string[] = [
  path.join(securityDir, "users.ts"),
  path.join(securityDir, "roles.ts"),
  path.join(securityDir, "permissions.ts"),
  path.join(securityDir, "userRoles.ts"),
];

describe("security relations contract", () => {
  it("has zero security RELATIONS_DRIFT findings in schema-quality gate", () => {
    const out = execFileSync(
      "node",
      [
        "tools/ci-gate/drizzle-schema-quality/index.mjs",
        "--format=json",
        "--mode=full",
        "--glob=packages/db/src/schema/security/**/*.ts",
      ],
      {
        cwd: repoRoot,
        encoding: "utf8",
      }
    );
    const parsed = JSON.parse(out) as {
      findings: Array<{ ruleId: string; file: string }>;
    };
    const driftFindings = parsed.findings.filter((f) => f.ruleId === "RELATIONS_DRIFT");
    expect(driftFindings, "security schema must remain relations-drift clean").toEqual([]);
  });
});

describe("security rls contract", () => {
  it("applies tenantIsolationPolicies + serviceBypassPolicy once per security table", () => {
    const tableRe = /securitySchema\.table\(/g;
    const tenantPolicyRe = /tenantIsolationPolicies\(\s*"([^"]+)"\s*,\s*securityTenantSqlColumn\s*\)/g;
    const bypassRe = /serviceBypassPolicy\(\s*"([^"]+)"\s*\)/g;

    for (const abs of dataFiles) {
      const content = readFileSync(abs, "utf8");
      const fileRel = path.relative(repoRoot, abs).split(path.sep).join("/");
      const tableCount = [...content.matchAll(tableRe)].length;
      const tenantPolicyCount = [...content.matchAll(tenantPolicyRe)].length;
      const bypassCount = [...content.matchAll(bypassRe)].length;

      expect(
        {
          file: fileRel,
          tableCount,
          tenantPolicyCount,
          bypassCount,
        },
        `${fileRel} must have one tenant policy + bypass policy per table`
      ).toEqual({
        file: fileRel,
        tableCount,
        tenantPolicyCount: tableCount,
        bypassCount: tableCount,
      });
    }
  });
});
