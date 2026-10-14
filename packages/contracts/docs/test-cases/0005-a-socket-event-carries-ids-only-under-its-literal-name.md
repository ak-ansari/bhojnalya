---
type: Test Case
title: "5. A socket event carries ids only, under its literal name"
description: Protects every screen from trusting state pushed in an event it may have missed; clients refetch instead.
tags: [test-cases, realtime, contracts]
status: Proposed
origin_repo: bhojnalya
timestamp: 2026-10-14T00:00:00Z
---

# 5. A socket event carries ids only, under its literal name

Date: 2026-10-14

## Status

Proposed

## Given

- Something changes that the till, the kitchen screen or a guest should know
  about: a QR order waiting, accepted or rejected, a kitchen ticket created,
  updated or ready, an item's stock changed, a new aggregator order, a
  table's status changed.

## When

1. The server notifies the clients in the room.

## Then

- **Each of the nine events has exactly its literal name**:
  `order.qr_pending`, `order.accepted`, `order.rejected`, `kot.created`,
  `kot.updated`, `kot.ready`, `item.stock_changed`, `aggregator.order_new`,
  `table.status_changed`. Each has a payload definition, and there are no
  others.
- **Every field of every payload is an id.** A name, a status or any other
  data is refused, so a client has to refetch.
- A payload with an extra field is refused.

## Procedure

### Setup

`pnpm install` at the repo root on Node 22.

### Run

`pnpm --filter @bhojnalya/contracts test`

### Verify

The `SOCKET_EVENTS` and `socketEventPayloads` suites pass.

## Coverage

- `SOCKET_EVENTS › names every event as its literal` (unit)
- `SOCKET_EVENTS › has a payload schema for every event and no other` (unit)
- `socketEventPayloads › reads a kot.ready notification` (unit)
- `socketEventPayloads › %s carries ids only` (unit, one per event)
- `socketEventPayloads › refuses a payload that smuggles state` (unit)
- An event reaching only its outlet's room, and clients refetching on it:
  **not built**.

Command: `pnpm --filter @bhojnalya/contracts test`

## References

- [ADR 0010 A socket event is a notification, not data](../../../../docs/decisions/0010-a-socket-event-is-a-notification-not-data.md)
