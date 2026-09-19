import { describe, expect, it } from 'vitest';
import { workout } from '../data/scenarios/builders';
import { parseReplay } from './replay';

const good = workout({
  id: 'w1', sport: 'running', start: '2026-09-10T07:00:00Z', zoneMinutes: [0, 10, 40, 10, 0, 0],
});

describe('parseReplay', () => {
  it('accepts builder workouts and ignores extra top-level keys', () => {
    const parsed = parseReplay({ synthetic: false, workouts: [good], recovery: [{}] });
    expect(parsed.synthetic).toBe(false);
    expect(parsed.workouts).toHaveLength(1);
  });

  it('accepts a JSON round trip of a builder workout', () => {
    const parsed = parseReplay(JSON.parse(JSON.stringify({ synthetic: true, workouts: [good] })));
    expect(parsed.workouts[0].id).toBe('w1');
  });

  it('rejects a file without a boolean synthetic flag', () => {
    expect(() => parseReplay({ workouts: [] })).toThrow(/synthetic/);
  });

  it('rejects a file whose workouts is not an array', () => {
    expect(() => parseReplay({ synthetic: true, workouts: {} })).toThrow(/workouts/);
  });

  it('rejects a workout with a bad date, naming the workout', () => {
    const bad = { ...good, start: 'not a date' };
    expect(() => parseReplay({ synthetic: true, workouts: [bad] })).toThrow(/w1.*start/);
  });

  it('rejects a SCORED workout with missing zone durations', () => {
    const bad = { ...good, score: { strain: 1 } };
    expect(() => parseReplay({ synthetic: true, workouts: [bad] })).toThrow(/zone_durations/);
  });

  it('rejects an unknown session_tag', () => {
    const bad = { ...good, session_tag: 'legs' };
    expect(() => parseReplay({ synthetic: true, workouts: [bad] })).toThrow(/session_tag/);
  });

  it('accepts an unscored workout without a score', () => {
    const pending = { ...good, score_state: 'PENDING_SCORE', score: undefined };
    expect(parseReplay({ synthetic: true, workouts: [pending] }).workouts).toHaveLength(1);
  });
});
