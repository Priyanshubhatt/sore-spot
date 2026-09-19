# Engine Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Scaffold Sore Spot as an Expo + TypeScript project whose deterministic soreness engine turns workout history into per-muscle, per-day risk bands, proven by tests and running in a browser and in Expo Go.

**Architecture:** One Expo package. `/engine` is plain TypeScript with no React or Expo imports; `/data` holds fixtures and a labeled synthetic replay; `/app` holds a single hello/debug screen. The engine is pure: `asOf` is always an argument, and real WHOOP data later drops in as `data/replay.json` with no adapter.

**Tech Stack:** Expo SDK 57 (`blank-typescript` template), React Native 0.86, TypeScript strict, Vitest, Node 22, Windows with Git Bash.

**Spec:** `docs/superpowers/specs/2026-09-19-engine-foundation-design.md` (approved 2026-09-19). Read it alongside this plan. Where this plan differs from the spec, Task 7 records the difference in the spec; the plan wins.

## Global Constraints

Every task's requirements include these, copied from the spec:

- Expo + TypeScript, **no backend**.
- `/engine` is pure TypeScript: **no React or Expo imports** (enforced by a test), and it **never calls `Date.now()`**: `asOf` is an argument.
- Output is **bands only**: `low | moderate | high`. No false-precision numbers in the UI-facing output.
- Thresholds and constants are **hand-tuned, uncalibrated, not validated**. Code comments and docs say so. No accuracy claims anywhere.
- Strength sessions without a session tag return `needsTag` and add **no soreness**. The engine never guesses.
- Sensitivity is clamped to **[0.5, 1.5]**.
- Replay files carry `synthetic: boolean`. Synthetic data is always labeled.
- 12 muscle zones: chest, shoulders, biceps, triceps, forearms, upperBack, core, glutes, quads, hamstrings, calves, adductors.
- `.gitignore` includes `.env`, `data/replay.json`, `*.token.json`.
- **Do not link a git remote.** The user does that.
- Commit messages end with the line `Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>`.

**Working directory for every command:** `C:\Users\priya\Desktop\Sore Spot` (Git Bash path `/c/Users/priya/Desktop/Sore Spot`). The repo already exists with one commit (the spec).

**How these files were produced:** every code block below was run first in a scratch project (40 Vitest tests, `tsc --strict`, and `expo export --platform web` all passing, with and without a `data/replay.json`). Copy them exactly.

## File Structure

```
package.json, tsconfig.json, app.json, index.ts, App.tsx, assets/   from the Expo template (Task 1)
vitest.config.ts                          Vitest scope: engine tests only        (Task 1)
engine/types.ts                           WHOOP v2 workout types + domain types  (Task 2)
engine/constants.ts                       every hand-tuned constant, labeled     (Task 2)
engine/replay.ts                          parseReplay: validates untrusted JSON  (Task 2)
data/scenarios/builders.ts                workout() builder for fixtures         (Task 2)
engine/timecurve.ts                       DOMS time course                       (Task 3)
engine/sportMuscleMap.ts                  sport -> muscle weights, tag mapping   (Task 3)
data/scenarios/scenarios.ts               hand-authored test scenarios           (Task 4)
engine/soreness.ts                        computeForecast, evaluateMuscles       (Task 4)
engine/sensitivity.ts                     defaultSensitivity, applyCheckIn       (Task 5)
data/replay.synthetic.ts                  labeled synthetic demo week            (Task 6)
engine/index.ts                           public barrel for the app              (Task 6)
engine/*.test.ts                          tests next to each unit                (Tasks 2-6)
data/index.ts                             loadReplay: local export or synthetic  (Task 7)
app/HelloScreen.tsx, App.tsx              engine check screen                    (Task 7)
```

---

### Task 1: Scaffold Expo, Vitest and .gitignore

**Files:**
- Create: `package.json`, `tsconfig.json`, `app.json`, `index.ts`, `App.tsx`, `assets/`, `.gitignore`, `AGENTS.md`, `CLAUDE.md` (copied from the template)
- Create: `vitest.config.ts`
- Modify: `.gitignore`, `package.json` (scripts)

**Interfaces:**
- Produces: `npm run typecheck`, `npm test` (Vitest, `engine/**/*.test.ts` only), `npx expo export --platform web`.

`create-expo-app` refuses a folder that already has files (`docs/`, `.git`), so scaffold in a temp folder and copy in only what we want. Do **not** copy the template's `.git`, its `.claude/settings.json` (it enables a Claude plugin), or its `LICENSE` (the GitHub repo has its own MIT license).

- [ ] **Step 1: Scaffold in a temp folder and copy the wanted files**

Run:
```bash
cd "/c/Users/priya/Desktop/Sore Spot"
TMP="$(mktemp -d)"
(cd "$TMP" && npx --yes create-expo-app@latest sore-spot --template blank-typescript --no-install)
SRC="$TMP/sore-spot"
cp -r "$SRC/App.tsx" "$SRC/index.ts" "$SRC/app.json" "$SRC/assets" "$SRC/package.json" "$SRC/tsconfig.json" "$SRC/.gitignore" "$SRC/AGENTS.md" "$SRC/CLAUDE.md" .
grep -E '"(expo|react-native|typescript)"' package.json
```
Expected: `Your project is ready!` from the scaffold, and `package.json` shows `"expo": "~57.x.x"`. Note the Expo SDK number; Task 7 checks that the App Store's Expo Go supports it. If the SDK is not 57, stop and tell the user before continuing, because the plan was verified on 57.

- [ ] **Step 2: Add the secret and health-data ignores**

Run:
```bash
printf '\n# Sore Spot: secrets and real health data. Never commit these.\n.env\ndata/replay.json\n*.token.json\n' >> .gitignore
tail -5 .gitignore
```
Expected: the last lines show `.env`, `data/replay.json`, `*.token.json`.

- [ ] **Step 3: Install dependencies**

Run:
```bash
npm install
npx expo install react-dom react-native-web
npm i -D vitest
```
Expected: all three finish. `npm audit` warnings are fine. (`react-dom` and `react-native-web` are required for the browser build; without them `expo export --platform web` fails with "don't have the required dependencies".)

- [ ] **Step 4: Add scripts and the Vitest config**

Run:
```bash
npm pkg set scripts.test="vitest run" scripts.typecheck="tsc --noEmit"
```

Create `vitest.config.ts`:

```ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: { environment: 'node', include: ['engine/**/*.test.ts'] },
});
```

- [ ] **Step 5: Verify the toolchain**

Run:
```bash
npm run typecheck
npx vitest run --passWithNoTests
npx expo export --platform web
```
Expected: typecheck prints no errors; Vitest reports no test files and exits 0; the export ends with `Exported: dist`. Then remove the build output and confirm git will not pick up `node_modules` or `dist`:
```bash
rm -rf dist
git status --short
```
Expected: the list shows only the files copied in Step 1, `package-lock.json` and `vitest.config.ts`. It does not show `node_modules/` or `dist/`.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "$(cat <<'EOF'
Scaffold Expo (SDK 57, blank-typescript) with Vitest

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 2: Types, constants, replay parser and fixture builder

**Files:**
- Create: `engine/types.ts`, `engine/constants.ts`, `engine/replay.ts`, `data/scenarios/builders.ts`
- Test: `engine/replay.test.ts`

**Interfaces:**
- Produces (used by every later task):
  - `engine/types.ts`: `MUSCLES`, `Muscle`, `RiskBand`, `Driver`, `StrengthTag`, `ZoneDurations`, `WorkoutScore`, `Workout`, `TaggedWorkout` (a `Workout` plus optional `session_tag`), `ReplayFile` (`{ synthetic: boolean; workouts: TaggedWorkout[] }`), `Sensitivity` (`Record<Muscle, number>`), `MuscleState`, `DayForecast`, `Forecast` (`{ byDay: DayForecast[]; needsTag: string[]; unmappedSports: string[] }`).
  - `engine/constants.ts`: `ZONE_WEIGHTS`, `NOVELTY_WINDOW_DAYS`, `NOVELTY_CAP`, `DESCENT_M_PER_KM_AT_MAX`, `MAX_DESCENT_ECCENTRIC_BONUS`, `BAND_THRESHOLDS`, `DRIVER_NOVELTY_MIN`, `DRIVER_ECCENTRIC_MIN`, `DRIVER_HIGH_LOAD_MIN`, `FORECAST_DAYS`, `HOURS_PER_DAY`, `SENSITIVITY_MIN`, `SENSITIVITY_MAX`, `SENSITIVITY_STEP`.
  - `engine/replay.ts`: `parseReplay(raw: unknown): ReplayFile` (throws `Error` with the workout id in the message).
  - `data/scenarios/builders.ts`: `workout(spec: WorkoutSpec): TaggedWorkout` and `WorkoutSpec` (`id`, `sport`, `start` ISO string, `zoneMinutes` six numbers, optional `distanceKm`, `altitudeGainM`, `altitudeChangeM`, `tag`).

The workout field names match the official API reference (`developer.whoop.com/api`, checked 2026-09-19): `id` is a UUID string, everything else nests under `score`, and the zone keys run `zone_zero_milli` to `zone_five_milli`. Only `Workout` is typed for now; recovery, sleep and cycle types arrive with the sub-projects that use them.

- [ ] **Step 1: Write the failing test**

Create `engine/replay.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { workout } from '../data/scenarios/builders';
import { parseReplay } from './replay';

const good = workout({
  id: 'w1', sport: 'running', start: '2026-09-10T07:00:00Z', zoneMinutes: [0, 10, 40, 10, 0, 0],
});

describe('parseReplay', () => {
  it('accepts builder workouts and ignores extra top-level keys', () => {
    const parsed = parseReplay({ synthetic: false, workouts: [good], recovery: [{}] });
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
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run engine/replay.test.ts`
Expected: FAIL, with an error that it cannot resolve `../data/scenarios/builders` (the module does not exist yet).

- [ ] **Step 3: Write the implementation**

Create `engine/types.ts`:

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

export interface ReplayFile {
  synthetic: boolean;
  workouts: TaggedWorkout[];
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

Create `engine/constants.ts`:

```ts
// Hand-tuned, UNCALIBRATED constants. Chosen so scenario tests reproduce the
// literature's ordering (novel and eccentric work is sorer). Not validated.

/** Weight per WHOOP HR zone 0..5 applied to minutes spent in that zone. */
export const ZONE_WEIGHTS = [0, 0.5, 1, 1.5, 2, 2.5] as const;

export const NOVELTY_WINDOW_DAYS = 28;
export const NOVELTY_CAP = 3;

/** Descent per km at which the running/hiking eccentric factor maxes out. */
export const DESCENT_M_PER_KM_AT_MAX = 50;
export const MAX_DESCENT_ECCENTRIC_BONUS = 1;

/** Summed contribution score at which a muscle moves up a band. */
export const BAND_THRESHOLDS = { moderate: 60, high: 150 } as const;

/** Driver tags shown in the "why" text. */
export const DRIVER_NOVELTY_MIN = 2;
export const DRIVER_ECCENTRIC_MIN = 1.3;
export const DRIVER_HIGH_LOAD_MIN = 90;

export const FORECAST_DAYS = 8;
export const HOURS_PER_DAY = 24;

export const SENSITIVITY_MIN = 0.5;
export const SENSITIVITY_MAX = 1.5;
export const SENSITIVITY_STEP = 0.1;
```

Create `engine/replay.ts`:

```ts
import { ReplayFile, StrengthTag, TaggedWorkout } from './types';

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
  if (o.score_state === 'SCORED') {
    const zones = (o.score as Record<string, unknown> | undefined)?.zone_durations as
      | Record<string, unknown>
      | undefined;
    if (!zones) fail(id, 'SCORED workout is missing score.zone_durations');
    for (const k of ZONE_KEYS) {
      if (typeof zones[k] !== 'number') fail(id, `zone_durations.${k} must be a number`);
    }
  }
  return o as unknown as TaggedWorkout;
}

/** Validate untrusted JSON (a real export or the synthetic file). Extra keys are ignored. */
export function parseReplay(raw: unknown): ReplayFile {
  const o = raw as Record<string, unknown> | null;
  if (typeof o !== 'object' || o === null) throw new Error('Invalid replay file: not an object');
  if (typeof o.synthetic !== 'boolean') {
    throw new Error('Invalid replay file: "synthetic" must be true or false');
  }
  if (!Array.isArray(o.workouts)) throw new Error('Invalid replay file: "workouts" must be an array');
  return { synthetic: o.synthetic, workouts: o.workouts.map(checkWorkout) };
}
```

Create `data/scenarios/builders.ts`:

```ts
import type { StrengthTag, TaggedWorkout } from '../../engine/types';

export interface WorkoutSpec {
  id: string;
  sport: string;
  /** ISO start time. */
  start: string;
  /** Minutes spent in HR zones 0..5. Session length is their sum. */
  zoneMinutes: [number, number, number, number, number, number];
  distanceKm?: number;
  altitudeGainM?: number;
  altitudeChangeM?: number;
  tag?: StrengthTag;
}

/** Build a WHOOP-v2-shaped workout. Non-engine fields are plausible filler. */
export function workout(spec: WorkoutSpec): TaggedWorkout {
  const totalMin = spec.zoneMinutes.reduce((a, b) => a + b, 0);
  const startMs = Date.parse(spec.start);
  const end = new Date(startMs + totalMin * 60_000).toISOString();
  const [z0, z1, z2, z3, z4, z5] = spec.zoneMinutes.map((m) => m * 60_000);
  return {
    id: spec.id,
    user_id: 0,
    created_at: end,
    updated_at: end,
    start: new Date(startMs).toISOString(),
    end,
    timezone_offset: '+00:00',
    sport_name: spec.sport,
    score_state: 'SCORED',
    score: {
      strain: 10,
      average_heart_rate: 140,
      max_heart_rate: 175,
      kilojoule: totalMin * 30,
      percent_recorded: 100,
      distance_meter: spec.distanceKm === undefined ? undefined : spec.distanceKm * 1000,
      altitude_gain_meter: spec.altitudeGainM,
      altitude_change_meter: spec.altitudeChangeM,
      zone_durations: {
        zone_zero_milli: z0,
        zone_one_milli: z1,
        zone_two_milli: z2,
        zone_three_milli: z3,
        zone_four_milli: z4,
        zone_five_milli: z5,
      },
    },
    ...(spec.tag ? { session_tag: spec.tag } : {}),
  };
}
```

- [ ] **Step 4: Run the test and typecheck to verify they pass**

Run: `npx vitest run engine/replay.test.ts && npm run typecheck`
Expected: 8 tests pass; typecheck prints no errors.

- [ ] **Step 5: Commit**

```bash
git add engine data
git commit -m "$(cat <<'EOF'
Add engine types, constants, replay parser and fixture builder

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 3: Time curve and sport-to-muscle map

**Files:**
- Create: `engine/timecurve.ts`, `engine/sportMuscleMap.ts`
- Test: `engine/timecurve.test.ts`, `engine/sportMuscleMap.test.ts`

**Interfaces:**
- Consumes: `Muscle`, `StrengthTag` from `engine/types.ts`.
- Produces:
  - `timecurve(hoursElapsed: number): number` returns 0..1: onset by 12-24h, peak inside 24-72h, about 0.05 at 168h, 0 after 192h and for negative input.
  - `MuscleWeights` (`Partial<Record<Muscle, number>>`), `SportProfile` (`{ muscles; eccentricBase: number; scalesWithDescent: boolean }`), `SPORT_MUSCLE_MAP: Record<string, SportProfile>` (keys `running`, `hiking`, `cycling`, `soccer`, `basketball`, `tennis`, `swimming`, `rowing`), `STRENGTH_SPORTS: ReadonlySet<string>` (`weightlifting`, `powerlifting`, `functional-fitness`), `STRENGTH_ECCENTRIC` (1.2), `TAG_MUSCLES: Record<StrengthTag, MuscleWeights>`, `normalizeSport(sportName: string): string`.

The sport map is hand-built and needs a trainer or PT to review it before the meeting (handoff open item 4). Real `sport_name` values are unconfirmed until the WHOOP export exists; `normalizeSport` absorbs spelling differences (case, spaces, underscores).

- [ ] **Step 1: Write the failing tests**

Create `engine/timecurve.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { timecurve } from './timecurve';

describe('timecurve', () => {
  it('is zero right at the end of the session', () => {
    expect(timecurve(0)).toBe(0);
  });

  it('peaks inside the 24-72h window', () => {
    let peakHour = 0;
    let peak = -1;
    for (let h = 0; h <= 200; h++) {
      if (timecurve(h) > peak) {
        peak = timecurve(h);
        peakHour = h;
      }
    }
    expect(peakHour).toBeGreaterThanOrEqual(24);
    expect(peakHour).toBeLessThanOrEqual(72);
    expect(peak).toBe(1);
  });

  it('has onset by 12-24h', () => {
    expect(timecurve(12)).toBeGreaterThan(0.2);
    expect(timecurve(24)).toBeGreaterThan(0.7);
  });

  it('has faded by about day 7 and is zero afterwards', () => {
    expect(timecurve(168)).toBeLessThan(0.1);
    expect(timecurve(200)).toBe(0);
    expect(timecurve(-5)).toBe(0);
  });
});
```

Create `engine/sportMuscleMap.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import {
  SPORT_MUSCLE_MAP, STRENGTH_SPORTS, TAG_MUSCLES, normalizeSport,
} from './sportMuscleMap';

describe('normalizeSport', () => {
  it('matches spaced, underscored and hyphenated spellings', () => {
    expect(normalizeSport('Functional Fitness')).toBe('functional-fitness');
    expect(normalizeSport('functional_fitness')).toBe('functional-fitness');
    expect(normalizeSport(' Running ')).toBe('running');
  });
});

describe('sport-to-muscle map', () => {
  it('keeps every weight in (0, 1]', () => {
    const all = [
      ...Object.values(SPORT_MUSCLE_MAP).map((p) => p.muscles),
      ...Object.values(TAG_MUSCLES),
    ];
    for (const weights of all) {
      for (const w of Object.values(weights)) {
        expect(w).toBeGreaterThan(0);
        expect(w).toBeLessThanOrEqual(1);
      }
    }
  });

  it('never lists a strength sport as a mapped sport (they need a session_tag)', () => {
    for (const s of STRENGTH_SPORTS) expect(SPORT_MUSCLE_MAP[s]).toBeUndefined();
  });

  it('gives running and hiking a descent-scaled eccentric factor', () => {
    expect(SPORT_MUSCLE_MAP.running.scalesWithDescent).toBe(true);
    expect(SPORT_MUSCLE_MAP.hiking.scalesWithDescent).toBe(true);
    expect(SPORT_MUSCLE_MAP.cycling.scalesWithDescent).toBe(false);
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run engine/timecurve.test.ts engine/sportMuscleMap.test.ts`
Expected: FAIL, with errors that `./timecurve` and `./sportMuscleMap` cannot be resolved.

- [ ] **Step 3: Write the implementation**

Create `engine/timecurve.ts`:

```ts
// Published DOMS time course: builds within a day, peaks ~24-72h, fades by ~day 7.
const POINTS: ReadonlyArray<readonly [hours: number, level: number]> = [
  [0, 0],
  [12, 0.25],
  [24, 0.8],
  [48, 1],
  [72, 0.85],
  [120, 0.35],
  [168, 0.05],
  [192, 0],
];

/** Soreness level 0..1 at `hoursElapsed` after a session ends. Piecewise linear. */
export function timecurve(hoursElapsed: number): number {
  if (hoursElapsed <= POINTS[0][0]) return 0;
  const last = POINTS[POINTS.length - 1];
  if (hoursElapsed >= last[0]) return 0;
  for (let i = 1; i < POINTS.length; i++) {
    const [h1, l1] = POINTS[i];
    if (hoursElapsed <= h1) {
      const [h0, l0] = POINTS[i - 1];
      return l0 + ((l1 - l0) * (hoursElapsed - h0)) / (h1 - h0);
    }
  }
  return 0;
}
```

Create `engine/sportMuscleMap.ts`:

```ts
import type { Muscle, StrengthTag } from './types';

export type MuscleWeights = Partial<Record<Muscle, number>>;

export interface SportProfile {
  muscles: MuscleWeights;
  /** Base eccentric factor: 1.0 = no extra eccentric demand. */
  eccentricBase: number;
  /** True when descent per km (running, hiking) adds to the eccentric factor. */
  scalesWithDescent: boolean;
}

// Hand-built starter map. Needs trainer/PT review before the meeting.
export const SPORT_MUSCLE_MAP: Record<string, SportProfile> = {
  running: {
    muscles: { quads: 0.9, calves: 0.6, glutes: 0.6, hamstrings: 0.5 },
    eccentricBase: 1,
    scalesWithDescent: true,
  },
  hiking: {
    muscles: { quads: 0.8, calves: 0.6, glutes: 0.6 },
    eccentricBase: 1,
    scalesWithDescent: true,
  },
  cycling: {
    muscles: { quads: 0.9, glutes: 0.6, hamstrings: 0.5, calves: 0.4 },
    eccentricBase: 1,
    scalesWithDescent: false,
  },
  soccer: {
    muscles: { quads: 0.8, hamstrings: 0.7, calves: 0.6, glutes: 0.6, adductors: 0.6 },
    eccentricBase: 1.5,
    scalesWithDescent: false,
  },
  basketball: {
    muscles: { quads: 0.8, hamstrings: 0.6, calves: 0.7, glutes: 0.6, adductors: 0.5 },
    eccentricBase: 1.5,
    scalesWithDescent: false,
  },
  tennis: {
    muscles: { shoulders: 0.6, forearms: 0.6, core: 0.5, calves: 0.5 },
    eccentricBase: 1.3,
    scalesWithDescent: false,
  },
  swimming: {
    muscles: { upperBack: 0.8, shoulders: 0.8, triceps: 0.6, core: 0.5 },
    eccentricBase: 1,
    scalesWithDescent: false,
  },
  rowing: {
    muscles: { upperBack: 0.8, glutes: 0.6, hamstrings: 0.6, biceps: 0.5 },
    eccentricBase: 1,
    scalesWithDescent: false,
  },
};

/** Strength sport names: the API gives no muscles, so these need a session_tag. */
export const STRENGTH_SPORTS: ReadonlySet<string> = new Set([
  'weightlifting',
  'powerlifting',
  'functional-fitness',
]);

export const STRENGTH_ECCENTRIC = 1.2; // lowering phases

export const TAG_MUSCLES: Record<StrengthTag, MuscleWeights> = {
  lower: { quads: 0.9, glutes: 0.8, hamstrings: 0.7, calves: 0.5, adductors: 0.4, core: 0.4 },
  upper: { chest: 0.7, shoulders: 0.7, upperBack: 0.7, biceps: 0.6, triceps: 0.6, forearms: 0.4 },
  push: { chest: 0.9, shoulders: 0.8, triceps: 0.8 },
  pull: { upperBack: 0.9, biceps: 0.8, forearms: 0.5 },
  full: {
    quads: 0.6, glutes: 0.6, hamstrings: 0.5, chest: 0.5, shoulders: 0.5,
    upperBack: 0.5, biceps: 0.4, triceps: 0.4, core: 0.4,
  },
};

/** "Functional Fitness", "functional_fitness" and "functional-fitness" all match. */
export function normalizeSport(sportName: string): string {
  return sportName.trim().toLowerCase().replace(/[\s_]+/g, '-');
}
```

- [ ] **Step 4: Run the tests and typecheck to verify they pass**

Run: `npx vitest run engine/timecurve.test.ts engine/sportMuscleMap.test.ts && npm run typecheck`
Expected: 4 time-curve tests and 4 sport-map tests pass; typecheck prints no errors.

- [ ] **Step 5: Commit**

```bash
git add engine
git commit -m "$(cat <<'EOF'
Add DOMS time curve and sport-to-muscle map

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 4: Soreness engine and scenario tests

**Files:**
- Create: `data/scenarios/scenarios.ts`, `engine/soreness.ts`
- Test: `engine/soreness.test.ts`

**Interfaces:**
- Consumes: everything from Tasks 2 and 3, plus `timecurve`, `SPORT_MUSCLE_MAP`, `STRENGTH_SPORTS`, `TAG_MUSCLES`, `normalizeSport`, and the constants.
- Produces:
  - `computeForecast(workouts: TaggedWorkout[], asOf: Date, sensitivity: Sensitivity): Forecast`. `byDay` has 8 entries; `byDay[d]` is the state at `asOf + d` days; only scored workouts that ended at or before `asOf` count.
  - `evaluateMuscles(workouts, at: Date, sensitivity, asOf: Date = at): Record<Muscle, { score: number; drivers: Driver[] }>`. Numeric scores are for tests and calibration only; the UI shows bands.
  - `bandFor(score: number): RiskBand`, `resolveSessions(...)`, `evaluateAt(...)` (internal building blocks, exported for reuse).
  - Scenario fixtures (all `TaggedWorkout[]`): `flatRun`, `downhillRun`, `firstSoccer`, `regularSoccer`, `legDayOne`, `legDaysBackToBack`, `untaggedStrength`, `unknownSport`. In the run scenarios the workout of interest has id `run`; in soccer scenarios it is `match`; leg days are `legs-1` and `legs-2`.

Model recap (the spec, Section 2): each session adds `load × novelty × eccentric × sensitivity × timecurve(hours since it ended)` to each muscle it loads. Novelty is this session's load over the mean per-session load in the prior 28 days, capped at 3, and a muscle with no history gets the cap. The eccentric factor for runs and hikes grows with inferred descent per km. **That inference assumes `altitude_change_meter` is net change, so descent = gain − change. It is unverified until a real export exists**; the code comment says so.

- [ ] **Step 1: Write the scenarios and the failing test**

Create `data/scenarios/scenarios.ts`:

```ts
import type { TaggedWorkout } from '../../engine/types';
import { workout } from './builders';

// Each scenario is hand-authored, WHOOP-v2-shaped, and synthetic.

type Zones = [number, number, number, number, number, number];

/** A regular runner: four weekly flat 10 km runs (Aug 13 to Sep 3). */
const runZones: Zones = [0, 10, 40, 10, 0, 0];
const priorRuns: TaggedWorkout[] = ['2026-08-13', '2026-08-20', '2026-08-27', '2026-09-03'].map(
  (d, i) =>
    workout({
      id: `prior-run-${i}`, sport: 'running', start: `${d}T07:00:00Z`, zoneMinutes: runZones,
      distanceKm: 10, altitudeGainM: 20, altitudeChangeM: 0,
    }),
);

/** The regular runner's Sep 10 run, flat. */
export const flatRun: TaggedWorkout[] = [
  ...priorRuns,
  workout({
    id: 'run', sport: 'running', start: '2026-09-10T07:00:00Z', zoneMinutes: runZones,
    distanceKm: 10, altitudeGainM: 20, altitudeChangeM: 0,
  }),
];

/** The same runner and same effort on Sep 10, but ending 550 m below the start. */
export const downhillRun: TaggedWorkout[] = [
  ...priorRuns,
  workout({
    id: 'run', sport: 'running', start: '2026-09-10T07:00:00Z', zoneMinutes: runZones,
    distanceKm: 10, altitudeGainM: 50, altitudeChangeM: -550,
  }),
];

const matchZones: Zones = [0, 10, 20, 20, 10, 0];

/** A first-ever soccer match: no prior history. */
export const firstSoccer: TaggedWorkout[] = [
  workout({ id: 'match', sport: 'soccer', start: '2026-09-10T18:00:00Z', zoneMinutes: matchZones }),
];

/** A regular player: weekly matches for the prior four weeks, then the same match. */
export const regularSoccer: TaggedWorkout[] = [
  ...['2026-08-13', '2026-08-20', '2026-08-27', '2026-09-03'].map((d, i) =>
    workout({ id: `prior-${i}`, sport: 'soccer', start: `${d}T18:00:00Z`, zoneMinutes: matchZones }),
  ),
  workout({ id: 'match', sport: 'soccer', start: '2026-09-10T18:00:00Z', zoneMinutes: matchZones }),
];

const legZones: Zones = [0, 10, 30, 15, 5, 0];

/** Leg day on Sep 10 only. */
export const legDayOne: TaggedWorkout[] = [
  workout({ id: 'legs-1', sport: 'weightlifting', tag: 'lower', start: '2026-09-10T17:00:00Z', zoneMinutes: legZones }),
];

/** Leg day on Sep 10 and again on Sep 11. */
export const legDaysBackToBack: TaggedWorkout[] = [
  ...legDayOne,
  workout({ id: 'legs-2', sport: 'weightlifting', tag: 'lower', start: '2026-09-11T17:00:00Z', zoneMinutes: legZones }),
];

/** A strength session with no session_tag: the engine must not guess muscles. */
export const untaggedStrength: TaggedWorkout[] = [
  workout({ id: 'untagged', sport: 'weightlifting', start: '2026-09-10T17:00:00Z', zoneMinutes: legZones }),
];

/** A sport that is not in the sport-to-muscle map. */
export const unknownSport: TaggedWorkout[] = [
  workout({ id: 'curling', sport: 'curling', start: '2026-09-10T17:00:00Z', zoneMinutes: [0, 30, 10, 0, 0, 0] }),
];
```

Create `engine/soreness.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import {
  downhillRun, firstSoccer, flatRun, legDayOne, legDaysBackToBack, regularSoccer,
  unknownSport, untaggedStrength,
} from '../data/scenarios/scenarios';
import { defaultSensitivity } from './sensitivity';
import { computeForecast, evaluateMuscles } from './soreness';
import { MUSCLES, TaggedWorkout } from './types';

const S = defaultSensitivity();
const HOUR = 3_600_000;
const endOf = (ws: TaggedWorkout[], id: string) => new Date(ws.find((w) => w.id === id)!.end);
const plus = (d: Date, hours: number) => new Date(d.getTime() + hours * HOUR);

describe('evaluateMuscles: scenario ordering from the literature', () => {
  it('rates a downhill run above a flat run for quads and calves', () => {
    const at = plus(endOf(flatRun, 'run'), 48);
    const flat = evaluateMuscles(flatRun, at, S);
    const down = evaluateMuscles(downhillRun, plus(endOf(downhillRun, 'run'), 48), S);
    expect(down.quads.score).toBeGreaterThan(flat.quads.score);
    expect(down.calves.score).toBeGreaterThan(flat.calves.score);
    expect(down.quads.drivers).toContain('eccentric');
    expect(flat.quads.drivers).not.toContain('eccentric');
  });

  it('rates a first-ever soccer match above the same match for a regular player', () => {
    const first = evaluateMuscles(firstSoccer, plus(endOf(firstSoccer, 'match'), 48), S);
    const regular = evaluateMuscles(regularSoccer, plus(endOf(regularSoccer, 'match'), 48), S);
    expect(first.quads.score).toBeGreaterThan(regular.quads.score);
    expect(first.quads.drivers).toContain('novel');
    expect(regular.quads.drivers).not.toContain('novel');
  });

  it('keeps day-2 quads at least as high as day-1 after back-to-back leg days', () => {
    const one = evaluateMuscles(legDayOne, plus(endOf(legDayOne, 'legs-1'), 48), S);
    const two = evaluateMuscles(legDaysBackToBack, plus(endOf(legDaysBackToBack, 'legs-2'), 48), S);
    expect(two.quads.score).toBeGreaterThanOrEqual(one.quads.score);
  });

  it('scales the score with per-muscle sensitivity', () => {
    const at = plus(endOf(downhillRun, 'run'), 48);
    const base = evaluateMuscles(downhillRun, at, S).quads.score;
    const sore = evaluateMuscles(downhillRun, at, { ...S, quads: 1.5 }).quads.score;
    expect(sore).toBeCloseTo(base * 1.5, 6);
  });
});

describe('computeForecast', () => {
  it('follows the DOMS time course: low at first, peak inside 24-72h, faded by day 7', () => {
    const asOf = endOf(downhillRun, 'run');
    const f = computeForecast(downhillRun, asOf, S);
    expect(f.byDay).toHaveLength(8);
    expect(f.byDay[0].quads.band).toBe('low');
    expect(f.byDay[2].quads.band).not.toBe('low');
    expect(f.byDay[7].quads.band).toBe('low');
  });

  it('makes a downhill run visibly riskier than a flat run for a regular runner', () => {
    const flat = computeForecast(flatRun, endOf(flatRun, 'run'), S);
    const down = computeForecast(downhillRun, endOf(downhillRun, 'run'), S);
    expect(flat.byDay[2].quads.band).toBe('low');
    expect(down.byDay[2].quads.band).toBe('moderate');
  });

  it('marks a first soccer match high for quads, with novel and eccentric drivers', () => {
    const f = computeForecast(firstSoccer, endOf(firstSoccer, 'match'), S);
    expect(f.byDay[2].quads.band).toBe('high');
    expect(f.byDay[2].quads.drivers).toEqual(expect.arrayContaining(['novel', 'eccentric']));
  });

  it('adds no soreness for untagged strength and reports it in needsTag', () => {
    const f = computeForecast(untaggedStrength, endOf(untaggedStrength, 'untagged'), S);
    expect(f.needsTag).toEqual(['untagged']);
    for (const day of f.byDay) for (const m of MUSCLES) expect(day[m].band).toBe('low');
  });

  it('loads the right muscles for a tagged lower-body session', () => {
    const f = computeForecast(legDayOne, endOf(legDayOne, 'legs-1'), S);
    expect(f.needsTag).toEqual([]);
    expect(f.byDay[2].quads.band).toBe('high');
    expect(f.byDay[2].chest.band).toBe('low');
  });

  it('reports sports missing from the map instead of guessing', () => {
    const f = computeForecast(unknownSport, endOf(unknownSport, 'curling'), S);
    expect(f.unmappedSports).toEqual(['curling']);
    for (const m of MUSCLES) expect(f.byDay[2][m].band).toBe('low');
  });

  it('ignores workouts that end after asOf', () => {
    const before = plus(endOf(legDayOne, 'legs-1'), -1);
    const f = computeForecast(legDayOne, before, S);
    for (const day of f.byDay) for (const m of MUSCLES) expect(day[m].band).toBe('low');
  });

  it('is deterministic and does not mutate its inputs', () => {
    const asOf = endOf(downhillRun, 'run');
    const workoutsBefore = JSON.stringify(downhillRun);
    const sensBefore = JSON.stringify(S);
    expect(computeForecast(downhillRun, asOf, S)).toEqual(computeForecast(downhillRun, asOf, S));
    expect(JSON.stringify(downhillRun)).toBe(workoutsBefore);
    expect(JSON.stringify(S)).toBe(sensBefore);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run engine/soreness.test.ts`
Expected: FAIL, because `./sensitivity` and `./soreness` cannot be resolved yet. (The test only needs `defaultSensitivity` from `./sensitivity`, so Step 3 creates that whole file first; Task 5 then adds its tests.)

- [ ] **Step 3: Write the implementation**

The test imports `defaultSensitivity`, so create `engine/sensitivity.ts` first. It is the full Task 5 file; Task 5 adds its own tests.

```ts
import { SENSITIVITY_MAX, SENSITIVITY_MIN, SENSITIVITY_STEP } from './constants';
import { MUSCLES, Muscle, RiskBand, Sensitivity } from './types';

const BAND_LEVEL: Record<RiskBand, number> = { low: 0, moderate: 1, high: 2 };

export function defaultSensitivity(): Sensitivity {
  return Object.fromEntries(MUSCLES.map((m) => [m, 1])) as Sensitivity;
}

/**
 * Nudge one muscle's sensitivity toward what the user reported.
 * reported is 0 none, 1 mild, 2 moderate, 3 severe. Returns a new object.
 */
export function applyCheckIn(
  sensitivity: Sensitivity,
  muscle: Muscle,
  predicted: RiskBand,
  reported: 0 | 1 | 2 | 3,
): Sensitivity {
  const reportedLevel = (reported * 2) / 3; // scale 0..3 onto the 0..2 band levels
  const diff = reportedLevel - BAND_LEVEL[predicted];
  let next = sensitivity[muscle];
  if (diff >= 0.5) next += SENSITIVITY_STEP;
  else if (diff <= -0.5) next -= SENSITIVITY_STEP;
  next = Math.min(SENSITIVITY_MAX, Math.max(SENSITIVITY_MIN, next));
  return { ...sensitivity, [muscle]: Math.round(next * 100) / 100 };
}
```

Then create `engine/soreness.ts`:

```ts
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
import { timecurve } from './timecurve';
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
  const profile = SPORT_MUSCLE_MAP[sport];
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
```

- [ ] **Step 4: Run the test and typecheck to verify they pass**

Run: `npx vitest run engine/soreness.test.ts && npm run typecheck`
Expected: 12 tests pass; typecheck prints no errors. If a band assertion fails, do not loosen the test: the thresholds in `engine/constants.ts` are the tuning knob, and the failure means the model no longer matches the literature ordering. Stop and report it.

- [ ] **Step 5: Commit**

```bash
git add engine data
git commit -m "$(cat <<'EOF'
Add soreness engine with scenario tests

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 5: Check-in sensitivity tests

**Files:**
- Test: `engine/sensitivity.test.ts`
- (`engine/sensitivity.ts` already exists from Task 4.)

**Interfaces:**
- Consumes: `defaultSensitivity(): Sensitivity` and `applyCheckIn(sensitivity, muscle, predicted: RiskBand, reported: 0 | 1 | 2 | 3): Sensitivity` from `engine/sensitivity.ts`.
- Produces: verified behavior. `reported` scales onto band levels (`reported × 2/3` against low 0, moderate 1, high 2). A gap of at least 0.5 levels moves sensitivity by 0.1 in that direction; a smaller gap changes nothing; results stay in [0.5, 1.5]; the input object is never mutated.

`applyCheckIn` was written in Task 4 because the engine tests need `defaultSensitivity`. This task pins its behavior with tests. Because the file already exists, the new tests pass immediately, so make each one earn its place by breaking the code first (Step 2).

- [ ] **Step 1: Write the tests**

Create `engine/sensitivity.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { applyCheckIn, defaultSensitivity } from './sensitivity';
import { MUSCLES } from './types';

describe('defaultSensitivity', () => {
  it('is 1.0 for every muscle', () => {
    const s = defaultSensitivity();
    expect(Object.keys(s).sort()).toEqual([...MUSCLES].sort());
    expect(Object.values(s).every((v) => v === 1)).toBe(true);
  });
});

describe('applyCheckIn', () => {
  it('raises sensitivity when the user reports more than predicted', () => {
    expect(applyCheckIn(defaultSensitivity(), 'quads', 'low', 3).quads).toBe(1.1);
  });

  it('lowers sensitivity when the user reports less than predicted', () => {
    expect(applyCheckIn(defaultSensitivity(), 'quads', 'high', 0).quads).toBe(0.9);
  });

  it('leaves sensitivity alone when report roughly matches the prediction', () => {
    expect(applyCheckIn(defaultSensitivity(), 'quads', 'moderate', 2).quads).toBe(1);
  });

  it('stays within 0.5 to 1.5', () => {
    let up = defaultSensitivity();
    let down = defaultSensitivity();
    for (let i = 0; i < 20; i++) {
      up = applyCheckIn(up, 'calves', 'low', 3);
      down = applyCheckIn(down, 'calves', 'high', 0);
    }
    expect(up.calves).toBe(1.5);
    expect(down.calves).toBe(0.5);
  });

  it('returns a new object and changes only the checked muscle', () => {
    const before = defaultSensitivity();
    const after = applyCheckIn(before, 'quads', 'low', 3);
    expect(after).not.toBe(before);
    expect(before.quads).toBe(1);
    expect(after.glutes).toBe(1);
  });
});
```

- [ ] **Step 2: Prove the tests can fail**

Temporarily change `SENSITIVITY_MAX` in `engine/constants.ts` from `1.5` to `2`, then run `npx vitest run engine/sensitivity.test.ts`.
Expected: the "stays within 0.5 to 1.5" test FAILS (it sees 2). Revert the constant to `1.5` with `git checkout engine/constants.ts`.

- [ ] **Step 3: Run the tests and typecheck to verify they pass**

Run: `npx vitest run engine/sensitivity.test.ts && npm run typecheck`
Expected: 6 tests pass; typecheck prints no errors.

- [ ] **Step 4: Commit**

```bash
git add engine
git commit -m "$(cat <<'EOF'
Add check-in sensitivity tests

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 6: Synthetic demo week, purity guard and public barrel

**Files:**
- Create: `data/replay.synthetic.ts`, `engine/index.ts`
- Test: `engine/replay.synthetic.test.ts`, `engine/purity.test.ts`

**Interfaces:**
- Consumes: `workout` from `data/scenarios/builders.ts`; `parseReplay`.
- Produces:
  - `syntheticReplay: ReplayFile` (`synthetic: true`): four weeks of routine history (easy runs Tue and Thu, lower-body strength Tue, from Aug 18) plus the demo week Mon Sep 14 to Sun Sep 20: easy runs Mon and Thu, tagged lower-body strength Tue, a long hilly run Fri, a soccer match Sat. Wed Sep 16 and Sun Sep 20 are rest days.
  - `engine/index.ts` re-exports `MUSCLES` and all types, `parseReplay`, `computeForecast`, `applyCheckIn`, `defaultSensitivity`, `timecurve`. The app imports the engine only through this barrel.
  - A purity test: no engine source file imports `react`, `react-native` or `expo`, and none calls `Date.now()` or `new Date()` with no argument.

The synthetic replay is a TypeScript module, not a JSON file (a change from the spec, recorded in Task 7): it is built with the same `workout()` builder as the test scenarios, which keeps it short and readable. It is still validated by `parseReplay` after a JSON round trip, so it has the same shape a real export must have.

- [ ] **Step 1: Write the failing tests**

Create `engine/replay.synthetic.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { syntheticReplay } from '../data/replay.synthetic';
import { parseReplay } from './replay';

describe('synthetic replay', () => {
  it('is labeled synthetic and passes the same validation as a real export', () => {
    expect(syntheticReplay.synthetic).toBe(true);
    const parsed = parseReplay(JSON.parse(JSON.stringify(syntheticReplay)));
    expect(parsed.synthetic).toBe(true);
    expect(parsed.workouts.length).toBeGreaterThan(10);
  });

  it('covers the demo week: easy runs, a hilly run, a tagged strength day, a soccer match', () => {
    const ids = syntheticReplay.workouts.map((w) => w.id);
    expect(ids).toEqual(expect.arrayContaining(['d-mon-run', 'd-tue-legs', 'd-fri-hilly-run', 'd-sat-soccer']));
    expect(syntheticReplay.workouts.find((w) => w.id === 'd-tue-legs')?.session_tag).toBe('lower');
  });

  it('has no workout on the two rest days (Wed Sep 16 and Sun Sep 20)', () => {
    const days = syntheticReplay.workouts.map((w) => w.start.slice(0, 10));
    expect(days).not.toContain('2026-09-16');
    expect(days).not.toContain('2026-09-20');
  });
});
```

Create `engine/purity.test.ts`:

```ts
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const dir = __dirname;
const sources = readdirSync(dir)
  .filter((f) => f.endsWith('.ts') && !f.endsWith('.test.ts'))
  .map((f) => ({ file: f, text: readFileSync(join(dir, f), 'utf8') }));

describe('engine purity', () => {
  it('found engine source files to check', () => {
    expect(sources.length).toBeGreaterThanOrEqual(7);
  });

  it('imports nothing from React or Expo', () => {
    const banned = /(from\s+|require\()\s*['"](react|react-native|expo)([/'"])/;
    for (const s of sources) expect(s.text, s.file).not.toMatch(banned);
  });

  it('never reads the clock (asOf is always passed in)', () => {
    for (const s of sources) expect(s.text, s.file).not.toMatch(/Date\.now\(|new Date\(\)/);
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run engine/replay.synthetic.test.ts engine/purity.test.ts`
Expected: `replay.synthetic.test.ts` FAILS (cannot resolve `../data/replay.synthetic`); that is the red step. `purity.test.ts` already PASSES, because the 7 engine source files that exist are clean. It is a guard, not new behavior, so Step 5 proves it can fail.

- [ ] **Step 3: Write the implementation**

Create `data/replay.synthetic.ts`:

```ts
import type { ReplayFile, TaggedWorkout } from '../engine/types';
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

// Demo week, Mon Sep 14 to Sun Sep 20. Wed and Sun are rest days.
const demoWeek: TaggedWorkout[] = [
  easy('d-mon-run', '2026-09-14'),
  legs('d-tue-legs', '2026-09-15'),
  easy('d-thu-run', '2026-09-17'),
  workout({
    id: 'd-fri-hilly-run', sport: 'running', start: '2026-09-18T07:00:00Z', zoneMinutes: hillyRun,
    distanceKm: 14, altitudeGainM: 700, altitudeChangeM: 0,
  }),
  workout({ id: 'd-sat-soccer', sport: 'soccer', start: '2026-09-19T18:00:00Z', zoneMinutes: match }),
];

export const syntheticReplay: ReplayFile = {
  synthetic: true,
  workouts: [...history, ...demoWeek],
};
```

Create `engine/index.ts`:

```ts
export * from './types';
export { parseReplay } from './replay';
export { computeForecast } from './soreness';
export { applyCheckIn, defaultSensitivity } from './sensitivity';
export { timecurve } from './timecurve';
```

- [ ] **Step 4: Run the whole suite and typecheck**

Run: `npm test && npm run typecheck`
Expected: 7 test files, 40 tests, all pass; typecheck prints no errors.

- [ ] **Step 5: Prove the purity guard can fail**

Append a clock read to a source file, run the guard, then revert:
```bash
echo 'export const leak = Date.now();' >> engine/constants.ts
npx vitest run engine/purity.test.ts
git checkout engine/constants.ts
```
Expected: the "never reads the clock" test FAILS naming `constants.ts`. After `git checkout`, `npx vitest run engine/purity.test.ts` passes again.

- [ ] **Step 6: Commit**

```bash
git add engine data
git commit -m "$(cat <<'EOF'
Add labeled synthetic demo week, engine barrel and purity guard

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 7: Hello screen, web build, Expo Go gate and spec amendments

**Files:**
- Create: `data/index.ts`, `app/HelloScreen.tsx`
- Modify: `App.tsx`, `docs/superpowers/specs/2026-09-19-engine-foundation-design.md`

**Interfaces:**
- Consumes: `parseReplay`, `computeForecast`, `defaultSensitivity`, `MUSCLES` (via `engine/index.ts`); `syntheticReplay`.
- Produces: `loadReplay(): ReplayFile` in `data/index.ts`. It returns `data/replay.json` when that gitignored file exists, and otherwise the synthetic replay. Sub-project D writes `replay.json` with `synthetic: false`.

`require('./replay.json')` sits inside a `try/catch`; Metro treats that as an optional dependency, so the bundle builds whether or not the file exists (verified both ways in the scratch project). If a real `replay.json` is present but malformed, `parseReplay` throws at runtime with the workout id, which is what we want.

- [ ] **Step 1: Write the loader, screen and app entry**

Create `data/index.ts`:

```ts
import { parseReplay } from '../engine/replay';
import type { ReplayFile } from '../engine/types';
import { syntheticReplay } from './replay.synthetic';

/** The real export is optional and gitignored. Metro treats a require inside try/catch as optional. */
function readLocalExport(): unknown {
  try {
    return require('./replay.json');
  } catch {
    return null;
  }
}

export function loadReplay(): ReplayFile {
  return parseReplay(readLocalExport() ?? syntheticReplay);
}
```

Create `app/HelloScreen.tsx`:

```tsx
import { ScrollView, StyleSheet, Text } from 'react-native';
import { loadReplay } from '../data';
import { computeForecast, defaultSensitivity, MUSCLES } from '../engine';

const AS_OF = new Date('2026-09-19T20:00:00Z');

export default function HelloScreen() {
  const replay = loadReplay();
  const forecast = computeForecast(replay.workouts, AS_OF, defaultSensitivity());
  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Sore Spot: engine check</Text>
      {replay.synthetic && <Text style={styles.banner}>SYNTHETIC DATA</Text>}
      <Text>{`As of ${AS_OF.toISOString()}`}</Text>
      {MUSCLES.map((m) => (
        <Text key={m} style={styles.row}>
          {m.padEnd(10)} {forecast.byDay.map((d) => d[m].band[0].toUpperCase()).join(' ')}
        </Text>
      ))}
      <Text>{`Needs tag: ${forecast.needsTag.length}, unmapped sports: ${forecast.unmappedSports.length}`}</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 24, paddingTop: 64, gap: 8 },
  title: { fontSize: 20, fontWeight: '600' },
  banner: { color: '#b45309', fontWeight: '700' },
  row: { fontFamily: 'Courier', fontSize: 14 },
});
```

Replace `App.tsx` with:

```tsx
import { StatusBar } from 'expo-status-bar';
import HelloScreen from './app/HelloScreen';

export default function App() {
  return (
    <>
      <HelloScreen />
      <StatusBar style="auto" />
    </>
  );
}
```

- [ ] **Step 2: Typecheck, test and build the web bundle**

Run:
```bash
npm run typecheck
npm test
npx expo export --platform web
rm -rf dist
```
Expected: typecheck clean; 40 tests pass; the export ends with `Exported: dist`.

- [ ] **Step 3: Check the browser build shows the engine output**

Run `npx expo start --web` and open the URL it prints (usually `http://localhost:8081`). Expected on screen:

- title `Sore Spot: engine check` and an amber `SYNTHETIC DATA` banner
- `As of 2026-09-19T20:00:00.000Z`
- twelve rows, each a muscle name and eight letters (days 0 to 7):

```
chest      L L L L L L L L
shoulders  L L L L L L L L
biceps     L L L L L L L L
triceps    L L L L L L L L
forearms   L L L L L L L L
upperBack  L L L L L L L L
core       L L L L L L L L
glutes     H H H H M M L L
quads      H H H H H M L L
hamstrings H H H H M M L L
calves     H H H H M M L L
adductors  L M M M M L L L
```
- last line `Needs tag: 0, unmapped sports: 0`

An agent cannot see a browser. Ask the user to open it and confirm the rows match, and to paste a screenshot or the differences. Stop the dev server afterwards.

- [ ] **Step 4: Expo Go on the iPhone (the Saturday gate)**

Ask the user to:
1. Confirm the App Store's Expo Go opens a project built on Expo SDK 57. If Expo Go reports an SDK mismatch, stop and report the exact message: it changes the plan.
2. Run `npx expo start`, scan the QR code with the iPhone camera, and allow Local Network access for Expo Go if prompted.
3. If it cannot connect (firewall or Wi-Fi isolation), run `npx expo start --tunnel` (Expo may offer to install `@expo/ngrok`; answer yes) and try again.
4. Paste back the exact error text if anything fails.

Expected: the same screen as Step 3 appears on the phone. **Gate result:** if the phone works, note that. If it still fails after `--tunnel`, record "browser-only" in Step 5's commit body and continue; nothing else changes because the code is shared.

- [ ] **Step 5: Record the plan-time changes in the spec and commit**

Append this section to the end of `docs/superpowers/specs/2026-09-19-engine-foundation-design.md`:

```markdown

## Amendments (2026-09-19, found while planning)

These change the spec above; where they conflict, this section wins.

- **Forecast result** also carries `needsTag: string[]` (ids of untagged strength workouts) and `unmappedSports: string[]`, so callers can prompt the user instead of guessing.
- **Extra engine files:** `constants.ts` (all tuning constants), `sensitivity.ts` (`defaultSensitivity`, `applyCheckIn`), `replay.ts` (`parseReplay`), `index.ts` (barrel).
- **Numeric scores:** `evaluateMuscles` exposes raw scores for tests and calibration only. UI-facing output stays bands.
- **Types:** only the WHOOP v2 `Workout` is typed for now. Recovery, sleep and cycle types come with the sub-project that first uses them.
- **Synthetic replay** is `data/replay.synthetic.ts` (built with the scenario `workout()` builder), not a JSON file. It is validated by `parseReplay` after a JSON round trip, so it matches a real export's shape.
- **Scenario fixtures** are TypeScript (`data/scenarios/builders.ts`, `scenarios.ts`), not JSON.
- **Scaffold:** `create-expo-app@latest --template blank-typescript` (Expo SDK 57 at time of writing) in a temp folder, copied in, because the target folder was not empty. Web builds need `react-dom` and `react-native-web`, installed with `npx expo install`.
- **Loader:** `data/index.ts` `loadReplay()` reads `data/replay.json` through an optional `require` in `try/catch` and falls back to the synthetic replay.
```

Then commit:
```bash
git add app data App.tsx docs
git commit -m "$(cat <<'EOF'
Add engine check screen, replay loader and spec amendments

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

- [ ] **Step 6: Final verification against the spec's gate**

Run: `npm test && npm run typecheck && git status --short && git log --oneline`
Expected: all tests pass, typecheck clean, a clean working tree, and the log shows the spec commit plus one commit per task. Report to the user, against each gate item: tests pass (evidence: the test count), web build shows the engine forecast (user confirmed in Step 3), Expo Go result (Step 4), and that the constants and sport map are hand-tuned and uncalibrated, so no accuracy claim is made.

---

## Self-Review

**Spec coverage:**
- Section 1 structure, pure engine, `asOf` argument, loader with synthetic fallback, `synthetic` flag, bands only: Tasks 2, 4, 6, 7.
- Section 2 model (12 zones, formula, novelty cap 3 with no-history cap, descent-based eccentric with the unverified-assumption comment, time curve, hand-tuned thresholds, strength `needsTag`, `applyCheckIn` clamped): Tasks 2, 3, 4, 5.
- Section 3 fixtures (scenarios, demo week), the eight tests (downhill vs flat, first vs regular soccer, back-to-back legs, time curve, strength tagged/untagged, check-in clamp, purity and determinism, fixture validation), scaffold, `.gitignore` entries, no remote, and the Saturday gate with tunnel fallback: Tasks 1 to 7.
- The "SYNTHETIC DATA" banner is a B feature in the spec; the hello screen shows one anyway as a cheap early check.

**Type consistency:** `computeForecast`, `evaluateMuscles`, `applyCheckIn`, `defaultSensitivity`, `parseReplay`, `workout`, and every fixture name are defined once (Tasks 2 to 6) and used with the same signatures later, because all code blocks come from one verified copy.

**Known limits, stated plainly:** the browser view and the iPhone are checked by the user, not by an agent. The eccentric descent assumption and the sport map are unverified until a real export and a trainer review.
