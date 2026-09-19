import { describe, expect, it } from 'vitest';
import { applyCheckIn, defaultSensitivity } from './sensitivity';
import { MUSCLES } from './types';

describe('defaultSensitivity', () => {
  it('is 1.0 for every muscle', () => {
    const s = defaultSensitivity();
    expect(Object.keys(s).sort()).toEqual([...MUSCLES].sort());
    expect(Object.values(s).every((v) => v === 1)).toBe(true);
  });
});

describe('applyCheckIn', () => {
  it('raises sensitivity when the user reports more than predicted', () => {
    expect(applyCheckIn(defaultSensitivity(), 'quads', 'low', 3).quads).toBe(1.1);
  });

  it('lowers sensitivity when the user reports less than predicted', () => {
    expect(applyCheckIn(defaultSensitivity(), 'quads', 'high', 0).quads).toBe(0.9);
  });

  it('leaves sensitivity alone when report roughly matches the prediction', () => {
    expect(applyCheckIn(defaultSensitivity(), 'quads', 'moderate', 2).quads).toBe(1);
  });

  it('stays within 0.5 to 1.5', () => {
    let up = defaultSensitivity();
    let down = defaultSensitivity();
    for (let i = 0; i < 20; i++) {
      up = applyCheckIn(up, 'calves', 'low', 3);
      down = applyCheckIn(down, 'calves', 'high', 0);
    }
    expect(up.calves).toBe(1.5);
    expect(down.calves).toBe(0.5);
  });

  it('returns a new object and changes only the checked muscle', () => {
    const before = defaultSensitivity();
    const after = applyCheckIn(before, 'quads', 'low', 3);
    expect(after).not.toBe(before);
    expect(before.quads).toBe(1);
    expect(after.glutes).toBe(1);
  });
});
