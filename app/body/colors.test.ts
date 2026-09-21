import { describe, expect, it } from 'vitest';
import { colors } from '../theme';
import { BAND_COLORS, BAND_ORDER, bandColor } from './colors';

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
