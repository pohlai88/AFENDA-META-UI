/**
 * Test Factories — Derived from Seed Graph
 *
 * Pattern: All test data is derived from the canonical SEED_IDS pool.
 * Tests extend the seed reality rather than inventing parallel fake data.
 *
 * Principles:
 *   - Single truth graph: test objects reference the same UUIDs as the seed
 *   - Composable: factory methods accept partial overrides for test-specific variation
 *   - Referentially safe: FK relationships are always valid within the seed world
 *
 * Usage in tests:
 *   import { SeedFactory } from "../_seeds/factories.js";
 *
 *   const partner = SeedFactory.partner.accentCorp();
 *   const order = SeedFactory.salesOrder.one({ status: "draft" });
 *   const line = SeedFactory.orderLine.monitorLine({ discount: "5.00" });
 */

import { SEED_IDS } from "./index.js";
import { calcLineSubtotal, calcOrderTotals, money } from "./money.js";

// ────────────────────────────────────────────────────────────────────────────
// Types (mirrors DB schema shapes for test composition)
// ────────────────────────────────────────────────────────────────────────────

type PartnerType = "customer" | "vendor" | "both";
type OrderStatus = "draft" | "confirmed" | "shipped" | "cancelled";

export interface PartnerShape {
  id: string;
  name: string;
  email: string;
  phone: string;
  type: PartnerType;
  isActive: boolean;
}

export interface CategoryShape {
  id: string;
  name: string;
  parentId: string | null;
}

export interface ProductShape {
  id: string;
  name: string;
  sku: string;
  categoryId: string;
  unitPrice: string;
  description: string;
  isActive: boolean;
}

export interface SalesOrderShape {
  id: string;
  name: string;
  partnerId: string;
  status: OrderStatus;
  orderDate: Date;
  deliveryDate: Date | null;
  notes: string;
  amountUntaxed: string;
  amountTax: string;
  amountTotal: string;
}

export interface OrderLineShape {
  id: string;
  orderId: string;
  productId: string;
  description: string;
  quantity: string;
  priceUnit: string;
  discount: string;
  subtotal: string;
  sequence: number;
}

// Prevent overriding structural truth keys.
type SafeOverride<T, K extends keyof T> = Partial<Omit<T, K>>;

export type PartnerOverride = SafeOverride<PartnerShape, "id">;
export type CategoryOverride = SafeOverride<CategoryShape, "id">;
export type ProductOverride = SafeOverride<ProductShape, "id" | "categoryId">;
export type SalesOrderOverride = SafeOverride<SalesOrderShape, "id" | "partnerId">;
export type LineOverride = SafeOverride<OrderLineShape, "id" | "orderId" | "productId">;

const LINE_SUBTOTALS = {
  lineOne: calcLineSubtotal(2, 599.99, 10.0),
  lineTwo: calcLineSubtotal(2, 29.99, 0),
  lineThree: calcLineSubtotal(1, 149.99, 0),
  lineFour: calcLineSubtotal(1, 1299.99, 0),
  lineFive: calcLineSubtotal(2, 1899.99, 50.0),
  lineSix: calcLineSubtotal(1, 4999.99, 0),
} as const;

const ORDER_TOTALS = {
  orderOne: calcOrderTotals([LINE_SUBTOTALS.lineOne, LINE_SUBTOTALS.lineTwo, LINE_SUBTOTALS.lineThree]),
  orderTwo: calcOrderTotals([LINE_SUBTOTALS.lineFour]),
  orderThree: calcOrderTotals([LINE_SUBTOTALS.lineFive, LINE_SUBTOTALS.lineSix]),
} as const;

// ────────────────────────────────────────────────────────────────────────────
// Factory: Partners
// ────────────────────────────────────────────────────────────────────────────

const partnerFactory = {
  accentCorp(overrides?: PartnerOverride): PartnerShape {
    return {
      id: SEED_IDS.partnerAccentCorp,
      name: "Accent Corporation",
      email: "contact@accent-corp.com",
      phone: "+1-555-0100",
      type: "customer",
      isActive: true,
      ...overrides,
    };
  },

  betaTech(overrides?: PartnerOverride): PartnerShape {
    return {
      id: SEED_IDS.partnerBetaTech,
      name: "Beta Tech Solutions",
      email: "sales@betatech.io",
      phone: "+1-555-0200",
      type: "vendor",
      isActive: true,
      ...overrides,
    };
  },

  gammaServices(overrides?: PartnerOverride): PartnerShape {
    return {
      id: SEED_IDS.partnerGammaServices,
      name: "Gamma Services Ltd",
      email: "info@gamma-services.co.uk",
      phone: "+44-20-7946-0958",
      type: "both",
      isActive: true,
      ...overrides,
    };
  },

  deltaInc(overrides?: PartnerOverride): PartnerShape {
    return {
      id: SEED_IDS.partnerDeltaInc,
      name: "Delta Incorporated",
      email: "team@delta-inc.us",
      phone: "+1-555-0400",
      type: "customer",
      isActive: true,
      ...overrides,
    };
  },

  /** Returns all seed partners */
  all(): PartnerShape[] {
    return [
      partnerFactory.accentCorp(),
      partnerFactory.betaTech(),
      partnerFactory.gammaServices(),
      partnerFactory.deltaInc(),
    ];
  },
};

// ────────────────────────────────────────────────────────────────────────────
// Factory: Product Categories
// ────────────────────────────────────────────────────────────────────────────

const categoryFactory = {
  hardware(overrides?: CategoryOverride): CategoryShape {
    return { id: SEED_IDS.categoryHardware, name: "Hardware", parentId: null, ...overrides };
  },

  computers(overrides?: CategoryOverride): CategoryShape {
    return {
      id: SEED_IDS.categoryComputers,
      name: "Computers",
      parentId: SEED_IDS.categoryHardware,
      ...overrides,
    };
  },

  peripherals(overrides?: CategoryOverride): CategoryShape {
    return {
      id: SEED_IDS.categoryPeripherals,
      name: "Peripherals",
      parentId: SEED_IDS.categoryHardware,
      ...overrides,
    };
  },

  software(overrides?: CategoryOverride): CategoryShape {
    return { id: SEED_IDS.categorySoftware, name: "Software", parentId: null, ...overrides };
  },

  services(overrides?: CategoryOverride): CategoryShape {
    return { id: SEED_IDS.categoryServices, name: "Services", parentId: null, ...overrides };
  },

  all(): CategoryShape[] {
    return [
      categoryFactory.hardware(),
      categoryFactory.computers(),
      categoryFactory.peripherals(),
      categoryFactory.software(),
      categoryFactory.services(),
    ];
  },
};

// ────────────────────────────────────────────────────────────────────────────
// Factory: Products
// ────────────────────────────────────────────────────────────────────────────

const productFactory = {
  laptop(overrides?: ProductOverride): ProductShape {
    return {
      id: SEED_IDS.productLaptop,
      name: "Professional Laptop Pro",
      sku: "LAPTOP-PRO-2024",
      categoryId: SEED_IDS.categoryComputers,
      unitPrice: "1299.99",
      description: "High-performance laptop for professionals",
      isActive: true,
      ...overrides,
    };
  },

  desktop(overrides?: ProductOverride): ProductShape {
    return {
      id: SEED_IDS.productDesktop,
      name: "Workstation Desktop",
      sku: "DESKTOP-WS-2024",
      categoryId: SEED_IDS.categoryComputers,
      unitPrice: "1899.99",
      description: "Powerful desktop workstation",
      isActive: true,
      ...overrides,
    };
  },

  monitor(overrides?: ProductOverride): ProductShape {
    return {
      id: SEED_IDS.productMonitor,
      name: '4K Monitor 27"',
      sku: "MONITOR-4K-27",
      categoryId: SEED_IDS.categoryPeripherals,
      unitPrice: "599.99",
      description: "High-resolution 4K display",
      isActive: true,
      ...overrides,
    };
  },

  mouse(overrides?: ProductOverride): ProductShape {
    return {
      id: SEED_IDS.productMouse,
      name: "Wireless Mouse",
      sku: "MOUSE-WIRELESS",
      categoryId: SEED_IDS.categoryPeripherals,
      unitPrice: "29.99",
      description: "Ergonomic wireless mouse",
      isActive: true,
      ...overrides,
    };
  },

  keyboard(overrides?: ProductOverride): ProductShape {
    return {
      id: SEED_IDS.productKeyboard,
      name: "Mechanical Keyboard",
      sku: "KEYBOARD-MECH",
      categoryId: SEED_IDS.categoryPeripherals,
      unitPrice: "149.99",
      description: "Professional mechanical keyboard",
      isActive: true,
      ...overrides,
    };
  },

  license(overrides?: ProductOverride): ProductShape {
    return {
      id: SEED_IDS.productLicense,
      name: "Enterprise Software License",
      sku: "SOFTWARE-ENTERPRISE",
      categoryId: SEED_IDS.categorySoftware,
      unitPrice: "4999.99",
      description: "Annual enterprise software license",
      isActive: true,
      ...overrides,
    };
  },

  all(): ProductShape[] {
    return [
      productFactory.laptop(),
      productFactory.desktop(),
      productFactory.monitor(),
      productFactory.mouse(),
      productFactory.keyboard(),
      productFactory.license(),
    ];
  },
};

// ────────────────────────────────────────────────────────────────────────────
// Factory: Sales Orders
// ────────────────────────────────────────────────────────────────────────────

const salesOrderFactory = {
  /** SO-2024-001 — confirmed order for Accent Corp */
  one(overrides?: SalesOrderOverride): SalesOrderShape {
    return {
      id: SEED_IDS.orderOne,
      name: "SO-2024-001",
      partnerId: SEED_IDS.partnerAccentCorp,
      status: "confirmed",
      orderDate: new Date("2024-01-15T10:00:00Z"),
      deliveryDate: new Date("2024-01-20T00:00:00Z"),
      notes: "Urgent delivery requested",
      amountUntaxed: ORDER_TOTALS.orderOne.amountUntaxed,
      amountTax: ORDER_TOTALS.orderOne.amountTax,
      amountTotal: ORDER_TOTALS.orderOne.amountTotal,
      ...overrides,
    };
  },

  /** SO-2024-002 — draft order for Gamma Services */
  two(overrides?: SalesOrderOverride): SalesOrderShape {
    return {
      id: SEED_IDS.orderTwo,
      name: "SO-2024-002",
      partnerId: SEED_IDS.partnerGammaServices,
      status: "draft",
      orderDate: new Date("2024-02-01T14:30:00Z"),
      deliveryDate: null,
      notes: "Pending approval from stakeholders",
      amountUntaxed: ORDER_TOTALS.orderTwo.amountUntaxed,
      amountTax: ORDER_TOTALS.orderTwo.amountTax,
      amountTotal: ORDER_TOTALS.orderTwo.amountTotal,
      ...overrides,
    };
  },

  /** SO-2024-003 — shipped order for Delta Inc */
  three(overrides?: SalesOrderOverride): SalesOrderShape {
    return {
      id: SEED_IDS.orderThree,
      name: "SO-2024-003",
      partnerId: SEED_IDS.partnerDeltaInc,
      status: "shipped",
      orderDate: new Date("2024-01-05T09:00:00Z"),
      deliveryDate: new Date("2024-01-12T00:00:00Z"),
      notes: "Shipped via standard delivery",
      amountUntaxed: ORDER_TOTALS.orderThree.amountUntaxed,
      amountTax: ORDER_TOTALS.orderThree.amountTax,
      amountTotal: ORDER_TOTALS.orderThree.amountTotal,
      ...overrides,
    };
  },

  build({
    template,
    overrides,
  }: {
    template: "one" | "two" | "three";
    overrides?: SalesOrderOverride;
  }): SalesOrderShape {
    switch (template) {
      case "one":
        return salesOrderFactory.one(overrides);
      case "two":
        return salesOrderFactory.two(overrides);
      case "three":
        return salesOrderFactory.three(overrides);
      default: {
        const _exhaustive: never = template;
        throw new Error(`Unknown sales order template: ${_exhaustive}`);
      }
    }
  },

  all(): SalesOrderShape[] {
    return [salesOrderFactory.one(), salesOrderFactory.two(), salesOrderFactory.three()];
  },
};

// ────────────────────────────────────────────────────────────────────────────
// Factory: Order Lines
// ────────────────────────────────────────────────────────────────────────────

const orderLineFactory = {
  monitorLine(overrides?: LineOverride): OrderLineShape {
    return {
      id: SEED_IDS.lineOne,
      orderId: SEED_IDS.orderOne,
      productId: SEED_IDS.productMonitor,
      description: '4K Monitor 27" (qty 2)',
      quantity: "2",
      priceUnit: "599.99",
      discount: "10.00",
      subtotal: money(LINE_SUBTOTALS.lineOne),
      sequence: 10,
      ...overrides,
    };
  },

  mouseLine(overrides?: LineOverride): OrderLineShape {
    return {
      id: SEED_IDS.lineTwo,
      orderId: SEED_IDS.orderOne,
      productId: SEED_IDS.productMouse,
      description: "Wireless Mouse (qty 2)",
      quantity: "2",
      priceUnit: "29.99",
      discount: "0.00",
      subtotal: money(LINE_SUBTOTALS.lineTwo),
      sequence: 20,
      ...overrides,
    };
  },

  keyboardLine(overrides?: LineOverride): OrderLineShape {
    return {
      id: SEED_IDS.lineThree,
      orderId: SEED_IDS.orderOne,
      productId: SEED_IDS.productKeyboard,
      description: "Mechanical Keyboard (qty 1)",
      quantity: "1",
      priceUnit: "149.99",
      discount: "0.00",
      subtotal: money(LINE_SUBTOTALS.lineThree),
      sequence: 30,
      ...overrides,
    };
  },

  laptopLine(overrides?: LineOverride): OrderLineShape {
    return {
      id: SEED_IDS.lineFour,
      orderId: SEED_IDS.orderTwo,
      productId: SEED_IDS.productLaptop,
      description: "Professional Laptop Pro (qty 1)",
      quantity: "1",
      priceUnit: "1299.99",
      discount: "0.00",
      subtotal: money(LINE_SUBTOTALS.lineFour),
      sequence: 10,
      ...overrides,
    };
  },

  desktopLine(overrides?: LineOverride): OrderLineShape {
    return {
      id: SEED_IDS.lineFive,
      orderId: SEED_IDS.orderThree,
      productId: SEED_IDS.productDesktop,
      description: "Workstation Desktop (qty 2)",
      quantity: "2",
      priceUnit: "1899.99",
      discount: "50.00",
      subtotal: money(LINE_SUBTOTALS.lineFive),
      sequence: 10,
      ...overrides,
    };
  },

  licenseLine(overrides?: LineOverride): OrderLineShape {
    return {
      id: SEED_IDS.lineSix,
      orderId: SEED_IDS.orderThree,
      productId: SEED_IDS.productLicense,
      description: "Enterprise Software License (qty 1)",
      quantity: "1",
      priceUnit: "4999.99",
      discount: "0.00",
      subtotal: money(LINE_SUBTOTALS.lineSix),
      sequence: 20,
      ...overrides,
    };
  },

  /** Lines belonging to order one */
  forOrderOne(): OrderLineShape[] {
    return [
      orderLineFactory.monitorLine(),
      orderLineFactory.mouseLine(),
      orderLineFactory.keyboardLine(),
    ];
  },

  /** Lines belonging to order two */
  forOrderTwo(): OrderLineShape[] {
    return [orderLineFactory.laptopLine()];
  },

  /** Lines belonging to order three */
  forOrderThree(): OrderLineShape[] {
    return [orderLineFactory.desktopLine(), orderLineFactory.licenseLine()];
  },

  all(): OrderLineShape[] {
    return [
      ...orderLineFactory.forOrderOne(),
      ...orderLineFactory.forOrderTwo(),
      ...orderLineFactory.forOrderThree(),
    ];
  },
};

// ────────────────────────────────────────────────────────────────────────────
// Unified Export
// ────────────────────────────────────────────────────────────────────────────

/**
 * SeedFactory — unified test data factory derived from the canonical seed graph.
 *
 * @example
 * const partner = SeedFactory.partner.accentCorp();
 * const order   = SeedFactory.salesOrder.one({ status: "draft" });
 * const lines   = SeedFactory.orderLine.forOrderOne();
 */
export const SeedFactory = {
  partner: partnerFactory,
  category: categoryFactory,
  product: productFactory,
  salesOrder: salesOrderFactory,
  orderLine: orderLineFactory,
} as const;
