# Product Requirements Document (PRD) — v2

**Product Name:** [Placeholder: OmniDine OS]
**Version:** 2.0 (phased; MVP scoped)
**Last updated:** 2026-10-13
**Companion docs:** TRD (tech stack & architecture — to be written separately)

---

## 1. Product Overview

**Vision (long-term):** A multi-tenant, cloud-based Restaurant Operating System that lets food businesses run everything from POS and kitchen to dine-in, online ordering and delivery on a single subscription, without paying commission on direct orders.

**Strategy:** Start narrow and expand outward.
1. **Phase 1 (MVP):** Win single-outlet **cafés and small single-floor restaurants in India** with POS + KDS + QR ordering + Swiggy/Zomato sync.
2. **Later phases:** Grow into full-service restaurants, multi-floor venues, multi-outlet chains, then direct online ordering and delivery.

**Launch market:** India.

### 1.1 Key Decisions (from PRD refinement)

| Area | Decision |
|---|---|
| Geography | India first (GST, UPI/Razorpay, Swiggy/Zomato) |
| Beachhead segment | Cafés and small single-floor restaurants, single outlet |
| MVP wedge | POS + KDS + QR table ordering |
| Aggregators | Swiggy/Zomato orders in MVP **via middleware** (e.g. UrbanPiper); direct integration later |
| Devices | Must run on Windows PC/laptop, Android tablet/POS device, iPad, and any modern browser |
| Offline | **Offline billing only** in MVP (POS keeps billing without internet; syncs on reconnect) |
| Printing | Browser print dialog in MVP; silent thermal (ESC/POS) printing later |
| Order types (MVP) | Dine-in + Takeaway (+ Delivery orders arriving from aggregators) |
| Payments (MVP) | Recorded at counter (cash / UPI / card) — no online payment inside QR flow yet |
| Onboarding | Manual (done by the platform team) for the first cohort of cafés |
| Pricing | Flat monthly fee per outlet |
| Team / timeline | 1–2 developers, ~3 months to MVP |
| Tech stack | Deferred to TRD |

### 1.2 Design Principle: "Built for chains, shipped for cafés"
The UI in the MVP shows **one outlet, one floor**, but the **data model must support the full hierarchy from day one**:

```
Tenant (brand/business) → Outlet → Floor/Area → Table
```

Menus, orders, invoices, reports and users are always scoped to an outlet. This turns multi-outlet and multi-floor support into a later feature release instead of a rewrite.

---

## 2. User Personas

| Persona | Phase | Needs |
|---|---|---|
| **Café Owner / Manager** | MVP | Set up the menu, track daily sales and GST, see which items sell, keep Swiggy/Zomato orders in one place |
| **Cashier / Counter Staff** | MVP | Fast billing, see table status, accept QR orders, keep billing when the internet drops |
| **Kitchen Staff** | MVP | Clear queue of tickets from all channels (counter, QR, Swiggy, Zomato), mark items ready |
| **Dine-in Customer** | MVP | Scan the QR on the table, browse the menu, order without waiting for staff, pay at the counter |
| **Platform Super Admin** | MVP (minimal) | Create tenants and outlets, manage subscription status, support cafés |
| **Waiter / Captain** | Phase 2+ | Take orders tableside on a phone, call-waiter notifications |
| **Multi-outlet / Chain Owner** | Phase 4 | Central menu, cross-outlet reports, role-based access |
| **Online Customer (delivery/takeaway)** | Phase 4 | Order directly from the restaurant's branded storefront |
| **Delivery Rider** | Phase 4+ | Order dispatch, navigation, proof of delivery |

---

## 3. Phased Roadmap

| Phase | Theme | Target timeline | Headline features |
|---|---|---|---|
| **1 — MVP** | Run a café | ~3 months | POS, simple table view, KOT/KDS, QR ordering (pay at counter), menu + modifiers, GST billing, reports, Swiggy/Zomato via middleware, offline billing, minimal super admin |
| **2 — Grow the café** | Retain and monetise | +2–3 months | Staff roles + PIN, UPI/Razorpay payments in QR, split bill, discounts/coupons, basic inventory, customer CRM/loyalty, silent thermal printing, self-serve signup + automated subscription billing |
| **3 — Full-service & multi-floor** | Move up-market | +3 months | Drag-and-drop floor builder, multi-floor/areas, waiter app, call-waiter / request-bill, group shared cart, reservations, recipe BOM inventory, channel-specific pricing, full offline-first (LAN sync between POS & KDS) |
| **4 — Chains & direct commerce** | Become the "OS" | +3–6 months | Multi-outlet central menu & reports, white-label online ordering storefront (custom domain), geofenced delivery, rider app, 3PL delivery fallback (e.g. Porter, Shadowfax, Borzo), direct aggregator APIs, tiered plans & feature toggles |

> Timelines after Phase 1 are indicative and will be re-planned using MVP feedback.

---

## 4. Phase 1 (MVP) — Functional Requirements

### 4.1 Menu Management
- **M1.** Categories and items with name, description, price, veg / non-veg / egg marker, image (optional), and active/inactive status.
- **M2.** Modifier groups (e.g. Size: Regular/Large; Add-ons: Extra shot, Oat milk) with min/max selection rules and price deltas.
- **M3.** Variants (e.g. Small/Medium/Large) as a special single-select modifier group.
- **M4.** Per-item GST rate and HSN/SAC code; item price may be tax-inclusive or tax-exclusive (outlet-level setting).
- **M5.** **Out-of-stock toggle ("86")**: one tap hides the item from the QR menu and the POS, and pushes the stock status to Swiggy/Zomato through the middleware.
- **M6.** Bulk menu import (CSV/Excel), so the platform team can onboard cafés quickly.

### 4.2 POS (Billing Terminal)
- **P1.** One order screen for **Dine-in** (linked to a table) and **Takeaway** (linked to a token number). Delivery orders arrive from aggregators (see 4.6).
- **P2.** Fast item search, category grid, modifier selection pop-up, quantity edit, item-level notes ("less sugar").
- **P3.** Send KOT to kitchen; add more items to a running table order (generates an incremental KOT).
- **P4.** Generate bill: subtotal, GST breakdown (CGST/SGST), optional service charge (must be **optional/removable**, per CCPA guidelines), round-off, grand total.
- **P5.** Order-level discount (flat or %), with a reason field. *(Permission control comes in Phase 2.)*
- **P6.** Record payment: Cash / UPI / Card / Other. Support part-payments across modes (e.g. ₹300 cash + ₹200 UPI). No payment-gateway integration in the MVP; payments are recorded only.
- **P7.** Cancel / void an item or order with a mandatory reason; voids appear in reports.
- **P8.** Reprint bill / KOT.
- **P9.** Works in a browser on Windows, Android and iPad, laid out for both touch and mouse/keyboard.

### 4.3 Table View (Simple)
- **T1.** Grid/list of tables for the single floor (configured by the platform team or owner: table name/number, seats).
- **T2.** Table status: **Vacant → Occupied (order running) → Bill printed → Settled → Vacant**.
- **T3.** Move an order to another table; merge two tables' orders.
- **T4.** Running time per occupied table.
- *Visual drag-and-drop floor plans and multiple floors are Phase 3. The data model must still store floor/area (see 1.2).*

### 4.4 Kitchen: KOT & KDS
- **K1.** Every order sent to the kitchen creates a **KOT** (kitchen order ticket) listing items, modifiers, notes, table/token number and source channel (POS / QR / Swiggy / Zomato).
- **K2.** **KDS screen** (any tablet or monitor with a browser) shows open tickets in real time, newest-first or oldest-first.
- **K3.** Ticket states: New → Preparing → Ready. Marking a ticket Ready notifies the POS (and the aggregator, for delivery orders).
- **K4.** Colour-coded age timers (e.g. green < 10 min, amber 10–20, red > 20; thresholds configurable).
- **K5.** Optional KOT printing via the browser print dialog, for kitchens that prefer paper.
- *Routing to multiple stations (e.g. bar vs kitchen) is Phase 2/3.*

### 4.5 QR Table Ordering (Customer-facing)
- **Q1.** One unique QR per table. Scanning it opens a mobile web menu in the café's branding (logo, colours). No app download and no login needed.
- **Q2.** Customer browses categories, sees veg/non-veg markers and prices, picks modifiers, adds notes, and places the order.
- **Q3.** Optional name and phone number capture (no OTP in the MVP).
- **Q4.** Placed orders arrive on the POS as **pending**. Staff **accept** (sends KOT) or **reject** (stops prank orders). An outlet setting can switch on **auto-accept**.
- **Q5.** Customer sees order status: Placed → Accepted → Preparing → Ready/Served.
- **Q6.** Customer can place repeat orders to the same table session; all of them go onto one running bill.
- **Q7.** "View bill" shows the running total; payment happens **at the counter** in the MVP.
- **Q8.** Out-of-stock items show as unavailable in real time.
- **Q9.** The table session ends when staff settle the bill, so the next customer at that table starts a fresh session.

### 4.6 Aggregator Integration (Swiggy / Zomato via Middleware)
- **A1.** Integrate with a middleware provider (e.g. UrbanPiper) to receive Swiggy/Zomato orders in real time.
- **A2.** Aggregator orders appear on the POS with a loud alert and an accept/reject action within the aggregator's time limit; accepted orders go straight to the KDS.
- **A3.** Show the aggregator order ID, customer instructions, and rider status/ETA if the middleware provides them.
- **A4.** Menu sync: the POS menu is the source of truth and is pushed to the aggregators; item out-of-stock changes sync automatically.
- **A5.** Store on/off toggle (temporarily stop taking aggregator orders).
- **A6.** Mark Food Ready, which is sent back to the aggregator.
- **A7.** Reports separate revenue by channel (Dine-in / Takeaway / QR / Swiggy / Zomato).
- **Constraint:** aggregator orders need internet. They are not available in offline mode.

### 4.7 GST Billing & Compliance (India)
- **G1.** GST-compliant tax invoice containing: outlet legal name, address, **GSTIN**, **FSSAI licence number**, invoice number, date/time, items, HSN/SAC, tax rate, CGST/SGST amounts, total.
- **G2.** Support outlets registered under the **composition scheme** or **unregistered**. They issue a "Bill of Supply" with no GST charged (outlet-level setting).
- **G3.** **Sequential, unique invoice numbering per financial year**, reset on 1 April, with a configurable prefix. Invoices created offline must stay unique and gap-free per device; see N2.
- **G4.** Invoices are never deleted. Cancellations produce a cancelled record with a reason.
- **G5.** Restaurant service is taxed at 5% GST without ITC by default; per-item rate overrides are allowed (e.g. packaged goods).
- *E-invoicing (IRN) applies only above the turnover threshold, so it is out of scope for the MVP's target segment.*

### 4.8 Reports (Owner)
- **R1.** Daily sales summary / day-end **Z-report**: gross sales, discounts, taxes, net sales, payment-mode breakdown, voids/cancellations.
- **R2.** Item-wise and category-wise sales.
- **R3.** Channel-wise sales (Dine-in / Takeaway / QR / Swiggy / Zomato).
- **R4.** GST report (tax collected by rate) for the owner's CA.
- **R5.** Date range filter; export to Excel/CSV.
- **R6.** Simple dashboard: today's sales, orders, average order value, top 5 items.

### 4.9 Access & Users (MVP-light)
- **U1.** Owner login (email/phone + password or OTP).
- **U2.** Shared device logins for POS and KDS screens (a device is bound to an outlet).
- *Individual staff accounts, PIN login and permissions (void/discount approval) are Phase 2.*

### 4.10 Platform Super Admin (Minimal)
- **S1.** Create tenant → outlet; set GSTIN/FSSAI/address; generate QR codes for tables.
- **S2.** Upload or import the menu on the café's behalf.
- **S3.** Subscription status per outlet: Trial / Active / Overdue / Suspended. Payments are collected **manually** in the MVP (invoice + UPI/bank transfer). Suspended outlets get read-only access.
- **S4.** Enable/disable the aggregator integration per outlet.
- **S5.** Platform view: number of active outlets, orders/day, and MRR (manually maintained in the MVP).
- **S6.** Impersonate / "view as outlet" for support, with an audit log.

---

## 5. Non-Functional Requirements (Stack-agnostic)

- **N1. Device coverage:** POS, KDS and the admin portal must run in a modern browser on Windows, Android and iPad. The QR menu must work on low-end Android phones over 4G.
- **N2. Offline billing:** If internet is lost, the POS must keep taking dine-in/takeaway orders, generate bills with unique invoice numbers (e.g. a device-specific series), record payments and print, then sync automatically and idempotently when the connection returns. QR ordering, KDS sync across devices and aggregator orders may pause while offline, and the UI must clearly show that offline state.
- **N3. Real-time updates:** POS ↔ KDS ↔ QR customer status updates should arrive within about 2 seconds when online.
- **N4. Multi-tenancy & isolation:** Strict tenant data isolation enforced at the data layer; the data model supports Tenant → Outlet → Floor → Table from day one (see 1.2).
- **N5. Data integrity:** Invoices and payments are append-only and auditable; every financial change (void, discount, cancellation) is logged with user, device and timestamp.
- **N6. Performance:** Adding an item on the POS feels instant (<100 ms); a bill prints within 2 s of tapping.
- **N7. Availability:** 99.5%+ for cloud services in the MVP. The POS remains usable through outages via N2.
- **N8. Security:** HTTPS everywhere; QR tokens cannot be guessed (no sequential table IDs in URLs); rate-limited QR order submission.
- **N9. Backups:** Daily backups with point-in-time recovery; owner data export on request.
- **N10. Localisation-ready:** English in the MVP; UI strings externalised so Hindi or regional languages can be added later. Currency is INR, formatted Indian style (₹1,00,000).

---

## 6. Out of Scope for MVP (moved to later phases)

| Feature | Phase |
|---|---|
| Staff roles, PIN login, permissions | 2 |
| Online payments (UPI/Razorpay) inside the QR flow | 2 |
| Split bill | 2 |
| Coupons, loyalty, customer CRM | 2 |
| Basic inventory (stock counts) | 2 |
| Silent thermal printing (ESC/POS) | 2 |
| Self-serve signup and automated subscription billing | 2 |
| Reservations | 3 |
| Drag-and-drop floor plan, multiple floors/areas | 3 |
| Waiter app, call-waiter / request-bill | 3 |
| Group shared cart | 3 |
| Recipe BOM inventory and channel-specific pricing | 3 |
| Full offline-first (LAN sync of POS + KDS) | 3 |
| Multi-outlet management and consolidated reporting | 4 |
| White-label online ordering storefront with custom domain | 4 |
| Geofenced delivery, rider app, 3PL fallback | 4 |
| Direct Swiggy/Zomato APIs (replacing middleware) | 4 |
| Tiered plans, feature toggles, usage enforcement | 4 |

---

## 7. Pricing (MVP)

- **Flat monthly subscription per outlet** (price point TBD; benchmark against Petpooja and similar products in the ~₹800–2,000/month range).
- Aggregator integration may be a **paid add-on**, because the middleware has a per-outlet cost.
- Free trial (e.g. 14–30 days) for design-partner cafés.
- Tiered plans (Starter / Growth / Enterprise) introduced in Phase 4.

---

## 8. Success Metrics

### MVP (first 3–6 months after launch)
- **Activation:** 10–30 live cafés, each processing at least 20 bills/day.
- **Retention:** ≥ 80% of onboarded cafés still active after 60 days.
- **QR adoption:** % of dine-in orders placed via QR (target ≥ 25%).
- **Aggregator coverage:** % of outlets with Swiggy/Zomato connected; aggregator order accept rate.
- **Reliability:** POS uptime including offline mode; number of offline sync failures (target zero lost invoices).
- **Speed:** median time from order placed to KOT on the KDS.

### Long-term (platform)
- Active outlets, MRR, logo and revenue churn, expansion revenue (add-ons, more outlets).
- Phase 4+: % of orders moved from aggregators to the direct storefront.

---

## 9. Risks & Mitigations

| Risk | Mitigation |
|---|---|
| A 3-month solo/duo build is tight | Strict MVP cut (Section 6); one web codebase for every device; manual onboarding instead of building self-serve |
| Middleware cost/approval delays aggregator sync | Start the partnership conversation in week 1; aggregator support ships as a toggleable add-on so the MVP can launch without it if needed |
| Offline invoice numbering conflicts | Device-scoped invoice series; idempotent sync; define it in the TRD early |
| Browser printing is clunky for busy counters | Acceptable for MVP; silent printing in Phase 2 |
| Prank / mistaken QR orders | Staff accept/reject by default; rate limiting |
| Crowded market (Petpooja, Posist, DotPe) | Differentiate on QR ordering UX, simplicity and price for cafés; recruit design partners early |

---

## 10. Open Questions

1. Final product name and brand.
2. Middleware choice (UrbanPiper vs alternatives) and its per-outlet pricing.
3. Exact subscription price and whether aggregator sync is bundled or an add-on.
4. Are there design-partner cafés lined up for pilot testing?
5. Is a KOT printer needed at launch, or a KDS screen only?
6. Which hardware to recommend to cafés (e.g. a specific Android POS with a built-in printer)?
7. Tech stack and architecture (offline storage, real-time transport, tenant isolation approach) to be decided in the TRD.
