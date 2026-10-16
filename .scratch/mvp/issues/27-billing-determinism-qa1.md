# 27 Billing: order-independent totals and input guards (QA round 1)

Status: resolved
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

## Answer

Each bug was reproduced as a red test before its fix (the QA probes were readable and their cases are in the tests below). Golden totals are unchanged: goldens 01–09 gained only `"discountCapped": false`.

1. **Totals depended on line order.** Equal remainders in the largest-remainder split now go by the line itself: higher tax rate, then larger taxable value, then larger menu amount, then lower `orderItemId`. Lines equal on all four produce identical amounts whichever takes the paisa, so totals are order-independent even without ids. With ids, so is each line's result. `allocateLargestRemainder` takes an optional `tieBreak(a, b)` comparator (default: earlier index, as before). `LineInput` gains optional `orderItemId`, which a synced `InvoiceLine` and `apps/app`'s `issueInvoice` already carry. ADR 0028 amends ADR 0017's tie rule. Held by:
   - golden 11 (`[₹8.30 @5%, ₹8.30 @18%]`, ₹0.01 off → ₹19.00 either order) and every golden re-run with its lines reversed
   - `computeInvoice › gives the same totals whatever order the lines are in…`, `› …by the larger menu amount`, `› …by their order item id`
   - property `gives identical totals, and each line the same result, whatever order the lines come in` (tie-prone generator plus the general one, 5,000 runs)
   - `allocateLargestRemainder › orders a tie in remainders by the tie-break it is given, not by position`
2. **Service-charge rate snapshot.** `InvoiceCreatePayload.outletTaxRateBp` (required `RateBp`) was added, and the fixture's invoice carries `500`. Held by `SyncPushRequest › reads the shared fixture…` and `SyncOp › refuses an invoice without the outlet tax rate it was billed at`. Because the field is required, the till must send it: `apps/app/src/modules/pos/local/issueInvoice.ts` now copies `bill.outletTaxRateBp` into the payload, a one-line change outside this ticket's workspaces. Without it, the app's sync-push contract test goes red (checked).
3. **Unsafe quantity.** `computeInvoice` refuses a quantity that is not `Number.isSafeInteger` with a `RangeError`. Held by `computeInvoice › refuses a quantity beyond the largest safe integer rather than guessing`.
4. **Invalid clock.** `assertClockNotBehind` validates `now` before the `null` short-circuit. Held by `assertClockNotBehind › refuses an invalid Date rather than letting it through` (now covering `now` invalid with no last invoice).
5. **Discount above the taxable value.** A flat discount above the subtotal is capped at it, and `InvoiceTotals.discountCapped` reports it; a negative flat discount is still refused. Recorded in ADR 0028. Held by golden 10 (₹105.00 comp on a ₹105.00 inclusive 5% item → ₹100.00 off, ₹0.00), `computeInvoice › caps a flat discount at the taxable value and says so…`, and property `never takes more than the subtotal off, and says so exactly when it caps a flat discount` (the generator now produces flat discounts up to twice the subtotal).

Compatibility for `computeInvoice`: the input gains only the optional `orderItemId`. The output gains `discountCapped: boolean` and is otherwise unchanged; `LineTotals` doesn't echo the id.

Test cases: billing 0006 is superseded by 0007 (refusals, now including the unsafe quantity, with the over-subtotal discount removed) and 0008 (the cap). 0009 is new (order independence). 0003 and 0104 are extended, and so is contracts 0003.

Not done (outside this ticket's edit list): ADR 0017's Status should note "Amended by 0028". The till doesn't yet show the capped notice.

Proposed `docs/log.md` line:

- 2026-10-16 — Ticket 27 (QA round 1, billing). A bill adds up the same whatever order its lines are in: a remainder tie goes by rate, amount and order item id, never position. A flat discount above the taxable value is capped and reported. The synced invoice carries the outlet tax rate it was billed at. Unsafe quantities and invalid clocks are refused. ADR 0028 (amends 0017). Billing cases 0007–0009 (0006 superseded); 0003, 0104 and contracts 0003 extended.

### Property-test time budget (folded in from QA)

`totals.property.test.ts` timed out at 60 s under load. Changes:

- **Runs:** 500 per property by default. `FC_NUM_RUNS` overrides it, for example in a nightly job; `vitest.config.ts` reads it and passes it in with Vitest's `provide`/`inject`. This was 2,000, and 5,000 for the new permutation property, which now uses the shared setting too.
- **Time limit:** `interruptAfterTimeLimit: 20_000` with `markInterruptAsFailure: false`. A slow runner ends a property as a pass on the runs it completed. A counterexample still fails. The Vitest timeout stays at 60 s, above the interrupt.
- **Reporting:** `verbose: fc.VerbosityLevel.Verbose`. A failure prints `Property failed after N tests { seed, path, endOnFailure }`; I checked this by reintroducing the position tie-break, and the permutation property failed after 61 runs. Pass the seed and path back to `fc.assert` to replay.
- **Time per property at 500 runs** (load average about 17, the machine was never idle): reconciles 160 ms, CGST/SGST 202 ms, discount sum 56 ms, no negative 375 ms, whole rupee 56 ms, inclusive menu price 41 ms, Bill of Supply 96 ms, permutation 89 ms, cap 38 ms, same output 107 ms. The file takes 1.2 s of test time.
- **Interrupt checked:** with `FC_NUM_RUNS=10000000`, one property stopped at 20.0 s and passed.
