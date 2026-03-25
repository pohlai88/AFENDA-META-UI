/**
 * ESLint Boundaries Configuration
 * ================================
 * 
 * Enforces import boundaries between monorepo packages based on architectural tiers.
 * 
 * Element Types (Architectural Tiers):
 * - foundation: Pure types, zero runtime deps (@afenda/meta-types)
 * - data: Database layer (@afenda/db)
 * - presentation: UI components (@afenda/ui)
 * - app-server: Backend application (api)
 * - app-client: Frontend application (web)
 * - tooling: Build/CI tools (ci-gate)
 * 
 * Dependency Rules:
 * - foundation → (no internal deps)
 * - data → foundation only
 * - presentation → foundation only
 * - app-server → data, foundation
 * - app-client → presentation, foundation
 * - tooling → (no internal deps)
 * 
 * Based on: AFENDA-META-UI monorepo governance policy
 */

import boundaries from "eslint-plugin-boundaries";

export const boundariesConfig = {
  plugins: {
    boundaries,
  },
  settings: {
    "boundaries/elements": [
      {
        type: "foundation",
        pattern: "packages/meta-types/**",
        mode: "full",
      },
      {
        type: "data",
        pattern: "packages/db/**",
        mode: "full",
      },
      {
        type: "presentation",
        pattern: "packages/ui/**",
        mode: "full",
      },
      {
        type: "app-server",
        pattern: "apps/api/**",
        mode: "full",
      },
      {
        type: "app-client",
        pattern: "apps/web/**",
        mode: "full",
      },
      {
        type: "tooling",
        pattern: "tools/**",
        mode: "full",
      },
    ],
    "boundaries/ignore": [
      "**/*.test.{ts,tsx}",
      "**/*.spec.{ts,tsx}",
      "**/__tests__/**",
      "**/test/**",
      "**/*.config.{js,ts}",
      "**/vite.config.ts",
      "**/vitest.config.ts",
      "**/playwright.config.ts",
    ],
  },
  rules: {
    // Core boundary enforcement rule
    "boundaries/element-types": [
      "error",
      {
        default: "disallow",
        rules: [
          // Foundation (meta-types): No internal dependencies
          {
            from: ["foundation"],
            disallow: ["foundation", "data", "presentation", "app-server", "app-client", "tooling"],
            message: "@afenda/meta-types (foundation) must have zero internal dependencies",
          },

          // Data (db): Can import foundation only
          {
            from: ["data"],
            allow: ["foundation"],
          },
          {
            from: ["data"],
            disallow: ["data", "presentation", "app-server", "app-client", "tooling"],
            message: "@afenda/db (data) can only import @afenda/meta-types (foundation)",
          },

          // Presentation (ui): Can import foundation only
          {
            from: ["presentation"],
            allow: ["foundation"],
          },
          {
            from: ["presentation"],
            disallow: ["data", "presentation", "app-server", "app-client", "tooling"],
            message: "@afenda/ui (presentation) can only import @afenda/meta-types (foundation)",
          },

          // App Server (api): Can import data, foundation
          {
            from: ["app-server"],
            allow: ["data", "foundation"],
          },
          {
            from: ["app-server"],
            disallow: ["presentation", "app-server", "app-client", "tooling"],
            message: "api (app-server) can only import @afenda/db (data) and @afenda/meta-types (foundation). Never import UI packages.",
          },

          // App Client (web): Can import presentation, foundation
          {
            from: ["app-client"],
            allow: ["presentation", "foundation"],
          },
          {
            from: ["app-client"],
            disallow: ["data", "app-server", "app-client", "tooling"],
            message: "web (app-client) can only import @afenda/ui (presentation) and @afenda/meta-types (foundation). Never import database or server packages.",
          },

          // Tooling (ci-gate): No internal dependencies
          {
            from: ["tooling"],
            disallow: ["foundation", "data", "presentation", "app-server", "app-client", "tooling"],
            message: "ci-gate (tooling) must be standalone with no internal dependencies",
          },
        ],
      },
    ],

    // Prevent importing private/internal paths
    "boundaries/no-private": "error",

    // Warn on unknown element types (helps catch misconfigured patterns)
    "boundaries/no-unknown": "warn",
  },
};

export default boundariesConfig;
