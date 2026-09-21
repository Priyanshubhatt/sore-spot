import {
  planOrGuardrail,
  type Forecast,
  type PlanResult,
  type PlannedExercise,
  type Recovery,
  type TaggedWorkout,
} from '../engine';
import { eligibilityOf, type Screening } from './screening';
import { weekdayLabel } from './scrubber';

/** What the member picked. Kept as plain strings and numbers: the engine validates them. */
export interface PlanChoice {
  goal: string;
  daysPerWeek: number;
  equipment: string;
}

export interface Option<T> {
  value: T;
  label: string;
}

// "Lose weight" and 6 or 7 days are offered on purpose: the guardrails decline them with a reason.
export const GOAL_OPTIONS: Option<string>[] = [
  { value: 'muscle', label: 'Build muscle' },
  { value: 'strength', label: 'Get stronger' },
  { value: 'lose-weight', label: 'Lose weight' },
];
export const DAYS_OPTIONS: Option<number>[] = [3, 4, 5, 6, 7].map((n) => ({ value: n, label: String(n) }));
export const EQUIPMENT_OPTIONS: Option<string>[] = [
  { value: 'bodyweight', label: 'Bodyweight' },
  { value: 'dumbbells', label: 'Dumbbells' },
  { value: 'gym', label: 'Gym' },
];

export const DEFAULT_CHOICE: PlanChoice = { goal: 'muscle', daysPerWeek: 4, equipment: 'gym' };

interface PlanArgs {
  forecast: Forecast;
  workouts: TaggedWorkout[];
  recovery: Recovery[];
  asOf: Date;
  screening: Screening;
  choice: PlanChoice;
}

/** Every guardrail runs inside planOrGuardrail: nothing here can build a plan around it. */
export function computePlan(args: PlanArgs): PlanResult {
  return planOrGuardrail({
    forecast: args.forecast,
    workouts: args.workouts,
    recovery: args.recovery,
    asOf: args.asOf,
    redFlags: args.screening.redFlags,
    eligibility: eligibilityOf(args.screening),
    request: args.choice,
  });
}

/** "Sun · tomorrow", "Mon · in 2 days". Plan day 1 is the day after asOf. */
export function planDayHeading(asOf: Date, day: number): string {
  return `${weekdayLabel(asOf, day)} · ${day === 1 ? 'tomorrow' : `in ${day} days`}`;
}

/** "3 sets of 8 to 12 reps", "3 sets of 30 to 45 seconds". */
export function setsAndReps(exercise: Pick<PlannedExercise, 'sets' | 'reps'>): string {
  const unit = exercise.reps.includes('seconds') ? '' : ' reps';
  return `${exercise.sets} sets of ${exercise.reps}${unit}`;
}
