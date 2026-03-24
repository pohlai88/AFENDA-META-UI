# CI Gate Directory Structure

Complete overview of the consolidated CI gate system.

## 📁 Directory Tree

```
tools/ci-gate/
├── index.mjs                      # Master gate runner (310 lines)
├── package.json                   # Master package.json (21 lines)
├── README.md                      # Master documentation (680 lines)
├── STRUCTURE.md                   # This file (240 lines)
│
└── logger/                        # Logger gate subdirectory
    ├── index.mjs                  # Logger gate entry point (60 lines)
    ├── package.json               # Logger dependencies (25 lines)
    ├── README.md                  # Logger gate documentation (450 lines)
    ├── MIGRATION.md               # Migration guide (200 lines)
    ├── SUMMARY.md                 # Implementation summary (400 lines)
    ├── CHECKLIST.md               # Integration checklist (300 lines)
    ├── STRUCTURE.md               # Logger directory structure (200 lines)
    │
    ├── checks/                    # Validation checks
    │   ├── no-console-usage.mjs   # Console.log detector (80 lines)
    │   ├── proper-imports.mjs     # Import validator (70 lines)
    │   ├── req-log-usage.mjs      # Request logger validator (90 lines)
    │   └── message-format.mjs     # Message format validator (60 lines)
    │
    ├── templates/                 # Example templates
    │   ├── logger-usage.example.ts   # Logger patterns (55 lines)
    │   ├── req-log.example.ts        # Request logging (90 lines)
    │   └── mock-logger.ts            # Test mocks (70 lines)
    │
    └── utils/                     # Utilities
        └── error-reporter.mjs     # Error formatter (45 lines)
```

## 📊 File Statistics

### Master Gate System

| File | Lines | Purpose |
|------|-------|---------|
| `index.mjs` | 310 | Master runner with auto-discovery and reporting |
| `package.json` | 21 | Master package configuration |
| `README.md` | 680 | Comprehensive documentation |
| `STRUCTURE.md` | 240 | Directory structure (this file) |

**Total:** 1,251 lines

### Logger Gate (Subdirectory)

| File | Lines | Purpose |
|------|-------|---------|
| `index.mjs` | 60 | Logger gate entry point |
| `package.json` | 25 | Logger gate dependencies |
| `README.md` | 450 | Logger documentation |
| `MIGRATION.md` | 200 | Migration guide |
| `SUMMARY.md` | 400 | Implementation summary |
| `CHECKLIST.md` | 300 | Integration checklist |
| `STRUCTURE.md` | 200 | Logger directory structure |
| **Checks (4 files)** |
| `checks/no-console-usage.mjs` | 80 | Console usage validator |
| `checks/proper-imports.mjs` | 70 | Import validator |
| `checks/req-log-usage.mjs` | 90 | Request logging validator |
| `checks/message-format.mjs` | 60 | Message format validator |
| **Templates (3 files)** |
| `templates/logger-usage.example.ts` | 55 | Logger patterns |
| `templates/req-log.example.ts` | 90 | Request logging |
| `templates/mock-logger.ts` | 70 | Test mocks |
| **Utils (1 file)** |
| `utils/error-reporter.mjs` | 45 | Error formatter |

**Total:** ~2,095 lines

### Overall Statistics

- **Total Files:** 18 (4 master + 14 logger)
- **Total Lines:** ~3,346 lines
- **Root Documentation:** 920 lines (27%)
- **Logger Gate:** 2,426 lines (73%)

### Breakdown by Type

| Type | Files | Lines | Percentage |
|------|-------|-------|------------|
| Documentation | 7 | 2,470 | 74% |
| Implementation | 10 | 795 | 24% |
| Configuration | 2 | 46 | 1% |
| Templates | 3 | 215 | 6% |

## 🔧 Components

### 1. Master Runner (`index.mjs`)

**Responsibilities:**
- Auto-discover gate scripts in subdirectories
- Parse CLI arguments (`--gate`, `--fix`, `--verbose`, `--help`)
- Execute gates sequentially
- Aggregate results and timing
- Display color-coded summary report
- Exit with appropriate code (0 = pass, 1 = fail)

**Key Functions:**
- `discoverGates()` — Scans subdirectories for `index.mjs` files
- `runGate(gate, args)` — Spawns child process for gate execution
- `formatDuration(ms)` — Human-readable duration formatting
- `main()` — Orchestrates entire execution flow

**Dependencies:**
- Node.js built-ins: `fs`, `path`, `child_process`, `url`
- No external packages required

### 2. Gate Discovery Mechanism

**How it works:**
1. Scans all subdirectories in `tools/ci-gate/`
2. Looks for `index.mjs` file in each subdirectory
3. Registers gate with directory name
4. Sorts gates alphabetically

**Example:**
```
tools/ci-gate/
├── logger/index.mjs       → Gate name: "logger"
├── security/index.mjs     → Gate name: "security"
└── typescript/index.mjs   → Gate name: "typescript"
```

**No configuration required!** Just create a directory with `index.mjs`.

### 3. Communication Protocol

**Master → Gate:**
- Command: `node <gate-dir>/index.mjs [--fix]`
- Working directory: `<gate-dir>`
- Arguments: `--fix` (optional)

**Gate → Master:**
- Exit code: `0` = pass, `1` = fail
- stdout: Progress messages, results
- stderr: Error messages, warnings

### 4. Logger Gate Structure

The logger gate follows the same pattern as master:

```javascript
// logger/index.mjs
import { runNoConsoleUsage } from './checks/no-console-usage.mjs';
import { runProperImports } from './checks/proper-imports.mjs';
import { runReqLogUsage } from './checks/req-log-usage.mjs';
import { runMessageFormat } from './checks/message-format.mjs';

// Run all checks
const results = [
  runNoConsoleUsage(),
  runProperImports(),
  runReqLogUsage(),
  runMessageFormat(),
];

// Aggregate and report
```

## 📦 Dependencies

### Master Gate

No external dependencies! Uses only Node.js built-ins:
- `node:fs` — File system operations
- `node:path` — Path manipulation
- `node:child_process` — Spawning gate processes
- `node:url` — ESM path resolution

### Logger Gate

External dependencies (defined in `logger/package.json`):
- `glob@^11.0.0` — File pattern matching

## 🚀 Usage Patterns

### From Workspace Root

```bash
# Run all gates
pnpm ci:gate

# Run specific gate
pnpm ci:gate:logger

# Run with auto-fix
pnpm ci:gate:fix

# Run with verbose output
pnpm ci:gate:verbose
```

### From Master Gate Directory

```bash
cd tools/ci-gate

# Run all gates
node index.mjs

# Run specific gate
node index.mjs --gate=logger

# Run with auto-fix
node index.mjs --fix

# Show help
node index.mjs --help
```

### From Individual Gate Directory

```bash
cd tools/ci-gate/logger

# Run logger gate directly
node index.mjs

# Run with auto-fix
node index.mjs --fix
```

## 🔌 Extensibility

### Adding a New Gate

**Step 1:** Create gate directory
```bash
mkdir tools/ci-gate/my-new-gate
```

**Step 2:** Create `index.mjs`
```bash
touch tools/ci-gate/my-new-gate/index.mjs
```

**Step 3:** Implement gate logic
```javascript
#!/usr/bin/env node

// Your validation logic
const errors = validateCode();

if (errors.length > 0) {
  console.error(`Found ${errors.length} errors`);
  process.exit(1);
} else {
  console.log('✅ All checks passed');
  process.exit(0);
}
```

**Step 4:** Test
```bash
# Test directly
node tools/ci-gate/my-new-gate/index.mjs

# Test with master
node tools/ci-gate/index.mjs --gate=my-new-gate
```

**That's it!** No configuration needed. Master runner auto-discovers your gate.

## 📈 Integration Status

### ✅ Completed

- [x] Master gate runner with auto-discovery
- [x] CLI argument parsing (--gate, --fix, --verbose, --help)
- [x] Sequential gate execution
- [x] Result aggregation and reporting
- [x] Color-coded output with timing
- [x] Logger gate integration
- [x] Comprehensive documentation
- [x] Package scripts in root `package.json`

### 🚧 In Progress

- [ ] CI/CD integration (GitHub Actions example provided)
- [ ] Additional gates (security, typescript, etc.)
- [ ] Pre-commit hook integration

### 📋 Planned

- [ ] Parallel gate execution (optional for independent gates)
- [ ] JSON output format for machine parsing
- [ ] Gate dependency management (run gate A before gate B)
- [ ] Result caching for unchanged files
- [ ] Web dashboard for visualization

## 🔍 Example Output

### Successful Run

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

### Failed Run

```
╔═══════════════════════════════════════════════════════════╗
║           Master CI Gate Runner                           ║
╚═══════════════════════════════════════════════════════════╝

Running 2 gate(s)...

Running: logger
────────────────────────────────────────────────────────────
✗ logger FAILED (1.45s)

❌ No Console Usage: 33 error(s), 0 warning(s)
✅ Proper Imports: PASSED
✅ req.log Usage: PASSED
✅ Message Format: PASSED

Summary: 33 error(s), 0 warning(s)

Running: typescript
────────────────────────────────────────────────────────────
✓ typescript PASSED (2.31s)

════════════════════════════════════════════════════════════
Summary

  ✗ logger                FAILED 1.45s
  ✓ typescript            PASSED 2.31s

Total: 2 gate(s)
Passed: 1
Failed: 1
Duration: 3.76s
════════════════════════════════════════════════════════════

❌ CI gate checks failed
```

---

**Last Updated:** March 24, 2026  
**Version:** 1.0.0
