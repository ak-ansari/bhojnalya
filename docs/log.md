# Update Log

## 2026-10-14 — the record, the test levels and the house rules are set up

- **Creation**: the knowledge bundle (`docs/index.md`), modelled on ghatnaghar's
  (`solar-square/ghatnaghar`, `staging`): conventions, decisions, test-case
  catalogue, QA runs, requirements, and this log.
- **Creation**: five conventions adopted from ghatnaghar — newspaper ordering,
  ADR style, documentation layers, commit messages, testing levels. Testing
  levels is rewritten for this product: seven levels (unit, component,
  integration, contract, e2e, user story, QA), with the billing engine's
  stricter bar, RLS tested as the application role, `TZ=UTC` with IST asserted
  at the boundaries, and Turborepo's cache kept off every level that touches a
  real dependency.
- **Creation**: ADRs 0001–0014, backfilled from the TRD's key decisions and
  `CLAUDE.md`'s invariants. Where the TRD disagreed with itself, the ADR says
  which side it took: 0004 follows "stored and flagged, never dropped" over
  §6's "rejects or flags".
- **Creation**: 108 MVP user stories in ten groups and eight cross-app
  journeys, with 5 new (N) and 5 open (?) stories for the team to decide.
- **Creation**: skills `test-case`, `user-story`, `adr`, `web-code`,
  `api-code`, `billing-engine` in `.claude/skills/`.
- **Not changed**: the PRD and TRD. Four contradictions found while writing
  the stories and ADRs are listed as open stories (US-ADM-11 suspension vs.
  never dropping synced data, US-ACC-06 OTP login) or in ADR consequences,
  rather than by editing the design.
- **Not built**: no test cases, because there is no code — a case describes
  what the code does today. Every story's `Cov` is `—`.
