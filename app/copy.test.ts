import { describe, expect, it } from 'vitest';
import { MUSCLES, type Driver, type RiskBand } from '../engine';
import {
  BAND_LABELS,
  DISCLAIMER,
  DRIVER_TEXT,
  GENERIC_REASON_TEXT,
  MUSCLE_LABELS,
  NO_SORENESS_TEXT,
  SYNTHETIC_BANNER,
  bandPhrase,
  needsTagNote,
  reasonsFor,
  unmappedNote,
  zoneA11yLabel,
} from './copy';

const BANDS: RiskBand[] = ['low', 'moderate', 'high'];
const DRIVERS: Driver[] = ['novel', 'eccentric', 'high-load'];

describe('copy coverage', () => {
  it('labels every muscle, band and driver', () => {
    for (const m of MUSCLES) expect(MUSCLE_LABELS[m].length, m).toBeGreaterThan(0);
    for (const b of BANDS) expect(BAND_LABELS[b].length, b).toBeGreaterThan(0);
    for (const d of DRIVERS) expect(DRIVER_TEXT[d].length, d).toBeGreaterThan(0);
  });
});

describe('reasonsFor', () => {
  it('says no notable soreness for a low band', () => {
    expect(reasonsFor({ band: 'low', drivers: [] })).toEqual([NO_SORENESS_TEXT]);
  });

  it('lists each driver, in order, for a raised band', () => {
    expect(reasonsFor({ band: 'high', drivers: ['novel', 'eccentric'] })).toEqual([
      DRIVER_TEXT.novel,
      DRIVER_TEXT.eccentric,
    ]);
  });

  it('falls back to a generic reason when a raised band has no drivers', () => {
    expect(reasonsFor({ band: 'moderate', drivers: [] })).toEqual([GENERIC_REASON_TEXT]);
  });
});

describe('phrases', () => {
  it('words the band and the zone label as predicted soreness', () => {
    expect(bandPhrase('moderate')).toBe('Moderate predicted soreness');
    expect(zoneA11yLabel('quads', 'high')).toBe('Quads, high predicted soreness');
  });

  it('handles singular and plural strength-session notes', () => {
    expect(needsTagNote(1)).toBe('1 strength session has no muscle tag, so it is not counted.');
    expect(needsTagNote(3)).toBe('3 strength sessions have no muscle tag, so they are not counted.');
  });

  it('names sports the engine cannot map, singular and plural', () => {
    expect(unmappedNote(['curling'])).toBe(
      '1 sport is not mapped to muscles yet, so it is not counted: curling.',
    );
    expect(unmappedNote(['curling', 'darts'])).toBe(
      '2 sports are not mapped to muscles yet, so they are not counted: curling, darts.',
    );
  });
});

describe('honesty rule', () => {
  it('never claims diagnosis, accuracy, validation, clinical benefit, prevention or cure', () => {
    const banned = /diagnos|accura|clinical|prevent|cure|validated|treat/i;
    const strings = [
      ...Object.values(MUSCLE_LABELS),
      ...Object.values(BAND_LABELS),
      ...Object.values(DRIVER_TEXT),
      NO_SORENESS_TEXT,
      GENERIC_REASON_TEXT,
      DISCLAIMER,
      SYNTHETIC_BANNER,
      needsTagNote(1),
      needsTagNote(2),
      unmappedNote(['curling']),
      unmappedNote(['curling', 'darts']),
      ...BANDS.map(bandPhrase),
      ...MUSCLES.flatMap((m) => BANDS.map((b) => zoneA11yLabel(m, b))),
    ];
    for (const s of strings) expect(s).not.toMatch(banned);
  });

  it('keeps the wellness disclaimer and the synthetic label', () => {
    expect(DISCLAIMER).toContain('not medical advice');
    expect(DISCLAIMER).toContain('not measured');
    expect(SYNTHETIC_BANNER).toBe('SYNTHETIC DATA');
  });
});
