import { describe, expect, it } from 'vitest';
import { syntheticReplay } from '../data/replay.synthetic';
import { recentRecoveryLevels, recoveryLevel, shouldDeload, type RecoveryLevel } from './recovery';
import type { Recovery } from './types';

const rec = (
  created: string,
  score: number,
  state: Recovery['score_state'] = 'SCORED',
): Recovery => ({
  cycle_id: 1,
  sleep_id: 'sleep',
  user_id: 0,
  created_at: created,
  updated_at: created,
  score_state: state,
  score:
    state === 'SCORED'
      ? { user_calibrating: false, recovery_score: score, resting_heart_rate: 55, hrv_rmssd_milli: 50 }
      : undefined,
});

describe('recoveryLevel', () => {
  it('splits scores at 33/34 and 66/67', () => {
    expect(recoveryLevel(0)).toBe('low');
    expect(recoveryLevel(33)).toBe('low');
    expect(recoveryLevel(34)).toBe('medium');
    expect(recoveryLevel(66)).toBe('medium');
    expect(recoveryLevel(67)).toBe('high');
    expect(recoveryLevel(100)).toBe('high');
  });
});

describe('recentRecoveryLevels', () => {
  const asOf = new Date('2026-09-19T20:00:00Z');

  it('returns the levels of scored recoveries up to asOf, oldest first', () => {
    const levels = recentRecoveryLevels(
      [rec('2026-09-18T06:00:00Z', 20), rec('2026-09-16T06:00:00Z', 90), rec('2026-09-17T06:00:00Z', 50)],
      asOf,
    );
    expect(levels).toEqual(['high', 'medium', 'low']);
  });

  it('ignores unscored records and anything created after asOf', () => {
    const levels = recentRecoveryLevels(
      [
        rec('2026-09-18T06:00:00Z', 0, 'PENDING_SCORE'),
        rec('2026-09-19T06:00:00Z', 40),
        rec('2026-09-20T06:00:00Z', 10),
      ],
      asOf,
    );
    expect(levels).toEqual(['medium']);
  });

  it('keeps only the most recent records when there are more than the window', () => {
    // Sep 1 to Sep 10: the first five are low, the last five are high.
    const many = Array.from({ length: 10 }, (_, i) =>
      rec(`2026-09-${String(i + 1).padStart(2, '0')}T06:00:00Z`, i < 5 ? 10 : 90),
    );
    const levels = recentRecoveryLevels(many, asOf, 3);
    expect(levels).toHaveLength(3);
    expect(levels.every((l) => l === 'high')).toBe(true);
  });

  it('returns nothing when asked for no records', () => {
    expect(recentRecoveryLevels([rec('2026-09-18T06:00:00Z', 20)], asOf, 0)).toEqual([]);
  });

  it('does not mutate its input', () => {
    const input = [rec('2026-09-18T06:00:00Z', 20), rec('2026-09-16T06:00:00Z', 90)];
    const before = JSON.stringify(input);
    recentRecoveryLevels(input, asOf);
    expect(JSON.stringify(input)).toBe(before);
  });
});

describe('shouldDeload', () => {
  const levels = (...l: RecoveryLevel[]) => l;

  it('triggers at three low recoveries and not at two', () => {
    expect(shouldDeload(levels('low', 'low', 'high', 'medium'))).toBe(false);
    expect(shouldDeload(levels('low', 'low', 'high', 'low'))).toBe(true);
  });

  it('is false with no data', () => {
    expect(shouldDeload([])).toBe(false);
  });
});

describe('synthetic demo recovery', () => {
  it('has one scored recovery per morning, Mon Sep 14 to Sat Sep 19, ending medium', () => {
    const recovery = syntheticReplay.recovery ?? [];
    expect(recovery).toHaveLength(6);
    const levels = recentRecoveryLevels(recovery, new Date('2026-09-19T20:00:00Z'));
    expect(levels).toEqual(['high', 'high', 'medium', 'medium', 'low', 'medium']);
    expect(shouldDeload(levels)).toBe(false);
  });
});
