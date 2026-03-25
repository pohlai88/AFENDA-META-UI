/**
 * Sales Module
 * ============
 *
 * Provides core sales functionality including:
 * - Partner management (customers/vendors)
 * - Product catalog
 * - Sales orders and order lines
 *
 * Models: partner, product, product_category, sales_order, sales_order_line
 */

import type { MetaModule } from "@afenda/meta-types";

export default {
  name: "sales",
  label: "Sales",
  version: "1.0.0",
  description: "Core sales and partner management module",
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
  ],

  hooks: {
    onLoad: async () => {
      console.log("[Sales Module] Loaded");
    },
    onEnable: async () => {
      console.log("[Sales Module] Enabled");
    },
    onDisable: async () => {
      console.log("[Sales Module] Disabled");
    },
  },
} as MetaModule;
