/**
 * State Management CI Gates
 * ==========================
 * Automated validation rules for state management best practices.
 *
 * These gates ensure:
 * - Proper store usage
 * - No state duplication
 * - Type safety
 * - Performance best practices
 */

// ESLint rules (add to eslint.config.js)
export const stateManagementRules = {
  // Prevent direct localStorage usage (use Zustand persist)
  "no-restricted-globals": [
    "error",
    {
      name: "localStorage",
      message: "Use Zustand persist middleware instead of direct localStorage access",
    },
  ],

  // Prevent useState for global state
  "no-restricted-syntax": [
    "error",
    {
      selector:
        "CallExpression[callee.name='useState']:has(~VariableDeclarator[id.name=/^(sidebar|notification|auth|user|permission)/i])",
      message: "Use Zustand or Redux stores for global state instead of useState",
    },
  ],
};

// TypeScript validation rules
export const typeScriptRules = {
  // Ensure all stores have proper types
  "@typescript-eslint/explicit-function-return-type": "off",
  "@typescript-eslint/no-explicit-any": "error",
  "@typescript-eslint/strict-boolean-expressions": "off",
};

// Bundle size limits (for CI monitoring)
export const bundleLimits = {
  "stores/ui": "10kb", // Zustand stores
  "stores/business": "30kb", // Redux stores
  total: "50kb", // Total state management overhead
};

// Code coverage requirements
export const coverageRequirements = {
  stores: 80, // Minimum coverage for store files
  selectors: 100, // All selectors must be tested
};

/**
 * Validation checklist for PR reviews
 */
export const prChecklist = `
## State Management Checklist

Before merging, ensure:

- [ ] New state uses correct tool (Zustand/Redux/React Query per matrix)
- [ ] Store has TypeScript types (no \`any\`)
- [ ] Store has unit tests (80%+ coverage)
- [ ] Selectors tested (100% coverage)
- [ ] No prop drilling beyond 2 levels
- [ ] No duplicate state across stores
- [ ] Bundle size within limits
- [ ] DevTools integration works
- [ ] Documentation updated

## State Management Matrix

| State Type | Tool | Why |
|------------|------|-----|
| UI (local) | Zustand | Fast, no middleware |
| Business Logic | Redux | Needs audit/logging |
| Server Data | React Query | Caching & sync |
`;

export default {
  stateManagementRules,
  typeScriptRules,
  bundleLimits,
  coverageRequirements,
  prChecklist,
};
