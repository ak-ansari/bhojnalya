---
type: Decision
title: Record architecture decisions
description: Significant architectural decisions for this platform are recorded as numbered ADRs in Michael Nygard's format, alongside the PRD and TRD rather than inside them.
tags: [adr, documentation, process]
timestamp: 2026-10-14T00:00:00Z
---

# 1. Record architecture decisions

Date: 2026-10-14

## Status

Accepted

## Context

The PRD says what the product must do and the TRD says how the first release
is built. Neither is a good home for the reasoning behind a design choice. Both
are written in the present tense and rewritten as the design moves, so each
rewrite loses why a choice was made and which alternatives lost. That reasoning
is what a future reader needs before changing the choice.

The TRD already holds a table of key decisions, but each row has one line of
justification. That is enough to record a choice, not enough to defend it or to
know when it no longer holds. Several of those choices also run through every
module (integer money, device-scoped invoice numbers, isolation in the
database). A change that quietly breaks one of them is a correctness or
compliance bug, not a style disagreement.

The team is one or two developers. Most decisions are made in a single session
and never discussed again, so whatever is not written down is lost.

## Decision

Significant architectural decisions are recorded as Architecture Decision
Records in Michael Nygard's format: one short document per decision, with
Date, Status, Context, Decision and Consequences.

The PRD and TRD stay the statement of the design. An ADR carries the reasoning
behind one part of it. The first records in this series are backfilled from
the TRD's key decisions and from the invariants the project instructions name.
They record choices already made rather than proposing new ones.

There is one number space for the whole platform, including decisions that
concern only one app or package. Numbers are stable and never reused. A
record is never edited to reverse its meaning. A decision that no longer holds
is superseded by a new record, and the old one is marked as superseded and
kept.

Records stay at the concept level: the decision and its rationale, not the
implementation. See [ADR style](../conventions/adr-style.md).

## Consequences

A reviewer gets the reasoning without reading the whole TRD. A reader who
disagrees with a choice can see what it was traded against before reopening
it. The invariants that span modules each have one place that explains them,
which code comments and test cases can point to.

The cost is discipline. A decision made in a session and not written down is a
decision lost. A substantive change to the TRD should come with an ADR, or an
explicit note that none is needed. The backfilled records also restate the
TRD, so the two can drift. Where they disagree, the ADR states the reasoning,
and the TRD is corrected only when it is inconsistent with itself.
