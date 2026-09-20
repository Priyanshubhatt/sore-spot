import { describe, expect, it } from 'vitest';
import { MUSCLES } from '../../engine';
import { MOVES, evidenceFor, type MoveKind } from './library';

const KINDS: MoveKind[] = ['light-movement', 'self-massage', 'mobility', 'stretch'];

describe('mobility library', () => {
  it('has between 30 and 40 moves with unique ids', () => {
    expect(MOVES.length).toBeGreaterThanOrEqual(30);
    expect(MOVES.length).toBeLessThanOrEqual(40);
    expect(new Set(MOVES.map((m) => m.id)).size).toBe(MOVES.length);
  });

  it('gives every move a name, instructions, a dose, a valid kind and known muscles', () => {
    for (const m of MOVES) {
      expect(m.name.trim().length, m.id).toBeGreaterThan(0);
      expect(m.how.trim().length, m.id).toBeGreaterThan(0);
      expect(m.dose.trim().length, m.id).toBeGreaterThan(0);
      expect(KINDS, m.id).toContain(m.kind);
      expect(m.muscles.length, m.id).toBeGreaterThan(0);
      for (const muscle of m.muscles) expect(MUSCLES, `${m.id}/${muscle}`).toContain(muscle);
    }
  });

  it('gives every one of the 12 muscles a comfort move and a stretch', () => {
    for (const muscle of MUSCLES) {
      const forMuscle = MOVES.filter((m) => m.muscles.includes(muscle));
      expect(forMuscle.some((m) => m.kind !== 'stretch'), `${muscle} comfort`).toBe(true);
      expect(forMuscle.some((m) => m.kind === 'stretch'), `${muscle} stretch`).toBe(true);
    }
  });

  it('is honest by construction: stretching is tagged for range of motion only, all else for comfort only', () => {
    expect(evidenceFor('stretch')).toBe('ROM');
    for (const kind of KINDS.filter((k) => k !== 'stretch')) expect(evidenceFor(kind)).toBe('COMFORT');
    for (const m of MOVES) expect(['ROM', 'COMFORT']).toContain(evidenceFor(m.kind));
  });

  it('gives boundaries and cues where a joint or the front of the shoulder is loaded', () => {
    const how = (id: string) => MOVES.find((m) => m.id === id)?.how ?? '';
    expect(how('hamstrings-foam-roll')).toMatch(/above the back of the knee/);
    expect(how('quads-foam-roll')).toMatch(/above the knee/);
    expect(how('calves-foam-roll')).toMatch(/below the knee/);
    expect(how('upper-back-foam-roll')).toMatch(/support your head/);
    expect(how('upper-back-foam-roll')).toMatch(/avoiding the lower back/);
    expect(how('chest-doorway-stretch')).toMatch(/pinch/);
    expect(how('biceps-wall-stretch')).toMatch(/pinch/);
  });

  it('keeps holds moderate and never asks for pain', () => {
    for (const m of MOVES) {
      expect(m.how, m.id).not.toMatch(/until it hurts|push through|as far as possible|maximum/i);
    }
  });
});
