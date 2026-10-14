# 07 CI: GitHub Actions lint → typecheck → test

Status: resolved
Type: task
Blocked by: 01
Workspaces: .github/workflows

## Acceptance

- `ci.yml` on push/PR: pnpm cache, `turbo lint typecheck test`, then a job for `test:int` (Docker is available on ubuntu runners for Testcontainers).
- `pnpm audit --prod` step (non-blocking for now, with a comment saying so).
- Dependabot config for npm and actions.
- No deploy job yet (comes with the VPS).

## Answer

Done. `.github/workflows/ci.yml` runs on pushes to `main` and `development`
and on every pull request, with three jobs on `ubuntu-24.04`:

- **check**: `pnpm install --frozen-lockfile`, `pnpm format:check`, then
  `pnpm exec turbo run lint typecheck test`. Because each task depends on
  `^build`, the library packages build first.
- **integration** (`needs: check`): `pnpm test:int`. Docker is preinstalled
  on the runner, so Testcontainers can start Postgres. No workspace defines
  `test:int` yet, so for now turbo runs no tasks and exits 0.
- **audit**: `pnpm audit --prod` with `continue-on-error: true`. A comment
  says why it's non-blocking and when to make it blocking.

`.github/dependabot.yml` updates npm (which covers pnpm through
`pnpm-lock.yaml`) and github-actions weekly, on IST. Minor and patch npm bumps
come as one grouped PR, and all action bumps come as another. Commit prefixes
are `build(deps)` and `ci`, so they're Conventional Commits.

Decisions:

- pnpm comes from `pnpm/action-setup@v4` with no `version`, so it reads
  `packageManager` (pnpm 10.34.7). Node comes from `actions/setup-node@v5`
  with `node-version-file: .nvmrc` and `cache: pnpm`. `actions/checkout@v5`.
  All actions are pinned to a major version.
- `TZ=UTC` is set for the whole workflow to match the Vitest base and the
  testing conventions.
- The workflow has `permissions: contents: read` and a concurrency group that
  cancels a run when a newer one on the same ref supersedes it.
- `format:check` is in CI. It's cheap and the tree already passes it.
- The Turborepo remote cache isn't set up. It's a paid or self-hosted
  service, so it waits for a §15.5 trigger.
- No deploy job.
- No test-case entry, because the pipeline isn't a product promise.

Verification (local, Node 22.23.1): `actionlint` 1.7.12 reports 0 errors.
Both YAML files parse. `pnpm format:check` passes. `turbo run lint typecheck
test --force` shows 24/24 successful. `pnpm check` shows 32/32 successful.
`pnpm test:int` exits 0. `pnpm audit --prod` finds no known vulnerabilities.

Proposed `docs/log.md` entry:

- **Creation**: GitHub Actions CI (`.github/workflows/ci.yml`): format, lint,
  typecheck and test, then `test:int` on a Docker runner, plus a
  non-blocking `pnpm audit --prod`; Dependabot updates npm and actions weekly.
