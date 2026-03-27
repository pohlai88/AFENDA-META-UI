# Master CI Gate System

Consolidated CI gate runner for AFENDA Meta UI project. Runs all code quality and compliance checks through a single command with enhanced diagnostics.

## 📋 Table of Contents

- Overview
- Quick Start
- Available Gates
- Usage
- Enhanced Diagnostics
- Adding New Gates
- CI/CD Integration
- Architecture
- Troubleshooting

---

## Overview

The Master CI Gate system provides a unified interface for running all code quality checks across the AFENDA Meta UI monorepo. It automatically discovers and executes gate scripts, aggregates results, and provides comprehensive reporting.

### Key Features

- **🔍 Auto-Discovery**: Automatically finds all gate scripts in subdirectories
- **🎯 Selective Execution**: Run all gates or target specific ones
- **🔧 Auto-Fix Support**: Pass `--fix` flag to all supporting gates
- **📊 Comprehensive Reporting**: Color-coded results with timing information
- **⚡ Fast Execution**: Sequential execution with optimized performance
- **🔌 Extensible**: Add new gates by creating subdirectories

### Benefits

- **Single Command**: Run all checks with `pnpm ci:gate`
- **Consistent Interface**: Same CLI arguments across all gates
- **Clear Reporting**: Know exactly what passed and what failed
- **Enhanced Diagnostics**: Detailed error messages with fix suggestions
- **Developer Friendly**: Verbose mode for debugging
- **CI/CD Ready**: Exit codes and output format perfect for pipelines

---

## Quick Start

### From Workspace Root

````bash
# Run all gates
pnpm ci:gate

# Run all gates

# Run specific gate
pnpm ci:gate --gate=logger

# Run with verbose output (helpful for debugging)
pnpm ci:gate --verbose
```with auto-fix
pnpm ci:gate:fix

# Run specific gate
pnpm ci:gate:logger

# Run with verbose output
pnpm ci:gate:verbose
````

### From tools/ci-gate Directory

```bash
# Run all gates
node index.mjs

# Run specific gate
node index.mjs --gate=logger

# Run all gates with auto-fix
node index.mjs --fix

# Show help
node index.mjs --help
```

---

## Available Gates

### 1. Logger Gate (`logger/`)

Validates Pino logger usage and best practices.

**Checks:**

- ✅ No console.log/error/warn usage
- ✅ Proper logger imports (Pino, not Winston/Morgan)
- ✅ Request-scoped logging (req.log) in routes
- ✅ Correct message format (object first, message second)

**Commands:**

```bash
# Run logger gate only
pnpm ci:gate:logger

# Or from master gate
node tools/ci-gate/index.mjs --gate=logger
```

**Documentation:** logger/README.md

### 2. Contracts Gate (`contracts/`)

Validates export contracts for lazy-loaded routes and renderers.

**Checks:**

- ✅ All lazy route pages export default React component
- ✅ All renderers export expected named functions
- ✅ Module paths resolve correctly
- ✅ Export types match route expectations

**Enhanced diagnostics** with categorized errors and fix suggestions.

**Commands:**

```bash
# Run contracts gate only
pnpm ci:contracts

# Or from master gate
node tools/ci-gate/index.mjs --gate=contracts
```

### 3. Dependencies Gate (`dependencies/`)

Validates workspace dependency governance rules.

**Checks:**

- ✅ Critical package version alignment across workspace
- ✅ No server-only runtime packages in web app
- ✅ Internal `@afenda/*` packages use `workspace:*`
- ✅ `shadcn` CLI is not in runtime dependencies
- ⚠️ TypeScript version drift warning (advisory)

**Commands:**

```bash
# Run dependencies gate only
pnpm ci:gate:dependencies

# Or from master gate
node tools/ci-gate/index.mjs --gate=dependencies
```

### 4. TypeScript DX Gate (`typescript/`)

Validates TypeScript configuration baseline, incremental build setup, declaration export contracts, and inline diagnostics scripts.

**Checks:**

- ✅ Root TypeScript scripts (`typecheck`, `typecheck:verbose`, `typecheck:debug`)
- ✅ Baseline `tsconfig.base.json` strict + incremental defaults
- ✅ Workspace incremental resolution across apps and packages
- ✅ Library `exports` + `types` declaration contracts
- ✅ TypeScript DX docs and package boundary artifacts
- ✅ Live `pnpm typecheck` execution

**Commands:**

```bash
# Run TypeScript gate only
pnpm ci:gate:typescript

# Or from master gate
node tools/ci-gate/index.mjs --gate=typescript
```

### 5. Shared Column Casing Gate (`casing/`)

Prevents naming drift between Drizzle schema helpers and raw SQL by enforcing
explicit snake_case physical column mappings.

**Checks:**

- ✅ Shared audit helper maps `createdBy`/`updatedBy` to `created_by`/`updated_by`
- ✅ Shared timestamp helper maps `createdAt`/`updatedAt`/`deletedAt` to snake_case
- ✅ Trigger SQL does not reference camelCase physical column tokens

**Commands:**

```bash
# Run casing gate only
pnpm ci:gate:casing

# Or from master gate
node tools/ci-gate/index.mjs --gate=casing
```

**When to use:**

- After changing shared column helpers in `packages/db/src/_shared`
- After editing raw SQL trigger files under `packages/db/src/triggers`
- Before shipping migrations that rename column casing

\*\*Do🔧 Actionable Fix Suggestions

Each error includes:

- **Problem explanation**: Why the error occurred
- **Step-by-step fixes**: Exact code changes needed
- **Related files**: Where to make changes
- **Code examples**: Correct patterns to use

```
🔧 Fix suggestions:
   Add a default export to apps/web/src/pages/model-list.tsx:
     export default function YourComponent() { ... }

   Or if using named export, wrap it:
     export { YourComponent as default };

📂 Related files:
   • apps/web/src/pages/model-list.tsx
   • apps/web/src/routes/index.tsx
```

### 📊 Summary Statistics

Get an overview of all issues by category:

```
📊 Contract Violation Summary
════════════════════════════════════════════════════════════
Total violations: 3

  🚫 Missing Default Export: 2
  📁 Module Not Found: 1
```

### 🔍 Verbose Mode

Enable detailed output for debugging:

```bash# Run with verbose flag for full test output
pnpm ci:gate --verbose
pnpm ci:gate --gate=contracts --verbose
```

Shows:

- Working directories
- Full command output
- Intermediate processing steps
- Debug information

---

## Usage

### Command Line Interface

```bash
node tools/ci-gate/index.mjs [OPTIONS]
```

### Options

| Option            | Description                        | Example         |
| ----------------- | ---------------------------------- | --------------- |
| `--gate=<name>`   | Run a specific gate                | `--gate=logger` |
| `--mode=<mode>`   | Execution mode: `full` or `fast`  | `--mode=fast`   |
| `--concurrency=N` | Run up to N gates in parallel      | `--concurrency=2` |
| `--fix`           | Enable auto-fix mode for all gates | `--fix`         |
| `--verbose`, `-v` | Show verbose output from all gates | `--verbose`     |
| `--help`, `-h`    | Show help message                  | `--help`        |

### Examples

#### Run All Gates

```bash
# From workspace root
pnpm ci:gate

# From ci-gate directory
node index.mjs
```

#### Run Fast Mode (Developer Feedback)

```bash
# Fast mode skips expensive dependency network checks
pnpm ci:gate:fast

# Optional bounded parallelism
node tools/ci-gate/index.mjs --mode=fast --concurrency=2
```

#### Run Full Mode (Pre-merge / CI)

```bash
# Full policy checks, including dependency audit/outdated stages
pnpm ci:gate:full
```

### Mode Guidance

- Use `--mode=fast` during local iteration when you need quick feedback.
- Use `--mode=full` for pre-merge checks and scheduled CI runs.
- Fast mode currently skips dependency audit/outdated checks and reports those skips as warnings.

### Periodic CI-Gate Optimization

Treat CI-gate performance as a maintained asset, not a one-time task.

- Benchmark gate duration at least monthly, or after adding new gates/checks.
- Re-benchmark whenever median local run time regresses by 20% or more.
- Prefer targeted optimizations first: reduce process startups, parallelize independent steps, and avoid repeated filesystem scans.
- Keep policy strong by preserving a regular `full` run cadence in CI even when developers use `fast` mode locally.

Suggested benchmark commands:

```bash
pnpm ci:gate:fast
pnpm ci:gate:full
```

**Output:\*\*** contracts/README.md

---

## Enhanced Diagnostics

All gates provide enhanced diagnostic output designed for fast debugging and repair:

### 🎯 Error Categorization

Errors are automatically grouped by type with visual indicators:

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🚫 Missing Default Export (2)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📍 Location: src/routes/lazy-pages.contract.test.ts
   Test: ../pages/model-list exports a default React component

❌ Module '../pages/model-list' does not export a default component

💡 Explanation:
   The lazy route expects a default export, but the module exports undefined.
```

### 🔧 Actionable Fix Suggestions

Each error includes:

### 2. Contracts Gate (`contracts/`)

Validates export contracts for lazy-loaded routes and renderers.

**Checks:**

- ✅ All lazy route pages export default React component
- ✅ All renderers export expected named functions
- ✅ Module paths resolve correctly
- ✅ Export types match route expectations

**Commands:**

```bash
# Run contracts gate only
pnpm ci:contracts

# Or from master gate
node tools/ci-gate/index.mjs --gate=contracts
```

**Documentation:** contracts/README.md

### Future Gates

Additional gates can be added for:

- TypeScript type safety
- Security vulnerabilities (dependency scanning)
- Code complexity metrics
- Bundle size checks
- API contract validation
- Database migration safety

---

## Usage

### Command Line Interface

```bash
node tools/ci-gate/index.mjs [OPTIONS]
```

### Options

| Option            | Description                        | Example         |
| ----------------- | ---------------------------------- | --------------- |
| `--gate=<name>`   | Run a specific gate                | `--gate=logger` |
| `--fix`           | Enable auto-fix mode for all gates | `--fix`         |
| `--verbose`, `-v` | Show verbose output from all gates | `--verbose`     |
| `--help`, `-h`    | Show help message                  | `--help`        |

### Examples

#### Run All Gates

```bash
# From workspace root
pnpm ci:gate

# From ci-gate directory
node index.mjs
```

**Output:**

```
╔═══════════════════════════════════════════════════════════╗
║           Master CI Gate Runner                           ║
╚═══════════════════════════════════════════════════════════╝

Running 1 gate(s)...

Running: logger
────────────────────────────────────────────────────────────
✓ logger PASSED (1.23s)

════════════════════════════════════════════════════════════
Summary

  ✓ logger                PASSED 1.23s

Total: 1 gate(s)
Passed: 1
Duration: 1.23s
════════════════════════════════════════════════════════════

✅ All CI gate checks passed
```

#### Run Specific Gate

```bash
pnpm ci:gate:logger
```

#### Run with Auto-Fix

```bash
# Fix all violations (where supported)
pnpm ci:gate:fix

# Or specific gate
node tools/ci-gate/index.mjs --gate=logger --fix
```

#### Verbose Mode

```bash
# See detailed output from all gates
pnpm ci:gate:verbose

# Or
node tools/ci-gate/index.mjs --verbose
```

### Exit Codes

- **0**: All gates passed
- **1**: One or more gates failed

---

## Adding New Gates

### Directory Structure

Each gate should be in its own subdirectory with an `index.mjs` entry point:

```
tools/ci-gate/
├── index.mjs              # Master runner (this file)
├── package.json           # Master package.json
├── logger/                # Logger gate
│   ├── index.mjs          # Gate entry point ← REQUIRED
│   ├── package.json       # Gate dependencies
│   ├── README.md          # Gate documentation
│   └── checks/            # Gate implementation
└── your-new-gate/         # Your new gate
    ├── index.mjs          # Gate entry point ← REQUIRED
    ├── package.json       # Gate dependencies (optional)
    └── README.md          # Gate documentation (recommended)
```

### Gate Requirements

Your gate's `index.mjs` must:

1. **Be executable with `node`**
2. **Accept CLI arguments:**
   - `--fix` (optional): Enable auto-fix mode
   - No other arguments required
3. **Exit with appropriate code:**
   - `0`: All checks passed
   - `1`: One or more checks failed
4. **Print results to stdout/stderr**
5. **Complete in reasonable time** (< 30s recommended)

### Example Gate Template

```javascript
#!/usr/bin/env node

/**
 * My Custom Gate
 *
 * Description of what this gate validates.
 */

// Parse arguments
const args = process.argv.slice(2);
const options = {
  fix: args.includes("--fix"),
};

async function runChecks() {
  console.log("Running my custom checks...\n");

  // Your validation logic here
  const errors = [];

  // Example check
  if (someConditionFails) {
    errors.push("Error: something is wrong");
  }

  // Report results
  if (errors.length > 0) {
    console.error(`❌ Found ${errors.length} error(s)\n`);
    errors.forEach((err) => console.error(err));
    process.exit(1);
  } else {
    console.log("✅ All checks passed\n");
    process.exit(0);
  }
}

runChecks().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
```

### Integration Steps

1. **Create gate directory:**

   ```bash
   mkdir tools/ci-gate/my-gate
   ```

2. **Create `index.mjs`:**

   ```bash
   touch tools/ci-gate/my-gate/index.mjs
   chmod +x tools/ci-gate/my-gate/index.mjs
   ```

3. **Implement your checks** (see template above)

4. **Test locally:**

   ```bash
   node tools/ci-gate/my-gate/index.mjs
   ```

5. **Test with master runner:**

   ```bash
   node tools/ci-gate/index.mjs --gate=my-gate
   ```

6. **Add to root package.json** (optional):

   ```json
   {
     "scripts": {
       "ci:my-gate": "node tools/ci-gate/index.mjs --gate=my-gate"
     }
   }
   ```

7. **Document your gate:**
   - Create `README.md` explaining what it checks
   - Add entry to this file's "Available Gates" section

---

## CI/CD Integration

### GitHub Actions

Add to `.github/workflows/ci.yml`:

```yaml
name: CI

on:
  push:
    branches: [main, master, develop]
  pull_request:
    branches: [main, master, develop]

jobs:
  ci-gates:
    name: CI Gate Checks
    runs-on: ubuntu-latest

    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: "20"

      - name: Setup pnpm
        uses: pnpm/action-setup@v2
        with:
          version: 9

      - name: Install dependencies
        run: pnpm install --frozen-lockfile

      - name: Run CI gates
        run: pnpm ci:gate

      # Optional: Upload results as artifact
      - name: Upload gate results
        if: always()
        uses: actions/upload-artifact@v3
        with:
          name: ci-gate-results
          path: |
            tools/ci-gate/*/results.json
```

### GitLab CI

Add to `.gitlab-ci.yml`:

```yaml
ci-gates:
  stage: test
  image: node:20
  before_script:
    - npm install -g pnpm@9
    - pnpm install --frozen-lockfile
  script:
    - pnpm ci:gate
  allow_failure: false
  only:
    - merge_requests
    - main
    - develop
```

### Pre-commit Hook

Add to `.husky/pre-commit`:

```bash
#!/bin/sh
. "$(dirname "$0")/_/husky.sh"

# Run CI gates before commit
pnpm ci:gate

# If gates fail, abort commit
if [ $? -ne 0 ]; then
  echo "❌ CI gate checks failed. Commit aborted."
  echo "Fix the issues or use --no-verify to bypass (not recommended)"
  exit 1
fi
```

---

## Architecture

### Master Runner Flow

```
┌─────────────────────────────────────────────────────────┐
│ Master Runner (tools/ci-gate/index.mjs)                 │
└────────────────┬────────────────────────────────────────┘
                 │
                 ├─ Parse CLI arguments
                 │  (--gate, --fix, --verbose, --help)
                 │
                 ├─ Discover gates
                 │  (scan subdirectories for index.mjs)
                 │
                 ├─ Filter gates (if --gate specified)
                 │
                 ├─ Run gates sequentially
                 │  │
                 │  ├─ Gate 1: logger
                 │  │  └─ Execute: node logger/index.mjs [--fix]
                 │  │     └─ Capture: exit code, stdout, stderr, duration
                 │  │
                 │  ├─ Gate 2: ...
                 │  │  └─ Execute: node .../index.mjs [--fix]
                 │  │     └─ Capture: exit code, stdout, stderr, duration
                 │  │
                 │  └─ Gate N: ...
                 │
                 ├─ Aggregate results
                 │  └─ Count: passed, failed, total duration
                 │
                 ├─ Print summary report
                 │  └─ Show: ✓/✗ for each gate, timing, totals
                 │
                 └─ Exit with appropriate code
                    └─ 0 if all passed, 1 if any failed
```

### Gate Discovery

The master runner automatically discovers gates by:

1. Scanning all subdirectories in `tools/ci-gate/`
2. Looking for `index.mjs` in each subdirectory
3. Registering found gates in alphabetical order

**No configuration required!** Just create a subdirectory with an `index.mjs` and it will be picked up.

### Communication Protocol

Master runner ↔ Gate communication:

**Input (from master to gate):**

- CLI arguments: `--fix` (optional)
- Environment: current working directory = gate directory

**Output (from gate to master):**

- Exit code: `0` = pass, `1` = fail
- stdout: Results, progress messages
- stderr: Errors, warnings

---

## Troubleshooting

### Gate Not Discovered

**Symptom:** Your gate doesn't appear when running `node tools/ci-gate/index.mjs --help`

**Possible causes:**

1. No `index.mjs` file in gate directory
2. Gate directory not directly under `tools/ci-gate/`
3. Typo in gate directory name

**Solution:**

```bash
# Check structure
ls -la tools/ci-gate/my-gate/

# Should show:
# index.mjs  ← REQUIRED
```

### Gate Fails Immediately

**Symptom:** Gate exits with error before running checks

**Possible causes:**

1. Syntax error in gate's `index.mjs`
2. Missing dependencies
3. Incorrect file permissions

**Solution:**

```bash
# Test gate directly
node tools/ci-gate/my-gate/index.mjs

# Check for syntax errors
node --check tools/ci-gate/my-gate/index.mjs

# Install gate dependencies
cd tools/ci-gate/my-gate
pnpm install
```

### Exit Code Always 0

**Symptom:** Master runner shows "All gates passed" even when checks fail

**Possible causes:**

1. Gate not calling `process.exit(1)` on failure
2. Gate catching errors and not propagating exit code

**Solution:**

```javascript
// In your gate code:
if (errors.length > 0) {
  console.error(`Found ${errors.length} errors`);
  process.exit(1); // ← REQUIRED for failure
}
```

### Verbose Mode Not Working

**Symptom:** `--verbose` flag shows no additional output

**Possible causes:**

1. Gate sends output to wrong stream
2. Gate uses custom logging that doesn't go to stdout/stderr

**Solution:**

```javascript
// Use console.log/error (not custom loggers)
console.log("Progress message");
console.error("Error message");
```

### Performance Issues

**Symptom:** Gates take too long to complete

**Possible causes:**

1. Scanning too many files
2. Not excluding node_modules/dist
3. Running expensive operations

**Solution:**

```javascript
// Exclude unnecessary directories
const filesToScan = glob.sync("apps/**/*.ts", {
  ignore: ["**/node_modules/**", "**/dist/**", "**/build/**", "**/*.test.ts"],
});
```

---

## Package Scripts Reference

From workspace root:

| Script                 | Description                       | Equivalent                                   |
| ---------------------- | --------------------------------- | -------------------------------------------- |
| `pnpm ci:gate`         | Run all gates                     | `node tools/ci-gate/index.mjs`               |
| `pnpm ci:gate:fix`     | Run all gates with auto-fix       | `node tools/ci-gate/index.mjs --fix`         |
| `pnpm ci:gate:logger`  | Run logger gate only              | `node tools/ci-gate/index.mjs --gate=logger` |
| `pnpm ci:gate:verbose` | Run all gates with verbose output | `node tools/ci-gate/index.mjs --verbose`     |

---

## Best Practices

### For Gate Developers

1. **Keep checks fast** (< 30s per gate)
2. **Use informative error messages** (show file path and line number)
3. **Support `--fix` flag** (when auto-fix is possible)
4. **Document what you check** (in gate's README.md)
5. **Test locally before committing**
6. **Use glob patterns wisely** (exclude test files, node_modules, etc.)
7. **Return proper exit codes** (0 = pass, 1 = fail)

### For Users

1. **Run gates locally** before pushing (`pnpm ci:gate`)
2. **Fix issues incrementally** (use `--gate` to target specific checks)
3. **Use auto-fix** when available (`pnpm ci:gate:fix`)
4. **Check verbose output** when debugging (`--verbose`)
5. **Keep master branch passing** (all gates should pass on main/master)

---

## Related Documentation

- Logger Gate Documentation: logger/README.md
- Logger Migration Guide: logger/MIGRATION.md
- Logger Examples: logger/templates/

---

## Support

For issues or questions:

1. **Check gate-specific README** (e.g., `logger/README.md`)
2. **Run with `--verbose`** to see detailed output
3. **Test gate directly** (`node tools/ci-gate/<gate>/index.mjs`)
4. **Check CI logs** for build failures

---

## Version History

- **1.0.0** (2026-03-24): Initial master gate system
  - Auto-discovery of gate scripts
  - Support for --gate, --fix, --verbose flags
  - Comprehensive reporting and timing
  - Logger gate integrated

---

**Maintained by:** AFENDA Development Team
**Last Updated:** March 24, 2026
