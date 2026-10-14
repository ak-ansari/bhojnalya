// Pure, deterministic billing and GST engine shared by the POS and the API (TRD §6.1).
export const workspace = '@bhojnalya/billing';

// Invoice totals: line tax, discount, service charge, round-off (ticket 03).
export { allocateLargestRemainder, roundHalfUp } from './money.js';
export { computeInvoice } from './totals.js';
export type {
  DiscountInput,
  InvoiceInput,
  InvoiceTotals,
  LineInput,
  LineTotals,
  PriceMode,
  ServiceChargeInput,
  ServiceChargeTotals,
  TaxMode,
  TaxSummaryRow,
} from './totals.js';

// Invoice numbering, financial year, business date and the clock guard (ticket 04).
export * from './numbering/index.js';
