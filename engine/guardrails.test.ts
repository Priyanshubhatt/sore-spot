import { describe, expect, it } from 'vitest';
import { syntheticReplay } from '../data/replay.synthetic';
import {
  RED_FLAGS,
  RED_FLAG_QUESTIONS,
  checkEligibility,
  planOrGuardrail,
  screenRedFlags,
  validateRequest,
  type PlanInput,
} from './guardrails';
import {
  DECLINE_DAYS,
  DECLINE_DAYS_TOO_MANY,
  DECLINE_EQUIPMENT,
  DECLINE_GOAL,
  MEDICAL_CONDITION_MESSAGE,
  MEDICAL_CONDITION_QUESTION,
  RED_FLAG_MESSAGE,
  RED_FLAG_PROMPT,
  UNANSWERED_MESSAGE,
  UNDER_18_MESSAGE,
  UNDER_18_QUESTION,
} from './planText';
import { defaultSensitivity } from './sensitivity';
import { computeForecast } from './soreness';

const ASOF = new Date('2026-09-19T20:00:00Z');

const input = (overrides: Partial<PlanInput> = {}): PlanInput => ({
  forecast: computeForecast(syntheticReplay.workouts, ASOF, defaultSensitivity()),
  workouts: syntheticReplay.workouts,
  recovery: syntheticReplay.recovery ?? [],
  asOf: ASOF,
  redFlags: [],
  eligibility: { under18: false, medicalCondition: false },
  request: { goal: 'muscle', daysPerWeek: 4, equipment: 'gym' },
  ...overrides,
});

describe('red-flag screen', () => {
  it('has six checks, each with a question', () => {
    expect(RED_FLAGS).toHaveLength(6);
    for (const f of RED_FLAGS) expect(RED_FLAG_QUESTIONS[f].trim().length, f).toBeGreaterThan(0);
  });

  it('lets an empty answer through', () => {
    expect(screenRedFlags([])).toBeNull();
  });

  it('blocks on any single red flag with the clinician message', () => {
    for (const f of RED_FLAGS) {
      const result = screenRedFlags([f]);
      expect(result, f).toEqual({ kind: 'blocked', reason: 'red-flag', message: RED_FLAG_MESSAGE });
    }
    expect(RED_FLAG_MESSAGE).toMatch(/see a clinician/);
    expect(RED_FLAG_MESSAGE).toMatch(/urgent medical care/);
    expect(RED_FLAG_MESSAGE).toMatch(/not normal soreness/);
  });
});

describe('eligibility', () => {
  it('blocks under-18s and people with a medical condition, age first', () => {
    expect(checkEligibility({ under18: true, medicalCondition: false })?.message).toBe(UNDER_18_MESSAGE);
    expect(checkEligibility({ under18: false, medicalCondition: true })?.message).toBe(MEDICAL_CONDITION_MESSAGE);
    expect(checkEligibility({ under18: true, medicalCondition: true })?.reason).toBe('age');
    expect(checkEligibility({ under18: false, medicalCondition: false })).toBeNull();
  });

  it('points at a clinician or a trainer', () => {
    expect(UNDER_18_MESSAGE).toMatch(/clinician or a qualified trainer/);
    expect(MEDICAL_CONDITION_MESSAGE).toMatch(/clinician or a qualified trainer/);
  });
});

describe('request validation', () => {
  it('accepts the offered goals, 3 to 5 days and the three equipment levels', () => {
    const r = validateRequest({ goal: 'strength', daysPerWeek: 5, equipment: 'dumbbells' });
    expect(r).toEqual({ ok: true, request: { goal: 'strength', daysPerWeek: 5, equipment: 'dumbbells' } });
  });

  it('declines more than 5 days with the reason, and fewer than 3 or a part-day without a wrong reason', () => {
    for (const days of [6, 7]) {
      expect(validateRequest({ goal: 'muscle', daysPerWeek: days, equipment: 'gym' }), String(days)).toEqual({
        ok: false,
        message: DECLINE_DAYS_TOO_MANY,
      });
    }
    for (const days of [2, 0, 3.5, NaN]) {
      expect(validateRequest({ goal: 'muscle', daysPerWeek: days, equipment: 'gym' }), String(days)).toEqual({
        ok: false,
        message: DECLINE_DAYS,
      });
    }
    expect(DECLINE_DAYS).not.toMatch(/too little time/);
  });

  it('declines weight and body-composition goals', () => {
    for (const goal of ['lose-weight', 'cut', 'lose 10kg in a week', '']) {
      expect(validateRequest({ goal, daysPerWeek: 4, equipment: 'gym' }), goal).toEqual({
        ok: false,
        message: DECLINE_GOAL,
      });
    }
    expect(DECLINE_GOAL).toMatch(/does not plan for weight/);
  });

  it('declines unknown equipment', () => {
    expect(validateRequest({ goal: 'muscle', daysPerWeek: 4, equipment: 'kettlebell' })).toEqual({
      ok: false,
      message: DECLINE_EQUIPMENT,
    });
  });
});

describe('unanswered questions fail closed', () => {
  it('blocks a red-flag screen that was never answered, but not one answered with none', () => {
    expect(screenRedFlags(null)).toEqual({ kind: 'blocked', reason: 'unanswered', message: UNANSWERED_MESSAGE });
    expect(screenRedFlags(undefined as never)).toMatchObject({ reason: 'unanswered' });
    expect(screenRedFlags([])).toBeNull();
  });

  it('blocks eligibility unless both answers are an explicit no', () => {
    expect(checkEligibility({ under18: null, medicalCondition: false })?.reason).toBe('unanswered');
    expect(checkEligibility({ under18: false, medicalCondition: null })?.reason).toBe('unanswered');
    expect(checkEligibility({} as never)?.reason).toBe('unanswered');
    expect(checkEligibility(undefined as never)?.reason).toBe('unanswered');
    expect(checkEligibility({ under18: 0, medicalCondition: false } as never)?.reason).toBe('unanswered');
    expect(checkEligibility({ under18: false, medicalCondition: false })).toBeNull();
  });

  it('still names the real reason when one answer is a yes and the other is missing', () => {
    expect(checkEligibility({ under18: true, medicalCondition: null })?.reason).toBe('age');
    expect(checkEligibility({ under18: null, medicalCondition: true })?.reason).toBe('condition');
  });

  it('never calls a missing answer an age or a medical condition', () => {
    expect(UNANSWERED_MESSAGE).not.toMatch(/adult|under 18|medical condition/i);
  });

  it('never returns a plan while any answer is missing', () => {
    expect(planOrGuardrail(input({ redFlags: null }))).toMatchObject({ kind: 'blocked', reason: 'unanswered' });
    expect(
      planOrGuardrail(input({ eligibility: { under18: null, medicalCondition: false } })),
    ).toMatchObject({ kind: 'blocked', reason: 'unanswered' });
  });

  it('reaches each other reason through planOrGuardrail on its own', () => {
    expect(planOrGuardrail(input({ eligibility: { under18: true, medicalCondition: false } }))).toMatchObject({
      reason: 'age',
    });
    expect(planOrGuardrail(input({ eligibility: { under18: false, medicalCondition: true } }))).toMatchObject({
      reason: 'condition',
    });
    expect(
      planOrGuardrail(input({ request: { goal: 'lose-weight', daysPerWeek: 4, equipment: 'gym' } })),
    ).toMatchObject({ reason: 'request', message: DECLINE_GOAL });
  });

  it('has the wording for the screening screens in the scanned text file', () => {
    expect(RED_FLAG_PROMPT.trim().length).toBeGreaterThan(0);
    expect(UNDER_18_QUESTION).toMatch(/\?$/);
    expect(MEDICAL_CONDITION_QUESTION).toMatch(/\?$/);
  });
});

describe('planOrGuardrail', () => {
  it('builds a plan when every guardrail passes', () => {
    const result = planOrGuardrail(input());
    expect(result.kind).toBe('plan');
    if (result.kind === 'plan') expect(result.plan.days).toHaveLength(7);
  });

  it('checks red flags first, then eligibility, then the request', () => {
    const everything = input({
      redFlags: ['swelling'],
      eligibility: { under18: true, medicalCondition: true },
      request: { goal: 'lose-weight', daysPerWeek: 9, equipment: 'gym' },
    });
    expect(planOrGuardrail(everything)).toMatchObject({ kind: 'blocked', reason: 'red-flag' });
    expect(planOrGuardrail({ ...everything, redFlags: [] })).toMatchObject({ kind: 'blocked', reason: 'age' });
    expect(
      planOrGuardrail({ ...everything, redFlags: [], eligibility: { under18: false, medicalCondition: false } }),
    ).toMatchObject({ kind: 'blocked', reason: 'request' });
  });

  it('never returns a plan for a blocked member', () => {
    for (const flag of RED_FLAGS) {
      expect(planOrGuardrail(input({ redFlags: [flag] })).kind, flag).toBe('blocked');
    }
    expect(planOrGuardrail(input({ eligibility: { under18: false, medicalCondition: true } })).kind).toBe('blocked');
  });
});
