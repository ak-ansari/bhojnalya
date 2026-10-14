# 29 Admin login validation and dev-server docs (QA round 1)

Status: ready-for-agent
Type: bug
Blocked by: 13
Workspaces: apps/admin, CLAUDE.md (dev command line only)

1. `+91` mobile numbers are rejected; accept `+91XXXXXXXXXX`, `91XXXXXXXXXX`, `0XXXXXXXXXX` and spaces/dashes, normalising to the 10-digit form.
2. No max length on identifier or password; cap both (e.g. 254 / 128).
3. Add the auth guard on `/owner/*` and `/platform/*` once ticket 13's sign-in exists.
4. `pnpm --filter X dev -- --port N` ignores the port because pnpm forwards the `--`. Document `dev --port N` in CLAUDE.md's commands.
