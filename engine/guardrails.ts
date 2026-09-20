import type { Equipment, Goal } from './exercises';
import { buildPlan, type Plan, type PlanContext, type PlanRequest } from './plan';
import {
  DECLINE_DAYS,
  DECLINE_DAYS_TOO_MANY,
  DECLINE_EQUIPMENT,
  DECLINE_GOAL,
  MEDICAL_CONDITION_MESSAGE,
  RED_FLAG_MESSAGE,
  UNDER_18_MESSAGE,
} from './planText';

export type RedFlag =
  | 'sharp-pain'
  | 'swelling'
  | 'weakness'
  | 'dark-urine'
  | 'worsening-pain'
  | 'numbness';

export const RED_FLAGS: readonly RedFlag[] = [
  'sharp-pain',
  'swelling',
  'weakness',
  'dark-urine',
  'worsening-pain',
  'numbness',
];

/** The screen asks these. Any "yes" stops planning: this is never presented as normal soreness. */
export const RED_FLAG_QUESTIONS: Record<RedFlag, string> = {
  'sharp-pain': 'Sharp or localized pain, not a general ache',
  swelling: 'Swelling in a muscle or joint',
  weakness: 'Marked weakness that is new',
  'dark-urine': 'Dark, tea-colored urine',
  'worsening-pain': 'Pain that keeps getting worse, or has lasted well beyond a week',
  numbness: 'Numbness or tingling',
};

export interface Blocked {
  kind: 'blocked';
  reason: 'red-flag' | 'age' | 'condition' | 'request';
  message: string;
}

export interface Eligibility {
  under18: boolean;
  medicalCondition: boolean;
}

export interface RawRequest {
  goal: string;
  daysPerWeek: number;
  equipment: string;
}

export function screenRedFlags(selected: readonly RedFlag[]): Blocked | null {
  if (selected.length === 0) return null;
  return { kind: 'blocked', reason: 'red-flag', message: RED_FLAG_MESSAGE };
}

export function checkEligibility(e: Eligibility): Blocked | null {
  if (e.under18) return { kind: 'blocked', reason: 'age', message: UNDER_18_MESSAGE };
  if (e.medicalCondition) {
    return { kind: 'blocked', reason: 'condition', message: MEDICAL_CONDITION_MESSAGE };
  }
  return null;
}

const GOALS: readonly Goal[] = ['muscle', 'strength'];
const EQUIPMENT: readonly Equipment[] = ['bodyweight', 'dumbbells', 'gym'];

/** Only the offered goals, 3 to 5 days and the three equipment levels are accepted. */
export function validateRequest(
  raw: RawRequest,
): { ok: true; request: PlanRequest } | { ok: false; message: string } {
  if (!GOALS.includes(raw.goal as Goal)) return { ok: false, message: DECLINE_GOAL };
  if (!Number.isInteger(raw.daysPerWeek) || raw.daysPerWeek < 3 || raw.daysPerWeek > 5) {
    return { ok: false, message: raw.daysPerWeek > 5 ? DECLINE_DAYS_TOO_MANY : DECLINE_DAYS };
  }
  if (!EQUIPMENT.includes(raw.equipment as Equipment)) {
    return { ok: false, message: DECLINE_EQUIPMENT };
  }
  return {
    ok: true,
    request: {
      goal: raw.goal as Goal,
      daysPerWeek: raw.daysPerWeek as 3 | 4 | 5,
      equipment: raw.equipment as Equipment,
    },
  };
}

export interface PlanInput extends PlanContext {
  redFlags: readonly RedFlag[];
  eligibility: Eligibility;
  request: RawRequest;
}

export type PlanResult = { kind: 'plan'; plan: Plan } | Blocked;

/** Runs the guardrails in order (red flags, eligibility, request) and only then builds a plan. */
export function planOrGuardrail(input: PlanInput): PlanResult {
  const redFlag = screenRedFlags(input.redFlags);
  if (redFlag) return redFlag;
  const eligibility = checkEligibility(input.eligibility);
  if (eligibility) return eligibility;
  const checked = validateRequest(input.request);
  if (!checked.ok) return { kind: 'blocked', reason: 'request', message: checked.message };
  return { kind: 'plan', plan: buildPlan(checked.request, input) };
}
