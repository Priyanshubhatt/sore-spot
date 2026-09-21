import { describe, expect, it } from 'vitest';
import { DEMO_AS_OF, replayAsOf } from './config';

describe('replayAsOf', () => {
  it('uses the fixed demo time for the synthetic week, which carries no export time', () => {
    expect(replayAsOf({})).toBe(DEMO_AS_OF);
    expect(DEMO_AS_OF.toISOString()).toBe('2026-09-19T20:00:00.000Z');
  });

  it('uses the moment a real export was made as "now"', () => {
    const asOf = replayAsOf({ asOf: '2026-09-22T08:00:00.000Z' });
    expect(asOf.toISOString()).toBe('2026-09-22T08:00:00.000Z');
    expect(asOf).not.toBe(DEMO_AS_OF);
  });
});
