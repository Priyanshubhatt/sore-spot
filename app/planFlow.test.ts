import { describe, expect, it } from 'vitest';
import { syntheticReplay } from '../data/replay.synthetic';
import { HISTORY_INCOMPLETE_NOTE, UNANSWERED_MESSAGE } from '../engine/planText';
import { DEMO_AS_OF } from './config';
import { buildForecastState } from './forecastState';
import {
  DAYS_OPTIONS,
  DEFAULT_CHOICE,
  EQUIPMENT_OPTIONS,
  GOAL_OPTIONS,
  computePlan,
  planDayHeading,
  setsAndReps,
} from './planFlow';
import {
  answerMedicalCondition,
  answerNoRedFlags,
  answerUnder18,
  initialScreening,
  toggleRedFlag,
  type Screening,
} from './screening';

const answered: Screening = answerMedicalCondition(answerUnder18(answerNoRedFlags(initialScreening()), false), false);

const run = (screening: Screening, choice = DEFAULT_CHOICE, tags = {}) => {
  const state = buildForecastState(syntheticReplay.workouts, tags, {}, DEMO_AS_OF);
  return computePlan({
    forecast: state.forecast,
    workouts: state.tagged,
    recovery: syntheticReplay.recovery ?? [],
    asOf: DEMO_AS_OF,
    screening,
    choice,
  });
};

describe('computePlan', () => {
  it('builds the demo-week plan once every question is answered "no"', () => {
    const result = run(answered);
    expect(result.kind).toBe('plan');
    if (result.kind !== 'plan') return;
    expect(result.plan.days.map((d) => d.kind)).toEqual([
      'training', 'easy', 'rest', 'training', 'training', 'rest', 'rest',
    ]);
    expect(result.plan.days.map((d) => d.title)).toEqual([
      'Upper body', 'Easy day', 'Rest day', 'Upper body', 'Lower body', 'Rest day', 'Rest day',
    ]);
    expect(result.plan.notes).toContain(HISTORY_INCOMPLETE_NOTE);
  });

  it('drops the incomplete-history note once the untagged session is tagged', () => {
    const result = run(answered, DEFAULT_CHOICE, { 'd-wed-strength': 'lower' });
    expect(result.kind).toBe('plan');
    if (result.kind === 'plan') expect(result.plan.notes).not.toContain(HISTORY_INCOMPLETE_NOTE);
  });

  it('never builds a plan while a question is unanswered', () => {
    expect(run(initialScreening())).toMatchObject({ kind: 'blocked', reason: 'unanswered', message: UNANSWERED_MESSAGE });
    expect(run({ ...answered, redFlags: null })).toMatchObject({ kind: 'blocked', reason: 'unanswered' });
    expect(run({ ...answered, under18: null })).toMatchObject({ kind: 'blocked', reason: 'unanswered' });
    expect(run({ ...answered, medicalCondition: null })).toMatchObject({ kind: 'blocked', reason: 'unanswered' });
  });

  it('stops for each red flag, for under 18 and for a medical condition', () => {
    expect(run(toggleRedFlag(answered, 'dark-urine'))).toMatchObject({ kind: 'blocked', reason: 'red-flag' });
    expect(run({ ...answered, under18: true })).toMatchObject({ kind: 'blocked', reason: 'age' });
    expect(run({ ...answered, medicalCondition: true })).toMatchObject({ kind: 'blocked', reason: 'condition' });
  });

  it('declines a weight-loss goal and 6 or 7 days, and offers both so the reason can be seen', () => {
    expect(run(answered, { ...DEFAULT_CHOICE, goal: 'lose-weight' })).toMatchObject({ reason: 'request' });
    expect(run(answered, { ...DEFAULT_CHOICE, daysPerWeek: 6 })).toMatchObject({ reason: 'request' });
    expect(run(answered, { ...DEFAULT_CHOICE, daysPerWeek: 7 })).toMatchObject({ reason: 'request' });
    expect(GOAL_OPTIONS.map((o) => o.value)).toContain('lose-weight');
    expect(DAYS_OPTIONS.map((o) => o.value)).toEqual([3, 4, 5, 6, 7]);
  });

  it('builds a plan for every offered goal, days and equipment that the engine accepts', () => {
    for (const goal of ['muscle', 'strength']) {
      for (const daysPerWeek of [3, 4, 5]) {
        for (const equipment of EQUIPMENT_OPTIONS.map((o) => o.value)) {
          expect(run(answered, { goal, daysPerWeek, equipment }).kind, `${goal} ${daysPerWeek} ${equipment}`).toBe('plan');
        }
      }
    }
  });
});

describe('plan formatting', () => {
  it('labels plan days from the day after asOf', () => {
    expect(planDayHeading(DEMO_AS_OF, 1)).toBe('Sun · tomorrow');
    expect(planDayHeading(DEMO_AS_OF, 2)).toBe('Mon · in 2 days');
    expect(planDayHeading(DEMO_AS_OF, 7)).toBe('Sat · in 7 days');
  });

  it('words sets for reps and for timed holds', () => {
    expect(setsAndReps({ sets: 3, reps: '8 to 12' })).toBe('3 sets of 8 to 12 reps');
    expect(setsAndReps({ sets: 2, reps: '30 to 45 seconds' })).toBe('2 sets of 30 to 45 seconds');
  });

  it('defaults to a request the engine accepts', () => {
    expect(DEFAULT_CHOICE).toEqual({ goal: 'muscle', daysPerWeek: 4, equipment: 'gym' });
  });
});
