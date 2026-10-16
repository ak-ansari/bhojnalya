// Invoice totals: line tax, order discount, service charge and round-off
// (TRD §6.1 rules 1–9, ADR 0003, ADR 0004, ADR 0017, ADR 0028).
//
// `computeInvoice` is pure and deterministic: no I/O, no clock, no floats.
// The POS runs it to print the bill offline, and the server re-runs it on the
// same input to compare. Amounts are integer paise (`bigint`); rates are
// integer basis points (5% = 500) and quantities whole units, as in the sync
// contract, so a synced invoice's lines can be passed straight in. A rate or
// quantity that is not an integer is refused, never rounded. The order of the
// lines never changes an amount: the server may hold them in another order
// than the till did (ADR 0028).

import { allocateLargestRemainder, roundHalfUp } from './money.js';

/** How the outlet is registered for GST (PRD G2). Only `regular` charges tax. */
export type TaxMode = 'regular' | 'composition' | 'unregistered';

/** Whether menu prices already include GST (TRD §6.1 rule 2). */
export type PriceMode = 'exclusive' | 'inclusive';

export interface InvoiceInput {
  readonly taxMode: TaxMode;
  readonly priceMode: PriceMode;
  /** The outlet's default GST rate in basis points (TRD §6.1 rule 9); a taxed service charge follows it. */
  readonly outletTaxRateBp: number;
  /**
   * At least one line, as snapshotted on the order. Totals come back in the
   * same order, and are the same amounts whatever that order is.
   */
  readonly lines: readonly LineInput[];
  /** Order-level discount (PRD P5), or `null` for none. */
  readonly discount: DiscountInput | null;
  /** Service charge (PRD P4), or `null` when off or removed by the guest. */
  readonly serviceCharge: ServiceChargeInput | null;
}

export interface LineInput {
  /**
   * The order item this line bills. Optional; when given, it settles which of
   * two otherwise identical lines takes a leftover discount paisa, so each
   * line's result, not just the totals, is independent of line order.
   */
  readonly orderItemId?: string;
  /** Menu price of one unit in paise: GST-inclusive when `priceMode` is `inclusive`. */
  readonly unitPrice: bigint;
  /** Each chosen modifier's price delta per unit, in paise. May be negative. */
  readonly modifiers: readonly { readonly price: bigint }[];
  /** Whole units, at least 1. */
  readonly quantity: number;
  /** GST rate in basis points (5% = 500), 0 to 10000. Ignored without registration. */
  readonly taxRateBp: number;
}

export type DiscountInput =
  | { readonly kind: 'flat'; readonly amount: bigint }
  | { readonly kind: 'percent'; readonly rateBp: number };

export interface ServiceChargeInput {
  /** Charge as basis points of the discounted taxable value (10% = 1000). */
  readonly rateBp: number;
  /**
   * Whether GST is charged on it, at the outlet's rate. Still an open question
   * for the outlets (TRD §22 Q4), so it is the caller's choice.
   */
  readonly taxed: boolean;
}

export interface InvoiceTotals {
  readonly documentTitle: 'Tax Invoice' | 'Bill of Supply';
  /** True when the composition-scheme declaration must be printed (TRD §6.1 rule 8). */
  readonly compositionDeclaration: boolean;
  readonly lines: readonly LineTotals[];
  /** Σ line taxable value before discount. */
  readonly subtotal: bigint;
  /** The order discount, equal to Σ line discount. */
  readonly discount: bigint;
  /**
   * True when a flat discount asked for more than the subtotal and was cut to
   * it (ADR 0028), so the till can tell the cashier the bill is ₹0.00 rather
   * than the amount they keyed in.
   */
  readonly discountCapped: boolean;
  /** Σ line taxable value after discount: subtotal − discount. */
  readonly taxableValue: bigint;
  readonly serviceCharge: ServiceChargeTotals | null;
  /** One row per distinct rate (items and taxed service charge), ascending. Empty on a Bill of Supply. */
  readonly taxSummary: readonly TaxSummaryRow[];
  /** Total GST: Σ line tax + service-charge tax. */
  readonly tax: bigint;
  readonly cgst: bigint;
  readonly sgst: bigint;
  /** Grand total minus everything before it: −49 to +50 paise. */
  readonly roundOff: bigint;
  /** Payable, a whole number of rupees: subtotal − discount + service charge + tax + round-off. */
  readonly grandTotal: bigint;
}

export interface LineTotals {
  /** (unit price + modifiers) × quantity, as priced on the menu. */
  readonly gross: bigint;
  readonly taxableBeforeDiscount: bigint;
  /** This line's share of the order discount. */
  readonly discount: bigint;
  readonly taxable: bigint;
  /** Rate applied: the input rate on a Tax Invoice, 0 on a Bill of Supply. */
  readonly taxRateBp: number;
  readonly tax: bigint;
  readonly cgst: bigint;
  readonly sgst: bigint;
  /** taxable + tax. */
  readonly total: bigint;
}

export interface ServiceChargeTotals {
  readonly rateBp: number;
  /** The discounted taxable value of the items the charge is computed on. */
  readonly base: bigint;
  readonly amount: bigint;
  /** GST rate applied to the charge; `null` when untaxed (always, on a Bill of Supply). */
  readonly taxRateBp: number | null;
  readonly tax: bigint;
  readonly cgst: bigint;
  readonly sgst: bigint;
}

export interface TaxSummaryRow {
  readonly taxRateBp: number;
  readonly taxable: bigint;
  readonly tax: bigint;
  readonly cgst: bigint;
  readonly sgst: bigint;
}

const BP = 10_000n;

/**
 * Computes every amount on an invoice from its input. Throws a `RangeError`
 * on input no bill can have (no lines, a negative price, a fractional or
 * unsafe quantity, a negative discount); it never clamps or guesses. The one
 * exception is a flat discount above the subtotal, which is cut to the
 * subtotal and reported as `discountCapped` (ADR 0028).
 */
export function computeInvoice(input: InvoiceInput): InvoiceTotals {
  validate(input);
  const charged = input.taxMode === 'regular';

  const priced = input.lines.map((line) => priceLine(line, input.priceMode, charged));
  const subtotal = sum(priced.map((line) => line.taxableBeforeDiscount));
  const { discount, discountCapped } = discountAmount(input.discount, subtotal);
  const shares = allocateLargestRemainder(
    discount,
    priced.map((line) => line.taxableBeforeDiscount),
    (a, b) => byLine(priced[a] as PricedLine, priced[b] as PricedLine),
  );
  // One share per weight, in order, so every index is present.
  const lines = priced.map((line, index) =>
    taxLine(line, shares[index] as bigint, input.priceMode),
  );
  const taxableValue = sum(lines.map((line) => line.taxable));

  const serviceCharge = computeServiceCharge(input, taxableValue, charged);
  const taxed: TaxedAmount[] = [...lines];
  if (serviceCharge?.taxRateBp != null) {
    taxed.push({
      ...serviceCharge,
      taxRateBp: serviceCharge.taxRateBp,
      taxable: serviceCharge.amount,
    });
  }
  const tax = sum(taxed.map((line) => line.tax));

  const beforeRoundOff = taxableValue + (serviceCharge?.amount ?? 0n) + tax;
  const grandTotal = roundHalfUp(beforeRoundOff, 100n) * 100n;

  return {
    documentTitle: charged ? 'Tax Invoice' : 'Bill of Supply',
    compositionDeclaration: input.taxMode === 'composition',
    lines,
    subtotal,
    discount,
    discountCapped,
    taxableValue,
    serviceCharge,
    taxSummary: charged ? summarise(taxed) : [],
    tax,
    cgst: sum(taxed.map((line) => line.cgst)),
    sgst: sum(taxed.map((line) => line.sgst)),
    roundOff: grandTotal - beforeRoundOff,
    grandTotal,
  };
}

function validate(input: InvoiceInput): void {
  if (input.lines.length === 0) throw new RangeError('an invoice needs at least one line');
  requireRate('outlet tax rate', input.outletTaxRateBp);
  input.lines.forEach((line, index) => {
    // Above 2^53 a quantity is no longer the whole number that was typed.
    if (!Number.isSafeInteger(line.quantity)) {
      throw new RangeError(
        `line ${String(index)} quantity ${String(line.quantity)} is not a safe integer`,
      );
    }
    requireRange(`line ${String(index)} quantity`, BigInt(line.quantity), 1n, null);
    requireRange(`line ${String(index)} unit price with modifiers`, unitPrice(line), 0n, null);
    requireRate(`line ${String(index)} tax rate`, line.taxRateBp);
  });
  if (input.discount?.kind === 'percent') requireRate('discount', input.discount.rateBp);
  if (input.serviceCharge !== null) requireRate('service charge', input.serviceCharge.rateBp);
}

/** A rate is a whole number of basis points from 0% to 100%; `BigInt` refuses a fraction. */
function requireRate(what: string, rateBp: number): void {
  requireRange(what, BigInt(rateBp), 0n, BP);
}

function requireRange(what: string, value: bigint, min: bigint, max: bigint | null): void {
  if (value < min || (max !== null && value > max)) {
    throw new RangeError(
      `${what} is ${String(value)}, outside ${String(min)}..${String(max ?? '')}`,
    );
  }
}

function unitPrice(line: LineInput): bigint {
  return line.unitPrice + sum(line.modifiers.map((modifier) => modifier.price));
}

interface PricedLine {
  readonly gross: bigint;
  readonly taxableBeforeDiscount: bigint;
  readonly taxRateBp: number;
  readonly orderItemId: string | undefined;
}

/**
 * TRD §6.1 rule 2. Exclusive: the menu amount is the taxable value. Inclusive:
 * the taxable value is extracted from it. Without registration no tax is
 * charged, so the menu amount is the taxable value whatever the price mode.
 */
function priceLine(line: LineInput, priceMode: PriceMode, charged: boolean): PricedLine {
  const gross = unitPrice(line) * BigInt(line.quantity);
  const taxRateBp = charged ? line.taxRateBp : 0;
  const taxableBeforeDiscount =
    priceMode === 'inclusive' ? roundHalfUp(gross * BP, BP + BigInt(taxRateBp)) : gross;
  return { gross, taxableBeforeDiscount, taxRateBp, orderItemId: line.orderItemId };
}

/**
 * ADR 0028: which of two lines with equal remainders takes a leftover
 * discount paisa, decided by the lines themselves and never by their
 * position. Higher rate first, then larger taxable value, then larger menu
 * amount, then lower order item id. Lines equal on all four come out the
 * same whichever gets the paisa, so the totals cannot depend on order.
 */
function byLine(a: PricedLine, b: PricedLine): number {
  if (a.taxRateBp !== b.taxRateBp) return b.taxRateBp - a.taxRateBp;
  if (a.taxableBeforeDiscount !== b.taxableBeforeDiscount) {
    return a.taxableBeforeDiscount > b.taxableBeforeDiscount ? -1 : 1;
  }
  if (a.gross !== b.gross) return a.gross > b.gross ? -1 : 1;
  const [x, y] = [a.orderItemId ?? '', b.orderItemId ?? ''];
  return x < y ? -1 : x > y ? 1 : 0;
}

/**
 * TRD §6.1 rule 5: a flat amount, or a percentage of the subtotal rounded
 * once. ADR 0028: a flat amount above the subtotal (a comp keyed in at the
 * menu price of an inclusive item) is cut to the subtotal and reported.
 */
function discountAmount(
  discount: DiscountInput | null,
  subtotal: bigint,
): { discount: bigint; discountCapped: boolean } {
  if (discount === null) return { discount: 0n, discountCapped: false };
  if (discount.kind === 'percent') {
    return { discount: roundHalfUp(subtotal * BigInt(discount.rateBp), BP), discountCapped: false };
  }
  requireRange('discount', discount.amount, 0n, null);
  const discountCapped = discount.amount > subtotal;
  return { discount: discountCapped ? subtotal : discount.amount, discountCapped };
}

/**
 * TRD §6.1 rules 2–4, ADR 0017. An undiscounted inclusive line keeps its menu
 * price: its tax is whatever the menu amount holds above the taxable value. A
 * discounted line, in either mode, is taxed at its rate on its reduced
 * taxable value.
 */
function taxLine(line: PricedLine, discount: bigint, priceMode: PriceMode): LineTotals {
  const taxable = line.taxableBeforeDiscount - discount;
  const tax =
    priceMode === 'inclusive' && discount === 0n
      ? line.gross - taxable
      : roundHalfUp(taxable * BigInt(line.taxRateBp), BP);
  const { gross, taxableBeforeDiscount, taxRateBp } = line;
  return {
    gross,
    taxableBeforeDiscount,
    discount,
    taxable,
    taxRateBp,
    tax,
    ...split(tax),
    total: taxable + tax,
  };
}

/** TRD §6.1 rule 4: CGST = round_half_up(tax / 2), SGST = tax − CGST. */
function split(tax: bigint): { cgst: bigint; sgst: bigint } {
  const cgst = roundHalfUp(tax, 2n);
  return { cgst, sgst: tax - cgst };
}

/**
 * TRD §6.1 rule 6, ADR 0017: a share of the discounted item value, on its own
 * line, taxed at the outlet's rate when asked and the outlet is registered.
 */
function computeServiceCharge(
  input: InvoiceInput,
  base: bigint,
  charged: boolean,
): ServiceChargeTotals | null {
  if (input.serviceCharge === null) return null;
  const { rateBp, taxed } = input.serviceCharge;
  const amount = roundHalfUp(base * BigInt(rateBp), BP);
  const taxRateBp = charged && taxed ? input.outletTaxRateBp : null;
  const tax = taxRateBp === null ? 0n : roundHalfUp(amount * BigInt(taxRateBp), BP);
  return { rateBp, base, amount, taxRateBp, tax, ...split(tax) };
}

interface TaxedAmount {
  readonly taxRateBp: number;
  readonly taxable: bigint;
  readonly tax: bigint;
  readonly cgst: bigint;
  readonly sgst: bigint;
}

/** TRD §6.1 rule 3: per-line amounts grouped by rate, ascending. */
function summarise(taxed: readonly TaxedAmount[]): TaxSummaryRow[] {
  const rates = [...new Set(taxed.map((line) => line.taxRateBp))].sort((a, b) => a - b);
  return rates.map((taxRateBp) => {
    const group = taxed.filter((line) => line.taxRateBp === taxRateBp);
    return {
      taxRateBp,
      taxable: sum(group.map((line) => line.taxable)),
      tax: sum(group.map((line) => line.tax)),
      cgst: sum(group.map((line) => line.cgst)),
      sgst: sum(group.map((line) => line.sgst)),
    };
  });
}

function sum(amounts: readonly bigint[]): bigint {
  return amounts.reduce((acc, amount) => acc + amount, 0n);
}
