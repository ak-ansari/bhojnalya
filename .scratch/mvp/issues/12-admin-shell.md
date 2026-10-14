# 12 Admin app shell (apps/admin)

Status: ready-for-agent
Type: task
Blocked by: 02
Workspaces: apps/admin

## What

Owner portal + super admin shell. Load `web-code`. Designs: `OwnerDashboard`, `OwnerMenu`, `OwnerReports`, `AdminConsole` in `design/ui-board/project/`.

## Acceptance

- Vite + React 18, router with `/owner/*` and `/platform/*` groups, layout and nav, login screen stub.
- TanStack Query, react-hook-form + zod resolver wired, i18n, `formatINR`.
- Red impersonation banner component driven by a token claim (TRD §13).
- One component test per screen stub.
