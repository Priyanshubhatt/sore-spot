import { describe, expect, it } from 'vitest';
import { BAND_COLORS, BAND_ORDER, bandColor } from './colors';

/** WCAG relative luminance of a #RRGGBB color. */
function luminance(hex: string): number {
  const [r, g, b] = [1, 3, 5]
    .map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
    .map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

describe('band colors', () => {
  it('orders bands low, moderate, high', () => {
    expect(BAND_ORDER).toEqual(['low', 'moderate', 'high']);
  });

  it('gives every band its own hex color', () => {
    const colors = BAND_ORDER.map(bandColor);
    for (const c of colors) expect(c).toMatch(/^#[0-9A-F]{6}$/);
    expect(new Set(colors).size).toBe(3);
    expect(bandColor('high')).toBe(BAND_COLORS.high);
  });

  it('gets darker as the band rises, so the map reads without a legend', () => {
    const [low, moderate, high] = BAND_ORDER.map((b) => luminance(bandColor(b)));
    expect(low).toBeGreaterThan(moderate);
    expect(moderate).toBeGreaterThan(high);
  });

  it('keeps the low band clearly lighter than the high band', () => {
    expect(luminance(bandColor('low')) / luminance(bandColor('high'))).toBeGreaterThan(4);
  });
});
