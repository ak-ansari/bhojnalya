# 07 CI: GitHub Actions lint → typecheck → test

Status: ready-for-agent
Type: task
Blocked by: 01
Workspaces: .github/workflows

## Acceptance

- `ci.yml` on push/PR: pnpm cache, `turbo lint typecheck test`, then a job for `test:int` (Docker is available on ubuntu runners for Testcontainers).
- `pnpm audit --prod` step (non-blocking for now, with a comment saying so).
- Dependabot config for npm and actions.
- No deploy job yet (comes with the VPS).
