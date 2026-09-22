import { describe, expect, it } from 'vitest';
import { timecurve } from '../engine';
import { NOVELTY_CAP, NOVELTY_WINDOW_DAYS } from '../engine/constants';
import { RECOVERY_LOW_MAX, RECOVERY_MEDIUM_MAX } from '../engine/recovery';
import {
  CURVE_END_HOURS,
  CURVE_STEP_HOURS,
  areaPath,
  curveSeries,
  dayTicks,
  linePath,
  peakOf,
  xOf,
  yOf,
  type ChartBox,
} from './evidence';
import {
  LABEL_LINES,
  LIMITS,
  TEXT_CARDS,
} from './evidenceCopy';

const box: ChartBox = { width: 300, height: 160, left: 30, right: 10, top: 10, bottom: 24 };

describe('the soreness curve series', () => {
  it('is the engine curve itself, sampled every 6 hours from 0 to 8 days', () => {
    const series = curveSeries();
    expect(series[0]).toEqual({ hours: 0, level: 0 });
    expect(series[series.length - 1].hours).toBe(CURVE_END_HOURS);
    expect(CURVE_END_HOURS).toBe(192);
    expect(series).toHaveLength(CURVE_END_HOURS / CURVE_STEP_HOURS + 1);
    for (const p of series) expect(p.level).toBe(timecurve(p.hours));
  });

  it('builds, peaks at 48 hours and is gone by the end', () => {
    const series = curveSeries();
    expect(peakOf(series)).toEqual({ hours: 48, level: 1 });
    expect(series[series.length - 1].level).toBe(0);
    expect(series.find((p) => p.hours === 24)!.level).toBeGreaterThan(series.find((p) => p.hours === 6)!.level);
  });

  it('shows 0 to 8 days on the axis', () => {
    expect(dayTicks()).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8]);
  });
});

describe('chart geometry', () => {
  it('maps hours and levels into the padded box, with level 1 at the top and 0 on the axis', () => {
    expect(xOf(0, box)).toBe(30);
    expect(xOf(CURVE_END_HOURS, box)).toBe(290);
    expect(yOf(0, box)).toBe(136);
    expect(yOf(1, box)).toBe(10);
  });

  it('draws one point per sample, starting on the axis', () => {
    const series = curveSeries();
    const path = linePath(series, box);
    expect(path.startsWith('M 30.0 136.0')).toBe(true);
    expect(path.match(/[ML]/g)).toHaveLength(series.length);
  });

  it('closes the fill down to the axis', () => {
    const path = areaPath(curveSeries(), box);
    expect(path.endsWith('Z')).toBe(true);
    expect(path).toContain('L 290.0 136.0 L 30.0 136.0 Z');
  });
});

describe('evidence copy', () => {
  it('has unique, non-empty text cards', () => {
    expect(new Set(TEXT_CARDS.map((c) => c.id)).size).toBe(TEXT_CARDS.length);
    for (const c of TEXT_CARDS) {
      expect(c.heading.trim().length, c.id).toBeGreaterThan(0);
      expect(c.body.trim().length, c.id).toBeGreaterThan(0);
    }
  });

  it('states the novelty numbers from the engine, so they cannot drift', () => {
    const novelty = TEXT_CARDS.find((c) => c.id === 'novelty')!;
    expect(novelty.body).toContain(`last ${NOVELTY_WINDOW_DAYS} days`);
    expect(novelty.body).toContain(`up to ${NOVELTY_CAP} times as much`);
  });

  it('never says stretching reduces or relieves soreness, and says it does not', () => {
    const stretching = TEXT_CARDS.find((c) => c.id === 'stretching')!;
    expect(stretching.heading).toMatch(/not a soreness fix/i);
    expect(stretching.body).toMatch(/no meaningful effect of stretching on soreness/);
    expect(stretching.body).toMatch(/hasn't been shown to reduce soreness/);
    for (const c of TEXT_CARDS) expect(c.body, c.id).not.toMatch(/(stretch\w*) (reduces|relieves|cures|eases) soreness/i);
  });

  it('labels comfort ideas from the same lines the move list uses', () => {
    expect(LABEL_LINES).toHaveLength(2);
    expect(LABEL_LINES[0]).toMatch(/^Range of motion: .*not been shown to reduce soreness/);
    expect(LABEL_LINES[1]).toMatch(/^Comfort: .*Evidence is mixed/);
  });

  it('lists every limit the pitch has to own up to', () => {
    const all = LIMITS.join(' ');
    expect(all).toMatch(/not been checked against real soreness logs/);
    expect(all).toMatch(/set by hand/);
    expect(all).toMatch(/SYNTHETIC DATA/);
    expect(all).toMatch(/trainer or physical therapist/);
    expect(all).toMatch(/not affiliated with, endorsed by, or sponsored by WHOOP/);
    expect(all).toMatch(/not medical advice/);
    // The recovery cutoffs are no longer a listed limit: they match WHOOP's own published zones exactly
    // (developer.whoop.com/docs/whoop-101, checked 2026-09-22), so this is not a gap to own up to any more.
    expect(all).not.toMatch(/recovery cutoffs/);
  });

  it('matches WHOOP\'s own published recovery zones exactly', () => {
    expect(RECOVERY_LOW_MAX).toBe(33);
    expect(RECOVERY_MEDIUM_MAX).toBe(66);
  });

  it('names the two primary papers the stretching claim rests on', () => {
    const stretching = TEXT_CARDS.find((c) => c.id === 'stretching')!;
    expect(stretching.body).toMatch(/Herbert and colleagues, 2011/);
    expect(stretching.body).toMatch(/Dupuy and colleagues, 2018/);
  });
});
