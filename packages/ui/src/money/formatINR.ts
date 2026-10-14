// The one money formatter for every app (invariant 1, TRD §4.2). It takes
// integer paise and never turns them into a float: rupees and paise are split
// with bigint arithmetic and only the whole rupees go through Intl, which
// supplies the ₹ sign and the Indian lakh/crore grouping.

const RUPEE_FORMAT = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const PAISE_PER_RUPEE = 100n;

/** `12645000n` → `"₹1,26,450.00"`; `-50n` → `"-₹0.50"`. Exact for any bigint. */
export function formatINR(paise: bigint): string {
  const negative = paise < 0n;
  const magnitude = negative ? -paise : paise;
  const rupees = magnitude / PAISE_PER_RUPEE;
  const fraction = (magnitude % PAISE_PER_RUPEE).toString().padStart(2, '0');

  const body = RUPEE_FORMAT.formatToParts(rupees)
    .map((part) => (part.type === 'fraction' ? fraction : part.value))
    .join('');
  return negative ? `-${body}` : body;
}
