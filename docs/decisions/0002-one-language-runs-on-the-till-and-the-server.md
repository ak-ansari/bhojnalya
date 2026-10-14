---
type: Decision
title: One language runs on the till and the server
description: Every app and the server are written in one language, because the bill a till prints offline and the bill the server recomputes must come from the same code.
tags: [adr, architecture, stack, billing]
timestamp: 2026-10-14T00:00:00Z
---

# 2. One language runs on the till and the server

Date: 2026-10-14

## Status

Accepted

## Context

The till must produce a GST-correct bill with no network (N2). That means the
tax, discount, service charge and round-off calculations run in the browser on
the counter device. The server must calculate the same bill again when the
invoice syncs, to catch a bug or a tampered client before it reaches an
owner's GST report (see [ADR 0004](0004-the-billing-engine-is-pure-and-the-server-re-runs-it.md)).

If the browser and the server run different languages, the billing rules are
written twice. Two implementations of rounding and pro-rata discount splitting
will drift: one rounds a half paisa differently, or splits a remainder onto a
different line. Every drift shows up as a flagged invoice that is really a
mismatch between two copies of the rules. The owner cannot tell that apart
from a real error.

The alternative was a server language picked on its own merits, with the
billing rules either ported by hand or compiled to a portable target that both
sides load. Hand porting is the drift problem above. A portable compiled module
adds a build chain and a debugging boundary that a one-or-two person team
cannot afford in a three-month MVP.

## Decision

One language and one type system run everywhere: the server, the till and
kitchen app, the guest menu and the owner portal.

The billing rules, the request and response shapes, the sync operations and
the real-time event names are each defined once, in shared packages that both
the browser apps and the server import. Validation at each boundary uses the
same shared definitions on both sides.

## Consequences

Agreement between the till and the server becomes a property of the build, not
something kept up by review. A change to a billing rule changes both sides in
the same commit, and the same tests cover both.

The whole team works in one language, which matters at this team size.

The server is tied to a runtime chosen for language parity rather than raw
throughput. At the expected load (tens of outlets, then low hundreds) that is
not a constraint. If it becomes one, the answer is to scale the process (see
[ADR 0011](0011-one-process-and-one-database-until-a-scale-trigger.md)), not to
rewrite the billing rules in a second language.

Shared packages must stay free of anything that only one side can run. A
shared billing package that pulls in a server-only or browser-only dependency
breaks the other side, so what the shared packages may depend on has to be
watched.
