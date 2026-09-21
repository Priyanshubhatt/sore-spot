import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { contrastRatio, luminance } from './contrast';
import { colors, radius, space, type } from './theme';

const HEX = /^#[0-9A-F]{6}$/;

describe('contrast helper', () => {
  it('measures black on white as 21 and a color against itself as 1', () => {
    expect(contrastRatio('#000000', '#FFFFFF')).toBeCloseTo(21, 5);
    expect(contrastRatio('#3BB4F2', '#3BB4F2')).toBeCloseTo(1, 5);
    expect(luminance('#000000')).toBe(0);
  });

  it('gets a mid-tone right, so wrong luminance weights or gamma would fail (#777777 on white is about 4.48)', () => {
    expect(contrastRatio('#777777', '#FFFFFF')).toBeCloseTo(4.48, 1);
    expect(contrastRatio('#FF0000', '#000000')).toBeCloseTo(5.25, 1);
  });

  it('is symmetric', () => {
    expect(contrastRatio('#123456', '#ABCDEF')).toBeCloseTo(contrastRatio('#ABCDEF', '#123456'), 10);
  });
});

describe('the app config', () => {
  it('paints the root and the web page in the theme background, so a dark app never flashes white', () => {
    const config = JSON.parse(readFileSync(join(__dirname, '..', 'app.json'), 'utf8')).expo;
    expect(config.userInterfaceStyle).toBe('dark');
    expect(config.backgroundColor).toBe(colors.bg);
    expect(config.web.backgroundColor).toBe(colors.bg);
  });
});

describe('theme tokens', () => {
  it('are all six-digit hex colors', () => {
    for (const [name, value] of Object.entries(colors)) expect(value, name).toMatch(HEX);
  });

  it('gives a dark theme: the background is darker than every surface, which is darker than the text', () => {
    expect(luminance(colors.bg)).toBeLessThan(luminance(colors.card));
    expect(luminance(colors.card)).toBeLessThan(luminance(colors.raised));
    expect(luminance(colors.raised)).toBeLessThan(luminance(colors.muted));
    expect(luminance(colors.muted)).toBeLessThan(luminance(colors.text));
  });

  it('keeps the spacing and radius scales increasing', () => {
    const scale = Object.values(space);
    expect([...scale].sort((a, b) => a - b)).toEqual(scale);
    expect(radius.sm).toBeLessThan(radius.md);
    expect(radius.md).toBeLessThan(radius.pill);
  });

  it('uses only tokens for the text colors in the type presets', () => {
    const allowed = new Set<string>([colors.text, colors.dim, colors.muted]);
    for (const [name, preset] of Object.entries(type)) expect(allowed.has(preset.color), name).toBe(true);
  });
});

describe('contrast of every pairing that carries text (WCAG AA, 4.5:1)', () => {
  const surfaces = [colors.bg, colors.card, colors.raised] as const;

  it('reads all three text colors on every surface', () => {
    for (const surface of surfaces) {
      for (const [name, fg] of [['text', colors.text], ['dim', colors.dim], ['muted', colors.muted]] as const) {
        expect(contrastRatio(fg, surface), `${name} on ${surface}`).toBeGreaterThanOrEqual(4.5);
      }
    }
  });

  it('reads the accent as text on every surface and dark text on the accent', () => {
    for (const surface of [...surfaces, colors.accentSoft]) {
      expect(contrastRatio(colors.accent, surface), `accent on ${surface}`).toBeGreaterThanOrEqual(4.5);
    }
    expect(contrastRatio(colors.onAccent, colors.accent)).toBeGreaterThanOrEqual(4.5);
  });

  it('reads the warning and banner text on the warning surface and on the page', () => {
    expect(contrastRatio(colors.warnText, colors.warnBg)).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio(colors.banner, colors.bg)).toBeGreaterThanOrEqual(4.5);
  });

  it('reads the text colours on the tinted surfaces they are drawn on', () => {
    expect(contrastRatio(colors.muted, colors.accentSoft)).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio(colors.dim, colors.accentFill)).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio(colors.text, colors.accentFill)).toBeGreaterThanOrEqual(4.5);
    for (const surface of [colors.card, colors.raised, colors.warnBg]) {
      expect(contrastRatio(colors.warnText, surface), `warn text on ${surface}`).toBeGreaterThanOrEqual(4.5);
    }
  });

  it('draws the day scrubber label on the accent and the chart fill legibly', () => {
    expect(contrastRatio(colors.onAccent, colors.accent)).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio(colors.accent, colors.accentFill)).toBeGreaterThanOrEqual(3);
  });
});

describe('contrast of the graphics (3:1 for controls, 1.5:1 to tell bands apart)', () => {
  it('lets the accent stand out on every surface', () => {
    for (const surface of [colors.bg, colors.card, colors.raised]) {
      expect(contrastRatio(colors.accent, surface)).toBeGreaterThanOrEqual(3);
    }
  });

  it('shows every soreness band against the body silhouette', () => {
    for (const band of [colors.low, colors.moderate, colors.high]) {
      expect(contrastRatio(band, colors.bodyFill)).toBeGreaterThanOrEqual(2.5);
    }
  });

  it('keeps the three bands apart by lightness, not just by hue, so they survive colour blindness', () => {
    expect(contrastRatio(colors.low, colors.moderate)).toBeGreaterThanOrEqual(1.5);
    expect(contrastRatio(colors.moderate, colors.high)).toBeGreaterThanOrEqual(1.5);
    expect(contrastRatio(colors.low, colors.high)).toBeGreaterThanOrEqual(1.5);
  });

  it('outlines the selected zone so it stands out from the body around it and from each band inside it', () => {
    // The outline sits between the zone and the dark body, so it must beat the body by a wide margin
    // and still be told apart from every band colour.
    expect(contrastRatio(colors.selectedOutline, colors.bodyFill)).toBeGreaterThanOrEqual(7);
    for (const band of [colors.low, colors.moderate, colors.high]) {
      expect(contrastRatio(colors.selectedOutline, band)).toBeGreaterThanOrEqual(1.5);
    }
  });
});
