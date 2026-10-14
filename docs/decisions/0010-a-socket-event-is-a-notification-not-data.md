---
type: Decision
title: A socket event is a notification, not data
description: Real-time events tell a client that something changed so it can refetch; they are never the source of state, so a missed event never leaves a screen stale.
tags: [adr, real-time, kds, qr, pos]
timestamp: 2026-10-14T00:00:00Z
---

# 10. A socket event is a notification, not data

Date: 2026-10-14

## Status

Accepted

## Context

N3 asks for status between the till, the kitchen display and the guest's phone
to arrive within about two seconds. A persistent socket per client, grouped
into a room per outlet, a room for the kitchen and a room per table session,
meets that from a single server process.

Sockets drop. A tablet sleeps, a phone switches towers, the server restarts
for a deploy. Any event sent while a client is disconnected is gone. If
clients build their state from the event stream, a missed event leaves a
kitchen display missing a ticket, or a guest watching an order that has
already been served. Nothing on screen shows that this has happened.

Making the stream reliable (acknowledgements, replay from an offset, a durable
broker) would bring in infrastructure that the single-server design
deliberately avoids
([ADR 0011](0011-one-process-and-one-database-until-a-scale-trigger.md)).

## Decision

**A socket event is a notification that something changed, not the change
itself.** A client that receives one refetches the affected state from the
server through its normal read path. **On every reconnect, a client refetches
everything it shows.**

The server's database stays the only source of truth for the online clients.
An event may carry enough to identify what changed and to drive an alert (a
sound, a badge, a countdown), but no screen treats an event's contents as
authoritative.

Event names and their payload shapes are defined once in the shared contract
package and typed on both ends. A misspelt event name is a type error, not a
silent miss.

## Consequences

Missing an event costs one refetch, never a wrong screen. Reconnect is the
recovery path, and since it runs on every reconnect, it gets tested
constantly.

Each event causes a read, so the server does more reads than a push-the-data
design would. At café scale that is negligible, and the reads go through the
same isolation and validation as any other request.

Latency is now a socket hop plus a read. The two-second budget still holds
from a single server in-region, but a slow read endpoint now shows up as a
slow real-time update.

Several instances of the server would each have their own rooms. Moving past
one instance needs a shared adapter for the socket layer. That is a planned
scale step, not a redesign, because events never carried state.
