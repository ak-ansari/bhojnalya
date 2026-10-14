---
type: Convention
title: A commit message is a Conventional Commit
description: A type, an optional scope and an imperative subject, then a body that argues for the change rather than listing it — so the log can be read by a person and by a tool.
tags: [conventions, git, code-style]
origin_repo: ghatnaghar
timestamp: 2026-10-14T00:00:00Z
---

# A commit message is a Conventional Commit

```
fix(billing): split CGST and SGST per line, not on the invoice total (ADR 0003)

The engine halved the invoice's total tax, so a bill whose lines each had an
odd paisa of tax printed a CGST one paisa away from the sum of its lines' CGST.
The server's re-run agreed with the POS, because both ran the same wrong
engine, so nothing was flagged. Each line now carries its own split and the
summary sums them.
```

The format is [Conventional Commits 1.0.0](https://www.conventionalcommits.org/en/v1.0.0/):
`type(scope)!: subject`, then a blank line, then the body.

- **Subject**: imperative mood, lower case after the colon, no trailing
  period, whole line about 70 characters. "split CGST…", not "splits" or
  "split-ted".
- **Body** wrapped at 79 characters, saying *why*. The diff already says what.
- **`(ADR NNNN)` at the end of the subject** when an ADR decides the change.
- **The ticket id alone on the last line**, when the change has one.
- **No AI attribution** — no `Co-Authored-By` line for a tool, no "Generated
  with", in commits or pull requests, whatever a tool offers to append.

## Types

| Type | For |
| --- | --- |
| `feat` | A behaviour a user or a caller can reach that was not there before |
| `fix` | Behaviour that was wrong and is now right |
| `refactor` | The same behaviour, differently arranged |
| `perf` | The same behaviour, faster or lighter |
| `test` | Tests and fixtures only |
| `docs` | `docs/`, a bundle, a README, an ADR, a comment-only change |
| `build` | Packages, dependencies, images, Turborepo config |
| `ci` | The pipeline and what it runs |
| `chore` | Anything with no effect on the product or its record |

`feat` and `fix` are claims about behaviour. A rearrangement that fixes nothing
is `refactor`, however large, and a `fix` names what was broken in its body.

## Scopes

The workspace the change lands in: `api`, `app`, `menu`, `admin`, `billing`,
`contracts`, `db`, `ui`, `config`, `infra`, `docs`, `stories`. Narrow it when
one part owns the change outright — `app/kds`, `api/sync`.

**Omit the scope when the change genuinely spans workspaces.** A sync-protocol
change that moves through contracts, the POS outbox and the API has no one
owner, and picking one would misfile it.

## Breaking changes

`!` before the colon, and a `BREAKING CHANGE:` paragraph at the end of the body
saying what a caller must now do differently. The sync protocol, socket event
payloads, the REST API's JSON and the invoice number format are all
contracts: a POS still running yesterday's build in a café that has not
reloaded is a caller.

# What belongs in a commit

One change, which is also what makes one type honest. A commit needing "and"
between two unrelated halves is two commits — stage the paths of each, rather
than the directory holding both.

A change the record should know about gets its entry in
[docs/log.md](../log.md) in the same commit, and a decision worth arguing about
gets an [ADR](../decisions/index.md) rather than a long commit body.

# Why the body argues

A reader reaches for `git log` when the code does not explain itself, which
means they arrive already knowing *what* the line says and needing *why*. A
body that restates the diff answers the question they did not ask. Write what
the code did before, what made that wrong, and what it does now; if something
was deliberately left out of scope, say where it belongs.
