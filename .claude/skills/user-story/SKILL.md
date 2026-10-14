---
name: user-story
description: Add or change a user story and write the cross-app story test that holds it. Use when a feature spans apps or people (QR guest, cashier, cook, owner, aggregator), when asked for a "user story", a "journey" or a "story test", or when sweeping the product for journeys that dead-end.
---

# User story

A **story** is what a person is trying to do, in the PRD's personas. Stories
live in [`docs/requirements/user-stories.md`](../../../docs/requirements/user-stories.md)
— the design layer, so a story may describe something not built yet. A
**story test** is the user-story level of
[`docs/conventions/testing-levels.md`](../../../docs/conventions/testing-levels.md):
a Playwright test in `test/stories/` that drives every app the story crosses,
one browser context per person, against the real stack.

## Steps

1. **Find or write the story.** Search the table first. A new story goes in
   its group with the next free ID, in the form "As a **<persona>** I …, so
   …", with its `Src`: **P** restates the PRD, **T** the TRD's design, **N**
   is new (needs a yes from the team), **?** is open (needs a decision — an
   ADR via the `adr` skill). Never invent a Phase 2+ feature (PRD §6) as an
   MVP story. Done when the story's "so …" names an outcome a person would
   notice if it broke.

2. **Pick the level.** Set `Lvl` to the lowest level that can hold the
   story's core promise. Only a story that **crosses apps or people** gets a
   story test; one that lives in one app is held by an e2e case (`test-case`
   skill), and its `Cov` names that case. Done when `Lvl` is set.

3. **Write the story test** in `test/stories/<journey-or-area>.story.ts`:
   - `describe` starts with the ID: `"US-QR-03 a guest sees their order
     accepted"`, or `"Journey 2 offline billing reconciles"`.
   - One browser context per actor, each at its device's viewport, each
     signed in as its own role. Never one page playing two people.
   - A fresh tenant and outlet per test, provisioned through the
     platform-admin API. Never seed data, never an earlier run's data.
   - The aggregator is the recorded-webhook companion, posting signed
     payloads from `packages/contracts/fixtures/` over HTTP.
   - Assert **what each actor sees** and **what the server stored**, read
     back through the API. A story that only checks screens can pass while
     the server holds a duplicate invoice.
   - Offline is `context.setOffline(true)`; waits are on observable effects,
     never sleeps; money is compared in paise.
   - Break the journey on purpose (drop the socket emit, skip the outbox
     flush) and watch it go **red**.
   Done when `pnpm test:stories` passes and the test has been seen red.

4. **Close the loop.** Fill the story's `Cov` with the test's
   `file › describe`. If the journey dead-ends — every part works and the
   person still cannot finish — that is the most valuable finding this level
   makes: record it as a GAP in the owning workspace's case, and an ADR if
   fixing it is a choice. Add a `docs/log.md` entry.

## Sweeping

A **story sweep** walks every story against the code as it stands and gives
each a verdict: works, works with a caveat, does not. Record it as a dated
section in `docs/test-cases/gap-ledger.md` (create it with the first sweep).
Struck-through rows stay, with what closed them.
