/**
 * Sales Module
 * ============
 *
 * Provides core sales functionality including:
 * - Partner management (customers/vendors)
 * - Product catalog
 * - Sales orders and order lines
 * - Commissions, territories, teams, returns, consignment, and subscriptions
 *
 * Models: partner, product, product_category, sales_order, sales_order_line, commission_plan,
 * commission_entry, territory, sales_team, return_order, consignment_agreement, subscription
 */

import type { MetaModule } from "@afenda/meta-types";
import { logger } from "../../logging/logger.js";

export default {
  name: "sales",
  label: "Sales",
  version: "1.0.0",
  description:
    "Sales operations, commissions, returns, consignment, subscriptions, and partner management",
  author: "AFENDA",
  category: "erp",
  icon: "ShoppingCart",

  config: {
    enabled: true,
    settings: {},
    features: {},
  },

  models: [
    {
      name: "partner",
      label: "Partners",
      // meta is loaded from schema registry via introspection
      visible: true,
      icon: "Users",
    },
    {
      name: "product",
      label: "Products",
      visible: true,
      icon: "Package",
    },
    {
      name: "product_category",
      label: "Product Categories",
      visible: true,
      icon: "FolderTree",
    },
    {
      name: "sales_order",
      label: "Sales Orders",
      visible: true,
      icon: "FileText",
    },
    {
      name: "sales_order_line",
      label: "Order Lines",
      visible: false, // Not visible in main menu (accessed via one2many on sales_order)
      icon: "ListOrdered",
    },
    {
      name: "commission_plan",
      label: "Commission Plans",
      visible: true,
      icon: "Percent",
    },
    {
      name: "commission_plan_tier",
      label: "Commission Plan Tiers",
      visible: false,
      icon: "ChartNoAxesColumnIncreasing",
    },
    {
      name: "commission_entry",
      label: "Commission Entries",
      visible: true,
      icon: "BadgePercent",
    },
    {
      name: "sales_team",
      label: "Sales Teams",
      visible: true,
      icon: "UsersRound",
    },
    {
      name: "sales_team_member",
      label: "Sales Team Members",
      visible: false,
      icon: "UserRoundCog",
    },
    {
      name: "territory",
      label: "Territories",
      visible: true,
      icon: "Map",
    },
    {
      name: "territory_rule",
      label: "Territory Rules",
      visible: false,
      icon: "Route",
    },
    {
      name: "return_reason_code",
      label: "Return Reason Codes",
      visible: false,
      icon: "Undo2",
    },
    {
      name: "return_order",
      label: "Returns",
      visible: true,
      icon: "RotateCcwSquare",
    },
    {
      name: "return_order_line",
      label: "Return Lines",
      visible: false,
      icon: "ListRestart",
    },
    {
      name: "consignment_agreement",
      label: "Consignment Agreements",
      visible: true,
      icon: "Handshake",
    },
    {
      name: "consignment_agreement_line",
      label: "Consignment Agreement Lines",
      visible: false,
      icon: "Rows3",
    },
    {
      name: "consignment_stock_report",
      label: "Consignment Stock Reports",
      visible: true,
      icon: "ClipboardList",
    },
    {
      name: "consignment_stock_report_line",
      label: "Consignment Stock Report Lines",
      visible: false,
      icon: "ReceiptText",
    },
    {
      name: "subscription",
      label: "Subscriptions",
      visible: true,
      icon: "RefreshCw",
    },
    {
      name: "subscription_line",
      label: "Subscription Lines",
      visible: false,
      icon: "Rows2",
    },
  ],

  routes: [
    {
      path: "/api/sales/commissions/generate",
      method: "POST",
      handler: "generateCommissionForOrder",
      description: "Generate or regenerate a commission entry from a sales order",
      roles: ["admin", "sales_manager", "sales_ops"],
    },
  ],

  actions: [
    {
      name: "generateCommission",
      label: "Generate Commission",
      type: "object",
      models: ["sales_order"],
      handler: "generateCommissionForOrder",
      icon: "BadgePercent",
      roles: ["admin", "sales_manager", "sales_ops"],
      description: "Generate or refresh commission entries from a sales order",
    },
  ],

  menus: [
    {
      name: "partners",
      label: "Partners",
      path: "/sales/partner",
      icon: "Users",
      order: 1,
    },
    {
      name: "orders",
      label: "Sales Orders",
      path: "/sales/sales_order",
      icon: "FileText",
      order: 2,
    },
    {
      name: "products",
      label: "Products",
      path: "/sales/product",
      icon: "Package",
      order: 3,
    },
    {
      name: "categories",
      label: "Categories",
      path: "/sales/product_category",
      icon: "FolderTree",
      order: 4,
    },
    {
      name: "commissions",
      label: "Commissions",
      path: "/sales/commission_entry",
      icon: "BadgePercent",
      order: 5,
    },
    {
      name: "commission-plans",
      label: "Commission Plans",
      path: "/sales/commission_plan",
      icon: "Percent",
      order: 6,
    },
    {
      name: "teams",
      label: "Sales Teams",
      path: "/sales/sales_team",
      icon: "UsersRound",
      order: 7,
    },
    {
      name: "territories",
      label: "Territories",
      path: "/sales/territory",
      icon: "Map",
      order: 8,
    },
    {
      name: "returns",
      label: "Returns",
      path: "/sales/return_order",
      icon: "RotateCcwSquare",
      order: 9,
    },
    {
      name: "consignment-agreements",
      label: "Consignment",
      path: "/sales/consignment_agreement",
      icon: "Handshake",
      order: 10,
    },
    {
      name: "consignment-reports",
      label: "Stock Reports",
      path: "/sales/consignment_stock_report",
      icon: "ClipboardList",
      order: 11,
    },
    {
      name: "subscriptions",
      label: "Subscriptions",
      path: "/sales/subscription",
      icon: "RefreshCw",
      order: 12,
    },
  ],

  hooks: {
    onLoad: async () => {
      logger.info("Sales Module loaded");
    },
    onEnable: async () => {
      logger.info("Sales Module enabled");
    },
    onDisable: async () => {
      logger.info("Sales Module disabled");
    },
  },
} as MetaModule;

// Re-export logic functions for use by other modules
export * from "./logic/partner-engine.js";
export * from "./logic/commission-engine.js";
export * from "./logic/payment-terms.js";
export * from "./logic/pricing-engine.js";
export * from "./logic/tax-engine.js";
