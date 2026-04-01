import path from "node:path";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";

import { describe, expect, it } from "vitest";

import { salesRelations } from "../_relations.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "../../../../../../");
const salesDir = path.join(repoRoot, "packages/db/src/schema/sales");

const salesDomainFiles: readonly string[] = [
  "partner.ts",
  "documentTruthLinks.ts",
  "truthBindings.ts",
  "product.ts",
  "tax.ts",
  "salesOrg.ts",
  "governance.ts",
  "pricing.ts",
  "orders.ts",
  "pricingDecisions.ts",
  "pricingTruth.ts",
  "accountingDecisions.ts",
  "glAccounts.ts",
  "journal.ts",
  "consignment.ts",
  "subscription.ts",
  "returns.ts",
  "commission.ts",
];

/** `subscription.ts` — global status catalog + append-only audit omit full tenant policy packs. */
const SALES_RLS_TENANT_PACK_SHORTAGE: Partial<Record<string, number>> = {
  "packages/db/src/schema/sales/subscription.ts": 2,
};

/**
 * `export const … = […] as const` tuples in `_enums.ts` that have `z.enum(tuple)` but no
 * `salesSchema.enum` (status codes live in `sales.subscription_statuses`, not a Postgres enum).
 */
const SALES_ENUM_TUPLE_WITHOUT_PG_ENUM = new Set(["subscriptionStatusCodes"]);

describe("sales relations contract", () => {
  it("has zero sales RELATIONS_DRIFT findings in schema-quality gate", () => {
    const out = execFileSync(
      "node",
      [
        "tools/ci-gate/drizzle-schema-quality/index.mjs",
        "--format=json",
        "--mode=full",
        "--glob=packages/db/src/schema/sales/**/*.ts",
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
    expect(driftFindings, "sales schema must remain relations-drift clean").toEqual([]);
  });
});

describe("sales rls contract", () => {
  it("applies tenantIsolationPolicies + serviceBypassPolicy once per sales table", () => {
    const tableRe = /salesSchema\.table\(/g;
    const tenantPolicyRe = /tenantIsolationPolicies\(\s*"([^"]+)"\s*\)/g;
    const bypassRe = /serviceBypassPolicy\(\s*"([^"]+)"\s*\)/g;

    for (const fileName of salesDomainFiles) {
      const abs = path.join(salesDir, fileName);
      const content = readFileSync(abs, "utf8");
      const fileRel = path.relative(repoRoot, abs).split(path.sep).join("/");
      const tableCount = [...content.matchAll(tableRe)].length;
      const tenantPolicyCount = [...content.matchAll(tenantPolicyRe)].length;
      const bypassCount = [...content.matchAll(bypassRe)].length;

      const tenantShortage = SALES_RLS_TENANT_PACK_SHORTAGE[fileRel] ?? 0;
      expect(
        {
          file: fileRel,
          tableCount,
          tenantPolicyCount,
          bypassCount,
        },
        `${fileRel} must have serviceBypass per table and tenantIsolationPolicies for tenant-scoped tables`
      ).toEqual({
        file: fileRel,
        tableCount,
        tenantPolicyCount: tableCount - tenantShortage,
        bypassCount: tableCount,
      });
    }
  });
});

describe("sales enums contract", () => {
  it("keeps tuple, pgEnum, Zod, and type layers synchronized", () => {
    const enumsFile = path.join(salesDir, "_enums.ts");
    const content = readFileSync(enumsFile, "utf8");

    const tupleNames = new Set(
      [...content.matchAll(/export const (\w+) = \[[\s\S]*?\] as const;/g)].map((m) => m[1])
    );
    const enumTupleRefs = [
      ...content.matchAll(/salesSchema\.enum\("([^"]+)",\s*\[\s*\.\.\.(\w+)\s*,?\s*\]\s*\)/g),
    ].map((m) => ({ enumName: m[1], tuple: m[2] }));
    const schemaTupleRefs = [...content.matchAll(/export const (\w+)Schema = z\.enum\((\w+)\);/g)].map(
      (m) => ({ schema: m[1], tuple: m[2] })
    );
    const typeSchemaRefs = [...content.matchAll(/export type (\w+) = z\.infer<typeof (\w+)Schema>;/g)].map(
      (m) => ({ typeName: m[1], schema: m[2] })
    );

    expect(tupleNames.size, "sales enum tuple export list must not be empty").toBeGreaterThan(0);
    expect(enumTupleRefs.length, "every non-lookup tuple should have a pgEnum binding").toBe(
      tupleNames.size - SALES_ENUM_TUPLE_WITHOUT_PG_ENUM.size
    );
    expect(
      schemaTupleRefs.length,
      "every tuple should have a Zod schema binding"
    ).toBe(tupleNames.size);
    expect(typeSchemaRefs.length, "every Zod schema should have an inferred type export").toBe(
      schemaTupleRefs.length
    );

    for (const ref of enumTupleRefs) {
      expect(tupleNames.has(ref.tuple), `pgEnum "${ref.enumName}" uses unknown tuple "${ref.tuple}"`).toBe(
        true
      );
    }

    for (const ref of schemaTupleRefs) {
      expect(tupleNames.has(ref.tuple), `schema "${ref.schema}" uses unknown tuple "${ref.tuple}"`).toBe(
        true
      );
    }

    const schemaNames = new Set(schemaTupleRefs.map((r) => r.schema));
    for (const ref of typeSchemaRefs) {
      expect(schemaNames.has(ref.schema), `type "${ref.typeName}" points to unknown schema "${ref.schema}"`).toBe(
        true
      );
    }
  });
});

describe("sales zod shared contract", () => {
  it("keeps branded ID schema/type exports in parity", () => {
    const zodSharedFile = path.join(salesDir, "_zodShared.ts");
    const content = readFileSync(zodSharedFile, "utf8");

    const idSchemaNames = [...content.matchAll(/export const (\w+Id)Schema = z(?:\s*\.\s*uuid\(\)\s*\.\s*brand<"[^"]+">\(\)|\.uuid\(\)\.brand<"[^"]+">\(\));/g)].map((m) => m[1]);
    const idTypeNames = [...content.matchAll(/export type (\w+Id) = z\.infer<typeof \w+IdSchema>;/g)].map(
      (m) => m[1]
    );

    const schemaSet = new Set(idSchemaNames);
    const typeSet = new Set(idTypeNames);

    expect(schemaSet.size, "sales branded ID schema list must not be empty").toBeGreaterThan(0);
    expect(typeSet.size, "sales branded ID type count should match schema count").toBe(schemaSet.size);

    for (const id of schemaSet) {
      expect(typeSet.has(id), `missing type export for ${id}Schema`).toBe(true);
    }
  });
});

describe("sales relation topology contract", () => {
  it("references only declared sales tables (or approved cross-schema tables)", () => {
    const tableNames = new Set<string>();
    const tableDeclRe = /salesSchema\.table\(\s*"([^"]+)"/g;
    for (const fileName of salesDomainFiles) {
      const content = readFileSync(path.join(salesDir, fileName), "utf8");
      for (const match of content.matchAll(tableDeclRe)) {
        tableNames.add(match[1]);
      }
    }

    const approvedExternalTables = new Set([
      "accounting_postings",
      "currencies",
      "users",
      "units_of_measure",
    ]);
    const allowedTables = new Set([...tableNames, ...approvedExternalTables]);

    for (const [name, rel] of Object.entries(salesRelations)) {
      expect(allowedTables.has(rel.from), `relation "${name}" references unknown source table "${rel.from}"`).toBe(
        true
      );
      expect(allowedTables.has(rel.to), `relation "${name}" references unknown target table "${rel.to}"`).toBe(
        true
      );
    }
  });
});

describe("sales ddl convention contract", () => {
  it("uses `_schema.ts` as single schema primitive and avoids duplicate pgSchema declarations", () => {
    const schemaFile = path.join(salesDir, "_schema.ts");
    const schemaContent = readFileSync(schemaFile, "utf8");

    expect(
      [...schemaContent.matchAll(/pgSchema\("sales"\)/g)].length,
      "_schema.ts must define sales pgSchema exactly once"
    ).toBe(1);
    expect(
      schemaContent.includes('export const salesSchema = pgSchema("sales");'),
      "_schema.ts must export salesSchema"
    ).toBe(true);

    for (const fileName of [...salesDomainFiles, "_enums.ts", "_zodShared.ts", "_relations.ts", "index.ts"]) {
      const content = readFileSync(path.join(salesDir, fileName), "utf8");
      expect(
        [...content.matchAll(/pgSchema\(/g)].length,
        `${fileName} must not create its own schema primitive`
      ).toBe(0);
    }
  });

  it("defines explicit FK actions for every sales foreign key", () => {
    for (const fileName of salesDomainFiles) {
      const fileRel = path.join("packages/db/src/schema/sales", fileName).split(path.sep).join("/");
      const content = readFileSync(path.join(salesDir, fileName), "utf8");
      const foreignKeyCount = [...content.matchAll(/foreignKey\(\{/g)].length;
      const onDeleteCount = [...content.matchAll(/\.onDelete\(/g)].length;
      const onUpdateCount = [...content.matchAll(/\.onUpdate\(/g)].length;

      expect(
        { fileRel, foreignKeyCount, onDeleteCount, onUpdateCount },
        `${fileRel} must define onDelete/onUpdate for each foreign key`
      ).toEqual({
        fileRel,
        foreignKeyCount,
        onDeleteCount: foreignKeyCount,
        onUpdateCount: foreignKeyCount,
      });
    }
  });

  it("keeps enum declarations centralized in `_enums.ts` only", () => {
    const nonEnumFiles = [
      ...salesDomainFiles,
      "_schema.ts",
      "_zodShared.ts",
      "_relations.ts",
      "index.ts",
    ];
    for (const fileName of nonEnumFiles) {
      const content = readFileSync(path.join(salesDir, fileName), "utf8");
      expect(
        [...content.matchAll(/salesSchema\.enum\(/g)].length,
        `${fileName} must not declare enums`
      ).toBe(0);
    }
  });
});
