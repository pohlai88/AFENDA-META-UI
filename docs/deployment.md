# Deployment Guide

This project is a pnpm monorepo with `apps/api`, `apps/web`, and shared packages.

## Prerequisites

- Node.js 20+
- pnpm 10+
- PostgreSQL and Redis (or Docker Compose)

## Install

```bash
pnpm install
```

## Environment

Create environment files for each app as needed (`apps/api/.env`, `apps/web/.env`).
Use `.env.docker` for local container defaults.

## Build and Validate

```bash
pnpm ci:gate:typescript
pnpm ci:gate
```

## Run Locally

```bash
pnpm --filter @afenda/api dev
pnpm --filter @afenda/web dev
```

## Docker Local Stack

```bash
docker compose up -d
```

## Release Readiness Checklist

- All CI gates passing (`pnpm ci:gate`)
- Seed and schema updates validated
- Web smoke flows manually checked
- Security and dependency checks clean
