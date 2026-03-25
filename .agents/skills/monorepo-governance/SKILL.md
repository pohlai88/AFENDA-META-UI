---
name: monorepo-governance
description: Monorepo dependency governance, package boundaries, API stability policies, and workspace topology management. Use when enforcing dependency admission rules, managing package lifecycle, preventing version drift, or governing workspace structure. Based on AFENDA-META-UI production governance policies.
---

# Monorepo Governance

Enforce enterprise-grade governance for monorepo workspaces including dependency admission, API stability, package boundaries, and workspace topology management.

## When to Use This Skill

Use this skill when:

- Adding new dependencies to the workspace
- Evaluating dependency upgrades (patch, minor, major)
- Defining package boundaries and ownership
- Managing workspace topology (creating, merging, or deprecating packages)
- Enforcing API stability policies
- Preventing dependency version drift
- Conducting dependency audits
- Creating CODEOWNERS policies
- Implementing architectural protection rules

## Core Principles

### 1. Stability Over Novelty

Dependencies must be chosen for **reliability and long-term maintenance** rather than trend value.

**Decision Framework**:

- Prefer mature packages with 3+ years of maintenance history
- Favor packages with predictable release cadence
- Avoid pre-1.0 packages in production runtime dependencies
- Choose packages with clear governance models

### 2. Intentional Evolution

All major upgrades are treated as **planned engineering initiatives**, not routine maintenance.

**Major Upgrade Checklist**:

- [ ] Create isolated migration branch
- [ ] Document breaking changes
- [ ] Assess cross-package impact
- [ ] Create rollback plan
- [ ] Schedule migration window
- [ ] Pass full regression testing

### 3. System Integrity

The monorepo is a **unified system**. Dependency decisions must consider cross-package impact.

**System-Wide Checks**:

```bash
# Check for duplicate dependencies
pnpm list --depth=Infinity | grep -E "^├─|^│  ├─" | sort | uniq -d

# Verify workspace consistency
pnpm exec manypkg check

# Audit transitive dependencies
pnpm audit --prod
```

### 4. Auditability

Every dependency change must be traceable to a clear reason:

- Security vulnerability
- Bug fix required for production
- Performance improvement
- Required feature
- Ecosystem compatibility

**Required Documentation**:

```markdown
## Dependency Change: [Package Name]

**Type**: Security | Bug Fix | Feature | Performance | Ecosystem

**Version**: `1.0.0` → `2.0.0`

**Rationale**: [Explain why this change is necessary]

**Impact Assessment**:

- Runtime packages affected: [list]
- Breaking changes: [list or "none"]
- Migration steps: [document or link]

**Rollback Plan**: [Document how to revert if issues arise]
```

---

## Dependency Classification

### Runtime Dependencies

Packages required for **production execution**.

**Examples**:

- Framework libraries (React, Vue, Next.js)
- Database clients (Drizzle ORM, pg, Prisma)
- Validation libraries (Zod, Yup)
- Authentication SDKs (Auth0, Clerk)

**Rules**:

- ✅ Must have strong maintenance history (50K+ weekly downloads)
- ✅ Must not be abandoned (updated within 6 months)
- ✅ Must not be experimental (stable 1.0+ release preferred)
- ⚠️ Major upgrades require migration planning
- ❌ No packages with single-maintainer risk in critical paths

**Admission Checklist**:

```markdown
## Runtime Dependency Admission: [Package Name]

- [ ] **Maintained**: Last update within 6 months
- [ ] **Popular**: 50K+ weekly npm downloads OR established ecosystem presence
- [ ] **Licensed**: MIT, Apache-2.0, BSD, or compatible
- [ ] **Secure**: No high-severity CVEs in past year
- [ ] **Sized**: Bundle impact < 50KB gzipped (or justified)
- [ ] **Necessary**: Feature cannot be reasonably built in-house
- [ ] **Architectural Review**: Approved by architecture team
```

### Development Dependencies

Tooling used only during **development and build**.

**Examples**:

- Linters (ESLint, Prettier, Stylelint)
- Testing frameworks (Vitest, Playwright, Testing Library)
- Build tools (Vite, esbuild, TypeScript)
- Code generators

**Rules**:

- ✅ Can be updated more frequently (follow minor/patch freely)
- ✅ Must not affect production behavior
- ✅ Should remain aligned across workspace
- ⚠️ Major versions should coordinate across all packages simultaneously

**Upgrade Policy**:
| Update Type | Approval | Testing |
|-------------|----------|---------|
| Patch | Auto-approve | Run tests |
| Minor | Team decision | Run tests + manual check |
| Major | Planned wave | Full regression + migration docs |

### Infrastructure Dependencies

Packages that define **platform behavior**.

**Examples**:

- Build systems (Turborepo, Nx, pnpm)
- Compilers (TypeScript, Babel, SWC)
- Framework runtimes (Next.js, Vite, Remix)

**Rules**:

- ✅ Version **pinned deliberately** (exact versions in catalog)
- ⚠️ Upgraded only in **scheduled platform migration waves**
- ✅ Changes must be **validated across all apps**
- ❌ No partial upgrades — all or nothing

**Migration Wave Requirements**:

```markdown
## Infrastructure Upgrade Wave: [Tool Name] v[X] → v[Y]

**Schedule**: [Date range]

**Affected Packages**: [List all workspace packages]

**Breaking Changes**: [Detailed list]

**Migration Steps**:

1. [Step-by-step upgrade process]
2. [Configuration changes needed]
3. [Code changes needed per package]

**Validation**:

- [ ] All builds pass
- [ ] All tests pass
- [ ] E2E tests pass
- [ ] Local preview tested in all apps
- [ ] Bundle size regression check
- [ ] Performance regression check

**Rollback Plan**: [Git tag to revert to + restore commands]
```

---

## Versioning Strategy

### Allowed Update Types

| Update Type                   | Policy                 | Approval Required | CI Requirements          |
| ----------------------------- | ---------------------- | ----------------- | ------------------------ |
| **Patch** (`1.0.0` → `1.0.1`) | Auto-approve           | ❌ No             | CI must pass             |
| **Minor** (`1.0.0` → `1.1.0`) | Allowed after review   | ❌ No             | CI + manual verification |
| **Major** (`1.0.0` → `2.0.0`) | Planned migration only | ✅ Yes            | Full regression + docs   |

### Version Pinning Rules

**Must pin exact versions** (no ranges):

- Core frameworks (`react`, `next`, `vue`)
- Database layer (`drizzle-orm`, `drizzle-kit`, `pg`)
- Build tools (`vite`, `turborepo`, `typescript`)
- Type system (`@types/node`, `@types/react`)

**Allow ranges** (`^` or `~`):

- UI utilities (`clsx`, `date-fns`, `lodash`)
- Non-critical helpers (`chalk`, `ora`, `prompts`)
- Dev tools (`prettier`, `eslint-plugin-*`)

**Catalog Example** (pnpm-workspace.yaml):

```yaml
catalog:
  # Pinned — infrastructure
  drizzle-orm: 1.0.0-beta.19
  drizzle-kit: 1.0.0-beta.19
  typescript: 5.7.2
  vite: 6.0.7

  # Pinned — runtime critical
  react: 19.0.0
  react-dom: 19.0.0
  next: 15.1.6

  # Range — utilities (safe to float)
  zod: ^4.3.6
  clsx: ^2.1.1
  date-fns: ^4.1.0

  # Range — dev tools
  vitest: ^4.1.1
  eslint: ^9.18.0
  prettier: ^3.4.2
```

### Upgrade Governance

#### Immediate Upgrades (Auto-Approve)

Allowed when **all** are true:

- ✅ Patch or minor version
- ✅ No breaking changes in changelog
- ✅ No configuration changes required
- ✅ CI passes
- ✅ No bundle size regression (< 5% increase)

**Command**:

```bash
# Update specific package
pnpm update <package-name> --workspace-root

# Verify no drift
pnpm list --dev <package-name>

# Run CI gate
pnpm ci:gate
```

#### Scheduled Upgrade Waves (Planned Migration)

Required when **any** are true:

- ⚠️ Major version change
- ⚠️ API surface changes
- ⚠️ Build pipeline impact
- ⚠️ Runtime behavior changes
- ⚠️ Bundle size increase > 10%

**Upgrade Wave Workflow**:

```bash
# 1. Create migration branch
git checkout -b migration/package-name-v2

# 2. Update in catalog
# Edit pnpm-workspace.yaml catalog

# 3. Install and verify
pnpm install
pnpm -r exec -- pnpm why <package-name>  # Check usage across workspace

# 4. Run full test suite
pnpm test:all
pnpm test:e2e

# 5. Document migration
# Create docs/migrations/package-name-v2.md

# 6. Create PR with "migration" label
git push origin migration/package-name-v2
```

---

## Workspace Consistency Rules

### Single Version Policy

**Rule**: Shared libraries must use the **same version** across all packages.

**Violations** to check:

```bash
# Find duplicate versions
pnpm list --depth=Infinity <package-name>

# Should see only ONE version; if multiple versions appear → violation
```

**Enforcement**:

```json
// .npmrc or .yarnrc.yml
{
  "overrides": {
    // Force single version if multiple appear
    "react": "$react",
    "react-dom": "$react-dom"
  }
}
```

### Centralized Version Control

**Rule**: Workspace dependency catalogs are the **single source of truth**.

**Implementation**:

```yaml
# pnpm-workspace.yaml
catalog:
  react: 19.0.0  # ← Single source of truth

# All package.json files reference:
{
  "dependencies": {
    "react": "catalog:"  # ← Resolves to catalog version
  }
}
```

**Benefits**:

- One place to update versions
- No drift possible
- Auditability — version changes visible in single file

### Duplicate Dependency Prevention

**Rule**: Multiple versions of the same **runtime dependency** are not allowed unless technically required.

**Check for duplicates**:

```bash
pnpm list --depth=Infinity | grep "^├─\|^│  ├─" | sort | uniq -d
```

**Resolution strategies**:

```yaml
# pnpm overrides (package.json at workspace root)
{
  "pnpm": {
    "overrides": {
      "lodash": "4.17.21",  // Force single version
      "react": "$react"      // Use catalog version
    }
  }
}
```

---

## Package Boundaries & Ownership

### CODEOWNERS Configuration

Define **ownership boundaries** for monorepo packages.

**File**: `.github/CODEOWNERS`

```
# Workspace root
/package.json @architecture-team
/pnpm-workspace.yaml @architecture-team
/turbo.json @platform-team

# Apps
/apps/api/ @backend-team
/apps/web/ @frontend-team

# Packages
/packages/db/ @backend-team @data-team
/packages/ui/ @frontend-team @design-system-team
/packages/meta-types/ @architecture-team

# Docs & Governance
/docs/DEPENDENCY_GOVERNANCE_POLICY.md @architecture-team
/docs/CONTRIBUTING.md @all-teams
```

### Package Boundary Rules

**Rule**: Packages must **not couple** beyond their declared dependencies.

**Enforcement**:

```bash
# Check boundaries with Turborepo
turbo boundaries check

# Example boundary rules (turbo.json)
{
  "boundaries": {
    "tags": {
      "app": ["apps/*"],
      "package": ["packages/*"],
      "ui": ["packages/ui"],
      "backend": ["apps/api", "packages/db"]
    },
    "rules": [
      {
        "tag": "app",
        "allow": ["package"]  // Apps can depend on packages
      },
      {
        "tag": "ui",
        "disallow": ["backend"]  // UI cannot import backend code
      }
    ]
  }
}
```

### API Stability Policies

Manage **public API contracts** for internal packages.

**Package Stability Levels**:

- **Stable**: Breaking changes require major version bump + migration guide
- **Beta**: Minor versions may introduce breaking changes (documented)
- **Experimental**: No stability guarantees; can change freely

**Documentation** (package README):

```markdown
## Stability: Stable

This package follows semantic versioning strictly.

**Public API**: All exported types and functions in `src/index.ts`

**Breaking Change Policy**: Major version bumps only, with:

- Migration guide in docs/
- Deprecation period (1 minor version minimum)
- Codemods provided when possible

**Internal API**: Files under `src/internal/` are NOT public API
```

**Deprecation Workflow**:

```typescript
// 1. Mark as deprecated (v1.5.0)
/** @deprecated Use `newFunction()` instead. Will be removed in v2.0.0 */
export function oldFunction() { ... }

// 2. Log warning in runtime
export function oldFunction() {
  console.warn('DEPRECATION: oldFunction() is deprecated. Use newFunction().');
  return newFunction();
}

// 3. Remove in next major (v2.0.0)
// Document in CHANGELOG.md and migration guide
```

---

## Workspace Topology Management

### Creating New Packages

**Decision Criteria** (when to create a new package):

- ✅ Code is **reused by 2+ apps/packages**
- ✅ Domain is **clearly bounded** (single responsibility)
- ✅ **No circular dependencies** with existing packages
- ❌ Don't create package just for "organization" — co-locate first

**New Package Checklist**:

```bash
# 1. Create package structure
mkdir -p packages/your-package/src
cd packages/your-package

# 2. Initialize package.json
pnpm init

# Edit package.json:
{
  "name": "@repo/your-package",
  "version": "0.1.0",
  "main": "./src/index.ts",
  "types": "./src/index.ts",
  "dependencies": {
    "typescript": "catalog:"
  }
}

# 3. Add to pnpm-workspace.yaml (if not using glob)
# packages:
#   - 'packages/*'  # Already covered if using glob

# 4. Create src/index.ts (public API)
# 5. Create tsconfig.json (extend base)
# 6. Create README.md (document purpose + stability level)
# 7. Add to CODEOWNERS
# 8. Run pnpm install at workspace root
```

**Template tsconfig.json**:

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "./dist",
    "rootDir": "./src"
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

### Merging/Deprecating Packages

**When to merge packages**:

- Similar domains with high coupling
- One package only has 1-2 consumers
- Circular dependency issues

**When to deprecate packages**:

- No longer used by any app
- Functionality replaced by platform capability
- Technical debt exceeds value

**Deprecation Workflow**:

```markdown
## Package Deprecation: @repo/old-package

**Reason**: Replaced by @repo/new-package

**Timeline**:

- v1.0.0: Mark as deprecated in README + package.json
- v1.1.0: Add runtime deprecation warnings
- v1.2.0: Final version; stop accepting changes
- v2.0.0: Remove package from workspace

**Migration Guide**: docs/migrations/old-package-deprecation.md
```

---

## Security & Supply Chain

### Continuous Monitoring

**CI Integration**:

```yaml
# .github/workflows/security.yml
name: Security Audit
on: [push, pull_request]

jobs:
  audit:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
      - run: pnpm audit --prod
      - run: pnpm audit --audit-level=high --prod # Fail on high severity
```

**Tools to Integrate**:

- `npm audit` / `pnpm audit` — Built-in vulnerability scanning
- Snyk — Advanced vulnerability + license checks
- Socket.dev — Supply chain risk analysis
- Dependabot — Automated security PRs

### Mandatory Patching

**High-severity vulnerabilities** must be patched **immediately**.

**Severity Levels & Response Time**:
| Severity | Response Time | Action |
|----------|--------------|--------|
| Critical | < 24 hours | Emergency patch + deploy |
| High | < 72 hours | Scheduled patch |
| Medium | Next sprint | Planned upgrade |
| Low | Quarterly review | Optional upgrade |

**Patching Workflow**:

```bash
# 1. Identify vulnerability
pnpm audit

# 2. Check if patch available
pnpm audit fix  # For minor/patch fixes

# 3. If major version required → create migration branch
git checkout -b security/CVE-YYYY-XXXXX

# 4. Update dependency + document
# Edit pnpm-workspace.yaml catalog OR specific package.json

# 5. Test thoroughly
pnpm test:all

# 6. Create PR with "security" label
```

### Supply Chain Risk Reduction

**Avoid packages that**:

- Have **many transitive dependencies** (> 10 levels deep)
- Are maintained by **single individuals** (no organization/team)
- Show **inconsistent release patterns** (long gaps → sudden burst)

**Dependency Graph Analysis**:

```bash
# Check transitive deps
pnpm why <package-name>

# See full dependency tree
pnpm list --depth=Infinity <package-name>

# Analyze bundle size contribution
pnpm exec vite-bundle-visualizer  # or webpack-bundle-analyzer
```

---

## Architectural Protection Rules

### Server-Client Separation

**Rule**: Server-only packages must **never** appear in frontend bundles.

**Violation Examples**:

```typescript
// ❌ WRONG: Importing server code in frontend
import { db } from "@repo/db"; // Backend package in frontend bundle!

// ✅ CORRECT: Use API calls
const data = await fetch("/api/data");
```

**Enforcement**:

```javascript
// vite.config.ts (apps/web)
export default defineConfig({
  build: {
    rollupOptions: {
      external: [
        "@repo/db", // Mark as external → error if imported
        "node:*", // Prevent Node.js APIs in frontend
      ],
    },
  },
});
```

### Framework Boundary Respect

**Rule**: Framework plugins must not introduce **hidden runtime coupling**.

**Example Violation**:

```json
// ❌ Plugin introduces hidden React dependency
{
  "devDependencies": {
    "vite-plugin-example": "1.0.0" // Internally depends on React 18
  },
  "dependencies": {
    "react": "19.0.0" // Conflict!
  }
}
```

**Prevention**:

- Audit plugin dependencies before installing
- Prefer plugins that use `peerDependencies` over `dependencies`

### Core Layer Protection

**Changes affecting the following require architectural review**:

- Rendering model (React → Vue, SSR changes)
- Routing (Next.js router, file-based routing)
- State management (Redux → Zustand)
- Database contracts (Drizzle schema changes)
- Build pipeline (Vite → Webpack)

**Review Process**:

1. Create RFC document explaining change
2. Architecture team reviews impact
3. Approval required before implementation
4. Migration guide documented
5. Implementation in isolated branch

---

## Operational Procedures

### Monthly Maintenance

**Checklist**:

```bash
# Run outdated checks
pnpm outdated

# Apply safe updates (patch/minor)
pnpm update --latest

# Review security alerts
pnpm audit

# Verify no issues
pnpm ci:gate
pnpm test:all
```

### Quarterly Review

**Tasks**:

- [ ] Remove dead dependencies (`depcheck` or `knip`)
- [ ] Evaluate ecosystem shifts (are key packages still maintained?)
- [ ] Assess upgrade candidates (major versions to plan)
- [ ] Bundle size analysis (any unexpected bloat?)
- [ ] License compliance check (any new license issues?)

**Commands**:

```bash
# Find unused deps
pnpm exec knip

# Analyze bundle
pnpm --filter @repo/web exec vite-bundle-visualizer
```

### Annual Platform Review

**Strategic Planning**:

- Plan major framework migrations (Next.js 14 → 15)
- Evaluate long-term tooling viability (is Vite still the best choice?)
- Reassess architectural alignment (is our stack still optimal?)

---

## Decision Framework

### Upgrade immediately if:

- ✅ Security risk exists (high/critical CVE)
- ✅ Bug affects production user experience
- ✅ Performance gains are significant (> 20% improvement)

### Defer if:

- ⚠️ Upgrade is cosmetic (new API but current works fine)
- ⚠️ Ecosystem still stabilizing (wait for .1 or .2 release)
- ⚠️ Migration cost exceeds benefit

### Avoid if:

- ❌ Current version is stable and meets needs
- ❌ Library is mature with no compelling new features
- ❌ No strategic value gained

---

## Key Takeaways

1. **Stability Over Novelty**: Prefer proven packages over trendy ones
2. **Single Source of Truth**: Use workspace catalogs for version management
3. **Boundary Enforcement**: Use CODEOWNERS + Turborepo boundaries
4. **API Stability**: Document public APIs + deprecation policies
5. **Security First**: Mandatory patching + continuous monitoring
6. **Auditability**: Every change needs documented rationale
7. **System Thinking**: Consider cross-package impact for all decisions

---

## Related Skills

- **pnpm-workspace**: Workspace protocol, catalogs, filters
- **turborepo**: Task orchestration, caching, boundaries
- **monorepo-management**: Setup patterns, tooling
- **monorepo-workflows**: CI/CD, versioning, publishing
- **changesets**: Versioning automation
