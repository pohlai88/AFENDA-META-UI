# Dependency Change Checklist

Use this checklist in every PR that adds, removes, or upgrades dependencies.

## 1. Change Summary

- Scope: runtime, development, or infrastructure dependency
- Type: patch, minor, or major
- Motivation: security, bug fix, performance, feature, compatibility

## 2. Admission and Risk Checks

- New dependency is actively maintained
- License is compatible
- Bundle/runtime impact reviewed
- No known repeated critical security issues
- For runtime additions, architecture review completed

## 3. Workspace Consistency

- Shared packages remain version-aligned across workspace
- No duplicate runtime versions introduced without justification
- Lockfile updated intentionally

## 4. Verification

Run and attach outcome in PR:

```bash
pnpm install --frozen-lockfile
pnpm ci:gate
pnpm lint
pnpm typecheck
```

For security-sensitive changes also run:

```bash
pnpm audit
```

## 5. Major Upgrade Requirements

If this is a major version change:

- Migration branch used
- Migration document added or updated
- Rollback plan documented
- Full regression tests passed

## 6. Documentation

- Update [monorepo-dependencies.md](../.agents/docs/monorepo-dependencies.md)
- Update [dependency-validation-report.md](../.agents/docs/dependency-validation-report.md) when applicable
- Link to [DEPENDENCY_GOVERNANCE_POLICY.md](DEPENDENCY_GOVERNANCE_POLICY.md) in PR notes