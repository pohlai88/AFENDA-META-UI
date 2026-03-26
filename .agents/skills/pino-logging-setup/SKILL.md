---
name: pino-logging-setup
description: Official Pino logging best practices - structured JSON logging with child loggers, serializers, transports, and request-scoped logging for production applications.
---

# Pino Logging - Official Best Practices

Pino is a super-fast, all-natural JSON logger for Node.js applications. This skill provides official guidance from the Pino team for production-grade structured logging.

## Core Principles

### 1. **JSON First, Always**
- Pino outputs JSON by default for machine readability
- Use `pino-pretty` only in development (performance overhead)
- Structure logs for parsing by log aggregation services

### 2. **Child Loggers for Context**
- Create child loggers with persistent bindings (requestId, userId, module)
- Child loggers inherit parent configuration and add context
- Use `req.log` pattern in HTTP frameworks for request-scoped logging

### 3. **Correct API Signature**
```javascript
// ✅ Correct - object first, message second
logger.info({ user: userId, action: 'login' }, 'User logged in')

// ❌ Wrong - message first (Winston style)
logger.info('User logged in', { user: userId })
```

### 4. **Serializers for Sensitive Data**
- Mask PII (passwords, tokens, credit cards) before logging
- Transform large payloads to prevent log bloat
- Standardize object formats (req, res, err)

## Basic Setup

### Production Logger
```javascript
const pino = require('pino')

const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  
  // Redact sensitive fields
  redact: {
    paths: [
      'password',
      'token',
      'apiKey',
      'authorization',
      'creditCard',
      '*.password',
      '*.token'
    ],
    censor: '[REDACTED]'
  },
  
  // Custom serializers
  serializers: {
    user: (user) => ({
      id: user.id,
      username: user.username,
      role: user.role
      // Omit sensitive fields like password, email
    }),
    
    body: (body) => {
      const str = JSON.stringify(body)
      return str.length > 1000 
        ? str.substring(0, 1000) + '...[truncated]' 
        : body
    }
  },
  
  // Format timestamp as ISO 8601
  timestamp: pino.stdTimeFunctions.isoTime,
  
  // Base fields
  base: {
    pid: process.pid,
    hostname: require('os').hostname()
  }
})

module.exports = logger
```

### Development Logger with Pretty Print
```javascript
const pino = require('pino')

const transport = pino.transport({
  target: 'pino-pretty',
  options: {
    colorize: true,
    translateTime: 'SYS:standard',
    ignore: 'pid,hostname'
  }
})

const logger = pino({
  level: 'debug',
  transport: process.env.NODE_ENV === 'development' ? transport : undefined
})

module.exports = logger
```

## Child Loggers Pattern

### Request-Scoped Logging (Express/Fastify)
```javascript
const express = require('express')
const logger = require('./logger')

const app = express()

// Middleware: Attach child logger to req
app.use((req, res, next) => {
  req.log = logger.child({
    requestId: req.headers['x-request-id'] || crypto.randomUUID(),
    method: req.method,
    url: req.url
  })
  
  req.log.info('Request started')
  
  res.on('finish', () => {
    req.log.info({ statusCode: res.statusCode }, 'Request completed')
  })
  
  next()
})

// Route handlers use req.log
app.get('/users/:id', async (req, res) => {
  req.log.info({ userId: req.params.id }, 'Fetching user')
  
  try {
    const user = await fetchUser(req.params.id)
    req.log.info({ user }, 'User fetched successfully')
    res.json(user)
  } catch (error) {
    req.log.error({ error, userId: req.params.id }, 'Failed to fetch user')
    res.status(500).json({ error: 'Internal server error' })
  }
})
```

### Module-Scoped Logging
```javascript
// services/payment.js
const parentLogger = require('./logger')
const log = parentLogger.child({ module: 'payment' })

async function processPayment(orderId, amount) {
  log.info({ orderId, amount }, 'Processing payment')
  
  try {
    const result = await stripe.charge({ amount })
    log.info({ orderId, transactionId: result.id }, 'Payment successful')
    return result
  } catch (error) {
    log.error({ error, orderId }, 'Payment failed')
    throw error
  }
}
```

### Nested Child Loggers
```javascript
const logger = require('./logger')

// Request logger
const requestLogger = logger.child({ 
  requestId: 'abc-123', 
  userId: 42 
})

// Payment context within request
const paymentLogger = requestLogger.child({ 
  paymentProvider: 'stripe',
  orderId: 'order-456'
})

paymentLogger.info('Processing payment')
// Output includes: requestId, userId, paymentProvider, orderId
```

## Transports for Production

### Multiple Destinations with Level Filtering
```javascript
const pino = require('pino')

const transport = pino.transport({
  targets: [
    // Console for info+
    {
      target: 'pino-pretty',
      level: 'info',
      options: { destination: 1 } // stdout
    },
    
    // File for errors
    {
      target: 'pino/file',
      level: 'error',
      options: { 
        destination: './logs/errors.log',
        mkdir: true
      }
    },
    
    // File for all debug logs
    {
      target: 'pino/file',
      level: 'debug',
      options: { 
        destination: './logs/debug.log',
        mkdir: true 
      }
    }
  ]
})

const logger = pino({ level: 'debug' }, transport)
```

### Async Logging for Performance
```javascript
const pino = require('pino')

const logger = pino(pino.destination({
  dest: './logs/app.log',
  minLength: 4096, // Buffer before writing
  sync: false      // Asynchronous logging
}))

// Handle graceful shutdown
process.on('SIGTERM', () => {
  logger.flush()
  process.exit(0)
})
```

## Log Levels

Standard levels (lowest to highest priority):
- `trace` (10) - Very detailed debugging
- `debug` (20) - Debug information
- `info` (30) - General information (default)
- `warn` (40) - Warning messages
- `error` (50) - Error messages
- `fatal` (60) - Fatal errors (process exit)

```javascript
logger.trace('Entering function')
logger.debug({ query: sql }, 'Executing query')
logger.info({ userId: 123 }, 'User logged in')
logger.warn({ retries: 3 }, 'Retry limit approaching')
logger.error({ error }, 'Database connection failed')
logger.fatal({ error }, 'Unrecoverable error, shutting down')
```

## Serializers

### Error Serializer
```javascript
const pino = require('pino')

const logger = pino({
  serializers: {
    error: pino.stdSerializers.err
  }
})

try {
  throw new Error('Something broke')
} catch (error) {
  logger.error({ error }, 'Operation failed')
  // Outputs: message, stack, type, code
}
```

### Custom Request/Response Serializers
```javascript
const logger = pino({
  serializers: {
    req: (req) => ({
      id: req.id,
      method: req.method,
      url: req.url,
      headers: {
        'user-agent': req.headers['user-agent'],
        'content-type': req.headers['content-type']
      },
      remoteAddress: req.ip
    }),
    
    res: (res) => ({
      statusCode: res.statusCode,
      headers: {
        'content-type': res.getHeader('content-type')
      }
    })
  }
})
```

## Common Mistakes to Avoid

### ❌ Don't Use console.log/error/warn
```javascript
// ❌ Wrong
console.log('User logged in:', userId)
console.error('Error:', error)

// ✅ Correct
logger.info({ userId }, 'User logged in')
logger.error({ error }, 'Operation failed')
```

### ❌ Don't Use Winston API Signature
```javascript
// ❌ Wrong (Winston style)
logger.info('User logged in', { userId, action })

// ✅ Correct (Pino style)
logger.info({ userId, action }, 'User logged in')
```

### ❌ Don't Use Root Logger in Request Handlers
```javascript
// ❌ Wrong - loses request context
app.get('/users', (req, res) => {
  logger.info('Fetching users') // No requestId!
})

// ✅ Correct - preserves request context
app.get('/users', (req, res) => {
  req.log.info('Fetching users') // Includes requestId
})
```

### ❌ Don't Log Sensitive Data
```javascript
// ❌ Wrong - exposes PII
logger.info({ user }, 'User logged in') // Contains password!

// ✅ Correct - use serializers or explicit fields
logger.info({ userId: user.id, username: user.username }, 'User logged in')
```

### ❌ Don't Use String Concatenation
```javascript
// ❌ Wrong - performance overhead
logger.info('User ' + userId + ' logged in')

// ✅ Correct - structured data
logger.info({ userId }, 'User logged in')
```

## CI/CD and Quality Gates

### Enforce Pino Standards
1. **No console.log/error/warn** - Use logger methods
2. **Proper imports** - Block deprecated loggers (Winston, bunyan, morgan)
3. **req.log usage** - Require request-scoped logging in routes
4. **Message format** - Enforce object-first signature

### Example ESLint Rules
```javascript
// eslint.config.js
module.exports = {
  rules: {
    'no-console': ['error', { allow: ['warn', 'error'] }], // Block console in source
    'no-restricted-imports': ['error', {
      patterns: [{
        group: ['winston', 'bunyan', 'morgan'],
        message: 'Use Pino logger instead'
      }]
    }]
  }
}
```

### Testing with Pino
```javascript
const pino = require('pino')
const { test } = require('node:test')

test('logger captures error context', async () => {
  const stream = pino.destination({ sync: true })
  const logger = pino(stream)
  
  const logs = []
  stream.on('data', (chunk) => {
    logs.push(JSON.parse(chunk.toString()))
  })
  
  logger.error({ userId: 123, action: 'delete' }, 'Failed to delete')
  
  assert.equal(logs[0].level, 50) // error level
  assert.equal(logs[0].userId, 123)
  assert.equal(logs[0].action, 'delete')
})
```

## Performance Tips

1. **Use child loggers for persistent context** - Avoids repetition
2. **Enable async logging** - Buffered writes for high-throughput
3. **Use pino-pretty only in dev** - Performance overhead
4. **Avoid string interpolation** - Use structured fields
5. **Set appropriate log levels** - Reduce noise in production

## Resources

- [Official Pino Docs](https://getpino.io/)
- [Pino GitHub](https://github.com/pinojs/pino)
- [Best Practices](https://github.com/pinojs/pino/blob/main/docs/help.md)
- [Transports](https://github.com/pinojs/pino/blob/main/docs/transports.md)
- [Child Loggers](https://github.com/pinojs/pino/blob/main/docs/child-loggers.md)
