# 10 POS/KDS app shell (apps/app)

Status: ready-for-agent
Type: task
Blocked by: 02
Workspaces: apps/app, packages/ui

## What

The empty but real React 18 + Vite PWA (TRD §4.2). Load `web-code`. Look at `design/ui-board/project/Foundations.dc.html` and `Main.dc.html` for tokens and layout.

## Acceptance

- Vite + React 18 + TS, `vite-plugin-pwa` precaching the shell, Tailwind (preset from packages/config) + shadcn/Radix in `packages/ui`.
- Router with role-based route groups `/pos/*` and `/kds/*`, a stub login/device-registration screen.
- TanStack Query, Zustand, `react-i18next` with all strings in `en` resources, `formatINR(paise)` via `Intl.NumberFormat('en-IN')`.
- `socket.io-client` wrapper that invalidates queries on reconnect (no real events yet).
- Online/offline banner component.
- Component tests (Testing Library + MSW) for the banner and `formatINR`.
