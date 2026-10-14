# 01 Scaffold the monorepo

Status: resolved
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

## Answer

Done. pnpm 10.34.7 (pinned in `packageManager`) + Turborepo 2.11.8, Node 22
enforced by `engines` + `.nvmrc` + `engineStrict`. `packages/config` holds the
tsconfig bases (`base`, `library`, `node`, `web`; strict +
`noUncheckedIndexedAccess`), the ESLint 9 flat config (typescript-eslint
`strictTypeChecked`, type-aware), Prettier, a Vitest base that sets `TZ=UTC`,
and a Tailwind preset stub. The eight workspaces each have a smoke test that
also asserts UTC (seen red under `TZ=Asia/Kolkata` with the base removed).

Choices a later ticket may revisit:

- Library packages are **compiled** (`tsc` to `dist/`, `exports` points at
  `dist`), because the API runs on plain Node; so `typecheck`, `lint` and
  `test` depend on `^build`. Web apps use `moduleResolution: Bundler`;
  everything else uses `NodeNext` (relative imports carry `.js`).
- Apps build with `tsc` for now; tickets 08/10–12 swap in Nest and Vite.
- No test-case catalogue entry: the smoke tests check tooling, not a product
  promise.

`pnpm install && pnpm turbo build typecheck lint test` from a clean tree:
`Tasks: 32 successful, 32 total`.
