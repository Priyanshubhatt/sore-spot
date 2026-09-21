import { describe, expect, it } from 'vitest';
import { syntheticReplay } from '../data/replay.synthetic';
import { parseReplay } from './replay';

describe('the export time (asOf) in a replay file', () => {
  it('is kept when it is a valid date, and absent when the file has none', () => {
    expect(parseReplay({ ...syntheticReplay, asOf: '2026-09-22T08:00:00.000Z' }).asOf).toBe('2026-09-22T08:00:00.000Z');
    expect('asOf' in parseReplay(syntheticReplay)).toBe(false);
  });

  it('is rejected when it is not a date string', () => {
    for (const bad of ['yesterday', '', 123, null, {}]) {
      expect(() => parseReplay({ ...syntheticReplay, asOf: bad }), String(bad)).toThrow(/asOf/);
    }
  });

  it('does not disturb the recovery or the workouts', () => {
    const r = parseReplay({ ...syntheticReplay, asOf: '2026-09-22T08:00:00.000Z' });
    expect(r.workouts).toHaveLength(syntheticReplay.workouts.length);
    expect(r.recovery).toHaveLength((syntheticReplay.recovery ?? []).length);
  });
});
