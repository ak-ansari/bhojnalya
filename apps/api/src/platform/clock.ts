// Where the API reads the time, so token expiry and reset-code lifetimes can be
// tested at their boundaries (CLAUDE.md: the clock is injected).
export interface Clock {
  now(): Date;
}

export const CLOCK = Symbol('CLOCK');

export const systemClock: Clock = { now: () => new Date() };
