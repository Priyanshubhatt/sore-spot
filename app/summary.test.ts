import { describe, expect, it } from 'vitest';
import { syntheticReplay } from '../data/replay.synthetic';
import { MUSCLES, type DayForecast, type RiskBand } from '../engine';
import { DEMO_AS_OF } from './config';
import { buildForecastState } from './forecastState';
import { SUMMARY_CAPTION, summarize, summaryLabel } from './summary';

const day = (bands: Partial<Record<string, RiskBand>>): DayForecast =>
  Object.fromEntries(MUSCLES.map((m) => [m, { band: bands[m] ?? 'low', drivers: [] }])) as unknown as DayForecast;

describe('summarize', () => {
  it('sorts the muscles into their bands in engine order, and every muscle lands in exactly one', () => {
    const s = summarize(day({ quads: 'high', glutes: 'high', calves: 'moderate' }));
    expect(s.high).toEqual(MUSCLES.filter((m) => m === 'glutes' || m === 'quads'));
    expect(s.moderate).toEqual(['calves']);
    expect(s.high.length + s.moderate.length + s.low.length).toBe(MUSCLES.length);
    expect(new Set([...s.high, ...s.moderate, ...s.low]).size).toBe(MUSCLES.length);
  });

  it('counts the demo week: four High now, an extra Moderate tomorrow, all quiet by +6d', () => {
    const state = buildForecastState(syntheticReplay.workouts, {}, {}, DEMO_AS_OF);
    const counts = (d: number) => {
      const s = summarize(state.forecast.byDay[d]);
      return [s.high.length, s.moderate.length, s.low.length];
    };
    expect(counts(0)).toEqual([4, 0, 8]);
    expect(counts(1)).toEqual([4, 1, 7]);
    expect(counts(4)).toEqual([1, 4, 7]);
    expect(counts(6)).toEqual([0, 0, 12]);
  });

  it('does not change the forecast it was given', () => {
    const d = day({ quads: 'high' });
    const before = JSON.stringify(d);
    summarize(d);
    expect(JSON.stringify(d)).toBe(before);
  });
});

describe('summaryLabel', () => {
  it('reads each count with its band name and pluralizes correctly', () => {
    expect(summaryLabel(summarize(day({ quads: 'high', glutes: 'high', calves: 'moderate' })), 'Now')).toBe(
      'Predicted soreness, Now: 2 muscles High, 1 muscle Moderate, 9 muscles Low.',
    );
    expect(summaryLabel(summarize(day({})), '+6d (Fri)')).toBe(
      'Predicted soreness, +6d (Fri): 0 muscles High, 0 muscles Moderate, 12 muscles Low.',
    );
    expect(SUMMARY_CAPTION).toBe('Predicted soreness');
  });
});
