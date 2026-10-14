---
type: Decision
title: The till stores what it will send, and a refused change waits for a person
description: The till keeps records and outbox operations in their wire form, checked against the shared contract when written; an operation the server refuses stays on the device, out of the push queue, until staff retry it; clearing the device wipes its identity with its counters.
tags: [adr, offline, sync, pos, money]
timestamp: 2026-10-14T00:00:00Z
---

# 25. The till stores what it will send, and a refused change waits for a person

Date: 2026-10-14

## Status

Proposed

## Context

The till writes every change to its own browser database first and appends an
operation to an outbox
([ADR 0006](0006-the-till-is-local-first-the-kitchen-and-guests-are-online.md)).
Three questions came up building it.

**How money is stored.** In memory an amount is an exact integer of paise
([ADR 0003](0003-money-is-integer-paise.md)); on the wire it is a string of
digits ([ADR 0018](0018-money-crosses-the-wire-as-a-string-of-digits.md)).
The browser database can hold exact big integers in Chromium and in the
emulated engine the tests use, but that has not been checked on the iPad
Safari versions cafés run. If it fails there, the bill fails to save on the
device where losing it costs the most.

**What happens to a change the server refuses.** A refusal is not a network
failure: sending the same operation again gets the same answer. Re-sending it
forever wastes every push; dropping it loses a record the customer may
already hold on paper (N2).

**What "clear data" may clear.** The device's invoice counters live in the
same database. A device that keeps its code but loses its counters would
issue numbers it has already used ([ADR 0007](0007-an-invoice-number-comes-from-a-device-series.md)).

## Decision

**The till stores records and outbox operations in their wire form**:
amounts as digit strings, exactly what the server will receive. Each is
checked against the shared contract when it is written, inside the same local
transaction as the change. A change the contract would refuse is never saved
and, for an invoice, never issued: the number is not used. Screens decode
what they read back into exact integers.

**A refused operation stays on the device, flagged with the server's reason,
and leaves the push queue.** Later operations keep syncing. Staff see the
count of refused changes beside the unsynced count, can export them, and can
put them back in the queue with one action once the cause is fixed. A refused
operation still counts as unsynced, so it blocks sign-out, clearing and
reset.

**Clearing the device's data clears everything**, its identity and invoice
counters included, in one transaction that first checks the outbox is empty.
A cleared device must be paired again and is given a new device code, so its
old series is never continued from zero.

## Consequences

Storage no longer depends on a browser feature that is unverified on the
target tablets. The outbox needs no conversion before a push, and what the
device exports in an emergency can be pushed by hand unchanged.

A mistake that would make the server refuse an operation's shape now stops
the bill on the device, before a number is used, instead of surfacing later
as a refused sync. The cashier sees an error at the counter: louder, but
recoverable, where a refused invoice is a filing problem.

Reading a record costs a decode. At a café's daily volume that is negligible.

A refused operation waits for a person, so a server-side fix does not clear
it on its own. That is deliberate: someone should look at why an issued bill
was refused. The device keeps pushing everything after it, so one bad record
never holds up the rest; the server must tolerate a gap in a device's
sequence where a refused operation sits.
