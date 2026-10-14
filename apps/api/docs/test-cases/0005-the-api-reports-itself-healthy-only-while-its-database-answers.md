---
type: Test Case
title: "5. The API reports itself healthy only while its database answers"
description: Lets the uptime check tell a dead database from a live API.
tags: [test-cases, health, observability]
status: Proposed
origin_repo: bhojnalya
timestamp: 2026-10-14T00:00:00Z
---

# 5. The API reports itself healthy only while its database answers

Date: 2026-10-14

## Status

Proposed

## Given

- The running API.

## When

1. The uptime check calls `/healthz` with nobody signed in.
2. The database stops answering, and it calls again.

## Then

- **While the database answers: 200 `{ "status": "ok", "db": "ok" }`**, outside `/api/v1`.
- Once it does not: 503 in the error envelope with `INTERNAL_ERROR`.

## Procedure

### Setup

`pnpm install` at the repo root on Node 22, with Docker running. The run
starts its own Postgres container with the same roles as `infra/`, applies the
migrations and installs the job queue as the migration owner, then builds the
real API connected as the application role. A test-only guard stands in for
sign-in and takes the principal from a request header.

### Run

`pnpm --filter @bhojnalya/api test:int`

### Verify

The `the running API` suite passes.

## Coverage

- `the running API › answers GET /healthz with 200 when its database answers, outside /api/v1 and without a principal` (integration)
- `the running API › answers GET /healthz with 503 in the error envelope when the database does not answer` (integration)
- Reaching `/healthz` through the local reverse proxy: **not built** (it routes `/api` only).

Command: `pnpm --filter @bhojnalya/api test:int`
