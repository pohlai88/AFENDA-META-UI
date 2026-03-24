# Logger CI Gate Integration Checklist

Quick reference for integrating the logger CI gate into your workflow.

## ✅ Installation (Completed)

- [x] CI gate structure created at `tools/ci-gate/logger/`
- [x] Dependencies installed (`glob@13.0.6`)
- [x] Package scripts added to root `package.json`
- [x] Documentation created (README, MIGRATION, SUMMARY)
- [x] Example templates created
- [x] Mock logger for tests created

## 🚀 Ready to Use

### Run Validation

```bash
# Full validation suite
pnpm ci:logger

# Expected output (current state)
# ✅ Proper Imports: PASSED
# ✅ req.log Usage: PASSED  
# ✅ Message Format: PASSED
# ❌ No Console Usage: 33 error(s) (in progress)
```

### Files & Locations

| File | Purpose | Lines |
|------|---------|-------|
| `tools/ci-gate/logger/index.mjs` | Main entry point | 60 |
| `tools/ci-gate/logger/README.md` | Full documentation | 450 |
| `tools/ci-gate/logger/MIGRATION.md` | Migration guide | 200 |
| `tools/ci-gate/logger/SUMMARY.md` | Implementation summary | 400 |
| `checks/no-console-usage.mjs` | Console validation | 80 |
| `checks/proper-imports.mjs` | Import validation | 70 |
| `checks/req-log-usage.mjs` | Route handler validation | 90 |
| `checks/message-format.mjs` | API signature validation | 60 |
| `templates/mock-logger.ts` | Test utilities | 70 |

**Total**: 9 files, ~1,500 lines

## 📋 Integration Options

### Option 1: CI/CD Pipeline (Recommended)

Add to `.github/workflows/ci.yml`:

```yaml
name: CI
on: [push, pull_request]
jobs:
  logger-validation:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v3
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: pnpm
      - run: pnpm install
      - name: Validate Logger Patterns
        run: pnpm ci:logger
```

**Status**: ⏳ Not yet implemented (awaiting CI/CD setup)

### Option 2: Pre-commit Hook

Add to `.husky/pre-commit`:

```bash
#!/usr/bin/env sh
. "$(dirname -- "$0")/_/husky.sh"

# Run logger CI gate
node tools/ci-gate/logger/index.mjs || {
  echo "❌ Logger CI gate failed. Run 'pnpm ci:logger' to see details."
  exit 1
}
```

**Status**: ⏳ Optional (can be intrusive during development)

### Option 3: VSCode Task

Add to `.vscode/tasks.json`:

```json
{
  "version": "2.0.0",
  "tasks": [
    {
      "label": "Validate Logger Usage",
      "type": "shell",
      "command": "pnpm ci:logger",
      "problemMatcher": [],
      "presentation": {
        "reveal": "always",
        "panel": "new"
      }
    }
  ]
}
```

**Status**: ⏳ Optional

### Option 4: Package Script (Current)

Already available:

```bash
pnpm ci:logger          # Run validation
pnpm ci:logger:fix      # Run with auto-fix (future)
```

**Status**: ✅ Implemented and working

## 🔧 Configuration

### Excluding Files

Edit `tools/ci-gate/logger/checks/no-console-usage.mjs`:

```javascript
const ALLOWED_FILES = [
  "apps/api/src/config/index.ts",
  "apps/api/src/utils/generateToken.ts",
  "apps/api/src/meta/introspect-cli.ts",
  "apps/api/src/meta/test-rbac-expressions.ts",
  "apps/web/src/components/error-boundary.tsx",
  // Add more exceptions here
];
```

### Adding New Checks

1. Create `checks/your-check.mjs`
2. Export async function returning `{ errors, warnings }`
3. Register in `index.mjs` CHECKS array
4. Update README.md

Example:

```javascript
// checks/pii-detection.mjs
export async function piiDetection({ fix }) {
  const errors = [];
  // ... validation logic
  return { errors };
}

// index.mjs
import { piiDetection } from "./checks/pii-detection.mjs";

const CHECKS = [
  // ... existing checks
  { name: "PII Detection", fn: piiDetection },
];
```

## 📊 Current Status

### Backend (apps/api)

| Check | Status | Details |
|-------|--------|---------|
| No Console Usage | 🚧 23 violations | Utility files, middleware, module registry |
| Proper Imports | ✅ PASSED | All Winston/Morgan removed |
| req.log Usage | ✅ PASSED | All route handlers migrated |
| Message Format | ✅ PASSED | Correct Pino API signature |

### Frontend (apps/web)

| Check | Status | Details |
|-------|--------|---------|
| No Console Usage | 🚧 10 violations | Renderers, hooks, lib utilities |
| Logger Infrastructure | ⏳ TODO | Client-side logger not yet created |

## 🎯 Next Steps

### Immediate (Sprint 1)

- [x] Create CI gate infrastructure
- [ ] Migrate remaining backend utility files (23 files)
- [ ] Create frontend logger abstraction (apps/web)
- [ ] Migrate frontend console usage (10 files)

### Near Term (Sprint 2)

- [ ] Add GitHub Actions CI integration
- [ ] Create pre-commit hook (optional)
- [ ] Add VSCode tasks
- [ ] Write unit tests for CI gate checks

### Future

- [ ] Implement auto-fix mode
- [ ] AST-based validation (more precise)
- [ ] PII detection check
- [ ] Log volume metrics
- [ ] Performance profiling
- [ ] Custom eslint plugin

## 📚 Documentation

| Document | Purpose | Link |
|----------|---------|------|
| README.md | Full documentation with examples | README.md |
| MIGRATION.md | Step-by-step migration guide | MIGRATION.md |
| SUMMARY.md | Implementation summary | SUMMARY.md |
| CHECKLIST.md | This file — integration guide | CHECKLIST.md |

## 💡 Usage Examples

### In Development

```bash
# Before committing
pnpm ci:logger

# If violations found
# 1. Fix manually using MIGRATION.md guide
# 2. OR add to ALLOWED_FILES if legitimate
# 3. Re-run validation
```

### In Code Review

```bash
# Reviewer runs CI gate on PR branch
git checkout feature-branch
pnpm install
pnpm ci:logger

# Check for new violations
# Request fixes if logger patterns violated
```

### In CI/CD

```yaml
# GitHub Actions automatically runs on every PR
- name: Logger Validation
  run: pnpm ci:logger
  # Fails build if violations found
```

## 🐛 Troubleshooting

### Issue: CI gate fails with "Cannot find module 'glob'"

**Solution**: Install dependencies
```bash
pnpm install
```

### Issue: False positive on legitimate console usage

**Solution**: Add to ALLOWED_FILES
```javascript
// tools/ci-gate/logger/checks/no-console-usage.mjs
const ALLOWED_FILES = [
  // ... existing
  "path/to/your/file.ts",
];
```

### Issue: CI gate misses actual violations

**Solution**: Refine regex patterns
```javascript
// tools/ci-gate/logger/checks/no-console-usage.mjs
const PATTERNS = [
  /console\.(log|error|warn|info|debug|trace)\(/g,
  // Add more patterns here
];
```

## 📞 Support

For questions or issues:

1. Check documentation in `tools/ci-gate/logger/`
2. Review examples in `tools/ci-gate/logger/templates/`
3. Consult migration plan in session memory
4. Contact: AFENDA Platform Team

---

**Version**: 1.0.0  
**Last Updated**: March 24, 2026  
**Status**: Production Ready ✅
