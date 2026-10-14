# 11 QR menu app shell (apps/menu) with bundle budget

Status: ready-for-agent
Type: task
Blocked by: 02
Workspaces: apps/menu

## What

The separate guest app (TRD §10, ADR 0013). Load `web-code`. Design: `design/ui-board/project/QrMenu.dc.html`.

## Acceptance

- Vite + React (or the Preact compat build if needed to hit budget, with an ADR), route `/t/:qrToken`.
- Branding through CSS variables.
- A build step that **fails** if the gzipped JS is over 120 KB, run as part of `pnpm turbo build`.
- i18n set up; static placeholder menu rendered from a fixture.
- One component test.
