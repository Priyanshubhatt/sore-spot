import { describe, expect, it } from 'vitest';
import { syntheticReplay } from '../data/replay.synthetic';
import { parseReplay } from './replay';
import { defaultSensitivity } from './sensitivity';
import { computeForecast } from './soreness';

describe('synthetic replay', () => {
  it('is labeled synthetic and passes the same validation as a real export', () => {
    expect(syntheticReplay.synthetic).toBe(true);
    const parsed = parseReplay(JSON.parse(JSON.stringify(syntheticReplay)));
    expect(parsed.synthetic).toBe(true);
    expect(parsed.workouts.length).toBeGreaterThan(10);
  });

  it('covers the demo week: easy runs, a hilly run, a tagged strength day, a soccer match', () => {
    const ids = syntheticReplay.workouts.map((w) => w.id);
    expect(ids).toEqual(expect.arrayContaining(['d-mon-run', 'd-tue-legs', 'd-fri-hilly-run', 'd-sat-soccer']));
    expect(syntheticReplay.workouts.find((w) => w.id === 'd-tue-legs')?.session_tag).toBe('lower');
  });

  it('has one untagged strength session on Wed Sep 16, which the engine reports instead of guessing', () => {
    const wed = syntheticReplay.workouts.find((w) => w.id === 'd-wed-strength');
    expect(wed?.sport_name).toBe('weightlifting');
    expect(wed?.session_tag).toBeUndefined();
    const forecast = computeForecast(syntheticReplay.workouts, new Date('2026-09-19T20:00:00Z'), defaultSensitivity());
    expect(forecast.needsTag).toEqual(['d-wed-strength']);
  });

  it('has no workout on the one rest day, Sun Sep 20', () => {
    const days = syntheticReplay.workouts.map((w) => w.start.slice(0, 10));
    expect(days).not.toContain('2026-09-20');
  });
});
