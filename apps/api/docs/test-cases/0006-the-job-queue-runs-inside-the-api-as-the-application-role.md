---
type: Test Case
title: "6. The job queue runs inside the API as the application role"
description: Keeps background work in one process and one database without giving the API ownership of any table.
tags: [test-cases, jobs, database]
status: Proposed
origin_repo: bhojnalya
timestamp: 2026-10-14T00:00:00Z
---

# 6. The job queue runs inside the API as the application role

Date: 2026-10-14

## Status

Proposed

## Given

- The database migrated and the job queue installed by the migration owner.

## When

1. The API starts.
2. It creates a queue, sends a job and fetches it.

## Then

- **The queue runs in the API's own process, connected as the application role.**
- Creating a queue and sending and fetching a job work without owner rights.

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

- `the running API › runs pg-boss in-process as app_user, able to create a queue and send and fetch a job` (integration)
- Any real job: **not built**.

Command: `pnpm --filter @bhojnalya/api test:int`

## References

- [ADR 0011](../../../../docs/decisions/0011-one-process-and-one-database-until-a-scale-trigger.md)
- [ADR 0020](../../../../docs/decisions/0020-background-jobs-run-as-the-application-role-but-are-installed-by-the-owner.md)
