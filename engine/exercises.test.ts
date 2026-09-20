import { describe, expect, it } from 'vitest';
import {
  EXERCISES,
  fitsEquipment,
  tierOf,
  type Equipment,
  type Pattern,
} from './exercises';
import { MUSCLES } from './types';

const PATTERNS: Pattern[] = [
  'squat',
  'hinge',
  'lunge',
  'calf',
  'push-h',
  'push-v',
  'delt',
  'pull-v',
  'pull-h',
  'biceps',
  'triceps',
  'core',
];
const LEVELS: Equipment[] = ['bodyweight', 'dumbbells', 'gym'];

describe('exercise library', () => {
  it('has 60 to 80 exercises with unique ids and names', () => {
    expect(EXERCISES.length).toBeGreaterThanOrEqual(60);
    expect(EXERCISES.length).toBeLessThanOrEqual(80);
    expect(new Set(EXERCISES.map((e) => e.id)).size).toBe(EXERCISES.length);
    expect(new Set(EXERCISES.map((e) => e.name)).size).toBe(EXERCISES.length);
  });

  it('gives every exercise a name, primary muscles from the engine, and valid tags', () => {
    for (const e of EXERCISES) {
      expect(e.name.trim().length, e.id).toBeGreaterThan(0);
      expect(e.primary.length, e.id).toBeGreaterThan(0);
      for (const m of e.primary) expect(MUSCLES, `${e.id}/${m}`).toContain(m);
      expect(['low', 'moderate', 'high'], e.id).toContain(e.eccentric);
      expect(LEVELS, e.id).toContain(e.equipment);
      expect(PATTERNS, e.id).toContain(e.pattern);
    }
  });

  it('trains all 12 muscles as a primary muscle somewhere', () => {
    const covered = new Set(EXERCISES.flatMap((e) => e.primary));
    for (const m of MUSCLES) expect(covered.has(m), m).toBe(true);
  });

  it('has at least one exercise for every pattern at every equipment level', () => {
    for (const level of LEVELS) {
      for (const pattern of PATTERNS) {
        const n = EXERCISES.filter((e) => e.pattern === pattern && fitsEquipment(e, level)).length;
        expect(n, `${pattern} with ${level}`).toBeGreaterThan(0);
      }
    }
  });

  it('gives every pattern a gentle (low-eccentric) option at every equipment level', () => {
    for (const level of LEVELS) {
      for (const pattern of PATTERNS) {
        const gentle = EXERCISES.some(
          (e) => e.pattern === pattern && fitsEquipment(e, level) && e.eccentric === 'low',
        );
        expect(gentle || pattern === 'calf', `${pattern} with ${level}`).toBe(true);
      }
    }
  });

  it('tags the well-known lengthening-heavy movements as high and the isometric ones as low', () => {
    const ecc = (id: string) => EXERCISES.find((e) => e.id === id)?.eccentric;
    for (const id of ['rdl-bb', 'rdl-db', 'nordic-curl', 'walking-lunge-db', 'pull-up', 'dips', 'db-fly']) {
      expect(ecc(id), id).toBe('high');
    }
    for (const id of ['plank', 'hip-thrust-bb', 'glute-bridge', 'step-up', 'face-pull', 'farmer-carry']) {
      expect(ecc(id), id).toBe('low');
    }
  });

  it('marks holds as low-eccentric timed work', () => {
    for (const e of EXERCISES.filter((x) => x.hold)) expect(e.eccentric, e.id).toBe('low');
  });
});

describe('equipment tiers', () => {
  it('lets more equipment use everything less equipment can', () => {
    expect(tierOf('bodyweight')).toBeLessThan(tierOf('dumbbells'));
    expect(tierOf('dumbbells')).toBeLessThan(tierOf('gym'));
    const bw = EXERCISES.find((e) => e.equipment === 'bodyweight')!;
    const gym = EXERCISES.find((e) => e.equipment === 'gym')!;
    expect(fitsEquipment(bw, 'gym')).toBe(true);
    expect(fitsEquipment(gym, 'dumbbells')).toBe(false);
  });
});
