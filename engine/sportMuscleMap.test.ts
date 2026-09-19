import { describe, expect, it } from 'vitest';
import {
  SPORT_MUSCLE_MAP, STRENGTH_SPORTS, TAG_MUSCLES, normalizeSport,
} from './sportMuscleMap';

describe('normalizeSport', () => {
  it('matches spaced, underscored and hyphenated spellings', () => {
    expect(normalizeSport('Functional Fitness')).toBe('functional-fitness');
    expect(normalizeSport('functional_fitness')).toBe('functional-fitness');
    expect(normalizeSport(' Running ')).toBe('running');
  });
});

describe('sport-to-muscle map', () => {
  it('keeps every weight in (0, 1]', () => {
    const all = [
      ...Object.values(SPORT_MUSCLE_MAP).map((p) => p.muscles),
      ...Object.values(TAG_MUSCLES),
    ];
    for (const weights of all) {
      for (const w of Object.values(weights)) {
        expect(w).toBeGreaterThan(0);
        expect(w).toBeLessThanOrEqual(1);
      }
    }
  });

  it('never lists a strength sport as a mapped sport (they need a session_tag)', () => {
    for (const s of STRENGTH_SPORTS) expect(SPORT_MUSCLE_MAP[s]).toBeUndefined();
  });

  it('gives running and hiking a descent-scaled eccentric factor', () => {
    expect(SPORT_MUSCLE_MAP.running.scalesWithDescent).toBe(true);
    expect(SPORT_MUSCLE_MAP.hiking.scalesWithDescent).toBe(true);
    expect(SPORT_MUSCLE_MAP.cycling.scalesWithDescent).toBe(false);
  });
});
