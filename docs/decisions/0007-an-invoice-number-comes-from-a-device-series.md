---
type: Decision
title: An invoice number comes from a device series
description: Every invoice, online or offline, takes its number from a series owned by the issuing device, allocated in the same local transaction that writes the invoice; device codes are never reused and a clock behind the last bill blocks billing.
tags: [adr, billing, gst, invoice-numbering, offline]
timestamp: 2026-10-14T00:00:00Z
---

# 7. An invoice number comes from a device series

Date: 2026-10-14

## Status

Accepted

## Context

G3 requires invoice numbers that are sequential and unique per financial year,
reset on 1 April, with a configurable prefix. GST rules cap a number at
sixteen characters, using only letters, digits, hyphens and slashes. N2
requires that a till issuing bills offline still produce unique numbers
without gaps.

A single outlet-wide counter on the server gives the neatest sequence, but an
offline till cannot reach it. Reserving blocks of numbers ahead of time leaves
gaps whenever a block goes unused, and a gap in a GST series has to be
explained. Numbering offline bills differently from online ones creates two
code paths and two kinds of number, with the switch between them happening
at the worst moment.

The financial year is an Indian date. A bill issued at 00:30 IST on 1 April
belongs to the new year, even though it is still 31 March in UTC.

## Decision

**Every invoice is numbered from a series owned by the device that issues it,
online or offline, through one code path.** The number is the outlet's prefix,
the device's code, the financial year and the device's sequence within that
year, and it fits in sixteen characters.

The device **increments its counter for the year in the same local transaction
that writes the invoice**. A number is never allocated without its invoice and
never reused. The financial year is computed from the invoice's own time **in
Indian Standard Time**.

**A device whose clock reads earlier than its last invoice may not bill.** It
asks staff to correct the clock. A clock running backwards would put bills in
the wrong year and out of order.

Device codes are issued by the server when a device is registered and are
**never reused**. Re-provisioning a device (reinstalling it, clearing its
storage) retires its code and issues a new one. The last synced number under
the old code is recorded first, for audit.

The server enforces uniqueness of a number within an outlet, tracks the
highest synced number per device and year, and **raises an alert on a gap**,
because a gap means an invoice that was issued and not synced, or was lost. A
cancelled invoice keeps its number (G4).

## Consequences

There is no offline special case. The same allocation runs every time, so the
offline path is tested by every online test.

An outlet's invoices form several gap-free series, one per device, rather
than one. That is compliant, but an owner or accountant reading a report
needs it explained.

The short device code gives a finite pool per outlet. Because codes are never
reused, a device that is re-provisioned often uses them up faster. At café
scale this is far away, but it is a real limit.

Billing depends on the device clock never moving backwards past its last
bill. A device with a broken clock stops billing until someone fixes it. That
is deliberate: refusing to bill is recoverable, while a bill in the wrong year
is a filing error.

A gap is detected only when a later number syncs. A device that dies with
unsynced bills shows a gap only after it is retired, which is why the server
records the last synced number at retirement.
