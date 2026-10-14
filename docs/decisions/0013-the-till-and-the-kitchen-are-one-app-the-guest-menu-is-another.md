---
type: Decision
title: The till and the kitchen are one app; the guest menu is another
description: The counter and kitchen screens ship as one installable app with role-based routes, while the guest's QR menu is a separate, minimal app held to a small script budget for low-end phones.
tags: [adr, frontend, pos, kds, qr, performance]
timestamp: 2026-10-14T00:00:00Z
---

# 13. The till and the kitchen are one app; the guest menu is another

Date: 2026-10-14

## Status

Accepted

## Context

There are four kinds of screen: the till, the kitchen display, the guest's QR
menu, and the owner and platform admin portal. N1 asks for each to run in a
modern browser on Windows, Android and iPad, and asks for the QR menu to work
on low-end Android phones over 4G. N6 and the performance budgets ask for the
QR menu's first load to finish within three seconds on such a phone.

The till and the kitchen display have a lot in common. Both are shared devices
that an owner registers to an outlet (U2). Both use the same device sign-in,
both are installed to the home screen, and both use the same order and ticket
models. Building them as two apps would duplicate that work for two
developers.

The guest menu has the opposite profile. It runs on someone else's phone and
is opened once, cold, over a mobile network, with no install. Every kilobyte
of script delays the first meal order. Bundling it with the till would ship
offline storage, billing and printing code to a guest who needs none of it.

## Decision

**The till and the kitchen display are one installable app** with routes
chosen by the device's role. They share sign-in, device registration and the
shared billing and contract packages.

**The guest QR menu is a separate app**, held to a budget of **under 120 KB of
gzipped script**. It loads the menu as one cached document and lazy-loads
resized images. It shares contract definitions with the rest of the system
but not the till's UI or storage layers.

The owner and platform admin portal is a third app, for the same reason:
different users, different devices, different dependencies.

## Consequences

One app for the counter and the kitchen means one build and one install per
device type. A kitchen screen can be reassigned as a till by changing its role
rather than reinstalling.

The till's bundle can grow with offline storage and printing without
affecting guests. The guest menu's budget is a hard number, so a regression
can be caught by a build check instead of on someone's phone.

Two front ends share contract packages, so a package that is cheap to import
into the till can quietly push the guest menu over budget. The budget check
has to run on every build, not only before a release.

UI primitives can be shared, but only where they fit the guest menu's budget.
Some components may exist twice, once rich for staff and once minimal for
guests. That duplication is accepted.
