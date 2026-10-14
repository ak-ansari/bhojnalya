# Technical Requirements Document (TRD) — v1

**Product Name:** [Placeholder: OmniDine OS]
**Version:** 1.0 (covers PRD v2, Phase 1 MVP; later phases noted where they shape today's design)
**Last updated:** 2026-10-13
**Companion docs:** PRD v2 (`omnidine_platform_prd_v2.md`)
**Constraints driving this TRD:** 1–2 developers, ~3 months to MVP, **self-funded with near-zero traffic for the first 3–4 months, so infra cost must be as low as possible** while staying easy to move to managed cloud later.

---

## 1. Purpose & Scope

This document turns PRD v2 into an implementable technical design. It covers architecture, stack, data model, offline billing, real-time, integrations, GST computation, security, infrastructure, cost, testing and the delivery plan for **Phase 1 (MVP)**. Later phases (2–4) are covered only where they constrain MVP design decisions ("built for chains, shipped for cafés").

---

## 2. Key Technical Decisions

| # | Area | Decision | Why |
|---|---|---|---|
| D1 | Language | **TypeScript everywhere** | Billing/GST logic must run identically on the offline POS (browser) and the server. One shared package, no duplicated tax logic |
| D2 | Backend | **NestJS** (Node 22 LTS) | Modular structure, DI, guards/interceptors for tenancy; team familiarity |
| D3 | Frontend | **React 18 + Vite**, installable **PWA** | One codebase for Windows / Android / iPad / browser (PRD N1, P9) |
| D4 | Database | **PostgreSQL 16** (single instance) | Relational integrity for financial data; RLS for tenant isolation; also hosts the job queue |
| D5 | Tenant isolation | **Shared schema + Postgres Row-Level Security** on `tenant_id` | Data-layer enforcement (PRD N4) at zero extra infra cost |
| D6 | Offline | **Local-first POS**: IndexedDB (Dexie) + outbox + idempotent sync; **device-scoped invoice series** | PRD N2, G3; zero lost invoices |
| D7 | Real-time | **Socket.io** in the single NestJS process, one room per outlet | PRD N3 (<2 s); no Redis needed until there's more than one API instance |
| D8 | Background jobs | **pg-boss** (queue inside Postgres) | No Redis/SQS in the MVP; retries for aggregator calls |
| D9 | ORM / SQL | **Drizzle ORM** + plain SQL migrations | Typed queries, easy `SET LOCAL` per transaction for RLS, no heavy runtime |
| D10 | Shared contracts | **Zod** schemas in a shared package | Same validation on client, server and sync protocol |
| D11 | IDs | **UUIDv7**, generated on the client | Records can be created offline without collisions; time-sortable |
| D12 | Money | **Integer paise** (`bigint`), never floats | Exact GST and round-off maths |
| D13 | Hosting (MVP) | **One India VPS** (Docker Compose) + **Cloudflare Pages / R2** free tiers | ~₹600–1,100/month total; see §15 |
| D14 | Printing | Browser print with 80 mm / 58 mm CSS templates | PRD MVP decision; native ESC/POS wrapper in Phase 2 |
| D15 | Client packaging | PWA now; **Capacitor (Android) / Tauri (Windows)** wrappers in Phase 2 | Silent printing and durable storage later, same React code |
| D16 | Aggregators | **Adapter interface** with UrbanPiper as the first implementation | Middleware can be swapped; direct Swiggy/Zomato APIs plug in for Phase 4 |

---

## 3. System Architecture

### 3.1 Component Diagram

```
                         ┌──────────────────────────── Cloudflare (free) ───────────────────────────┐
                         │  Pages: pos.app / kds.app / admin.app / menu.app (static React bundles)    │
                         │  R2: menu images, exports, DB backups (WAL-G)                              │
                         │  DNS + TLS proxy                                                           │
                         └───────────────▲──────────────────────────────▲─────────────────────────────┘
                                         │ static assets                │ images
   ┌────────────────┐   HTTPS/WSS        │                              │
   │ POS (PWA)      │──────────┐         │                              │
   │ IndexedDB +    │          │   ┌─────┴──────────────── India VPS (Docker Compose) ─────────────────┐
   │ outbox, billing│          │   │                                                                   │
   │ engine (shared)│          ├──▶│  Caddy (TLS, reverse proxy)                                       │
   └────────────────┘          │   │        │                                                          │
   ┌────────────────┐          │   │        ▼                                                          │
   │ KDS (PWA)      │──────────┤   │  NestJS API  ── REST /api/v1 ── Socket.io (rooms per outlet)      │
   └────────────────┘          │   │   modules: auth, tenancy, menu, orders, kot, billing, sync,       │
   ┌────────────────┐          │   │            qr, aggregator, reports, admin, audit                  │
   │ QR Menu        │──────────┤   │   pg-boss workers (same process): aggregator push, menu sync,     │
   │ (customer phone)│         │   │            rollups, exports                                       │
   └────────────────┘          │   │        │                                                          │
   ┌────────────────┐          │   │        ▼                                                          │
   │ Owner / Super  │──────────┘   │  PostgreSQL 16  (RLS, pg-boss schema)  ── WAL-G ──▶ R2            │
   │ Admin portal   │              └───────────────────────────────▲───────────────────────────────────┘
   └────────────────┘                                              │ webhooks / REST
                                                       ┌───────────┴───────────┐
                                                       │ UrbanPiper (middleware)│◀──▶ Swiggy / Zomato
                                                       └────────────────────────┘
```

### 3.2 Runtime Units

| Unit | Tech | Deployed as |
|---|---|---|
| `api` | NestJS + Socket.io + pg-boss workers | 1 Docker container on the VPS |
| `db` | PostgreSQL 16 | 1 Docker container with a persistent volume (or host-installed) |
| `proxy` | Caddy 2 | 1 container, auto HTTPS |
| `pos`, `kds` | React PWA (can be one app with two routes) | Cloudflare Pages |
| `menu` | React (lightweight bundle) for the QR customer flow | Cloudflare Pages |
| `admin` | React (owner portal + super admin) | Cloudflare Pages |

> MVP simplification: `pos` and `kds` ship as **one app** (`app.`) with role-based routes, because both are "shared device" logins. `menu` stays separate so its bundle stays tiny for low-end phones.

---

## 4. Tech Stack

### 4.1 Backend
| Concern | Choice |
|---|---|
| Runtime | Node.js 22 LTS |
| Framework | NestJS 11 |
| DB access | Drizzle ORM + `pg` driver; migrations via `drizzle-kit` (SQL files committed) |
| Validation | Zod (shared) via a Nest pipe |
| Real-time | `@nestjs/websockets` + Socket.io |
| Jobs | pg-boss |
| Auth | JWT access (15 min) + rotating refresh tokens; Argon2id password hashing |
| Logging | Pino (JSON) |
| API docs | OpenAPI generated from Zod (`zod-to-openapi`) |
| Excel/CSV | `exceljs`, streaming CSV |
| Images | `sharp` (resize to WebP on upload) → R2 via S3 SDK |
| Rate limiting | `@nestjs/throttler` (in-memory store for single instance) |

### 4.2 Frontend
| Concern | Choice |
|---|---|
| Framework | React 18 + TypeScript + Vite |
| PWA | `vite-plugin-pwa` (Workbox): precache app shell, runtime-cache menu/images |
| Local DB | Dexie.js (IndexedDB) |
| Server state | TanStack Query |
| UI state | Zustand |
| UI kit | Tailwind CSS + Radix primitives (shadcn/ui), touch-friendly sizes |
| Forms | React Hook Form + Zod resolver |
| i18n | `react-i18next`, all strings externalised (PRD N10); `Intl.NumberFormat('en-IN')` for ₹1,00,000 |
| Printing | Dedicated print routes + `@media print` CSS for 80 mm / 58 mm rolls |
| Real-time | `socket.io-client` |

### 4.3 Monorepo Layout (pnpm workspaces + Turborepo)

```
omnidine/
├── apps/
│   ├── api/            # NestJS
│   ├── app/            # POS + KDS PWA
│   ├── menu/           # QR customer web app
│   └── admin/          # Owner portal + Super admin
├── packages/
│   ├── billing/        # pure TS billing & GST engine (used by app + api) ← most critical package
│   ├── contracts/      # Zod schemas, DTOs, socket event types, sync ops
│   ├── db/             # Drizzle schema, migrations, RLS policies (api only)
│   ├── ui/             # shared React components
│   └── config/         # eslint, tsconfig, tailwind presets
├── infra/
│   ├── docker-compose.yml
│   ├── Caddyfile
│   └── scripts/        # backup, restore, deploy
└── .github/workflows/
```

---

## 5. Multi-Tenancy & Data Model

### 5.1 Hierarchy
```
Tenant → Outlet → Floor → Table
```
- Every tenant-owned row has `tenant_id`. Every outlet-scoped row also has `outlet_id`.
- MVP UI creates exactly one outlet and one floor per tenant, but the APIs and schema already accept many (PRD §1.2).

### 5.2 Row-Level Security
- App connects as role `app_user` (no `BYPASSRLS`, not table owner).
- Every request runs inside a transaction opened by a Nest interceptor:
  ```sql
  BEGIN;
  SELECT set_config('app.tenant_id', $1, true);   -- true = LOCAL to this transaction
  SELECT set_config('app.outlet_ids', $2, true);  -- outlets the principal may access
  ...queries...
  COMMIT;
  ```
- Policy template (applied to every tenant table by a migration helper):
  ```sql
  ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
  ALTER TABLE orders FORCE ROW LEVEL SECURITY;
  CREATE POLICY tenant_isolation ON orders
    USING (tenant_id = current_setting('app.tenant_id')::uuid)
    WITH CHECK (tenant_id = current_setting('app.tenant_id')::uuid);
  ```
- `SET LOCAL` is safe with connection pooling because it resets at transaction end.
- Super admin cross-tenant queries use a separate `platform_admin` role through a dedicated module; every use is audit-logged (PRD S6).
- **CI test:** for each tenant table, assert that a query made under tenant A's context returns 0 rows of tenant B's data.

### 5.3 Core Entities (MVP)

| Group | Tables | Notes |
|---|---|---|
| Tenancy | `tenants`, `outlets`, `floors`, `tables`, `subscriptions` | `outlets` holds legal name, address, GSTIN, FSSAI, state code, tax mode (`regular` / `composition` / `unregistered`), price mode (`inclusive` / `exclusive`), invoice prefix, KDS thresholds, auto-accept flag |
| Identity | `users`, `user_outlet_roles`, `devices`, `refresh_tokens` | `devices`: outlet-bound POS/KDS screens with `device_code` (for the invoice series) and a revocable token |
| Menu | `menu_categories`, `menu_items`, `modifier_groups`, `modifiers`, `item_modifier_groups`, `menu_versions` | Item: veg marker, price (paise), GST rate, HSN/SAC, `is_active`, `in_stock`. Variants = a modifier group with `min=max=1`, `is_variant=true` |
| Ordering | `table_sessions`, `orders`, `order_items`, `order_item_modifiers` | `orders.channel` ∈ `pos`/`qr`/`swiggy`/`zomato`; `orders.type` ∈ `dine_in`/`takeaway`/`delivery`; `order_items` snapshot name/price/tax at time of order |
| Kitchen | `kots`, `kot_items` | Status `new`→`preparing`→`ready`; incremental KOT per "send to kitchen" |
| Billing | `invoices`, `invoice_lines`, `invoice_tax_lines`, `payments`, `invoice_cancellations` | **Append-only** (PRD G4, N5). Lines are snapshotted |
| Aggregators | `aggregator_links`, `aggregator_orders`, `aggregator_events` | Raw webhook payload stored for replay and debugging |
| Sync | `sync_ops` (processed op IDs), `device_invoice_counters` | Idempotency + gap detection |
| Audit | `audit_log` | Who / which device / when / what / before-after JSON |
| Reporting | `daily_sales_rollup` | Refreshed by job; reports read raw tables for "today" |

**Snapshot rule:** orders, KOTs and invoices copy item name, price, tax rate and HSN at creation, so later menu edits never change historical bills.

**Append-only enforcement:** `app_user` has no `UPDATE`/`DELETE` on `invoices`, `invoice_lines`, `payments`. Cancellation = insert into `invoice_cancellations` + status derived via view.

---

## 6. Billing & GST Engine (`packages/billing`)

A **pure, deterministic TypeScript library** with no I/O. The POS uses it offline; the server re-runs it on every synced invoice and rejects or flags mismatches.

### 6.1 Rules
1. All amounts are integer **paise**.
2. **Exclusive pricing:** `taxable = price × qty + modifiers`, `tax = round_half_up(taxable × rate / 100)`.
   **Inclusive pricing:** `taxable = round_half_up(gross × 100 / (100 + rate))`, `tax = gross − taxable`.
3. Tax is computed **per line**, then grouped by rate for the invoice tax summary.
4. Intra-state supply: `CGST = round_half_up(tax / 2)`, `SGST = tax − CGST` (difference ≤ 1 paisa, absorbed per line). The outlet stores `state_code` and the invoice stores `place_of_supply`, so IGST can be added later without schema change.
5. **Order-level discount** (flat or %) is applied to taxable value **before tax**, split pro-rata across lines using the largest-remainder method, so line discounts sum exactly to the order discount.
6. **Service charge** (PRD P4): off by default, optional and removable per bill, shown as a separate line. GST on service charge follows the outlet's rate (configurable).
7. **Round-off** to the nearest rupee, shown as its own line (±₹0.50 max).
8. **Composition / unregistered outlets:** no tax lines; document title = "Bill of Supply"; the composition declaration text is printed.
9. Default rate 5% (restaurant service, no ITC); per-item override (PRD G5).

### 6.2 Quality Bar
- 100% branch coverage on the engine.
- Property-based tests (fast-check): totals always reconcile (`Σ lines + tax + service − discount ± round-off = grand total`), CGST + SGST = tax, no negative lines.
- Golden-file tests against hand-checked invoices (inclusive/exclusive × discount × service charge × composition).

---

## 7. Invoice Numbering (PRD G3, N2)

**Constraint:** GST rules require invoice numbers to be **≤ 16 characters**, unique per financial year, using only letters, digits, `-` and `/`.

**Design: every invoice is issued from a device series, both online and offline.** There is one code path, so there's no "offline mode" special case.

```
Format:  {PP}{DD}/{FYFY}/{NNNNNN}
Example: BL0A/2627/000042      (16 chars)

PP     = outlet prefix, 2 chars (configurable, e.g. "BL")
DD     = device code, 2 chars base36 (assigned by server at device registration, never reused)
FYFY   = financial year, e.g. 2627 = FY 2026-27 (reset on 1 April)
NNNNNN = per-device sequence, 6 digits (999,999 bills per device per year)
```

- **Allocation:** the POS increments `device_counter[fy]` and writes the invoice in the **same IndexedDB transaction**, so a number is never skipped or reused on the device.
- **FY rollover:** the FY is derived from the invoice timestamp (IST). If the device clock is earlier than its last invoice's timestamp, the POS blocks billing and asks staff to fix the clock.
- **Server validation:** `UNIQUE (outlet_id, invoice_no)`. `device_invoice_counters` tracks the highest synced number per device/FY. A gap raises an alert to the owner and super admin, because a gap means unsynced or lost invoices.
- **Device re-provisioning** (reinstall, cleared storage): the old device code is **retired** and a new one is issued, so numbers are never reused. Before retiring, the server records the last synced number for audit.
- **Cancellations** keep their number (PRD G4).

---

## 8. Offline Billing & Sync (PRD N2)

Connectivity in tier-2/3 cities (e.g. Rajasthan) is unreliable, so offline billing is treated as a **core path, not an edge case**.

### 8.1 What Works Offline
| Works offline (POS) | Pauses offline (UI shows a banner) |
|---|---|
| Create/modify dine-in & takeaway orders, table view on this device | QR orders |
| Generate invoices (device series), record payments, print bill/KOT | KDS sync to other screens (fall back to printed KOT) |
| Void/cancel with reason, reprint | Aggregator orders, store on/off, menu sync |
| View today's bills from this device | Cross-device reports |

### 8.2 Local-First POS
- The POS always writes to **IndexedDB first**, then appends a mutation to the **outbox**. Online or offline, the code path is the same.
- The local DB holds: menu snapshot (with version), tables, open orders, today's invoices/payments, counters, outbox.
- **Storage durability:** call `navigator.storage.persist()` at setup and warn if it isn't granted. On iPad, the POS **must be installed to the Home Screen**, since Safari can evict storage for non-installed sites. Onboarding checklist covers this.
- **Safety:** an always-visible badge shows the number of unsynced ops; logout, "clear data" and device reset are **blocked while the outbox is non-empty**. There's an emergency "export unsynced bills" (JSON/CSV) action.

### 8.3 Sync Protocol
```
POST /api/v1/sync/push
{ deviceId, ops: [ { opId: uuidv7, type: "invoice.create", entityId, payload, createdAt, deviceSeq } ... ] }
→ { acked: [opId...], rejected: [{ opId, reason }] }

GET  /api/v1/sync/pull?cursor=<opaque>
→ { changes: [menu/table/order/stock changes since cursor], cursor }
```
- **Idempotent:** `sync_ops.op_id` is a primary key. Replaying the same op returns `acked` without re-applying, which is safe after crashes and retries.
- **Ordered per device:** ops apply in `deviceSeq` order inside one transaction per batch (max 200 ops).
- **Server re-validation:** invoices are recalculated with `packages/billing`. On a mismatch, the invoice is still stored as issued (it was already given to the customer), flagged `needs_review`, and the owner is alerted. **Data is never dropped.**
- **Triggers:** on reconnect (`online` event + socket connect), every 15 s while the outbox is non-empty, and Background Sync API where supported.
- **Conflicts (MVP rules):**
  - Invoices/payments: no conflict possible. Each device owns its series and IDs (UUIDv7).
  - Orders/tables edited by two POS devices while one is offline: last-writer-wins at field level by `updated_at`, plus an audit entry. *Assumption: most MVP cafés run one POS device; multi-POS offline merging is hardened in Phase 3 (LAN sync).*
  - Menu/stock: server is the source of truth; pulled onto the device.

### 8.4 KDS & QR Use the Server
- KDS and the QR menu are **online clients** (server-authoritative), connected over Socket.io.
- If the POS is offline, KOTs it creates queue in the outbox and reach the KDS on reconnect. Meanwhile the POS offers **auto-print KOT** as a fallback.

---

## 9. Real-Time (PRD N3)

- Socket.io namespaces: `/staff` (device/owner JWT) and `/guest` (QR session token).
- Rooms: `outlet:{id}` (POS, KDS), `outlet:{id}:kds`, `session:{tableSessionId}` (QR customers at that table).
- Events (typed in `packages/contracts`):

| Event | From → To |
|---|---|
| `order.qr_pending` | server → POS (sound + badge) |
| `order.accepted` / `order.rejected` | POS → server → QR guest |
| `kot.created` / `kot.updated` | server → KDS / POS |
| `kot.ready` | KDS → server → POS, QR guest, aggregator (job) |
| `item.stock_changed` | POS → server → all clients + aggregator (job) |
| `aggregator.order_new` | server → POS (loud alert + countdown) |
| `table.status_changed` | server → POS |

- **Delivery guarantee:** events are notifications. Clients refetch state on reconnect (TanStack Query invalidation), so a missed event never leaves stale state.
- **Latency target:** < 2 s end-to-end. A single process in India gives ~100–300 ms in practice.
- **Scale path:** when there's more than one API instance, add `@socket.io/redis-adapter` (Phase 3+).

---

## 10. QR Table Ordering

- **QR URL:** `https://menu.<domain>/t/{qrToken}`. `qrToken` = 128-bit random, base62 (~22 chars), mapped to a table. Not guessable, no sequential IDs (PRD N8). Rotatable from admin.
- **Table session:** the first scan of a table with no open session creates a `table_session` and gives the browser a signed **guest session token** (cookie + localStorage). Later scans at the same table join the open session. Settling the bill closes it (PRD Q9).
- **Order flow:** guest submits → `orders` row with `status=pending` → POS accepts/rejects (or auto-accept) → KOT → status pushed to the guest (PRD Q4–Q6).
- **Anti-abuse:** rate limits per token/IP (e.g. 5 orders / 10 min / session, 30 req/min/IP), max items/qty per order, honeypot field, staff accept by default.
- **Performance on low-end Android over 4G (PRD N1):**
  - Separate, minimal bundle: target **< 120 KB gzipped JS** (Preact-compatible React build if needed).
  - Menu served as one JSON document (`GET /menu/{outletId}?v={menuVersion}`) behind Cloudflare cache; the version is bumped on every menu/stock change.
  - Images resized at upload to 400 px WebP (~20–40 KB), lazy-loaded.
  - Branding (logo, colours) applied through CSS variables from the menu JSON.

---

## 11. Aggregator Integration (Swiggy/Zomato via Middleware)

### 11.1 Adapter Pattern
```ts
interface AggregatorAdapter {
  pushMenu(outletId, menuSnapshot): Promise<void>;
  setItemStock(outletId, itemIds, inStock): Promise<void>;
  setStoreStatus(outletId, open: boolean): Promise<void>;
  acceptOrder(extOrderId, prepMinutes): Promise<void>;
  rejectOrder(extOrderId, reason): Promise<void>;
  markFoodReady(extOrderId): Promise<void>;
  parseWebhook(headers, body): AggregatorEvent;   // verifies signature
}
```
First implementation: `UrbanPiperAdapter`. Phase 4: `SwiggyDirectAdapter`, `ZomatoDirectAdapter`.

### 11.2 Inbound Flow
1. `POST /webhooks/aggregator/{provider}`: verify signature → store raw payload in `aggregator_events` → return 200 fast.
2. A pg-boss job maps it to an internal `order` (`channel=swiggy|zomato`, `type=delivery`), deduplicated by `(provider, ext_order_id)`.
3. Socket `aggregator.order_new` → POS shows a loud alert with a countdown to the aggregator's accept deadline (PRD A2).
4. Rider status/ETA updates are stored and pushed to the POS (PRD A3).

### 11.3 Outbound Flow
- Accept/reject, food ready, stock and store status go through **pg-boss jobs** with exponential backoff (max ~5 min for time-critical actions), dead-letter handling and an owner-visible failure banner.
- **Menu mapping:** each internal item/modifier keeps an `ext_ref` per provider. The POS menu is the source of truth (PRD A4).
- Per-outlet enable/disable (PRD S4), so the MVP can launch without middleware if partnership timing slips.

---

## 12. Printing (MVP)

- Print routes render the bill/KOT as HTML sized for **80 mm** (default) or **58 mm** paper via `@page { size: 80mm auto; margin: 0 }`.
- Triggered with `window.print()`. Staff configure the browser/OS default printer once (onboarding checklist per device type: Windows Chrome/Edge, Android Chrome, iPad AirPrint).
- Bill template includes every field in PRD G1 (GSTIN, FSSAI, HSN/SAC, rate, CGST/SGST, invoice no, date/time) and "Bill of Supply" for composition outlets.
- **Phase 2:** Capacitor/Tauri shell with ESC/POS over USB/Bluetooth/LAN for silent printing. Templates are reused by rendering them to an ESC/POS command builder.

---

## 13. Authentication & Authorization

| Principal | How they log in | Token |
|---|---|---|
| Owner/Manager | Email or phone + password (Argon2id). Email OTP for reset. **SMS OTP deferred** (paid per message) | JWT access 15 min + rotating refresh (httpOnly cookie) |
| POS/KDS device | Owner logs in once on the device → "register this device as POS/KDS" | Long-lived **device token** (revocable from admin), bound to outlet + `device_code` |
| QR guest | No login | Signed guest session token, scoped to one table session |
| Super admin | Separate admin login + TOTP 2FA | JWT with `platform_admin` scope |

- **Impersonation (PRD S6):** super admin gets a short-lived token carrying `impersonated_by`. Every request made with it writes to `audit_log`, and the UI shows a red banner.
- **Suspended outlets (PRD S3):** a guard allows `GET` only; mutations return `402/403` with a clear message. Offline POS checks status on every sync.
- **Phase 2 readiness:** `user_outlet_roles` and a permission enum exist from day one; MVP only uses `owner`. Staff PINs and void/discount approvals plug in without migrations.

---

## 14. API Conventions

- REST, JSON, prefix `/api/v1`. OpenAPI spec generated and published in CI.
- **Idempotency:** every mutating request from POS/QR carries `Idempotency-Key` (UUID). The server stores the result for 24 h, so double-taps and retries are safe.
- Errors: `{ code, message, details?, requestId }`; `requestId` is also in logs and Sentry.
- Pagination: cursor-based for lists; reports use date-range params in IST.
- Timestamps: stored `timestamptz` (UTC); business day and FY computed in `Asia/Kolkata`. Each outlet has a configurable **day-end cutoff** (e.g. 4 AM) for Z-reports, since cafés can close after midnight.

---

## 15. Infrastructure, Deployment & Cost (Low-Cost MVP)

### 15.1 Environments
| Env | Where | Cost |
|---|---|---|
| Local dev | Docker Compose on laptop | ₹0 |
| Staging | Same VPS, separate Compose project + DB (small data), or Oracle Cloud Always Free | ₹0 |
| Production | India VPS | see below |

### 15.2 Production Setup
- **VPS:** 2 vCPU / 2 GB RAM, India region (recommended: **DigitalOcean Bangalore** or **AWS Lightsail Mumbai**; any India VPS works). Ubuntu 24.04 LTS, Docker Compose, UFW (only 22/80/443), SSH keys only, unattended security upgrades.
- **Compose services:** `caddy`, `api`, `postgres` (+ `wal-g` sidecar/cron).
- **Postgres tuning for 2 GB:** `shared_buffers=512MB`, `work_mem=8MB`, `max_connections=50`; API pool size 10.
- **Frontends:** Cloudflare Pages (free; unlimited static requests). Each push to `main` deploys.
- **Images/exports/backups:** Cloudflare R2 (10 GB free, no egress fees).
- **CI/CD:** GitHub Actions (free tier). Lint → typecheck → test → build Docker image → push to GHCR → SSH deploy (`docker compose pull && up -d`) → run migrations → health check.

### 15.3 Backups & Recovery (PRD N9)
- **WAL-G** continuous WAL archiving + nightly base backup to R2 → **point-in-time recovery**. Retention: 14 days of PITR, 8 weekly, 6 monthly.
- Nightly `pg_dump` (logical) to R2 as a second, simpler restore path.
- **Monthly restore drill** into staging (runbook in `infra/scripts/restore.md`). A backup that hasn't been test-restored doesn't count.
- Owner data export: admin action → CSV/XLSX bundle in R2 → time-limited download link.

### 15.4 Estimated Monthly Cost (MVP, 10–30 outlets)

| Item | Cost/month |
|---|---|
| VPS 2 GB India (DigitalOcean/Lightsail) | ~₹1,000 (≈ $12). ₹500 on a 1 GB plan is possible but tight |
| Cloudflare Pages, DNS, R2 (within free tier) | ₹0 |
| GitHub + Actions + GHCR (free tier) | ₹0 |
| Sentry (free tier), UptimeRobot / Better Stack (free) | ₹0 |
| Domain (.in/.com) | ~₹80 |
| Transactional email (Resend/Brevo free tier) | ₹0 |
| **Infra total** | **≈ ₹600–1,100** |
| UrbanPiper middleware (per outlet, pass-through) | Vendor pricing; recover via paid add-on (PRD §7) |

*Prices are approximate as of writing; verify before purchase.*

### 15.5 Scale-Up Triggers (when to spend more)
| Trigger | Action |
|---|---|
| CPU > 70% sustained or > ~150 outlets | Bigger VPS (vertical scale is cheap and enough for a long time) |
| Paying revenue covers it / need HA | Move DB to managed Postgres (RDS Mumbai / DO Managed); same Docker image to ECS/App Platform |
| More than one API instance | Add Redis (Socket.io adapter, throttler store); pg-boss stays |
| Reports slow down OLTP | Read replica for reports |

Because everything is containerised with 12-factor config (env vars), each step is a deployment change, not a code change.

---

## 16. Observability

- **Errors:** Sentry in API + all frontends (release tags, source maps). Offline sync errors are reported once the device is back online.
- **Logs:** Pino JSON → Docker log rotation; `requestId`, `tenantId`, `outletId`, `deviceId` on every line. Upgrade to Grafana Cloud free tier / Better Stack logs if needed.
- **Uptime:** external checks on `/healthz` (API + DB ping) every 1 min → email/Telegram alert.
- **Business health alerts (super admin):** invoice sequence gaps, outbox older than 1 h on any device, aggregator job dead letters, failed backups.
- **Metrics that map to PRD §8:** time from order placed to KOT on KDS, QR share of dine-in orders, offline sync failures (target 0 lost invoices), aggregator accept rate.

---

## 17. Security

- HTTPS everywhere (Caddy + Cloudflare), HSTS, secure/httpOnly/SameSite cookies.
- RLS + tenant context on every query; CI isolation tests (§5.2).
- Unguessable QR tokens; rate-limited guest endpoints (§10).
- Webhook signature verification + replay window for aggregator callbacks.
- Device tokens revocable; the device list lives in the owner portal.
- Secrets via `.env` on the VPS (root-only, 600). Never in git. Rotate on staff changes.
- Input validation with Zod at every boundary; parameterised SQL only.
- Dependencies: Renovate/Dependabot + `pnpm audit` in CI.
- **DPDP Act 2023:** guest name/phone are optional (PRD Q3), purpose-limited, with a short notice on the QR page; data stays in India (India VPS + R2 jurisdiction setting where available).

---

## 18. Performance Budgets (PRD N6)

| Interaction | Budget | How |
|---|---|---|
| Add item on POS | < 100 ms | Local state + IndexedDB write; no network in the path |
| Tap "Print bill" → print dialog | < 2 s | Engine runs locally; print route pre-rendered |
| QR menu first load on 4G low-end phone | < 3 s | < 120 KB JS, cached menu JSON, WebP images |
| QR order → POS alert | < 2 s | Socket.io push |
| KOT → KDS | < 2 s | Socket.io push |
| Z-report for a day | < 2 s | Indexed queries on `(outlet_id, business_date)` |

---

## 19. Testing Strategy

| Layer | Tooling | Focus |
|---|---|---|
| Billing engine | Vitest + fast-check | Exhaustive GST/round-off/discount cases (§6.2) |
| API | Vitest/Jest + Testcontainers (real Postgres) | RLS isolation, idempotency, sync replay, append-only guarantees |
| Sync | Scripted scenarios | Offline 100 bills → reconnect → zero loss/dupes; kill tab mid-sync; replay same batch 3× |
| E2E | Playwright (Chromium + WebKit, tablet viewport) | Counter billing, QR order → accept → KDS ready → settle, offline toggle |
| Device matrix (manual, pre-release) | Windows Chrome/Edge, Android Chrome (low-end), iPad Safari (installed PWA) | Print layout, storage persistence, touch targets |
| Aggregator | UrbanPiper sandbox + recorded webhook fixtures | Mapping, dedupe, retry |

---

## 20. Delivery Plan (~12 weeks, 1–2 devs)

| Week | Milestone |
|---|---|
| 1 | Monorepo, CI/CD, VPS + Caddy + Postgres + backups, auth, tenancy + RLS. **Start the UrbanPiper partnership conversation** (PRD risk) |
| 2 | Super admin: tenant/outlet/floor/table, device registration, QR generation. Menu CRUD + modifiers + CSV import |
| 3–4 | `packages/billing` engine with full tests. POS ordering UI, table view, KOT creation |
| 5 | KDS + Socket.io real-time; print templates (bill/KOT, 80/58 mm) |
| 6–7 | **Offline**: Dexie store, outbox, device invoice series, sync push/pull, server re-validation, gap alerts |
| 8 | QR menu app + guest sessions + accept/reject + live status |
| 9–10 | Aggregator adapter (UrbanPiper): inbound orders, accept/reject, food ready, menu & stock sync, store toggle |
| 11 | Reports (Z-report, item/category/channel, GST), Excel/CSV export, dashboard; subscription status + suspension |
| 12 | Hardening: device matrix testing, restore drill, load test (simulate 30 outlets), pilot onboarding at design-partner cafés |

**Cut lines if late (in order):** aggregator integration (ships as add-on later), CSV menu import (super admin enters manually), dashboard widgets (keep Z-report). **Offline billing and GST correctness are never cut.**

---

## 21. Technical Risks & Mitigations

| Risk | Mitigation |
|---|---|
| Browser storage eviction loses unsynced invoices | `storage.persist()`, installed PWA on iPad, block reset while outbox non-empty, emergency export, frequent sync; Phase 2 native shell |
| Wrong device clock breaks FY/sequence | Block billing if clock < last invoice time; server records skew; NTP note in onboarding |
| Single VPS outage | POS keeps billing offline; restore runbook; PITR backups off-box in R2; target 99.5% allows ~3.6 h/month |
| Self-managed Postgres mistakes | Pinned major version, scripted backups, monthly restore drill, move to managed DB once revenue allows |
| Middleware approval delays | Adapter + per-outlet toggle; MVP can launch without it |
| Billing engine bug → wrong GST on printed bills | Shared engine, property tests, server re-validation flags `needs_review` |
| Browser print UX friction | Per-device printer setup checklist; Phase 2 silent printing |

---

## 22. Open Technical Questions

1. Final middleware vendor (UrbanPiper vs alternatives): confirms the webhook/auth model and the exact accept-deadline behaviour.
2. Recommended hardware for pilots (e.g. an Android POS with built-in printer): affects print CSS testing and the Phase 2 ESC/POS driver choice.
3. KOT printer at launch, or KDS only? (PRD Q5): affects whether auto-print-KOT ships in the MVP or only as an offline fallback.
4. Whether GST is charged on service charge for target outlets (confirm with a CA); the engine supports both.
5. Pilot café locations (e.g. Rajasthan, state code 08): used for GST examples, onboarding visits and future place-of-supply/IGST tests.
