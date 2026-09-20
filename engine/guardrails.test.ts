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
  RED_FLAG_MESSAGE,
  UNDER_18_MESSAGE,
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
