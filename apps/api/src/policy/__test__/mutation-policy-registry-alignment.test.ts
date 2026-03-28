import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { MUTATION_POLICY_REGISTRY } from "@afenda/db";
import { describe, expect, it } from "vitest";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const apiSrcRoot = path.resolve(__dirname, "../..");

const SALES_COMMAND_SERVICE_FILES = [
  "modules/sales/sales-order-command-service.ts",
  "modules/sales/subscription-command-service.ts",
  "modules/sales/return-order-command-service.ts",
  "modules/sales/commission-command-service.ts",
] as const;

function extractRequiredPolicyIds(source: string): string[] {
  const matches = source.matchAll(/require(?:Sales)?MutationPolicyById\(\s*["']([^"']+)["']\s*\)/g);
  return [...matches].map((match) => match[1]);
}

describe("mutation policy registry alignment", () => {
  it("ensures canonical policy IDs used by sales command services exist in shared registry", () => {
    const availablePolicyIds = new Set(MUTATION_POLICY_REGISTRY.map((policy) => policy.id));
    const missing: Array<{ file: string; policyId: string }> = [];

    for (const relativeFile of SALES_COMMAND_SERVICE_FILES) {
      const filePath = path.join(apiSrcRoot, relativeFile);
      const content = readFileSync(filePath, "utf8");
      const requiredPolicyIds = extractRequiredPolicyIds(content);

      for (const policyId of requiredPolicyIds) {
        if (!availablePolicyIds.has(policyId)) {
          missing.push({ file: relativeFile, policyId });
        }
      }
    }

    expect(missing).toEqual([]);
  });
});
