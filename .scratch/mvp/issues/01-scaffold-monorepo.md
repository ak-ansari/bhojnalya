# 01 Scaffold the monorepo

Status: ready-for-agent
Type: task
Blocked by: none
Workspaces: root, packages/config, every workspace's package.json

## What

Turn the empty placeholders into a working pnpm + Turborepo monorepo (TRD §4.3)
so every later ticket has a `build`, `typecheck`, `lint` and `test` to run.

## Acceptance

- `pnpm-workspace.yaml`, root `package.json` (packageManager pinned, Node 22 via `engines` + `.nvmrc`), `turbo.json` with `build`, `typecheck`, `lint`, `test`, and **uncacheable** `test:int`, `test:contract`, `test:e2e` tasks.
- `packages/config`: shared `tsconfig` bases (strict, `noUncheckedIndexedAccess`), ESLint flat config, Prettier config, Tailwind preset stub.
- Each of `apps/{api,app,menu,admin}` and `packages/{billing,contracts,db,ui}` gets a minimal `package.json` (`@bhojnalya/<name>`), `tsconfig.json`, `src/index.ts` and one passing Vitest smoke test. No framework code yet. That's the later tickets' job.
- Vitest runs with `TZ=UTC`.
- `pnpm install && pnpm turbo build typecheck lint test` passes from a clean checkout.
- Remove the `.gitkeep` files you replace.
- Update CLAUDE.md "Repository status" with the real commands (it says not to guess; now they're real).

## Not in scope

NestJS, Vite, Drizzle, Docker. CI workflow (ticket 07).
