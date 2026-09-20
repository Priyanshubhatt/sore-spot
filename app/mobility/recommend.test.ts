import { describe, expect, it } from 'vitest';
import { MUSCLES } from '../../engine';
import { recommend } from './recommend';

const names = (moves: { name: string }[]) => moves.map((m) => m.name);

describe('recommend', () => {
  it('for a high band gives gentle comfort ideas in order and hides stretching', () => {
    const r = recommend('quads', 'high');
    expect(r.band).toBe('high');
    expect(names(r.comfort)).toEqual(['Easy walk', 'Foam roll quads', 'Small leg swings']);
    expect(r.rom).toEqual([]);
    expect(r.note).toBe('save-stretching');
  });

  it('for a moderate band gives the same comfort ideas plus a stretch', () => {
    const r = recommend('quads', 'moderate');
    expect(names(r.comfort)).toEqual(['Easy walk', 'Foam roll quads', 'Small leg swings']);
    expect(names(r.rom)).toEqual(['Standing quad stretch']);
    expect(r.note).toBeNull();
  });

  it('for a low band says nothing is needed but still offers a range-of-motion stretch', () => {
    const r = recommend('quads', 'low');
    expect(r.comfort).toEqual([]);
    expect(names(r.rom)).toEqual(['Standing quad stretch']);
    expect(r.note).toBe('nothing-needed');
  });

  it('treats a severe check-in as High even when the prediction is low', () => {
    const r = recommend('quads', 'low', 3);
    expect(r.band).toBe('high');
    expect(r.rom).toEqual([]);
    expect(r.comfort.length).toBeGreaterThan(0);
    expect(r.note).toBe('save-stretching');
  });

  it('treats a moderate check-in as at least Moderate', () => {
    const r = recommend('quads', 'low', 2);
    expect(r.band).toBe('moderate');
    expect(r.comfort.length).toBeGreaterThan(0);
  });

  it('offers at most one comfort move of each kind and at most two stretches', () => {
    for (const muscle of MUSCLES) {
      const r = recommend(muscle, 'moderate');
      expect(r.comfort.length, muscle).toBeLessThanOrEqual(3);
      expect(new Set(r.comfort.map((m) => m.kind)).size, muscle).toBe(r.comfort.length);
      expect(r.rom.length, muscle).toBeLessThanOrEqual(2);
      for (const m of r.rom) expect(m.kind).toBe('stretch');
      for (const m of r.comfort) expect(m.kind).not.toBe('stretch');
    }
  });

  it('gives every muscle at least one comfort idea when it is not low', () => {
    for (const muscle of MUSCLES) {
      expect(recommend(muscle, 'moderate').comfort.length, muscle).toBeGreaterThan(0);
      expect(recommend(muscle, 'high').comfort.length, muscle).toBeGreaterThan(0);
    }
  });

  it('falls back to the kinds that exist for a muscle (core has no self-massage)', () => {
    expect(names(recommend('core', 'moderate').comfort)).toEqual(['Easy walk', 'Cat-cow']);
  });

  it('is deterministic', () => {
    expect(recommend('glutes', 'moderate', 1)).toEqual(recommend('glutes', 'moderate', 1));
  });
});
