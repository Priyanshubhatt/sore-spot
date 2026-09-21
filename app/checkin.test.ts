import { describe, expect, it } from 'vitest';
import { MUSCLES, applyCheckIn, defaultSensitivity, type DayForecast, type RiskBand } from '../engine';
import { CHECKIN_LEVELS, effectiveBand, sensitivityFromCheckIns } from './checkin';

/** A forecast day where every muscle is in the same band. */
const dayOf = (band: RiskBand): DayForecast =>
  Object.fromEntries(MUSCLES.map((m) => [m, { band, drivers: [] }])) as unknown as DayForecast;

describe('CHECKIN_LEVELS', () => {
  it('offers none, mild, moderate and severe as 0 to 3', () => {
    expect(CHECKIN_LEVELS).toEqual([0, 1, 2, 3]);
  });
});

describe('sensitivityFromCheckIns', () => {
  it('is the default sensitivity when there are no check-ins', () => {
    expect(sensitivityFromCheckIns({}, dayOf('low'))).toEqual(defaultSensitivity());
  });

  it('matches applyCheckIn for one muscle and leaves the others alone', () => {
    const s = sensitivityFromCheckIns({ quads: 3 }, dayOf('low'));
    expect(s).toEqual(applyCheckIn(defaultSensitivity(), 'quads', 'low', 3));
    expect(s.quads).toBe(1.1);
    expect(s.glutes).toBe(1);
  });

  it('lowers sensitivity when the report is below the prediction', () => {
    expect(sensitivityFromCheckIns({ quads: 0 }, dayOf('high')).quads).toBe(0.9);
  });

  it('uses each muscle its own predicted band', () => {
    const day: DayForecast = { ...dayOf('low'), calves: { band: 'high', drivers: [] } };
    const s = sensitivityFromCheckIns({ quads: 3, calves: 3 }, day);
    expect(s.quads).toBe(1.1); // reported above a low prediction
    expect(s.calves).toBe(1); // severe matches a high prediction, so no change
  });

  it('never stacks: the same check-ins always give the same sensitivity', () => {
    const a = sensitivityFromCheckIns({ quads: 3, calves: 0 }, dayOf('moderate'));
    const b = sensitivityFromCheckIns({ quads: 3, calves: 0 }, dayOf('moderate'));
    expect(a).toEqual(b);
    expect(a.quads).toBe(1.1);
    expect(a.calves).toBe(0.9);
  });

  it('skips muscles whose entry is undefined', () => {
    expect(sensitivityFromCheckIns({ quads: undefined }, dayOf('low'))).toEqual(defaultSensitivity());
  });
});

describe('effectiveBand', () => {
  it('keeps the predicted band when there is no check-in or a light one', () => {
    expect(effectiveBand('low')).toBe('low');
    expect(effectiveBand('low', 0)).toBe('low');
    expect(effectiveBand('low', 1)).toBe('low');
    expect(effectiveBand('high', 0)).toBe('high');
  });

  it('counts a severe check-in as High', () => {
    expect(effectiveBand('low', 3)).toBe('high');
    expect(effectiveBand('moderate', 3)).toBe('high');
  });

  it('raises a moderate check-in to at least Moderate, never lowering the prediction', () => {
    expect(effectiveBand('low', 2)).toBe('moderate');
    expect(effectiveBand('moderate', 2)).toBe('moderate');
    expect(effectiveBand('high', 2)).toBe('high');
  });
});
