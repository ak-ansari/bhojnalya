# Domain Docs

How the engineering skills should consume this repo's domain documentation when exploring the codebase. This repo is **single-context**: one root `GLOSSARY.md`, one ADR directory for the whole platform.

## Before exploring, read these

- **`GLOSSARY.md`** at the repo root.
- **`docs/decisions/`**: read the ADRs that touch the area you're about to work in. Start from `docs/decisions/index.md`. This repo keeps its ADRs here, **not** in `docs/adr/`.
- **`docs/index.md`**: the map of the knowledge bundle (design, decisions, user stories, test cases, conventions).
- **`docs/requirements/user-stories.md`**: the MVP's vocabulary as it is used in the stories (`US-POS-01` …).

If `GLOSSARY.md` doesn't exist, **proceed silently**. Don't flag its absence; don't suggest creating it upfront. The `/domain-modeling` skill creates it lazily when terms actually get resolved.

## File structure

```
/
├── GLOSSARY.md
├── docs/
│   ├── decisions/                     ← ADRs, one number space for the platform
│   │   ├── index.md
│   │   ├── 0001-record-architecture-decisions.md
│   │   └── 0007-an-invoice-number-comes-from-a-device-series.md
│   └── agents/
├── apps/
└── packages/
```

## Writing ADRs

Write, supersede or amend an ADR with the repo's `adr` skill, following `docs/conventions/adr-style.md`. Numbers are never reused, and an ADR is superseded rather than edited to reverse it. Don't write ADRs into `docs/adr/`.

## Use the glossary's vocabulary

When your output names a domain concept (in an issue title, a refactor proposal, a hypothesis, a test name), use the term as defined in `GLOSSARY.md`. Don't drift to synonyms the glossary explicitly avoids.

If the concept you need isn't in the glossary yet, that's a signal: either you're inventing language the project doesn't use (reconsider) or there's a real gap (note it for `/domain-modeling`).

## Flag ADR conflicts

If your output contradicts an existing ADR, surface it explicitly rather than silently overriding:

> _Contradicts ADR-0007 (an invoice number comes from a device series), but worth reopening because…_
