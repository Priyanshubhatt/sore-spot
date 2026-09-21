import { describe, expect, it } from 'vitest';
import { workout } from '../data/scenarios/builders';
import {
  downhillRun, firstSoccer, flatRun, legDayOne, legDaysBackToBack, regularSoccer,
  unknownSport, untaggedStrength,
} from '../data/scenarios/scenarios';
import { defaultSensitivity } from './sensitivity';
import { computeForecast, evaluateMuscles } from './soreness';
import { MUSCLES, TaggedWorkout } from './types';

const S = defaultSensitivity();
const HOUR = 3_600_000;
const endOf = (ws: TaggedWorkout[], id: string) => new Date(ws.find((w) => w.id === id)!.end);
const plus = (d: Date, hours: number) => new Date(d.getTime() + hours * HOUR);

describe('evaluateMuscles: scenario ordering from the literature', () => {
  it('rates a downhill run above a flat run for quads and calves', () => {
    const at = plus(endOf(flatRun, 'run'), 48);
    const flat = evaluateMuscles(flatRun, at, S);
    const down = evaluateMuscles(downhillRun, plus(endOf(downhillRun, 'run'), 48), S);
    expect(down.quads.score).toBeGreaterThan(flat.quads.score);
    expect(down.calves.score).toBeGreaterThan(flat.calves.score);
    expect(down.quads.drivers).toContain('eccentric');
    expect(flat.quads.drivers).not.toContain('eccentric');
  });

  it('rates a first-ever soccer match above the same match for a regular player', () => {
    const first = evaluateMuscles(firstSoccer, plus(endOf(firstSoccer, 'match'), 48), S);
    const regular = evaluateMuscles(regularSoccer, plus(endOf(regularSoccer, 'match'), 48), S);
    expect(first.quads.score).toBeGreaterThan(regular.quads.score);
    expect(first.quads.drivers).toContain('novel');
    expect(regular.quads.drivers).not.toContain('novel');
  });

  it('keeps day-2 quads at least as high as day-1 after back-to-back leg days', () => {
    const one = evaluateMuscles(legDayOne, plus(endOf(legDayOne, 'legs-1'), 48), S);
    const two = evaluateMuscles(legDaysBackToBack, plus(endOf(legDaysBackToBack, 'legs-2'), 48), S);
    expect(two.quads.score).toBeGreaterThanOrEqual(one.quads.score);
  });

  it('scales the score with per-muscle sensitivity', () => {
    const at = plus(endOf(downhillRun, 'run'), 48);
    const base = evaluateMuscles(downhillRun, at, S).quads.score;
    const sore = evaluateMuscles(downhillRun, at, { ...S, quads: 1.5 }).quads.score;
    expect(sore).toBeCloseTo(base * 1.5, 6);
  });
});

describe('computeForecast', () => {
  it('follows the DOMS time course: low at first, peak inside 24-72h, faded by day 7', () => {
    const asOf = endOf(downhillRun, 'run');
    const f = computeForecast(downhillRun, asOf, S);
    expect(f.byDay).toHaveLength(8);
    expect(f.byDay[0].quads.band).toBe('low');
    expect(f.byDay[2].quads.band).not.toBe('low');
    expect(f.byDay[7].quads.band).toBe('low');
  });

  it('makes a downhill run visibly riskier than a flat run for a regular runner', () => {
    const flat = computeForecast(flatRun, endOf(flatRun, 'run'), S);
    const down = computeForecast(downhillRun, endOf(downhillRun, 'run'), S);
    expect(flat.byDay[2].quads.band).toBe('low');
    expect(down.byDay[2].quads.band).toBe('moderate');
  });

  it('marks a first soccer match high for quads, with novel and eccentric drivers', () => {
    const f = computeForecast(firstSoccer, endOf(firstSoccer, 'match'), S);
    expect(f.byDay[2].quads.band).toBe('high');
    expect(f.byDay[2].quads.drivers).toEqual(expect.arrayContaining(['novel', 'eccentric']));
  });

  it('adds no soreness for untagged strength and reports it in needsTag', () => {
    const f = computeForecast(untaggedStrength, endOf(untaggedStrength, 'untagged'), S);
    expect(f.needsTag).toEqual(['untagged']);
    for (const day of f.byDay) for (const m of MUSCLES) expect(day[m].band).toBe('low');
  });

  it('does not ask about an untagged or unmapped session the curve has already run out for', () => {
    const end = endOf(untaggedStrength, 'untagged');
    const unmapped = { ...unknownSport[0], id: 'old-unmapped' };
    const both = [...untaggedStrength, unmapped];
    const soon = computeForecast(both, plus(end, 191), S);
    expect(soon.needsTag).toEqual(['untagged']);
    const later = computeForecast(both, plus(end, 193), S);
    expect(later.needsTag).toEqual([]);
    expect(later.unmappedSports).toEqual([]);
    // A tagged old session is unaffected: it is scored as before (it just contributes nothing any more).
    const tagged = untaggedStrength.map((w) => ({ ...w, session_tag: 'upper' as const }));
    expect(computeForecast(tagged, plus(end, 193), S).needsTag).toEqual([]);
  });

  it('loads the right muscles for a tagged lower-body session', () => {
    const f = computeForecast(legDayOne, endOf(legDayOne, 'legs-1'), S);
    expect(f.needsTag).toEqual([]);
    expect(f.byDay[2].quads.band).toBe('high');
    expect(f.byDay[2].chest.band).toBe('low');
  });

  it('reports sports missing from the map instead of guessing', () => {
    const f = computeForecast(unknownSport, endOf(unknownSport, 'curling'), S);
    expect(f.unmappedSports).toEqual(['curling']);
    for (const m of MUSCLES) expect(f.byDay[2][m].band).toBe('low');
  });

  it('ignores workouts that end after asOf', () => {
    const before = plus(endOf(legDayOne, 'legs-1'), -1);
    const f = computeForecast(legDayOne, before, S);
    for (const day of f.byDay) for (const m of MUSCLES) expect(day[m].band).toBe('low');
  });

  it('is deterministic and does not mutate its inputs', () => {
    const asOf = endOf(downhillRun, 'run');
    const workoutsBefore = JSON.stringify(downhillRun);
    const sensBefore = JSON.stringify(S);
    expect(computeForecast(downhillRun, asOf, S)).toEqual(computeForecast(downhillRun, asOf, S));
    expect(JSON.stringify(downhillRun)).toBe(workoutsBefore);
    expect(JSON.stringify(S)).toBe(sensBefore);
  });

  it('treats a sport named after an Object.prototype key as unmapped instead of throwing', () => {
    const odd = [workout({
      id: 'odd', sport: 'constructor', start: '2026-09-10T07:00:00Z', zoneMinutes: [0, 10, 40, 10, 0, 0],
    })];
    const asOf = new Date('2026-09-11T00:00:00Z');
    expect(() => computeForecast(odd, asOf, S)).not.toThrow();
    expect(computeForecast(odd, asOf, S).unmappedSports).toEqual(['constructor']);
  });
});
