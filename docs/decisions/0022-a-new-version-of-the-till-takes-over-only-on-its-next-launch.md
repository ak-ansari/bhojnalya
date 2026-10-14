---
type: Decision
title: A new version of the till takes over only on its next launch
description: The installed counter and kitchen app downloads an update in the background and switches to it the next time it is opened, never by reloading a screen that staff are using.
tags: [adr, frontend, pos, kds, offline, deployment]
timestamp: 2026-10-14T00:00:00Z
---

# 22. A new version of the till takes over only on its next launch

Date: 2026-10-14

## Status

Proposed

## Context

The counter and kitchen app is installed to the home screen and keeps its
own copy of its code on the device, so it opens with no network (N2,
[ADR 0006](0006-the-till-is-local-first-the-kitchen-and-guests-are-online.md)).
When a new version is deployed, the device fetches it in the background and
must at some point switch to it.

The common default is to switch at once and reload the page. On a till that
reload can land in the middle of an order: the cashier loses the screen they
were on, a print dialog closes, a half-entered discount is gone. Anything
already written to the device survives, but the person at the counter sees
the app restart under their hands during a rush.

The other extreme is to ask staff every time ("A new version is ready —
reload?"). That needs a prompt, and a busy counter dismisses prompts.

Deploys are infrequent and almost never urgent for a till that bills
correctly offline; the server already accepts what older versions send.

## Decision

**A downloaded update waits.** The installed app keeps running the version
it was opened with, and the new version takes over the next time the app is
launched from scratch. The app never reloads itself.

A version that must not wait (a billing or numbering fix) gets an explicit
prompt that staff can accept between orders. That prompt is not built yet.

## Consequences

A screen staff are using never restarts on its own, so no deploy can
interrupt a bill.

Devices run mixed versions for a while. A tablet that is never closed keeps
the old version until it is, which may be days on a counter that stays on.
The server must keep accepting what the previous version sends, which an
offline till's queued operations already demand.

Shipping an urgent fix to the till needs the update prompt, and until it is
built the only route is asking the café to close and reopen the app.
