import { describe, expect, it } from 'vitest';
import { MUSCLES, type DayForecast, type RiskBand } from '../../engine';
import { colors } from '../theme';
import { BAND_COLORS, BAND_ORDER, bandColor, dominantBand } from './colors';

const dayOf = (overrides: Partial<Record<(typeof MUSCLES)[number], RiskBand>>): DayForecast =>
  Object.fromEntries(MUSCLES.map((m) => [m, { band: overrides[m] ?? 'low', drivers: [] }])) as unknown as DayForecast;

describe('band colors', () => {
  it('orders bands low, moderate, high', () => {
    expect(BAND_ORDER).toEqual(['low', 'moderate', 'high']);
  });

  it('gives every band its own hex color', () => {
    const shown = BAND_ORDER.map(bandColor);
    for (const c of shown) expect(c).toMatch(/^#[0-9A-F]{6}$/);
    expect(new Set(shown).size).toBe(3);
    expect(bandColor('high')).toBe(BAND_COLORS.high);
  });

  it('takes the colors from the theme, so contrast is checked in one place', () => {
    expect(BAND_COLORS).toEqual({ low: colors.low, moderate: colors.moderate, high: colors.high });
  });
});

describe('dominantBand', () => {
  it('is low when every muscle is low', () => {
    expect(dominantBand(dayOf({}))).toBe('low');
  });

  it('picks the worst band across all muscles by default', () => {
    expect(dominantBand(dayOf({ quads: 'moderate' }))).toBe('moderate');
    expect(dominantBand(dayOf({ quads: 'moderate', calves: 'high' }))).toBe('high');
  });

  it('restricts to the given muscles when a list is passed', () => {
    const day = dayOf({ glutes: 'high' });
    expect(dominantBand(day)).toBe('high');
    expect(dominantBand(day, ['quads', 'chest'])).toBe('low'); // glutes excluded
  });
});
