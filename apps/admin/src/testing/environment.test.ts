import { describe, expect, it } from 'vitest';

describe('admin test environment', () => {
  it('runs its tests in UTC whatever the machine timezone is', () => {
    expect(new Date(0).getTimezoneOffset()).toBe(0);
    expect(Intl.DateTimeFormat().resolvedOptions().timeZone).toBe('UTC');
  });
});
