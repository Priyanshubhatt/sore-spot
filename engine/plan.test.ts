import { describe, expect, it } from 'vitest';
import { syntheticReplay } from '../data/replay.synthetic';
import { workout } from '../data/scenarios/builders';
import { EXERCISES, tierOf, type Equipment, type Goal } from './exercises';
import { buildPlan, type PlanRequest } from './plan';
import {
  EASY_RECOVERY_WHY,
  EASY_REPEAT_WHY,
  FOCUS_TITLES,
  HISTORY_INCOMPLETE_NOTE,
  LIGHTER_WEEK_NOTE,
  NOVEL_NOTE,
  REST_WHY,
  rampNote,
} from './planText';
import { defaultSensitivity } from './sensitivity';
import { computeForecast } from './soreness';
import {
  MUSCLES,
  type DayForecast,
  type Forecast,
  type Muscle,
  type Recovery,
  type RiskBand,
  type TaggedWorkout,
} from './types';

const ASOF = new Date('2026-09-19T20:00:00Z');
const MS_PER_DAY = 86_400_000;
const RANK: Record<RiskBand, number> = { low: 0, moderate: 1, high: 2 };

const dayOf = (band: RiskBand, overrides: Partial<Record<Muscle, RiskBand>> = {}): DayForecast =>
  Object.fromEntries(
    MUSCLES.map((m) => [m, { band: overrides[m] ?? band, drivers: [] }]),
  ) as unknown as DayForecast;
const forecastOf = (days: DayForecast[]): Forecast => ({ byDay: days, needsTag: [], unmappedSports: [] });
const flat = (band: RiskBand): Forecast => forecastOf(Array.from({ length: 8 }, () => dayOf(band)));

const LOWER: Muscle[] = ['quads', 'glutes', 'hamstrings', 'calves', 'adductors'];
const UPPER: Muscle[] = ['chest', 'shoulders', 'biceps', 'triceps', 'forearms', 'upperBack'];

const high = (muscles: Muscle[]): Partial<Record<Muscle, RiskBand>> =>
  Object.fromEntries(muscles.map((m) => [m, 'high'])) as Partial<Record<Muscle, RiskBand>>;
/** Everything Low except the muscles named for each day index. */
const withBands = (perDay: Record<number, Partial<Record<Muscle, RiskBand>>>): Forecast =>
  forecastOf(Array.from({ length: 8 }, (_, d) => dayOf('low', perDay[d] ?? {})));

/** Twelve tagged strength sessions over the last 24 days: about 3 a week, every muscle trained. */
const richHistory = (): TaggedWorkout[] =>
  Array.from({ length: 12 }, (_, i) =>
    workout({
      id: `h${i}`,
      sport: 'weightlifting',
      tag: i % 2 === 0 ? 'upper' : 'lower',
      start: new Date(ASOF.getTime() - (2 + i * 2) * MS_PER_DAY).toISOString(),
      zoneMinutes: [0, 10, 30, 15, 5, 0],
    }),
  );

const rec = (daysAgo: number, score: number): Recovery => ({
  cycle_id: daysAgo,
  sleep_id: 'sleep',
  user_id: 0,
  created_at: new Date(ASOF.getTime() - daysAgo * MS_PER_DAY).toISOString(),
  updated_at: new Date(ASOF.getTime() - daysAgo * MS_PER_DAY).toISOString(),
  score_state: 'SCORED',
  score: { user_calibrating: false, recovery_score: score, resting_heart_rate: 55, hrv_rmssd_milli: 50 },
});

const request = (
  goal: Goal = 'muscle',
  daysPerWeek: 3 | 4 | 5 = 4,
  equipment: Equipment = 'gym',
): PlanRequest => ({ goal, daysPerWeek, equipment });

const demoCtx = () => ({
  forecast: computeForecast(syntheticReplay.workouts, ASOF, defaultSensitivity()),
  workouts: syntheticReplay.workouts,
  recovery: syntheticReplay.recovery ?? [],
  asOf: ASOF,
});

const richCtx = (forecast: Forecast, recovery: Recovery[] = []) => ({
  forecast,
  workouts: richHistory(),
  recovery,
  asOf: ASOF,
});

const trainingDays = (plan: ReturnType<typeof buildPlan>) => plan.days.filter((d) => d.kind === 'training');
const exerciseOf = (id: string) => EXERCISES.find((e) => e.id === id)!;

describe('plan shape', () => {
  it('has one entry for each of days 1 to 7, with rest days that explain themselves', () => {
    const plan = buildPlan(request(), richCtx(flat('low')));
    expect(plan.days.map((d) => d.day)).toEqual([1, 2, 3, 4, 5, 6, 7]);
    for (const d of plan.days.filter((x) => x.kind === 'rest')) {
      expect(d.exercises).toEqual([]);
      expect(d.why).toEqual([REST_WHY]);
    }
  });

  it('schedules 3, 4 and 5 training days from tomorrow with the documented focus', () => {
    const focus = (n: 3 | 4 | 5) =>
      buildPlan(request('muscle', n), richCtx(flat('low'))).days.map((d) => d.focus);
    expect(focus(3)).toEqual(['full', null, 'full', null, 'full', null, null]);
    expect(focus(4)).toEqual(['upper', 'lower', null, 'upper', 'lower', null, null]);
    expect(focus(5)).toEqual(['push', 'pull', 'lower', null, 'upper', 'lower', null]);
  });

  it('titles training days from their focus and gives each five slots when nothing is sore', () => {
    const plan = buildPlan(request('muscle', 4), richCtx(flat('low')));
    for (const d of trainingDays(plan)) {
      expect(d.title).toBe(FOCUS_TITLES[d.focus!]);
      expect(d.exercises).toHaveLength(5);
    }
  });
});

describe('the demo week (4 days, gym, muscle)', () => {
  const plan = buildPlan(request('muscle', 4, 'gym'), demoCtx());

  it('reads Sun upper, Mon easy, Wed upper, Thu lower, the rest resting', () => {
    expect(plan.days.map((d) => d.kind)).toEqual([
      'training',
      'easy',
      'rest',
      'training',
      'training',
      'rest',
      'rest',
    ]);
    expect(plan.days.map((d) => d.focus)).toEqual(['upper', null, null, 'upper', 'lower', null, null]);
  });

  it('makes Monday an easy day and names the sore muscles', () => {
    const monday = plan.days[1];
    expect(monday.exercises).toEqual([]);
    expect(monday.why[0]).toMatch(/^Easy day: .*quads.*predicted sore/);
  });

  it('adapts Thursday: keeps the squat, swaps the Romanian deadlift and the lunge for gentler moves', () => {
    const thursday = plan.days[4];
    const ids = thursday.exercises.map((e) => e.id);
    expect(ids).toContain('back-squat');
    expect(ids).toContain('hip-thrust-bb');
    expect(ids).toContain('reverse-lunge');
    expect(ids).not.toContain('rdl-bb');
    expect(ids).not.toContain('walking-lunge-db');
    const thrust = thursday.exercises.find((e) => e.id === 'hip-thrust-bb')!;
    expect(thrust.note).toMatch(/Chosen to go easy on/);
    expect(thrust.sets).toBe(2);
  });

  it('starts upper-body work light when the muscles are new to the member', () => {
    for (const e of plan.days[0].exercises) {
      expect(e.note).toContain(NOVEL_NOTE);
      expect(e.sets).toBe(2);
    }
  });
});

describe('soreness rules (the invariant)', () => {
  const goals: Goal[] = ['muscle', 'strength'];
  const days: (3 | 4 | 5)[] = [3, 4, 5];
  const levels: Equipment[] = ['bodyweight', 'dumbbells', 'gym'];

  it('never plans a high-eccentric exercise for a moderately sore muscle, nor a non-low one for a high muscle', () => {
    const ctx = demoCtx();
    for (const goal of goals) {
      for (const n of days) {
        for (const level of levels) {
          const plan = buildPlan(request(goal, n, level), ctx);
          for (const d of trainingDays(plan)) {
            const forecastDay = ctx.forecast.byDay[d.day];
            for (const e of d.exercises) {
              const ex = exerciseOf(e.id);
              const worst = ex.primary.reduce<RiskBand>(
                (w, m) => (RANK[forecastDay[m].band] > RANK[w] ? forecastDay[m].band : w),
                'low',
              );
              const label = `${goal}/${n}/${level} day ${d.day} ${ex.id}`;
              if (worst === 'moderate') expect(ex.eccentric, label).not.toBe('high');
              if (worst === 'high') expect(ex.eccentric, label).toBe('low');
            }
          }
        }
      }
    }
  });

  it('plans only low-eccentric exercises when everything is predicted high', () => {
    const plan = buildPlan(request('muscle', 5), richCtx(flat('high')));
    for (const d of plan.days) {
      for (const e of d.exercises) expect(exerciseOf(e.id).eccentric, e.id).toBe('low');
    }
  });

  it('makes a day easy when almost nothing about it is allowed, not a token session', () => {
    const plan = buildPlan(request('muscle', 4), richCtx(flat('high')));
    for (const d of plan.days.filter((x) => x.kind === 'training')) {
      expect(d.exercises.length).toBeGreaterThanOrEqual(3);
    }
    expect(plan.days.some((d) => d.kind === 'easy')).toBe(true);
  });

  it('never repeats the same focus on back-to-back days when it has to swap', () => {
    const plan = buildPlan(request('muscle', 4), demoCtx());
    for (let i = 1; i < plan.days.length; i++) {
      const prev = plan.days[i - 1];
      const cur = plan.days[i];
      if (prev.kind === 'training' && cur.kind === 'training') expect(cur.focus).not.toBe(prev.focus);
    }
  });
});

describe('swapping a session', () => {
  it('swaps Lower for Upper when the legs are sore that day and the day before was not upper', () => {
    const days = Array.from({ length: 8 }, (_, d) => (d === 3 ? dayOf('low', Object.fromEntries(LOWER.map((m) => [m, 'high']))) : dayOf('low')));
    const plan = buildPlan(request('muscle', 5), richCtx(forecastOf(days)));
    const day3 = plan.days[2];
    expect(day3.kind).toBe('training');
    expect(day3.focus).toBe('upper');
    expect(day3.why.some((w) => w.startsWith('Swapped Lower body for Upper body'))).toBe(true);
    expect(day3.why.join(' ')).toMatch(/quads/);
  });

  it('falls back to an easy day when the only alternate would repeat yesterday\'s focus', () => {
    const days = Array.from({ length: 8 }, (_, d) => (d === 2 ? dayOf('low', Object.fromEntries(LOWER.map((m) => [m, 'high']))) : dayOf('low')));
    const plan = buildPlan(request('muscle', 4), richCtx(forecastOf(days)));
    expect(plan.days[1].kind).toBe('easy'); // day 2 would be lower; day 1 was upper
  });
});

describe('recovery rules', () => {
  it('makes the first training day easy when the latest recovery is low', () => {
    const plan = buildPlan(request('muscle', 3), richCtx(flat('low'), [rec(1, 20)]));
    expect(plan.days[0].kind).toBe('easy');
    expect(plan.days[0].why).toEqual([EASY_RECOVERY_WHY]);
    expect(plan.days[2].kind).toBe('training');
  });

  it('does not ease anything when the latest recovery is fine', () => {
    const plan = buildPlan(request('muscle', 3), richCtx(flat('low'), [rec(1, 80)]));
    expect(plan.days[0].kind).toBe('training');
  });

  it('makes the week lighter after three low recoveries: one set fewer and easier effort', () => {
    const normal = buildPlan(request('muscle', 4), richCtx(flat('low'), [rec(1, 80)]));
    const lighter = buildPlan(request('muscle', 4), richCtx(flat('low'), [rec(1, 80), rec(3, 20), rec(4, 25), rec(5, 30)]));
    expect(lighter.notes).toContain(LIGHTER_WEEK_NOTE);
    expect(normal.notes).not.toContain(LIGHTER_WEEK_NOTE);
    const a = trainingDays(normal).flatMap((d) => d.exercises);
    const b = trainingDays(lighter).flatMap((d) => d.exercises);
    expect(b).toHaveLength(a.length);
    b.forEach((e, i) => {
      expect(e.sets).toBeLessThanOrEqual(a[i].sets);
      expect(e.sets).toBeGreaterThanOrEqual(2);
    });
    expect(b.some((e, i) => e.sets < a[i].sets)).toBe(true);
    expect(b.every((e) => e.effort === 'Keep it easy.')).toBe(true);
  });
});

describe('novelty and the days cap', () => {
  it('starts every exercise one set lighter when the member has no recent training', () => {
    const plan = buildPlan(request('muscle', 3), { forecast: flat('low'), workouts: [], recovery: [], asOf: ASOF });
    for (const d of trainingDays(plan)) {
      for (const e of d.exercises) {
        expect(e.note, e.id).toContain(NOVEL_NOTE);
        expect(e.sets, e.id).toBe(2);
      }
    }
  });

  it('does not treat trained muscles as new', () => {
    const plan = buildPlan(request('muscle', 4), richCtx(flat('low')));
    for (const d of trainingDays(plan)) {
      for (const e of d.exercises) expect(e.note ?? '', e.id).not.toContain(NOVEL_NOTE);
    }
  });

  it('caps the training days to what the member has been doing, and says so', () => {
    const capped = buildPlan(request('muscle', 5), { forecast: flat('low'), workouts: [], recovery: [], asOf: ASOF });
    expect(trainingDays(capped)).toHaveLength(3);
    expect(capped.notes).toContain(rampNote(3, 5));
    const rich = buildPlan(request('muscle', 5), richCtx(flat('low')));
    expect(trainingDays(rich)).toHaveLength(5);
    expect(rich.notes).toEqual([]);
  });
});

describe('equipment and goals', () => {
  it('uses only bodyweight exercises for a bodyweight plan and no gym equipment for dumbbells', () => {
    const bw = buildPlan(request('muscle', 4, 'bodyweight'), demoCtx());
    for (const e of trainingDays(bw).flatMap((d) => d.exercises)) {
      expect(tierOf(exerciseOf(e.id).equipment), e.id).toBe(0);
    }
    const db = buildPlan(request('muscle', 4, 'dumbbells'), demoCtx());
    for (const e of trainingDays(db).flatMap((d) => d.exercises)) {
      expect(tierOf(exerciseOf(e.id).equipment), e.id).toBeLessThanOrEqual(1);
    }
  });

  it('gives a strength plan heavier main lifts and a muscle plan moderate ones', () => {
    const strength = buildPlan(request('strength', 4, 'gym'), richCtx(flat('low')));
    const bench = strength.days[0].exercises.find((e) => e.id === 'bb-bench-press')!;
    expect(bench.sets).toBe(4);
    expect(bench.reps).toBe('4 to 6');
    const muscle = buildPlan(request('muscle', 4, 'gym'), richCtx(flat('low')));
    const bench2 = muscle.days[0].exercises.find((e) => e.id === 'bb-bench-press')!;
    expect(bench2.sets).toBe(3);
    expect(bench2.reps).toBe('8 to 12');
  });

  it('prescribes timed holds in seconds', () => {
    const plan = buildPlan(request('muscle', 4, 'bodyweight'), richCtx(flat('low')));
    const holds = trainingDays(plan).flatMap((d) => d.exercises).filter((e) => exerciseOf(e.id).hold);
    expect(holds.length).toBeGreaterThan(0);
    for (const e of holds) expect(e.reps).toBe('30 to 45 seconds');
  });
});

describe('swaps never leave the same focus on back-to-back days', () => {
  it('moves the next scheduled Lower to Upper after a swap to Lower, and says why', () => {
    const plan = buildPlan(request('muscle', 4), richCtx(withBands({ 1: high(UPPER) })));
    expect(plan.days.map((d) => d.focus)).toEqual(['lower', 'upper', null, 'upper', 'lower', null, null]);
    expect(plan.days[0].why.some((w) => w.startsWith('Swapped Upper body for Lower body'))).toBe(true);
    expect(plan.days[1].why.some((w) => /same muscles are not trained two days in a row/.test(w))).toBe(true);
  });

  it('falls back to an easy day when the only other focus is also sore', () => {
    const plan = buildPlan(request('muscle', 4), richCtx(withBands({ 1: high(UPPER), 2: high(UPPER) })));
    expect(plan.days[0].focus).toBe('lower');
    expect(plan.days[1].kind).toBe('easy');
    expect(plan.days[1].why).toEqual([EASY_REPEAT_WHY]);
  });

  it('holds across many sore-muscle scenarios and requests', () => {
    const scenarios = [
      withBands({ 1: high(UPPER) }),
      withBands({ 1: high(LOWER), 2: high(LOWER) }),
      withBands({ 3: high(LOWER), 5: high(UPPER) }),
      withBands({ 1: high(UPPER), 2: high(LOWER), 3: high(UPPER) }),
    ];
    for (const forecast of scenarios) {
      for (const n of [3, 4, 5] as const) {
        const plan = buildPlan(request('muscle', n), richCtx(forecast));
        for (let i = 1; i < plan.days.length; i++) {
          const prev = plan.days[i - 1];
          const cur = plan.days[i];
          if (prev.kind === 'training' && cur.kind === 'training') {
            expect(cur.focus, `${n} days, day ${cur.day}`).not.toBe(prev.focus);
          }
        }
      }
    }
  });
});

describe('a High-band muscle', () => {
  const plan = buildPlan(request('muscle', 4, 'dumbbells'), richCtx(withBands({ 2: high(['hamstrings']) })));
  const day2 = plan.days[1];

  it('gets a gentler hinge at fewer sets and easy effort, while other exercises stay normal', () => {
    expect(day2.kind).toBe('training');
    const thrust = day2.exercises.find((e) => e.id === 'hip-thrust-db')!;
    expect(thrust.effort).toBe('Keep it easy.');
    expect(thrust.sets).toBe(2);
    const squat = day2.exercises.find((e) => e.id === 'goblet-squat')!;
    expect(squat.effort).toBe('Stop 2 to 3 reps before failure.');
    expect(squat.sets).toBe(3);
  });

  it('is never loaded by a high-eccentric exercise that lists it, including the lunges', () => {
    for (const e of day2.exercises) {
      const ex = exerciseOf(e.id);
      if (ex.primary.includes('hamstrings')) expect(ex.eccentric, e.id).toBe('low');
    }
    const ids = day2.exercises.map((e) => e.id);
    for (const blocked of ['rdl-db', 'walking-lunge-db', 'split-squat-db', 'rear-foot-split-squat', 'step-down']) {
      expect(ids, blocked).not.toContain(blocked);
    }
  });
});

describe('inputs that could mislead', () => {
  it('names the problem when the forecast is too short instead of throwing a bare TypeError', () => {
    const short = forecastOf(Array.from({ length: 4 }, () => dayOf('low')));
    expect(() => buildPlan(request('muscle', 5), richCtx(short))).toThrow(/at least 7 days/);
  });

  it('qualifies the plan when some of the member\'s workouts could not be placed', () => {
    expect(buildPlan(request(), richCtx(flat('low'))).notes).not.toContain(HISTORY_INCOMPLETE_NOTE);
    const untagged = buildPlan(request(), richCtx({ ...flat('low'), needsTag: ['w1'] }));
    expect(untagged.notes).toContain(HISTORY_INCOMPLETE_NOTE);
    const unmapped = buildPlan(request(), richCtx({ ...flat('low'), unmappedSports: ['curling'] }));
    expect(unmapped.notes).toContain(HISTORY_INCOMPLETE_NOTE);
  });
});

describe('purity', () => {
  it('is deterministic and does not mutate its inputs', () => {
    const ctx = demoCtx();
    const before = JSON.stringify(ctx);
    const a = buildPlan(request('strength', 5, 'dumbbells'), ctx);
    const b = buildPlan(request('strength', 5, 'dumbbells'), ctx);
    expect(a).toEqual(b);
    expect(JSON.stringify(ctx)).toBe(before);
  });
});
