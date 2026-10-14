// Branding reaches the page only as CSS variables (TRD §10), so no component knows the colour.
import type { CSSProperties } from 'react';

import type { Branding } from './menu.js';

export const HOUSE_BRAND_COLOR = '#6B3A1F';

const HEX_COLOR = /^#[0-9a-fA-F]{6}$/;

/** The CSS variables a menu root sets; an unusable colour falls back to the house colour. */
export function brandingStyle(branding: Branding): CSSProperties {
  const brand = HEX_COLOR.test(branding.primaryColor) ? branding.primaryColor : HOUSE_BRAND_COLOR;
  return { '--brand': brand } as CSSProperties;
}
