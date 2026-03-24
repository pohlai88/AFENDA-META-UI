# AFENDA API

Enterprise-grade metadata-driven backend with production security hardening.

## 🚀 Quick Start

```bash
# Install dependencies
pnpm install

# Copy environment configuration
cp .env.example .env

# Edit .env and set:
# - JWT_SECRET (generate with: openssl rand -base64 32)
# - DATABASE_URL
# - ALLOWED_ORIGINS

# Push database schema
pnpm db:push

# Start development server
pnpm dev
```

## 📦 Scripts

| Command | Description |
|---------|-------------|
| `pnpm dev` | Start development server with hot reload |
| `pnpm build` | Compile TypeScript to JavaScript |
| `pnpm start` | Start production server |
| `pnpm typecheck` | Type-check without emitting files |
| `pnpm db:push` | Push schema changes to database |
| `pnpm db:generate` | Generate Drizzle migrations |
| `pnpm db:studio` | Open Drizzle Studio (GUI) |
| `pnpm meta:introspect` | Introspect database and generate metadata |
| `pnpm auth:token` | Generate JWT tokens for testing |

## 🔒 Security Features

### ✅ Implemented

- **Rate Limiting**: Per-route and global limits to prevent abuse
- **JWT Authentication**: Access + refresh tokens with HS256
- **API Keys**: Service-to-service authentication
- **Input Sanitization**: XSS, NoSQL injection, path traversal prevention
- **Security Headers**: Helmet middleware with production-grade config
- **CORS**: Origin allowlist with credentials support
- **Request Logging**: Winston structured logging (console + file)
- **Error Handling**: Sanitized errors (no stack traces in production)
- **Compression**: Gzip/Brotli response compression
- **RBAC**: Role-based access control with middleware helpers

### 🔐 Token Generation

Generate test tokens for development:

```bash
# Generate access token
pnpm auth:token --userId user123 --roles admin,viewer --lang en

# Generate refresh token
pnpm auth:token --userId user123 --type refresh
```

Use the token in requests:
```bash
curl -H "Authorization: Bearer <token>" \
  http://localhost:4000/api/partners
```

### 🛡️ API Key Authentication

For service-to-service communication:

```bash
# Set API keys in .env
API_KEYS=key1,key2,key3

# Use in requests
curl -H "X-API-Key: key1" \
  http://localhost:4000/api/partners
```

## 📚 API Endpoints

### Authentication

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/auth/login` | User login (returns access + refresh tokens) |
| POST | `/auth/refresh` | Refresh access token |
| POST | `/auth/logout` | Invalidate refresh token |

### Metadata

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/meta` | List all registered models |
| GET | `/meta/:model` | Get ModelMeta for specific model |

### CRUD API

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/:model` | List records (paginated) |
| GET | `/api/:model/:id` | Get single record |
| POST | `/api/:model` | Create record |
| PATCH | `/api/:model/:id` | Update record |
| DELETE | `/api/:model/:id` | Delete record |

### GraphQL

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/graphql` | GraphQL operations |
| GET | `/graphql` | GraphQL Playground (dev only) |

### Health

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/health` | Health check endpoint |

## 🗄️ Database

Uses **Drizzle ORM** with PostgreSQL:

```typescript
// Schema defined in src/db/schema/
export const partners = pgTable("partners", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  email: text("email"),
  type: partnerTypeEnum("type").notNull(),
  // ...
});
```

### Migrations

```bash
# Generate migration files
pnpm db:generate

# Apply migrations
pnpm db:push

# Open database GUI
pnpm db:studio
```

## 📊 GraphQL

Powered by **GraphQL Yoga** + **Drizzle-GraphQL**:

- Auto-generates types from Drizzle schema
- Type-safe resolvers
- GraphiQL playground in development
- RBAC-aware queries

Example query:
```graphql
query GetPartners {
  partners(limit: 10) {
    id
    name
    email
    type
  }
}
```

## 🧪 Testing

Generate test tokens and make requests:

```bash
# Generate admin token
TOKEN=$(pnpm -s auth:token --userId admin --roles admin --lang en | tail -n 1)

# Test authenticated endpoint
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:4000/api/partners

# Test rate limiting
for i in {1..10}; do
  curl http://localhost:4000/health
done
```

## 🔍 Monitoring

### Logs

Development: Colorized console output
```
10:30:15 [info]: 🚀 AFENDA API started
10:30:16 [http]: HTTP Request { method: 'GET', url: '/health', statusCode: 200 }
```

Production: JSON logs for aggregation
```json
{
  "timestamp": "2026-03-23T10:30:15.123Z",
  "level": "info",
  "message": "HTTP Request",
  "method": "GET",
  "url": "/health",
  "statusCode": 200,
  "duration": "12ms"
}
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

## 🚢 Production Deployment

See [SECURITY.md](./SECURITY.md) for comprehensive deployment checklist.

### Critical Steps

1. **Environment Variables**
   ```bash
   NODE_ENV=production
   JWT_SECRET=<32+ char secret>
   DATABASE_URL=postgresql://...?sslmode=require
   ALLOWED_ORIGINS=https://app.yourdomain.com
   ```

2. **Build & Start**
   ```bash
   pnpm build
   NODE_ENV=production pnpm start
   ```

3. **Reverse Proxy** (nginx, Cloudflare, etc.)
   - Enable HTTPS
   - Set `X-Forwarded-For` header for rate limiting
   - Configure load balancing

4. **Monitoring**
   - Set up log aggregation (DataDog, CloudWatch)
   - Configure alerts (error rate, response time)
   - Monitor rate limit headers

## 📖 Documentation

- [SECURITY.md](./SECURITY.md) - Security features & best practices
- [.env.example](./.env.example) - Environment configuration reference

## 🛠️ Tech Stack

- **Runtime**: Node.js + TypeScript
- **Framework**: Express.js
- **ORM**: Drizzle (PostgreSQL)
- **GraphQL**: GraphQL Yoga
- **Auth**: JWT (jose library)
- **Security**: Helmet, express-rate-limit, express-mongo-sanitize
- **Logging**: Winston
- **Dev**: tsx (TypeScript execution)

## 📄 License

MIT
