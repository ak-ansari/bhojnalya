---
type: Decision
title: Ids are made by the client
description: Records get time-ordered unique ids created on the device that creates them, and every mutating request from a till or guest carries an idempotency key, so retries and offline creation never duplicate anything.
tags: [adr, ids, idempotency, offline, sync]
timestamp: 2026-10-14T00:00:00Z
---

# 9. Ids are made by the client

Date: 2026-10-14

## Status

Accepted

## Context

A till that is offline still creates orders, invoices and payments
([ADR 0006](0006-the-till-is-local-first-the-kitchen-and-guests-are-online.md)).
Those records must have identities straight away, because other local records
refer to them (an invoice's lines, a payment against an invoice). They must
keep the same identity when they reach the server. Ids handed out by the
server cannot be issued to a device that cannot reach it. Temporary local ids
remapped on sync would mean rewriting every reference, on both sides, inside
the sync protocol.

Networks in cafés drop requests halfway. A guest double-taps "Place order". A
till retries a request whose response was lost. Without a way to recognise a
repeat, each retry is a second order.

Random ids avoid collisions but scatter inserts across an index and carry no
order. Ids that encode their creation time sort roughly by when they were made,
which helps both storage and debugging.

## Decision

**Every record's id is a time-ordered universally unique id, made on the
client that creates the record.** The server accepts these ids as they are and
never reassigns them.

**Every mutating request from a till or a guest carries an idempotency key.**
The server keeps the result of each key for a bounded time and returns the
same result for a repeat instead of acting again.

Sync operations have their own client-made ids. The server records every
operation it has applied, permanently, so replaying a sync batch is always
safe, whatever the time window above.

## Consequences

Records can be created offline and referred to straight away. Sync carries no
id remapping, and a record has one identity everywhere: on the device, on the
wire, in the database and in logs.

Retries are safe by construction. A double tap or a replayed request returns
the first result.

The server has to trust ids from clients. A buggy or hostile client can send an
id that already exists, so a duplicate id must be refused by the database
rather than overwrite a row. Tenant isolation
([ADR 0005](0005-tenant-isolation-is-enforced-by-the-database.md)) keeps such
an id from reaching another tenant's data.

The time order of ids depends on device clocks, so it is approximate. Nothing
that needs a true order, such as invoice numbering or sync application order,
may rely on id order. Those use their own counters.

The idempotency window is bounded, and an offline till can be offline for
longer than that. That is why sync uses permanent operation ids and not the
request key.
