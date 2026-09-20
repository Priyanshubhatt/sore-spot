import { describe, expect, it } from 'vitest';
import { syntheticReplay } from '../data/replay.synthetic';
import { workout } from '../data/scenarios/builders';
import { parseReplay } from './replay';

const good = workout({
  id: 'w1',
  sport: 'running',
  start: '2026-09-10T07:00:00Z',
  zoneMinutes: [0, 10, 40, 10, 0, 0],
});

const recovery = {
  cycle_id: 1,
  sleep_id: 'sleep',
  user_id: 0,
  created_at: '2026-09-19T06:00:00Z',
  updated_at: '2026-09-19T06:00:00Z',
  score_state: 'SCORED',
  score: { user_calibrating: false, recovery_score: 47, resting_heart_rate: 55, hrv_rmssd_milli: 50 },
};

const parse = (r: unknown) => parseReplay({ synthetic: true, workouts: [good], recovery: r });

describe('parseReplay with recovery', () => {
  it('accepts the synthetic replay, recovery included, after a JSON round trip', () => {
    const parsed = parseReplay(JSON.parse(JSON.stringify(syntheticReplay)));
    expect(parsed.recovery).toHaveLength(6);
  });

  it('still accepts a replay with no recovery at all', () => {
    const parsed = parseReplay({ synthetic: true, workouts: [good] });
    expect(parsed.recovery).toBeUndefined();
  });

  it('accepts an unscored recovery without a score', () => {
    const parsed = parse([{ ...recovery, score_state: 'PENDING_SCORE', score: undefined }]);
    expect(parsed.recovery).toHaveLength(1);
  });

  it('rejects a recovery list that is not an array', () => {
    expect(() => parse({})).toThrow(/recovery/);
  });

  it('rejects a bad created_at, naming the cycle', () => {
    expect(() => parse([{ ...recovery, created_at: 'yesterday' }])).toThrow(/cycle 1.*created_at/);
  });

  it('rejects an unknown score_state', () => {
    expect(() => parse([{ ...recovery, score_state: 'scored' }])).toThrow(/score_state/);
  });

  it('rejects a scored recovery whose score is missing or outside 0 to 100', () => {
    expect(() => parse([{ ...recovery, score: {} }])).toThrow(/recovery_score/);
    expect(() => parse([{ ...recovery, score: { ...recovery.score, recovery_score: 101 } }])).toThrow(/between 0 and 100/);
    expect(() => parse([{ ...recovery, score: { ...recovery.score, recovery_score: -1 } }])).toThrow(/between 0 and 100/);
  });
});
