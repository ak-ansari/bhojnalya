// Device codes (TRD §7): the {DD} of an invoice number, two base36 characters,
// issued in order and never reused within an outlet. "00" is skipped so the
// first till reads as 01, which leaves 1,295 codes per outlet.
const BASE36 = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';

export const DEVICE_CODES_PER_OUTLET = BASE36.length * BASE36.length - 1;

// The first code not yet taken in the outlet, or null when all are taken.
// Retired and revoked devices keep their rows, so their codes stay taken.
export function nextDeviceCode(taken: Iterable<string>): string | null {
  const used = new Set(taken);
  for (let n = 1; n <= DEVICE_CODES_PER_OUTLET; n += 1) {
    const code = codeAt(n);
    if (!used.has(code)) return code;
  }
  return null;
}

function codeAt(n: number): string {
  return `${BASE36.charAt(Math.floor(n / BASE36.length))}${BASE36.charAt(n % BASE36.length)}`;
}
