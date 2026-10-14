import { describe, expect, it } from 'vitest';

import { HOUSE_BRAND_COLOR, brandingStyle } from './branding.js';

describe('brandingStyle', () => {
  it("sets the outlet's colour as the --brand CSS variable", () => {
    expect(brandingStyle({ primaryColor: '#1D4ED8', logoText: 'X' })).toEqual({
      '--brand': '#1D4ED8',
    });
  });

  it.each(['', 'red', '#123', '#12345G', '#1D4ED8;background:url(x)'])(
    'falls back to the house colour for %j',
    (primaryColor) => {
      expect(brandingStyle({ primaryColor, logoText: 'X' })).toEqual({
        '--brand': HOUSE_BRAND_COLOR,
      });
    },
  );
});
