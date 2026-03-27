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
    {
      path: "/api/sales/commissions/approve",
      method: "POST",
      handler: "approveCommissionEntries",
      description: "Approve draft commission entries for payout readiness",
      roles: ["admin", "sales_manager", "sales_ops"],
    },
    {
      path: "/api/sales/commissions/pay",
      method: "POST",
      handler: "payCommissionEntries",
      description: "Mark approved commission entries as paid",
      roles: ["admin", "sales_manager", "sales_ops"],
    },
    {
      path: "/api/sales/commissions/report",
      method: "POST",
      handler: "getCommissionReport",
      description: "Generate commission report slices with summary totals",
      roles: ["admin", "sales_manager", "sales_ops"],
    },
    {
      path: "/api/sales/consignment/reports/validate",
      method: "POST",
      handler: "validateConsignmentStockReport",
      description: "Validate consignment stock report balances and line totals",
      roles: ["admin", "sales_manager", "sales_ops"],
    },
    {
      path: "/api/sales/consignment/reports/invoice-draft",
      method: "POST",
      handler: "generateConsignmentInvoiceDraft",
      description: "Generate invoice draft from a confirmed consignment stock report",
      roles: ["admin", "sales_manager", "sales_ops"],
    },
    {
      path: "/api/sales/consignment/agreements/expire",
      method: "POST",
      handler: "expireConsignmentAgreementIfNeeded",
      description: "Evaluate and transition expired consignment agreements",
      roles: ["admin", "sales_manager", "sales_ops"],
    },
    {
      path: "/api/sales/subscriptions/validate",
      method: "POST",
      handler: "validateSubscription",
      description: "Validate subscription invariants and recurring calculations",
      roles: ["admin", "sales_manager", "sales_ops"],
    },
    {
      path: "/api/sales/orders/confirm",
      method: "POST",
      handler: "confirmSalesOrder",
      description: "Confirm sales orders through append-and-project command orchestration",
      roles: ["admin", "sales_manager", "sales_ops"],
    },
    {
      path: "/api/sales/orders/cancel",
      method: "POST",
      handler: "cancelSalesOrder",
      description: "Cancel sales orders through append-and-project command orchestration",
      roles: ["admin", "sales_manager", "sales_ops"],
    },
    {
      path: "/api/sales/subscriptions/activate",
      method: "POST",
      handler: "activateSubscriptionCommand",
      description: "Activate draft subscriptions after invariant checks",
      roles: ["admin", "sales_manager", "sales_ops"],
    },
    {
      path: "/api/sales/subscriptions/pause",
      method: "POST",
      handler: "pauseSubscription",
      description: "Pause active subscriptions",
      roles: ["admin", "sales_manager", "sales_ops"],
    },
    {
      path: "/api/sales/subscriptions/resume",
      method: "POST",
      handler: "resumeSubscription",
      description: "Resume paused or past-due subscriptions",
      roles: ["admin", "sales_manager", "sales_ops"],
    },
    {
      path: "/api/sales/subscriptions/cancel",
      method: "POST",
      handler: "cancelSubscriptionCommand",
      description: "Cancel subscriptions with close reason tracking",
      roles: ["admin", "sales_manager", "sales_ops"],
    },
    {
      path: "/api/sales/subscriptions/renew",
      method: "POST",
      handler: "renewSubscription",
      description: "Renew active subscriptions and roll next invoice date",
      roles: ["admin", "sales_manager", "sales_ops"],
    },
    {
      path: "/api/sales/returns/approve",
      method: "POST",
      handler: "approveReturnOrderCommand",
      description: "Approve validated return orders",
      roles: ["admin", "sales_manager", "sales_ops"],
    },
    {
      path: "/api/sales/documents/status-history",
      method: "POST",
      handler: "recordDocumentStatusHistory",
      description: "Record lifecycle status transitions for sales documents",
      roles: ["admin", "sales_manager", "sales_ops"],
    },
    {
      path: "/api/sales/documents/approvals/request",
      method: "POST",
      handler: "createDocumentApprovalRequest",
      description: "Create approval workflow entries for sales documents",
      roles: ["admin", "sales_manager", "sales_ops"],
    },
    {
      path: "/api/sales/documents/attachments",
      method: "POST",
      handler: "registerDocumentAttachment",
      description: "Register storage-backed attachments against sales documents",
      roles: ["admin", "sales_manager", "sales_ops"],
    },
    {
      path: "/api/sales/accounting/postings/post",
      method: "POST",
      handler: "postAccountingEntry",
      description: "Create and mark accounting postings as posted",
      roles: ["admin", "sales_manager", "sales_ops"],
    },
    {
      path: "/api/sales/accounting/postings/reverse",
      method: "POST",
      handler: "reverseAccountingPosting",
      description: "Reverse posted accounting entries with linked reversal records",
      roles: ["admin", "sales_manager", "sales_ops"],
    },
    {
      path: "/api/sales/rounding/resolve",
      method: "POST",
      handler: "resolveRoundingPolicy",
      description: "Resolve active rounding policy for document calculations",
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
    {
      name: "approveCommissionEntries",
      label: "Approve Commissions",
      type: "object",
      models: ["commission_entry"],
      handler: "approveCommissionEntries",
      icon: "CheckCheck",
      roles: ["admin", "sales_manager", "sales_ops"],
      description: "Approve draft commissions by entry or period filters",
    },
    {
      name: "payCommissionEntries",
      label: "Mark Commissions Paid",
      type: "object",
      models: ["commission_entry"],
      handler: "payCommissionEntries",
      icon: "Wallet",
      roles: ["admin", "sales_manager", "sales_ops"],
      description: "Mark approved commission entries as paid",
    },
    {
      name: "getCommissionReport",
      label: "Commission Report",
      type: "object",
      models: ["commission_entry"],
      handler: "getCommissionReport",
      icon: "ChartColumn",
      roles: ["admin", "sales_manager", "sales_ops"],
      description: "Build filtered commission reports with aggregate summaries",
    },
    {
      name: "validateConsignmentReport",
      label: "Validate Stock Report",
      type: "object",
      models: ["consignment_stock_report"],
      handler: "validateConsignmentStockReport",
      icon: "ClipboardCheck",
      roles: ["admin", "sales_manager", "sales_ops"],
      description: "Validate stock report balances before invoicing",
    },
    {
      name: "generateConsignmentInvoiceDraft",
      label: "Generate Invoice Draft",
      type: "object",
      models: ["consignment_stock_report"],
      handler: "generateConsignmentInvoiceDraft",
      icon: "FileSpreadsheet",
      roles: ["admin", "sales_manager", "sales_ops"],
      description: "Generate invoice draft from sold quantities",
    },
    {
      name: "expireConsignmentAgreement",
      label: "Evaluate Expiry",
      type: "object",
      models: ["consignment_agreement"],
      handler: "expireConsignmentAgreementIfNeeded",
      icon: "CalendarClock",
      roles: ["admin", "sales_manager", "sales_ops"],
      description: "Evaluate agreement expiry and transition status when needed",
    },
    {
      name: "validateSubscription",
      label: "Validate Subscription",
      type: "object",
      models: ["subscription"],
      handler: "validateSubscription",
      icon: "ShieldCheck",
      roles: ["admin", "sales_manager", "sales_ops"],
      description: "Validate subscription lines, MRR/ARR, and lifecycle invariants",
    },
    {
      name: "confirmSalesOrder",
      label: "Confirm Sales Order",
      type: "object",
      models: ["sales_order"],
      handler: "confirmSalesOrder",
      icon: "BadgeCheck",
      roles: ["admin", "sales_manager", "sales_ops"],
      description: "Confirm sales orders through event-first command projection",
    },
    {
      name: "cancelSalesOrder",
      label: "Cancel Sales Order",
      type: "object",
      models: ["sales_order"],
      handler: "cancelSalesOrder",
      icon: "Ban",
      roles: ["admin", "sales_manager", "sales_ops"],
      description: "Cancel sales orders through event-first command projection",
    },
    {
      name: "activateSubscription",
      label: "Activate Subscription",
      type: "object",
      models: ["subscription"],
      handler: "activateSubscription",
      icon: "Play",
      roles: ["admin", "sales_manager", "sales_ops"],
      description: "Activate validated subscription contracts",
    },
    {
      name: "pauseSubscription",
      label: "Pause Subscription",
      type: "object",
      models: ["subscription"],
      handler: "pauseSubscription",
      icon: "Pause",
      roles: ["admin", "sales_manager", "sales_ops"],
      description: "Pause active subscriptions without cancellation",
    },
    {
      name: "resumeSubscription",
      label: "Resume Subscription",
      type: "object",
      models: ["subscription"],
      handler: "resumeSubscription",
      icon: "PlayCircle",
      roles: ["admin", "sales_manager", "sales_ops"],
      description: "Resume paused or recovered subscriptions",
    },
    {
      name: "cancelSubscription",
      label: "Cancel Subscription",
      type: "object",
      models: ["subscription"],
      handler: "cancelSubscription",
      icon: "CircleOff",
      roles: ["admin", "sales_manager", "sales_ops"],
      description: "Cancel subscriptions and register churn reasons",
    },
    {
      name: "renewSubscription",
      label: "Renew Subscription",
      type: "object",
      models: ["subscription"],
      handler: "renewSubscription",
      icon: "RefreshCw",
      roles: ["admin", "sales_manager", "sales_ops"],
      description: "Renew active subscriptions and recalculate recurring revenue",
    },
    {
      name: "recordDocumentStatusHistory",
      label: "Record Document Status",
      type: "object",
      models: ["sales_order", "return_order", "subscription", "consignment_stock_report"],
      handler: "recordDocumentStatusHistory",
      icon: "History",
      roles: ["admin", "sales_manager", "sales_ops"],
      description: "Persist document lifecycle transitions for audit and workflow tracing",
    },
    {
      name: "resolveRoundingPolicy",
      label: "Resolve Rounding Policy",
      type: "object",
      models: ["sales_order", "return_order", "subscription"],
      handler: "resolveRoundingPolicy",
      icon: "Calculator",
      roles: ["admin", "sales_manager", "sales_ops"],
      description: "Resolve the active tenant rounding policy by key and currency",
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
export * from "./commission-service.js";
export * from "./logic/consignment-engine.js";
export * from "./consignment-service.js";
export * from "./logic/payment-terms.js";
export * from "./logic/pricing-engine.js";
export * from "./logic/product-configurator.js";
export * from "./subscription-service.js";
export * from "./document-infrastructure-service.js";
export * from "./logic/tax-engine.js";
