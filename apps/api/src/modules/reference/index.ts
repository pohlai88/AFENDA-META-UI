/**
 * Reference Module
 * ================
 *
 * Platform reference data layer providing:
 * - Countries and states (ISO 3166)
 * - Currencies and exchange rates (ISO 4217)
 * - Banks directory
 * - Document numbering sequences
 * - Units of measure and categories
 * - Document attachments
 * - Approval logs
 *
 * Phase 0: Platform Reference Data (Sales Domain Expansion)
 *
 * Models: countries, states, currencies, currency_rates, banks, sequences,
 * uom_categories, units_of_measure, document_attachments, approval_logs
 */

import type { MetaModule } from "@afenda/meta-types/module";
export default {
  name: "reference",
  label: "Reference Data",
  version: "1.0.0",
  description:
    "Platform reference data including countries, currencies, units of measure, and document sequences",
  author: "AFENDA",
  category: "core",
  icon: "Database",

  config: {
    enabled: true,
    settings: {},
    features: {},
  },

  models: [
    {
      name: "country",
      label: "Countries",
      visible: true,
      icon: "Globe",
    },
    {
      name: "state",
      label: "States",
      visible: true,
      icon: "MapPin",
    },
    {
      name: "currency",
      label: "Currencies",
      visible: true,
      icon: "DollarSign",
    },
    {
      name: "currency_rate",
      label: "Currency Rates",
      visible: true,
      icon: "TrendingUp",
    },
    {
      name: "bank",
      label: "Banks",
      visible: true,
      icon: "Building2",
    },
    {
      name: "sequence",
      label: "Sequences",
      visible: true,
      icon: "Hash",
    },
    {
      name: "uom_category",
      label: "UoM Categories",
      visible: true,
      icon: "FolderTree",
    },
    {
      name: "unit_of_measure",
      label: "Units of Measure",
      visible: true,
      icon: "Ruler",
    },
    {
      name: "document_attachment",
      label: "Document Attachments",
      visible: false,
      icon: "Paperclip",
    },
    {
      name: "approval_log",
      label: "Approval Logs",
      visible: false,
      icon: "ClipboardCheck",
    },
  ],

  actions: [],
  workflows: [],
  reports: [],
  dashboards: [],
} as unknown as MetaModule;

// Re-export logic functions for use by other modules
export * from "./logic/reference-data.js";
