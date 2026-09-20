import type { Goal } from './exercises';
import type { Muscle, StrengthTag } from './types';

// Every user-facing string the plan engine can produce lives here (and the red-flag questions in
// guardrails.ts). A test scans these files for banned claims. Nothing here may claim a medical or health benefit.

export const MUSCLE_NAMES: Record<Muscle, string> = {
  chest: 'chest',
  shoulders: 'shoulders',
  biceps: 'biceps',
  triceps: 'triceps',
  forearms: 'forearms',
  upperBack: 'upper back',
  core: 'core',
  glutes: 'glutes',
  quads: 'quads',
  hamstrings: 'hamstrings',
  calves: 'calves',
  adductors: 'inner thighs',
};

/** "quads", "quads and glutes", "quads, glutes and hamstrings". */
export function listMuscles(muscles: Muscle[]): string {
  const names = muscles.map((m) => MUSCLE_NAMES[m]);
  if (names.length <= 1) return names.join('');
  return `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`;
}

export const FOCUS_TITLES: Record<StrengthTag, string> = {
  lower: 'Lower body',
  upper: 'Upper body',
  push: 'Push',
  pull: 'Pull',
  full: 'Full body',
};

export const REST_TITLE = 'Rest day';
export const EASY_TITLE = 'Easy day';
export const REST_WHY = 'Rest days are when your body adapts.';

export const GOAL_WHY: Record<Goal, string> = {
  muscle: 'Built for muscle: moderate weights and controlled reps.',
  strength: 'Built for strength: heavier weights and fewer reps on the main lifts.',
};

export const EFFORT_NORMAL = 'Stop 2 to 3 reps before failure.';
export const EFFORT_HOLD = 'Stop before your form slips.';
export const EFFORT_EASY = 'Keep it easy.';
export const NOVEL_NOTE = 'New for you: start light.';

export function fewerSetsNote(muscles: Muscle[]): string {
  return `Fewer sets: ${listMuscles(muscles)} predicted sore.`;
}

export function easierPickNote(muscles: Muscle[]): string {
  return `Chosen to go easy on ${listMuscles(muscles)}, which are predicted sore.`;
}

export function swapWhy(from: StrengthTag, to: StrengthTag, muscles: Muscle[]): string {
  return `Swapped ${FOCUS_TITLES[from]} for ${FOCUS_TITLES[to]}: ${listMuscles(muscles)} predicted sore that day.`;
}

export function easyDaySoreWhy(muscles: Muscle[]): string {
  return `Easy day: ${listMuscles(muscles)} predicted sore, so this day is for gentle movement instead of training.`;
}

export const EASY_RECOVERY_WHY = 'Easy day: your latest recovery was low, so start the week gently.';
export const LIGHTER_WEEK_WHY = 'Lighter week: several recent recoveries were low.';
export const LIGHTER_WEEK_NOTE =
  'Lighter week: several recent recoveries were low, so every exercise gets one set fewer.';

export function rampNote(days: number, requested: number): string {
  return `Building up: you have not trained this often lately, so the plan starts with ${days} training days instead of ${requested}.`;
}

export const PLAN_DISCLAIMER = 'General training guidance, not medical advice.';

// Guardrail messages
export const RED_FLAG_MESSAGE =
  'Sharp or localized pain, swelling, marked weakness, dark urine, numbness, or pain that keeps getting worse are not normal soreness. Stop training and see a clinician before continuing. If symptoms are severe or sudden, get urgent medical care.';
export const UNDER_18_MESSAGE =
  'Training plans here are for adults. Please talk to a clinician or a qualified trainer.';
export const MEDICAL_CONDITION_MESSAGE =
  'With a medical condition, please talk to a clinician or a qualified trainer before following a plan.';
export const DECLINE_DAYS = 'Plans cover 3 to 5 training days a week.';
export const DECLINE_DAYS_TOO_MANY =
  'Plans cover 3 to 5 training days a week. More days leave too little time to recover.';
export const DECLINE_GOAL =
  'This app plans for building muscle or getting stronger. It does not plan for weight or body-composition goals.';
export const DECLINE_EQUIPMENT = 'Choose bodyweight, dumbbells or a gym.';
