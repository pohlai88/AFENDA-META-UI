# Logger CI Gate

Automated validation and enforcement of Pino logger best practices across the AFENDA codebase.

## Overview

This CI gate ensures consistent, production-grade logging patterns by validating:

✅ **No Console Usage** — All `console.log/error/warn` replaced with Pino logger  
✅ **Proper Imports** — No deprecated Winston/Morgan imports  
✅ **req.log Usage** — Route handlers use request-scoped logging  
✅ **Message Format** — Correct Pino API signature (object first, message second)  
✅ **Child Logger Bindings** — Child loggers have persistent context (NEW)  
✅ **String Interpolation** — No template literals or concatenation in log messages (NEW)  
✅ **Error Serialization** — Errors logged with full stack traces (NEW)  
✅ **Serializer Usage** — Sensitive data uses serializers or explicit fields (NEW)

## Quick Start

```bash
# Run all checks
node tools/ci-gate/logger/index.mjs

# Run with auto-fix (where supported)
node tools/ci-gate/logger/index.mjs --fix

# Add to package.json scripts
pnpm ci:logger
```

## Directory Structure

```
tools/ci-gate/logger/
├── index.mjs                            # Main entry point
├── checks/
│   ├── no-console-usage.mjs             # Validates no console.log/error usage
│   ├── proper-imports.mjs               # Validates no Winston/Morgan imports
│   ├── req-log-usage.mjs                # Validates req.log in route handlers
│   ├── message-format.mjs               # Validates Pino API signature
│   ├── child-logger-bindings.mjs        # Validates child logger context (NEW)
│   ├── string-interpolation.mjs         # Detects template literals in logs (NEW)
│   ├── error-serialization.mjs          # Validates error stack trace logging (NEW)
│   └── serializer-usage.mjs             # Validates PII protection patterns (NEW)
├── utils/
│   └── error-reporter.mjs               # Formats and displays results
├── templates/
│   ├── logger-usage.example.ts          # Correct logger patterns
│   ├── req-log.example.ts               # Request logging patterns
│   └── mock-logger.ts                   # Mock logger for tests
├── UPGRADE-PROPOSAL.md                  # Feature upgrade roadmap
├── IMPLEMENTATION-SUMMARY.md            # Implementation status
└── README.md                            # This file
```

## Check Details

### 1. No Console Usage

**Purpose**: Ensures all logging goes through structured Pino logger, not `console.*`.

**Validates**:

- No `console.log()`, `console.error()`, `console.warn()` in source code
- Exceptions: `config/index.ts` (startup validation), test files

**Why**: Console logging is unstructured and doesn't support:

- Log levels
- Structured data (JSON)
- Request tracing (requestId)
- Log aggregation
- PII redaction

**Migration**:

```typescript
// ❌ Before
console.error("Error fetching orders:", err);

// ✅ After
(req as any).log?.error({ err }, "Failed to fetch orders");
```

### 2. Proper Imports

**Purpose**: Prevents usage of deprecated Winston/Morgan logger imports.

**Validates**:

- No `import ... from "winston"`
- No `import ... from "morgan"`
- Only imports from `"../logging/index.js"` or `"./logging/logger.js"`

**Why**: Winston is 5-10x slower than Pino and lacks:

- Built-in PII redaction
- Worker-thread transports
- Native JSON output
- Request-scoped child loggers

**Migration**:

```typescript
// ❌ Before
import { logger } from "./middleware/logger.js"; // Winston

// ✅ After
import { logger } from "../logging/index.js"; // Pino
```

### 3. req.log Usage

**Purpose**: Ensures route handlers use request-scoped logging for automatic `requestId` tracing.

**Validates**:

- Route handlers use `req.log` instead of root `logger`
- Pattern: `(req as any).log?.error()` for safety

**Why**: `req.log` is a child logger created by `pino-http` that automatically includes:

- `requestId` (for end-to-end tracing)
- `method` (GET, POST, etc.)
- `url` (request path)
- `userId` (from session)

**Migration**:

```typescript
// ❌ Before (loses requestId context)
import { logger } from "../logging/index.js";
export async function getOrder(req: Request, res: Response) {
  try {
    // ...
  } catch (err) {
    logger.error({ err, orderId: req.params.id }, "Failed");
  }
}

// ✅ After (automatic requestId tracing)
export async function getOrder(req: Request, res: Response) {
  try {
    // ...
  } catch (err) {
    (req as any).log?.error({ err, orderId: req.params.id }, "Failed");
  }
}
```

### 4. Message Format

**Purpose**: Validates correct Pino API signature (object first, message second).

**Validates**:

- Pino pattern: `logger.info({ data }, "message")` ✅
- NOT Winston pattern: `logger.info("message", { data })` ❌

**Why**: Pino's signature is `(mergingObject, message, ...interpolationValues)`, not `(message, mergingObject)` like Winston.

**Migration**:

```typescript
// ❌ Before (Winston pattern)
logger.info("User logged in", { userId: "123" });

// ✅ After (Pino pattern)
logger.info({ userId: "123" }, "User logged in");
```

### 5. Child Logger Bindings (NEW)

**Purpose**: Validates that child loggers include persistent context bindings for traceability.

**Validates**:
- Child loggers have meaningful context: `module`, `service`, `component`
- Not empty: `logger.child({})` ❌
- Not transient data: `logger.child({ requestId, orderId })` ❌

**Why**: Child loggers should bind persistent context that stays constant across multiple log calls:
- **Good**: `logger.child({ module: 'payment', service: 'stripe' })`
- **Bad**: `logger.child({ orderId })` (changes per request - use in log call instead)

**Migration**:
```typescript
// ❌ Before (empty or transient bindings)
const log = logger.child({});
log.info({ orderId }, 'Processing order');

const log2 = logger.child({ orderId: req.params.id });
log2.info('Order fetched');

// ✅ After (persistent context bindings)
const log = logger.child({ module: 'orders', component: 'orderService' });
log.info({ orderId }, 'Processing order');
log.info({ orderId }, 'Order fetched');
```

### 6. String Interpolation (NEW)

**Purpose**: Detects performance-harming string concatenation/interpolation in log messages.

**Validates**:
- No template literals: `` logger.info(`User ${userId} logged in`) `` ❌
- No concatenation: `logger.info('User ' + userId + ' logged in')` ❌
- Use structured fields: `logger.info({ userId }, 'User logged in')` ✅

**Why**: String interpolation happens **before** the log level check:
- CPU wasted building strings for logs that are below threshold
- Structured fields only serialize if log level passes
- Better query-ability in log aggregation tools

**Migration**:
```typescript
// ❌ Before (premature string building)
logger.info(`Order ${orderId} total: $${total}`);
logger.warn('Failed to fetch user: ' + err.message);

// ✅ After (efficient structured logging)
logger.info({ orderId, total }, 'Order processed');
logger.warn({ err }, 'Failed to fetch user');
```

### 7. Error Serialization (NEW)

**Purpose**: Ensures error objects are logged with full stack traces using Pino's error serializer.

**Validates**:
- NOT: `logger.error({ message: err.message }, 'text')` ❌
- NOT: `logger.error({ error: err.toString() }, 'text')` ❌
- YES: `logger.error({ err }, 'text')` ✅

**Why**: Pino's `stdSerializers.err` automatically extracts:
- Error type/name
- Error message
- Full stack trace
- Any custom error properties

Logging only `err.message` loses the stack trace, making debugging nearly impossible.

**Migration**:
```typescript
// ❌ Before (loses stack trace)
try {
  await operation();
} catch (err) {
  logger.error({ message: err.message }, 'Operation failed');
  logger.error({ error: err.toString() }, 'Operation failed');
}

// ✅ After (full error context)
try {
  await operation();
} catch (err) {
  logger.error({ err }, 'Operation failed');
  // Pino automatically logs: type, message, stack, and custom properties
}
```

### 8. Serializer Usage (NEW)

**Purpose**: Validates that sensitive objects (user, request, session) use serializers or explicit field access to prevent PII exposure.

**Validates**:
- NOT: `logger.info({ user: userData }, 'Logged in')` ❌ (may contain password)
- YES: `logger.info({ userId: user.id, role: user.role }, 'Logged in')` ✅
- YES: `logger.info({ req }, 'Request')` ✅ (standard Pino serializer)

**Why**: Logging full objects can expose sensitive data:
- Passwords stored in user objects
- Auth tokens in request headers
- Credit card details in session data

**Protected Objects**: `user`, `request`, `req`, `response`, `res`, `session`, `auth`

**Migration**:
```typescript
// ❌ Before (PII exposure risk)
logger.info({ user: userData }, 'User logged in');
// userData might contain: { id, email, password, ssn, creditCard }

logger.debug({ request: fullRequest }, 'API call');
// fullRequest might contain: Authorization headers, cookies, API keys

// ✅ After (explicit safe fields)
logger.info({ userId: user.id, role: user.role }, 'User logged in');

logger.debug({ method: req.method, url: req.url }, 'API call');

// ✅ OR configure serializer for automatic PII redaction
const logger = pino({
  serializers: {
    user: (user) => ({ id: user.id, role: user.role }), // Redacts password/email
  },
  redact: {
    paths: ['user.password', 'user.ssn', 'req.headers.authorization'],
    censor: '[REDACTED]',
  },
});
```

## Best Practices

### General Logger Usage

```typescript
import { logger } from "../logging/index.js";

// ✅ Structured logging with object first
logger.info({ userId: "123", action: "login" }, "User logged in");

// ✅ Simple message without data
logger.info("Server started");

// ✅ Error with automatic serialization
try {
  await riskyOperation();
} catch (err) {
  logger.error({ err }, "Operation failed"); // Pino auto-serializes stack/message
}
```

### Route Handler Logging

```typescript
import type { Request, Response } from "express";

export async function getOrder(req: Request, res: Response) {
  const { id } = req.params;

  try {
    const order = await fetchOrder(id);

    // ✅ Success logging with structured data
    (req as any).log?.info({ orderId: order.id }, "Order fetched");

    res.json({ data: order });
  } catch (err) {
    // ✅ Error logging with automatic requestId
    (req as any).log?.error({ err, orderId: id }, "Failed to fetch order");
    res.status(500).json({ error: "Internal server error" });
  }
}
```

### Module-Level Child Loggers

```typescript
import { createChildLogger } from "../logging/index.js";

const log = createChildLogger("rbac");

export function loadRbacRules() {
  try {
    const rules = loadFromFile();
    log.info({ ruleCount: rules.length }, "RBAC rules loaded");
  } catch (err) {
    log.error({ err }, "Failed to load RBAC rules");
  }
}
```

### Testing with Mock Logger

```typescript
import { describe, it, expect, vi, beforeEach } from "vitest";
import { MockLogger } from "../../tools/ci-gate/logger/templates/mock-logger.js";

const mockLogger = new MockLogger();
vi.mock("../logging/index.js", () => ({ logger: mockLogger }));

describe("Order Service", () => {
  beforeEach(() => {
    mockLogger.clear();
  });

  it("logs error when order fetch fails", async () => {
    await fetchOrder("non-existent-id");

    expect(mockLogger.hasLog("error", "Failed to fetch order")).toBe(true);

    const errorLog = mockLogger.findLog("error", /Failed/);
    expect(errorLog?.data?.orderId).toBe("non-existent-id");
  });
});
```

## CI Integration

### GitHub Actions

```yaml
name: Logger Validation
on: [push, pull_request]
jobs:
  logger-ci-gate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v3
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: pnpm
      - run: pnpm install
      - name: Run Logger CI Gate
        run: node tools/ci-gate/logger/index.mjs
```

### Pre-commit Hook

```bash
# .husky/pre-commit
#!/usr/bin/env sh
. "$(dirname -- "$0")/_/husky.sh"

node tools/ci-gate/logger/index.mjs
```

### Package Scripts

Add to `package.json`:

```json
{
  "scripts": {
    "ci:logger": "node tools/ci-gate/logger/index.mjs",
    "ci:logger:fix": "node tools/ci-gate/logger/index.mjs --fix"
  }
}
```

## Exceptions & Allowlist

Some files are intentionally excluded:

- **Test files**: `*.test.ts`, `*.spec.ts`, `e2e/**` — mocks are acceptable
- **Config validation**: `apps/api/src/config/index.ts` — startup console warnings are okay
- **Node modules**: `node_modules/**`, `dist/**`, `build/**`

To add more exceptions, edit the `ALLOWED_FILES` array in each checker module.

## Upgrading Logger Patterns

When Pino releases new features or patterns, update:

1. **Checkers** — Add new validation rules in `checks/`
2. **Examples** — Update patterns in `templates/`
3. **Documentation** — Update this README with migration guide
4. **Root Logger** — Update `apps/api/src/logging/logger.ts` config

All changes are validated by this CI gate in PRs.

## Troubleshooting

### False Positives

If a check incorrectly flags valid code:

1. Check if the file should be in `ALLOWED_FILES`
2. Refine the regex pattern in the checker
3. Add comments explaining the exception

### Missing Violations

If a check misses actual violations:

1. Review the regex patterns in `checks/`
2. Add test cases in `templates/` to verify
3. Consider AST-based parsing (future enhancement)

## Future Enhancements

- [ ] **AST-based validation** — Use TypeScript compiler API for precise code analysis
- [ ] **Auto-fix mode** — Automatically rewrite violations (where safe)
- [ ] **PII detection** — Validate redaction patterns for sensitive data
- [ ] **Performance metrics** — Track log volume and suggest optimizations
- [ ] **Log level enforcement** — Ensure critical events use correct levels

## References

- [Pino Official Docs](https://github.com/pinojs/pino)
- [pino-http Middleware](https://github.com/pinojs/pino-http)
- Migration Plan (session artifact, not committed in repository)

---

**Maintainer**: AFENDA Platform Team  
**Last Updated**: March 24, 2026  
**Version**: 1.0.0
