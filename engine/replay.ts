import { Recovery, ReplayFile, StrengthTag, TaggedWorkout } from './types';

const TAGS: readonly StrengthTag[] = ['lower', 'upper', 'push', 'pull', 'full'];
const ZONE_KEYS = [
  'zone_zero_milli',
  'zone_one_milli',
  'zone_two_milli',
  'zone_three_milli',
  'zone_four_milli',
  'zone_five_milli',
] as const;

function fail(id: string, why: string): never {
  throw new Error(`Invalid replay file: workout ${id}: ${why}`);
}

function checkWorkout(w: unknown, i: number): TaggedWorkout {
  const o = w as Record<string, unknown>;
  const id = typeof o?.id === 'string' ? o.id : `#${i}`;
  if (typeof o !== 'object' || o === null) return fail(id, 'not an object');
  if (typeof o.id !== 'string') fail(id, 'id must be a string');
  if (typeof o.sport_name !== 'string') fail(id, 'sport_name must be a string');
  for (const key of ['start', 'end'] as const) {
    if (typeof o[key] !== 'string' || Number.isNaN(Date.parse(o[key] as string))) {
      fail(id, `${key} must be an ISO date string`);
    }
  }
  if (o.session_tag !== undefined && !TAGS.includes(o.session_tag as StrengthTag)) {
    fail(id, `unknown session_tag ${String(o.session_tag)}`);
  }
  if (o.score_state !== 'SCORED' && o.score_state !== 'PENDING_SCORE' && o.score_state !== 'UNSCORABLE') {
    fail(id, 'score_state must be SCORED, PENDING_SCORE or UNSCORABLE');
  }
  if (o.score_state === 'SCORED') {
    const zones = (o.score as Record<string, unknown> | undefined)?.zone_durations as
      | Record<string, unknown>
      | undefined;
    if (!zones) fail(id, 'SCORED workout is missing score.zone_durations');
    for (const k of ZONE_KEYS) {
      const v = zones[k];
      if (typeof v !== 'number' || !Number.isFinite(v) || v < 0) {
        fail(id, `zone_durations.${k} must be a non-negative finite number`);
      }
    }
  }
  return o as unknown as TaggedWorkout;
}

const STATES = ['SCORED', 'PENDING_SCORE', 'UNSCORABLE'];

function checkRecovery(r: unknown, i: number): Recovery {
  const o = r as Record<string, unknown>;
  const id = typeof o?.cycle_id === 'number' ? `cycle ${o.cycle_id}` : `#${i}`;
  const bad = (why: string): never => {
    throw new Error(`Invalid replay file: recovery ${id}: ${why}`);
  };
  if (typeof o !== 'object' || o === null) return bad('not an object');
  if (typeof o.created_at !== 'string' || Number.isNaN(Date.parse(o.created_at))) {
    bad('created_at must be an ISO date string');
  }
  if (!STATES.includes(o.score_state as string)) {
    bad('score_state must be SCORED, PENDING_SCORE or UNSCORABLE');
  }
  if (o.score_state === 'SCORED') {
    const score = (o.score as Record<string, unknown> | undefined)?.recovery_score;
    if (typeof score !== 'number' || !Number.isFinite(score) || score < 0 || score > 100) {
      bad('a SCORED recovery needs score.recovery_score between 0 and 100');
    }
  }
  return o as unknown as Recovery;
}

/** Validate untrusted JSON (a real export or the synthetic file). Extra keys are ignored. */
export function parseReplay(raw: unknown): ReplayFile {
  const o = raw as Record<string, unknown> | null;
  if (typeof o !== 'object' || o === null) throw new Error('Invalid replay file: not an object');
  if (typeof o.synthetic !== 'boolean') {
    throw new Error('Invalid replay file: "synthetic" must be true or false');
  }
  if (!Array.isArray(o.workouts)) throw new Error('Invalid replay file: "workouts" must be an array');
  const workouts = o.workouts.map(checkWorkout);
  if (o.recovery === undefined) return { synthetic: o.synthetic, workouts };
  if (!Array.isArray(o.recovery)) throw new Error('Invalid replay file: "recovery" must be an array');
  return { synthetic: o.synthetic, workouts, recovery: o.recovery.map(checkRecovery) };
}
