import { NOVELTY_WINDOW_DAYS } from './constants';
import {
  EXERCISES,
  fitsEquipment,
  tierOf,
  type Equipment,
  type Exercise,
  type Goal,
  type Pattern,
} from './exercises';
import {
  EASY_RECOVERY_WHY,
  EASY_REPEAT_WHY,
  EASY_TITLE,
  EFFORT_EASY,
  EFFORT_HOLD,
  EFFORT_NORMAL,
  FOCUS_TITLES,
  GOAL_WHY,
  HISTORY_INCOMPLETE_NOTE,
  LIGHTER_WEEK_NOTE,
  LIGHTER_WEEK_WHY,
  NOVEL_NOTE,
  REST_TITLE,
  REST_WHY,
  avoidRepeatWhy,
  easierPickNote,
  easyDaySoreWhy,
  fewerSetsNote,
  rampNote,
  swapWhy,
} from './planText';
import { recentRecoveryLevels, shouldDeload } from './recovery';
import { resolveSessions } from './soreness';
import { STRENGTH_SPORTS, normalizeSport } from './sportMuscleMap';
import {
  MUSCLES,
  type DayForecast,
  type Forecast,
  type Muscle,
  type Recovery,
  type RiskBand,
  type StrengthTag,
  type TaggedWorkout,
} from './types';

export interface PlanRequest {
  goal: Goal;
  daysPerWeek: 3 | 4 | 5;
  equipment: Equipment;
}

export type SessionKind = 'training' | 'easy' | 'rest';

export interface PlannedExercise {
  id: string;
  name: string;
  sets: number;
  reps: string;
  effort: string;
  note?: string;
}

export interface PlannedSession {
  /** Days after asOf: 1 is tomorrow. */
  day: number;
  kind: SessionKind;
  focus: StrengthTag | null;
  title: string;
  exercises: PlannedExercise[];
  why: string[];
}

export interface Plan {
  /** One entry for each of days 1 to 7. */
  days: PlannedSession[];
  /** Week-level decisions, for example a lighter week or a capped number of days. */
  notes: string[];
}

export interface PlanContext {
  forecast: Forecast;
  /** Workouts with any member-chosen tags already applied. */
  workouts: TaggedWorkout[];
  recovery: Recovery[];
  asOf: Date;
}

// Hand-set rules, uncalibrated. The rules layer decides; nothing here is a prediction of results.
const MIN_SETS = 2;
const SLOT_SHARE_MIN = 0.6;
const EASED_SLOT_WEIGHT = 0.5;
const PLAN_DAYS = 7;
/** The latest scheduled training day is day 6, so the forecast must reach it. */
const MIN_FORECAST_DAYS = 7;
const MS_PER_DAY = 86_400_000;

const SCHEDULE: Record<3 | 4 | 5, { days: number[]; focus: StrengthTag[] }> = {
  3: { days: [1, 3, 5], focus: ['full', 'full', 'full'] },
  4: { days: [1, 2, 4, 5], focus: ['upper', 'lower', 'upper', 'lower'] },
  5: { days: [1, 2, 3, 5, 6], focus: ['push', 'pull', 'lower', 'upper', 'lower'] },
};

const SLOTS: Record<StrengthTag, Pattern[]> = {
  lower: ['squat', 'hinge', 'lunge', 'calf', 'core'],
  upper: ['push-h', 'pull-h', 'push-v', 'pull-v', 'triceps'],
  push: ['push-h', 'push-v', 'delt', 'triceps', 'core'],
  pull: ['pull-v', 'pull-h', 'biceps', 'delt', 'core'],
  full: ['squat', 'push-h', 'pull-h', 'hinge', 'core'],
};

const ALTERNATES: Record<StrengthTag, StrengthTag[]> = {
  lower: ['upper'],
  upper: ['lower'],
  push: ['lower', 'pull'],
  pull: ['lower', 'push'],
  full: ['upper', 'lower'],
};

const COMPOUND: ReadonlySet<Pattern> = new Set<Pattern>([
  'squat',
  'hinge',
  'lunge',
  'push-h',
  'push-v',
  'pull-v',
  'pull-h',
]);

const BAND_RANK: Record<RiskBand, number> = { low: 0, moderate: 1, high: 2 };

function worstBand(day: DayForecast, muscles: Muscle[]): RiskBand {
  let worst: RiskBand = 'low';
  for (const m of muscles) if (BAND_RANK[day[m].band] > BAND_RANK[worst]) worst = day[m].band;
  return worst;
}

function soreMuscles(day: DayForecast, muscles: Muscle[]): Muscle[] {
  return muscles.filter((m) => day[m].band !== 'low');
}

/** The soreness rule: moderate blocks high-eccentric work; high allows only low-eccentric work. */
function allowed(exercise: Exercise, band: RiskBand): boolean {
  if (band === 'low') return true;
  if (band === 'moderate') return exercise.eccentric !== 'high';
  return exercise.eccentric === 'low';
}

function candidatesFor(pattern: Pattern, equipment: Equipment): Exercise[] {
  return EXERCISES.filter((e) => e.pattern === pattern && fitsEquipment(e, equipment)).sort(
    (a, b) => tierOf(b.equipment) - tierOf(a.equipment),
  );
}

interface Pick {
  exercise: Exercise;
  /** The preferred exercise for this slot was not allowed, so a gentler one was chosen. */
  easedPick: boolean;
  soreOfPreferred: Muscle[];
}

interface Attempt {
  focus: StrengthTag;
  picks: Pick[];
  share: number;
  sore: Muscle[];
}

function evaluate(
  focus: StrengthTag,
  dayForecast: DayForecast,
  equipment: Equipment,
  used: ReadonlySet<string>,
): Attempt {
  const slots = SLOTS[focus];
  const picks: Pick[] = [];
  const sore = new Set<Muscle>();
  for (const pattern of slots) {
    const candidates = candidatesFor(pattern, equipment);
    if (candidates.length === 0) continue;
    const preferred = candidates[0];
    const preferredSore = soreMuscles(dayForecast, preferred.primary);
    const ok = candidates.filter((e) => allowed(e, worstBand(dayForecast, e.primary)));
    const preferredBlocked = !allowed(preferred, worstBand(dayForecast, preferred.primary));
    if (preferredBlocked) preferredSore.forEach((m) => sore.add(m));
    if (ok.length === 0) continue;
    const chosen = ok.find((e) => !used.has(e.id)) ?? ok[0];
    picks.push({ exercise: chosen, easedPick: preferredBlocked, soreOfPreferred: preferredSore });
  }
  // An eased substitute is only half a slot: a session made mostly of substitutes is not the session asked for.
  const score = picks.reduce((total, p) => total + (p.easedPick ? EASED_SLOT_WEIGHT : 1), 0);
  return { focus, picks, share: score / slots.length, sore: [...sore] };
}

/** Training load per muscle over the novelty window. Untagged strength sessions add nothing. */
function recentLoad(workouts: TaggedWorkout[], asOf: Date): Partial<Record<Muscle, number>> {
  const since = asOf.getTime() - NOVELTY_WINDOW_DAYS * MS_PER_DAY;
  const load: Partial<Record<Muscle, number>> = {};
  for (const s of resolveSessions(workouts, asOf).sessions) {
    if (s.endMs < since) continue;
    for (const m of Object.keys(s.loads) as Muscle[]) load[m] = (load[m] ?? 0) + (s.loads[m] ?? 0);
  }
  return load;
}

function prescribe(
  pick: Pick,
  request: PlanRequest,
  dayForecast: DayForecast,
  novelMuscles: ReadonlySet<Muscle>,
  lighterWeek: boolean,
): PlannedExercise {
  const { exercise } = pick;
  const compound = COMPOUND.has(exercise.pattern);
  let sets = 3;
  let reps = compound ? '8 to 12' : '10 to 15';
  if (request.goal === 'strength' && compound && tierOf(exercise.equipment) >= 1) {
    sets = 4;
    reps = '4 to 6';
  } else if (request.goal === 'strength' && !compound) {
    reps = '8 to 12';
  }
  if (exercise.hold) reps = '30 to 45 seconds';

  const band = worstBand(dayForecast, exercise.primary);
  const notes: string[] = [];
  let eased = false;
  if (pick.easedPick) notes.push(easierPickNote(pick.soreOfPreferred));
  if (band !== 'low') {
    sets -= 1;
    notes.push(fewerSetsNote(soreMuscles(dayForecast, exercise.primary)));
    if (band === 'high') eased = true;
  }
  if (exercise.primary.every((m) => novelMuscles.has(m))) {
    sets -= 1;
    notes.push(NOVEL_NOTE);
  }
  if (lighterWeek) {
    sets -= 1;
    eased = true;
  }
  sets = Math.max(MIN_SETS, sets);

  const effort = eased ? EFFORT_EASY : exercise.hold ? EFFORT_HOLD : EFFORT_NORMAL;
  return {
    id: exercise.id,
    name: exercise.name,
    sets,
    reps,
    effort,
    ...(notes.length > 0 ? { note: notes.join(' ') } : {}),
  };
}

/** Strength sessions per week over the last 28 days, from the member's own history. */
function recentStrengthPerWeek(workouts: TaggedWorkout[], asOf: Date): number {
  const since = asOf.getTime() - NOVELTY_WINDOW_DAYS * MS_PER_DAY;
  const count = workouts.filter((w) => {
    const end = Date.parse(w.end);
    return STRENGTH_SPORTS.has(normalizeSport(w.sport_name)) && end >= since && end <= asOf.getTime();
  }).length;
  return count / (NOVELTY_WINDOW_DAYS / 7);
}

const restDay = (day: number): PlannedSession => ({
  day,
  kind: 'rest',
  focus: null,
  title: REST_TITLE,
  exercises: [],
  why: [REST_WHY],
});

const easyDay = (day: number, why: string): PlannedSession => ({
  day,
  kind: 'easy',
  focus: null,
  title: EASY_TITLE,
  exercises: [],
  why: [why],
});

export function buildPlan(request: PlanRequest, ctx: PlanContext): Plan {
  const { forecast, workouts, recovery, asOf } = ctx;
  if (forecast.byDay.length < MIN_FORECAST_DAYS) {
    throw new Error(`buildPlan needs a forecast of at least ${MIN_FORECAST_DAYS} days`);
  }
  const notes: string[] = [];
  // The plan's claims about the member's history are only as good as the workouts we could place.
  if (forecast.needsTag.length > 0 || forecast.unmappedSports.length > 0) {
    notes.push(HISTORY_INCOMPLETE_NOTE);
  }

  // Progressive cap: do not jump far above what the member has actually been doing.
  const cap = Math.max(3, Math.ceil(recentStrengthPerWeek(workouts, asOf)) + 2);
  const dayCount = Math.min(request.daysPerWeek, cap) as 3 | 4 | 5;
  if (dayCount < request.daysPerWeek) notes.push(rampNote(dayCount, request.daysPerWeek));
  const schedule = SCHEDULE[dayCount];

  const levels = recentRecoveryLevels(recovery, asOf);
  const lighterWeek = shouldDeload(levels);
  if (lighterWeek) notes.push(LIGHTER_WEEK_NOTE);
  const latestLow = levels.length > 0 && levels[levels.length - 1] === 'low';

  const load = recentLoad(workouts, asOf);
  const novelMuscles = new Set<Muscle>(MUSCLES.filter((m) => (load[m] ?? 0) === 0));

  const used = new Set<string>();
  const trainedFocus = new Map<number, StrengthTag>();
  const byDay = new Map<number, PlannedSession>();

  const accept = (
    day: number,
    attempt: Attempt,
    why: string[],
  ): PlannedSession => {
    for (const p of attempt.picks) used.add(p.exercise.id);
    trainedFocus.set(day, attempt.focus);
    const dayForecast = forecast.byDay[day];
    if (lighterWeek) why.push(LIGHTER_WEEK_WHY);
    return {
      day,
      kind: 'training',
      focus: attempt.focus,
      title: FOCUS_TITLES[attempt.focus],
      exercises: attempt.picks.map((p) => prescribe(p, request, dayForecast, novelMuscles, lighterWeek)),
      why,
    };
  };

  schedule.days.forEach((day, i) => {
    const focus = schedule.focus[i];
    if (i === 0 && latestLow) {
      byDay.set(day, easyDay(day, EASY_RECOVERY_WHY));
      return;
    }
    const dayForecast = forecast.byDay[day];
    const first = evaluate(focus, dayForecast, request.equipment, used);
    // A swap yesterday can leave today's scheduled focus equal to yesterday's. Never train it twice in a row.
    const repeatsYesterday = trainedFocus.get(day - 1) === focus;
    const tooSore = first.share < SLOT_SHARE_MIN;
    if (!repeatsYesterday && !tooSore) {
      byDay.set(day, accept(day, first, [GOAL_WHY[request.goal]]));
      return;
    }
    for (const alt of ALTERNATES[focus]) {
      if (trainedFocus.get(day - 1) === alt) continue;
      const attempt = evaluate(alt, dayForecast, request.equipment, used);
      if (attempt.share >= SLOT_SHARE_MIN) {
        const reason = tooSore ? swapWhy(focus, alt, first.sore.slice(0, 4)) : avoidRepeatWhy(focus, alt);
        byDay.set(day, accept(day, attempt, [GOAL_WHY[request.goal], reason]));
        return;
      }
    }
    byDay.set(day, easyDay(day, tooSore ? easyDaySoreWhy(first.sore.slice(0, 4)) : EASY_REPEAT_WHY));
  });

  const days: PlannedSession[] = [];
  for (let day = 1; day <= PLAN_DAYS; day++) days.push(byDay.get(day) ?? restDay(day));
  return { days, notes };
}
