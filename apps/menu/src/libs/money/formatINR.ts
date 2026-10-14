// Kept local rather than shared: the guest bundle imports nothing it can avoid (ADR 0013).
const INR = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  trailingZeroDisplay: 'stripIfInteger',
});

/** Integer paise to `₹1,50,000` or `₹150.50`; whole rupees show no decimals. */
export function formatINR(paise: bigint): string {
  return INR.format(toDecimalRupees(paise));
}

// An exact decimal string, so no amount ever passes through a float.
function toDecimalRupees(paise: bigint): `${number}` {
  const sign = paise < 0n ? '-' : '';
  const magnitude = paise < 0n ? -paise : paise;
  const rupees = magnitude / 100n;
  const rest = (magnitude % 100n).toString().padStart(2, '0');
  return `${sign}${rupees.toString()}.${rest}` as `${number}`;
}
