---
type: Decision
title: Suspension stops new sales, never record-keeping
description: A suspended outlet can start no new order, but every invoice it made is accepted when it syncs, and food already sent to the kitchen can still be billed; invoices dated after the suspension are flagged for review.
tags: [adr, platform, offline, billing, sync]
timestamp: 2026-10-14T00:00:00Z
---

# 15. Suspension stops new sales, never record-keeping

Date: 2026-10-14

## Status

Accepted

## Context

S3 gives an outlet a subscription status. A suspended outlet gets read-only
access, and the TRD enforces that by refusing every change it sends. N2 says
no invoice made offline is ever lost, and
[ADR 0004](0004-the-billing-engine-is-pure-and-the-server-re-runs-it.md)
says synced data is stored and never dropped.

The till is local-first ([ADR 0006](0006-the-till-is-local-first-the-kitchen-and-guests-are-online.md)),
so it only learns about a suspension when it next syncs. By then it may hold
invoices made after the suspension started. It may also have tables whose
food has already gone to the kitchen and been served, with nothing billed
yet. A read-only rule that also refuses the sync would leave those invoices
stuck on one device. They are real sales with numbers already printed and
handed to guests, and the outlet still owes GST on them.

The losing alternative was to refuse sync from a suspended outlet until it
pays. That uses the outlet's own financial records as leverage and puts them
at risk of being lost if the device is wiped.

## Decision

A suspension takes effect the moment it is applied, and the reason is
recorded. From then on the outlet can start **no new order**.

**Record-keeping is never suspended.** Every invoice a device syncs is
accepted, whatever the outlet's status. An invoice dated after the suspension
started is stored and **flagged for review**, the same flag a billing mismatch
gets.

Once the till learns of the suspension, it still lets the cashier **bill
orders that already reached the kitchen**. It refuses new orders and new
items. Those bills carry the same flag.

## Consequences

No financial record is lost to a billing dispute, and the outlet's GST
records stay complete even while it is suspended.

A suspended outlet can still write some data, so "suspended means read-only"
is not true. Anyone reading the guard on changes will find one deliberate
exception for synced records and for billing work already in progress. That
exception has to be tested as carefully as the guard itself.

A device whose clock was set back could slip invoices in under the
suspension time. The backwards-clock rule in
[ADR 0007](0007-an-invoice-number-comes-from-a-device-series.md) and the
review flag both narrow this gap. Neither closes it alone.

Someone has to work through the flagged invoices. That is a new item in the
super admin's queue and in the owner's view.
