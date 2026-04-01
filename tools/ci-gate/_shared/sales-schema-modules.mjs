import { resolve } from "node:path";

export const SALES_SCHEMA_MODULES = [
  "partner.ts",
  "product.ts",
  "tax.ts",
  "salesOrg.ts",
  "governance.ts",
  "pricing.ts",
  "orders.ts",
  "consignment.ts",
  "subscription.ts",
  "returns.ts",
  "commission.ts",
];

export function resolveSalesSchemaModulePaths(repoRoot) {
  const salesDir = resolve(repoRoot, "packages/db/src/schema/sales");
  return SALES_SCHEMA_MODULES.map((file) => resolve(salesDir, file));
}
