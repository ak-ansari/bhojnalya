---
type: Decision
title: Who a request acts for is read fresh on every request
description: A short-lived sign-in token says only who signed in and for which business; their outlets and roles, and whether a device is still allowed in, are read from the database on every request; a person names the one outlet a request acts for; and an answer that carries a long-lived secret is never kept for replay.
tags: [adr, auth, security, multi-tenancy]
timestamp: 2026-10-14T00:00:00Z
---

# 27. Who a request acts for is read fresh on every request

Date: 2026-10-14

## Status

Proposed

## Context

Owners sign in with a password and get a short-lived signed token plus a
rotating refresh secret; tills and kitchen screens hold a long-lived device
secret (TRD §13). Every request must then say which business it acts for, which
outlets it may reach and, for the suspension rule
([ADR 0015](0015-suspension-stops-new-sales-never-record-keeping.md)), which one
outlet it acts for.

A signed token can carry all of that, so a request needs no lookup. But
whatever it carries is stale until it expires: an owner who removes a
manager's access, disables an account, or revokes a lost tablet expects that to
hold now, not in fifteen minutes. A device secret cannot carry anything at all;
it has to be looked up, and revoking it (TRD §17) only works if it is
looked up every time.

An owner of several outlets also has to say which outlet a change is for.
Without that, a change could name an outlet that is suspended while the
request as a whole looks like it acts for none.

A registration answer carries the new device's secret, which the server keeps
only as a hash. Replaying a retried request from a stored answer
([ADR 0009](0009-ids-are-made-by-the-client.md)) would mean keeping that secret
in the clear.

## Decision

**The sign-in token names only the person and their business.** Each request
reads that person's status and their role at each outlet from the database
before it runs. A device secret is looked up on every request and refused once
the device is revoked or replaced.

**A person names the outlet a request acts for**, and the request then reaches
only that outlet. A person with one outlet acts for it without naming it. A
person with several who names none reaches all of them and acts for none.

**An answer that carries a long-lived secret is never stored for replay.** The
id the client made for the new device makes a repeated registration fail
loudly, and the device is registered again in place of the first.

**A refresh secret works once.** Presenting one that was already used ends
every session descended from the same sign-in, with no grace period.

## Consequences

Revoking a device, disabling an account or changing a role takes effect on the
next request. Each signed-in request costs one extra short read before its own
transaction; with one database next to the API
([ADR 0011](0011-one-process-and-one-database-until-a-scale-trigger.md)) that is
cheap, and it is the first thing to revisit if a scale trigger fires.

The token stays small and says nothing that goes stale, so a client may show
what it holds without trusting it.

A multi-outlet owner who names no outlet is not checked against suspension on
a change. Routes that change one outlet's data take that outlet from the
request's acting outlet, or check it themselves.

A registration whose answer is lost cannot be recovered; the device is
registered again, and the lost one is retired like any replaced device, so its
code is never reused.

Two browser tabs that refresh with the same secret at the same moment sign
each other out. That is the price of treating every reuse as theft.
