---
type: Decision
title: Indian time is a fixed offset, never the device's zone
description: The financial year and the business date are read at UTC+05:30 by arithmetic, not through the device's time zone or its time-zone database, so every till and the server put the same instant in the same year and the same day.
tags: [adr, billing, gst, time, invoice-numbering]
timestamp: 2026-10-14T00:00:00Z
---

# 16. Indian time is a fixed offset, never the device's zone

Date: 2026-10-14

## Status

Proposed

## Context

An invoice's number carries its financial year, which turns at midnight on
1 April in India (G3, [0007](./0007-an-invoice-number-comes-from-a-device-series.md)).
Reports group sales by business day, and a café that closes after midnight
sets a day-end cutoff so the late sales count towards the evening they
belong to (R1). Both are Indian calendar dates, and both are computed on the
till, offline, and again on the server when it re-runs the bill
([0004](./0004-the-billing-engine-is-pure-and-the-server-re-runs-it.md)).

A till's own time zone cannot be trusted: a tablet set up abroad, or left on
UTC, would put a 00:30 bill on 1 April into the old year. Asking the platform's
time-zone database for Indian time fixes that, but makes a legal date depend
on what the browser or runtime ships. Some builds ship a reduced database, and
the till and the server can differ.

Indian Standard Time is UTC+05:30 all year and has had no daylight saving
since 1945. The alternative that lost was reading it through the time-zone
database by name: correct today, but it adds a dependency the answer does not
need.

## Decision

**The financial year and the business date are computed by shifting the
instant by five and a half hours and reading the calendar date, never through
the device's zone or a time-zone database.** The financial year starts at
1 April 00:00 in that time.

**A business day with a cutoff of N hours runs from N o'clock to N o'clock
the next day.** A sale before the cutoff counts towards the previous calendar
date. The cutoff is a whole hour from midnight to 23:00; midnight means the
business day is the calendar day.

## Consequences

Every till and the server agree on the year and the day for the same instant,
whatever the device is set to and whatever its runtime ships.

If India ever changes its offset or adopts daylight saving, this code changes
by hand; nothing updates it automatically. That is unlikely, and the change
would be one constant.

The tests cross-check the fixed offset against the platform's time-zone
database at random instants, so a disagreement would show up as a failure,
not a misfiled bill.

A cutoff on the half hour (a café closing at 03:30) is not expressible. It can
be added later without changing any existing business date.
