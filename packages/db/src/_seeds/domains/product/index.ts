import { productCategories, products } from "../../../schema/index.js";
import { SEED_IDS } from "../../seed-ids.js";
import { type SeedAuditScope, type Tx } from "../../seed-types.js";

export async function seedProductCategories(
  tx: Tx,
  seedAuditScope: SeedAuditScope
): Promise<void> {
  await tx
    .insert(productCategories)
    .values([
      { ...seedAuditScope, id: SEED_IDS.categoryHardware, name: "Hardware", parentId: null },
      { ...seedAuditScope, id: SEED_IDS.categoryComputers, name: "Computers", parentId: SEED_IDS.categoryHardware },
      { ...seedAuditScope, id: SEED_IDS.categoryPeripherals, name: "Peripherals", parentId: SEED_IDS.categoryHardware },
      { ...seedAuditScope, id: SEED_IDS.categorySoftware, name: "Software", parentId: null },
      { ...seedAuditScope, id: SEED_IDS.categoryServices, name: "Services", parentId: null },
    ])
    .execute();
  console.log("✓ Seeded 5 product categories (with hierarchy)");
}

export async function seedProducts(tx: Tx, seedAuditScope: SeedAuditScope): Promise<void> {
  await tx
    .insert(products)
    .values([
      {
        ...seedAuditScope,
        id: SEED_IDS.productLaptop,
        name: "Professional Laptop Pro",
        sku: "LAPTOP-PRO-2024",
        categoryId: SEED_IDS.categoryComputers,
        unitPrice: "1299.99",
        description: "High-performance laptop for professionals",
        isActive: true,
      },
      {
        ...seedAuditScope,
        id: SEED_IDS.productDesktop,
        name: "Workstation Desktop",
        sku: "DESKTOP-WS-2024",
        categoryId: SEED_IDS.categoryComputers,
        unitPrice: "1899.99",
        description: "Powerful desktop workstation",
        isActive: true,
      },
      {
        ...seedAuditScope,
        id: SEED_IDS.productMonitor,
        name: '4K Monitor 27"',
        sku: "MONITOR-4K-27",
        categoryId: SEED_IDS.categoryPeripherals,
        unitPrice: "599.99",
        description: "High-resolution 4K display",
        isActive: true,
      },
      {
        ...seedAuditScope,
        id: SEED_IDS.productMouse,
        name: "Wireless Mouse",
        sku: "MOUSE-WIRELESS",
        categoryId: SEED_IDS.categoryPeripherals,
        unitPrice: "29.99",
        description: "Ergonomic wireless mouse",
        isActive: true,
      },
      {
        ...seedAuditScope,
        id: SEED_IDS.productKeyboard,
        name: "Mechanical Keyboard",
        sku: "KEYBOARD-MECH",
        categoryId: SEED_IDS.categoryPeripherals,
        unitPrice: "149.99",
        description: "Professional mechanical keyboard",
        isActive: true,
      },
      {
        ...seedAuditScope,
        id: SEED_IDS.productLicense,
        name: "Enterprise Software License",
        sku: "SOFTWARE-ENTERPRISE",
        categoryId: SEED_IDS.categorySoftware,
        unitPrice: "4999.99",
        description: "Annual enterprise software license",
        isActive: true,
      },
    ])
    .execute();
  console.log("✓ Seeded 6 products");
}
