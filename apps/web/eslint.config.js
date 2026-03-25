/**
 * ESLint Configuration - Enterprise React + TypeScript
 * ======================================================
 * 
 * Key rules enabled:
 * - react-hooks/rules-of-hooks: Ensures hooks are called correctly
 * - react-hooks/exhaustive-deps: Prevents stale closures in useEffect/useCallback/useMemo
 * - @typescript-eslint: Type-aware linting for better safety
 */

import js from '@eslint/js';
import tseslint from '@typescript-eslint/eslint-plugin';
import tsparser from '@typescript-eslint/parser';
import react from 'eslint-plugin-react';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';

export default [
  {
    ignores: ['dist/**', 'node_modules/**', '.turbo/**', 'coverage/**'],
  },
  js.configs.recommended,
  {
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      parser: tsparser,
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
        ecmaFeatures: {
          jsx: true,
        },
      },
      globals: {
        // Browser globals
        window: 'readonly',
        document: 'readonly',
        localStorage: 'readonly',
        fetch: 'readonly',
        console: 'readonly',
        URLSearchParams: 'readonly',
        HTMLElement: 'readonly',
        HTMLDivElement: 'readonly',
        HTMLInputElement: 'readonly',
        HTMLButtonElement: 'readonly',
        HTMLParagraphElement: 'readonly',
        MediaQueryListEvent: 'readonly',
        crypto: 'readonly',
        // Node/Vite
        process: 'readonly',
        // React
        React: 'readonly',
      },
    },
    plugins: {
      '@typescript-eslint': tseslint,
      'react': react,
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    rules: {
      // ============================================================================
      // REACT HOOKS RULES (CRITICAL - Enforces Rules of Hooks)
      // ============================================================================
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'error',

      // ============================================================================
      // REACT REFRESH (HOT MODULE REPLACEMENT)
      // ============================================================================
      'react-refresh/only-export-components': [
        'warn',
        { allowConstantExport: true },
      ],

      // ============================================================================
      // TYPESCRIPT RULES
      // ============================================================================
      'no-unused-vars': 'off', // Disable base rule (using TypeScript version)
      '@typescript-eslint/no-unused-vars': [
        'warn',
        { 
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          // Ignore unused parameters in type signatures
          args: 'after-used',
          ignoreRestSiblings: true,
        },
      ],
      '@typescript-eslint/no-explicit-any': 'warn',

      // ============================================================================
      // REACT GENERAL
      // ============================================================================
      'react/react-in-jsx-scope': 'off', // Not needed in React 17+
      'react/prop-types': 'off', // Using TypeScript for prop validation

      // ============================================================================
      // CODE QUALITY
      // ============================================================================
      'no-console': ['warn', { allow: ['warn', 'error'] }],
      'no-debugger': 'warn',
      'no-constant-binary-expression': 'error', // Catches bugs like if (x && CONSTANT)

      // ============================================================================
      // STATE MATRIX ENFORCEMENT RULES
      // ============================================================================
      'no-restricted-imports': [
        'error',
        {
          paths: [
            {
              name: '@afenda/ui',
              importNames: ['useTheme'],
              message:
                'Use useTheme from ~/components/theme-provider so theme state follows the web app matrix model.',
            },
          ],
        },
      ],
    },
    settings: {
      react: {
        version: 'detect',
      },
    },
  },
  // ============================================================================
  // LAYOUT STATE RULES (prevent local global-state patterns)
  // ============================================================================
  {
    files: ['src/components/layout/**/*.{ts,tsx}'],
    ignores: ['src/components/layout/sidebar.tsx', '**/sidebar.tsx'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          paths: [
            {
              name: 'react',
              importNames: ['useState', 'useReducer'],
              message:
                'Use Zustand/Redux stores for layout-level shared state per state matrix.',
            },
          ],
        },
      ],
      'no-restricted-globals': [
        'error',
        {
          name: 'localStorage',
          message:
            'Use store persistence adapters instead of direct localStorage access in layout components.',
        },
      ],
    },
  },
  // ============================================================================
  // THEME PROVIDER EXCEPTION (documented matrix compatibility layer)
  // ============================================================================
  {
    files: ['src/components/theme-provider.tsx'],
    rules: {
      'no-restricted-globals': 'off',
      'react-refresh/only-export-components': 'off',
    },
  },
  // ============================================================================
  // SHADCN UI COMPONENTS (generated files with co-located CVA variant exports)
  // ============================================================================
  {
    files: ['src/components/ui/**/*.{ts,tsx}'],
    rules: {
      // shadcn components intentionally export both components and variants (cva)
      'react-refresh/only-export-components': 'off',
    },
  },
  // ============================================================================
  // ROUTE FILES (export router instance + component — valid pattern)
  // ============================================================================
  {
    files: ['src/routes/**/*.{ts,tsx}', 'src/test/**/*.{ts,tsx}'],
    rules: {
      'react-refresh/only-export-components': 'off',
    },
  },
  // ============================================================================
  // TEST FILES CONFIGURATION (Vitest globals)
  // ============================================================================
  {
    files: ['**/*.test.{ts,tsx}', '**/*.spec.{ts,tsx}', '**/test/**/*.{ts,tsx}'],
    languageOptions: {
      globals: {
        // Test globals (Vitest/Jest)
        describe: 'readonly',
        it: 'readonly',
        test: 'readonly',
        expect: 'readonly',
        beforeEach: 'readonly',
        afterEach: 'readonly',
        beforeAll: 'readonly',
        afterAll: 'readonly',
        vi: 'readonly',
        // Node.js/Browser globals needed in tests
        global: 'writable',
        setTimeout: 'readonly',
        clearTimeout: 'readonly',
        setInterval: 'readonly',
        clearInterval: 'readonly',
        Headers: 'readonly',
        Request: 'readonly',
        Response: 'readonly',
        fetch: 'readonly',
        Storage: 'readonly',
        // DOM types used in test mocks
        IntersectionObserver: 'readonly',
        IntersectionObserverEntry: 'readonly',
        ResizeObserver: 'readonly',
        Element: 'readonly',
      },
    },
  },
];
