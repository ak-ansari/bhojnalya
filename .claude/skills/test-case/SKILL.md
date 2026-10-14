---
name: test-case
description: Write a test case and its tests in the catalogue format, at any level (unit, component, integration, contract, e2e). Use when adding or changing behaviour anywhere in the monorepo, writing or fixing a test, pinning a GAP, or when asked for a "test case". For cross-app journeys use the user-story skill instead.
---

# Test case

A **case** is one promise the product keeps, written as a numbered document in
the catalogue of the workspace that keeps it, paired with the tests that check
it. The case is the living record: it describes the product as it stands,
never an intention.

Read [`docs/conventions/testing-levels.md`](../../../docs/conventions/testing-levels.md)
before placing a level, and
[`docs/conventions/documentation-layers.md`](../../../docs/conventions/documentation-layers.md)
before writing Given / When / Then. For the shape, copy the nearest existing
case in the catalogue.

## Steps

1. **Pick the catalogue.** The workspace whose code keeps the promise:
   `packages/billing/`, `apps/api/`, `apps/app/`, `apps/menu/`,
   `apps/admin/` → `<workspace>/docs/test-cases/`. A promise two workspaces
   keep together on a wire (sync, socket events, re-validated invoice,
   webhooks) → `docs/test-cases/` as a contract case. Create the folder and
   its `index.md` (copy the shape of `docs/test-cases/index.md`) with the
   first case. Done when you can say which workspace would be wrong if the
   promise broke.

2. **Name the promise.** One sentence, present tense, stating what the
   product *does*, phrased so it could be false: "A cancelled invoice keeps
   its number and is never deleted", not "Invoice cancellation". Search the
   catalogue's `index.md` first — if a case already owns the promise, extend
   it (behaviour unchanged) or supersede it (behaviour changed). Done when the
   title could not be a heading for any other case.

3. **Read the code that keeps it.** The case asserts only what the code does
   today. Where the code falls short of the TRD, the case states what the code
   does and names the missing part as not built. Done when every Then line
   traces to a line of code you read.

4. **Place each Then at its level** — the lowest that can falsify it. RLS,
   append-only grants, idempotency and transactions are integration, never
   unit. Money is unit, with property and golden tests if it is the billing
   engine. Done when every Then line has a level.

5. **Write or locate the tests.** Unit, component and integration tests sit
   beside the source (`*.test.ts`, `*.test.tsx`, `*.int.test.ts`); contract
   tests beside each side, asserting the shared fixture; e2e in
   `apps/<app>/e2e/*.e2e.ts`. `describe` names the unit (or, for e2e, the
   case: `"api 0012 …"`); `it` states the behaviour so `describe › it` reads
   as the promise. Contract names are literals; money is integer paise; the
   clock is injected. For each test, **break the code on purpose** (flip the
   comparison, drop the field, skip the transaction, connect as owner) and
   watch the test go **red** for the right reason, then restore. Done when the
   workspace's tests pass and each new test has been seen red.

6. **Write the case** at `<catalogue>/NNNN-<title-as-slug>.md`, the next free
   number in that catalogue, with this skeleton:

   ```markdown
   ---
   type: Test Case
   title: "N. <Title>"
   description: <one line — what the promise protects>
   tags: [test-cases, <area>]
   status: Proposed | Accepted
   origin_repo: bhojnalya
   timestamp: <today>T00:00:00Z
   ---

   # N. <Title>

   Date: <today>

   ## Status
   ## Given        preconditions; point at another case rather than restating it
   ## When         numbered actions
   ## Then         bullets; bold the load-bearing one; each says why it matters
   ## Variations   optional table: input → outcome, including the boundary rows
   ## Procedure    ### Setup / ### Run / ### Verify — by hand, in this repo
   ## Coverage     `describe › it` (level) per test; GAP per missing level; the command
   ## References   other cases and ADRs only
   ```

   Given / When / Then name no port, command, file or component. No PRD, TRD
   or user-story IDs anywhere in the case. Money in Variations is written as
   the user sees it (₹105.00) and the test holds it in paise. Done when every
   section is present and every test named in Coverage exists under that
   exact name.

7. **Record it.** Add the case's line under its area heading in the
   catalogue's `index.md`, and an entry in `docs/log.md`. A superseded case
   gets `status: Superseded`, a line naming its successor, and stays in the
   index. If a user story now has a test holding it, fill that story's `Cov`
   column in `docs/requirements/user-stories.md`.

## Pinning a gap

A promise the code claims and does not keep gets a test asserting **today's**
behaviour, named `GAP: <promise>`, with a comment naming the case or ADR it
contradicts and a failure message that says "this gap is fixed: invert this
test and close GAP in <case>". The case's Coverage lists it as **GAP (pinned)**.
A feature that does not exist is not a gap — say "not built" in the case.
