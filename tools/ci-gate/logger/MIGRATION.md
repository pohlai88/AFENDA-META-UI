# Logger CI Gate Migration Guide

Step-by-step guide for applying logger best practices to new or existing code.

## For New Files

When creating new TypeScript files in `apps/api/`:

### 1. Import the Logger

```typescript
// Root logger
import { logger } from "../logging/index.js";

// OR child logger for module context
import { createChildLogger } from "../logging/index.js";
const log = createChildLogger("module-name");
```

### 2. Use Correct Pino API

```typescript
// ✅ Object first, message second
logger.info({ userId: "123", action: "login" }, "User logged in");

// ✅ Simple message
logger.info("Server started");

// ✅ Error with automatic serialization
try {
  await operation();
} catch (err) {
  logger.error({ err }, "Operation failed");
}
```

### 3. Route Handlers: Use req.log

```typescript
import type { Request, Response } from "express";

export async function handler(req: Request, res: Response) {
  try {
    // ...
    (req as any).log?.info({ data }, "Success");
  } catch (err) {
    (req as any).log?.error({ err }, "Failed");
    res.status(500).json({ error: "Internal server error" });
  }
}
```

## For Existing Files

### Step 1: Replace Console Calls

**Find**: `console.log()`, `console.error()`, `console.warn()`  
**Replace**: Pino logger methods

```bash
# Find all console usage
grep -rn "console\." apps/api/src/ --include="*.ts"
```

```typescript
// ❌ Before
console.error("Error fetching orders:", err);

// ✅ After
(req as any).log?.error({ err }, "Failed to fetch orders");
```

### Step 2: Update Imports

**Find**: Winston imports  
**Replace**: Pino imports

```typescript
// ❌ Before
import { logger } from "./middleware/logger.js";

// ✅ After
import { logger } from "../logging/index.js";
```

### Step 3: Fix Message Signature

**Find**: Winston pattern (message first)  
**Replace**: Pino pattern (object first)

```typescript
// ❌ Before
logger.info("User logged in", { userId: "123" });

// ✅ After
logger.info({ userId: "123" }, "User logged in");
```

### Step 4: Use req.log in Routes

**Find**: `logger.error()` in route handlers  
**Replace**: `req.log.error()`

```typescript
// ❌ Before
import { logger } from "../logging/index.js";

export async function getOrder(req: Request, res: Response) {
  try {
    // ...
  } catch (err) {
    logger.error({ err, orderId: req.params.id }, "Failed");
  }
}

// ✅ After
export async function getOrder(req: Request, res: Response) {
  try {
    // ...
  } catch (err) {
    (req as any).log?.error({ err, orderId: req.params.id }, "Failed");
  }
}
```

## Validation

After making changes, run the CI gate:

```bash
# Check for violations
pnpm ci:logger

# Auto-fix (where supported)
pnpm ci:logger:fix

# Typecheck
pnpm typecheck
```

## Common Patterns

### Pattern 1: Error Logging

```typescript
try {
  await riskyOperation();
} catch (err) {
  // ✅ Pino auto-serializes err.stack, err.message
  logger.error({ err, context: "additional data" }, "Operation failed");
}
```

### Pattern 2: Structured Data

```typescript
// ✅ Rich structured data for log aggregation
logger.info(
  {
    userId: session.uid,
    action: "order.create",
    orderId: order.id,
    amount: order.total,
    currency: "USD",
  },
  "Order created successfully"
);
```

### Pattern 3: Child Logger per Module

```typescript
// At top of file
import { createChildLogger } from "../logging/index.js";
const log = createChildLogger("rbac");

// Later in code
export function loadRules() {
  log.info({ ruleCount: 42 }, "RBAC rules loaded");
  log.debug({ source: "filesystem" }, "Rules loaded from disk");
}
```

### Pattern 4: Conditional Logging

```typescript
// ✅ Log only in specific conditions
if (config.isDev) {
  logger.debug({ query: sql }, "Executing database query");
}

// ✅ Use log levels appropriately
logger.error({ err }, "Critical failure"); // Always logs in prod
logger.warn({ msg }, "Degraded performance"); // Warning
logger.info({ userId }, "User logged in"); // Informational
logger.debug({ data }, "Verbose debugging"); // Dev only
```

## Checklist for Code Review

When reviewing PRs:

- [ ] No `console.log/error/warn` usage
- [ ] No `import ... from "winston"` or `"morgan"`
- [ ] Route handlers use `req.log` not root `logger`
- [ ] Pino signature: `logger.method({ object }, "message")`
- [ ] Structured data logged (not just strings)
- [ ] Sensitive data redacted (passwords, tokens, credit cards)
- [ ] Appropriate log levels (error/warn/info/debug)
- [ ] Error objects serialized with `{ err }`

## Quick Reference

| Pattern | Old (Winston) | New (Pino) |
|---------|---------------|------------|
| Import | `import { logger } from "./middleware/logger.js"` | `import { logger } from "../logging/index.js"` |
| Simple log | `logger.info("message")` | `logger.info("message")` ✅ |
| Structured | `logger.info("message", { data })` ❌ | `logger.info({ data }, "message")` ✅ |
| Error | `logger.error("error", { error: err })` ❌ | `logger.error({ err }, "error")` ✅ |
| Route error | `logger.error(...)` ❌ | `(req as any).log?.error(...)` ✅ |
| Child logger | N/A | `createChildLogger("module")` ✅ |

---

**See also**: [README.md](./README.md) for full CI gate documentation
