/**
 * ESLint Root Configuration - Production-Grade Monorepo
 * ======================================================
 *
 * Single source of truth for all workspace packages.
 * Context-aware overrides for web (browser), api (node), and shared packages.
 *
 * Architecture:
 * - Base: TypeScript + code quality rules for all packages
 * - Web: Browser globals + React hooks enforcement
 * - API: Node globals + async safety rules
 * - Tests: Relaxed rules for test utilities
 *
 * Based on: AFENDA-META-UI enterprise-grade monorepo governance
 */

import js from "@eslint/js";
import tseslint from "typescript-eslint";
import reactHooks from "eslint-plugin-react-hooks";
import react from "eslint-plugin-react";
import reactRefresh from "eslint-plugin-react-refresh";
import globals from "globals";
import prettierConfig from "eslint-config-prettier";

export default [
  // =============================================================================
  // IGNORE PATTERNS (all packages)
  // =============================================================================
  {
    ignores: [
      "**/node_modules/**",
      "**/dist/**",
      "**/.turbo/**",
      "**/.next/**",
      "**/coverage/**",
      "**/build/**",
      "**/.vercel/**",
      "**/.cache/**",
    ],
  },

  // =============================================================================
  // BASE CONFIGURATION - JavaScript files
  // =============================================================================
  js.configs.recommended,

  // =============================================================================
  // BASE CONFIGURATION - TypeScript files
  // =============================================================================
  ...tseslint.configs.recommended,

  // =============================================================================
  // TYPESCRIPT OVERRIDES - Must come after recommended configs
  // =============================================================================
  {
    files: ["**/*.{ts,tsx}"],
    rules: {
      // Turn off base JS rules that conflict with TS versions
      "no-undef": "off",
      "no-redeclare": "off",
      "no-unused-vars": "off",
    },
  },

  {
    files: ["**/*.{ts,tsx}"],
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      // =========================================================================
      // TYPESCRIPT - CORRECTNESS
      // =========================================================================
      "@typescript-eslint/no-unused-vars": [
        "warn",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          caughtErrorsIgnorePattern: "^_",
          args: "after-used",
          ignoreRestSiblings: true,
        },
      ],
      "@typescript-eslint/no-explicit-any": "warn",
      "@typescript-eslint/consistent-type-imports": "warn",

      // =========================================================================
      // CODE QUALITY
      // =========================================================================
      "no-console": ["warn", { allow: ["warn", "error"] }],
      "no-debugger": "warn",
      "no-constant-binary-expression": "error",
      "no-useless-assignment": "warn",
    },
  },

  // =============================================================================
  {
    files: ["apps/web/**/*.{ts,tsx}"],
    languageOptions: {
      globals: {
        ...globals.browser,
        React: "readonly", // JSX transform
      },
    },
    plugins: {
      react: react,
      "react-hooks": reactHooks,
      "react-refresh": reactRefresh,
    },
    settings: {
      react: {
        version: "detect",
      },
    },
    rules: {
      // =========================================================================
      // REACT HOOKS (CRITICAL - Enforces Rules of Hooks)
      // =========================================================================
      "react-hooks/rules-of-hooks": "error",
      "react-hooks/exhaustive-deps": "error",

      // =========================================================================
      // REACT GENERAL
      // =========================================================================
      "react/react-in-jsx-scope": "off", // Not needed in React 17+
      "react/prop-types": "off", // Using TypeScript

      // =========================================================================
      // REACT REFRESH (HOT MODULE REPLACEMENT)
      // =========================================================================
      "react-refresh/only-export-components": ["warn", { allowConstantExport: true }],

      // =========================================================================
      // WEB-SPECIFIC RESTRICTIONS
      // =========================================================================
      "no-restricted-imports": [
        "error",
        {
          paths: [
            {
              name: "@afenda/ui",
              importNames: ["useTheme"],
              message:
                "Use useTheme from ~/components/theme-provider for web app state matrix compatibility.",
            },
          ],
        },
      ],
    },
  },

  // =========================================================================
  // WEB - Layout Components (state matrix enforcement)
  // =========================================================================
  {
    files: ["apps/web/src/components/layout/**/*.{ts,tsx}"],
    ignores: ["apps/web/src/components/layout/sidebar.tsx"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          paths: [
            {
              name: "react",
              importNames: ["useState", "useReducer"],
              message: "Use Zustand/Redux stores for layout-level shared state per state matrix.",
            },
          ],
        },
      ],
      "no-restricted-globals": [
        "error",
        {
          name: "localStorage",
          message: "Use store persistence adapters instead of direct localStorage in layout.",
        },
      ],
    },
  },

  // =========================================================================
  // WEB - Theme Provider Exception (matrix compatibility layer)
  // =========================================================================
  {
    files: ["apps/web/src/components/theme-provider.tsx"],
    rules: {
      "no-restricted-globals": "off",
      "react-refresh/only-export-components": "off",
    },
  },

  // =========================================================================
  // WEB - shadcn UI Components (generated with CVA exports)
  // =========================================================================
  {
    files: ["apps/web/src/components/ui/**/*.{ts,tsx}"],
    rules: {
      "react-refresh/only-export-components": "off",
    },
  },

  // =========================================================================
  // WEB - Routes (export router + component)
  // =========================================================================
  {
    files: ["apps/web/src/routes/**/*.{ts,tsx}"],
    rules: {
      "react-refresh/only-export-components": "off",
    },
  },

  // =============================================================================
  // API (NODE.JS)
  // =============================================================================
  {
    files: ["apps/api/**/*.ts"],
    languageOptions: {
      globals: {
        ...globals.node,
      },
    },
    rules: {
      // =========================================================================
      // NODE-SPECIFIC
      // =========================================================================
      "no-console": "off", // Console is standard in Node

      // =========================================================================
      // ASYNC SAFETY (prevent floating promises)
      // =========================================================================
      "@typescript-eslint/no-floating-promises": "error",
      "@typescript-eslint/no-misused-promises": [
        "error",
        {
          checksVoidReturn: {
            arguments: false,
          },
        },
      ],

      // =========================================================================
      // API-SPECIFIC RESTRICTIONS (Pino logging patterns)
      // =========================================================================
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["../lib/logger.js", "../../lib/logger.js", "*/lib/logger.js"],
              message: "Import logger from src/logging/logger.js in API modules.",
            },
          ],
        },
      ],
      "no-restricted-syntax": [
        "error",
        {
          selector:
            "CallExpression[callee.object.name='logger'][callee.property.name=/^(trace|debug|info|warn|error|fatal)$/] > Literal:first-child + ObjectExpression",
          message:
            "Pino expects logger.<level>({ context }, 'message') — object first, string second.",
        },
      ],
    },
  },

  // =============================================================================
  // PACKAGES (SHARED LIBS - neutral environment)
  // =============================================================================
  {
    files: ["packages/**/*.{ts,tsx}"],
    rules: {
      // Packages should be environment-agnostic where possible
      "no-console": "error", // No direct console in shared libs
    },
  },

  // =============================================================================
  // TEST FILES (all workspaces)
  // =============================================================================
  {
    files: ["**/*.test.{ts,tsx}", "**/*.spec.{ts,tsx}", "**/test/**/*.{ts,tsx}"],
    languageOptions: {
      globals: {
        ...globals.node,
        ...globals.browser,
        // Vitest globals
        describe: "readonly",
        it: "readonly",
        test: "readonly",
        expect: "readonly",
        beforeEach: "readonly",
        afterEach: "readonly",
        beforeAll: "readonly",
        afterAll: "readonly",
        vi: "readonly",
      },
    },
    rules: {
      "@typescript-eslint/no-explicit-any": "off", // Allow any in tests
      "no-console": "off", // Allow console in tests
    },
  },

  // =============================================================================
  // @afenda/db — graph-validation CLI (stdout progress; not library code)
  // =============================================================================
  {
    files: ["packages/db/src/graph-validation/**/*.ts"],
    rules: {
      "no-console": "off",
    },
  },

  // =============================================================================
  // @afenda/db — seeds (CLI progress; Truth Initialization Engine orchestration)
  // =============================================================================
  {
    files: ["packages/db/src/seeds/**/*.ts"],
    rules: {
      "no-console": "off",
    },
  },

  // =============================================================================
  // DEMO/EXAMPLE FILES (documentation code)
  // =============================================================================
  {
    files: [
      "**/*.example.{ts,tsx}",
      "**/*_DEMO.{ts,tsx}",
      "**/*_EXAMPLES.{ts,tsx}",
      "**/INTEGRATION_EXAMPLES.tsx",
      "**/SUGGESTIONS_DEMO.ts",
    ],
    rules: {
      "no-console": "off", // Allow console in demos
      "@typescript-eslint/no-unused-vars": "off", // Demo code may have unused exports
      "react-refresh/only-export-components": "off",
    },
  },

  // =============================================================================
  // PRETTIER INTEGRATION (disable conflicting rules)
  // =============================================================================
  prettierConfig,
];
