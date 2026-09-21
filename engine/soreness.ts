import {
  BAND_THRESHOLDS,
  DESCENT_M_PER_KM_AT_MAX,
  DRIVER_ECCENTRIC_MIN,
  DRIVER_HIGH_LOAD_MIN,
  DRIVER_NOVELTY_MIN,
  FORECAST_DAYS,
  HOURS_PER_DAY,
  MAX_DESCENT_ECCENTRIC_BONUS,
  NOVELTY_CAP,
  NOVELTY_WINDOW_DAYS,
  ZONE_WEIGHTS,
} from './constants';
import {
  MuscleWeights,
  SPORT_MUSCLE_MAP,
  STRENGTH_ECCENTRIC,
  STRENGTH_SPORTS,
  SportProfile,
  TAG_MUSCLES,
  normalizeSport,
} from './sportMuscleMap';
import { TIMECURVE_HORIZON_HOURS, timecurve } from './timecurve';
import {
  DayForecast,
  Driver,
  Forecast,
  MUSCLES,
  Muscle,
  RiskBand,
  Sensitivity,
  TaggedWorkout,
} from './types';

const MS_PER_HOUR = 3_600_000;
const MS_PER_DAY = HOURS_PER_DAY * MS_PER_HOUR;

/** One workout resolved to muscles: what it loads and how eccentric it is. */
interface Session {
  endMs: number;
  startMs: number;
  eccentric: number;
  loads: Partial<Record<Muscle, number>>;
}

export interface MuscleEvaluation {
  /** Summed contribution. For tests and calibration only; the UI shows bands. */
  score: number;
  drivers: Driver[];
}

export interface Resolved {
  sessions: Session[];
  needsTag: string[];
  unmappedSports: string[];
}

function weightedMinutes(w: TaggedWorkout): number {
  const z = w.score?.zone_durations;
  if (!z) return 0;
  const ms = [
    z.zone_zero_milli,
    z.zone_one_milli,
    z.zone_two_milli,
    z.zone_three_milli,
    z.zone_four_milli,
    z.zone_five_milli,
  ];
  return ms.reduce((sum, m, i) => sum + (m / 60_000) * ZONE_WEIGHTS[i], 0);
}

function eccentricFactor(profile: SportProfile | null, w: TaggedWorkout): number {
  if (!profile) return STRENGTH_ECCENTRIC;
  if (!profile.scalesWithDescent) return profile.eccentricBase;
  const s = w.score;
  const km = (s?.distance_meter ?? 0) / 1000;
  if (km <= 0) return profile.eccentricBase;
  // ASSUMPTION (unverified): altitude_change_meter is net change, so total
  // descent = gain - net change. Confirm against a real export.
  const descent = Math.max(0, (s?.altitude_gain_meter ?? 0) - (s?.altitude_change_meter ?? 0));
  const bonus = Math.min(descent / km / DESCENT_M_PER_KM_AT_MAX, 1) * MAX_DESCENT_ECCENTRIC_BONUS;
  return profile.eccentricBase + bonus;
}

function weightsFor(w: TaggedWorkout): { weights: MuscleWeights; profile: SportProfile | null } | 'needsTag' | 'unmapped' {
  const sport = normalizeSport(w.sport_name);
  if (STRENGTH_SPORTS.has(sport)) {
    if (!w.session_tag) return 'needsTag';
    return { weights: TAG_MUSCLES[w.session_tag], profile: null };
  }
  const profile = Object.prototype.hasOwnProperty.call(SPORT_MUSCLE_MAP, sport)
    ? SPORT_MUSCLE_MAP[sport]
    : undefined;
  if (!profile) return 'unmapped';
  return { weights: profile.muscles, profile };
}

/** Keep only scored workouts that ended by asOf, and resolve them to muscles. */
export function resolveSessions(workouts: TaggedWorkout[], asOf: Date): Resolved {
  const needsTag: string[] = [];
  const unmapped = new Set<string>();
  const sessions: Session[] = [];
  for (const w of workouts) {
    const endMs = Date.parse(w.end);
    if (w.score_state !== 'SCORED' || !w.score || endMs > asOf.getTime()) continue;
    const r = weightsFor(w);
    // A session the curve has already run out for changes nothing, so an untagged or unmapped one is not worth reporting.
    const stale = asOf.getTime() - endMs > TIMECURVE_HORIZON_HOURS * MS_PER_HOUR;
    if ((r === 'needsTag' || r === 'unmapped') && stale) continue;
    if (r === 'needsTag') {
      needsTag.push(w.id);
      continue;
    }
    if (r === 'unmapped') {
      unmapped.add(w.sport_name);
      continue;
    }
    const minutes = weightedMinutes(w);
    const loads: Partial<Record<Muscle, number>> = {};
    for (const m of MUSCLES) {
      const weight = r.weights[m];
      if (weight) loads[m] = minutes * weight;
    }
    sessions.push({
      startMs: Date.parse(w.start),
      endMs,
      eccentric: eccentricFactor(r.profile, w),
      loads,
    });
  }
  sessions.sort((a, b) => a.endMs - b.endMs);
  return { sessions, needsTag, unmappedSports: [...unmapped] } as Resolved;
}

function novelty(sessions: Session[], index: number, muscle: Muscle): number {
  const s = sessions[index];
  const load = s.loads[muscle] ?? 0;
  const windowStart = s.startMs - NOVELTY_WINDOW_DAYS * MS_PER_DAY;
  const prior: number[] = [];
  for (let i = 0; i < sessions.length; i++) {
    if (i === index) continue;
    const p = sessions[i];
    const pl = p.loads[muscle];
    if (pl && p.endMs <= s.startMs && p.endMs >= windowStart) prior.push(pl);
  }
  if (prior.length === 0) return NOVELTY_CAP;
  const mean = prior.reduce((a, b) => a + b, 0) / prior.length;
  return Math.min(load / mean, NOVELTY_CAP);
}

/** Score and drivers for every muscle at time `at`, from sessions already resolved. */
export function evaluateAt(
  sessions: Session[],
  at: Date,
  sensitivity: Sensitivity,
): Record<Muscle, MuscleEvaluation> {
  const out = {} as Record<Muscle, MuscleEvaluation>;
  for (const m of MUSCLES) {
    let score = 0;
    let top = { contribution: 0, novelty: 0, eccentric: 1, load: 0 };
    sessions.forEach((s, i) => {
      const load = s.loads[m];
      if (!load) return;
      const hours = (at.getTime() - s.endMs) / MS_PER_HOUR;
      const curve = timecurve(hours);
      if (curve === 0) return;
      const nov = novelty(sessions, i, m);
      const contribution = load * nov * s.eccentric * sensitivity[m] * curve;
      score += contribution;
      if (contribution > top.contribution) {
        top = { contribution, novelty: nov, eccentric: s.eccentric, load };
      }
    });
    const drivers: Driver[] = [];
    if (bandFor(score) !== 'low') {
      if (top.novelty >= DRIVER_NOVELTY_MIN) drivers.push('novel');
      if (top.eccentric >= DRIVER_ECCENTRIC_MIN) drivers.push('eccentric');
      if (top.load >= DRIVER_HIGH_LOAD_MIN) drivers.push('high-load');
    }
    out[m] = { score, drivers };
  }
  return out;
}

export function bandFor(score: number): RiskBand {
  if (score >= BAND_THRESHOLDS.high) return 'high';
  if (score >= BAND_THRESHOLDS.moderate) return 'moderate';
  return 'low';
}

/** Numeric evaluation at a single time. For tests and calibration. */
export function evaluateMuscles(
  workouts: TaggedWorkout[],
  at: Date,
  sensitivity: Sensitivity,
  asOf: Date = at,
): Record<Muscle, MuscleEvaluation> {
  return evaluateAt(resolveSessions(workouts, asOf).sessions, at, sensitivity);
}

/** `workouts` must come from `parseReplay` (or the scenario builders): the engine assumes validated input. */
export function computeForecast(
  workouts: TaggedWorkout[],
  asOf: Date,
  sensitivity: Sensitivity,
): Forecast {
  const { sessions, needsTag, unmappedSports } = resolveSessions(workouts, asOf);
  const byDay: DayForecast[] = [];
  for (let d = 0; d < FORECAST_DAYS; d++) {
    const at = new Date(asOf.getTime() + d * MS_PER_DAY);
    const evals = evaluateAt(sessions, at, sensitivity);
    const day = {} as DayForecast;
    for (const m of MUSCLES) {
      day[m] = { band: bandFor(evals[m].score), drivers: evals[m].drivers };
    }
    byDay.push(day);
  }
  return { byDay, needsTag, unmappedSports };
}
