---
type: Test Case
title: "8. Every request's log line names its request, tenant, outlet and device"
description: Lets one request be traced through the logs, and a tenant's trouble be found among all tenants.
tags: [test-cases, logging, observability]
status: Proposed
origin_repo: bhojnalya
timestamp: 2026-10-14T00:00:00Z
---

# 8. Every request's log line names its request, tenant, outlet and device

Date: 2026-10-14

## Status

Proposed

## Given

- A signed-in principal of a tenant acting for an outlet from a device.

## When

1. It sends a request with an `X-Request-Id`.

## Then

- **The request's completion is logged as JSON with `requestId`, `tenantId`, `outletId` and `deviceId`.**
- Credentials in headers are redacted.

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

The `TenantTransactionInterceptor` suite passes.

## Coverage

- `TenantTransactionInterceptor › logs the request's completion with its requestId, tenantId, outletId and deviceId` (integration)
- Credential redaction: **GAP**

Command: `pnpm --filter @bhojnalya/api test:int`

## References

- [api 0001](./0001-every-signed-in-request-runs-in-one-transaction-for-its-own-tenant-and-outlets.md)
