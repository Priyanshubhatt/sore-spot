import type { Muscle, StrengthTag } from './types';

export type MuscleWeights = Partial<Record<Muscle, number>>;

export interface SportProfile {
  muscles: MuscleWeights;
  /** Base eccentric factor: 1.0 = no extra eccentric demand. */
  eccentricBase: number;
  /** True when descent per km (running, hiking) adds to the eccentric factor. */
  scalesWithDescent: boolean;
}

// Hand-built starter map. Every weight in this file, plus STRENGTH_ECCENTRIC and TAG_MUSCLES below,
// is hand-tuned, uncalibrated and not validated. All of it needs trainer/PT review before the meeting.
export const SPORT_MUSCLE_MAP: Record<string, SportProfile> = {
  running: {
    muscles: { quads: 0.9, calves: 0.6, glutes: 0.6, hamstrings: 0.5 },
    eccentricBase: 1,
    scalesWithDescent: true,
  },
  hiking: {
    muscles: { quads: 0.8, calves: 0.6, glutes: 0.6 },
    eccentricBase: 1,
    scalesWithDescent: true,
  },
  cycling: {
    muscles: { quads: 0.9, glutes: 0.6, hamstrings: 0.5, calves: 0.4 },
    eccentricBase: 1,
    scalesWithDescent: false,
  },
  soccer: {
    muscles: { quads: 0.8, hamstrings: 0.7, calves: 0.6, glutes: 0.6, adductors: 0.6 },
    eccentricBase: 1.5,
    scalesWithDescent: false,
  },
  basketball: {
    muscles: { quads: 0.8, hamstrings: 0.6, calves: 0.7, glutes: 0.6, adductors: 0.5 },
    eccentricBase: 1.5,
    scalesWithDescent: false,
  },
  tennis: {
    muscles: { shoulders: 0.6, forearms: 0.6, core: 0.5, calves: 0.5 },
    eccentricBase: 1.3,
    scalesWithDescent: false,
  },
  swimming: {
    muscles: { upperBack: 0.8, shoulders: 0.8, triceps: 0.6, core: 0.5 },
    eccentricBase: 1,
    scalesWithDescent: false,
  },
  rowing: {
    muscles: { upperBack: 0.8, glutes: 0.6, hamstrings: 0.6, biceps: 0.5 },
    eccentricBase: 1,
    scalesWithDescent: false,
  },
  pickleball: {
    muscles: { calves: 0.5, quads: 0.4, adductors: 0.4, shoulders: 0.5, forearms: 0.5, core: 0.3 },
    eccentricBase: 1.2,
    scalesWithDescent: false,
  },
  volleyball: {
    muscles: { quads: 0.7, calves: 0.7, glutes: 0.6, shoulders: 0.6, core: 0.4 },
    eccentricBase: 1.4,
    scalesWithDescent: false,
  },
  golf: {
    muscles: { core: 0.5, forearms: 0.4, shoulders: 0.3, quads: 0.2 },
    eccentricBase: 1,
    scalesWithDescent: false,
  },
};

/** Strength sport names: the API gives no muscles, so these need a session_tag. */
export const STRENGTH_SPORTS: ReadonlySet<string> = new Set([
  'weightlifting',
  'powerlifting',
  'functional-fitness',
]);

export const STRENGTH_ECCENTRIC = 1.2; // lowering phases

export const TAG_MUSCLES: Record<StrengthTag, MuscleWeights> = {
  lower: { quads: 0.9, glutes: 0.8, hamstrings: 0.7, calves: 0.5, adductors: 0.4, core: 0.4 },
  upper: { chest: 0.7, shoulders: 0.7, upperBack: 0.7, biceps: 0.6, triceps: 0.6, forearms: 0.4 },
  push: { chest: 0.9, shoulders: 0.8, triceps: 0.8 },
  pull: { upperBack: 0.9, biceps: 0.8, forearms: 0.5 },
  full: {
    quads: 0.6, glutes: 0.6, hamstrings: 0.5, chest: 0.5, shoulders: 0.5,
    upperBack: 0.5, biceps: 0.4, triceps: 0.4, core: 0.4,
  },
};

/** "Functional Fitness", "functional_fitness" and "functional-fitness" all match. */
export function normalizeSport(sportName: string): string {
  return sportName.trim().toLowerCase().replace(/[\s_]+/g, '-');
}
