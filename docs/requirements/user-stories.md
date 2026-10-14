---
type: Requirement Group
title: "User stories (MVP)"
description: What each MVP persona does with the POS, KDS, QR menu, owner portal and super admin, written as stories that cross-app tests can hold to account, with each one marked as from the PRD, from the TRD, new or open.
resource: /docs/BHOJNALYA_PRD.md
tags: [requirements, user-stories, mvp, pos, kds, qr, aggregator, gst, offline]
timestamp: 2026-10-14T00:00:00Z
---

# User stories (MVP)

These stories are the review surface for the Phase 1 MVP. They also feed the
**user-story** test level ([testing levels](../conventions/testing-levels.md)):
each one is a promise that a test driving the real apps can hold to account.
The PRD says what to build and the TRD says how. This document says it the way
a café owner, cashier, cook or guest would, so the design can be argued over
one line at a time.

**Read the Src column first.** It is the whole point of this document.

| Src | Meaning | How closely to read it |
| :-- | :-- | :-- |
| **P** | Restates the PRD. The requirement ID (P4, G3, N2, …) is in the story | Skim. Disagreeing here reopens a product decision |
| **T** | Comes from the TRD's design (device series, outbox, `needs_review`, …), not stated in the PRD | Skim, but these are where the design turns into something a user notices |
| **N** | **New.** Came up while writing these stories and is not in either document | **Read every one.** Each needs a yes or a no |
| **?** | Open. The design has no answer yet; tied to PRD §10 or TRD §22 where one exists | Decide, or agree to defer explicitly |

`Lvl` is the **lowest** level that could hold the story's core promise:
**S** user story (Playwright across several apps against the real API),
**E** end to end (one app against the real API), **I** integration (real
Postgres), **U** unit. `Cov` is the test that holds the story. Nothing is built
yet, so every `Cov` is `—`.

There are **9 N** stories and **0 ?** stories out of **108**. The five open
stories were decided on 2026-10-14 and are now N, except US-ACC-06, which
follows the TRD and is now T.

---

## US-POS: Counter billing and tables

| ID | Src | Story | Lvl | Cov |
| :-- | :-- | :-- | :-- | :-- |
| US-POS-01 | P | As a **cashier** I open one order screen for a dine-in order on a table or a takeaway order on a token number, so every counter order starts the same way (P1) | E | — |
| US-POS-02 | P | As a **cashier** I find an item by search or from the category grid, pick its modifiers in a pop-up, change the quantity and add a note like "less sugar", so a busy counter never slows down (P2) | E | — |
| US-POS-03 | P | As a **cashier** adding an item feels instant, under 100 ms, with or without internet, because nothing on that path waits for the network (N6) | E | — |
| US-POS-04 | P | As a **cashier** I can't add an item that is out of stock or inactive, because it doesn't show on the POS (M1, M5) | E | — |
| US-POS-05 | P | As a **cashier** I send a KOT to the kitchen, and adding items to a running table order later sends only the new items as another KOT (P3, K1) | S | — |
| US-POS-06 | P | As a **cashier** I generate a bill showing subtotal, CGST/SGST breakdown, optional service charge, round-off and grand total, and it reaches the print dialog within 2 s (P4, N6) | E | — |
| US-POS-07 | P | As a **cashier** I can take the service charge off any bill, and it always appears as its own line, never folded into the price (P4) | E | — |
| US-POS-08 | P | As a **cashier** I apply a flat or percentage discount to the whole order with a reason, and it reduces the taxable value before tax (P5) | U | — |
| US-POS-09 | P | As a **cashier** I record payment as cash, UPI, card or other, and can split one bill across modes (₹300 cash + ₹200 UPI). Nothing goes through a payment gateway (P6) | E | — |
| US-POS-10 | P | As a **cashier** I void an item or a whole order only after giving a reason, and the void shows in the owner's reports (P7, N5) | S | — |
| US-POS-11 | P | As a **cashier** I reprint a bill or a KOT, and the reprint shows the same invoice number and amounts as the original (P8) | E | — |
| US-POS-12 | P | As a **cashier** I use the POS in a browser on a Windows PC, an Android tablet or an iPad, by touch or by mouse and keyboard (P9, N1) | E | — |
| US-POS-13 | P | As a **cashier** I see every table on the floor with its name, seats and status (Vacant → Occupied → Bill printed → Settled → Vacant), and how long each occupied table has been running (T1, T2, T4) | E | — |
| US-POS-14 | P | As a **cashier** I move an order to another table, or merge two tables' orders into one, without losing any item or KOT (T3) | E | — |
| US-POS-15 | T | As a **cashier** I see menu edits made after an order was taken, but the open order and its bill keep the name, price and tax rate the item had when it was ordered | I | — |

## US-OFF: Offline billing and sync

| ID | Src | Story | Lvl | Cov |
| :-- | :-- | :-- | :-- | :-- |
| US-OFF-01 | P | As a **cashier** I keep taking dine-in and takeaway orders, generating bills, recording payments and printing when the internet drops, and the screen clearly tells me I am offline (N2) | S | — |
| US-OFF-02 | P | As a **café owner** every bill made offline reaches the server once the connection returns, with nothing lost and nothing counted twice (N2, §8 target: zero lost invoices) | S | — |
| US-OFF-03 | T | As a **cashier** I don't have to press anything to sync. It starts on reconnect and retries every 15 s while anything is waiting | S | — |
| US-OFF-04 | T | As a **cashier** I always see how many changes are waiting to sync, so I know whether this device still holds bills the server hasn't seen | E | — |
| US-OFF-05 | T | As a **cashier** I can't log out, clear data or reset the device while changes are waiting to sync, so nobody wipes bills that exist only on this device | E | — |
| US-OFF-06 | T | As a **cashier** I can export the waiting bills to a file in an emergency, so a dying device doesn't take them with it | E | — |
| US-OFF-07 | T | As a **cashier** I'm stopped from billing if the device clock is earlier than the last bill's time, and told to fix the clock, so invoice dates and the financial year never run backwards | U | — |
| US-OFF-08 | T | As a **café owner** a sync that is cut off and retried, even the same batch three times, still leaves each bill on the server exactly once | I | — |
| US-OFF-09 | T | As a **café owner**, if the server works out a different total for a bill made offline, the bill is still kept exactly as the customer received it, marked for review, and I'm alerted | S | — |
| US-OFF-10 | T | As a **cashier** I can void or cancel with a reason, reprint, and see today's bills from this device while offline | E | — |
| US-OFF-11 | T | As a **kitchen staff** member, when the POS is offline, its KOTs print at the counter as a fallback and reach the KDS once it reconnects | S | — |
| US-OFF-12 | T | As a **café owner** I'm alerted when a device's invoice numbers have a gap on the server, because a gap means bills that haven't synced or are lost | I | — |
| US-OFF-13 | T | As a **cashier** I'm told on an installed iPad or a browser that hasn't granted persistent storage that bills may be at risk, so setup gets fixed before a busy day | E | — |
| US-OFF-14 | N | As a **café owner** I can see which of my devices still hold unsynced changes, and for how long. The TRD alerts only the super admin, after an hour | E | — |

## US-KDS: Kitchen

| ID | Src | Story | Lvl | Cov |
| :-- | :-- | :-- | :-- | :-- |
| US-KDS-01 | P | As **kitchen staff** I see each new ticket within about 2 s, whichever channel it came from (POS, QR, Swiggy, Zomato), with its items, modifiers, notes, table or token number and source (K1, K2, N3) | S | — |
| US-KDS-02 | P | As **kitchen staff** I order open tickets newest-first or oldest-first (K2) | E | — |
| US-KDS-03 | P | As **kitchen staff** I move a ticket New → Preparing → Ready, and Ready tells the POS, the QR guest and, for a delivery order, the aggregator (K3) | S | — |
| US-KDS-04 | P | As **kitchen staff** I see each ticket's age colour-coded (green, amber, red) against thresholds the outlet sets (K4) | E | — |
| US-KDS-05 | P | As **kitchen staff** who prefer paper I print a KOT through the browser print dialog (K5) | E | — |
| US-KDS-06 | T | As **kitchen staff**, if the screen drops its connection and comes back, it shows every ticket that changed while it was away, without a manual refresh | S | — |
| US-KDS-07 | N | As a **café owner** I choose per outlet whether KOTs go to the kitchen screen, the printer or both. With a printer, the print dialog opens by itself on "send to kitchen" (silent printing stays in Phase 2), and each till numbers its KOTs from 1 every business day, so two offline tills never clash (PRD §10 Q5, TRD §22 Q3) | E | — |

## US-QR: Guest ordering at the table

| ID | Src | Story | Lvl | Cov |
| :-- | :-- | :-- | :-- | :-- |
| US-QR-01 | P | As a **dine-in customer** I scan the table's QR and get the café's menu in its own logo and colours, with no app and no login (Q1) | E | — |
| US-QR-02 | P | As a **dine-in customer** on a low-end Android phone over 4G the menu opens in under 3 s (N1, N6) | E | — |
| US-QR-03 | P | As a **dine-in customer** I browse categories with veg/non-veg/egg markers and prices, pick modifiers, add notes and place the order (Q2) | E | — |
| US-QR-04 | P | As a **dine-in customer** I may leave my name and phone number but don't have to, and I'm told what they are used for (Q3) | E | — |
| US-QR-05 | P | As a **cashier** a QR order arrives as pending with a sound and a badge within about 2 s, and I accept it (which sends the KOT) or reject it (Q4, N3) | S | — |
| US-QR-06 | P | As a **café owner** I can turn on auto-accept so QR orders go to the kitchen without a cashier's tap (Q4) | S | — |
| US-QR-07 | P | As a **dine-in customer** I watch my order move Placed → Accepted → Preparing → Ready/Served, and I'm told if it's rejected (Q5) | S | — |
| US-QR-08 | P | As a **dine-in customer** I order again from the same table, and every order lands on one running bill (Q6) | S | — |
| US-QR-09 | P | As a **dine-in customer** I tap "View bill" to see the running total, and pay at the counter (Q7) | S | — |
| US-QR-10 | P | As a **dine-in customer** an item marked out of stock shows as unavailable while I'm still on the menu (Q8) | S | — |
| US-QR-11 | P | As the **next customer** at a table I start a fresh session once staff settle the previous bill, and never see the last party's orders (Q9) | S | — |
| US-QR-12 | P | As a **café owner** a guessed or altered QR link leads nowhere, and someone flooding orders from one table is slowed down (N8) | I | — |
| US-QR-13 | T | As a **café owner** I can rotate a table's QR so an old printed code stops working | E | — |
| US-QR-14 | P | As a **dine-in customer**, while the POS or the café's internet is down, I'm told ordering is paused rather than left with an order that never arrives (N2) | S | — |

## US-AGG: Swiggy and Zomato through middleware

| ID | Src | Story | Lvl | Cov |
| :-- | :-- | :-- | :-- | :-- |
| US-AGG-01 | P | As a **cashier** a Swiggy or Zomato order appears on the POS with a loud alert and a countdown to the aggregator's deadline, and I accept or reject it in time (A1, A2) | S | — |
| US-AGG-02 | P | As **kitchen staff** an accepted aggregator order reaches the KDS straight away (A2) | S | — |
| US-AGG-03 | P | As a **cashier** I see the aggregator order ID, the customer's instructions, and the rider's status and ETA when the middleware sends them (A3) | E | — |
| US-AGG-04 | P | As a **café owner** my POS menu is what Swiggy and Zomato show, and marking an item out of stock reaches them without anyone touching their dashboards (A4, M5) | S | — |
| US-AGG-05 | P | As a **café owner** I switch the store off to pause aggregator orders and back on again (A5) | S | — |
| US-AGG-06 | P | As **kitchen staff** marking a delivery ticket Ready sends Food Ready to the aggregator (A6, K3) | S | — |
| US-AGG-07 | T | As a **café owner** an aggregator order sent twice by the middleware appears once | I | — |
| US-AGG-08 | T | As a **café owner** I see a banner when an accept, reject, Food Ready, stock or store update could not reach the aggregator after retries, so I can act on it by hand | S | — |
| US-AGG-09 | P | As a **cashier** I'm told aggregator orders are paused while the POS is offline (A1 constraint, N2) | E | — |
| US-AGG-10 | N | As a **café owner** an aggregator order nobody accepted before the platform's deadline is kept as a missed order: no KOT, no invoice, and counted in my reports. Auto-accept is off unless I switch it on. The exact deadline comes from the middleware (PRD §10 Q2, TRD §22 Q1) | I | — |

## US-GST: Compliant invoices

| ID | Src | Story | Lvl | Cov |
| :-- | :-- | :-- | :-- | :-- |
| US-GST-01 | P | As a **café owner** every tax invoice shows the outlet's legal name, address, GSTIN, FSSAI number, invoice number, date and time, items, HSN/SAC, tax rate, CGST and SGST, and total (G1) | E | — |
| US-GST-02 | P | As a **café owner** on the composition scheme or unregistered, my bills print as "Bill of Supply" with no GST lines and the composition declaration (G2) | E | — |
| US-GST-03 | P | As a **café owner** invoice numbers are unique and sequential within the financial year, restart on 1 April in IST, and carry my prefix (G3) | U | — |
| US-GST-04 | T | As a **café owner** every invoice number is at most 16 characters and names the device that issued it, so two counters billing offline at the same time never collide (G3, N2) | U | — |
| US-GST-05 | T | As a **café owner** a reinstalled or reset device gets a new device code and never reissues a number its old code used | I | — |
| US-GST-06 | P | As a **café owner** an invoice is never deleted. Cancelling one keeps its number and records who cancelled it, from which device, when and why (G4, N5) | I | — |
| US-GST-07 | P | As a **café owner** items are taxed at 5% by default, and I can set another rate on a particular item, such as packaged goods (G5, M4) | U | — |
| US-GST-08 | P | As a **café owner** I choose whether my prices include or exclude tax, and the bill's taxable value and tax follow from that (M4) | U | — |
| US-GST-09 | T | As a **café owner** CGST and SGST always add up to the tax, line discounts add up to the order discount, and the bill reconciles to the paisa | U | — |
| US-GST-10 | P | As a **café owner** round-off shows as its own line and is never more than 50 paise either way (P4) | U | — |
| US-GST-11 | T | As a **café owner** a past bill stays exactly as issued even after I change an item's name, price, tax rate or HSN | I | — |
| US-GST-12 | N | As a **café owner** when I switch service charge on, GST is charged on it at the same rate as the items unless I turn that off for my outlet. A CA confirms this for the pilot outlets (TRD §22 Q4) | U | — |

## US-MENU: Menu and stock

| ID | Src | Story | Lvl | Cov |
| :-- | :-- | :-- | :-- | :-- |
| US-MENU-01 | P | As a **café owner** I manage categories and items with name, description, price, veg/non-veg/egg marker, optional image and active status (M1) | E | — |
| US-MENU-02 | P | As a **café owner** I set up modifier groups with min/max selections and price changes, and the POS and QR menu enforce those limits (M2) | E | — |
| US-MENU-03 | P | As a **café owner** I offer variants like Small/Medium/Large, of which a customer must pick exactly one (M3) | E | — |
| US-MENU-04 | P | As a **café owner** I give each item a GST rate and an HSN/SAC code (M4) | E | — |
| US-MENU-05 | P | As a **cashier** one tap marks an item out of stock ("86"), and it disappears from the POS and QR menu and is pushed to Swiggy/Zomato (M5) | S | — |
| US-MENU-06 | P | As a **super admin** I import a café's menu from a CSV or Excel file, so onboarding takes minutes (M6, S2) | I | — |
| US-MENU-07 | N | As a **super admin** a CSV import that has a bad row tells me which row and why, and imports nothing until the file is fixed, so a menu is never left half-loaded | I | — |
| US-MENU-08 | T | As a **café owner** a menu image I upload is resized for phones, so it doesn't slow the QR menu down | I | — |

## US-RPT: Owner reports

| ID | Src | Story | Lvl | Cov |
| :-- | :-- | :-- | :-- | :-- |
| US-RPT-01 | P | As a **café owner** I see the day-end Z-report (gross sales, discounts, taxes, net sales, payment-mode split, voids and cancellations) within 2 s (R1, N6) | I | — |
| US-RPT-02 | T | As a **café owner** whose café closes after midnight, sales before my day-end cutoff (e.g. 4 AM) count toward the previous business day | U | — |
| US-RPT-03 | P | As a **café owner** I see item-wise and category-wise sales (R2) | I | — |
| US-RPT-04 | P | As a **café owner** I see sales split by channel: dine-in, takeaway, QR, Swiggy, Zomato (R3, A7) | S | — |
| US-RPT-05 | P | As a **café owner** I hand my CA a GST report of tax collected by rate (R4) | I | — |
| US-RPT-06 | P | As a **café owner** I filter any report by date range and export it to Excel or CSV (R5) | E | — |
| US-RPT-07 | P | As a **café owner** I see today's sales, order count, average order value and top 5 items on a dashboard (R6) | E | — |
| US-RPT-08 | N | As a **café owner** bills made offline appear in my reports once synced, under the business day they were issued, not the day they arrived | S | — |
| US-RPT-09 | T | As a **café owner** I can see the bills flagged for review and why each one was flagged | E | — |
| US-RPT-10 | P | As a **café owner** I can ask for an export of all my data (N9) | E | — |

## US-ACC: Owners and devices

| ID | Src | Story | Lvl | Cov |
| :-- | :-- | :-- | :-- | :-- |
| US-ACC-01 | P | As a **café owner** I log in to the owner portal with email or phone and a password (U1) | E | — |
| US-ACC-02 | T | As a **café owner** I reset a forgotten password with an emailed OTP | E | — |
| US-ACC-03 | P | As a **café owner** I log in once on a tablet and register it as this outlet's POS or KDS, and it stays signed in from then on (U2) | E | — |
| US-ACC-04 | T | As a **café owner** I see my registered devices and revoke one, and a revoked device can't do anything after that | I | — |
| US-ACC-05 | P | As a **café owner** my outlet's data is never visible to another café, whatever the request asks for (N4) | I | — |
| US-ACC-06 | T | As a **café owner** I log in with my email or phone and a password, and reset it with a code sent by email. SMS OTP login waits for a later phase because each message costs money (U1) | E | — |

## US-ADM: Platform super admin

| ID | Src | Story | Lvl | Cov |
| :-- | :-- | :-- | :-- | :-- |
| US-ADM-01 | P | As a **super admin** I create a tenant and its outlet with GSTIN, FSSAI, address, state code and tax mode, and set up its floor and tables (S1, T1) | E | — |
| US-ADM-02 | P | As a **super admin** I generate the QR code for every table (S1) | E | — |
| US-ADM-03 | T | As a **super admin** I sign in with a password and a TOTP code, separately from any café's login | E | — |
| US-ADM-04 | P | As a **super admin** I set each outlet's subscription to Trial, Active, Overdue or Suspended (S3) | E | — |
| US-ADM-05 | P | As a **café owner** whose outlet is suspended I can still read my data but can't change anything, and I'm told why (S3) | S | — |
| US-ADM-06 | P | As a **super admin** I switch the aggregator integration on or off per outlet (S4) | S | — |
| US-ADM-07 | P | As a **super admin** I see the number of active outlets, orders per day and MRR (S5) | E | — |
| US-ADM-08 | P | As a **super admin** I view an outlet as its owner to support them. The screen shows a red banner, and everything I do is written to an audit log (S6) | S | — |
| US-ADM-09 | T | As a **super admin** I'm alerted to invoice number gaps, devices with changes unsynced for over an hour, aggregator jobs that failed for good, and failed backups | I | — |
| US-ADM-10 | N | As a **super admin** reading the audit log I can tell what the outlet's owner did from what I did while viewing as them | I | — |
| US-ADM-11 | N | As a **café owner** suspended while a POS was offline, every bill it made is accepted when it syncs, and I can still bill tables whose food already went to the kitchen, but I can't start a new order. Bills dated after the suspension are flagged for review (S3, N2, ADR 0015) | S | — |
| US-ADM-12 | N | As a **super admin** I re-provision a café's device and see the last number its old device code synced before that code is retired | I | — |

---

## The journeys

Each journey strings stories together across apps. These are what the
user-story tests drive first, because the likely bugs are in the hand-offs
between apps, not inside any single one.

1. **QR table order to settled bill.** A guest scans, orders, waits. The cashier
   accepts, the kitchen prepares and marks Ready, the guest sees Ready, orders
   again, views the bill, and the cashier settles. Then the next scan starts a
   fresh session.
   US-QR-01, 03, 05, 07, 08, 09, 11 · US-KDS-01, 03 · US-POS-06, 09, 13.
2. **Offline counter day.** The POS goes offline, issues 100 bills with
   payments and prints them. KOTs fall back to print. The POS reconnects, and the
   server holds every bill exactly once, numbers without gaps, and today's
   Z-report agrees with the counter.
   US-OFF-01, 02, 03, 04, 08, 11, 12 · US-RPT-01, 08 · US-GST-04.
3. **Sync that disagrees.** An offline bill whose total the server works out
   differently is kept as issued, flagged, and shows up for the owner to
   review. US-OFF-09 · US-RPT-09.
4. **Aggregator order end to end.** A Swiggy order arrives, the cashier accepts
   it before the deadline, the kitchen marks Ready, Food Ready reaches the
   aggregator, and the sale is reported under its channel.
   US-AGG-01, 02, 06, 07 · US-KDS-03 · US-RPT-04.
5. **An item runs out mid-service.** The cashier marks an item out of stock. It
   disappears from the POS, shows as unavailable to a guest already on the
   menu, and is pushed to Swiggy/Zomato. US-MENU-05 · US-QR-10 · US-AGG-04.
6. **Cancel and report.** The cashier voids an item with a reason and cancels a
   whole invoice. The invoice keeps its number, and both show up on the
   Z-report and in the audit trail. US-POS-10 · US-GST-06 · US-RPT-01.
7. **Onboard a café.** The super admin creates the tenant, outlet and tables,
   imports the menu and generates QR codes. The owner registers a POS and a
   KDS, and the first bill prints with every compliant field.
   US-ADM-01, 02 · US-MENU-06 · US-ACC-03 · US-GST-01.
8. **Suspend and support.** The super admin suspends an outlet. The owner can
   still read but not change anything. The super admin views the outlet as its
   owner under a banner, and the audit log records it.
   US-ADM-04, 05, 08, 10.

---

## Not in the MVP

These PRD §6 features are not stories here. Where the TRD or CLAUDE.md keeps a
hook in today's design so the feature arrives without a rewrite, the hook is
named.

| Feature | Phase | Hook kept today |
| :-- | :-- | :-- |
| Staff roles, PIN login, void/discount approval | 2 | `user_outlet_roles` and a permission enum exist; only `owner` is used |
| UPI/Razorpay payments inside the QR flow | 2 | — |
| Split bill | 2 | — |
| Coupons, loyalty, customer CRM | 2 | — |
| Basic inventory | 2 | — |
| Silent thermal (ESC/POS) printing | 2 | Print templates render from one source, ready for an ESC/POS builder in a Capacitor/Tauri shell |
| Self-serve signup, automated subscription billing | 2 | `subscriptions` table and status already exist |
| Reservations | 3 | — |
| Floor-plan builder, several floors or areas | 3 | Tenant → Outlet → Floor → Table hierarchy in the schema |
| Waiter app, call-waiter / request-bill | 3 | — |
| Group shared cart | 3 | — |
| Recipe BOM inventory, channel-specific pricing | 3 | — |
| Full offline-first with LAN sync of POS and KDS | 3 | Outbox and sync protocol; field-level last-writer-wins plus audit |
| Multi-outlet central menu and reports | 4 | `outlet_id` on every outlet-scoped row; `app.outlet_ids` in the RLS context |
| Branded online-ordering storefront | 4 | — |
| Geofenced delivery, rider app, 3PL fallback | 4 | — |
| Direct Swiggy/Zomato APIs | 4 | The aggregator adapter interface; UrbanPiper is its first implementation |
| Tiered plans and feature toggles | 4 | — |
| IGST / inter-state supply | — | `outlets.state_code` and `invoices.place_of_supply` |
