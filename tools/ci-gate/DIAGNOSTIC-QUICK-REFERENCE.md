# CI Gate Diagnostic Format - Quick Reference

All CI gates now provide consistent, structured diagnostic information to help you quickly understand and fix issues.

## Standard Output Format

When a gate fails, you'll see:

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🏗️ Category Name (Count)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

❌ Clear error message
💡 Explanation:
   Why this matters and what it means
📂 Related files:
   • path/to/file1.ts
   • path/to/file2.ts
🔧 Fix suggestions:
   - Specific step 1
   - Specific step 2
   - Specific step 3
🧾 Inline diagnostics:
   - Additional context
   - Actual values vs expected
```

## Summary Report

At the end, you get a summary:

```
📊 Gate Name Summary
════════════════════════════════════════════════════════════
Errors: 2
  🏗️ Category 1: 1
  🧱 Category 2: 1
Warnings: 0
```

## All Available Gates

Run individual gates:
```bash
node tools/ci-gate/boundaries/index.mjs
node tools/ci-gate/circular/index.mjs
node tools/ci-gate/bundle/index.mjs
node tools/ci-gate/vite/index.mjs
node tools/ci-gate/typescript/index.mjs
node tools/ci-gate/contracts/index.mjs
node tools/ci-gate/dependencies/index.mjs
node tools/ci-gate/logger/index.mjs
```

Run all gates:
```bash
node tools/ci-gate/index.mjs
pnpm ci:gate
```

## Common Flags

- `--verbose` or `-v`: Show detailed output
- `--fix`: Auto-fix issues (where supported)
- `--strict`: Treat warnings as errors (where supported)
- `--gate=name`: Run only specific gate (master only)

## Examples

**Run specific gate:**
```bash
node tools/ci-gate/index.mjs --gate=typescript
```

**Verbose mode:**
```bash
node tools/ci-gate/boundaries/index.mjs --verbose
```

**Strict mode:**
```bash
node tools/ci-gate/circular/index.mjs --strict
```

**Auto-fix:**
```bash
node tools/ci-gate/logger/index.mjs --fix
```

## Icon Legend

| Icon | Meaning |
|------|---------|
| 🏗️ | Architecture/Boundary |
| 🔄 | Circular Dependency |
| 📦 | Bundle/Package |
| ⚡ | Performance |
| 🔒 | Security |
| ⚙️ | Configuration |
| 🎨 | CSS/Styling |
| 🧪 | TypeScript |
| 📚 | Documentation |
| 🔧 | Fix Available |

## Next Steps When a Gate Fails

1. **Read the error message** - It tells you exactly what's wrong
2. **Check the explanation** - Understand why it matters
3. **Review related files** - See which files are involved
4. **Follow fix suggestions** - Apply the recommended fixes
5. **Re-run the gate** - Verify your changes
6. **Run all gates** - Ensure no regressions

## Getting Help

- Full report: [`DIAGNOSTIC-VALIDATION-REPORT.md`](./DIAGNOSTIC-VALIDATION-REPORT.md)
- Gate docs: [`README.md`](./README.md)
- Architecture: [`docs/DEPENDENCY_GOVERNANCE_POLICY.md`](../../docs/archive/DEPENDENCY_GOVERNANCE_POLICY.md)
