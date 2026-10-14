---
name: web-code
description: House rules for writing code in apps/app (POS + KDS), apps/menu (QR guest) and apps/admin (owner + super admin). Use when building or changing a screen, component, hook, form, local-DB write, API call or test in any of the three frontends.
---

# Web code

How code is written in the three React apps. **Correctness of money and of
local writes is P0, then clean code, then a UX that survives a busy counter.**
Every rule below serves one of those. Adapted from ghatnaghar's `web-code`
skill onto this repo's stack (TRD §4.2): Tailwind + shadcn/ui on Radix,
Zustand, TanStack Query, React Hook Form + Zod, react-i18next, Dexie on the POS.

## Steps

1. **Place it.** Feature code goes in `src/modules/<feature>/` under the
   sub-folder its kind names (`pages/ components/ hooks/ api/ schemas/
   domain/ constants/ store/ local/`). Anything two modules use goes in the
   app's `src/libs/`; anything two **apps** use goes in a package
   (`packages/ui` for components, `packages/contracts` for schemas and
   types, `packages/billing` for money). Done when every new file sits where
   the layout says and imports follow the rule below.
2. **Write it** to the reference below. Done when every rule has been applied
   to every file you touched.
3. **Test it** with the `test-case` skill: unit tests for rules and pure
   logic, component tests for what a user sees and does (rendered through the
   app's `renderWithProviders`, which builds a fresh store, a fresh query
   client with `retry: false`, a fresh in-memory IndexedDB, real i18n and a
   memory router), e2e for the app's path to the real API. A journey across
   apps is the `user-story` skill. Break each new test's code on purpose and
   watch it go **red**. Done when every behaviour you added has a test seen
   red, and its case is in the app's `docs/test-cases/`.
4. **Record decisions.** A choice a reviewer could argue with gets an ADR via
   the `adr` skill. Done when no such choice lives only in a comment.
5. **Verify.** The app's typecheck, tests and build pass; `apps/menu` stays
   under **120 KB gzipped JS**; `wc -l` shows no component file over 200
   lines.

## Reference

### Layout

```
src/
  app/        router, providers — wiring only, no feature logic
  modules/<feature>/
              pages/ components/ hooks/ api/ schemas/ domain/ constants/
              store/ (Zustand slice)  local/ (Dexie tables + repositories, POS only)
  libs/       api/ (fetch client, endpoints, errors)  local-db/ (Dexie instance,
              migrations)  sync/ (outbox, push/pull loop)  i18n/  hooks/  utils/
  mocks/      MSW handlers + fixtures; testing/ (renderWithProviders) — test only
  locales/    en/*.json — every user-visible string
```

- A module creates only the sub-folders it needs.
- **Imports**: relative inside a module, `@/…` across modules or into `libs/`,
  `@bhojnalya/<pkg>` into packages. `libs/` does not import feature modules.
- Role-based routes in `apps/app`: POS and KDS are separate route trees under
  one shell; a KDS device never loads the POS's billing modules.

### The local-first POS (P0)

- **Every POS mutation writes IndexedDB first, then the outbox, in one Dexie
  transaction.** The UI reads from the local DB (live queries), never from
  the server response. No network call sits in the add-item path.
- **The invoice and its device-series counter are written in the same
  transaction.** Never compute the next number outside it.
- Billing is **blocked** when the device clock is behind the last invoice's
  timestamp, with a message saying why and what to do.
- Logout and reset are blocked while the outbox is non-empty; say how many
  changes are waiting.
- IDs are UUIDv7 from the client; every mutating request carries an
  `Idempotency-Key`.
- KDS and the QR menu are **online, server-authoritative** clients: they do
  not write locally and do not have an outbox.

### Money (P0)

- Money is `bigint` paise from input to print. **Never** `number` rupees,
  never `parseFloat`, never `toFixed` for arithmetic.
- Every total, tax, discount and round-off comes from `packages/billing`. A
  component never adds two amounts.
- Display through the one formatter (`Intl.NumberFormat('en-IN')`), at the
  edge.

### Components

- **200 lines per component file, at most.** Split before you reach it.
- Small functional components, one concern each, composed by a thin parent.
- **UI that appears twice becomes a reusable component**: in two apps →
  `packages/ui`; in two modules → `libs/components/`; in one → the module's
  `components/`. Reuse the shadcn primitives in `packages/ui` before writing
  one.
- Pages own wiring (mutations, navigation, toasts); components below them
  take props or form context.
- **Touch first**: targets at least 44 px, no hover-only affordance, no
  action reachable only by right-click or keyboard shortcut.

### Styling

- Tailwind utilities against the design tokens in the shared Tailwind preset
  (`packages/config`). A value the tokens lack is added there, then used —
  never an arbitrary `[#hex]` or `[13px]` in a component.
- Print routes use `@page` CSS for 80 mm and 58 mm; composition and
  unregistered outlets print "Bill of Supply" with no tax lines.

### Validation

- Every rule lives once, in a Zod schema — in `packages/contracts` if the API
  checks it too, else in the module's `schemas/`. The schema is the type
  (`z.input` / `z.output`). Forms use `zodResolver` with `mode: "onTouched"`.
- Every user-entered field has a rule and an error message that states the
  rule ("GSTIN is 15 characters: 2 digits, 10 PAN characters, 3 more.").
- Cross-field rules go in `superRefine` with the issue's `path` on the field
  to mark. Pure rule logic lives in `domain/`, unit-tested directly.

### UX

- A field's error **replaces** its hint; the field never changes height.
- Errors go where they were caused; a banner states the fact, then the
  consequence, plus the `requestId`.
- A failed submit moves focus to the first invalid field.
- While a request is in flight its actions are disabled and show a busy state,
  so nothing is sent twice.
- Every fetch has loading, empty and failure states, each in words.
- **Offline is a state, not an error**: the POS shows it calmly and keeps
  billing; KDS and the QR menu say they are reconnecting and refetch on
  reconnect.
- Suspended outlets: actions that mutate are hidden, with one banner saying
  why.

### Server state and sockets

- Every path is in `libs/api/endpoints.ts` as `API_ENDPOINTS.<RESOURCE>.<ACTION>`;
  code and MSW handlers both read it.
- One file per resource in the module's `api/` holds its `*_QUERY_KEYS` and
  its `useQuery` / `useMutation` hooks, parsing every response with the Zod
  schema from `packages/contracts`.
- **A socket event is a notification**: its handler invalidates query keys,
  it never writes data into the cache or the store. Event names come from
  `packages/contracts`.
- Zustand holds client state only (session, device, UI); server data lives in
  TanStack Query, POS data in IndexedDB.

### i18n

- Every user-visible string goes through `t()`, keyed by module
  (`pos.cart.empty`). No literal copy in JSX. Tests query by the English
  string, so a missing key shows up as a failing test, not a blank button.

### Naming

- Constants and the keys of constant objects are `SCREAMING_SNAKE_CASE`
  (`API_ENDPOINTS.ORDERS.CREATE`, `LIMITS.NOTE_MAX`), except keys that must
  match an outside shape (wire fields, Tailwind config).
- Components and types PascalCase, hooks `useThing`, everything else
  camelCase. File names: components `PascalCase.tsx`, hooks `useThing.ts`,
  the rest `camelCase.ts`; tests beside the file.

### Comments

- One line, and only for the *why* the code cannot show: a workaround, a
  constraint, a TRD section (`// TRD §8.3`).
- A decision worth arguing about is an ADR, not a comment.
