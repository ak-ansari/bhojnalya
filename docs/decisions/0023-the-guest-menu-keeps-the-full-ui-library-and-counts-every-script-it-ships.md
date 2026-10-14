---
type: Decision
title: The guest menu keeps the full UI library and counts every script it ships
description: The QR guest menu is built on the same UI library as the staff apps rather than a smaller compatible one, uses a minimal router of its own, and fails its build when all of its scripts together pass 120,000 bytes gzipped.
tags: [adr, frontend, qr, performance]
timestamp: 2026-10-14T00:00:00Z
---

# 23. The guest menu keeps the full UI library and counts every script it ships

Date: 2026-10-14

## Status

Proposed

## Context

[ADR 0013](./0013-the-till-and-the-kitchen-are-one-app-the-guest-menu-is-another.md)
holds the guest menu under 120 KB of gzipped script, checked on every build,
so it loads within three seconds on a low-end phone over 4G (N1, N6). The
technical design allows a smaller library that copies the main UI library's
interface if the full one does not fit.

The first shell of the menu, with the full UI library, translations and
routing, ships about 67 KB gzipped. The menu still needs server-state
caching, a socket client and the shared wire schemas, which together cost
roughly 35–40 KB more. That still fits, but with little room left.

The losing alternatives were: switching to the compatible smaller library now,
which saves around 35 KB but means every staff-app habit and test helper
works subtly differently in one app; and the staff apps' full-featured router,
which costs around 15–20 KB for a menu with only a few routes.

How the budget is counted is also a choice: the entry script only, or every
script the build emits; kilobytes of 1,000 or 1,024 bytes.

## Decision

**The guest menu uses the full UI library**, the same as the till and the
owner portal. The smaller compatible library is the first lever to pull if a
later feature pushes the menu over budget, and taking it needs its own
decision.

**The guest menu routes with a minimal router** rather than the staff apps'
router, because it has a handful of routes and every kilobyte is a guest's.

**The budget counts every script the build emits**, each gzipped and then
summed, including chunks loaded later, against **120,000 bytes**. The count
uses decimal kilobytes so it errs strict. A build over budget fails; it never
only warns.

## Consequences

Code, tests and habits carry over between the staff apps and the guest menu
without a compatibility layer to learn.

Every new guest dependency is paid for in the build, by the person who adds
it. The shared wire schemas count too, so a schema change made for the staff
apps can fail the menu's build; that is the point of checking on every build.

Splitting code into lazily loaded pieces does not buy budget, since the count
includes them. Lazy loading still helps a first paint, but it is not a way
around the check.

Routing code differs between the staff apps and the menu, so a route written
for one does not move to the other unchanged.

If the remaining features do not fit, the menu moves to the compatible smaller
library, and some third-party components that rely on the full library's
internals may not work there.
