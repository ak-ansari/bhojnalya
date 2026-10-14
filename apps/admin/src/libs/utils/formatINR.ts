// The one money formatter: paise in, Indian-grouped rupees out ("₹1,23,456.78").
// Money stays bigint end to end (invariant 1): rupees and paise are split with
// bigint division and never pass through a float.

const RUPEES = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 0,
});

export function formatINR(paise: bigint): string {
  const negative = paise < 0n;
  const magnitude = negative ? -paise : paise;
  const rupees = RUPEES.format(magnitude / 100n);
  const fraction = (magnitude % 100n).toString().padStart(2, '0');
  return `${negative ? '-' : ''}${rupees}.${fraction}`;
}
