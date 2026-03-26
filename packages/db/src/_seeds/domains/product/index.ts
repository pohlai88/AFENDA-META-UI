import { eq, sql } from "drizzle-orm";

import {
  productAttributeValues,
  productAttributes,
  productCategories,
  productPackaging,
  productTemplateAttributeLines,
  productTemplateAttributeValues,
  productTemplates,
  productVariants,
  products,
} from "../../../schema/index.js";
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

export async function seedProductConfiguration(
  tx: Tx,
  seedAuditScope: SeedAuditScope
): Promise<void> {
  // ── Templates ─────────────────────────────────────────────────────────────
  await tx
    .insert(productTemplates)
    .values([
      {
        ...seedAuditScope,
        id: SEED_IDS.productTmplTShirt,
        name: "Classic T-Shirt",
        internalReference: "TSHIRT-CLASSIC",
        categoryId: SEED_IDS.categoryServices, // Apparel (using Services as placeholder)
        type: "consumable",
        tracking: "none",
        invoicePolicy: "ordered",
        canBeSold: true,
        canBePurchased: true,
        listPrice: "29.99",
        standardPrice: "8.00",
        salesDescription: "Classic unisex T-Shirt, available in multiple sizes and colors",
        sequence: 1,
        isActive: true,
      },
      {
        ...seedAuditScope,
        id: SEED_IDS.productTmplLaptopPro,
        name: "Laptop Pro (Configurable)",
        internalReference: "LAPTOP-PRO-CFG",
        categoryId: SEED_IDS.categoryComputers,
        type: "storable",
        tracking: "serial",
        invoicePolicy: "delivered",
        canBeSold: true,
        canBePurchased: true,
        listPrice: "1299.99",
        standardPrice: "850.00",
        salesDescription: "High-performance laptop",
        sequence: 2,
        isActive: true,
      },
    ])
    .execute();
  console.log("✓ Seeded 2 product templates");

  // ── Attributes ────────────────────────────────────────────────────────────
  await tx
    .insert(productAttributes)
    .values([
      {
        ...seedAuditScope,
        id: SEED_IDS.attrSize,
        name: "Size",
        displayType: "radio",
        createVariantPolicy: "always",
        sequence: 1,
        isActive: true,
      },
      {
        ...seedAuditScope,
        id: SEED_IDS.attrColor,
        name: "Color",
        displayType: "color",
        createVariantPolicy: "always",
        sequence: 2,
        isActive: true,
      },
    ])
    .execute();
  console.log("✓ Seeded 2 product attributes");

  // ── Attribute Values ──────────────────────────────────────────────────────
  await tx
    .insert(productAttributeValues)
    .values([
      {
        ...seedAuditScope,
        id: SEED_IDS.attrValSizeS,
        attributeId: SEED_IDS.attrSize,
        name: "S",
        sequence: 1,
        isActive: true,
      },
      {
        ...seedAuditScope,
        id: SEED_IDS.attrValSizeM,
        attributeId: SEED_IDS.attrSize,
        name: "M",
        sequence: 2,
        isActive: true,
      },
      {
        ...seedAuditScope,
        id: SEED_IDS.attrValSizeL,
        attributeId: SEED_IDS.attrSize,
        name: "L",
        sequence: 3,
        isActive: true,
      },
      {
        ...seedAuditScope,
        id: SEED_IDS.attrValColorRed,
        attributeId: SEED_IDS.attrColor,
        name: "Red",
        htmlColor: "#FF0000",
        sequence: 1,
        isActive: true,
      },
      {
        ...seedAuditScope,
        id: SEED_IDS.attrValColorBlue,
        attributeId: SEED_IDS.attrColor,
        name: "Blue",
        htmlColor: "#0000FF",
        sequence: 2,
        isActive: true,
      },
    ])
    .execute();
  console.log("✓ Seeded 5 attribute values (S, M, L, Red, Blue)");

  // ── Template Attribute Lines (T-Shirt) ────────────────────────────────────
  await tx
    .insert(productTemplateAttributeLines)
    .values([
      {
        ...seedAuditScope,
        id: SEED_IDS.tmplAttrLineTshirtSize,
        templateId: SEED_IDS.productTmplTShirt,
        attributeId: SEED_IDS.attrSize,
        sequence: 1,
      },
      {
        ...seedAuditScope,
        id: SEED_IDS.tmplAttrLineTshirtColor,
        templateId: SEED_IDS.productTmplTShirt,
        attributeId: SEED_IDS.attrColor,
        sequence: 2,
      },
    ])
    .execute();
  console.log("✓ Seeded 2 template attribute lines");

  // ── Template Attribute Values (price_extra for color) ─────────────────────
  await tx
    .insert(productTemplateAttributeValues)
    .values([
      {
        ...seedAuditScope,
        id: SEED_IDS.tmplAttrValTshirtS,
        templateAttributeLineId: SEED_IDS.tmplAttrLineTshirtSize,
        attributeValueId: SEED_IDS.attrValSizeS,
        priceExtra: "0.00",
        isActive: true,
      },
      {
        ...seedAuditScope,
        id: SEED_IDS.tmplAttrValTshirtM,
        templateAttributeLineId: SEED_IDS.tmplAttrLineTshirtSize,
        attributeValueId: SEED_IDS.attrValSizeM,
        priceExtra: "0.00",
        isActive: true,
      },
      {
        ...seedAuditScope,
        id: SEED_IDS.tmplAttrValTshirtL,
        templateAttributeLineId: SEED_IDS.tmplAttrLineTshirtSize,
        attributeValueId: SEED_IDS.attrValSizeL,
        priceExtra: "2.00",
        isActive: true,
      },
      {
        ...seedAuditScope,
        id: SEED_IDS.tmplAttrValTshirtRed,
        templateAttributeLineId: SEED_IDS.tmplAttrLineTshirtColor,
        attributeValueId: SEED_IDS.attrValColorRed,
        priceExtra: "0.00",
        isActive: true,
      },
      {
        ...seedAuditScope,
        id: SEED_IDS.tmplAttrValTshirtBlue,
        templateAttributeLineId: SEED_IDS.tmplAttrLineTshirtColor,
        attributeValueId: SEED_IDS.attrValColorBlue,
        priceExtra: "1.00",
        isActive: true,
      },
    ])
    .execute();
  console.log("✓ Seeded 5 template attribute values");

  // ── Product Variants (T-Shirt: 3 sizes × 2 colors = 6 variants) ──────────
  await tx
    .insert(productVariants)
    .values([
      {
        ...seedAuditScope,
        id: SEED_IDS.variantTshirtRedS,
        templateId: SEED_IDS.productTmplTShirt,
        combinationIndices: `${SEED_IDS.attrValColorRed},${SEED_IDS.attrValSizeS}`,
        internalReference: "TSHIRT-RED-S",
        isActive: true,
      },
      {
        ...seedAuditScope,
        id: SEED_IDS.variantTshirtRedM,
        templateId: SEED_IDS.productTmplTShirt,
        combinationIndices: `${SEED_IDS.attrValColorRed},${SEED_IDS.attrValSizeM}`,
        internalReference: "TSHIRT-RED-M",
        isActive: true,
      },
      {
        ...seedAuditScope,
        id: SEED_IDS.variantTshirtRedL,
        templateId: SEED_IDS.productTmplTShirt,
        combinationIndices: `${SEED_IDS.attrValColorRed},${SEED_IDS.attrValSizeL}`,
        internalReference: "TSHIRT-RED-L",
        isActive: true,
      },
      {
        ...seedAuditScope,
        id: SEED_IDS.variantTshirtBlueS,
        templateId: SEED_IDS.productTmplTShirt,
        combinationIndices: `${SEED_IDS.attrValColorBlue},${SEED_IDS.attrValSizeS}`,
        internalReference: "TSHIRT-BLUE-S",
        isActive: true,
      },
      {
        ...seedAuditScope,
        id: SEED_IDS.variantTshirtBlueM,
        templateId: SEED_IDS.productTmplTShirt,
        combinationIndices: `${SEED_IDS.attrValColorBlue},${SEED_IDS.attrValSizeM}`,
        internalReference: "TSHIRT-BLUE-M",
        isActive: true,
      },
      {
        ...seedAuditScope,
        id: SEED_IDS.variantTshirtBlueL,
        templateId: SEED_IDS.productTmplTShirt,
        combinationIndices: `${SEED_IDS.attrValColorBlue},${SEED_IDS.attrValSizeL}`,
        internalReference: "TSHIRT-BLUE-L",
        isActive: true,
      },
    ])
    .execute();
  console.log("✓ Seeded 6 product variants (T-Shirt 3×2 matrix)");

  // ── Product Packaging ─────────────────────────────────────────────────────
  await tx
    .insert(productPackaging)
    .values([
      {
        ...seedAuditScope,
        id: SEED_IDS.packagingTshirtBox,
        variantId: SEED_IDS.variantTshirtRedS,
        name: "Individual Box",
        qty: "1.0000",
        barcode: "PKG-TSHIRT-BOX",
        sequence: 1,
        isActive: true,
      },
      {
        ...seedAuditScope,
        id: SEED_IDS.packagingLaptopPallet,
        variantId: SEED_IDS.variantTshirtBlueL,
        name: "Bulk Box (12 units)",
        qty: "12.0000",
        barcode: "PKG-TSHIRT-BULK12",
        sequence: 2,
        isActive: true,
      },
    ])
    .execute();
  console.log("✓ Seeded 2 product packaging units");
}

export async function validateProductConfigurationInvariants(tx: Tx): Promise<void> {
  const [templateStats] = await tx
    .select({ count: sql<number>`count(*)` })
    .from(productTemplates)
    .where(eq(productTemplates.tenantId, 1));

  if (!templateStats || Number(templateStats.count) < 2) {
    throw new Error(
      `Product configuration invariant: expected ≥2 templates, got ${Number(templateStats?.count ?? 0)}`
    );
  }

  const [variantStats] = await tx
    .select({ count: sql<number>`count(*)` })
    .from(productVariants)
    .where(eq(productVariants.tenantId, 1));

  if (!variantStats || Number(variantStats.count) < 6) {
    throw new Error(
      `Product configuration invariant: expected ≥6 variants, got ${Number(variantStats?.count ?? 0)}`
    );
  }

  const [tshirt] = await tx
    .select({ id: productTemplates.id, listPrice: productTemplates.listPrice })
    .from(productTemplates)
    .where(eq(productTemplates.id, SEED_IDS.productTmplTShirt))
    .limit(1);

  if (!tshirt || Number(tshirt.listPrice) !== 29.99) {
    throw new Error(
      `T-Shirt template invariant mismatch: expected listPrice=29.99, got ${tshirt?.listPrice}`
    );
  }

  console.log("✓ Verified Phase 5 product configuration invariants");
}
