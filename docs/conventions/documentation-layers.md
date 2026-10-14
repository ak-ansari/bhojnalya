---
type: Convention
title: The design and the living record are separate documents
description: Why the PRD and TRD may disagree with the code on purpose, why test cases may not, and why neither layer cites the other.
tags: [conventions, documentation, trd, test-cases]
origin_repo: ghatnaghar
timestamp: 2026-10-14T00:00:00Z
---

# The design and the living record are separate documents

Bhojnalya's documentation has two layers with different jobs. The most common
way to damage them is to try to make them agree.

## The two layers

**The design states intent** — the PRD (`docs/BHOJNALYA_PRD.md`), the TRD
(`docs/BHOJNALYA_TRD.md`) and the user stories built from them
(`docs/requirements/`). They say what the product is *meant* to be, and may
disagree with the code in both directions: the code may be behind them, or
ahead of them. Neither is an error in the design.

**Test cases, ADRs and QA runs state the product as it stands.** A reader can
take any of them as a description of today's behaviour. When behaviour
changes, the record changes with it.

## When you find a disagreement

A gap between the TRD and the code is **not a TRD defect**. Closing it by
editing the TRD to match the code destroys the design intent that made the
gap visible.

> The TRD says the server re-runs the billing engine on every synced invoice.
> The code skips invoices pushed in a batch larger than 50.
>
> Wrong fix: change the TRD to say "re-runs it on small batches".
> Right fix: a test case describing what happens today, the large batch named
> as not re-validated — and a bug.

Edit the PRD or TRD only to resolve an inconsistency *within* it, or to fill in
a part of the design that was missed.

The living record moves the other way: it never describes an intention. A test
case asserting behaviour the product does not have is a bug in the test case,
whatever the TRD says.

## How the living record changes

By **supersession**. A test case that no longer describes the product gets a
successor that says what it supersedes and why; the old one stays, marked
Superseded — it is the record of what was true then. Correcting a case that
was *wrong when written* is an ordinary edit.

## Neither layer cites the other

Test cases do not cite the design — no `TRD §6.1`, no `P4`, no `US-POS-03` —
and the design does not link to test cases. A citation claims the two agree,
and the point of the split is that they may not. A case saying "verifies TRD
§7" is wrong the moment §7 describes something unbuilt, and nothing flags it.

Each case says what behaviour it pins, in its own words, readable by someone
who has never opened the TRD. Cross-references *within* a layer are
encouraged: a case referencing another case or an ADR.

Two deliberate exceptions:

- **Code comments cite the TRD** (`// TRD §6.1 rule 4`). A comment points at
  *why the code exists*, not at a claim that it is complete.
- **User-story tests name their story ID** in their `describe`, and the story
  table's `Cov` column names the test. The story is the design's own unit of
  "done", so the link runs from the design to the test that holds it — it is
  a coverage map, the same as ghatnaghar's requirements-coverage table, not a
  case claiming to verify the design.
