---
name: adr
description: Write, supersede or amend an Architecture Decision Record. Use when a choice a reviewer could argue with is being made — a design deviation from the TRD, a new dependency or service, a trade-off between invariants, a resolved open question — or when asked for an "ADR" or a "decision".
---

# ADR

A decision worth arguing about gets an ADR, not a code comment, a commit body
or a chat message. One number space for the whole platform, in
`docs/decisions/`; numbers are stable and never reused.

Read [`docs/conventions/adr-style.md`](../../../docs/conventions/adr-style.md)
first, and the two or three ADRs nearest the topic in
[`docs/decisions/index.md`](../../../docs/decisions/index.md).

## Steps

1. **Check it needs one.** It does when a reasonable reviewer could have
   chosen otherwise and the choice will constrain later work: deviating from
   the TRD, adding a dependency or service (every TRD §15.5 scale trigger
   that fires), weakening or sharpening one of `CLAUDE.md`'s invariants,
   answering a TRD §22 / PRD §10 open question, or a GAP whose fix is a
   choice rather than code. A rename or a library bump does not. Done when
   you can state the losing alternative in one sentence.

2. **Find what it touches.** An earlier ADR it narrows or reverses is
   **superseded**, not edited: the old one gets `Superseded by NNNN` in its
   Status and stays. Done when every ADR it contradicts is listed.

3. **Write it** at `docs/decisions/NNNN-<title-as-slug>.md`, the next free
   number, in the format in the style guide. Title: a declarative sentence
   that could be false. **Context**: the forces, the requirement IDs that
   apply, and the alternative that lost. **Decision**: present tense, concept
   level — no package, table, type or config names. **Consequences**: the
   trade-offs, the costs included; what a future reader will trip over.
   Done when someone who never saw the code could argue with it.

4. **Record it.** A line in `docs/decisions/index.md`
   (`- [NNNN Title](./file.md) - one-line gist`), an entry in `docs/log.md`,
   and a link from every test case it explains (under References). If it
   resolves a TRD open question, do **not** edit the TRD — the ADR is the
   answer. Commits it decides carry `(ADR NNNN)` in the subject.

5. **Status.** `Proposed` when it needs the team's yes; `Accepted` once
   agreed. Ask before marking a decision Accepted on someone's behalf.
