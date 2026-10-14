# MVP build: spec and ticket map

The Phase 1 MVP as described in `docs/BHOJNALYA_TRD.md`, split into tickets an
agent can pick up alone. The TRD and PRD are the spec. This file only orders
the work.

## Rules for every ticket

- Read `CLAUDE.md` first. The ten invariants there aren't up for negotiation.
- Load the skill for the workspace you touch: `billing-engine`, `api-code`,
  `web-code`, plus `test-case` for every behaviour change.
- Stay inside the workspace(s) the ticket names. If you need a change in
  another workspace, say so in `## Comments` and don't make it.
- Each ticket ships with its test cases in the workspace catalogue
  (`<workspace>/docs/test-cases/`) and an entry in `docs/log.md`.
- A choice a reviewer could argue with gets an ADR (`adr` skill).
- Conventional Commits, one commit per ticket or a few, no AI attribution.

## Waves (from the Blocked-by lines)

| Wave | Tickets |
| :-- | :-- |
| 0 | 01 scaffold |
| 1 | 02 contracts, 03 billing totals, 04 numbering, 05 db tenancy+RLS, 06 infra, 07 CI |
| 2 | 08 api skeleton, 09 db domain tables, 10 app shell, 11 menu shell, 12 admin shell |
| 3 | 13 auth+devices, 16 POS local store |
| 4 | 14 platform admin, 15 menu API, 17 sync API |
| 5 | 18 POS screens, 23 owner/admin screens |
| 6 | 19 KOT+KDS, 22 reports |
| 7 | 20 QR ordering, 21 aggregators |

## Decisions so far

(Resolved tickets append a one-line gist + link here.)

- 01: pnpm 10 + Turborepo 2 on Node 22; shared config in `packages/config`; library packages compile to `dist/` so tasks depend on `^build`. [ticket](issues/01-scaffold-monorepo.md)
