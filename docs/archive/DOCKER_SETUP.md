# Docker Setup Guide

## One-Command Development Environment

This project includes a `docker-compose.yml` configuration that sets up PostgreSQL and Redis for local development.

### Prerequisites

- Docker 20.10+
- Docker Compose 2.0+

### Quick Start

```bash
# Start services (PostgreSQL, Redis)
docker-compose up -d

# Verify services are healthy
docker-compose ps

# Seed database with migrations (from project root)
cd apps/api
pnpm run db:push

# Start the API server (port 4001)
pnpm dev

# In another terminal, start the web UI (port 5173)
cd apps/web
pnpm dev

# Navigate to http://localhost:5173
```

### Service Details

| Service    | Container Name    | Port | Credentials                  |
| ---------- | ----------------- | ---- | ---------------------------- |
| PostgreSQL | `afenda-postgres` | 5432 | `afenda:afenda-dev-password` |
| Redis      | `afenda-redis`    | 6379 | None (auth-free for dev)     |

### Stopping Services

```bash
# Stop but keep volumes
docker-compose stop

# Stop and remove containers (keeps data in volumes)
docker-compose down

# Stop, remove, and delete all data
docker-compose down -v
```

### Accessing the Database

```bash
# Via psql command-line
docker exec -it afenda-postgres psql -U afenda -d afenda

# View database size
docker exec -it afenda-postgres psql -U afenda -d afenda -c "SELECT pg_size_pretty(pg_database_size('afenda'));"

# Backup database
docker exec afenda-postgres pg_dump -U afenda afenda > backup.sql

# Restore database
docker exec -i afenda-postgres psql -U afenda afenda < backup.sql
```

### Environment Variables

Database URL for `apps/api/.env` is already configured:

```
DATABASE_URL=postgresql://afenda:afenda@localhost:5432/afenda
```

If using Docker from within a container, use the service name:

```
DATABASE_URL=postgresql://afenda:afenda@postgres:5432/afenda
```

### Troubleshooting

**Port already in use**

```bash
# Find process using port
lsof -i :5432  # PostgreSQL
lsof -i :6379  # Redis

# Kill process
kill -9 <PID>

# Or change port in docker-compose.yml
```

**Database connection refused**

```bash
# Check if services are running
docker-compose ps

# View logs
docker-compose logs postgres
docker-compose logs redis

# Restart services
docker-compose restart
```

**Out of disk space**

```bash
# Remove all stopped containers and images
docker system prune -a

# Clean up volumes (be careful!)
docker volume prune
```

### Production Deployment

For production, use managed services (RDS for PostgreSQL, ElastiCache for Redis) rather than Docker Compose. Update environment variables accordingly.
