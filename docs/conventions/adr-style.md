---
type: Convention
title: ADRs stay at the concept level
description: Architecture Decision Records capture the decision and its rationale only — never implementation detail.
tags: [documentation, architecture, adr]
origin_repo: ghatnaghar
timestamp: 2026-10-14T00:00:00Z
---

# ADRs stay at the concept level

An ADR captures *what was decided and why* — not *how it was coded*.

# How to apply

- Write at the concept level: the decision and its rationale, not the
  implementation.
- Avoid package names, type names, method signatures, table names and config
  keys. "A queue inside the database", not the library that provides it.
- Keep context domain-agnostic where it can be — a reader who has never seen
  UrbanPiper or a particular POS terminal should still understand the decision.
- State consequences as architectural trade-offs, not vendor- or
  endpoint-specific operational details.
- If an implementation shape is needed to make the decision concrete,
  describe it abstractly ("a counter incremented in the same local transaction
  that writes the invoice") rather than naming the construct.
- Present tense. Requirement IDs (`N2`, `G3`) may appear in Context, since the
  PRD is what forces the decision.

# Format

`docs/decisions/NNNN-<title-as-slug>.md`, numbered on from the last, in
Nygard's format:

```markdown
---
type: Decision
title: <declarative sentence>
description: <one line: the decision and the reason>
tags: [adr, <area>]
timestamp: <today>T00:00:00Z
---

# N. <Title>

Date: <today>

## Status

Proposed | Accepted | Superseded by [NNNN](./NNNN-….md)

## Context
## Decision
## Consequences
```

The title is a sentence that could be false — "Tenant isolation is enforced by
the database", not "Tenancy". Add the line to `docs/decisions/index.md` and an
entry to `docs/log.md`.

# Why

Implementation detail rots as the code evolves; the decision and its
rationale should outlive that churn. In ghatnaghar a draft ADR was rejected for
including package names, env var names and vendor-specific limits; the
concept-level rewrite was accepted.
