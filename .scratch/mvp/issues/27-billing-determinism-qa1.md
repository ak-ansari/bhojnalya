# 27 Billing: order-independent totals and input guards (QA round 1)

Status: ready-for-agent
Type: bug
Blocked by: none
Workspaces: packages/billing, packages/contracts

QA round 1 on development @ cdcf87a. Probes: `/private/tmp/claude-501/-Users-akansari-projects-bhojnalya/947da6ab-097f-41ff-891f-25d045e1c00f/scratchpad/billing/`. Each fix starts with a red test.

1. **Grand total depends on line order** (`money.ts` `byRemainderThenIndex`: a tie goes to the earlier line). Exclusive pricing, flat discount 1 paisa, lines [830p @500bp, 830p @1800bp] → grand total 1800; reversed → 1900. If the server re-runs lines in a different order, a correct bill is flagged `needs_review`. Make the result **independent of line order**: break remainder ties by a stable key carried on the line (e.g. `orderItemId`), not array position. Add a fast-check property: any permutation of lines gives identical totals (and identical per-line results keyed by id). Amend ADR 0017's tie rule with a new ADR (0028) that supersedes that point.
2. **Service-charge rate snapshot** (`contracts/src/sync-ops.ts` `InvoiceCreatePayload` has no `outletTaxRateBp`; `totals.ts` needs it). Add it to the payload (and the fixture), so re-validation doesn't depend on the outlet's current rate. (Invariant 5.) This was noted for ticket 17; it's done here instead.
3. `totals.ts` accepts unsafe-integer quantities above 2^53: reject with `RangeError`.
4. `numbering/clock-guard.ts`: an invalid `now` (`new Date(NaN)`) passes when `lastInvoiceAt` is null. Reject invalid dates.
5. **Discount larger than the taxable value** (QA question): a flat ₹105 comp on a ₹105 inclusive 5% item throws because the discount comes off the ex-tax value (₹100). Don't throw: cap the discount at the taxable value and report the cap in the result (`discountCapped: true`), so the UI can tell the cashier. Record this in ADR 0028.

Keep 100% branch coverage and the golden files (update the fixture's golden if the payload changes, totals must not).
