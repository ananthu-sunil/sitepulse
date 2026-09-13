# SitePulse

SitePulse is a website monitoring application that periodically checks configured websites, records their availability and response performance, and exposes the collected monitoring data through an HTTP API.

The project is designed as a production-oriented learning project, with an emphasis on clean architecture, explicit boundaries, reliable background processing, database persistence, automated testing, and reproducible containerized development.

---

## Overview

SitePulse monitors configured website targets on a recurring schedule.

For each monitored target, the system can record:

- HTTP status code
- Response time
- Availability
- Scan timestamp
- Scan errors such as timeouts or network failures

The collected scan history is persisted in PostgreSQL and can be queried through the API.

The current system provides:

- Target management
- Background website scanning
- Scan persistence
- Scan history
- Target health calculations
- HTTP API
- PostgreSQL persistence
- Automated tests using a real PostgreSQL test database
- Production-style Docker images
- Docker Compose orchestration
- Explicit database migrations

---

## Architecture

SitePulse is organized as a small monorepo with separate application responsibilities.

```text
                         ┌──────────────────┐
                         │      Client      │
                         │   React + Vite   │
                         └────────┬─────────┘
                                  │
                                  ▼
                         ┌──────────────────┐
                         │      Nginx       │
                         │   Static Server  │
                         └────────┬─────────┘
                                  │
                                  ▼
                         ┌──────────────────┐
                         │      Server      │
                         │ Express HTTP API │
                         └────────┬─────────┘
                                  │
                                  ▼
                         ┌──────────────────┐
                         │   PostgreSQL     │
                         │    Database      │
                         └────────▲─────────┘
                                  │
                                  │
                         ┌────────┴─────────┐
                         │      Worker      │
                         │ Scan Scheduler   │
                         └────────┬─────────┘
                                  │
                                  ▼
                           Monitored Websites
```

The shared backend package contains database access, scanning, migration, and health-related functionality used by both the server and worker.

---

## Monorepo Structure

```text
sitepulse/
├── backend/
│   ├── src/
│   │   ├── config/
│   │   ├── db/
│   │   ├── health/
│   │   └── scanner/
│   ├── package.json
│   └── tsconfig.json
│
├── client/
│   ├── src/
│   ├── package.json
│   └── vite.config.ts
│
├── server/
│   ├── src/
│   │   ├── config/
│   │   ├── db/
│   │   ├── health/
│   │   └── targets/
│   ├── package.json
│   └── tsconfig.json
│
├── worker/
│   ├── src/
│   ├── package.json
│   └── tsconfig.json
│
├── docker/
│   ├── client/
│   │   └── Dockerfile
│   ├── server/
│   │   └── Dockerfile
│   ├── worker/
│   │   └── Dockerfile
│   └── postgres/
│       └── init/
│
├── nginx/
├── compose.yml
├── .env.example
├── package.json
└── package-lock.json
```

---

## Workspace Responsibilities

### `backend`

`@sitepulse/backend` is the shared backend library.

It contains functionality that should not belong specifically to the HTTP server or worker process, including:

- Database access
- Target repositories
- Scan repositories
- Scan history queries
- Scanner implementation
- Scan orchestration
- Health calculations
- Database migrations

The server and worker consume this package through the npm workspace.

---

### `server`

The Express application exposes the HTTP API.

Responsibilities include:

- HTTP routing
- Request validation
- HTTP response handling
- Target management endpoints
- Scan history endpoints
- Health/status endpoints

The server does not contain the background scheduling logic.

---

### `worker`

The worker is responsible for periodic monitoring.

Responsibilities include:

- Loading active monitored targets
- Running scan cycles
- Performing website scans
- Persisting scan results
- Repeating scans at the configured interval
- Graceful shutdown

The worker operates independently from the HTTP server.

---

### `client`

The client is the frontend application built with React and Vite.

The current frontend is intentionally minimal and serves as the foundation for the future SitePulse monitoring dashboard.

---

## Technology Stack

### Backend

- TypeScript
- Node.js
- Express
- PostgreSQL
- `pg`
- Zod

### Frontend

- React
- TypeScript
- Vite

### Testing

- Vitest
- Supertest
- PostgreSQL test database

### Infrastructure

- Docker
- Docker Compose
- Nginx
- PostgreSQL

---

# Running SitePulse Locally

There are two primary ways to work with SitePulse:

1. Run the application components directly on the host machine.
2. Run the complete stack through Docker Compose.

For reproducing the complete application environment, Docker Compose is the recommended approach.

---

# Prerequisites

For local development, install:

- Node.js 24+
- npm
- PostgreSQL

For the containerized setup, install:

- Docker
- Docker Compose

Docker Desktop includes Docker Compose on supported platforms.

---

# Environment Configuration

Copy the example environment file:

```bash
cp .env.example .env
```

On PowerShell:

```powershell
Copy-Item .env.example .env
```

The example configuration contains:

```env
PORT=3000
NODE_ENV=development

POSTGRES_PASSWORD=change-me-locally

DATABASE_URL=postgresql://sitepulse:change-me-locally@localhost:5432/sitepulse

DATABASE_TEST_URL=postgresql://sitepulse:change-me-locally@localhost:5432/sitepulse_test

SCAN_INTERVAL_MS=5000
```

### Important

`.env` is intended for local configuration and must not be committed.

`.env.example` provides the configuration template without containing real secrets.

When SitePulse runs through Docker Compose, the server and worker receive a container-specific database connection using the PostgreSQL Compose service name:

```text
postgres:5432
```

The containers must not use `localhost` to reach PostgreSQL.

---

# Docker Compose

The Docker Compose configuration runs the complete SitePulse stack:

```text
PostgreSQL
Migration
Server
Worker
Client / Nginx
```

The startup dependency chain is:

```text
PostgreSQL
    │
    │ healthy
    ▼
Migration
    │
    │ successful
    ├──────────────► Server
    │
    └──────────────► Worker

Client
    │
    ▼
Nginx
```

Database migrations are executed as an explicit Compose service before the server and worker are started.

---

## Build the Images

From the repository root:

```bash
docker build -f docker/server/Dockerfile -t sitepulse-server:latest .
docker build -f docker/worker/Dockerfile -t sitepulse-worker:latest .
docker build -f docker/client/Dockerfile -t sitepulse-client:latest .
```

The Dockerfiles use multi-stage builds so that development/build dependencies are not copied into the final runtime image.

---

## Start the Complete Stack

After building the images:

```bash
docker compose up
```

To run in detached mode:

```bash
docker compose up -d
```

Check the running containers:

```bash
docker ps
```

The expected application containers are:

```text
sitepulse-postgres-1
sitepulse-migration-1
sitepulse-server-1
sitepulse-worker-1
sitepulse-client-1
```

The migration container is expected to exit successfully after completing its work.

An exit code of:

```text
0
```

indicates successful migration completion.

---

## Application URLs

When running through Docker Compose:

| Component | URL |
|---|---|
| Client | `http://localhost:8080` |
| API | `http://localhost:3000` |
| API health | `http://localhost:3000/health` |
| PostgreSQL | `localhost:5432` |

---

## Verify the API

Check server health:

```bash
curl http://localhost:3000/health
```

Expected response:

```json
{
  "status": "ok"
}
```

List monitored targets:

```bash
curl http://localhost:3000/targets
```

---

# Target Management API

## List Targets

```http
GET /targets
```

Returns the configured monitored targets.

---

## Get a Target

```http
GET /targets/:id
```

Example:

```text
GET /targets/169
```

---

## Create a Target

```http
POST /targets
Content-Type: application/json
```

Request body:

```json
{
  "url": "https://example.com"
}
```

Example using PowerShell:

```powershell
Invoke-RestMethod `
  -Method Post `
  -Uri http://localhost:3000/targets `
  -ContentType "application/json" `
  -Body '{"url":"https://example.com"}'
```

---

## Update a Target

```http
PATCH /targets/:id
```

Target activation/deactivation is supported through the target update API.

---

# Scan History API

SitePulse stores scan results in PostgreSQL.

## List Scan History

```http
GET /targets/:id/scans
```

The default result limit is:

```text
50
```

---

## Custom Limit

```http
GET /targets/:id/scans?limit=25
```

The API accepts positive integer limits up to:

```text
100
```

Values above the maximum are rejected rather than silently clamped.

Results are returned newest-first.

---

# Target Health API

```http
GET /targets/:id/status
```

The endpoint calculates health from recent scan history.

The current health calculation uses a 24-hour window.

A successful response contains information such as:

```json
{
  "status": "up",
  "uptimePercentage": 92.47,
  "averageResponseTimeMs": 550.01,
  "consecutiveFailures": 0
}
```

---

# Scan Engine

The scanner performs an HTTP request against each monitored target.

A successful scan records information such as:

```text
statusCode
responseTimeMs
available
scannedAt
targetId
```

Failed scans can record an error such as:

```text
timeout
network_error
```

This allows failed monitoring attempts to be persisted rather than requiring every scan to have an HTTP status code.

---

# Worker

The worker periodically executes scan cycles against active targets.

The scan interval is configured using:

```env
SCAN_INTERVAL_MS=5000
```

For example:

```text
5000 ms = 5 seconds
```

The worker:

1. Loads active monitored targets.
2. Performs scans.
3. Persists the results.
4. Waits for the next scheduled cycle.
5. Repeats.

The worker also handles `SIGINT` and `SIGTERM` for graceful shutdown.

---

# Database Migrations

Database schema changes are managed through versioned SQL migrations.

Current migrations are stored under:

```text
backend/src/db/migrations/
```

The migration runner:

1. Creates the required schema.
2. Creates the migration tracking table.
3. Detects already-applied migrations.
4. Executes pending migrations in order.
5. Runs each migration transactionally.
6. Records successful migrations.

When using Docker Compose, migrations run automatically through the dedicated:

```text
migration
```

service.

---

# Database

SitePulse uses PostgreSQL for persistent storage.

The Compose setup provides:

- PostgreSQL container
- Persistent Docker volume
- Database healthcheck
- Application database
- Test database initialization

The persistent volume is:

```text
sitepulse-postgres-data
```

Stopping the application containers does not automatically remove the database volume.

---

# Testing

SitePulse uses Vitest for automated testing.

The server tests use Supertest for HTTP-level API testing.

Database-related tests use a real PostgreSQL test database rather than mocking the database layer.

This allows the test suite to verify real database behavior, SQL queries, constraints, and repository interactions.

---

## Server Tests

```bash
npm run test --workspace=server
```

---

## Worker Tests

```bash
npm run test --workspace=worker
```

---

## Backend Tests

```bash
npm run test --workspace=@sitepulse/backend
```

---

## Type Checking

Backend:

```bash
npm run typecheck --workspace=@sitepulse/backend
```

Server:

```bash
npm run typecheck --workspace=server
```

Worker:

```bash
npm run typecheck --workspace=worker
```

---

## Builds

Backend:

```bash
npm run build --workspace=@sitepulse/backend
```

Server:

```bash
npm run build --workspace=server
```

Worker:

```bash
npm run build --workspace=worker
```

Client:

```bash
npm run build --workspace=client
```

---

# Development Workflow

For normal application development, the individual workspaces can be run independently.

### Server

```bash
npm run dev --workspace=server
```

### Worker

```bash
npm run dev --workspace=worker
```

### Client

```bash
npm run dev --workspace=client
```

The development environment requires PostgreSQL to be available and the appropriate environment variables to be configured.

---

# Docker Development Workflow

For validating the complete application as an integrated system:

```bash
docker compose up
```

This is the preferred workflow when validating:

- Container networking
- Database connectivity
- Database migrations
- Server startup
- Worker startup
- Persistent scan storage
- Client serving
- End-to-end monitoring behavior

---

# Stopping the Stack

Stop the running Compose services:

```bash
docker compose down
```

This removes the containers and network but keeps the named PostgreSQL volume.

To remove the database volume as well:

```bash
docker compose down -v
```

**Warning:** removing the volume deletes the persisted PostgreSQL data stored by the Compose environment.

---

# Containerization

SitePulse uses separate production-oriented Docker images for the major application processes.

```text
docker/
├── client/
│   └── Dockerfile
├── server/
│   └── Dockerfile
└── worker/
    └── Dockerfile
```

The server and worker images use multi-stage Node.js builds.

The client uses:

```text
Node.js
   ↓
Vite production build
   ↓
Nginx
```

Only the generated frontend assets are copied into the final Nginx image.

---

# Security Considerations

SitePulse intentionally keeps secrets outside the repository.

Local secrets belong in:

```text
.env
```

and the repository provides:

```text
.env.example
```

as a configuration template.

Docker image security is also checked during development using Docker Scout.

The current images have known base-image and transitive dependency vulnerabilities that are tracked for a subsequent container security-hardening effort.

The container images also have further hardening opportunities, including running application processes as non-root users.

These concerns are intentionally treated as a separate security-hardening milestone rather than mixing unrelated changes into the initial containerization milestone.

---

# Current Project Status

The core monitoring backend is operational.

### Implemented

- [x] Monitored target management
- [x] Target validation
- [x] Website scanning
- [x] Scan persistence
- [x] Scan error persistence
- [x] Background scan worker
- [x] Scan history repository
- [x] Scan history API
- [x] Target health API
- [x] PostgreSQL persistence
- [x] Database migrations
- [x] Isolated PostgreSQL test database
- [x] Automated backend/server/worker tests
- [x] TypeScript builds
- [x] Production Docker images
- [x] Docker Compose orchestration
- [x] PostgreSQL readiness checks
- [x] Explicit migration service
- [x] Container-to-container database networking
- [x] End-to-end containerized monitoring verification

### In Progress / Future

- [ ] Functional monitoring dashboard
- [ ] Improved frontend UX
- [ ] Authentication and authorization
- [ ] Alerting and notifications
- [ ] Container security hardening
- [ ] CI/CD automation
- [ ] Production deployment
- [ ] Monitoring and observability infrastructure

---

# Engineering Principles

SitePulse is intentionally developed around a few core principles.

### Explicit boundaries

The HTTP server, worker, shared backend library, database, and frontend have separate responsibilities.

### Reuse without over-abstraction

Shared functionality belongs in `@sitepulse/backend`, while application-specific orchestration remains in the server or worker.

### Real integration testing

Database behavior is tested against PostgreSQL instead of replacing the database with mocks.

### Explicit database migrations

Database schema changes are versioned and applied through a dedicated migration process.

### Reproducible environments

Docker and Docker Compose provide a repeatable environment for running the complete system.

### Small, reviewable changes

Features and architectural changes are developed in focused branches and reviewed independently.

### Operational correctness

The project is not considered complete merely because individual functions work. The complete system must also start correctly, communicate correctly, persist data correctly, and perform real monitoring work.

---

# License

MIT
