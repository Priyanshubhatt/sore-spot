import type { Muscle } from './types';

export type Equipment = 'bodyweight' | 'dumbbells' | 'gym';
export type Goal = 'muscle' | 'strength';
/** How much loaded lengthening a movement involves. Hand-assigned, uncalibrated. */
export type Eccentric = 'low' | 'moderate' | 'high';
export type Pattern =
  | 'squat'
  | 'hinge'
  | 'lunge'
  | 'calf'
  | 'push-h'
  | 'push-v'
  | 'delt'
  | 'pull-v'
  | 'pull-h'
  | 'biceps'
  | 'triceps'
  | 'core';

export interface Exercise {
  id: string;
  name: string;
  pattern: Pattern;
  primary: Muscle[];
  eccentric: Eccentric;
  /** The least equipment needed. */
  equipment: Equipment;
  /** A timed hold or carry rather than counted reps. */
  hold?: boolean;
}

const EQUIPMENT_TIER: Record<Equipment, number> = { bodyweight: 0, dumbbells: 1, gym: 2 };

/** Higher means more equipment. */
export function tierOf(equipment: Equipment): number {
  return EQUIPMENT_TIER[equipment];
}

/** An exercise fits when the member has at least the equipment it needs. */
export function fitsEquipment(exercise: Exercise, have: Equipment): boolean {
  return tierOf(exercise.equipment) <= tierOf(have);
}

const ex = (
  id: string,
  name: string,
  pattern: Pattern,
  primary: Muscle[],
  eccentric: Eccentric,
  equipment: Equipment,
  hold = false,
): Exercise => ({ id, name, pattern, primary, eccentric, equipment, ...(hold ? { hold } : {}) });

// Hand-written training guidance with hand-assigned eccentric tags. Needs a trainer or PT review before
// any demo. Within a pattern, the order is the order of preference for someone with the equipment.
export const EXERCISES: readonly Exercise[] = [
  // Squat pattern
  ex('back-squat', 'Barbell back squat', 'squat', ['quads', 'glutes'], 'moderate', 'gym'),
  ex('front-squat', 'Barbell front squat', 'squat', ['quads', 'glutes'], 'moderate', 'gym'),
  ex('leg-press', 'Leg press', 'squat', ['quads', 'glutes'], 'moderate', 'gym'),
  ex('goblet-squat', 'Goblet squat', 'squat', ['quads', 'glutes'], 'moderate', 'dumbbells'),
  ex('sumo-squat-db', 'Dumbbell sumo squat', 'squat', ['quads', 'glutes', 'adductors'], 'moderate', 'dumbbells'),
  ex('bodyweight-squat', 'Bodyweight squat', 'squat', ['quads', 'glutes'], 'low', 'bodyweight'),

  // Hinge pattern
  ex('rdl-bb', 'Barbell Romanian deadlift', 'hinge', ['hamstrings', 'glutes'], 'high', 'gym'),
  ex('hip-thrust-bb', 'Barbell hip thrust', 'hinge', ['glutes', 'hamstrings'], 'low', 'gym'),
  ex('leg-curl', 'Machine leg curl', 'hinge', ['hamstrings'], 'moderate', 'gym'),
  ex('good-morning', 'Good morning', 'hinge', ['hamstrings', 'glutes'], 'high', 'gym'),
  ex('rdl-db', 'Dumbbell Romanian deadlift', 'hinge', ['hamstrings', 'glutes'], 'high', 'dumbbells'),
  ex('hip-thrust-db', 'Dumbbell hip thrust', 'hinge', ['glutes', 'hamstrings'], 'low', 'dumbbells'),
  ex('glute-bridge', 'Glute bridge', 'hinge', ['glutes', 'hamstrings'], 'low', 'bodyweight'),
  ex('single-leg-glute-bridge', 'Single-leg glute bridge', 'hinge', ['glutes', 'hamstrings'], 'low', 'bodyweight'),
  ex('nordic-curl', 'Assisted Nordic hamstring curl', 'hinge', ['hamstrings'], 'high', 'bodyweight'),

  // Lunge and single-leg pattern
  ex('walking-lunge-db', 'Dumbbell walking lunge', 'lunge', ['quads', 'glutes', 'hamstrings'], 'high', 'dumbbells'),
  ex('split-squat-db', 'Dumbbell split squat', 'lunge', ['quads', 'glutes', 'hamstrings'], 'high', 'dumbbells'),
  ex('rear-foot-split-squat', 'Rear-foot-elevated split squat', 'lunge', ['quads', 'glutes', 'hamstrings'], 'high', 'dumbbells'),
  ex('reverse-lunge', 'Reverse lunge', 'lunge', ['quads', 'glutes'], 'moderate', 'bodyweight'),
  ex('lateral-lunge', 'Lateral lunge', 'lunge', ['adductors', 'glutes', 'quads'], 'moderate', 'bodyweight'),
  ex('step-down', 'Slow step-down', 'lunge', ['quads', 'glutes', 'hamstrings'], 'high', 'bodyweight'),
  ex('step-up', 'Step-up', 'lunge', ['quads', 'glutes'], 'low', 'bodyweight'),

  // Calves
  ex('machine-calf-raise', 'Machine calf raise', 'calf', ['calves'], 'moderate', 'gym'),
  ex('seated-calf-raise-db', 'Dumbbell seated calf raise', 'calf', ['calves'], 'moderate', 'dumbbells'),
  ex('calf-raise', 'Standing calf raise', 'calf', ['calves'], 'moderate', 'bodyweight'),
  ex('single-leg-calf-raise', 'Single-leg calf raise', 'calf', ['calves'], 'moderate', 'bodyweight'),

  // Horizontal push
  ex('bb-bench-press', 'Barbell bench press', 'push-h', ['chest', 'triceps', 'shoulders'], 'moderate', 'gym'),
  ex('chest-press-machine', 'Chest press machine', 'push-h', ['chest', 'triceps'], 'moderate', 'gym'),
  ex('cable-fly', 'Cable fly', 'push-h', ['chest'], 'moderate', 'gym'),
  ex('dips', 'Parallel-bar dip', 'push-h', ['chest', 'triceps', 'shoulders'], 'high', 'gym'),
  ex('db-bench-press', 'Dumbbell bench press', 'push-h', ['chest', 'triceps', 'shoulders'], 'moderate', 'dumbbells'),
  ex('db-floor-press', 'Dumbbell floor press', 'push-h', ['chest', 'triceps'], 'low', 'dumbbells'),
  ex('db-fly', 'Dumbbell fly', 'push-h', ['chest'], 'high', 'dumbbells'),
  ex('push-up', 'Push-up', 'push-h', ['chest', 'triceps', 'shoulders'], 'moderate', 'bodyweight'),
  ex('incline-push-up', 'Incline push-up', 'push-h', ['chest', 'triceps', 'shoulders'], 'low', 'bodyweight'),

  // Vertical push
  ex('bb-overhead-press', 'Barbell overhead press', 'push-v', ['shoulders', 'triceps'], 'moderate', 'gym'),
  ex('landmine-press', 'Landmine press', 'push-v', ['shoulders', 'chest', 'triceps'], 'moderate', 'gym'),
  ex('db-shoulder-press', 'Dumbbell shoulder press', 'push-v', ['shoulders', 'triceps'], 'moderate', 'dumbbells'),
  ex('pike-push-up', 'Pike push-up', 'push-v', ['shoulders', 'triceps'], 'moderate', 'bodyweight'),
  ex('pike-hold', 'Pike hold', 'push-v', ['shoulders', 'triceps'], 'low', 'bodyweight', true),

  // Shoulders and rear delts
  ex('cable-lateral-raise', 'Cable lateral raise', 'delt', ['shoulders'], 'moderate', 'gym'),
  ex('face-pull', 'Face pull', 'delt', ['shoulders', 'upperBack'], 'low', 'gym'),
  ex('lateral-raise', 'Dumbbell lateral raise', 'delt', ['shoulders'], 'moderate', 'dumbbells'),
  ex('prone-t-raise', 'Prone T raise', 'delt', ['shoulders', 'upperBack'], 'low', 'bodyweight'),

  // Vertical pull
  ex('lat-pulldown', 'Lat pulldown', 'pull-v', ['upperBack', 'biceps'], 'moderate', 'gym'),
  ex('pull-up', 'Pull-up', 'pull-v', ['upperBack', 'biceps'], 'high', 'gym'),
  ex('chin-up', 'Chin-up', 'pull-v', ['biceps', 'upperBack'], 'high', 'gym'),
  ex('straight-arm-pulldown', 'Straight-arm pulldown', 'pull-v', ['upperBack'], 'low', 'gym'),
  ex('db-pullover', 'Dumbbell pullover', 'pull-v', ['upperBack', 'chest'], 'moderate', 'dumbbells'),
  ex('prone-y-raise', 'Prone Y raise', 'pull-v', ['upperBack', 'shoulders'], 'low', 'bodyweight'),

  // Horizontal pull
  ex('bb-row', 'Barbell row', 'pull-h', ['upperBack', 'biceps'], 'moderate', 'gym'),
  ex('cable-row', 'Seated cable row', 'pull-h', ['upperBack', 'biceps'], 'moderate', 'gym'),
  ex('db-row', 'One-arm dumbbell row', 'pull-h', ['upperBack', 'biceps'], 'moderate', 'dumbbells'),
  ex('chest-supported-row', 'Chest-supported dumbbell row', 'pull-h', ['upperBack', 'biceps'], 'moderate', 'dumbbells'),
  ex('inverted-row', 'Inverted row (sturdy table or low bar)', 'pull-h', ['upperBack', 'biceps'], 'moderate', 'bodyweight'),
  ex('prone-swimmer', 'Prone swimmer', 'pull-h', ['upperBack', 'shoulders'], 'low', 'bodyweight'),

  // Biceps
  ex('cable-curl', 'Cable curl', 'biceps', ['biceps'], 'moderate', 'gym'),
  ex('db-curl', 'Dumbbell curl', 'biceps', ['biceps'], 'moderate', 'dumbbells'),
  ex('hammer-curl', 'Hammer curl', 'biceps', ['biceps', 'forearms'], 'moderate', 'dumbbells'),
  ex('incline-db-curl', 'Incline dumbbell curl', 'biceps', ['biceps'], 'high', 'dumbbells'),
  ex('towel-isometric-curl', 'Towel isometric curl', 'biceps', ['biceps', 'forearms'], 'low', 'bodyweight', true),

  // Triceps
  ex('triceps-pushdown', 'Cable triceps pushdown', 'triceps', ['triceps'], 'moderate', 'gym'),
  ex('skull-crusher', 'Skull crusher', 'triceps', ['triceps'], 'high', 'gym'),
  ex('overhead-triceps-extension', 'Overhead dumbbell triceps extension', 'triceps', ['triceps'], 'high', 'dumbbells'),
  ex('db-kickback', 'Dumbbell triceps kickback', 'triceps', ['triceps'], 'low', 'dumbbells'),
  ex('close-grip-push-up', 'Close-grip push-up', 'triceps', ['triceps', 'chest'], 'moderate', 'bodyweight'),
  ex('incline-close-grip-push-up', 'Incline close-grip push-up', 'triceps', ['triceps', 'chest'], 'low', 'bodyweight'),

  // Core
  ex('cable-crunch', 'Cable crunch', 'core', ['core'], 'moderate', 'gym'),
  ex('pallof-press', 'Pallof press', 'core', ['core'], 'low', 'gym'),
  ex('hanging-knee-raise', 'Hanging knee raise', 'core', ['core', 'forearms'], 'moderate', 'gym'),
  ex('ab-wheel', 'Ab wheel rollout', 'core', ['core'], 'high', 'gym'),
  ex('farmer-carry', 'Farmer carry', 'core', ['forearms', 'core'], 'low', 'dumbbells', true),
  ex('plank', 'Plank', 'core', ['core'], 'low', 'bodyweight', true),
  ex('side-plank', 'Side plank', 'core', ['core'], 'low', 'bodyweight', true),
  ex('copenhagen-plank', 'Short-lever Copenhagen plank', 'core', ['adductors', 'core'], 'low', 'bodyweight', true),
  ex('hollow-hold', 'Hollow hold', 'core', ['core'], 'low', 'bodyweight', true),
  ex('dead-bug', 'Dead bug', 'core', ['core'], 'low', 'bodyweight'),
  ex('bird-dog', 'Bird dog', 'core', ['core'], 'low', 'bodyweight'),
];
