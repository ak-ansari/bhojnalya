---
type: Test Case
title: "7. The published API document is built from the same schemas that validate each request"
description: Keeps the documentation clients are generated from in step with what the server accepts.
tags: [test-cases, openapi, validation]
status: Proposed
origin_repo: bhojnalya
timestamp: 2026-10-14T00:00:00Z
---

# 7. The published API document is built from the same schemas that validate each request

Date: 2026-10-14

## Status

Proposed

## Given

- The running API with a route whose body is validated by a schema.

## When

1. Anyone fetches `/api/v1/openapi.json`.

## Then

- **It gets an OpenAPI 3.1 document listing every route, with each request body and response taken from the schema the route validates with.**
- Every route also documents the error envelope as its default response.

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

- `the running API › publishes an OpenAPI document generated from the routes and their Zod schemas` (integration)
- Publishing the document in CI: **not built**.

Command: `pnpm --filter @bhojnalya/api test:int`

## References

- [api 0002](./0002-every-api-error-reads-as-a-code-a-message-and-the-request-id-and-never-a-bugs-own-message.md)
