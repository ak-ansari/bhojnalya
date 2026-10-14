import { describe, expect, it } from 'vitest';

import * as ui from './index.js';

describe('@bhojnalya/ui', () => {
  it('exports the shared primitives the three apps adopt', () => {
    expect(Object.keys(ui).sort()).toEqual(
      ['Banner', 'Button', 'buttonVariants', 'cn', 'formatINR'].sort(),
    );
  });

  it('runs its tests in UTC whatever the machine timezone is', () => {
    expect(new Date(0).getTimezoneOffset()).toBe(0);
    expect(Intl.DateTimeFormat().resolvedOptions().timeZone).toBe('UTC');
  });
});
