---
type: Decision
title: Aggregators sit behind an adapter
description: Delivery-platform orders arrive through one provider-neutral interface; inbound webhooks are verified, stored raw and acknowledged at once, and all processing and outbound calls run as retried background jobs, switchable per outlet.
tags: [adr, aggregator, integration, jobs]
timestamp: 2026-10-14T00:00:00Z
---

# 12. Aggregators sit behind an adapter

Date: 2026-10-14

## Status

Accepted

## Context

The MVP must take Swiggy and Zomato orders, but through a middleware vendor
rather than directly. The vendor is not settled yet, and direct integrations
are planned for a later phase. The partnership may also arrive late, and
aggregator integration is first in line to be cut if the schedule slips.

The providers set the pace. A webhook sender treats a slow response as a
failure and retries, so it can deliver the same order more than once. An
outbound accept has a hard deadline (A2), and the provider's API can be
unavailable at exactly that moment. Doing the work inside the webhook request
risks timeouts, duplicate orders and lost events, and none of these leaves a
trace afterwards.

## Decision

All aggregator interaction goes through **one provider-neutral interface**:
push the menu, set item stock, set store status, accept, reject, mark food
ready, and parse an inbound webhook. The first implementation targets the
chosen middleware. Later implementations for other middleware or for direct
APIs plug in behind the same interface. No code outside the adapter knows
which provider it is talking to.

An **inbound webhook verifies its signature, stores the raw payload and
returns success at once**. Turning it into an order happens afterwards in a
background job, which deduplicates on the provider's own order id.

**Every outbound call runs as a background job** with retries and backoff,
bounded for time-critical actions. Jobs that keep failing go to a dead-letter
store, and the owner sees a failure banner.

The integration is **switched on or off per outlet** (S4). An outlet without it
behaves as if aggregators did not exist.

## Consequences

The vendor decision can be changed later. Swapping middleware, or adding a
direct integration, is a new implementation of the interface, not a change to
ordering, billing or the kitchen.

Webhooks are cheap and safe to retry. The raw payload is kept for replay and
debugging, so a mapping bug can be fixed and the events reprocessed, rather
than lost.

Processing is asynchronous, so an order appears a moment after the provider
sends it, not as part of the same request. Background jobs also need their
own context (tenant, outlet) set explicitly
([ADR 0005](0005-tenant-isolation-is-enforced-by-the-database.md)).

The interface is shaped by the first provider. A later one with a different
model, such as one without webhooks or with a different accept flow, may force
it to change, and the switch to a direct integration should be expected to
supersede parts of this ADR.

The per-outlet switch means the MVP can launch without the integration. It
also means every aggregator path needs testing in both states.
