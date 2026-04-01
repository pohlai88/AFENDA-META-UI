/**
 * Historical one-shot: originally split `tables.ts` into bounded-context modules.
 * The monolith file has been removed; do not run unless you restore it for a re-split.
 * Current source of truth: `packages/db/src/schema/sales/{partner,product,...}.ts`.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const salesDir = path.resolve(__dirname, "../src/schema/sales");
const tablesPath = path.join(salesDir, "tables.ts");
const lines = fs.readFileSync(tablesPath, "utf8").split(/\r?\n/);

/** Inclusive 1-based line ranges */
function sliceRanges(ranges) {
  return ranges.map(([a, b]) => lines.slice(a - 1, b).join("\n")).join("\n\n");
}

const HEADER_LINES = 162;
const header = lines.slice(0, HEADER_LINES).join("\n");

/** Sibling imports required because FK closures reference tables defined in other modules */
const cousinImports = {
  pricing: `import { productCategories, products } from "./product.js";`,
  orders: `import { partnerAddresses, partners } from "./partner.js";
import { productTemplates, products } from "./product.js";
import { pricelists } from "./pricing.js";
import { taxGroups, taxRates } from "./tax.js";`,
  consignment: `import { partners } from "./partner.js";
import { products } from "./product.js";
import { paymentTerms } from "./pricing.js";`,
  subscription: `import { partners } from "./partner.js";
import { products } from "./product.js";
import { paymentTerms, pricelists } from "./pricing.js";`,
  returns: `import { partners } from "./partner.js";
import { products } from "./product.js";
import { salesOrderLines, salesOrders } from "./orders.js";`,
  commission: `import { salesOrders } from "./orders.js";`,
};

const domains = {
  partner: {
    tables: [[164, 425]],
    zod: [
      [3512, 3516],
      [3576, 3596],
      [3921, 3967],
      [4433, 4437],
      [4488, 4497],
    ],
    extra: "",
  },
  product: {
    tables: [[427, 825]],
    zod: [
      [3517, 3529],
      [3969, 4095],
      [4438, 4450],
      [4498, 4515],
    ],
    extra: "",
  },
  tax: {
    tables: [[1432, 1733]],
    zod: [
      [3536, 3541],
      [4266, 4334],
      [4457, 4462],
      [4528, 4539],
    ],
    extra: "",
  },
  salesOrg: {
    tables: [[2678, 2891]],
    zod: [
      [3560, 3563],
      [3715, 3767],
      [4480, 4483],
      [4570, 4577],
    ],
    extra: "",
  },
  governance: {
    tables: [
      [3050, 3212],
      [3283, 3362],
      [3423, 3510],
    ],
    zod: [
      [3567, 3574],
      [3810, 3858],
      [3878, 3898],
    ],
    extra: `
export type DocumentStatusHistory = typeof documentStatusHistory.$inferSelect;
export type NewDocumentStatusHistory = typeof documentStatusHistory.$inferInsert;
export type DocumentApproval = typeof documentApprovals.$inferSelect;
export type NewDocumentApproval = typeof documentApprovals.$inferInsert;
export type SalesDocumentAttachment = typeof salesDocumentAttachments.$inferSelect;
export type NewSalesDocumentAttachment = typeof salesDocumentAttachments.$inferInsert;
export type AccountingPosting = typeof accountingPostings.$inferSelect;
export type NewAccountingPosting = typeof accountingPostings.$inferInsert;
export type DomainInvariantLog = typeof domainInvariantLogs.$inferSelect;
export type NewDomainInvariantLog = typeof domainInvariantLogs.$inferInsert;
export type DomainEventLog = typeof domainEventLogs.$inferSelect;
export type NewDomainEventLog = typeof domainEventLogs.$inferInsert;
`.trim(),
  },
  pricing: {
    tables: [
      [1187, 1430],
      [3214, 3281],
      [3364, 3421],
    ],
    zod: [
      [3532, 3535],
      [3570, 3570],
      [3572, 3572],
      [4177, 4264],
      [3860, 3919],
      [4453, 4456],
    ],
    extra: `
export type LineItemDiscount = typeof lineItemDiscounts.$inferSelect;
export type NewLineItemDiscount = typeof lineItemDiscounts.$inferInsert;
export type RoundingPolicy = typeof roundingPolicies.$inferSelect;
export type NewRoundingPolicy = typeof roundingPolicies.$inferInsert;
`.trim(),
  },
  orders: {
    tables: [
      [826, 1185],
      [1735, 1960],
    ],
    zod: [
      [3530, 3531],
      [3542, 3545],
      [4097, 4175],
      [4336, 4370],
      [4451, 4452],
      [4463, 4465],
      [4516, 4545],
    ],
    extra: `
export type SaleOrderOptionLine = typeof saleOrderOptionLines.$inferSelect;
export type NewSaleOrderOptionLine = typeof saleOrderOptionLines.$inferInsert;
`.trim(),
  },
  consignment: {
    tables: [[1962, 2218]],
    zod: [
      [3546, 3551],
      [4372, 4431],
      [4466, 4471],
      [4546, 4553],
    ],
    extra: "",
  },
  returns: {
    tables: [[2220, 2385]],
    zod: [
      [3552, 3554],
      [3597, 3637],
      [4472, 4474],
      [4554, 4559],
    ],
    extra: "",
  },
  subscription: {
    tables: [[2387, 2676]],
    zod: [
      [3555, 3559],
      [3639, 3713],
      [4475, 4479],
      [4560, 4569],
    ],
    extra: "",
  },
  commission: {
    tables: [[2893, 3048]],
    zod: [
      [3564, 3566],
      [3769, 3808],
      [4484, 4486],
      [4578, 4583],
    ],
    extra: "",
  },
};

for (const [name, { tables, zod, extra }] of Object.entries(domains)) {
  const cousin = cousinImports[name] ? `${cousinImports[name]}\n\n` : "";
  const parts = [
    header,
    "",
    cousin,
    sliceRanges(tables),
    "",
    sliceRanges(zod),
  ];
  if (extra) {
    parts.push("", extra);
  }
  parts.push("");
  fs.writeFileSync(path.join(salesDir, `${name}.ts`), parts.join("\n"));
}

console.log("Wrote domain files:", Object.keys(domains).join(", "));
