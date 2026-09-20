# Plan Engine and Guardrails Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn the soreness forecast, recovery and a member's goals into a safe, explained 7-day training plan, with hard guardrails (red-flag screen, eligibility, request validation) in front of it. Pure TypeScript with tests; no UI.

**Architecture:** Five new pure modules under `/engine` (recovery levels, an exercise library, plan text, guardrails, the plan builder) plus small extensions to the recovery types and the replay parser. The rules layer decides everything; there is no LLM and no backend.

**Tech Stack:** TypeScript strict, Vitest, Expo SDK 57 project (unchanged), Git Bash on Windows. No new dependencies.

**Spec:** `docs/superpowers/specs/2026-09-20-plan-engine-design.md` (approved 2026-09-20). Builds on the engine spec and on B1/B2 (unmerged, stacked).

## Global Constraints

Every task's requirements include these, copied from the spec:

- All new code is pure TypeScript under `/engine`: **no React or Expo imports, no `Date.now()`** (`asOf` is an argument). The existing engine purity test scans the new files.
- **No UI, navigation or persistence** in this sub-project. Nothing under `app/` changes.
- **No LLM, no backend, no free-text input.** Plans and the "why" text are deterministic rules and templates.
- Soreness rules: band Low allows anything; Moderate blocks `high`-eccentric exercises and takes one set off; High allows only `low`-eccentric exercises, one set off, easier effort. A gentler substitute counts as half a slot; a session with under 60% filled slots is swapped (never to the same focus as the previous day) or becomes an easy day.
- Recovery zones (`low` 0 to 33, `medium` 34 to 66, `high` 67 to 100) are hand-set, unverified and uncalibrated constants in `engine/recovery.ts`; the WHOOP API docs do not define zones.
- Guardrails come first and in order: red flags, eligibility, request. Any red flag, under-18 or a medical condition means **no plan** and a message to talk to a clinician (or a clinician or qualified trainer). Requests outside 3 to 5 days, the two goals or the three equipment levels are declined with a reason.
- No supplements, diet, weight goals or medical claims. All plan and guardrail text lives in `engine/planText.ts` (and the red-flag questions in `engine/guardrails.ts`); a test scans those files for the banned words `diagnos`, `accura`, `clinical`, `prevent`, `cure`, `validated`, `treat`, `boost`, `oxygen`, `blood flow`, and for "reduce soreness" / "relieve soreness" outside a line saying it has "not been shown".
- The exercise library and rules are hand-written training guidance needing a trainer or PT review before any demo; say so in code comments as written.
- **Do not link a git remote.** The user does that.
- Commit messages end with the line `Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>`.

**Working directory for every command:** `C:\Users\priya\Desktop\Sore Spot` (Git Bash path `/c/Users/priya/Desktop/Sore Spot`). Baseline: branch `feat/plan-engine` (stacked on `feat/checkin-mobility`), 123 tests in 17 files passing, `npm run typecheck` clean. The SDD controller creates any working branch.

**Line endings:** this repo's working tree has Windows line endings. For every file below marked "replace whole file", overwrite the entire file with the block shown using the file-writing tool. Do not use search-and-replace edits: multi-line matches silently fail on Windows line endings.

**How these files were produced:** every block was first run in a scratch copy: 188 Vitest tests passing, `tsc --strict` clean, `expo export --platform web` building. The plan rules were exercised against the real engine on the demo week (the printed plan matches the spec), and eight key rules were mutation-checked (moderate-band rule, half-slot weighting, back-to-back swap rule, lighter week, days cap, red flags, recovery carry-over, recovery boundary): each was broken on purpose and caught by the intended test. Copy the blocks exactly.

## File Structure

```
engine/types.ts (whole file)          + Recovery, RecoveryScore; ReplayFile.recovery?          (Task 1)
engine/replay.ts (whole file)         + validates recovery when present                       (Task 1)
engine/recovery.ts                    RecoveryLevel, recoveryLevel, recentRecoveryLevels, shouldDeload   (Task 1)
data/replay.synthetic.ts (whole file) + six synthetic morning recoveries                       (Task 1)
engine/replay.test.ts (whole file)    extra-key example is now `sleep`, not `recovery`         (Task 1)
engine/recovery.test.ts, engine/replay.recovery.test.ts                                        (Task 1)
engine/exercises.ts                   78 exercises, Goal/Pattern/Equipment/Eccentric, tierOf, fitsEquipment (Task 2)
engine/planText.ts                    every plan and guardrail string, muscle names             (Task 2)
engine/exercises.test.ts                                                                       (Task 2)
engine/plan.ts                        buildPlan and its types                                  (Task 3)
engine/plan.test.ts                                                                            (Task 3)
engine/guardrails.ts                  red flags, eligibility, request validation, planOrGuardrail (Task 4)
engine/index.ts (whole file)          + re-exports                                             (Task 4)
engine/guardrails.test.ts, engine/planText.test.ts                                             (Task 4)
```

---

### Task 1: Recovery data model, parsing and synthetic recovery

**Files:**
- Replace (whole file): `engine/types.ts`, `engine/replay.ts`, `data/replay.synthetic.ts`, `engine/replay.test.ts`
- Create: `engine/recovery.ts`
- Test: `engine/recovery.test.ts`, `engine/replay.recovery.test.ts`

**Interfaces:**
- Produces (used by Tasks 3 and 4):
  - `engine/types.ts`: `RecoveryScore` (`user_calibrating`, `recovery_score`, `resting_heart_rate`, `hrv_rmssd_milli`, optional `spo2_percentage`, `skin_temp_celsius`), `Recovery` (`cycle_id`, `sleep_id`, `user_id`, `created_at`, `updated_at`, `score_state`, optional `score`), `ReplayFile` gains `recovery?: Recovery[]`. Every existing export is unchanged. Field names were checked against developer.whoop.com/api on 2026-09-20.
  - `engine/recovery.ts`: `RecoveryLevel` (`'low'|'medium'|'high'`), `RECOVERY_LOW_MAX` (33), `RECOVERY_MEDIUM_MAX` (66), `DELOAD_LOW_COUNT` (3), `RECOVERY_WINDOW` (7), `recoveryLevel(score)`, `recentRecoveryLevels(recovery, asOf, count?)` (scored, created at or before `asOf`, oldest first, last `count`), `shouldDeload(levels)`.
  - `parseReplay` validates `recovery` when present and still accepts a replay without it.
  - `syntheticReplay.recovery`: six clearly synthetic morning records, Mon Sep 14 to Sat Sep 19, scores 82, 71, 58, 66, 31, 47 (levels high, high, medium, medium, low, medium).

The existing `engine/replay.test.ts` used `recovery: [{}]` as its example of an ignored extra top-level key. Recovery is now a validated field, so that example becomes `sleep: [{}]`; nothing else in the file changes.

- [ ] **Step 1: Write the failing tests**

Create `engine/recovery.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { syntheticReplay } from '../data/replay.synthetic';
import { recentRecoveryLevels, recoveryLevel, shouldDeload, type RecoveryLevel } from './recovery';
import type { Recovery } from './types';

const rec = (
  created: string,
  score: number,
  state: Recovery['score_state'] = 'SCORED',
): Recovery => ({
  cycle_id: 1,
  sleep_id: 'sleep',
  user_id: 0,
  created_at: created,
  updated_at: created,
  score_state: state,
  score:
    state === 'SCORED'
      ? { user_calibrating: false, recovery_score: score, resting_heart_rate: 55, hrv_rmssd_milli: 50 }
      : undefined,
});

describe('recoveryLevel', () => {
  it('splits scores at 33/34 and 66/67', () => {
    expect(recoveryLevel(0)).toBe('low');
    expect(recoveryLevel(33)).toBe('low');
    expect(recoveryLevel(34)).toBe('medium');
    expect(recoveryLevel(66)).toBe('medium');
    expect(recoveryLevel(67)).toBe('high');
    expect(recoveryLevel(100)).toBe('high');
  });
});

describe('recentRecoveryLevels', () => {
  const asOf = new Date('2026-09-19T20:00:00Z');

  it('returns the levels of scored recoveries up to asOf, oldest first', () => {
    const levels = recentRecoveryLevels(
      [rec('2026-09-18T06:00:00Z', 20), rec('2026-09-16T06:00:00Z', 90), rec('2026-09-17T06:00:00Z', 50)],
      asOf,
    );
    expect(levels).toEqual(['high', 'medium', 'low']);
  });

  it('ignores unscored records and anything created after asOf', () => {
    const levels = recentRecoveryLevels(
      [
        rec('2026-09-18T06:00:00Z', 0, 'PENDING_SCORE'),
        rec('2026-09-19T06:00:00Z', 40),
        rec('2026-09-20T06:00:00Z', 10),
      ],
      asOf,
    );
    expect(levels).toEqual(['medium']);
  });

  it('keeps only the most recent records when there are more than the window', () => {
    // Sep 1 to Sep 10: the first five are low, the last five are high.
    const many = Array.from({ length: 10 }, (_, i) =>
      rec(`2026-09-${String(i + 1).padStart(2, '0')}T06:00:00Z`, i < 5 ? 10 : 90),
    );
    const levels = recentRecoveryLevels(many, asOf, 3);
    expect(levels).toHaveLength(3);
    expect(levels.every((l) => l === 'high')).toBe(true);
  });

  it('does not mutate its input', () => {
    const input = [rec('2026-09-18T06:00:00Z', 20), rec('2026-09-16T06:00:00Z', 90)];
    const before = JSON.stringify(input);
    recentRecoveryLevels(input, asOf);
    expect(JSON.stringify(input)).toBe(before);
  });
});

describe('shouldDeload', () => {
  const levels = (...l: RecoveryLevel[]) => l;

  it('triggers at three low recoveries and not at two', () => {
    expect(shouldDeload(levels('low', 'low', 'high', 'medium'))).toBe(false);
    expect(shouldDeload(levels('low', 'low', 'high', 'low'))).toBe(true);
  });

  it('is false with no data', () => {
    expect(shouldDeload([])).toBe(false);
  });
});

describe('synthetic demo recovery', () => {
  it('has one scored recovery per morning, Mon Sep 14 to Sat Sep 19, ending medium', () => {
    const recovery = syntheticReplay.recovery ?? [];
    expect(recovery).toHaveLength(6);
    const levels = recentRecoveryLevels(recovery, new Date('2026-09-19T20:00:00Z'));
    expect(levels).toEqual(['high', 'high', 'medium', 'medium', 'low', 'medium']);
    expect(shouldDeload(levels)).toBe(false);
  });
});
```

Create `engine/replay.recovery.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { syntheticReplay } from '../data/replay.synthetic';
import { workout } from '../data/scenarios/builders';
import { parseReplay } from './replay';

const good = workout({
  id: 'w1',
  sport: 'running',
  start: '2026-09-10T07:00:00Z',
  zoneMinutes: [0, 10, 40, 10, 0, 0],
});

const recovery = {
  cycle_id: 1,
  sleep_id: 'sleep',
  user_id: 0,
  created_at: '2026-09-19T06:00:00Z',
  updated_at: '2026-09-19T06:00:00Z',
  score_state: 'SCORED',
  score: { user_calibrating: false, recovery_score: 47, resting_heart_rate: 55, hrv_rmssd_milli: 50 },
};

const parse = (r: unknown) => parseReplay({ synthetic: true, workouts: [good], recovery: r });

describe('parseReplay with recovery', () => {
  it('accepts the synthetic replay, recovery included, after a JSON round trip', () => {
    const parsed = parseReplay(JSON.parse(JSON.stringify(syntheticReplay)));
    expect(parsed.recovery).toHaveLength(6);
  });

  it('still accepts a replay with no recovery at all', () => {
    const parsed = parseReplay({ synthetic: true, workouts: [good] });
    expect(parsed.recovery).toBeUndefined();
  });

  it('accepts an unscored recovery without a score', () => {
    const parsed = parse([{ ...recovery, score_state: 'PENDING_SCORE', score: undefined }]);
    expect(parsed.recovery).toHaveLength(1);
  });

  it('rejects a recovery list that is not an array', () => {
    expect(() => parse({})).toThrow(/recovery/);
  });

  it('rejects a bad created_at, naming the cycle', () => {
    expect(() => parse([{ ...recovery, created_at: 'yesterday' }])).toThrow(/cycle 1.*created_at/);
  });

  it('rejects an unknown score_state', () => {
    expect(() => parse([{ ...recovery, score_state: 'scored' }])).toThrow(/score_state/);
  });

  it('rejects a scored recovery whose score is missing or outside 0 to 100', () => {
    expect(() => parse([{ ...recovery, score: {} }])).toThrow(/recovery_score/);
    expect(() => parse([{ ...recovery, score: { ...recovery.score, recovery_score: 101 } }])).toThrow(/between 0 and 100/);
    expect(() => parse([{ ...recovery, score: { ...recovery.score, recovery_score: -1 } }])).toThrow(/between 0 and 100/);
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run engine/recovery.test.ts engine/replay.recovery.test.ts`
Expected: FAIL. `recovery.test.ts` cannot resolve `./recovery`; `replay.recovery.test.ts` fails its rejection tests and the synthetic-recovery test because `parseReplay` ignores recovery and the data has none. Paste the real output.

- [ ] **Step 3: Write the implementation**

Replace `engine/types.ts` with:

```ts
export const MUSCLES = [
  'chest',
  'shoulders',
  'biceps',
  'triceps',
  'forearms',
  'upperBack',
  'core',
  'glutes',
  'quads',
  'hamstrings',
  'calves',
  'adductors',
] as const;

export type Muscle = (typeof MUSCLES)[number];
export type RiskBand = 'low' | 'moderate' | 'high';
export type Driver = 'novel' | 'eccentric' | 'high-load';
export type StrengthTag = 'lower' | 'upper' | 'push' | 'pull' | 'full';

/** WHOOP API v2 workout shapes (developer.whoop.com/api, checked 2026-09-19). */
export interface ZoneDurations {
  zone_zero_milli: number;
  zone_one_milli: number;
  zone_two_milli: number;
  zone_three_milli: number;
  zone_four_milli: number;
  zone_five_milli: number;
}

export interface WorkoutScore {
  strain: number;
  average_heart_rate: number;
  max_heart_rate: number;
  kilojoule: number;
  percent_recorded: number;
  distance_meter?: number;
  altitude_gain_meter?: number;
  altitude_change_meter?: number;
  zone_durations: ZoneDurations;
}

export interface Workout {
  id: string;
  v1_id?: number;
  user_id: number;
  created_at: string;
  updated_at: string;
  start: string;
  end: string;
  timezone_offset: string;
  sport_name: string;
  sport_id?: number;
  score_state: 'SCORED' | 'PENDING_SCORE' | 'UNSCORABLE';
  score?: WorkoutScore;
}

/** The API has no muscle data for strength work, so a session tag rides alongside. */
export interface TaggedWorkout extends Workout {
  session_tag?: StrengthTag;
}

/** WHOOP API v2 recovery shapes (developer.whoop.com/api, checked 2026-09-20). */
export interface RecoveryScore {
  user_calibrating: boolean;
  recovery_score: number;
  resting_heart_rate: number;
  hrv_rmssd_milli: number;
  spo2_percentage?: number;
  skin_temp_celsius?: number;
}

export interface Recovery {
  cycle_id: number;
  sleep_id: string;
  user_id: number;
  created_at: string;
  updated_at: string;
  score_state: 'SCORED' | 'PENDING_SCORE' | 'UNSCORABLE';
  score?: RecoveryScore;
}

export interface ReplayFile {
  synthetic: boolean;
  workouts: TaggedWorkout[];
  /** Optional: a real export adds it, and so does the synthetic week. */
  recovery?: Recovery[];
}

export type Sensitivity = Record<Muscle, number>;

export interface MuscleState {
  band: RiskBand;
  drivers: Driver[];
}

export type DayForecast = Record<Muscle, MuscleState>;

export interface Forecast {
  /** byDay[d] is the state at asOf + d days. Day 0 is right now. */
  byDay: DayForecast[];
  /** Ids of strength workouts skipped because they have no session_tag. */
  needsTag: string[];
  /** sport_name values with no entry in the sport-to-muscle map. */
  unmappedSports: string[];
}
```

Replace `engine/replay.ts` with:

```ts
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
```

Create `engine/recovery.ts`:

```ts
import type { Recovery } from './types';

export type RecoveryLevel = 'low' | 'medium' | 'high';

// Hand-set constants. They follow WHOOP's public recovery colors, but the API documentation does not
// define recovery zones, so they are unverified and uncalibrated. This is the one place to change them.
export const RECOVERY_LOW_MAX = 33;
export const RECOVERY_MEDIUM_MAX = 66;

/** How many of the recent recoveries must be low before the week is made lighter. */
export const DELOAD_LOW_COUNT = 3;
export const RECOVERY_WINDOW = 7;

export function recoveryLevel(score: number): RecoveryLevel {
  if (score <= RECOVERY_LOW_MAX) return 'low';
  if (score <= RECOVERY_MEDIUM_MAX) return 'medium';
  return 'high';
}

/** Levels of the most recent scored recoveries created at or before asOf, oldest first. */
export function recentRecoveryLevels(
  recovery: Recovery[],
  asOf: Date,
  count: number = RECOVERY_WINDOW,
): RecoveryLevel[] {
  return recovery
    .filter((r) => r.score_state === 'SCORED' && r.score && Date.parse(r.created_at) <= asOf.getTime())
    .sort((a, b) => Date.parse(a.created_at) - Date.parse(b.created_at))
    .slice(-count)
    .map((r) => recoveryLevel(r.score!.recovery_score));
}

/** True when enough of the recent recoveries were low that the week should be lighter. */
export function shouldDeload(levels: RecoveryLevel[]): boolean {
  return levels.filter((l) => l === 'low').length >= DELOAD_LOW_COUNT;
}
```

Replace `data/replay.synthetic.ts` with:

```ts
import type { Recovery, ReplayFile, TaggedWorkout } from '../engine/types';
import { workout } from './scenarios/builders';

// SYNTHETIC demo data. Not from a real WHOOP account. Same shape as the real export.

type Zones = [number, number, number, number, number, number];
const easyRun: Zones = [0, 5, 20, 5, 0, 0]; // 30 min
const lowerDay: Zones = [0, 10, 30, 15, 5, 0]; // 60 min
const hillyRun: Zones = [0, 10, 50, 20, 5, 0]; // 85 min
const match: Zones = [0, 10, 20, 20, 10, 0]; // 60 min

const easy = (id: string, date: string): TaggedWorkout =>
  workout({
    id, sport: 'running', start: `${date}T07:00:00Z`, zoneMinutes: easyRun,
    distanceKm: 5, altitudeGainM: 15, altitudeChangeM: 0,
  });

const legs = (id: string, date: string): TaggedWorkout =>
  workout({ id, sport: 'weightlifting', tag: 'lower', start: `${date}T17:00:00Z`, zoneMinutes: lowerDay });

// Four weeks of routine: easy runs Tue and Thu, leg day Tue. Gives novelty a baseline.
const history: TaggedWorkout[] = [
  easy('h-run-01', '2026-08-18'), legs('h-legs-01', '2026-08-18'), easy('h-run-02', '2026-08-20'),
  easy('h-run-03', '2026-08-25'), legs('h-legs-02', '2026-08-25'), easy('h-run-04', '2026-08-27'),
  easy('h-run-05', '2026-09-01'), legs('h-legs-03', '2026-09-01'), easy('h-run-06', '2026-09-03'),
  easy('h-run-07', '2026-09-08'), legs('h-legs-04', '2026-09-08'), easy('h-run-08', '2026-09-10'),
];

// Demo week, Mon Sep 14 to Sun Sep 20. Sun is a rest day. The Wed strength session has no tag on purpose:
// the engine will not guess which muscles it worked, so the app asks.
const demoWeek: TaggedWorkout[] = [
  easy('d-mon-run', '2026-09-14'),
  legs('d-tue-legs', '2026-09-15'),
  workout({ id: 'd-wed-strength', sport: 'weightlifting', start: '2026-09-16T17:00:00Z', zoneMinutes: lowerDay }),
  easy('d-thu-run', '2026-09-17'),
  workout({
    id: 'd-fri-hilly-run', sport: 'running', start: '2026-09-18T07:00:00Z', zoneMinutes: hillyRun,
    distanceKm: 14, altitudeGainM: 700, altitudeChangeM: 0,
  }),
  workout({ id: 'd-sat-soccer', sport: 'soccer', start: '2026-09-19T18:00:00Z', zoneMinutes: match }),
];

// One synthetic recovery per morning, Mon Sep 14 to Sat Sep 19. Not from a real WHOOP account.
const morning = (date: string, cycleId: number, score: number): Recovery => ({
  cycle_id: cycleId,
  sleep_id: `synthetic-sleep-${cycleId}`,
  user_id: 0,
  created_at: `${date}T06:00:00Z`,
  updated_at: `${date}T06:00:00Z`,
  score_state: 'SCORED',
  score: {
    user_calibrating: false,
    recovery_score: score,
    resting_heart_rate: 52 + Math.round((100 - score) / 10),
    hrv_rmssd_milli: 40 + Math.round(score / 2),
  },
});

const demoRecovery: Recovery[] = [
  morning('2026-09-14', 900001, 82),
  morning('2026-09-15', 900002, 71),
  morning('2026-09-16', 900003, 58),
  morning('2026-09-17', 900004, 66),
  morning('2026-09-18', 900005, 31),
  morning('2026-09-19', 900006, 47),
];

export const syntheticReplay: ReplayFile = {
  synthetic: true,
  workouts: [...history, ...demoWeek],
  recovery: demoRecovery,
};
```

Replace `engine/replay.test.ts` with:

```ts
import { describe, expect, it } from 'vitest';
import { workout } from '../data/scenarios/builders';
import { parseReplay } from './replay';

const good = workout({
  id: 'w1', sport: 'running', start: '2026-09-10T07:00:00Z', zoneMinutes: [0, 10, 40, 10, 0, 0],
});

describe('parseReplay', () => {
  it('accepts builder workouts and ignores extra top-level keys', () => {
    const parsed = parseReplay({ synthetic: false, workouts: [good], sleep: [{}] });
    expect(parsed.synthetic).toBe(false);
    expect(parsed.workouts).toHaveLength(1);
  });

  it('accepts a JSON round trip of a builder workout', () => {
    const parsed = parseReplay(JSON.parse(JSON.stringify({ synthetic: true, workouts: [good] })));
    expect(parsed.workouts[0].id).toBe('w1');
  });

  it('rejects a file without a boolean synthetic flag', () => {
    expect(() => parseReplay({ workouts: [] })).toThrow(/synthetic/);
  });

  it('rejects a file whose workouts is not an array', () => {
    expect(() => parseReplay({ synthetic: true, workouts: {} })).toThrow(/workouts/);
  });

  it('rejects a workout with a bad date, naming the workout', () => {
    const bad = { ...good, start: 'not a date' };
    expect(() => parseReplay({ synthetic: true, workouts: [bad] })).toThrow(/w1.*start/);
  });

  it('rejects a SCORED workout with missing zone durations', () => {
    const bad = { ...good, score: { strain: 1 } };
    expect(() => parseReplay({ synthetic: true, workouts: [bad] })).toThrow(/zone_durations/);
  });

  it('rejects an unknown session_tag', () => {
    const bad = { ...good, session_tag: 'legs' };
    expect(() => parseReplay({ synthetic: true, workouts: [bad] })).toThrow(/session_tag/);
  });

  it('accepts an unscored workout without a score', () => {
    const pending = { ...good, score_state: 'PENDING_SCORE', score: undefined };
    expect(parseReplay({ synthetic: true, workouts: [pending] }).workouts).toHaveLength(1);
  });

  it('rejects a workout whose score_state is misspelled', () => {
    const bad = { ...good, score_state: 'scored' };
    expect(() => parseReplay({ synthetic: true, workouts: [bad] })).toThrow(/score_state/);
  });

  it('rejects a workout with no score_state', () => {
    const bad = { ...good, score_state: undefined };
    expect(() => parseReplay({ synthetic: true, workouts: [bad] })).toThrow(/score_state/);
  });

  it('rejects a SCORED workout with a negative zone duration', () => {
    const bad = {
      ...good,
      score: { ...good.score!, zone_durations: { ...good.score!.zone_durations, zone_two_milli: -1 } },
    };
    expect(() => parseReplay({ synthetic: true, workouts: [bad] })).toThrow(/zone_durations.*non-negative/);
  });

  it('rejects a SCORED workout with a non-finite zone duration', () => {
    const bad = {
      ...good,
      score: {
        ...good.score!,
        zone_durations: { ...good.score!.zone_durations, zone_one_milli: Number.POSITIVE_INFINITY },
      },
    };
    expect(() => parseReplay({ synthetic: true, workouts: [bad] })).toThrow(/zone_durations/);
  });
});
```

- [ ] **Step 4: Run the whole suite and typecheck**

Run: `npm test && npm run typecheck`
Expected: 19 test files, 138 tests pass (the 123 existing plus 8 recovery and 7 recovery-parsing tests); typecheck prints no errors.

- [ ] **Step 5: Commit**

```bash
git add engine data
git commit -m "$(cat <<'EOF'
Add recovery types, replay validation, recovery levels and synthetic recovery

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 2: Exercise library and plan text

**Files:**
- Create: `engine/exercises.ts`, `engine/planText.ts`
- Test: `engine/exercises.test.ts`

**Interfaces:**
- Consumes: `Muscle`, `StrengthTag`, `MUSCLES` from `engine/types.ts`.
- Produces (used by Tasks 3 and 4):
  - `engine/exercises.ts`: `Equipment` (`'bodyweight'|'dumbbells'|'gym'`), `Goal` (`'muscle'|'strength'`), `Eccentric` (`'low'|'moderate'|'high'`), `Pattern` (12 patterns), `Exercise` (`{ id, name, pattern, primary: Muscle[], eccentric, equipment, hold? }`), `EXERCISES: readonly Exercise[]` (78), `tierOf(equipment): number`, `fitsEquipment(exercise, have): boolean`.
  - `engine/planText.ts`: `MUSCLE_NAMES`, `listMuscles`, `FOCUS_TITLES`, `REST_TITLE`, `EASY_TITLE`, `REST_WHY`, `GOAL_WHY`, `EFFORT_NORMAL`, `EFFORT_HOLD`, `EFFORT_EASY`, `NOVEL_NOTE`, `fewerSetsNote`, `easierPickNote`, `swapWhy`, `easyDaySoreWhy`, `EASY_RECOVERY_WHY`, `LIGHTER_WEEK_WHY`, `LIGHTER_WEEK_NOTE`, `rampNote`, `PLAN_DISCLAIMER`, and the guardrail messages `RED_FLAG_MESSAGE`, `UNDER_18_MESSAGE`, `MEDICAL_CONDITION_MESSAGE`, `DECLINE_DAYS`, `DECLINE_GOAL`, `DECLINE_EQUIPMENT`.

The eccentric tags and the order of preference inside each pattern are hand-assigned (the file says so). Three gentle exercises (`pike-hold`, `prone-swimmer`, `incline-close-grip-push-up`) exist so that a sore member always has a low-eccentric option; the library test enforces that. The plan text is scanned for banned words in Task 4.

- [ ] **Step 1: Write the failing test**

Create `engine/exercises.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import {
  EXERCISES,
  fitsEquipment,
  tierOf,
  type Equipment,
  type Pattern,
} from './exercises';
import { MUSCLES } from './types';

const PATTERNS: Pattern[] = [
  'squat',
  'hinge',
  'lunge',
  'calf',
  'push-h',
  'push-v',
  'delt',
  'pull-v',
  'pull-h',
  'biceps',
  'triceps',
  'core',
];
const LEVELS: Equipment[] = ['bodyweight', 'dumbbells', 'gym'];

describe('exercise library', () => {
  it('has 60 to 80 exercises with unique ids and names', () => {
    expect(EXERCISES.length).toBeGreaterThanOrEqual(60);
    expect(EXERCISES.length).toBeLessThanOrEqual(80);
    expect(new Set(EXERCISES.map((e) => e.id)).size).toBe(EXERCISES.length);
    expect(new Set(EXERCISES.map((e) => e.name)).size).toBe(EXERCISES.length);
  });

  it('gives every exercise a name, primary muscles from the engine, and valid tags', () => {
    for (const e of EXERCISES) {
      expect(e.name.trim().length, e.id).toBeGreaterThan(0);
      expect(e.primary.length, e.id).toBeGreaterThan(0);
      for (const m of e.primary) expect(MUSCLES, `${e.id}/${m}`).toContain(m);
      expect(['low', 'moderate', 'high'], e.id).toContain(e.eccentric);
      expect(LEVELS, e.id).toContain(e.equipment);
      expect(PATTERNS, e.id).toContain(e.pattern);
    }
  });

  it('trains all 12 muscles as a primary muscle somewhere', () => {
    const covered = new Set(EXERCISES.flatMap((e) => e.primary));
    for (const m of MUSCLES) expect(covered.has(m), m).toBe(true);
  });

  it('has at least one exercise for every pattern at every equipment level', () => {
    for (const level of LEVELS) {
      for (const pattern of PATTERNS) {
        const n = EXERCISES.filter((e) => e.pattern === pattern && fitsEquipment(e, level)).length;
        expect(n, `${pattern} with ${level}`).toBeGreaterThan(0);
      }
    }
  });

  it('gives every pattern a gentle (low-eccentric) option at every equipment level', () => {
    for (const level of LEVELS) {
      for (const pattern of PATTERNS) {
        const gentle = EXERCISES.some(
          (e) => e.pattern === pattern && fitsEquipment(e, level) && e.eccentric === 'low',
        );
        expect(gentle || pattern === 'calf', `${pattern} with ${level}`).toBe(true);
      }
    }
  });

  it('tags the well-known lengthening-heavy movements as high and the isometric ones as low', () => {
    const ecc = (id: string) => EXERCISES.find((e) => e.id === id)?.eccentric;
    for (const id of ['rdl-bb', 'rdl-db', 'nordic-curl', 'walking-lunge-db', 'pull-up', 'dips', 'db-fly']) {
      expect(ecc(id), id).toBe('high');
    }
    for (const id of ['plank', 'hip-thrust-bb', 'glute-bridge', 'step-up', 'face-pull', 'farmer-carry']) {
      expect(ecc(id), id).toBe('low');
    }
  });

  it('marks holds as low-eccentric timed work', () => {
    for (const e of EXERCISES.filter((x) => x.hold)) expect(e.eccentric, e.id).toBe('low');
  });
});

describe('equipment tiers', () => {
  it('lets more equipment use everything less equipment can', () => {
    expect(tierOf('bodyweight')).toBeLessThan(tierOf('dumbbells'));
    expect(tierOf('dumbbells')).toBeLessThan(tierOf('gym'));
    const bw = EXERCISES.find((e) => e.equipment === 'bodyweight')!;
    const gym = EXERCISES.find((e) => e.equipment === 'gym')!;
    expect(fitsEquipment(bw, 'gym')).toBe(true);
    expect(fitsEquipment(gym, 'dumbbells')).toBe(false);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run engine/exercises.test.ts`
Expected: FAIL, with an error that `./exercises` cannot be resolved. Paste the real output.

- [ ] **Step 3: Write the implementation**

Create `engine/exercises.ts`:

```ts
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
  ex('walking-lunge-db', 'Dumbbell walking lunge', 'lunge', ['quads', 'glutes'], 'high', 'dumbbells'),
  ex('split-squat-db', 'Dumbbell split squat', 'lunge', ['quads', 'glutes'], 'high', 'dumbbells'),
  ex('rear-foot-split-squat', 'Rear-foot-elevated split squat', 'lunge', ['quads', 'glutes'], 'high', 'dumbbells'),
  ex('reverse-lunge', 'Reverse lunge', 'lunge', ['quads', 'glutes'], 'moderate', 'bodyweight'),
  ex('lateral-lunge', 'Lateral lunge', 'lunge', ['adductors', 'glutes', 'quads'], 'moderate', 'bodyweight'),
  ex('step-down', 'Slow step-down', 'lunge', ['quads', 'glutes'], 'high', 'bodyweight'),
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
  ex('pull-up', 'Pull-up', 'pull-v', ['upperBack', 'biceps'], 'high', 'gym'),
  ex('chin-up', 'Chin-up', 'pull-v', ['biceps', 'upperBack'], 'high', 'gym'),
  ex('lat-pulldown', 'Lat pulldown', 'pull-v', ['upperBack', 'biceps'], 'moderate', 'gym'),
  ex('straight-arm-pulldown', 'Straight-arm pulldown', 'pull-v', ['upperBack'], 'low', 'gym'),
  ex('db-pullover', 'Dumbbell pullover', 'pull-v', ['upperBack', 'chest'], 'moderate', 'dumbbells'),
  ex('prone-y-raise', 'Prone Y raise', 'pull-v', ['upperBack', 'shoulders'], 'low', 'bodyweight'),

  // Horizontal pull
  ex('bb-row', 'Barbell row', 'pull-h', ['upperBack', 'biceps'], 'moderate', 'gym'),
  ex('cable-row', 'Seated cable row', 'pull-h', ['upperBack', 'biceps'], 'moderate', 'gym'),
  ex('db-row', 'One-arm dumbbell row', 'pull-h', ['upperBack', 'biceps'], 'moderate', 'dumbbells'),
  ex('chest-supported-row', 'Chest-supported dumbbell row', 'pull-h', ['upperBack', 'biceps'], 'low', 'dumbbells'),
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
```

Create `engine/planText.ts`:

```ts
import type { Goal } from './exercises';
import type { Muscle, StrengthTag } from './types';

// Every user-facing string the plan engine can produce lives here (and the red-flag questions in
// guardrails.ts). A test scans these files for banned claims. Nothing here may claim a medical or health benefit.

export const MUSCLE_NAMES: Record<Muscle, string> = {
  chest: 'chest',
  shoulders: 'shoulders',
  biceps: 'biceps',
  triceps: 'triceps',
  forearms: 'forearms',
  upperBack: 'upper back',
  core: 'core',
  glutes: 'glutes',
  quads: 'quads',
  hamstrings: 'hamstrings',
  calves: 'calves',
  adductors: 'inner thighs',
};

/** "quads", "quads and glutes", "quads, glutes and hamstrings". */
export function listMuscles(muscles: Muscle[]): string {
  const names = muscles.map((m) => MUSCLE_NAMES[m]);
  if (names.length <= 1) return names.join('');
  return `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`;
}

export const FOCUS_TITLES: Record<StrengthTag, string> = {
  lower: 'Lower body',
  upper: 'Upper body',
  push: 'Push',
  pull: 'Pull',
  full: 'Full body',
};

export const REST_TITLE = 'Rest day';
export const EASY_TITLE = 'Easy day';
export const REST_WHY = 'Rest days are when your body adapts.';

export const GOAL_WHY: Record<Goal, string> = {
  muscle: 'Built for muscle: moderate weights and controlled reps.',
  strength: 'Built for strength: heavier weights and fewer reps on the main lifts.',
};

export const EFFORT_NORMAL = 'Stop 2 to 3 reps before failure.';
export const EFFORT_HOLD = 'Stop before your form slips.';
export const EFFORT_EASY = 'Keep it easy.';
export const NOVEL_NOTE = 'New for you: start light.';

export function fewerSetsNote(muscles: Muscle[]): string {
  return `Fewer sets: ${listMuscles(muscles)} predicted sore.`;
}

export function easierPickNote(muscles: Muscle[]): string {
  return `Chosen to go easy on ${listMuscles(muscles)}, which are predicted sore.`;
}

export function swapWhy(from: StrengthTag, to: StrengthTag, muscles: Muscle[]): string {
  return `Swapped ${FOCUS_TITLES[from]} for ${FOCUS_TITLES[to]}: ${listMuscles(muscles)} predicted sore that day.`;
}

export function easyDaySoreWhy(muscles: Muscle[]): string {
  return `Easy day: ${listMuscles(muscles)} predicted sore, so this day is for gentle movement instead of training.`;
}

export const EASY_RECOVERY_WHY = 'Easy day: your latest recovery was low, so start the week gently.';
export const LIGHTER_WEEK_WHY = 'Lighter week: several recent recoveries were low.';
export const LIGHTER_WEEK_NOTE =
  'Lighter week: several recent recoveries were low, so every exercise gets one set fewer.';

export function rampNote(days: number, requested: number): string {
  return `Building up: you have not trained this often lately, so the plan starts with ${days} training days instead of ${requested}.`;
}

export const PLAN_DISCLAIMER = 'General training guidance, not medical advice.';

// Guardrail messages
export const RED_FLAG_MESSAGE =
  'Sharp or localized pain, swelling, marked weakness, dark urine, numbness, or pain that keeps getting worse are not normal soreness. Stop training and see a clinician before continuing.';
export const UNDER_18_MESSAGE =
  'Training plans here are for adults. Please talk to a clinician or a qualified trainer.';
export const MEDICAL_CONDITION_MESSAGE =
  'With a medical condition, please talk to a clinician or a qualified trainer before following a plan.';
export const DECLINE_DAYS =
  'Plans cover 3 to 5 training days a week. More days leave too little time to recover.';
export const DECLINE_GOAL =
  'This app plans for building muscle or getting stronger. It does not plan for weight or body-composition goals.';
export const DECLINE_EQUIPMENT = 'Choose bodyweight, dumbbells or a gym.';
```

- [ ] **Step 4: Run the whole suite and typecheck**

Run: `npm test && npm run typecheck`
Expected: 20 test files, 146 tests pass (138 plus 8 exercise tests); typecheck prints no errors.

- [ ] **Step 5: Commit**

```bash
git add engine
git commit -m "$(cat <<'EOF'
Add exercise library and plan text

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 3: The plan builder

**Files:**
- Create: `engine/plan.ts`
- Test: `engine/plan.test.ts`

**Interfaces:**
- Consumes: everything from Tasks 1 and 2; `resolveSessions` from `engine/soreness.ts`; `STRENGTH_SPORTS`, `normalizeSport` from `engine/sportMuscleMap.ts`; `NOVELTY_WINDOW_DAYS` from `engine/constants.ts`; `Forecast`, `DayForecast`, `TaggedWorkout`, `Recovery`, `StrengthTag` from `engine/types.ts`.
- Produces (used by Task 4):
  - `PlanRequest` (`{ goal: Goal; daysPerWeek: 3|4|5; equipment: Equipment }`), `SessionKind` (`'training'|'easy'|'rest'`), `PlannedExercise` (`{ id, name, sets, reps, effort, note? }`), `PlannedSession` (`{ day, kind, focus: StrengthTag|null, title, exercises, why }`), `Plan` (`{ days: PlannedSession[7]; notes: string[] }`), `PlanContext` (`{ forecast, workouts, recovery, asOf }`), `buildPlan(request, ctx): Plan`.

`day` is days after `asOf` (1 is tomorrow), so `forecast.byDay[day]` is the soreness state for that day. `workouts` must already have any member-chosen tags applied. The rules, in order of effect: progressive cap on training days; carry-over easy day after a low recovery; lighter week after three low recoveries; per-exercise soreness rules (Low/Moderate/High); novelty (a set lighter for muscles with no load in 28 days); half-weight for substitutes and the 60% swap or easy-day rule. Constants (`MIN_SETS`, `SLOT_SHARE_MIN`, `EASED_SLOT_WEIGHT`) are hand-set and uncalibrated.

- [ ] **Step 1: Write the failing test**

Create `engine/plan.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { syntheticReplay } from '../data/replay.synthetic';
import { workout } from '../data/scenarios/builders';
import { EXERCISES, tierOf, type Equipment, type Goal } from './exercises';
import { buildPlan, type PlanRequest } from './plan';
import {
  EASY_RECOVERY_WHY,
  FOCUS_TITLES,
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
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run engine/plan.test.ts`
Expected: FAIL, with an error that `./plan` cannot be resolved. Paste the real output.

- [ ] **Step 3: Write the implementation**

Create `engine/plan.ts`:

```ts
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
  EASY_TITLE,
  EFFORT_EASY,
  EFFORT_HOLD,
  EFFORT_NORMAL,
  FOCUS_TITLES,
  GOAL_WHY,
  LIGHTER_WEEK_NOTE,
  LIGHTER_WEEK_WHY,
  NOVEL_NOTE,
  REST_TITLE,
  REST_WHY,
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
  const notes: string[] = [];

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
    if (first.share >= SLOT_SHARE_MIN) {
      byDay.set(day, accept(day, first, [GOAL_WHY[request.goal]]));
      return;
    }
    for (const alt of ALTERNATES[focus]) {
      if (trainedFocus.get(day - 1) === alt) continue;
      const attempt = evaluate(alt, dayForecast, request.equipment, used);
      if (attempt.share >= SLOT_SHARE_MIN) {
        byDay.set(day, accept(day, attempt, [GOAL_WHY[request.goal], swapWhy(focus, alt, first.sore.slice(0, 4))]));
        return;
      }
    }
    byDay.set(day, easyDay(day, easyDaySoreWhy(first.sore.slice(0, 4))));
  });

  const days: PlannedSession[] = [];
  for (let day = 1; day <= PLAN_DAYS; day++) days.push(byDay.get(day) ?? restDay(day));
  return { days, notes };
}
```

- [ ] **Step 4: Run the whole suite and typecheck**

Run: `npm test && npm run typecheck`
Expected: 21 test files, 169 tests pass (146 plus 23 plan tests); typecheck prints no errors. If a plan-scenario assertion fails after copying the code exactly, do not loosen the test or change constants: stop and report BLOCKED with the exact output.

- [ ] **Step 5: Commit**

```bash
git add engine
git commit -m "$(cat <<'EOF'
Add the soreness- and recovery-aware plan builder

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 4: Guardrails, plan-text scan and the public barrel

**Files:**
- Create: `engine/guardrails.ts`
- Replace (whole file): `engine/index.ts`
- Test: `engine/guardrails.test.ts`, `engine/planText.test.ts`

**Interfaces:**
- Consumes: `buildPlan`, `Plan`, `PlanContext`, `PlanRequest` from `engine/plan.ts`; `Equipment`, `Goal` from `engine/exercises.ts`; the guardrail messages from `engine/planText.ts`.
- Produces:
  - `engine/guardrails.ts`: `RedFlag` (six values), `RED_FLAGS`, `RED_FLAG_QUESTIONS`, `Blocked` (`{ kind: 'blocked'; reason: 'red-flag'|'age'|'condition'|'request'; message }`), `Eligibility` (`{ under18; medicalCondition }`), `RawRequest` (`{ goal: string; daysPerWeek: number; equipment: string }`), `screenRedFlags(selected)`, `checkEligibility(e)`, `validateRequest(raw)`, `PlanInput`, `PlanResult`, `planOrGuardrail(input)`.
  - `engine/index.ts` re-exports the recovery, exercise, plan and guardrail APIs and `PLAN_DISCLAIMER`, so the Plan screen (next sub-project) imports only from the barrel.

`planOrGuardrail` runs red flags, then eligibility, then request validation, and only then builds the plan. `engine/planText.test.ts` reads `planText.ts`, `guardrails.ts`, `plan.ts`, `exercises.ts` and `recovery.ts` from disk and scans them for banned words and for soreness-benefit phrasing; it needs `guardrails.ts` to exist, so it fails until Step 3.

- [ ] **Step 1: Write the failing tests**

Create `engine/guardrails.test.ts`:

```ts
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

  it('declines more or fewer days, and anything that is not a whole number of days', () => {
    for (const days of [6, 7, 2, 0, 3.5, NaN]) {
      expect(validateRequest({ goal: 'muscle', daysPerWeek: days, equipment: 'gym' }), String(days)).toEqual({
        ok: false,
        message: DECLINE_DAYS,
      });
    }
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
```

Create `engine/planText.test.ts`:

```ts
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { EXERCISES } from './exercises';
import {
  EASY_RECOVERY_WHY,
  LIGHTER_WEEK_NOTE,
  MUSCLE_NAMES,
  easyDaySoreWhy,
  listMuscles,
  rampNote,
  swapWhy,
} from './planText';
import { MUSCLES } from './types';

// Every user-facing plan and guardrail string lives in these files. Scan them the way the app source is scanned.
const BANNED = /diagnos|accura|clinical|prevent|cure|validated|treat|boost|oxygen|blood flow/i;
const SORENESS_CLAIM = /(reduce|relieve) soreness/i;
const NEGATED = /(not|n't) been shown/i;
const FILES = ['planText.ts', 'guardrails.ts', 'plan.ts', 'exercises.ts', 'recovery.ts'];

const sources = FILES.map((f) => ({ f, text: readFileSync(join(__dirname, f), 'utf8') }));

describe('plan text honesty scan', () => {
  it('reads all the plan engine source files', () => {
    for (const s of sources) expect(s.text.length, s.f).toBeGreaterThan(200);
  });

  it('never uses a banned word', () => {
    for (const s of sources) expect(s.text, s.f).not.toMatch(BANNED);
  });

  it('only mentions reducing or relieving soreness in a line that says it has not been shown', () => {
    for (const s of sources) {
      for (const line of s.text.split('\n')) {
        if (SORENESS_CLAIM.test(line)) expect(line, `${s.f}: ${line.trim()}`).toMatch(NEGATED);
      }
    }
  });

  it('keeps exercise names free of claims too', () => {
    for (const e of EXERCISES) expect(e.name, e.id).not.toMatch(BANNED);
  });
});

describe('plan text helpers', () => {
  it('names every muscle', () => {
    for (const m of MUSCLES) expect(MUSCLE_NAMES[m].length, m).toBeGreaterThan(0);
  });

  it('lists muscles in plain words', () => {
    expect(listMuscles([])).toBe('');
    expect(listMuscles(['quads'])).toBe('quads');
    expect(listMuscles(['quads', 'glutes'])).toBe('quads and glutes');
    expect(listMuscles(['quads', 'glutes', 'adductors'])).toBe('quads, glutes and inner thighs');
  });

  it('words swaps, easy days and notes without advice or claims', () => {
    expect(swapWhy('lower', 'upper', ['quads', 'glutes'])).toBe(
      'Swapped Lower body for Upper body: quads and glutes predicted sore that day.',
    );
    expect(easyDaySoreWhy(['calves'])).toBe(
      'Easy day: calves predicted sore, so this day is for gentle movement instead of training.',
    );
    expect(rampNote(3, 5)).toMatch(/3 training days instead of 5/);
    expect(EASY_RECOVERY_WHY).toMatch(/latest recovery was low/);
    expect(LIGHTER_WEEK_NOTE).toMatch(/one set fewer/);
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run engine/guardrails.test.ts engine/planText.test.ts`
Expected: FAIL. `guardrails.test.ts` cannot resolve `./guardrails`; `planText.test.ts` fails because `guardrails.ts` cannot be read. Paste the real output.

- [ ] **Step 3: Write the implementation**

Create `engine/guardrails.ts`:

```ts
import type { Equipment, Goal } from './exercises';
import { buildPlan, type Plan, type PlanContext, type PlanRequest } from './plan';
import {
  DECLINE_DAYS,
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
    return { ok: false, message: DECLINE_DAYS };
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
```

Replace `engine/index.ts` with:

```ts
export * from './types';
export { parseReplay } from './replay';
export { computeForecast } from './soreness';
export { applyCheckIn, defaultSensitivity } from './sensitivity';
export { timecurve } from './timecurve';
export { recoveryLevel, recentRecoveryLevels, shouldDeload, type RecoveryLevel } from './recovery';
export { EXERCISES, type Equipment, type Goal, type Pattern, type Exercise } from './exercises';
export { buildPlan, type Plan, type PlanRequest, type PlannedSession, type PlannedExercise, type SessionKind } from './plan';
export {
  RED_FLAGS,
  RED_FLAG_QUESTIONS,
  checkEligibility,
  planOrGuardrail,
  screenRedFlags,
  validateRequest,
  type Blocked,
  type Eligibility,
  type PlanInput,
  type PlanResult,
  type RawRequest,
  type RedFlag,
} from './guardrails';
export { PLAN_DISCLAIMER } from './planText';
```

- [ ] **Step 4: Run the whole suite, typecheck and the web build**

Run:
```bash
npm test
npm run typecheck
npx expo export --platform web --output-dir "C:/Users/priya/AppData/Local/Temp/c1acheck-dist"
```
Expected: 23 test files, 188 tests pass (169 plus 12 guardrail tests and 7 plan-text tests); typecheck prints no errors; the export ends with an `Exported:` line. Do not create a `dist` folder inside the project. Paste the real output.

- [ ] **Step 5: Commit**

```bash
git add engine
git commit -m "$(cat <<'EOF'
Add guardrails, plan-text scan and the public engine barrel

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

- [ ] **Step 6: Prove the red-flag guard can fail**

The guard is committed now, so `git checkout` restores it. Temporarily disable it, run its tests, then revert:
```bash
sed -i "s/if (selected.length === 0) return null;/return null;/" engine/guardrails.ts
npx vitest run engine/guardrails.test.ts
git checkout engine/guardrails.ts
npx vitest run engine/guardrails.test.ts
```
Expected: the first run FAILS on "blocks on any single red flag with the clinician message" and "checks red flags first, then eligibility, then the request"; after `git checkout`, the second run passes. Confirm `git status --short` shows `engine/guardrails.ts` clean and that there is nothing further to commit. Paste both outputs.

---

## Self-Review

**Spec coverage:**
- Inputs/outputs and the 7-day plan starting tomorrow: Task 3.
- Schedule (3/4/5 days), focus tags, slots per focus: Task 3 (with shape tests).
- Exercise library (78, tags, equipment tiers, gentle option per pattern): Task 2 (with tests).
- Soreness rules (Low/Moderate/High, half-slot weighting, 60% swap, no back-to-back same focus, easy day, reasons naming muscles): Task 3 (scenario, invariant over 18 combinations, mutation-checked).
- Recovery levels, carry-over, lighter week; novelty; progressive cap; base prescriptions: Tasks 1 and 3.
- Guardrails (red flags first, eligibility, request validation, order, no plan when blocked): Task 4.
- Plan text honesty scan and banned words: Task 4.
- Recovery types, parsing, synthetic recovery: Task 1.
- Non-goals respected: no UI, LLM, persistence or diet.
- Definition of done (the demo plan, the guardrail behaviors): covered by the plan and guardrail tests; the printed demo plan matches the spec.

**Type consistency:** every name is defined once (Tasks 1-4) and used with the same signature later, because all blocks come from one verified copy.

**Known limits, stated plainly:** the exercise library, eccentric tags and rules are hand-written and uncalibrated, so they need a trainer or PT review. Recovery zones are unverified. The plan starts tomorrow, so today's recovery affects it only through carry-over and the lighter-week rule. There is no UI yet (the next sub-project).
