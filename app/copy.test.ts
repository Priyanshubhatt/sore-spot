import { describe, expect, it } from 'vitest';
import { MUSCLES, type Driver, type RiskBand } from '../engine';
import {
  BAND_LABELS,
  CHECKIN_LABELS,
  CHECKIN_NOT_TODAY,
  CHECKIN_PROMPT,
  CHECKIN_SEVERE_ACK,
  COMFORT_HEADING,
  DISCLAIMER,
  DRIVER_TEXT,
  EVIDENCE_LABELS,
  EVIDENCE_NOTES,
  GENERIC_REASON_TEXT,
  MOVE_CUE,
  MUSCLE_LABELS,
  NOTHING_NEEDED_TEXT,
  NO_SORENESS_TEXT,
  ROM_HEADING,
  SAFETY_LINE,
  SAVE_STRETCHING_TEXT,
  STRETCH_HONESTY,
  SYNTHETIC_BANNER,
  TAG_HEADING,
  TAG_LABELS,
  TAG_PROMPT,
  bandPhrase,
  checkInFeedback,
  checkInMessage,
  needsTagNote,
  reasonsFor,
  unmappedNote,
  zoneA11yLabel,
} from './copy';

const BANDS: RiskBand[] = ['low', 'moderate', 'high'];

const NEW_STRINGS = [
  CHECKIN_PROMPT,
  CHECKIN_NOT_TODAY,
  CHECKIN_SEVERE_ACK,
  MOVE_CUE,
  ...Object.values(CHECKIN_LABELS),
  checkInMessage('quads', 1, 1.1),
  checkInMessage('quads', 1, 0.9),
  checkInMessage('quads', 1, 1),
  ...Object.values(EVIDENCE_LABELS),
  ...Object.values(EVIDENCE_NOTES),
  COMFORT_HEADING,
  ROM_HEADING,
  NOTHING_NEEDED_TEXT,
  SAVE_STRETCHING_TEXT,
  STRETCH_HONESTY,
  SAFETY_LINE,
  TAG_HEADING,
  TAG_PROMPT,
  ...Object.values(TAG_LABELS),
];
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

describe('check-in and evidence copy', () => {
  it('says what a check-in did, in words', () => {
    expect(checkInMessage('quads', 1, 1.1)).toBe('Noted. Predictions for quads will lean a little higher.');
    expect(checkInMessage('quads', 1, 0.9)).toBe('Noted. Predictions for quads will lean a little lower.');
    expect(checkInMessage('upperBack', 1, 1)).toBe('Noted. Predictions for upper back will stay about the same.');
  });

  it('acknowledges a severe check-in and points at the clinician line, without giving advice', () => {
    const severe = checkInFeedback('quads', 3, 1, 1);
    expect(severe).toContain(CHECKIN_SEVERE_ACK);
    expect(severe).toContain('Noted. Predictions for quads will stay about the same.');
    expect(CHECKIN_SEVERE_ACK).toMatch(/see a clinician/);
  });

  it('uses the plain message for every other check-in level', () => {
    for (const level of [0, 1, 2] as const) {
      expect(checkInFeedback('quads', level, 1, 0.9)).toBe(checkInMessage('quads', 1, 0.9));
    }
  });

  it('gives one short cue to ease off if a move hurts or pinches', () => {
    expect(MOVE_CUE).toBe('Ease off if a move hurts or pinches.');
  });

  it('never claims stretching reduces soreness', () => {
    expect(EVIDENCE_NOTES.ROM).toMatch(/not been shown to reduce soreness/);
    expect(STRETCH_HONESTY).toMatch(/hasn't been shown to reduce soreness/);
    expect(EVIDENCE_NOTES.COMFORT).not.toMatch(/soreness/i);
  });

  it('keeps a clinician safety line and only tags evidence for range of motion or comfort', () => {
    expect(SAFETY_LINE).toMatch(/Stop and see a clinician/);
    expect(Object.keys(EVIDENCE_LABELS).sort()).toEqual(['COMFORT', 'ROM']);
  });
});

describe('honesty rule', () => {
  it('never claims diagnosis, accuracy, validation, clinical benefit, prevention or cure', () => {
    const banned = /diagnos|accura|clinical|prevent|cure|validated|treat|boost|oxygen|blood flow/i;
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
      ...NEW_STRINGS,
      ...BANDS.map(bandPhrase),
      ...MUSCLES.flatMap((m) => BANDS.map((b) => zoneA11yLabel(m, b))),
    ];
    for (const s of strings) expect(s).not.toMatch(banned);
    for (const s of strings) {
      if (/(reduce|relieve) soreness/i.test(s)) expect(s).toMatch(/(not|n't) been shown/i);
    }
  });

  it('keeps the wellness disclaimer and the synthetic label', () => {
    expect(DISCLAIMER).toContain('not medical advice');
    expect(DISCLAIMER).toContain('not measured');
    expect(SYNTHETIC_BANNER).toBe('SYNTHETIC DATA');
  });
});
