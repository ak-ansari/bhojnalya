# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository status

The monorepo is **scaffolded** (ticket 01): every workspace builds, typechecks, lints and runs one smoke test, but holds no product code yet. The design is the source of truth:

- `docs/BHOJNALYA_PRD.md`: product requirements. Requirement IDs (M1, P4, G3, N2, ...) are cited throughout the TRD. (Its header still calls itself `omnidine_platform_prd_v2.md`.)
- `docs/BHOJNALYA_TRD.md`: technical design for the Phase 1 MVP.

"OmniDine OS" is a placeholder name; the repo is Bhojnalya. This is a multi-tenant restaurant OS for Indian cafés: POS + KDS + QR table ordering + Swiggy/Zomato through middleware (UrbanPiper).

### Commands

Node 22 (`.nvmrc`; `engineStrict` refuses anything else) and pnpm 10, pinned through `packageManager` (`corepack enable` once). Run from the repo root:

| Command | What |
| --- | --- |
| `pnpm install` | Install every workspace |
| `pnpm turbo build typecheck lint test` (or `pnpm check`) | The full gate; must pass before a commit |
| `pnpm build` / `pnpm typecheck` / `pnpm lint` / `pnpm test` | One Turborepo task across all workspaces |
| `pnpm test:int` | Integration tests on real Postgres via Testcontainers (Docker must be running); uncacheable |
| `pnpm test:contract` / `pnpm test:e2e` | Uncacheable levels; no workspace defines them yet |
| `pnpm db:up` / `pnpm db:down` | Local Postgres from `infra/docker-compose.yml` (copy `infra/.env.example` to `infra/.env` first) |
| `pnpm format` / `pnpm format:check` | Prettier |
| `pnpm turbo test --filter=@bhojnalya/billing` | One workspace (any task) |
| `pnpm --filter @bhojnalya/billing exec vitest run src/index.test.ts` | One test file |

Shared config lives in `packages/config` (tsconfig bases, ESLint flat config, Prettier, Vitest base that forces `TZ=UTC`, Tailwind preset stub). Each workspace's `tsconfig.json`, `eslint.config.js` and `vitest.config.ts` extend it. Library packages are compiled to `dist/` with `tsc`, so `typecheck`, `lint` and `test` depend on `^build`.

## Planned stack and layout (TRD §2, §4)

TypeScript everywhere. pnpm workspaces + Turborepo:

- `apps/api`: NestJS 11 on Node 22, Drizzle ORM, Socket.io, pg-boss workers, all in one process
- `apps/app`: POS + KDS as **one** React 18 + Vite PWA with role-based routes
- `apps/menu`: QR customer app. Kept separate so its bundle stays **< 120 KB gzipped JS**
- `apps/admin`: owner portal + super admin
- `packages/billing`: pure TS billing/GST engine, used by both the POS (offline) and the API. This is the most critical package.
- `packages/contracts`: Zod schemas, DTOs, socket event types, sync ops
- `packages/db`: Drizzle schema, SQL migrations, RLS policies (api only)
- `infra/`: Docker Compose (caddy, api, postgres, wal-g), Caddyfile, backup/restore/deploy scripts

Infra target is one India VPS + Cloudflare Pages/R2 free tiers, at about ₹600–1,100/month. Don't add Redis, SQS, extra services or paid dependencies unless a TRD §15.5 scale trigger applies.

## Non-negotiable invariants

These run through many modules. Breaking any of them is a correctness or compliance bug.

1. **Money is integer paise (`bigint`)**, never floats. Use `round_half_up`. CGST = `round_half_up(tax/2)`, SGST = `tax − CGST`. Order discounts are split pro-rata using largest-remainder. Round-off goes on its own line. All rules are in TRD §6.1.
2. **The billing engine is pure and deterministic, with no I/O.** The server re-runs it on every synced invoice. On a mismatch, the invoice is still stored and flagged `needs_review`. Synced data is never dropped. Quality bar: 100% branch coverage, fast-check property tests, golden-file tests.
3. **Tenant isolation uses Postgres RLS.** Every request runs in a transaction that does `set_config('app.tenant_id', ..., true)` and `app.outlet_ids`. The app connects as `app_user` (no BYPASSRLS). Every tenant table gets the `tenant_isolation` policy plus FORCE RLS, and a CI test checks cross-tenant reads for each table. Cross-tenant access only goes through the `platform_admin` module, and every use is audit-logged.
4. **Built for chains, shipped for cafés.** The schema and APIs support Tenant → Outlet → Floor → Table from day one, even though the MVP UI shows one outlet and one floor. Every tenant row has `tenant_id`; outlet-scoped rows also have `outlet_id`.
5. **Financial tables are append-only.** `invoices`, `invoice_lines` and `payments` have no UPDATE/DELETE grant. A cancellation is an insert into `invoice_cancellations`, and status is derived through a view. Orders, KOTs and invoices **snapshot** item name, price, tax rate and HSN at creation.
6. **Invoice numbers always come from a device series**, online or offline, through one code path: `{PP}{DD}/{FYFY}/{NNNNNN}` with max 16 chars. FY resets on 1 April and is computed in IST. The device counter is incremented in the **same IndexedDB transaction** that writes the invoice. Device codes are never reused, and re-provisioning a device retires its old code. Billing is blocked if the device clock is earlier than the last invoice's timestamp.
7. **The POS is local-first.** It always writes to Dexie/IndexedDB first, then to the outbox. Sync is `POST /api/v1/sync/push` (idempotent on `sync_ops.op_id`, applied in `deviceSeq` order, max 200 ops per batch) plus `GET /sync/pull?cursor=`. Logout and reset are blocked while the outbox is non-empty. KDS and QR are online, server-authoritative clients.
8. **IDs are UUIDv7, generated on the client.** Every mutating POS/QR request carries an `Idempotency-Key`.
9. **Socket events are notifications only.** Clients refetch on reconnect through TanStack Query invalidation. Event names are typed in `packages/contracts` (TRD §9).
10. **Aggregators sit behind the `AggregatorAdapter` interface** (TRD §11.1), and `UrbanPiperAdapter` is the first implementation. Webhooks verify the signature, store the raw payload and return 200 fast. Processing and every outbound call run as pg-boss jobs with retry and backoff. Integration is toggled per outlet.

## Documentation

Start at `docs/index.md`. Conventions are adopted from ghatnaghar (`solar-square/ghatnaghar`, `staging`).

| Path | What |
| --- | --- |
| `docs/decisions/` | Numbered ADRs, **one number space for the platform**. Never reused; superseded, never edited to reverse. Style: `docs/conventions/adr-style.md`. |
| `docs/requirements/user-stories.md` | The MVP as user stories (`US-POS-01` …) with `Src` (P/T/N/?), `Lvl` and `Cov`. Design layer: may describe unbuilt things. |
| `docs/test-cases/` | Cross-workspace contract cases. Each workspace keeps its own catalogue in `<workspace>/docs/test-cases/`. |
| `docs/qa/` | Dated QA runs on real devices and printers. Never edited after the fact. |
| `docs/conventions/` | Newspaper ordering, testing levels, ADR style, documentation layers, commit messages. |
| `docs/log.md` | One entry for every material change to `docs/` or a workspace's `docs/`. |

- **Every file reads like a newspaper**, code and docs alike: purpose and public surface first, each helper after its first caller, answer before reasoning (`docs/conventions/newspaper-ordering.md`).
- **The PRD and TRD state intent; test cases and ADRs state what is.** Don't edit the PRD/TRD to match the code; record the gap as a test case or an ADR. Test cases never cite PRD/TRD/story IDs; code comments do (`// TRD §8.3`). Why: `docs/conventions/documentation-layers.md`.
- **A decision worth arguing about gets an ADR, not a comment.** Use the `adr` skill.
- **Commits are Conventional Commits** (`docs/conventions/commit-messages.md`): `type(scope): subject`, a body saying why, `(ADR NNNN)` when one decides it, and no AI attribution lines.

## Testing

Read `docs/conventions/testing-levels.md` before writing a test. A promise is tested at **the lowest level that can falsify it**, and **a seam covered on both sides by fakes is not covered**.

| Level | Lives in | Named |
| --- | --- | --- |
| Unit (billing: + fast-check properties, hand-written golden files, 100% branch) | beside the source | `*.test.ts` |
| Component (Testing Library, MSW at the HTTP boundary) | beside the source | `*.test.tsx` |
| Integration (real Postgres via Testcontainers, as `app_user`) | beside the source | `*.int.test.ts` |
| Contract (one fixture in `packages/contracts/fixtures/`, both sides assert it) | beside each side | `*.contract.test.ts` |
| E2E (Playwright, one app, real API, Chromium + WebKit at tablet size) | `apps/<app>/e2e/` | `*.e2e.ts` |
| User story (Playwright, one browser context per person, across apps) | `test/stories/` | `*.story.ts` |
| QA (manual, device matrix, printers) | `docs/qa/` | dated run |

- **Every behaviour change ships with its test case**: Given / When / Then plus the tests that check it, or **GAP**. Use the `test-case` skill; for cross-app journeys use `user-story`.
- Watch every new test go **red** once by breaking the code on purpose.
- Contracts are asserted against literals (`"kot.ready"`, `"AB01/2627/000001"`). Money in tests is integer paise. Tests run with `TZ=UTC` and an injected clock; IST is asserted at the FY and day-end boundaries.
- Never test RLS as the owner or a superuser. Integration/contract/e2e/story tasks are uncacheable in Turborepo.
- A broken promise the code claims is pinned by a `GAP:` test asserting today's behaviour, not by a skipped or deleted test.

## Skills

Use these in `.claude/skills/` rather than working from memory:

- `web-code`: house rules for `apps/app`, `apps/menu`, `apps/admin`
- `api-code`: house rules for `apps/api` and `packages/db`
- `billing-engine`: any change to tax, discount, round-off or invoice totals
- `test-case`: write a case and its tests at any level
- `user-story`: add a story and write the cross-app story test
- `adr`: write or supersede a decision

## Agent skills

### Issue tracker

Issues and specs are local markdown files under `.scratch/<feature>/`. See `docs/agents/issue-tracker.md`.

### Triage labels

The five default roles (`needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix`), written as a `Status:` line. See `docs/agents/triage-labels.md`.

### Domain docs

Single-context: one root `GLOSSARY.md`; ADRs in `docs/decisions/`. See `docs/agents/domain.md`.

## Conventions

- API: REST under `/api/v1`. Errors look like `{ code, message, details?, requestId }`. Lists use cursor pagination. Zod validates at every boundary, and OpenAPI is generated from Zod.
- Time is stored as `timestamptz` (UTC). Business day and FY are computed in `Asia/Kolkata`, with a per-outlet day-end cutoff (e.g. 4 AM).
- UI strings are externalised with `react-i18next`. Currency uses `Intl.NumberFormat('en-IN')`.
- Printing uses browser print routes with `@page` CSS for 80 mm and 58 mm rolls. Composition and unregistered outlets print a "Bill of Supply" with no tax lines.
- Suspended outlets can only make GET requests; mutations return 402/403.

## Scope discipline

Stay within MVP scope (PRD §4). Features listed in PRD §6 belong to later phases. Build hooks for them, like `user_outlet_roles` and `place_of_supply`, but not the features themselves. If the schedule slips, cut in this order: aggregator integration, then CSV import, then dashboard widgets. **Offline billing and GST correctness are never cut.**
