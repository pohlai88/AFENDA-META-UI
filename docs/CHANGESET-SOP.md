# Changeset & Release SOP

## Overview

This document provides Standard Operating Procedures (SOP) for managing changesets, versioning, and releases for the AFENDA-META-UI monorepo. Changesets follow semantic versioning (semver) and automatically generate changelogs.

## Terminology

- **Changeset**: A structured record of changes to one or more packages with a semver bump (patch, minor, major) and changelog entry.
- **Changelog**: Auto-generated markdown documenting all changes per release (CHANGELOG.md per package).
- **Version Promotion**: Running changesets to bump package versions and update package.json files.
- **Publication**: Publishing versioned packages to npm registry (requires NPM_TOKEN).

## When to Create a Changeset

Create a changeset when:

1. **Adding a new feature** (semver: minor)
   - New API endpoint
   - New package export
   - New utility function (backward-compatible)

2. **Fixing a bug** (semver: patch)
   - Correction to existing behavior
   - Non-breaking improvement
   - Performance fix

3. **Breaking changes** (semver: major)
   - Removed exports
   - API contract change
   - Package rename

4. **Internal upgrades** (semver: patch)
   - Dependency security updates
   - Refactors with no API change

**Do NOT create changesets for**:
- Documentation-only changes
- Internal test additions
- CI/infrastructure changes (use `[skip-release]` commit flag)
- Typo fixes not affecting public API

## How to Create a Changeset

### Step 1: Stage your changes

```bash
git add apps/api/src/modules/sales/new-feature.ts
git add packages/meta-types/src/index.ts
```

### Step 2: Create changeset entry

Run the interactive CLI:

```bash
pnpm changeset add
```

This will prompt you:

1. **Which packages changed?** (select with space, confirm with enter)
   ```
   ◉ @afenda/api
   ◯ @afenda/meta-types
   ◉ @afenda/db
   ```

2. **What type of change?** (patch, minor, major)
   ```
   ◯ patch
   ◉ minor
   ◯ major
   ```

3. **Changelog entry** (what did you add/fix?)
   ```
   Add command-owned tenant mutations under dual-write policy with event append
   ```

A `.changeset/*.md` file will be created automatically.

### Step 3: Review and commit

```bash
git add .changeset
git commit -m "chore: add changeset for tenant command service"
```

Example `.changeset/brave-tokens-12345.md`:

```markdown
---
"@afenda/api": minor
"@afenda/db": patch
---

Add tenant command service under shared mutual policy registry with event append and checkpoint persistence. Update truth-config.ts to include platform.tenant.command_dual_write policy.
```

## Versioning Strategy

### Semantic Versioning Rules

| Bump | Trigger | Example |
| ---- | -------- | ------- |
| **patch** | Bug fixes, internal updates | 0.5.0 → 0.5.1 |
| **minor** | New backward-compatible features | 0.5.0 → 0.6.0 |
| **major** | Breaking changes, API removals | 0.5.0 → 1.0.0 |

### Changeset Grouping Rules

**Single changeset per PR when possible**. Multiple changesets only if:
- Same package has independent major/minor/patch bumps
- Different packages require different bump types

Example (acceptable):
```
.changeset/feature-tenant.md → @afenda/api (minor), @afenda/db (patch)
```

Example (questionable):
```
.changeset/feature-tenant.md → @afenda/api (minor)
.changeset/feature-org.md → @afenda/api (minor)
# Two PRs? Consolidate into one changeset if same sprint.
```

## Release Workflow

### Prerequisites

- All changesets merged to `master`
- CI pipeline passing (all tests green)
- No unresolved review comments

### Automated Release (GitHub Actions)

On push to master with `.changeset/*.md` changes:

1. **Changesets Release workflow triggers**
   - Detects `.changeset` changes
   - Runs `pnpm changeset version` (bumps packages)
   - Generates CHANGELOG.md entries
   - Commits updated package.json files
   - Publishes to npm (if NPM_TOKEN configured)

**Workflow steps**:
```
setup (check changesets) 
  ↓
version (bump + changelog)
  ↓
publish (npm registry)
```

### Manual Release (if needed)

```bash
# 1. Check pending changesets
pnpm changeset status

# 2. Version packages
pnpm changeset version

# 3. Commit
git add -A
git commit -m "chore: version packages"
git push origin master

# 4. Publish (requires NPM_TOKEN in environment)
pnpm changeset publish

# 5. Verify
npm view @afenda/api@latest version
```

## PR Review Checklist

**Before approving a PR with code changes**:

- [ ] Changeset file exists in `.changeset/`
- [ ] Changeset references **all** modified packages
- [ ] Semver bump is appropriate (patch, minor, or major)
- [ ] Changelog entry is clear and user-facing
- [ ] If internal-only change, confirm "do not create changeset" reason documented

## Required Governance Status Checks

The following checks are required before merge:

1. GitHub Actions workflow `Release Governance` job `Release Governance Required Status`.
2. GitHub Actions workflow `CI Pipeline` job `governance` step `Release governance checks`.
3. GitHub Actions workflow `CI Pipeline` job `governance` step `Non-sales promotion gate checks`.

Branch protection guidance:

1. Add `Release Governance / Release Governance Required Status` to required checks.
2. Keep `CI Pipeline / System Integrity Gates` required.
3. Do not allow bypasses except emergency incident response.

## Release Promotion Execution Checks

Run these checks before approving version promotion:

```bash
# Validate release governance wiring and SOP coverage
pnpm ci:release:governance

# Validate only SOP/documentation requirements
pnpm ci:release:sop
```

Behavior:

1. Pull requests with release-impacting code changes must include `.changeset/*.md` unless `[skip-release]` is used for infra-only scope.
2. `changesets-release.yml` must retain version and publish stages.
3. `.changeset/config.json` must keep automated promotion settings (`baseBranch=master`, `commit=true`).

## Rollback & Amendment

### Amend unreleased changeset

Before merge to master:

```bash
# Edit the .changeset/*.md file
# Update changelog text or semver bump
git add .changeset
git commit --amend -m "chore: update changeset entry"
```

### Retract released version

If a published version has a critical bug:

```bash
# 1. Fix the bug in a new changeset
pnpm changeset add

# 2. Select "patch" bump
# Choose original package

# 3. Enter changelog
# Example: "Fix critical memory leak in projection runtime (reverts 0.5.2)"

# 4. Merge and auto-release
# New version: 0.5.3
```

### Deprecation notice

For APIs that need lead time:

**First release** (minor bump):
```markdown
---
"@afenda/meta-types": minor
---

Deprecate `resolveWithCache()`. Use `projectionRuntime.replay()` instead.
Migration guide: https://docs.afenda.io/upgrade-v0.6
```

**Follow-up release** (major bump, 2-3 releases later):
```markdown
---
"@afenda/meta-types": major
---

BREAKING: Remove deprecated `resolveWithCache()`. Use `projectionRuntime.replay()`. 
See migration: https://docs.afenda.io/upgrade-v0.6
```

## FAQ

**Q: I forgot to create a changeset. Can I add it later?**
A: Yes, before merge. Create the changeset and push. CI will re-run on the new commit.

**Q: Can I publish without merging to master?**
A: Not via automated CI. Manual publish requires:
  ```bash
  pnpm changeset publish --from-ref origin/feature-branch
  ```
  Not recommended for production releases.

**Q: What if two changesets conflict?**
A: Changesets use random names (e.g., `brave-tokens-12345.md`). Filesystem conflicts are rare. If they occur: resolve file conflicts, commit both changesets.

**Q: Who can publish?**
A: Anyone with GitHub push access + npm publish permissions (requires NPM_TOKEN).

**Q: Do I need to version internal packages?**
A: Only if they're exported/consumed. Example: `@afenda/meta-types` yes, `packages/test-fixtures` (internal only) no.

## Troubleshooting

### Changeset not being detected

```bash
# Verify file location and format
ls .changeset/*.md

# Verify YAML frontmatter
cat .changeset/<name>.md | head -10
# Should show:
# ---
# "@package/name": patch
# ---
```

### Version not bumping in package.json

```bash
# Check changeset syntax
pnpm changeset version --dry-run

# If error, fix .changeset/*.md and retry
```

### npm publish fails

```bash
# Verify NPM_TOKEN
echo $NPM_TOKEN  # Should not be empty

# Verify package access
npm whoami

# Verify package.json has publishConfig (if private)
cat packages/meta-types/package.json | grep -A 3 publishConfig
```

## Contact & Questions

- **Changesets docs**: https://github.com/changesets/changesets
- **Release automation**: See `.github/workflows/changesets-release.yml`
- **Questions**: Slack #engineering-process or create GitHub Discussion

---

**Last Updated**: 2026-03-29
**Maintained by**: @pohlai88
