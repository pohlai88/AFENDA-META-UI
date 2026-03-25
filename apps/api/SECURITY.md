# API Security Documentation

## 🔒 Security Features

AFENDA API implements enterprise-grade security with multiple defense layers:

### 1. Authentication & Authorization

#### JWT (JSON Web Tokens)

- **Access tokens**: Short-lived (24h default), used for API requests
- **Refresh tokens**: Long-lived (7d default), used to obtain new access tokens
- **Algorithm**: HS256 (HMAC-SHA256)
- **Claims**: `{ sub: userId, roles: string[], lang: string, type: "access" | "refresh" }`

#### API Keys

- Service-to-service authentication via `X-API-Key` header
- API keys grant admin-level access (use with caution)
- Store in environment variable `API_KEYS` (comma-separated)

#### Role-Based Access Control (RBAC)

- Every request includes a `SessionContext` with user roles
- Anonymous users default to `viewer` role
- Use `requireAuth()` middleware for protected routes
- Use `requireRole("admin")` for role-specific routes

### 2. Rate Limiting

Protects against brute force attacks and API abuse:

| Endpoint | Window | Max Requests | Purpose                    |
| -------- | ------ | ------------ | -------------------------- |
| Global   | 15 min | 100          | Overall API protection     |
| /auth/\* | 15 min | 5            | Brute force prevention     |
| /graphql | 15 min | 50           | Expensive query protection |
| /api/\*  | 15 min | 150          | CRUD operation limits      |
| /meta/\* | 15 min | 200          | Lenient (mostly reads)     |

**Key generator**: Combines IP + user ID for authenticated requests

**Production recommendation**: Use Redis-backed store with `rate-limit-redis` for distributed systems

### 3. Input Sanitization

Multiple layers prevent injection attacks:

#### NoSQL Injection

- Strips `$` and `.` operators from input
- Uses `express-mongo-sanitize`
- Applies to: `req.body`, `req.query`, `req.params`

#### XSS (Cross-Site Scripting)

- Strips dangerous HTML/JS patterns: `<script>`, `javascript:`, `on*=` handlers
- Removes `<iframe>`, `<object>`, `<embed>` tags
- Recursive sanitization of nested objects/arrays

#### Path Traversal

- Blocks `../` patterns in params and query strings
- Returns 400 Bad Request on detection

#### SQL Injection

- Mitigated by Drizzle ORM parameterized queries
- Never use raw string concatenation in SQL

### 4. Security Headers (Helmet)

Helmet middleware adds protective HTTP headers:

```
Content-Security-Policy (production only)
Cross-Origin-Embedder-Policy (production only)
Cross-Origin-Opener-Policy (production only)
Cross-Origin-Resource-Policy: cross-origin
DNS-Prefetch-Control: off
X-Frame-Options: DENY
X-Powered-By: (removed)
Strict-Transport-Security: max-age=31536000 (production only)
X-Content-Type-Options: nosniff
X-Permitted-Cross-Domain-Policies: none
Referrer-Policy: strict-origin-when-cross-origin
X-XSS-Protection: 1; mode=block
```

### 5. CORS (Cross-Origin Resource Sharing)

- Restricted to allowlisted origins (via `ALLOWED_ORIGINS` env var)
- Wildcards (`*`) blocked in production
- Credentials enabled for cookie-based auth
- Preflight caching: 24 hours

### 6. Request Logging

Winston-based structured logging:

**Development**:

- Colorized console output
- Human-readable format
- Debug-level logging

**Production**:

- JSON format (for log aggregation)
- File transports: `logs/combined.log`, `logs/error.log`
- Rotating logs (10MB max, 5-10 file retention)
- HTTP request logging with: method, URL, status, duration, IP, user ID

### 7. Error Handling

Global error handler prevents information leakage:

- **Development**: Includes stack traces for debugging
- **Production**: Sanitized error messages only
- Structured JSON responses with error codes
- Custom error classes: `ValidationError`, `UnauthorizedError`, `ForbiddenError`, etc.
- All errors logged with context (URL, method, IP, user ID)

### 8. Compression

Response compression for bandwidth optimization:

- Gzip/Brotli compression (level 6)
- Only compresses responses > 1KB
- Opt-out via `X-No-Compression` header

---

## 🚀 Production Deployment Checklist

### Required Configuration

- [ ] Set `NODE_ENV=production`
- [ ] Generate strong `JWT_SECRET` (32+ chars): `openssl rand -base64 32`
- [ ] Configure `DATABASE_URL` with SSL: `?sslmode=require`
- [ ] Set `ALLOWED_ORIGINS` to exact domain(s) (no wildcards)
- [ ] Configure `API_KEYS` for service accounts (if needed)
- [ ] Enable HTTPS via reverse proxy (nginx, Cloudflare, etc.)
- [ ] Set up log aggregation (DataDog, CloudWatch, etc.)
- [ ] Configure Redis for distributed rate limiting
- [ ] Set up monitoring & alerts (uptime, error rate, response time)
- [ ] Enable database connection pooling
- [ ] Configure firewall rules (allow only necessary ports)
- [ ] Set up automatic security updates

### Optional Enhancements

- [ ] Enable two-factor authentication (2FA)
- [ ] Implement CAPTCHA for auth endpoints
- [ ] Add Web Application Firewall (WAF)
- [ ] Set up intrusion detection system (IDS)
- [ ] Enable database encryption at rest
- [ ] Configure automated backups
- [ ] Set up DDoS protection (Cloudflare, AWS Shield)
- [ ] Implement audit logging for sensitive operations
- [ ] Add request signing for API keys
- [ ] Configure session management with Redis

### Security Testing

- [ ] Run security scanning (OWASP ZAP, Burp Suite)
- [ ] Test rate limiting under load
- [ ] Verify JWT expiry and refresh flow
- [ ] Test CORS with unauthorized origins
- [ ] Attempt SQL/NoSQL injection attacks
- [ ] Test XSS prevention
- [ ] Verify error messages don't leak sensitive info
- [ ] Check for exposed secrets in logs
- [ ] Test authentication bypass scenarios
- [ ] Verify RBAC permissions are enforced

---

## 📚 Usage Examples

### Generating Tokens

```typescript
import { generateAccessToken, generateRefreshToken } from "./middleware/auth.js";

// Generate access token (24h expiry)
const accessToken = await generateAccessToken("user123", ["admin"], "en");

// Generate refresh token (7d expiry)
const refreshToken = await generateRefreshToken("user123");
```

### Using API Keys

```bash
curl -H "X-API-Key: your-api-key-here" \
  http://localhost:4000/api/partners
```

### Protected Routes

```typescript
import { requireAuth, requireRole } from "./middleware/auth.js";

// Require authentication
router.get("/protected", requireAuth, (req, res) => {
  res.json({ message: "You are authenticated!" });
});

// Require specific role
router.post("/admin-only", requireRole("admin"), (req, res) => {
  res.json({ message: "You are an admin!" });
});
```

### Error Handling

```typescript
import { ValidationError, NotFoundError } from "./middleware/errorHandler.js";

// Throw custom errors
if (!record) {
  throw new NotFoundError("Partner not found");
}

if (!isValid) {
  throw new ValidationError("Invalid email format", {
    field: "email",
    received: email,
  });
}
```

### Async Route Handlers

```typescript
import { asyncHandler } from "./middleware/errorHandler.js";

// Automatically catches async errors
router.get(
  "/users",
  asyncHandler(async (req, res) => {
    const users = await db.select().from(usersTable);
    res.json(users);
  })
);
```

---

## 🔍 Monitoring & Debugging

### Log Levels

```bash
# Development (verbose)
LOG_LEVEL=debug pnpm dev

# Production (minimal)
LOG_LEVEL=info pnpm start

# Debugging specific issues
LOG_LEVEL=verbose pnpm start
```

### Health Check

```bash
curl http://localhost:4000/health
```

Response:

```json
{
  "status": "ok",
  "timestamp": "2026-03-23T10:30:00.000Z",
  "uptime": 3600,
  "environment": "production"
}
```

### Rate Limit Headers

Check remaining requests:

```
RateLimit-Limit: 100
RateLimit-Remaining: 87
RateLimit-Reset: 1711192200
```

---

## 📞 Security Contacts

Report security vulnerabilities to: security@afenda.com

**Do not** open public GitHub issues for security vulnerabilities.
