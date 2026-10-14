import { describe, expect, it } from 'vitest';

import { workspace } from './index.js';

describe('@bhojnalya/api scaffold', () => {
  it('exports its workspace name', () => {
    expect(workspace).toBe('@bhojnalya/api');
  });

  it('runs its tests in UTC whatever the machine timezone is', () => {
    expect(new Date(0).getTimezoneOffset()).toBe(0);
    expect(Intl.DateTimeFormat().resolvedOptions().timeZone).toBe('UTC');
  });
});
