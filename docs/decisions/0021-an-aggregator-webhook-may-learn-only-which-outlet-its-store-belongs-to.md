---
type: Decision
title: An aggregator webhook may learn only which outlet its store belongs to
description: An inbound aggregator webhook finds its tenant and outlet through one more fixed pre-sign-in lookup keyed by the provider and the provider's store id, so the raw payload is stored under the outlet's own isolation rules.
tags: [adr, aggregators, multi-tenancy, rls]
timestamp: 2026-10-14T00:00:00Z
---

# 21. An aggregator webhook may learn only which outlet its store belongs to

Date: 2026-10-14

## Status

Proposed

## Context

[ADR 0012](0012-aggregators-sit-behind-an-adapter.md) has an inbound webhook
verify its signature, store the raw payload and return at once (A1, A2). The
webhook comes from the middleware, not from a signed-in user or a registered
device. All it says about where it belongs is the provider and the provider's
id for the store.

Every stored row belongs to a tenant and, for sales data, to an outlet
([ADR 0005](0005-tenant-isolation-is-enforced-by-the-database.md),
[ADR 0014](0014-built-for-chains-shipped-for-cafes.md)). To store the payload
under those rules, the webhook first has to find out which outlet the store
id belongs to. That is the same problem as signing in, and
[ADR 0019](0019-a-caller-without-a-tenant-may-learn-only-which-tenant-holds-its-secret.md)
says that adding a lookup to its fixed set is a new decision.

The alternatives that lost:

- **Store webhooks in a tenant-free inbox** and sort them out in a job. That
  creates a table outside isolation that holds customer names, phone numbers
  and addresses, and the job then needs the privileged path to read it.
- **Put the tenant and outlet in the webhook address** registered with the
  middleware. The address is configuration on the provider's side. A wrong or
  stale one would file orders under the wrong outlet, and checking it would
  need the same lookup anyway.
- **Route webhooks through the privileged module.** Every delivery order
  would then become support traffic, as ADR 0019 already argued for sign-in.

## Decision

The fixed set of pre-sign-in lookups gains **one more**: given a provider and
that provider's store id, it returns **only** the tenant, the outlet and the
link's own id. A store id names at most one outlet per provider across the
platform. An unknown pair returns nothing.

The webhook then stores the raw payload, and does everything after that,
inside that outlet's context, under the ordinary isolation rules. A store
whose integration is switched off is still found, and the application
decides what to do with its webhooks.

## Consequences

Webhooks are stored with their tenant and outlet from the first moment, so
the raw payloads, which hold guests' personal data, are never outside
isolation.

The narrow gap in isolation that ADR 0019 opened gets one more entry. Anyone
who knows a provider's store id learns that it is on the platform and which
tenant and outlet hold it, but nothing else. A store id is not a secret, so
the lookup must never be treated as authentication: the signature check is
what proves a webhook came from the provider.

A webhook for a store id nobody has linked yet cannot be stored. It is
refused and the provider retries, so an outlet should be linked before the
provider starts sending.

Two tenants can never link the same store at the same provider. That matches
how providers assign store ids, but a store moving between tenants means
unlinking it first.
