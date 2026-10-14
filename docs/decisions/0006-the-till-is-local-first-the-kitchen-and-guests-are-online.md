---
type: Decision
title: The till is local-first; the kitchen and guests are online
description: The till writes every change to its own device first and syncs through an idempotent, ordered outbox; the kitchen display and the guest menu are online clients of the server and simply pause without it.
tags: [adr, offline, sync, pos, kds, qr]
timestamp: 2026-10-14T00:00:00Z
---

# 6. The till is local-first; the kitchen and guests are online

Date: 2026-10-14

## Status

Accepted

## Context

Connectivity at target cafés in tier-2 and tier-3 cities is unreliable. N2
makes offline billing a requirement: the till must keep taking orders,
issuing uniquely-numbered bills, recording payments and printing with no
internet, then sync automatically and idempotently. N6 asks for adding an item
to feel instant, under 100 ms, which a network round trip cannot guarantee
even when online.

The usual design is an online app with an offline mode. That gives two code
paths. The offline one is used rarely, tested less, and breaks on the day it
matters.

The rest of the system does not need the same treatment. N2 allows QR
ordering, kitchen sync across screens and aggregator orders to pause while
offline. A guest's phone is on mobile data, not the café's line. A kitchen
display that is offline has no source of orders except the till next to it.
Making these clients local-first would add conflict handling where nothing is
gained.

## Decision

**The till is local-first.** Every change is written to the browser's own
database on the device first, then appended to an **outbox** of operations.
The same path runs online and offline, so there is no offline mode. The device
keeps what it needs to bill alone: a versioned menu snapshot, tables, open
orders, the day's invoices and payments, invoice counters, and the outbox.

Sync is two operations:

- **Push** sends outbox operations in batches. Each operation has an id made on
  the device. The server records every id it has applied, and **replaying an
  operation acknowledges it without applying it again**. Operations from one
  device are applied in the device's own order, one batch per transaction,
  with a fixed ceiling on batch size.
- **Pull** returns the server-owned changes (menu, stock, tables, orders) since
  an opaque cursor.

**Losing the outbox is prevented, not recovered from.** Signing out, clearing
data and resetting the device are blocked while the outbox holds anything. The
count of unsynced operations is always visible, and an emergency export of
unsynced bills exists. The device asks the browser for persistent storage,
and on platforms that evict storage for uninstalled sites, the till must be
installed.

**The kitchen display and the guest menu are online clients.** The server is
authoritative for them. Without a connection they show that they are offline
and wait. A kitchen order ticket created on an offline till waits in its
outbox, and the till offers to print the ticket as a fallback.

Invoices and payments cannot conflict, because each device owns its own
invoice series and ids ([ADR 0007](0007-an-invoice-number-comes-from-a-device-series.md),
[ADR 0009](0009-ids-are-made-by-the-client.md)). Menu and stock belong to the
server and are pulled.

## Consequences

The till's speed and its availability during an outage no longer depend on
the network or on the server. A server outage turns into a sync delay rather
than lost sales.

Sync becomes a protocol with properties that need their own tests: replaying
a batch changes nothing, an interrupted batch resumes, and operations apply in
device order. These cannot be shown against a stub. They need the real
server and the real database.

Orders and tables edited on two tills while one is offline can still
conflict. The MVP resolves this per field, with the latest change winning and
an audit entry. That assumes most cafés run one till, and it relies on device
clocks. Hardening multi-till offline merging is left to a later phase.

Browser storage is not fully durable. Persistent storage requests, the install
requirement and the blocked sign-out reduce the risk but do not remove it. A
native shell in a later phase is the full answer.

The kitchen is dark during an outage unless tickets are printed, which is
accepted.
