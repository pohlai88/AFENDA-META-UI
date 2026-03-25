# Contributing to AFENDA Meta UI

Thank you for contributing to AFENDA Meta UI! This guide will help you understand our development workflow, code standards, and testing requirements.

## 📋 Table of Contents

- [Getting Started](#getting-started)
- [Development Workflow](#development-workflow)
- [Code Standards](#code-standards)
- [Testing Requirements](#testing-requirements)
- [CI Gate System](#ci-gate-system)
- [Export Contracts](#export-contracts)
- [Dependency Governance](#dependency-governance)
- [Pull Request Process](#pull-request-process)

---

## Getting Started

### Prerequisites

- Node.js 18+
- pnpm 8+
- Git

### Initial Setup

```bash
# Clone the repository
git clone https://github.com/pohlai88/AFENDA-META-UI.git
cd AFENDA-META-UI

# Install dependencies
pnpm install

# Run development servers
pnpm dev
```

---

## Development Workflow

### Branching Strategy

- `master` — Production-ready code
- `feature/*` — New features
- `fix/*` — Bug fixes
- `docs/*` — Documentation updates

### Making Changes

1. **Create a branch** from `master`:

   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Make your changes** following our code standards

3. **Run tests** to ensure nothing breaks:

   ```bash
   pnpm test
   ```

4. **Run CI gates** before committing:

   ```bash
   pnpm ci:gate
   ```

5. **Commit your changes**:

   ```bash
   git add .
   git commit -m "feat: add new feature"
   ```

6. **Push and create a pull request**:
   ```bash
   git push origin feature/your-feature-name
   ```

---

## Code Standards

### TypeScript

- Use strict TypeScript mode (enabled by default)
- Prefer `type` over `interface` for object shapes
- Use explicit return types for public functions
- Avoid `any` — use `unknown` with type guards instead

### React Components

- Prefer function components over class components
- Use TypeScript for prop types (no PropTypes)
- Co-locate styles with components when possible
- Follow React Hooks rules (enforced by ESLint)

### Naming Conventions

- **Files**: kebab-case (`user-profile.tsx`)
- **Components**: PascalCase (`UserProfile`)
- **Functions**: camelCase (`handleSubmit`)
- **Constants**: UPPER_SNAKE_CASE (`API_BASE_URL`)
- **Types**: PascalCase (`UserProfileProps`)

### Import Order

```typescript
// 1. External libraries
import React from "react";
import { useQuery } from "@tanstack/react-query";

// 2. Internal aliases
import { Button } from "~/components/ui/button";
import { useMeta } from "~/api/meta";

// 3. Relative imports
import { formatDate } from "../utils/date";
import styles from "./styles.module.css";
```

---

## Testing Requirements

### Unit Tests

All business logic and utility functions must have unit tests:

```typescript
// src/utils/validators.test.ts
import { describe, it, expect } from "vitest";
import { validateEmail } from "./validators";

describe("validateEmail", () => {
  it("accepts valid email addresses", () => {
    expect(validateEmail("user@example.com")).toBe(true);
  });

  it("rejects invalid email addresses", () => {
    expect(validateEmail("invalid")).toBe(false);
  });
});
```

**Run unit tests:**

```bash
pnpm test
```

### Component Tests

All React components should have behavior tests:

```typescript
// src/components/UserProfile.test.tsx
import { render, screen } from "@testing-library/react";
import { UserProfile } from "./UserProfile";

describe("UserProfile", () => {
  it("renders user name", () => {
    render(<UserProfile name="John Doe" />);
    expect(screen.getByText("John Doe")).toBeInTheDocument();
  });
});
```

### E2E Tests

Critical user flows must have end-to-end tests (Playwright):

```typescript
// e2e/login.e2e.ts
import { test, expect } from "@playwright/test";

test("user can log in", async ({ page }) => {
  await page.goto("/login");
  await page.fill('input[name="email"]', "user@example.com");
  await page.fill('input[name="password"]', "password123");
  await page.click('button[type="submit"]');
  await expect(page).toHaveURL("/dashboard");
});
```

**Run E2E tests:**

```bash
pnpm test:e2e
```

---

## CI Gate System

Before merging any code, all CI gates must pass. Run the full gate suite locally:

```bash
pnpm ci:gate
```

This runs:

1. **Logger Gate** — Validates logging patterns (no `console.log`)
2. **Export Contracts Gate** — Validates lazy-loaded module exports
3. _(More gates added as needed)_

### Individual Gates

Run specific gates for faster feedback:

```bash
# Logger patterns only
pnpm --filter @afenda/api run ci:logger

# Export contracts only
pnpm ci:contracts
```

### Auto-Fix Mode

Some gates support automatic fixes:

```bash
pnpm ci:gate --fix
```

This will:

- Replace `console.log` with proper logger calls (where safe)
- Fix other auto-fixable violations

**Always review auto-fixes before committing!**

---

## Dependency Governance

All dependency changes must follow the workspace dependency governance policy:

- [DEPENDENCY_GOVERNANCE_POLICY.md](DEPENDENCY_GOVERNANCE_POLICY.md)

Before submitting a dependency-related PR:

1. Classify the change as patch, minor, or major.
2. Document the reason (security, bug fix, performance, required feature, compatibility).
3. Run full checks locally:

  ```bash
  pnpm install --frozen-lockfile
  pnpm ci:gate
  pnpm lint
  pnpm typecheck
  ```

4. For major upgrades, include migration notes and rollback plan in PR description.
5. Ensure shared libraries stay version-aligned across workspace packages.

Recommended monthly maintenance command:

```bash
pnpm outdated --recursive
```

---

## Export Contracts

**Export contracts** are critical for preventing runtime failures in lazy-loaded routes and metadata-driven renderers.

### What Are Export Contracts?

Contract tests validate that dynamically imported modules export the expected shape:

```typescript
// Contract test for a renderer
import * as MetaListV2Module from "./MetaListV2";

it("exports MetaListV2 as callable component", () => {
  expect(typeof MetaListV2Module.MetaListV2).toBe("function");
});
```

### Why Are They Required?

TypeScript **cannot validate** lazy imports:

```tsx
// This builds successfully even if MetaListV2 doesn't exist!
const MetaListV2 = lazy(async () => {
  const module = await import("~/renderers/MetaListV2");
  return { default: module.MetaListV2 }; // ⚠️ No type checking
});
```

Without contract tests, missing exports cause runtime crashes:

```
Error: Element type is invalid. Received a promise that resolves to: undefined.
```

### When to Add Contract Tests

#### ✅ Always Required

1. **Lazy-loaded route pages** — Add to `lazy-pages.contract.test.ts`
2. **Metadata-driven renderers** — Create `Renderer.contract.test.ts`
3. **Dynamically discovered modules** — Any runtime import

#### ❌ Not Required

1. Eagerly imported components (TypeScript catches errors)
2. Static utility functions (build fails on import errors)
3. Internal implementation details

### Adding a New Lazy Page

When adding a new lazy-loaded route:

1. **Create the page component**:

   ```typescript
   // apps/web/src/pages/new-page.tsx
   export default function NewPage() {
     return <div>New Page Content</div>;
   }
   ```

2. **Add route definition**:

   ```typescript
   // apps/web/src/routes/index.tsx
   const NewPage = lazy(() => import("~/pages/new-page"));
   ```

3. **Add to contract test**:

   ```typescript
   // apps/web/src/routes/lazy-pages.contract.test.ts
   const lazyPageModulePaths = [
     // ... existing paths
     "../pages/new-page", // ← Add this line
   ] as const;
   ```

4. **Verify the contract**:
   ```bash
   pnpm ci:contracts
   ```

### Adding a New Renderer

When adding a metadata-driven renderer:

1. **Create the renderer**:

   ```typescript
   // apps/web/src/renderers/MetaGridV2.tsx
   export function MetaGridV2({ model }: MetaGridV2Props) {
     // ...implementation
   }
   ```

2. **Create contract test**:

   ```typescript
   // apps/web/src/renderers/MetaGridV2.contract.test.ts
   import * as MetaGridV2Module from "./MetaGridV2";

   describe("MetaGridV2 renderer contract", () => {
     it("exports MetaGridV2 as callable component", () => {
       expect(typeof MetaGridV2Module.MetaGridV2).toBe("function");
     });
   });
   ```

3. **Update package script** to include new contract:

   ```json
   // apps/web/package.json
   {
     "test:contracts": "vitest run src/routes/lazy-pages.contract.test.ts src/renderers/*.contract.test.ts"
   }
   ```

4. **Verify the contract**:
   ```bash
   pnpm ci:contracts
   ```

### Full Documentation

For complete export contract documentation, see:

- [apps/web/docs/export-contracts.md](./apps/web/docs/export-contracts.md)

---

## Pull Request Process

### Before Opening a PR

1. ✅ All tests pass (`pnpm test`)
2. ✅ All CI gates pass (`pnpm ci:gate`)
3. ✅ Code follows style guidelines
4. ✅ Commit messages follow convention
5. ✅ Branch is up-to-date with `master`

### PR Requirements

- **Title**: Use conventional commit format
  - `feat: add user profile page`
  - `fix: resolve login redirect issue`
  - `docs: update export contracts guide`
  - `refactor: simplify meta list selection logic`

- **Description**: Include:
  - What changed and why
  - How to test the changes
  - Screenshots (for UI changes)
  - Related issues/tickets

- **Tests**: Add tests for new features or bug fixes

- **Documentation**: Update docs if behavior changes

### Review Process

1. Automated checks must pass (CI gates, tests, build)
2. At least one approval from a maintainer
3. No unresolved comments
4. PR is mergeable (no conflicts)

### After Merge

- Delete your feature branch
- Verify changes in the deployed environment
- Close related issues/tickets

---

## Questions?

- Open an issue for bugs or feature requests
- Ask in team chat for development questions
- Check existing documentation in `/docs` folders

Thank you for contributing! 🎉
