# Plan Screen, Health Screens, Navigation and Shared State Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Put the plan engine in front of the member: a Plan tab with a tag gate, health questions (all starting unanswered), a plan request and the plan or the reason there is none, plus a shell with two tabs and shared state, without changing the body map's behavior.

**Architecture:** Four small pure modules under `/app` (forecast pipeline, screening state, plan flow, screen copy) with tests, then a shared-state hook, four components, the Plan screen, a refactored body map screen and a new app shell. Every plan goes through the engine's `planOrGuardrail`; no engine file changes.

**Tech Stack:** Expo SDK 57 (React Native 0.86, react-native-web), TypeScript strict, Vitest. No new dependencies.

**Spec:** `docs/superpowers/specs/2026-09-20-plan-screen-design.md`. Builds on `docs/superpowers/specs/2026-09-20-plan-engine-design.md` (branch `feat/plan-engine`).

## Global Constraints

Every task's requirements include these, copied from the spec:

- **No engine change.** Nothing under `engine/` or `data/` is edited. Plans are built only through `planOrGuardrail`; the app never calls `buildPlan`.
- **Every health answer starts unanswered (`null`), never "no".** The screens contain no pre-answered `under18: false`, `medicalCondition: false` or `redFlags: []` literal.
- **Build my plan is disabled until all three health questions are answered.** Any red flag, under 18 or a medical condition means no plan and the engine's message.
- All health wording comes from the engine (`RED_FLAG_PROMPT`, `RED_FLAG_QUESTIONS`, `UNDER_18_QUESTION`, `MEDICAL_CONDITION_QUESTION`, `PLAN_DISCLAIMER`, the blocked `message`). Other screen text lives in `app/planCopy.ts`.
- The existing app honesty scan applies to every new file: banned words `diagnos`, `accura`, `clinical`, `prevent`, `cure`, `validated`, `treat`, `boost`, `oxygen`, `blood flow`, and "reduce soreness" / "relieve soreness" only in a line saying it has "not been shown".
- The title, the "SYNTHETIC DATA" banner and the disclaimer footer are always visible (in the shell, outside the tabs). Both tabs stay mounted; the inactive one is hidden.
- No persistence, no navigation library, no new dependencies, no LLM.
- **Do not link a git remote.** The user does that.
- Commit messages end with the line `Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>`.

**Working directory for every command:** `C:\Users\priya\Desktop\Sore Spot` (Git Bash path `/c/Users/priya/Desktop/Sore Spot`). Baseline: branch `feat/plan-screen` (from `feat/plan-engine`, tip 69ffd1a), 204 tests in 23 files passing, `npm run typecheck` clean. The SDD controller creates the branch.

**Line endings:** this repo's working tree has Windows line endings. For every file below marked "replace whole file", overwrite the entire file with the block shown using the file-writing tool. Do not use search-and-replace edits: multi-line matches silently fail on Windows line endings.

**How these files were produced:** every block was first run in a scratch copy: 230 Vitest tests passing, `tsc --strict` clean, `expo export --platform web` building, and a 126-check headless-browser drive at 390x844 and 375x667 passing. Twenty key wiring and logic lines were mutation-checked (each broken on purpose and caught). Copy the blocks exactly.

## File Structure

```
app/forecastState.ts, app/forecastState.test.ts     the shared forecast pipeline, pure                    (Task 1)
app/screening.ts, app/screening.test.ts             health-answer state, null = unanswered                (Task 1)
app/planFlow.ts, app/planFlow.test.ts               options, computePlan via planOrGuardrail, formatting  (Task 1)
app/planCopy.ts                                     screen strings                                        (Task 1)
app/useSoreSpot.ts                                  shared state hook                                     (Task 2)
app/components/ChipRow.tsx, HealthQuestions.tsx, PlanResultView.tsx, TabBar.tsx                           (Task 2)
app/PlanScreen.tsx                                  gate -> form -> result                                (Task 2)
app/BodyMapScreen.tsx (whole file)                  takes { spot }; header and footer move to the shell   (Task 2)
App.tsx (whole file)                                the shell                                             (Task 2)
app/honesty.test.ts (whole file)                    + wiring tests                                        (Task 2)
```

---

### Task 1: Forecast pipeline, screening state, plan flow and copy (pure)

**Files:**
- Create: `app/forecastState.ts`, `app/screening.ts`, `app/planFlow.ts`, `app/planCopy.ts`
- Test: `app/forecastState.test.ts`, `app/screening.test.ts`, `app/planFlow.test.ts`

**Interfaces:**
- Consumes: `computeForecast`, `defaultSensitivity`, `planOrGuardrail`, `RED_FLAGS`, and the types `Forecast`, `Sensitivity`, `TaggedWorkout`, `PlanResult`, `PlannedExercise`, `Recovery`, `Eligibility`, `RedFlag` from `engine/index.ts`; `sensitivityFromCheckIns`, `CheckIns` from `app/checkin.ts`; `applyTags`, `describeWorkout`, `Tags` from `app/tagging.ts`; `weekdayLabel` from `app/scrubber.ts`; the type `UntaggedSession` from `app/components/TagPrompt.tsx`; `DEMO_AS_OF` from `app/config.ts`.
- Produces (used by Task 2):
  - `app/forecastState.ts`: `ForecastState { tagged, forecast, sensitivity, untagged }`, `buildForecastState(workouts, tags, checkIns, asOf)`.
  - `app/screening.ts`: `Screening { redFlags: RedFlag[] | null; under18: boolean | null; medicalCondition: boolean | null }`, `initialScreening()`, `answerNoRedFlags`, `toggleRedFlag`, `answerUnder18`, `answerMedicalCondition`, `eligibilityOf`, `isAnswered`.
  - `app/planFlow.ts`: `PlanChoice { goal: string; daysPerWeek: number; equipment: string }`, `Option<T> { value; label }`, `GOAL_OPTIONS`, `DAYS_OPTIONS` (3 to 7), `EQUIPMENT_OPTIONS`, `DEFAULT_CHOICE`, `computePlan(args)`, `planDayHeading(asOf, day)`, `setsAndReps(exercise)`.
  - `app/planCopy.ts`: `TAB_LABELS`, `PLAN_TAG_GATE_HEADING`, `PLAN_TAG_GATE_TEXT`, `PLAN_SKIP_TAGS`, `HEALTH_HEADING`, `HEALTH_INTRO`, `NONE_OF_THESE`, `YES`, `NO`, `REQUEST_HEADING`, `GOAL_LABEL`, `DAYS_LABEL`, `EQUIPMENT_LABEL`, `BUILD_PLAN`, `BUILD_HINT`, `CHANGE_ANSWERS`, `PLAN_HEADING`, `NOTES_HEADING`, `BLOCKED_HEADING`, `WHY_HEADING`.

- [ ] **Step 1: Write the failing tests**

You are on branch `feat/plan-screen` (created by the controller). Confirm with `git branch --show-current`.

Create `app/forecastState.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { syntheticReplay } from '../data/replay.synthetic';
import { buildForecastState } from './forecastState';
import { DEMO_AS_OF } from './config';

const build = (tags = {}, checkIns = {}) =>
  buildForecastState(syntheticReplay.workouts, tags, checkIns, DEMO_AS_OF);

describe('buildForecastState', () => {
  it('lists the untagged demo session with a label the member can recognize', () => {
    const state = build();
    expect(state.forecast.needsTag).toEqual(['d-wed-strength']);
    expect(state.untagged).toEqual([{ id: 'd-wed-strength', label: 'Wed Sep 16 · Weightlifting' }]);
  });

  it('stops asking about a session once it is tagged, and the tag changes the forecast', () => {
    const before = build();
    const after = build({ 'd-wed-strength': 'lower' });
    expect(after.untagged).toEqual([]);
    expect(after.forecast.needsTag).toEqual([]);
    expect(JSON.stringify(after.forecast.byDay)).not.toBe(JSON.stringify(before.forecast.byDay));
  });

  it('does not change the workouts it was given', () => {
    const snapshot = JSON.stringify(syntheticReplay.workouts);
    build({ 'd-wed-strength': 'upper' });
    expect(JSON.stringify(syntheticReplay.workouts)).toBe(snapshot);
  });

  it('check-ins nudge sensitivity from the default, so repeating one never stacks', () => {
    const once = build({}, { chest: 3 });
    const again = build({}, { chest: 3 });
    expect(once.sensitivity.chest).toBeGreaterThan(1);
    expect(again.sensitivity.chest).toBe(once.sensitivity.chest);
    expect(build().sensitivity.chest).toBe(1);
  });
});
```

Create `app/screening.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { RED_FLAGS } from '../engine';
import {
  answerMedicalCondition,
  answerNoRedFlags,
  answerUnder18,
  eligibilityOf,
  initialScreening,
  isAnswered,
  toggleRedFlag,
} from './screening';

describe('screening state', () => {
  it('starts with every answer unanswered, never "no"', () => {
    expect(initialScreening()).toEqual({ redFlags: null, under18: null, medicalCondition: null });
    expect(isAnswered(initialScreening())).toBe(false);
  });

  it('is finished only when all three questions have an answer', () => {
    let s = answerNoRedFlags(initialScreening());
    expect(isAnswered(s)).toBe(false);
    s = answerUnder18(s, false);
    expect(isAnswered(s)).toBe(false);
    s = answerMedicalCondition(s, false);
    expect(isAnswered(s)).toBe(true);
  });

  it('keeps chosen red flags in the engine order and lets "none" and a flag replace each other', () => {
    let s = toggleRedFlag(initialScreening(), 'numbness');
    s = toggleRedFlag(s, 'swelling');
    expect(s.redFlags).toEqual(['swelling', 'numbness']);
    expect(RED_FLAGS.indexOf('swelling')).toBeLessThan(RED_FLAGS.indexOf('numbness'));
    expect(answerNoRedFlags(s).redFlags).toEqual([]);
    expect(toggleRedFlag(answerNoRedFlags(s), 'weakness').redFlags).toEqual(['weakness']);
  });

  it('unticking the last red flag goes back to unanswered, not to "none"', () => {
    let s = toggleRedFlag(initialScreening(), 'swelling');
    s = toggleRedFlag(s, 'swelling');
    expect(s.redFlags).toBeNull();
    expect(isAnswered(answerMedicalCondition(answerUnder18(s, false), false))).toBe(false);
  });

  it('never changes the state it was given', () => {
    const s = initialScreening();
    toggleRedFlag(s, 'swelling');
    answerUnder18(s, true);
    expect(s).toEqual({ redFlags: null, under18: null, medicalCondition: null });
  });

  it('hands the engine the eligibility answers exactly as given', () => {
    expect(eligibilityOf(initialScreening())).toEqual({ under18: null, medicalCondition: null });
    const s = answerMedicalCondition(answerUnder18(initialScreening(), true), false);
    expect(eligibilityOf(s)).toEqual({ under18: true, medicalCondition: false });
  });
});
```

Create `app/planFlow.test.ts`:

```ts
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
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run app/forecastState.test.ts app/screening.test.ts app/planFlow.test.ts`
Expected: FAIL. All three files fail to resolve `./forecastState`, `./screening` and `./planFlow`. Paste the real output.

- [ ] **Step 3: Write the implementation**

Create `app/forecastState.ts`:

```ts
import {
  computeForecast,
  defaultSensitivity,
  type Forecast,
  type Sensitivity,
  type TaggedWorkout,
} from '../engine';
import { sensitivityFromCheckIns, type CheckIns } from './checkin';
import type { UntaggedSession } from './components/TagPrompt';
import { applyTags, describeWorkout, type Tags } from './tagging';

export interface ForecastState {
  /** The workouts with the member's tags applied. */
  tagged: TaggedWorkout[];
  forecast: Forecast;
  sensitivity: Sensitivity;
  /** Strength sessions that still need a tag, with a label the member can recognize. */
  untagged: UntaggedSession[];
}

/**
 * Tags change which muscles a session loads. Check-ins are then rebuilt from the default sensitivity
 * and the default forecast for Now, so they never stack.
 */
export function buildForecastState(
  workouts: TaggedWorkout[],
  tags: Tags,
  checkIns: CheckIns,
  asOf: Date,
): ForecastState {
  const tagged = applyTags(workouts, tags);
  const base = computeForecast(tagged, asOf, defaultSensitivity());
  const sensitivity = sensitivityFromCheckIns(checkIns, base.byDay[0]);
  const forecast = computeForecast(tagged, asOf, sensitivity);
  const untagged = tagged
    .filter((w) => forecast.needsTag.includes(w.id))
    .map((w) => ({ id: w.id, label: describeWorkout(w) }));
  return { tagged, forecast, sensitivity, untagged };
}
```

Create `app/screening.ts`:

```ts
import { RED_FLAGS, type Eligibility, type RedFlag } from '../engine';

/** `null` means "not answered yet", which is different from "no". A plan needs every answer. */
export interface Screening {
  redFlags: RedFlag[] | null;
  under18: boolean | null;
  medicalCondition: boolean | null;
}

export function initialScreening(): Screening {
  return { redFlags: null, under18: null, medicalCondition: null };
}

/** The member ticked "None of these apply". */
export function answerNoRedFlags(s: Screening): Screening {
  return { ...s, redFlags: [] };
}

/**
 * Ticks or unticks one red flag. Unticking the last one goes back to unanswered, never to
 * "none": only "None of these apply" answers that.
 */
export function toggleRedFlag(s: Screening, flag: RedFlag): Screening {
  const chosen = new Set(s.redFlags ?? []);
  if (chosen.has(flag)) chosen.delete(flag);
  else chosen.add(flag);
  const next = RED_FLAGS.filter((f) => chosen.has(f));
  return { ...s, redFlags: next.length === 0 ? null : next };
}

export function answerUnder18(s: Screening, answer: boolean): Screening {
  return { ...s, under18: answer };
}

export function answerMedicalCondition(s: Screening, answer: boolean): Screening {
  return { ...s, medicalCondition: answer };
}

export function eligibilityOf(s: Screening): Eligibility {
  return { under18: s.under18, medicalCondition: s.medicalCondition };
}

/** Every question has an answer. Any "yes" still stops the plan; this only says the screen is finished. */
export function isAnswered(s: Screening): boolean {
  return s.redFlags !== null && s.under18 !== null && s.medicalCondition !== null;
}
```

Create `app/planFlow.ts`:

```ts
import {
  planOrGuardrail,
  type Forecast,
  type PlanResult,
  type PlannedExercise,
  type Recovery,
  type TaggedWorkout,
} from '../engine';
import { eligibilityOf, type Screening } from './screening';
import { weekdayLabel } from './scrubber';

/** What the member picked. Kept as plain strings and numbers: the engine validates them. */
export interface PlanChoice {
  goal: string;
  daysPerWeek: number;
  equipment: string;
}

export interface Option<T> {
  value: T;
  label: string;
}

// "Lose weight" and 6 or 7 days are offered on purpose: the guardrails decline them with a reason.
export const GOAL_OPTIONS: Option<string>[] = [
  { value: 'muscle', label: 'Build muscle' },
  { value: 'strength', label: 'Get stronger' },
  { value: 'lose-weight', label: 'Lose weight' },
];
export const DAYS_OPTIONS: Option<number>[] = [3, 4, 5, 6, 7].map((n) => ({ value: n, label: String(n) }));
export const EQUIPMENT_OPTIONS: Option<string>[] = [
  { value: 'bodyweight', label: 'Bodyweight' },
  { value: 'dumbbells', label: 'Dumbbells' },
  { value: 'gym', label: 'Gym' },
];

export const DEFAULT_CHOICE: PlanChoice = { goal: 'muscle', daysPerWeek: 4, equipment: 'gym' };

interface PlanArgs {
  forecast: Forecast;
  workouts: TaggedWorkout[];
  recovery: Recovery[];
  asOf: Date;
  screening: Screening;
  choice: PlanChoice;
}

/** Every guardrail runs inside planOrGuardrail: nothing here can build a plan around it. */
export function computePlan(args: PlanArgs): PlanResult {
  return planOrGuardrail({
    forecast: args.forecast,
    workouts: args.workouts,
    recovery: args.recovery,
    asOf: args.asOf,
    redFlags: args.screening.redFlags,
    eligibility: eligibilityOf(args.screening),
    request: args.choice,
  });
}

/** "Sun · tomorrow", "Mon · in 2 days". Plan day 1 is the day after asOf. */
export function planDayHeading(asOf: Date, day: number): string {
  return `${weekdayLabel(asOf, day)} · ${day === 1 ? 'tomorrow' : `in ${day} days`}`;
}

/** "3 sets of 8 to 12 reps", "3 sets of 30 to 45 seconds". */
export function setsAndReps(exercise: Pick<PlannedExercise, 'sets' | 'reps'>): string {
  const unit = exercise.reps.includes('seconds') ? '' : ' reps';
  return `${exercise.sets} sets of ${exercise.reps}${unit}`;
}
```

Create `app/planCopy.ts`:

```ts
export const TAB_LABELS = { body: 'Body map', plan: 'Plan' } as const;

export const PLAN_TAG_GATE_HEADING = 'Before we plan';
export const PLAN_TAG_GATE_TEXT =
  'These strength sessions are not counted until you say which muscles they worked. Tagging them gives the plan a fuller picture of your week.';
export const PLAN_SKIP_TAGS = 'Plan without these';

export const HEALTH_HEADING = 'A few health questions';
export const HEALTH_INTRO = 'Answer every question. A plan is only built once you have.';
export const NONE_OF_THESE = 'None of these apply';
export const YES = 'Yes';
export const NO = 'No';

export const REQUEST_HEADING = 'What should the plan be built for?';
export const GOAL_LABEL = 'Goal';
export const DAYS_LABEL = 'Training days per week';
export const EQUIPMENT_LABEL = 'Equipment';

export const BUILD_PLAN = 'Build my plan';
export const BUILD_HINT = 'Answer every health question to continue.';
export const CHANGE_ANSWERS = 'Change answers';

export const PLAN_HEADING = 'Your next 7 days';
export const NOTES_HEADING = 'This week';
export const BLOCKED_HEADING = 'No plan for now';
export const WHY_HEADING = 'Why';
```

- [ ] **Step 4: Run the whole suite and typecheck**

Run: `npm test && npm run typecheck`
Expected: 26 test files, 223 tests pass (the 204 existing plus 4 + 6 + 9); typecheck prints no errors.

- [ ] **Step 5: Prove the safety tests can fail**

Break each line on purpose, run the suite, and restore it with `git checkout` (nothing is committed yet, so use `cp` to keep a backup instead):
```bash
cp app/screening.ts /tmp/screening.bak
sed -i "s/return { redFlags: null, under18: null, medicalCondition: null };/return { redFlags: null, under18: false, medicalCondition: false };/" app/screening.ts
npx vitest run app/screening.test.ts
cp /tmp/screening.bak app/screening.ts
cp app/planFlow.ts /tmp/planflow.bak
sed -i "s/redFlags: args.screening.redFlags,/redFlags: args.screening.redFlags ?? [],/" app/planFlow.ts
npx vitest run app/planFlow.test.ts
cp /tmp/planflow.bak app/planFlow.ts
npx vitest run app/screening.test.ts app/planFlow.test.ts
```
Expected: the first run FAILS (the "starts with every answer unanswered" test among others); the second run FAILS ("never builds a plan while a question is unanswered"); the third passes. Confirm `git diff --stat` shows no change to `app/screening.ts` or `app/planFlow.ts` versus what you wrote. Paste all three outputs.

- [ ] **Step 6: Commit**

```bash
git add app
git commit -m "$(cat <<'EOF'
Add the forecast pipeline, health-answer state and plan flow as pure modules

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 2: Shared state, Plan screen, shell and navigation

**Files:**
- Create: `app/useSoreSpot.ts`, `app/components/ChipRow.tsx`, `app/components/HealthQuestions.tsx`, `app/components/PlanResultView.tsx`, `app/components/TabBar.tsx`, `app/PlanScreen.tsx`
- Replace (whole file): `app/BodyMapScreen.tsx`, `App.tsx`, `app/honesty.test.ts`

**Interfaces:**
- Consumes: everything Task 1 produces; `TagPrompt` (`sessions`, `onTag`), `DayScrubber`, `BodyMap`, `MuscleSheet` and the copy helpers from B1/B2 unchanged; `loadReplay` from `data/index.ts`; `DISCLAIMER`, `SYNTHETIC_BANNER` from `app/copy.ts`.
- Produces: `useSoreSpot()` returning `{ replay, asOf, checkIns, checkIn, tagSession, tagged, forecast, sensitivity, untagged }` and the type `SoreSpot`; `Tab`, `TabBar`; the default exports `PlanScreen({ spot })` and `BodyMapScreen({ spot })`.

`BodyMapScreen` loses its own state, header and footer: it renders only the body map content and gets the forecast, sensitivity, untagged sessions, check-ins and the two setters from `spot`. The side, day and open-sheet state stay inside it. Its behavior does not change.

- [ ] **Step 1: Write the failing wiring tests**

Replace `app/honesty.test.ts` with:

```ts
import { readdirSync, readFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { describe, expect, it } from 'vitest';

// Scans every non-test source file under app/, so text added to a component later is covered too.
const BANNED = /diagnos|accura|clinical|prevent|cure|validated|treat|boost|oxygen|blood flow/i;
const SORENESS_CLAIM = /(reduce|relieve) soreness/i;
const NEGATED = /(not|n't) been shown/i;

function sourceFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) return sourceFiles(full);
    return /\.(ts|tsx)$/.test(entry.name) && !/\.test\.(ts|tsx)$/.test(entry.name) ? [full] : [];
  });
}

const files = sourceFiles(__dirname).map((f) => ({
  rel: relative(__dirname, f).replace(/\\/g, '/'),
  text: readFileSync(f, 'utf8'),
}));

const text = (rel: string) => files.find((f) => f.rel === rel)?.text ?? '';

describe('required lines stay wired into the sheet', () => {
  it('shows the clinician safety line in the sheet itself, outside the scrolling move list', () => {
    expect(text('components/MuscleSheet.tsx')).toMatch(/{SAFETY_LINE}/);
    expect(text('components/MoveList.tsx')).not.toMatch(/SAFETY_LINE/);
  });

  it('shows the stretching honesty line and the ease-off cue in the move list', () => {
    expect(text('components/MoveList.tsx')).toMatch(/{STRETCH_HONESTY}/);
    expect(text('components/MoveList.tsx')).toMatch(/{MOVE_CUE}/);
  });
});

describe('required lines stay wired into the plan screens', () => {
  it('shows the plan disclaimer with every plan, and the engine message for every blocked result', () => {
    expect(text('components/PlanResultView.tsx')).toMatch(/{PLAN_DISCLAIMER}/);
    expect(text('components/PlanResultView.tsx')).toMatch(/{result\.message}/);
  });

  it('frames the health screen with the engine prompt and asks every engine question', () => {
    const health = text('components/HealthQuestions.tsx');
    expect(health).toMatch(/{RED_FLAG_PROMPT}/);
    expect(health).toMatch(/RED_FLAG_QUESTIONS\[flag\]/);
    expect(health).toMatch(/question={UNDER_18_QUESTION}/);
    expect(health).toMatch(/question={MEDICAL_CONDITION_QUESTION}/);
  });

  it('starts every health answer unanswered and never pre-answers one', () => {
    expect(text('PlanScreen.tsx')).toMatch(/useState<Screening>\(initialScreening\)/);
    for (const rel of ['PlanScreen.tsx', 'components/HealthQuestions.tsx']) {
      expect(text(rel), rel).not.toMatch(/under18:\s*false|medicalCondition:\s*false|redFlags:\s*\[\]/);
    }
  });

  it('keeps Build my plan disabled until every health question is answered', () => {
    expect(text('PlanScreen.tsx')).toMatch(/disabled={!isAnswered\(screening\)}/);
  });

  it('asks every red flag, shows the disclaimer only with a plan and the message only when blocked', () => {
    expect(text('components/HealthQuestions.tsx')).toMatch(/RED_FLAGS\.map\(/);
    const view = text('components/PlanResultView.tsx');
    const planBranch = view.indexOf('const { plan } = result');
    expect(planBranch).toBeGreaterThan(-1);
    expect(view.indexOf('{result.message}')).toBeLessThan(planBranch);
    expect(view.indexOf('{PLAN_DISCLAIMER}')).toBeGreaterThan(planBranch);
  });

  it('runs the plan through the engine guardrails, never around them', () => {
    expect(text('planFlow.ts')).toMatch(/planOrGuardrail\(/);
    for (const f of files) expect(f.text, f.rel).not.toMatch(/buildPlan/);
  });

  it('keeps the synthetic banner and the disclaimer in the shell, outside the tabs', () => {
    const shell = readFileSync(join(__dirname, '..', 'App.tsx'), 'utf8');
    expect(shell).toMatch(/{SYNTHETIC_BANNER}/);
    expect(shell).toMatch(/{DISCLAIMER}/);
    expect(shell).toMatch(/<TabBar /);
    // Both tabs stay mounted so switching does not lose the day, side or answers.
    expect(shell).toMatch(/<BodyMapScreen spot={spot} \/>/);
    expect(shell).toMatch(/<PlanScreen spot={spot} \/>/);
    expect(shell).toMatch(/tab !== 'body' && styles\.hidden/);
    expect(shell).toMatch(/tab !== 'plan' && styles\.hidden/);
    expect(shell).toMatch(/hidden: { display: 'none' }/);
    expect(shell).not.toMatch(BANNED);
  });
});

describe('honesty scan over the app source', () => {
  it('found the app source files', () => {
    expect(files.length).toBeGreaterThanOrEqual(12);
    expect(files.map((f) => f.rel)).toEqual(expect.arrayContaining(['copy.ts', 'BodyMapScreen.tsx']));
  });

  it('never uses a banned word in any source file', () => {
    for (const f of files) expect(f.text, f.rel).not.toMatch(BANNED);
  });

  it('only mentions reducing or relieving soreness in a line that says it has not been shown', () => {
    for (const f of files) {
      for (const line of f.text.split('\n')) {
        if (SORENESS_CLAIM.test(line)) expect(line, `${f.rel}: ${line.trim()}`).toMatch(NEGATED);
      }
    }
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run app/honesty.test.ts`
Expected: FAIL. The new "required lines stay wired into the plan screens" tests fail because the screens do not exist yet (the shell test cannot find `<TabBar />`, the others read empty text). The older honesty tests still pass. Paste the real output.

- [ ] **Step 3: Write the implementation**

Create `app/useSoreSpot.ts`:

```ts
import { useCallback, useMemo, useState } from 'react';
import { loadReplay } from '../data';
import type { Muscle, StrengthTag } from '../engine';
import type { CheckInLevel, CheckIns } from './checkin';
import { DEMO_AS_OF } from './config';
import { buildForecastState } from './forecastState';
import type { Tags } from './tagging';

/** The state both tabs share: the workouts, the member's tags and check-ins, and the forecast they produce. */
export function useSoreSpot() {
  const replay = useMemo(() => loadReplay(), []);
  const [checkIns, setCheckIns] = useState<CheckIns>({});
  const [tags, setTags] = useState<Tags>({});

  const state = useMemo(
    () => buildForecastState(replay.workouts, tags, checkIns, DEMO_AS_OF),
    [replay, tags, checkIns],
  );

  const checkIn = useCallback(
    (muscle: Muscle, level: CheckInLevel) => setCheckIns((cur) => ({ ...cur, [muscle]: level })),
    [],
  );
  const tagSession = useCallback(
    (id: string, tag: StrengthTag) => setTags((cur) => ({ ...cur, [id]: tag })),
    [],
  );

  return { replay, asOf: DEMO_AS_OF, checkIns, checkIn, tagSession, ...state };
}

export type SoreSpot = ReturnType<typeof useSoreSpot>;
```

Create `app/components/ChipRow.tsx`:

```tsx
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { Option } from '../planFlow';

interface Props<T> {
  label: string;
  options: Option<T>[];
  value: T;
  onChange: (value: T) => void;
}

/** A labelled row of single-choice chips. */
export default function ChipRow<T extends string | number>({ label, options, value, onChange }: Props<T>) {
  return (
    <View style={styles.wrap}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.row}>
        {options.map((option) => {
          const on = option.value === value;
          return (
            <Pressable
              key={String(option.value)}
              onPress={() => onChange(option.value)}
              hitSlop={4}
              accessibilityRole="button"
              accessibilityLabel={`${label}: ${option.label}`}
              accessibilityState={{ selected: on }}
              style={[styles.chip, on && styles.chipOn]}
            >
              <Text style={[styles.chipText, on && styles.chipTextOn]}>{option.label}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 6 },
  label: { fontSize: 13, fontWeight: '600', color: '#26312F' },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { paddingVertical: 8, paddingHorizontal: 14, borderRadius: 18, backgroundColor: '#EEF1F2' },
  chipOn: { backgroundColor: '#1E7A6C' },
  chipText: { fontSize: 14, fontWeight: '600', color: '#26312F' },
  chipTextOn: { color: '#FFFFFF' },
});
```

Create `app/components/HealthQuestions.tsx`:

```tsx
import { Pressable, StyleSheet, Text, View } from 'react-native';
import {
  MEDICAL_CONDITION_QUESTION,
  RED_FLAGS,
  RED_FLAG_PROMPT,
  RED_FLAG_QUESTIONS,
  UNDER_18_QUESTION,
} from '../../engine';
import { HEALTH_HEADING, HEALTH_INTRO, NONE_OF_THESE, NO, YES } from '../planCopy';
import {
  answerMedicalCondition,
  answerNoRedFlags,
  answerUnder18,
  toggleRedFlag,
  type Screening,
} from '../screening';

interface Props {
  screening: Screening;
  onChange: (next: Screening) => void;
}

function YesNo({ question, value, onAnswer }: { question: string; value: boolean | null; onAnswer: (v: boolean) => void }) {
  return (
    <View style={styles.block}>
      <Text style={styles.question}>{question}</Text>
      <View style={styles.row}>
        {[true, false].map((answer) => (
          <Pressable
            key={String(answer)}
            onPress={() => onAnswer(answer)}
            hitSlop={4}
            accessibilityRole="button"
            accessibilityLabel={`${question} ${answer ? YES : NO}`}
            accessibilityState={{ selected: value === answer }}
            style={[styles.chip, value === answer && styles.chipOn]}
          >
            <Text style={[styles.chipText, value === answer && styles.chipTextOn]}>{answer ? YES : NO}</Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

/** Every answer starts empty. Nothing here is ever pre-answered "no". */
export default function HealthQuestions({ screening, onChange }: Props) {
  const none = screening.redFlags !== null && screening.redFlags.length === 0;
  return (
    <View style={styles.wrap}>
      <Text style={styles.heading}>{HEALTH_HEADING}</Text>
      <Text style={styles.intro}>{HEALTH_INTRO}</Text>

      <View style={styles.block}>
        <Text style={styles.question}>{RED_FLAG_PROMPT}</Text>
        {RED_FLAGS.map((flag) => {
          const on = screening.redFlags?.includes(flag) ?? false;
          return (
            <Pressable
              key={flag}
              onPress={() => onChange(toggleRedFlag(screening, flag))}
              accessibilityRole="checkbox"
              accessibilityLabel={RED_FLAG_QUESTIONS[flag]}
              accessibilityState={{ checked: on }}
              style={[styles.flag, on && styles.flagOn]}
            >
              <Text style={styles.flagText}>{`${on ? '☑' : '☐'}  ${RED_FLAG_QUESTIONS[flag]}`}</Text>
            </Pressable>
          );
        })}
        <Pressable
          onPress={() => onChange(answerNoRedFlags(screening))}
          hitSlop={4}
          accessibilityRole="button"
          accessibilityState={{ selected: none }}
          style={[styles.chip, none && styles.chipOn]}
        >
          <Text style={[styles.chipText, none && styles.chipTextOn]}>{NONE_OF_THESE}</Text>
        </Pressable>
      </View>

      <YesNo
        question={UNDER_18_QUESTION}
        value={screening.under18}
        onAnswer={(v) => onChange(answerUnder18(screening, v))}
      />
      <YesNo
        question={MEDICAL_CONDITION_QUESTION}
        value={screening.medicalCondition}
        onAnswer={(v) => onChange(answerMedicalCondition(screening, v))}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 12, padding: 12, borderRadius: 12, backgroundColor: '#F6F8F8', borderWidth: 1, borderColor: '#E3EAE8' },
  heading: { fontSize: 16, fontWeight: '700', color: '#16211F' },
  intro: { fontSize: 12, color: '#5C6866' },
  block: { gap: 8 },
  question: { fontSize: 14, fontWeight: '600', color: '#26312F' },
  row: { flexDirection: 'row', gap: 8 },
  flag: { paddingVertical: 8, paddingHorizontal: 10, borderRadius: 10, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#D5DEDC' },
  flagOn: { borderColor: '#B45309', backgroundColor: '#FFF7ED' },
  flagText: { fontSize: 14, color: '#26312F' },
  chip: { alignSelf: 'flex-start', paddingVertical: 8, paddingHorizontal: 14, borderRadius: 18, backgroundColor: '#EEF1F2' },
  chipOn: { backgroundColor: '#1E7A6C' },
  chipText: { fontSize: 14, fontWeight: '600', color: '#26312F' },
  chipTextOn: { color: '#FFFFFF' },
});
```

Create `app/components/PlanResultView.tsx`:

```tsx
import { StyleSheet, Text, View } from 'react-native';
import { PLAN_DISCLAIMER, type PlanResult } from '../../engine';
import { BLOCKED_HEADING, NOTES_HEADING, PLAN_HEADING, WHY_HEADING } from '../planCopy';
import { planDayHeading, setsAndReps } from '../planFlow';

interface Props {
  result: PlanResult;
  asOf: Date;
}

/** Either the reason there is no plan, or the 7-day plan with the reason for every choice. */
export default function PlanResultView({ result, asOf }: Props) {
  if (result.kind === 'blocked') {
    return (
      <View style={styles.blocked}>
        <Text style={styles.blockedHeading}>{BLOCKED_HEADING}</Text>
        <Text style={styles.blockedText}>{result.message}</Text>
      </View>
    );
  }
  const { plan } = result;
  return (
    <View style={styles.wrap}>
      <Text style={styles.heading}>{PLAN_HEADING}</Text>
      {plan.notes.length > 0 && (
        <View style={styles.notes}>
          <Text style={styles.notesHeading}>{NOTES_HEADING}</Text>
          {plan.notes.map((note) => (
            <Text key={note} style={styles.noteText}>{`• ${note}`}</Text>
          ))}
        </View>
      )}
      {plan.days.map((session) => (
        <View key={session.day} style={[styles.card, session.kind === 'rest' && styles.cardRest]}>
          <Text style={styles.cardDay}>{planDayHeading(asOf, session.day)}</Text>
          <Text style={styles.cardTitle}>{session.title}</Text>
          {session.exercises.map((exercise) => (
            <View key={exercise.id} style={styles.exercise}>
              <Text style={styles.exerciseName}>{exercise.name}</Text>
              <Text style={styles.exerciseLine}>{`${setsAndReps(exercise)} · ${exercise.effort}`}</Text>
              {exercise.note !== undefined && <Text style={styles.exerciseNote}>{exercise.note}</Text>}
            </View>
          ))}
          {session.why.length > 0 && (
            <View style={styles.why}>
              <Text style={styles.whyHeading}>{WHY_HEADING}</Text>
              {session.why.map((line) => (
                <Text key={line} style={styles.whyText}>{`• ${line}`}</Text>
              ))}
            </View>
          )}
        </View>
      ))}
      <Text style={styles.disclaimer}>{PLAN_DISCLAIMER}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 12 },
  heading: { fontSize: 18, fontWeight: '700', color: '#16211F' },
  notes: { gap: 4, padding: 12, borderRadius: 12, backgroundColor: '#FFF7ED', borderWidth: 1, borderColor: '#F3D9B5' },
  notesHeading: { fontSize: 13, fontWeight: '700', color: '#7A3E08' },
  noteText: { fontSize: 13, color: '#5B3A12' },
  card: { gap: 6, padding: 12, borderRadius: 12, backgroundColor: '#F6F8F8', borderWidth: 1, borderColor: '#E3EAE8' },
  cardRest: { backgroundColor: '#FFFFFF' },
  cardDay: { fontSize: 12, fontWeight: '700', color: '#1E5F55' },
  cardTitle: { fontSize: 16, fontWeight: '700', color: '#16211F' },
  exercise: { gap: 2, marginTop: 4 },
  exerciseName: { fontSize: 14, fontWeight: '600', color: '#26312F' },
  exerciseLine: { fontSize: 13, color: '#4B5856' },
  exerciseNote: { fontSize: 12, color: '#7A3E08' },
  why: { gap: 2, marginTop: 6 },
  whyHeading: { fontSize: 12, fontWeight: '700', color: '#4B5856' },
  whyText: { fontSize: 12, color: '#5C6866' },
  disclaimer: { fontSize: 12, color: '#5C6866' },
  blocked: { gap: 6, padding: 14, borderRadius: 12, backgroundColor: '#FFF7ED', borderWidth: 1, borderColor: '#F3D9B5' },
  blockedHeading: { fontSize: 16, fontWeight: '700', color: '#7A3E08' },
  blockedText: { fontSize: 14, color: '#5B3A12' },
});
```

Create `app/components/TabBar.tsx`:

```tsx
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { TAB_LABELS } from '../planCopy';

export type Tab = keyof typeof TAB_LABELS;
export const TABS: readonly Tab[] = ['body', 'plan'];

interface Props {
  tab: Tab;
  onChange: (tab: Tab) => void;
}

export default function TabBar({ tab, onChange }: Props) {
  return (
    <View style={styles.bar}>
      {TABS.map((t) => (
        <Pressable
          key={t}
          onPress={() => onChange(t)}
          accessibilityRole="button"
          accessibilityState={{ selected: tab === t }}
          style={[styles.tab, tab === t && styles.tabOn]}
        >
          <Text style={[styles.tabText, tab === t && styles.tabTextOn]}>{TAB_LABELS[t]}</Text>
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: { flexDirection: 'row', borderTopWidth: 1, borderTopColor: '#E3EAE8', backgroundColor: '#FFFFFF', paddingBottom: 12 },
  tab: { flex: 1, alignItems: 'center', paddingVertical: 12 },
  tabOn: { borderTopWidth: 3, borderTopColor: '#1E7A6C', marginTop: -1 },
  tabText: { fontSize: 15, fontWeight: '600', color: '#5C6866' },
  tabTextOn: { color: '#1E7A6C' },
});
```

Create `app/PlanScreen.tsx`:

```tsx
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import ChipRow from './components/ChipRow';
import HealthQuestions from './components/HealthQuestions';
import PlanResultView from './components/PlanResultView';
import TagPrompt from './components/TagPrompt';
import {
  BUILD_HINT,
  BUILD_PLAN,
  CHANGE_ANSWERS,
  DAYS_LABEL,
  EQUIPMENT_LABEL,
  GOAL_LABEL,
  PLAN_SKIP_TAGS,
  PLAN_TAG_GATE_HEADING,
  PLAN_TAG_GATE_TEXT,
  REQUEST_HEADING,
} from './planCopy';
import {
  DAYS_OPTIONS,
  DEFAULT_CHOICE,
  EQUIPMENT_OPTIONS,
  GOAL_OPTIONS,
  computePlan,
  type PlanChoice,
} from './planFlow';
import { initialScreening, isAnswered, type Screening } from './screening';
import type { SoreSpot } from './useSoreSpot';

interface Props {
  spot: SoreSpot;
}

/** Tag gate (when needed), then health questions and the request, then the plan or the reason there is none. */
export default function PlanScreen({ spot }: Props) {
  const [screening, setScreening] = useState<Screening>(initialScreening);
  const [choice, setChoice] = useState<PlanChoice>(DEFAULT_CHOICE);
  const [skippedTags, setSkippedTags] = useState(false);
  const [built, setBuilt] = useState(false);

  const gated = spot.untagged.length > 0 && !skippedTags;
  const setField = <K extends keyof PlanChoice>(key: K, value: PlanChoice[K]) =>
    setChoice((cur) => ({ ...cur, [key]: value }));

  if (gated) {
    return (
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.gate}>
          <Text style={styles.gateHeading}>{PLAN_TAG_GATE_HEADING}</Text>
          <Text style={styles.gateText}>{PLAN_TAG_GATE_TEXT}</Text>
        </View>
        <TagPrompt sessions={spot.untagged} onTag={spot.tagSession} />
        <Pressable onPress={() => setSkippedTags(true)} accessibilityRole="button" style={styles.secondary}>
          <Text style={styles.secondaryText}>{PLAN_SKIP_TAGS}</Text>
        </Pressable>
      </ScrollView>
    );
  }

  // Derived on every render, so a tag or check-in made after building can never leave an old plan on screen.
  const result = built
    ? computePlan({
        forecast: spot.forecast,
        workouts: spot.tagged,
        recovery: spot.replay.recovery ?? [],
        asOf: spot.asOf,
        screening,
        choice,
      })
    : null;

  return (
    // A different key for the form and the result gives each a fresh scroll view, so each opens at the top.
    <ScrollView key={result ? 'result' : 'form'} contentContainerStyle={styles.content}>
      {result ? (
        <>
          <PlanResultView result={result} asOf={spot.asOf} />
          <Pressable onPress={() => setBuilt(false)} accessibilityRole="button" style={styles.secondary}>
            <Text style={styles.secondaryText}>{CHANGE_ANSWERS}</Text>
          </Pressable>
        </>
      ) : (
        <>
          <HealthQuestions screening={screening} onChange={setScreening} />
          <View style={styles.request}>
            <Text style={styles.requestHeading}>{REQUEST_HEADING}</Text>
            <ChipRow label={GOAL_LABEL} options={GOAL_OPTIONS} value={choice.goal} onChange={(v) => setField('goal', v)} />
            <ChipRow label={DAYS_LABEL} options={DAYS_OPTIONS} value={choice.daysPerWeek} onChange={(v) => setField('daysPerWeek', v)} />
            <ChipRow label={EQUIPMENT_LABEL} options={EQUIPMENT_OPTIONS} value={choice.equipment} onChange={(v) => setField('equipment', v)} />
          </View>
          <Pressable
            onPress={() => setBuilt(true)}
            disabled={!isAnswered(screening)}
            accessibilityRole="button"
            accessibilityState={{ disabled: !isAnswered(screening) }}
            style={[styles.primary, !isAnswered(screening) && styles.primaryOff]}
          >
            <Text style={styles.primaryText}>{BUILD_PLAN}</Text>
          </Pressable>
          {!isAnswered(screening) && <Text style={styles.hint}>{BUILD_HINT}</Text>}
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, paddingTop: 8, gap: 12, paddingBottom: 32 },
  gate: { gap: 4 },
  gateHeading: { fontSize: 18, fontWeight: '700', color: '#16211F' },
  gateText: { fontSize: 13, color: '#4B5856' },
  request: { gap: 12, padding: 12, borderRadius: 12, backgroundColor: '#F6F8F8', borderWidth: 1, borderColor: '#E3EAE8' },
  requestHeading: { fontSize: 16, fontWeight: '700', color: '#16211F' },
  primary: { alignItems: 'center', paddingVertical: 14, borderRadius: 24, backgroundColor: '#1E7A6C' },
  primaryOff: { backgroundColor: '#B7C4C1' },
  primaryText: { fontSize: 16, fontWeight: '700', color: '#FFFFFF' },
  secondary: { alignItems: 'center', paddingVertical: 12, borderRadius: 24, backgroundColor: '#EEF1F2' },
  secondaryText: { fontSize: 15, fontWeight: '600', color: '#26312F' },
  hint: { fontSize: 12, color: '#5C6866', textAlign: 'center' },
});
```

Replace `app/BodyMapScreen.tsx` with:

```tsx
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import type { Muscle } from '../engine';
import { BAND_ORDER, bandColor } from './body/colors';
import { hasMuscle, type BodySide } from './body/zones';
import BodyMap from './components/BodyMap';
import DayScrubber from './components/DayScrubber';
import MuscleSheet from './components/MuscleSheet';
import TagPrompt from './components/TagPrompt';
import { BAND_LABELS, checkInFeedback, needsTagNote, unmappedNote } from './copy';
import { recommend } from './mobility/recommend';
import { dayLabel, weekdayLabel } from './scrubber';
import type { SoreSpot } from './useSoreSpot';

const SIDES: readonly BodySide[] = ['front', 'back'];

interface Props {
  spot: SoreSpot;
}

/** The body map tab. The title, banner and disclaimer live in the app shell so they show on every tab. */
export default function BodyMapScreen({ spot }: Props) {
  const { width: screenWidth } = useWindowDimensions();
  const { forecast, sensitivity, untagged, checkIns, asOf } = spot;

  const [side, setSide] = useState<BodySide>('front');
  const [day, setDay] = useState(0);
  const [selected, setSelected] = useState<Muscle | null>(null);

  const mapWidth = Math.min(screenWidth - 48, 260);
  const dayForecast = forecast.byDay[day];
  const dayText = `${dayLabel(day)} (${weekdayLabel(asOf, day)})`;
  const selectedCheckIn = selected ? checkIns[selected] : undefined;

  const select = (muscle: Muscle) => setSelected((cur) => (cur === muscle ? null : muscle));
  // Keep the open sheet only if its muscle is drawn in the view we are switching to.
  const chooseSide = (next: BodySide) => {
    setSide(next);
    setSelected((cur) => (cur && hasMuscle(next, cur) ? cur : null));
  };

  return (
    <View style={styles.body}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.asOf}>
          {`Forecast from ${asOf.toISOString().slice(0, 16).replace('T', ' ')} UTC`}
        </Text>

        <View style={styles.toggle}>
          {SIDES.map((s) => (
            <Pressable
              key={s}
              onPress={() => chooseSide(s)}
              accessibilityRole="button"
              accessibilityState={{ selected: side === s }}
              style={[styles.toggleButton, side === s && styles.toggleButtonOn]}
            >
              <Text style={[styles.toggleText, side === s && styles.toggleTextOn]}>
                {s === 'front' ? 'Front' : 'Back'}
              </Text>
            </Pressable>
          ))}
        </View>

        <DayScrubber asOf={asOf} day={day} onChange={setDay} />

        <View style={styles.mapWrap}>
          <BodyMap
            side={side}
            forecast={dayForecast}
            selected={selected}
            onSelect={select}
            width={mapWidth}
          />
        </View>

        <View style={styles.legend}>
          {BAND_ORDER.map((band) => (
            <View key={band} style={styles.legendItem}>
              <View style={[styles.legendSwatch, { backgroundColor: bandColor(band) }]} />
              <Text style={styles.legendText}>{BAND_LABELS[band]}</Text>
            </View>
          ))}
          <Text style={styles.legendText}>predicted soreness</Text>
        </View>

        <TagPrompt sessions={untagged} onTag={spot.tagSession} />
        {forecast.needsTag.length > 0 && (
          <Text style={styles.note}>{needsTagNote(forecast.needsTag.length)}</Text>
        )}
        {forecast.unmappedSports.length > 0 && (
          <Text style={styles.note}>{unmappedNote(forecast.unmappedSports)}</Text>
        )}
        {/* Room for a typical sheet, so it does not hide the last lines. */}
        <View style={styles.spacer} />
      </ScrollView>

      {selected && (
        <MuscleSheet
          muscle={selected}
          state={dayForecast[selected]}
          dayText={dayText}
          checkInEnabled={day === 0}
          checkIn={selectedCheckIn}
          checkInMessage={
            selectedCheckIn === undefined
              ? undefined
              : checkInFeedback(selected, selectedCheckIn, 1, sensitivity[selected])
          }
          onCheckIn={(level) => spot.checkIn(selected, level)}
          // A check-in describes today, so it only shapes the advice on Now.
          recommendation={recommend(
            selected,
            dayForecast[selected].band,
            day === 0 ? selectedCheckIn : undefined,
          )}
          onClose={() => setSelected(null)}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  body: { flex: 1 },
  content: { padding: 16, paddingTop: 8, gap: 12 },
  asOf: { fontSize: 13, color: '#4B5856' },
  toggle: { flexDirection: 'row', gap: 8 },
  toggleButton: {
    paddingVertical: 8,
    paddingHorizontal: 18,
    borderRadius: 18,
    backgroundColor: '#EEF1F2',
  },
  toggleButtonOn: { backgroundColor: '#1E7A6C' },
  toggleText: { fontWeight: '600', color: '#26312F' },
  toggleTextOn: { color: '#FFFFFF' },
  mapWrap: { alignItems: 'center' },
  legend: { flexDirection: 'row', alignItems: 'center', gap: 14, flexWrap: 'wrap' },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendSwatch: { width: 16, height: 16, borderRadius: 8, borderWidth: 1, borderColor: '#B7C4C1' },
  legendText: { fontSize: 13, color: '#26312F' },
  note: { fontSize: 12, color: '#5C6866' },
  spacer: { height: 220 },
});
```

Replace `App.tsx` with:

```tsx
import { StatusBar } from 'expo-status-bar';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import BodyMapScreen from './app/BodyMapScreen';
import PlanScreen from './app/PlanScreen';
import TabBar, { type Tab } from './app/components/TabBar';
import { DISCLAIMER, SYNTHETIC_BANNER } from './app/copy';
import { useSoreSpot } from './app/useSoreSpot';

export default function App() {
  const spot = useSoreSpot();
  const [tab, setTab] = useState<Tab>('body');

  return (
    <View style={styles.root}>
      {/* The label and the disclaimer sit outside the tabs, so they are always visible. */}
      <View style={styles.header}>
        <Text style={styles.title}>Sore Spot</Text>
        {spot.replay.synthetic && <Text style={styles.banner}>{SYNTHETIC_BANNER}</Text>}
      </View>

      {/* Both tabs stay mounted, so switching keeps the day, side and plan answers. */}
      <View style={[styles.tab, tab !== 'body' && styles.hidden]}>
        <BodyMapScreen spot={spot} />
      </View>
      <View style={[styles.tab, tab !== 'plan' && styles.hidden]}>
        <PlanScreen spot={spot} />
      </View>

      <View style={styles.footer}>
        <Text style={styles.note}>{DISCLAIMER}</Text>
      </View>
      <TabBar tab={tab} onChange={setTab} />
      <StatusBar style="auto" />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#FFFFFF' },
  header: { paddingTop: 56, paddingHorizontal: 16, paddingBottom: 8, gap: 4 },
  tab: { flex: 1 },
  hidden: { display: 'none' },
  footer: { paddingHorizontal: 16, paddingVertical: 10, borderTopWidth: 1, borderTopColor: '#E3EAE8', backgroundColor: '#FFFFFF' },
  title: { fontSize: 24, fontWeight: '700', color: '#16211F' },
  banner: { color: '#B45309', fontWeight: '700' },
  note: { fontSize: 12, color: '#5C6866' },
});
```

- [ ] **Step 4: Run the whole suite, typecheck and the web export**

Run: `npm test && npm run typecheck && npx expo export --platform web`
Expected: 26 test files, 230 tests pass (the 223 after Task 1 plus 7 wiring tests); typecheck prints no errors; the export ends with `Exported: dist`. Then `rm -rf dist` (it is git-ignored, but leave the tree clean).

- [ ] **Step 5: Prove the wiring tests can fail**

Break each line on purpose, run `npx vitest run app/honesty.test.ts`, and restore from a backup:
```bash
cp app/components/PlanResultView.tsx /tmp/prv.bak
sed -i "s/<Text style={styles.disclaimer}>{PLAN_DISCLAIMER}<\/Text>//" app/components/PlanResultView.tsx
npx vitest run app/honesty.test.ts
cp /tmp/prv.bak app/components/PlanResultView.tsx
cp app/PlanScreen.tsx /tmp/ps.bak
sed -i "s/useState<Screening>(initialScreening)/useState<Screening>({ redFlags: [], under18: false, medicalCondition: false })/" app/PlanScreen.tsx
npx vitest run app/honesty.test.ts
cp /tmp/ps.bak app/PlanScreen.tsx
npx vitest run app/honesty.test.ts
```
Expected: the first and second runs FAIL (the plan disclaimer test; the "starts every health answer unanswered" test); the third passes. Paste all three outputs.

- [ ] **Step 6: Commit**

```bash
git add app App.tsx
git commit -m "$(cat <<'EOF'
Add the Plan tab, health screens, tab navigation and shared state

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

## Self-Review

**Spec coverage:**
- Shell, two tabs, banner/footer outside the tabs, both tabs mounted: Task 2 (`App.tsx`, `TabBar`, wiring test).
- Shared state and the pure forecast pipeline: Task 1 (`forecastState`, tested) and Task 2 (`useSoreSpot`, `BodyMapScreen` refactor).
- Tag gate with a skip: Task 2 (`PlanScreen`); the history note comes from the engine and is tested in `planFlow.test.ts`.
- Health screen, everything starting unanswered, mutual exclusion, unticking the last flag: Task 1 (`screening`) and Task 2 (`HealthQuestions`, wiring tests).
- Request options including the ones that get declined; Build disabled until answered; result via `planOrGuardrail` only: Tasks 1 and 2.
- Result view with the plan, notes, why and disclaimer, or the blocked message; the result derived on every render: Task 2.
- Honesty scan coverage and wiring tests: Task 2.
- Non-goals respected: no evidence panel, persistence, LLM, navigation library or engine change.
- Browser drive and the phone check are controller and user steps after the tasks, as in earlier sub-projects.

**Type consistency:** every name is defined once (Task 1 then Task 2) and used with the same signature, because all blocks come from one verified copy.

**Known limits, stated plainly:** health answers live in memory only; accessibility is basic and untested with VoiceOver; the plan is relative to the fixed demo time; the exercise library still needs a trainer or PT review (see the plan engine spec).
