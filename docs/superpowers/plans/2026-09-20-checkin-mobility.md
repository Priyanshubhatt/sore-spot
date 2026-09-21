# Check-in, Mobility Library and Session Tagging Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let a member tell the app how a muscle feels (check-in), get honest comfort and mobility ideas for it, and resolve strength sessions the engine cannot place (tagging), all on the existing body-map screen.

**Architecture:** Pure logic (check-in math, the mobility library and recommendation rules, tagging helpers, all copy) in plain TypeScript with Vitest tests; three thin React Native components (`CheckInPicker`, `MoveList`, `TagPrompt`) and a reworked `MuscleSheet` render it; `BodyMapScreen` owns the state and recomputes the engine forecast from tags and check-ins.

**Tech Stack:** Expo SDK 57, React Native 0.86, TypeScript strict, Vitest, Git Bash on Windows. No new dependencies.

**Spec:** `docs/superpowers/specs/2026-09-20-checkin-mobility-design.md` (approved 2026-09-20). Builds on the B1 body-map screen (`docs/superpowers/specs/2026-09-19-body-map-scrubber-design.md`) and the engine.

## Global Constraints

Every task's requirements include these, copied from the spec:

- **`/engine` source is unchanged.** The only file touched under `engine/` is the test `engine/replay.synthetic.test.ts` (Task 2), because the demo data changes. `/data` changes only in `data/replay.synthetic.ts`.
- Bands only ("Low", "Moderate", "High" predicted soreness). No scores, percentages or accuracy claims. Never "diagnosis".
- Banned words in any app source: `diagnos`, `accura`, `clinical`, `prevent`, `cure`, `validated`, `treat`, `boost`, `oxygen`, `blood flow`. The phrase "reduce soreness" or "relieve soreness" may appear only in a line that also says it has "not been shown" / "n't been shown". A test scans all of `app/` for both rules.
- **Evidence tags: only `ROM` and `COMFORT`.** No soreness tag and no vascular tag. The tag follows from the move kind (`stretch` -> `ROM`; everything else -> `COMFORT`).
- Always shown with recommendations: "Stretching hasn't been shown to reduce soreness." and "Sharp pain, swelling, numbness or dark urine isn't normal soreness. Stop and see a clinician."
- Recommendation rules: comfort ideas (one move per kind, in order light-movement, self-massage, mobility) for Moderate and High; stretches (at most 2) hidden when the effective band is High, replaced by "Save stretching for when soreness eases."; a severe check-in counts as High, a moderate one as at least Moderate.
- Check-ins are only offered on Now, are in-memory, and replace that muscle's previous check-in; sensitivity is always rebuilt from the default sensitivity and the default-sensitivity forecast for Now, so nudges never stack.
- The SYNTHETIC DATA banner and the disclaimer stay visible (fixed header and footer from B1). All new user-facing text lives in `app/copy.ts`.
- **Do not link a git remote.** The user does that.
- Commit messages end with the line `Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>`.

**Working directory for every command:** `C:\Users\priya\Desktop\Sore Spot` (Git Bash path `/c/Users/priya/Desktop/Sore Spot`). Baseline: branch `feat/checkin-mobility` (stacked on the unmerged B1 branch `feat/body-map`), 78 tests in 12 files passing, `npm run typecheck` clean. The SDD controller creates any working branch.

**Line endings:** this repo's working tree has Windows line endings. For every file below that already exists (`app/copy.ts`, `app/copy.test.ts`, `app/components/MuscleSheet.tsx`, `app/BodyMapScreen.tsx`, `data/replay.synthetic.ts`, `engine/replay.synthetic.test.ts`), **replace the whole file** with the block shown, using the file-writing tool. Do not use search-and-replace edits: multi-line matches silently fail on Windows line endings.

**How these files were produced:** every block below was first run in a scratch copy: 117 Vitest tests passing, `tsc --strict` clean, `expo export --platform web` building, and the screen driven in headless Edge at 390x844 and 375x667 (40 scripted checks: tagging, sheet contents, check-in, day change, banner and disclaimer visibility, sheet height, no console errors) with screenshots inspected. The five key behaviors were also mutation-checked (each was broken on purpose and caught by the intended test). Copy the blocks exactly.

## File Structure

```
app/checkin.ts                     CheckInLevel, CheckIns, CHECKIN_LEVELS, sensitivityFromCheckIns, effectiveBand   (Task 1)
app/mobility/library.ts            Move types, MOVES (37), evidenceFor                                              (Task 1)
app/mobility/recommend.ts          recommend(muscle, predicted, reported?) -> Recommendation                        (Task 1)
app/checkin.test.ts, app/mobility/library.test.ts, app/mobility/recommend.test.ts                                   (Task 1)
app/copy.ts (whole file)           + check-in, evidence, safety, tagging text                                       (Task 2)
app/tagging.ts                     TAG_OPTIONS, Tags, applyTags, describeWorkout                                    (Task 2)
app/copy.test.ts (whole file), app/tagging.test.ts, app/honesty.test.ts                                             (Task 2)
data/replay.synthetic.ts (whole file)  + d-wed-strength (untagged)                                                  (Task 2)
engine/replay.synthetic.test.ts (whole file)                                                                        (Task 2)
app/components/CheckInPicker.tsx, MoveList.tsx, TagPrompt.tsx                                                       (Task 3)
app/components/MuscleSheet.tsx (whole file), app/BodyMapScreen.tsx (whole file)                                     (Task 3)
docs/superpowers/specs/2026-09-20-checkin-mobility-design.md      Amendments appended                              (Task 3)
```

---

### Task 1: Check-in, mobility library and recommendation logic

**Files:**
- Create: `app/checkin.ts`, `app/mobility/library.ts`, `app/mobility/recommend.ts`
- Test: `app/checkin.test.ts`, `app/mobility/library.test.ts`, `app/mobility/recommend.test.ts`

**Interfaces:**
- Consumes: `applyCheckIn`, `defaultSensitivity`, `MUSCLES`, `DayForecast`, `Muscle`, `RiskBand`, `Sensitivity` from `engine/index.ts`.
- Produces (used by Tasks 2 and 3):
  - `app/checkin.ts`: `CheckInLevel` (`0|1|2|3`), `CheckIns` (`Partial<Record<Muscle, CheckInLevel>>`), `CHECKIN_LEVELS`, `sensitivityFromCheckIns(checkIns, baseNow: DayForecast): Sensitivity`, `effectiveBand(predicted: RiskBand, reported?: CheckInLevel): RiskBand`.
  - `app/mobility/library.ts`: `MoveKind` (`'light-movement'|'self-massage'|'mobility'|'stretch'`), `EvidenceTag` (`'ROM'|'COMFORT'`), `Move` (`{ id, name, kind, muscles: Muscle[], how, dose }`), `MOVES: readonly Move[]` (37 moves), `evidenceFor(kind): EvidenceTag`.
  - `app/mobility/recommend.ts`: `RecommendationNote` (`'nothing-needed'|'save-stretching'|null`), `Recommendation` (`{ band, comfort: Move[], rom: Move[], note }`), `recommend(muscle, predicted, reported?)`.

The library is hand-written general wellness content (gentle instructions, "stop if anything pinches", no medical or soreness claims). It needs a trainer or PT review before any demo (handoff open item 4). Evidence tags are derived from the move kind so a card cannot claim more than the evidence supports.

- [ ] **Step 1: Write the failing tests**

Create `app/checkin.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { MUSCLES, applyCheckIn, defaultSensitivity, type DayForecast, type RiskBand } from '../engine';
import { CHECKIN_LEVELS, effectiveBand, sensitivityFromCheckIns } from './checkin';

/** A forecast day where every muscle is in the same band. */
const dayOf = (band: RiskBand): DayForecast =>
  Object.fromEntries(MUSCLES.map((m) => [m, { band, drivers: [] }])) as unknown as DayForecast;

describe('CHECKIN_LEVELS', () => {
  it('offers none, mild, moderate and severe as 0 to 3', () => {
    expect(CHECKIN_LEVELS).toEqual([0, 1, 2, 3]);
  });
});

describe('sensitivityFromCheckIns', () => {
  it('is the default sensitivity when there are no check-ins', () => {
    expect(sensitivityFromCheckIns({}, dayOf('low'))).toEqual(defaultSensitivity());
  });

  it('matches applyCheckIn for one muscle and leaves the others alone', () => {
    const s = sensitivityFromCheckIns({ quads: 3 }, dayOf('low'));
    expect(s).toEqual(applyCheckIn(defaultSensitivity(), 'quads', 'low', 3));
    expect(s.quads).toBe(1.1);
    expect(s.glutes).toBe(1);
  });

  it('lowers sensitivity when the report is below the prediction', () => {
    expect(sensitivityFromCheckIns({ quads: 0 }, dayOf('high')).quads).toBe(0.9);
  });

  it('uses each muscle its own predicted band', () => {
    const day: DayForecast = { ...dayOf('low'), calves: { band: 'high', drivers: [] } };
    const s = sensitivityFromCheckIns({ quads: 3, calves: 3 }, day);
    expect(s.quads).toBe(1.1); // reported above a low prediction
    expect(s.calves).toBe(1); // severe matches a high prediction, so no change
  });

  it('never stacks: the same check-ins always give the same sensitivity', () => {
    const a = sensitivityFromCheckIns({ quads: 3, calves: 0 }, dayOf('moderate'));
    const b = sensitivityFromCheckIns({ quads: 3, calves: 0 }, dayOf('moderate'));
    expect(a).toEqual(b);
    expect(a.quads).toBe(1.1);
    expect(a.calves).toBe(0.9);
  });

  it('skips muscles whose entry is undefined', () => {
    expect(sensitivityFromCheckIns({ quads: undefined }, dayOf('low'))).toEqual(defaultSensitivity());
  });
});

describe('effectiveBand', () => {
  it('keeps the predicted band when there is no check-in or a light one', () => {
    expect(effectiveBand('low')).toBe('low');
    expect(effectiveBand('low', 0)).toBe('low');
    expect(effectiveBand('low', 1)).toBe('low');
    expect(effectiveBand('high', 0)).toBe('high');
  });

  it('counts a severe check-in as High', () => {
    expect(effectiveBand('low', 3)).toBe('high');
    expect(effectiveBand('moderate', 3)).toBe('high');
  });

  it('raises a moderate check-in to at least Moderate, never lowering the prediction', () => {
    expect(effectiveBand('low', 2)).toBe('moderate');
    expect(effectiveBand('moderate', 2)).toBe('moderate');
    expect(effectiveBand('high', 2)).toBe('high');
  });
});
```

Create `app/mobility/library.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { MUSCLES } from '../../engine';
import { MOVES, evidenceFor, type MoveKind } from './library';

const KINDS: MoveKind[] = ['light-movement', 'self-massage', 'mobility', 'stretch'];

describe('mobility library', () => {
  it('has between 30 and 40 moves with unique ids', () => {
    expect(MOVES.length).toBeGreaterThanOrEqual(30);
    expect(MOVES.length).toBeLessThanOrEqual(40);
    expect(new Set(MOVES.map((m) => m.id)).size).toBe(MOVES.length);
  });

  it('gives every move a name, instructions, a dose, a valid kind and known muscles', () => {
    for (const m of MOVES) {
      expect(m.name.trim().length, m.id).toBeGreaterThan(0);
      expect(m.how.trim().length, m.id).toBeGreaterThan(0);
      expect(m.dose.trim().length, m.id).toBeGreaterThan(0);
      expect(KINDS, m.id).toContain(m.kind);
      expect(m.muscles.length, m.id).toBeGreaterThan(0);
      for (const muscle of m.muscles) expect(MUSCLES, `${m.id}/${muscle}`).toContain(muscle);
    }
  });

  it('gives every one of the 12 muscles a comfort move and a stretch', () => {
    for (const muscle of MUSCLES) {
      const forMuscle = MOVES.filter((m) => m.muscles.includes(muscle));
      expect(forMuscle.some((m) => m.kind !== 'stretch'), `${muscle} comfort`).toBe(true);
      expect(forMuscle.some((m) => m.kind === 'stretch'), `${muscle} stretch`).toBe(true);
    }
  });

  it('is honest by construction: stretching is tagged for range of motion only, all else for comfort only', () => {
    expect(evidenceFor('stretch')).toBe('ROM');
    for (const kind of KINDS.filter((k) => k !== 'stretch')) expect(evidenceFor(kind)).toBe('COMFORT');
    for (const m of MOVES) expect(['ROM', 'COMFORT']).toContain(evidenceFor(m.kind));
  });

  it('keeps holds moderate and never asks for pain', () => {
    for (const m of MOVES) {
      expect(m.how, m.id).not.toMatch(/until it hurts|push through|as far as possible|maximum/i);
    }
  });
});
```

Create `app/mobility/recommend.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { MUSCLES } from '../../engine';
import { recommend } from './recommend';

const names = (moves: { name: string }[]) => moves.map((m) => m.name);

describe('recommend', () => {
  it('for a high band gives gentle comfort ideas in order and hides stretching', () => {
    const r = recommend('quads', 'high');
    expect(r.band).toBe('high');
    expect(names(r.comfort)).toEqual(['Easy walk', 'Foam roll quads', 'Small leg swings']);
    expect(r.rom).toEqual([]);
    expect(r.note).toBe('save-stretching');
  });

  it('for a moderate band gives the same comfort ideas plus a stretch', () => {
    const r = recommend('quads', 'moderate');
    expect(names(r.comfort)).toEqual(['Easy walk', 'Foam roll quads', 'Small leg swings']);
    expect(names(r.rom)).toEqual(['Standing quad stretch']);
    expect(r.note).toBeNull();
  });

  it('for a low band says nothing is needed but still offers a range-of-motion stretch', () => {
    const r = recommend('quads', 'low');
    expect(r.comfort).toEqual([]);
    expect(names(r.rom)).toEqual(['Standing quad stretch']);
    expect(r.note).toBe('nothing-needed');
  });

  it('treats a severe check-in as High even when the prediction is low', () => {
    const r = recommend('quads', 'low', 3);
    expect(r.band).toBe('high');
    expect(r.rom).toEqual([]);
    expect(r.comfort.length).toBeGreaterThan(0);
    expect(r.note).toBe('save-stretching');
  });

  it('treats a moderate check-in as at least Moderate', () => {
    const r = recommend('quads', 'low', 2);
    expect(r.band).toBe('moderate');
    expect(r.comfort.length).toBeGreaterThan(0);
  });

  it('offers at most one comfort move of each kind and at most two stretches', () => {
    for (const muscle of MUSCLES) {
      const r = recommend(muscle, 'moderate');
      expect(r.comfort.length, muscle).toBeLessThanOrEqual(3);
      expect(new Set(r.comfort.map((m) => m.kind)).size, muscle).toBe(r.comfort.length);
      expect(r.rom.length, muscle).toBeLessThanOrEqual(2);
      for (const m of r.rom) expect(m.kind).toBe('stretch');
      for (const m of r.comfort) expect(m.kind).not.toBe('stretch');
    }
  });

  it('gives every muscle at least one comfort idea when it is not low', () => {
    for (const muscle of MUSCLES) {
      expect(recommend(muscle, 'moderate').comfort.length, muscle).toBeGreaterThan(0);
      expect(recommend(muscle, 'high').comfort.length, muscle).toBeGreaterThan(0);
    }
  });

  it('falls back to the kinds that exist for a muscle (core has no self-massage)', () => {
    expect(names(recommend('core', 'moderate').comfort)).toEqual(['Easy walk', 'Cat-cow']);
  });

  it('is deterministic', () => {
    expect(recommend('glutes', 'moderate', 1)).toEqual(recommend('glutes', 'moderate', 1));
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run app/checkin.test.ts app/mobility`
Expected: FAIL, with errors that `./checkin`, `./library` and `./recommend` cannot be resolved. Paste the real output into your report.

- [ ] **Step 3: Write the implementation**

Create `app/checkin.ts` first (recommend imports it):

```ts
import {
  applyCheckIn,
  defaultSensitivity,
  type DayForecast,
  type Muscle,
  type RiskBand,
  type Sensitivity,
} from '../engine';

/** 0 none, 1 mild, 2 moderate, 3 severe. */
export type CheckInLevel = 0 | 1 | 2 | 3;
export type CheckIns = Partial<Record<Muscle, CheckInLevel>>;

export const CHECKIN_LEVELS: readonly CheckInLevel[] = [0, 1, 2, 3];

/**
 * Sensitivity implied by the current check-ins. Always rebuilt from the default sensitivity and
 * the default-sensitivity forecast for Now, so changing or repeating a choice never stacks nudges.
 */
export function sensitivityFromCheckIns(checkIns: CheckIns, baseNow: DayForecast): Sensitivity {
  let sensitivity = defaultSensitivity();
  for (const muscle of Object.keys(checkIns) as Muscle[]) {
    const reported = checkIns[muscle];
    if (reported === undefined) continue;
    sensitivity = applyCheckIn(sensitivity, muscle, baseNow[muscle].band, reported);
  }
  return sensitivity;
}

const BAND_RANK: Record<RiskBand, number> = { low: 0, moderate: 1, high: 2 };

/** The band advice is based on: a severe check-in counts as High, a moderate one as at least Moderate. */
export function effectiveBand(predicted: RiskBand, reported?: CheckInLevel): RiskBand {
  if (reported === 3) return 'high';
  if (reported === 2 && BAND_RANK[predicted] < BAND_RANK.moderate) return 'moderate';
  return predicted;
}
```

Create `app/mobility/library.ts`:

```ts
import type { Muscle } from '../../engine';

export type MoveKind = 'light-movement' | 'self-massage' | 'mobility' | 'stretch';
export type EvidenceTag = 'ROM' | 'COMFORT';

export interface Move {
  id: string;
  name: string;
  kind: MoveKind;
  muscles: Muscle[];
  how: string;
  dose: string;
}

/**
 * The evidence tag follows from the kind of move, so a card cannot claim more than the evidence
 * supports: stretching is tagged for range of motion only, everything else for comfort only.
 * There is deliberately no soreness tag.
 */
export function evidenceFor(kind: MoveKind): EvidenceTag {
  return kind === 'stretch' ? 'ROM' : 'COMFORT';
}

const HOLD = '2 to 3 holds of 20 to 30 seconds';

// Hand-written general wellness ideas. Needs a trainer or PT review before any demo.
export const MOVES: readonly Move[] = [
  {
    id: 'easy-walk',
    name: 'Easy walk',
    kind: 'light-movement',
    muscles: ['quads', 'glutes', 'hamstrings', 'calves', 'adductors', 'core'],
    how: 'Walk on flat ground at a pace where you could hold a conversation.',
    dose: '10 to 20 minutes',
  },
  {
    id: 'easy-spin',
    name: 'Easy spin on a bike',
    kind: 'light-movement',
    muscles: ['quads', 'glutes', 'hamstrings', 'calves'],
    how: 'Pedal seated with light resistance and a relaxed cadence.',
    dose: '10 to 15 minutes',
  },

  // Chest
  {
    id: 'chest-ball-release',
    name: 'Ball pec release',
    kind: 'self-massage',
    muscles: ['chest'],
    how: 'Stand facing a wall with a soft ball between the wall and your chest. Lean in lightly and roll slowly. Skip any sharp spot.',
    dose: '1 minute per side',
  },
  {
    id: 'chest-arm-swings',
    name: 'Easy arm swings',
    kind: 'mobility',
    muscles: ['chest', 'shoulders'],
    how: 'Stand tall and swing both arms open, then gently across your chest, staying relaxed.',
    dose: '10 to 15 swings',
  },
  {
    id: 'chest-doorway-stretch',
    name: 'Doorway chest stretch',
    kind: 'stretch',
    muscles: ['chest'],
    how: 'Rest a forearm on a door frame with the elbow at shoulder height. Step through until you feel a mild stretch.',
    dose: `${HOLD} per side`,
  },

  // Shoulders
  {
    id: 'shoulder-ball-release',
    name: 'Ball shoulder release',
    kind: 'self-massage',
    muscles: ['shoulders'],
    how: 'Lean the back of your shoulder against a wall with a soft ball in between. Roll slowly with light pressure.',
    dose: '1 minute per side',
  },
  {
    id: 'shoulder-rolls',
    name: 'Shoulder rolls',
    kind: 'mobility',
    muscles: ['shoulders', 'upperBack'],
    how: 'Roll your shoulders up, back and down in slow circles.',
    dose: '10 rolls each direction',
  },
  {
    id: 'shoulder-cross-body-stretch',
    name: 'Cross-body shoulder stretch',
    kind: 'stretch',
    muscles: ['shoulders'],
    how: 'Bring one arm across your chest and hold it with the other arm. Keep the shoulder down.',
    dose: `${HOLD} per side`,
  },

  // Biceps
  {
    id: 'biceps-thumb-glide',
    name: 'Biceps thumb glide',
    kind: 'self-massage',
    muscles: ['biceps'],
    how: 'Use the thumb of your other hand to glide slowly along the front of your upper arm with light pressure.',
    dose: '1 minute per arm',
  },
  {
    id: 'elbow-bends',
    name: 'Easy elbow bends',
    kind: 'mobility',
    muscles: ['biceps', 'triceps'],
    how: 'Slowly bend and straighten your elbow through a comfortable range.',
    dose: '10 to 15 reps per arm',
  },
  {
    id: 'biceps-wall-stretch',
    name: 'Wall biceps stretch',
    kind: 'stretch',
    muscles: ['biceps'],
    how: 'Place your palm on a wall behind you with the fingers pointing back, then turn your body gently away.',
    dose: `${HOLD} per arm`,
  },

  // Triceps
  {
    id: 'triceps-palm-glide',
    name: 'Triceps palm glide',
    kind: 'self-massage',
    muscles: ['triceps'],
    how: 'Use your opposite hand to glide slowly along the back of your upper arm with light pressure.',
    dose: '1 minute per arm',
  },
  {
    id: 'overhead-reaches',
    name: 'Overhead arm reaches',
    kind: 'mobility',
    muscles: ['triceps', 'shoulders'],
    how: 'Reach one arm overhead, then lower it slowly. Alternate arms.',
    dose: '10 reps per arm',
  },
  {
    id: 'triceps-overhead-stretch',
    name: 'Overhead triceps stretch',
    kind: 'stretch',
    muscles: ['triceps'],
    how: 'Raise one arm and bend the elbow behind your head. Gently press it back with the other hand.',
    dose: `${HOLD} per arm`,
  },

  // Forearms
  {
    id: 'forearm-thumb-glide',
    name: 'Forearm thumb glide',
    kind: 'self-massage',
    muscles: ['forearms'],
    how: 'Glide your opposite thumb slowly along the forearm from wrist to elbow with light pressure.',
    dose: '1 minute per arm',
  },
  {
    id: 'wrist-circles',
    name: 'Wrist circles',
    kind: 'mobility',
    muscles: ['forearms'],
    how: 'Make slow circles with your wrists in both directions.',
    dose: '10 circles each way',
  },
  {
    id: 'wrist-flexor-stretch',
    name: 'Wrist flexor stretch',
    kind: 'stretch',
    muscles: ['forearms'],
    how: 'Hold one arm straight in front with the palm up. Gently pull the fingers back with the other hand.',
    dose: `${HOLD} per arm`,
  },

  // Upper back
  {
    id: 'upper-back-foam-roll',
    name: 'Foam roll upper back',
    kind: 'self-massage',
    muscles: ['upperBack'],
    how: 'Lie with a foam roller under your upper back and hips lifted. Roll slowly, keep your neck relaxed and avoid the lower back.',
    dose: '1 to 2 minutes',
  },
  {
    id: 'cat-cow',
    name: 'Cat-cow',
    kind: 'mobility',
    muscles: ['upperBack', 'core'],
    how: 'On hands and knees, slowly round your back, then let it dip. Move with your breath.',
    dose: '8 to 10 slow reps',
  },
  {
    id: 'childs-pose-reach',
    name: "Child's pose reach",
    kind: 'stretch',
    muscles: ['upperBack'],
    how: 'Sit back on your heels and reach your arms forward along the floor. Breathe slowly.',
    dose: HOLD,
  },

  // Core
  {
    id: 'pelvic-tilts',
    name: 'Pelvic tilts',
    kind: 'mobility',
    muscles: ['core'],
    how: 'Lie on your back with your knees bent. Gently flatten, then arch, your lower back.',
    dose: '10 slow reps',
  },
  {
    id: 'prone-press-up',
    name: 'Gentle prone press-up',
    kind: 'stretch',
    muscles: ['core'],
    how: 'Lie face down and prop yourself on your forearms, keeping your hips down. Stop if anything pinches.',
    dose: '2 to 3 holds of 15 to 20 seconds',
  },

  // Glutes
  {
    id: 'glute-ball-release',
    name: 'Ball glute release',
    kind: 'self-massage',
    muscles: ['glutes'],
    how: 'Sit on a soft ball against a wall or the floor and shift slowly. Use light pressure.',
    dose: '1 to 2 minutes per side',
  },
  {
    id: 'hip-circles',
    name: 'Hip circles',
    kind: 'mobility',
    muscles: ['glutes', 'adductors'],
    how: 'Standing and holding a support, draw slow circles with a bent knee.',
    dose: '8 circles each direction per leg',
  },
  {
    id: 'figure-four-stretch',
    name: 'Figure-four stretch',
    kind: 'stretch',
    muscles: ['glutes'],
    how: 'Lying on your back, cross one ankle over the opposite knee and draw both legs gently toward you.',
    dose: `${HOLD} per side`,
  },

  // Quads
  {
    id: 'quads-foam-roll',
    name: 'Foam roll quads',
    kind: 'self-massage',
    muscles: ['quads'],
    how: 'Lie face down with a foam roller under your thighs. Roll slowly from the hip to just above the knee.',
    dose: '1 to 2 minutes per leg',
  },
  {
    id: 'small-leg-swings',
    name: 'Small leg swings',
    kind: 'mobility',
    muscles: ['quads', 'hamstrings'],
    how: 'Holding a support, swing one leg forward and back in a small, easy range.',
    dose: '10 swings per leg',
  },
  {
    id: 'quad-stretch',
    name: 'Standing quad stretch',
    kind: 'stretch',
    muscles: ['quads'],
    how: 'Holding a support, bend one knee and hold the foot behind you. Keep your knees together.',
    dose: `${HOLD} per leg`,
  },

  // Hamstrings
  {
    id: 'hamstrings-foam-roll',
    name: 'Foam roll hamstrings',
    kind: 'self-massage',
    muscles: ['hamstrings'],
    how: 'Sit with a foam roller under the backs of your thighs and roll slowly, supporting your weight with your hands.',
    dose: '1 to 2 minutes per leg',
  },
  {
    id: 'hip-hinges',
    name: 'Slow hip hinges',
    kind: 'mobility',
    muscles: ['hamstrings', 'glutes'],
    how: 'Standing with soft knees, push your hips back with a flat back, then stand tall.',
    dose: '8 to 10 slow reps',
  },
  {
    id: 'hamstring-reach',
    name: 'Seated hamstring reach',
    kind: 'stretch',
    muscles: ['hamstrings'],
    how: 'Sit with one leg straight and reach toward your toes with a flat back.',
    dose: `${HOLD} per leg`,
  },

  // Calves
  {
    id: 'calves-foam-roll',
    name: 'Foam roll calves',
    kind: 'self-massage',
    muscles: ['calves'],
    how: 'Sit with a foam roller under your calf and roll slowly from the ankle to just below the knee.',
    dose: '1 to 2 minutes per leg',
  },
  {
    id: 'ankle-circles',
    name: 'Ankle circles',
    kind: 'mobility',
    muscles: ['calves'],
    how: 'Sitting or standing, draw slow circles with each foot in both directions.',
    dose: '10 circles each way per foot',
  },
  {
    id: 'calf-wall-stretch',
    name: 'Wall calf stretch',
    kind: 'stretch',
    muscles: ['calves'],
    how: 'With your hands on a wall and one foot back, keep the heel down and lean in until you feel a mild stretch.',
    dose: `${HOLD} per leg`,
  },

  // Inner thighs
  {
    id: 'adductors-foam-roll',
    name: 'Foam roll inner thighs',
    kind: 'self-massage',
    muscles: ['adductors'],
    how: 'Lie face down with one leg out to the side over a foam roller. Roll slowly with light pressure.',
    dose: '1 minute per leg',
  },
  {
    id: 'frog-rocks',
    name: 'Gentle frog rocks',
    kind: 'mobility',
    muscles: ['adductors'],
    how: 'On hands and knees, widen your knees and rock your hips gently back.',
    dose: '8 to 10 slow rocks',
  },
  {
    id: 'butterfly-stretch',
    name: 'Butterfly stretch',
    kind: 'stretch',
    muscles: ['adductors'],
    how: 'Sit with the soles of your feet together and let your knees drop out to the sides. Sit tall.',
    dose: HOLD,
  },
];
```

Create `app/mobility/recommend.ts`:

```ts
import type { Muscle, RiskBand } from '../../engine';
import { effectiveBand, type CheckInLevel } from '../checkin';
import { MOVES, type Move, type MoveKind } from './library';

export type RecommendationNote = 'nothing-needed' | 'save-stretching' | null;

export interface Recommendation {
  /** The band the advice is based on: the predicted band, raised by a check-in. */
  band: RiskBand;
  /** Up to one move of each comfort kind, in this order. */
  comfort: Move[];
  /** Stretches for range of motion. Empty while soreness is high. */
  rom: Move[];
  note: RecommendationNote;
}

const COMFORT_ORDER: readonly MoveKind[] = ['light-movement', 'self-massage', 'mobility'];
const MAX_ROM = 2;

export function recommend(
  muscle: Muscle,
  predicted: RiskBand,
  reported?: CheckInLevel,
): Recommendation {
  const band = effectiveBand(predicted, reported);
  const forMuscle = MOVES.filter((m) => m.muscles.includes(muscle));

  const comfort =
    band === 'low'
      ? []
      : COMFORT_ORDER.flatMap((kind) => {
          const first = forMuscle.find((m) => m.kind === kind);
          return first ? [first] : [];
        });
  const rom = band === 'high' ? [] : forMuscle.filter((m) => m.kind === 'stretch').slice(0, MAX_ROM);
  const note: RecommendationNote =
    band === 'low' ? 'nothing-needed' : band === 'high' ? 'save-stretching' : null;

  return { band, comfort, rom, note };
}
```

- [ ] **Step 4: Run the tests and typecheck to verify they pass**

Run: `npm test && npm run typecheck`
Expected: 15 test files, 102 tests pass (the 78 existing plus 10 check-in, 5 library and 9 recommend tests); typecheck prints no errors.

- [ ] **Step 5: Commit**

```bash
git add app
git commit -m "$(cat <<'EOF'
Add check-in logic, mobility library and recommendation rules

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 2: Copy, tagging helpers, honesty scan and demo data

**Files:**
- Replace (whole file): `app/copy.ts`, `app/copy.test.ts`, `data/replay.synthetic.ts`, `engine/replay.synthetic.test.ts`
- Create: `app/tagging.ts`
- Test: `app/tagging.test.ts`, `app/honesty.test.ts`

**Interfaces:**
- Consumes: Task 1's `CheckInLevel` (type) and `EvidenceTag` (type); `StrengthTag`, `TaggedWorkout`, `computeForecast`, `defaultSensitivity` from `engine/index.ts`; `workout()` from `data/scenarios/builders.ts`.
- Produces (used by Task 3):
  - `app/copy.ts` new exports: `CHECKIN_PROMPT`, `CHECKIN_NOT_TODAY`, `CHECKIN_LABELS: Record<CheckInLevel,string>`, `checkInMessage(muscle, before, after)`, `EVIDENCE_LABELS`, `EVIDENCE_NOTES`, `COMFORT_HEADING`, `ROM_HEADING`, `NOTHING_NEEDED_TEXT`, `SAVE_STRETCHING_TEXT`, `STRETCH_HONESTY`, `SAFETY_LINE`, `TAG_HEADING`, `TAG_PROMPT`, `TAG_LABELS: Record<StrengthTag,string>`. All existing exports are unchanged.
  - `app/tagging.ts`: `TAG_OPTIONS: readonly StrengthTag[]`, `Tags` (`Record<string, StrengthTag>`), `applyTags(workouts, tags): TaggedWorkout[]` (never mutates), `describeWorkout(workout): string` (UTC, "Wed Sep 16 · Weightlifting").
  - `data/replay.synthetic.ts`: gains `d-wed-strength`, an untagged weightlifting session on Wed Sep 16 (17:00Z, 60 minutes, same zone minutes as the Tue leg day). Wed is no longer a rest day; only Sun Sep 20 is. Tagging it "Upper body" turns chest, shoulders, upper back and arms moderate or higher at Now.

The engine still refuses to guess: until a tag is chosen, the session adds no soreness and appears in `needsTag`.

- [ ] **Step 1: Write the failing tests**

Replace `app/copy.test.ts` with:

```ts
import { describe, expect, it } from 'vitest';
import { MUSCLES, type Driver, type RiskBand } from '../engine';
import {
  BAND_LABELS,
  CHECKIN_LABELS,
  CHECKIN_NOT_TODAY,
  CHECKIN_PROMPT,
  COMFORT_HEADING,
  DISCLAIMER,
  DRIVER_TEXT,
  EVIDENCE_LABELS,
  EVIDENCE_NOTES,
  GENERIC_REASON_TEXT,
  MUSCLE_LABELS,
  NOTHING_NEEDED_TEXT,
  NO_SORENESS_TEXT,
  ROM_HEADING,
  SAFETY_LINE,
  SAVE_STRETCHING_TEXT,
  STRETCH_HONESTY,
  SYNTHETIC_BANNER,
  TAG_HEADING,
  TAG_LABELS,
  TAG_PROMPT,
  bandPhrase,
  checkInMessage,
  needsTagNote,
  reasonsFor,
  unmappedNote,
  zoneA11yLabel,
} from './copy';

const BANDS: RiskBand[] = ['low', 'moderate', 'high'];

const NEW_STRINGS = [
  CHECKIN_PROMPT,
  CHECKIN_NOT_TODAY,
  ...Object.values(CHECKIN_LABELS),
  checkInMessage('quads', 1, 1.1),
  checkInMessage('quads', 1, 0.9),
  checkInMessage('quads', 1, 1),
  ...Object.values(EVIDENCE_LABELS),
  ...Object.values(EVIDENCE_NOTES),
  COMFORT_HEADING,
  ROM_HEADING,
  NOTHING_NEEDED_TEXT,
  SAVE_STRETCHING_TEXT,
  STRETCH_HONESTY,
  SAFETY_LINE,
  TAG_HEADING,
  TAG_PROMPT,
  ...Object.values(TAG_LABELS),
];
const DRIVERS: Driver[] = ['novel', 'eccentric', 'high-load'];

describe('copy coverage', () => {
  it('labels every muscle, band and driver', () => {
    for (const m of MUSCLES) expect(MUSCLE_LABELS[m].length, m).toBeGreaterThan(0);
    for (const b of BANDS) expect(BAND_LABELS[b].length, b).toBeGreaterThan(0);
    for (const d of DRIVERS) expect(DRIVER_TEXT[d].length, d).toBeGreaterThan(0);
  });
});

describe('reasonsFor', () => {
  it('says no notable soreness for a low band', () => {
    expect(reasonsFor({ band: 'low', drivers: [] })).toEqual([NO_SORENESS_TEXT]);
  });

  it('lists each driver, in order, for a raised band', () => {
    expect(reasonsFor({ band: 'high', drivers: ['novel', 'eccentric'] })).toEqual([
      DRIVER_TEXT.novel,
      DRIVER_TEXT.eccentric,
    ]);
  });

  it('falls back to a generic reason when a raised band has no drivers', () => {
    expect(reasonsFor({ band: 'moderate', drivers: [] })).toEqual([GENERIC_REASON_TEXT]);
  });
});

describe('phrases', () => {
  it('words the band and the zone label as predicted soreness', () => {
    expect(bandPhrase('moderate')).toBe('Moderate predicted soreness');
    expect(zoneA11yLabel('quads', 'high')).toBe('Quads, high predicted soreness');
  });

  it('handles singular and plural strength-session notes', () => {
    expect(needsTagNote(1)).toBe('1 strength session has no muscle tag, so it is not counted.');
    expect(needsTagNote(3)).toBe('3 strength sessions have no muscle tag, so they are not counted.');
  });

  it('names sports the engine cannot map, singular and plural', () => {
    expect(unmappedNote(['curling'])).toBe(
      '1 sport is not mapped to muscles yet, so it is not counted: curling.',
    );
    expect(unmappedNote(['curling', 'darts'])).toBe(
      '2 sports are not mapped to muscles yet, so they are not counted: curling, darts.',
    );
  });
});

describe('check-in and evidence copy', () => {
  it('says what a check-in did, in words', () => {
    expect(checkInMessage('quads', 1, 1.1)).toBe('Noted. Predictions for quads will lean a little higher.');
    expect(checkInMessage('quads', 1, 0.9)).toBe('Noted. Predictions for quads will lean a little lower.');
    expect(checkInMessage('upperBack', 1, 1)).toBe('Noted. Predictions for upper back will stay about the same.');
  });

  it('never claims stretching reduces soreness', () => {
    expect(EVIDENCE_NOTES.ROM).toMatch(/not been shown to reduce soreness/);
    expect(STRETCH_HONESTY).toMatch(/hasn't been shown to reduce soreness/);
    expect(EVIDENCE_NOTES.COMFORT).not.toMatch(/soreness/i);
  });

  it('keeps a clinician safety line and only tags evidence for range of motion or comfort', () => {
    expect(SAFETY_LINE).toMatch(/Stop and see a clinician/);
    expect(Object.keys(EVIDENCE_LABELS).sort()).toEqual(['COMFORT', 'ROM']);
  });
});

describe('honesty rule', () => {
  it('never claims diagnosis, accuracy, validation, clinical benefit, prevention or cure', () => {
    const banned = /diagnos|accura|clinical|prevent|cure|validated|treat|boost|oxygen|blood flow/i;
    const strings = [
      ...Object.values(MUSCLE_LABELS),
      ...Object.values(BAND_LABELS),
      ...Object.values(DRIVER_TEXT),
      NO_SORENESS_TEXT,
      GENERIC_REASON_TEXT,
      DISCLAIMER,
      SYNTHETIC_BANNER,
      needsTagNote(1),
      needsTagNote(2),
      unmappedNote(['curling']),
      unmappedNote(['curling', 'darts']),
      ...NEW_STRINGS,
      ...BANDS.map(bandPhrase),
      ...MUSCLES.flatMap((m) => BANDS.map((b) => zoneA11yLabel(m, b))),
    ];
    for (const s of strings) expect(s).not.toMatch(banned);
    for (const s of strings) {
      if (/(reduce|relieve) soreness/i.test(s)) expect(s).toMatch(/(not|n't) been shown/i);
    }
  });

  it('keeps the wellness disclaimer and the synthetic label', () => {
    expect(DISCLAIMER).toContain('not medical advice');
    expect(DISCLAIMER).toContain('not measured');
    expect(SYNTHETIC_BANNER).toBe('SYNTHETIC DATA');
  });
});
```

Create `app/tagging.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { syntheticReplay } from '../data/replay.synthetic';
import { workout } from '../data/scenarios/builders';
import { computeForecast, defaultSensitivity } from '../engine';
import { TAG_OPTIONS, applyTags, describeWorkout } from './tagging';

const wed = workout({
  id: 'w1',
  sport: 'weightlifting',
  start: '2026-09-16T17:00:00Z',
  zoneMinutes: [0, 10, 30, 15, 5, 0],
});
const run = workout({
  id: 'w2',
  sport: 'running',
  start: '2026-09-17T07:00:00Z',
  zoneMinutes: [0, 5, 20, 5, 0, 0],
});

describe('TAG_OPTIONS', () => {
  it('lists the five session tags the engine understands', () => {
    expect([...TAG_OPTIONS]).toEqual(['lower', 'upper', 'push', 'pull', 'full']);
  });
});

describe('applyTags', () => {
  it('sets the chosen tag on the matching workout and leaves the others alone', () => {
    const out = applyTags([wed, run], { w1: 'upper' });
    expect(out[0].session_tag).toBe('upper');
    expect(out[1]).toBe(run);
  });

  it('does not mutate its inputs', () => {
    const before = JSON.stringify([wed, run]);
    applyTags([wed, run], { w1: 'lower' });
    expect(JSON.stringify([wed, run])).toBe(before);
    expect(wed.session_tag).toBeUndefined();
  });

  it('returns the same workouts when there are no tags', () => {
    expect(applyTags([wed, run], {})).toEqual([wed, run]);
  });

  it('turns an untagged demo session from unknown into counted', () => {
    const asOf = new Date('2026-09-19T20:00:00Z');
    const s = defaultSensitivity();
    const untagged = computeForecast(syntheticReplay.workouts, asOf, s);
    expect(untagged.needsTag).toEqual(['d-wed-strength']);
    expect(untagged.byDay[0].chest.band).toBe('low');

    const tagged = computeForecast(applyTags(syntheticReplay.workouts, { 'd-wed-strength': 'upper' }), asOf, s);
    expect(tagged.needsTag).toEqual([]);
    expect(tagged.byDay[0].chest.band).not.toBe('low');
  });
});

describe('describeWorkout', () => {
  it('gives a UTC weekday, date and a readable sport', () => {
    expect(describeWorkout(wed)).toBe('Wed Sep 16 · Weightlifting');
  });

  it('spaces hyphenated sport names', () => {
    expect(describeWorkout({ start: '2026-09-18T07:00:00Z', sport_name: 'functional-fitness' })).toBe(
      'Fri Sep 18 · Functional fitness',
    );
  });

  it('uses UTC, so late evening stays on the same day', () => {
    expect(describeWorkout({ start: '2026-09-16T23:30:00Z', sport_name: 'weightlifting' })).toBe(
      'Wed Sep 16 · Weightlifting',
    );
  });
});
```

Create `app/honesty.test.ts`:

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

Replace `engine/replay.synthetic.test.ts` with:

```ts
import { describe, expect, it } from 'vitest';
import { syntheticReplay } from '../data/replay.synthetic';
import { parseReplay } from './replay';
import { defaultSensitivity } from './sensitivity';
import { computeForecast } from './soreness';

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

  it('has one untagged strength session on Wed Sep 16, which the engine reports instead of guessing', () => {
    const wed = syntheticReplay.workouts.find((w) => w.id === 'd-wed-strength');
    expect(wed?.sport_name).toBe('weightlifting');
    expect(wed?.session_tag).toBeUndefined();
    const forecast = computeForecast(syntheticReplay.workouts, new Date('2026-09-19T20:00:00Z'), defaultSensitivity());
    expect(forecast.needsTag).toEqual(['d-wed-strength']);
  });

  it('has no workout on the one rest day, Sun Sep 20', () => {
    const days = syntheticReplay.workouts.map((w) => w.start.slice(0, 10));
    expect(days).not.toContain('2026-09-20');
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run app/copy.test.ts app/tagging.test.ts engine/replay.synthetic.test.ts`
Expected: FAIL. `app/copy.test.ts` fails because the new exports do not exist yet; `app/tagging.test.ts` fails because `./tagging` cannot be resolved; `engine/replay.synthetic.test.ts` fails because `d-wed-strength` is not in the data yet. (`app/honesty.test.ts` already passes: it guards the source and needs no new code, so Step 5 proves it can fail.) Paste the real output into your report.

- [ ] **Step 3: Write the implementation**

Replace `app/copy.ts` with:

```ts
import type { Driver, Muscle, MuscleState, RiskBand, StrengthTag } from '../engine';
import type { CheckInLevel } from './checkin';
import type { EvidenceTag } from './mobility/library';

export const MUSCLE_LABELS: Record<Muscle, string> = {
  chest: 'Chest',
  shoulders: 'Shoulders',
  biceps: 'Biceps',
  triceps: 'Triceps',
  forearms: 'Forearms',
  upperBack: 'Upper back',
  core: 'Core',
  glutes: 'Glutes',
  quads: 'Quads',
  hamstrings: 'Hamstrings',
  calves: 'Calves',
  adductors: 'Inner thighs',
};

export const BAND_LABELS: Record<RiskBand, string> = {
  low: 'Low',
  moderate: 'Moderate',
  high: 'High',
};

export const DRIVER_TEXT: Record<Driver, string> = {
  novel: 'New or bigger than your recent routine.',
  eccentric:
    'Includes lengthening work (downhill, decelerating, lowering), which drives soreness most.',
  'high-load': 'A lot of total work for this muscle.',
};

export const NO_SORENESS_TEXT = 'No notable soreness predicted.';
export const GENERIC_REASON_TEXT = 'Predicted from your recent workouts.';

export const DISCLAIMER =
  'Predicted from your workouts, not measured. General wellness guidance, not medical advice.';
export const SYNTHETIC_BANNER = 'SYNTHETIC DATA';

/** "Moderate predicted soreness" */
export function bandPhrase(band: RiskBand): string {
  return `${BAND_LABELS[band]} predicted soreness`;
}

/** Screen-reader label for a body zone. */
export function zoneA11yLabel(muscle: Muscle, band: RiskBand): string {
  return `${MUSCLE_LABELS[muscle]}, ${bandPhrase(band).toLowerCase()}`;
}

/** Plain-language reasons for one muscle on one day. */
export function reasonsFor(state: MuscleState): string[] {
  if (state.band === 'low') return [NO_SORENESS_TEXT];
  if (state.drivers.length === 0) return [GENERIC_REASON_TEXT];
  return state.drivers.map((d) => DRIVER_TEXT[d]);
}

/** Sports the engine has no muscle map for. They add no soreness, so say so instead of hiding them. */
export function unmappedNote(sports: string[]): string {
  const one = sports.length === 1;
  return `${sports.length} sport${one ? ' is' : 's are'} not mapped to muscles yet, so ${one ? 'it is' : 'they are'} not counted: ${sports.join(', ')}.`;
}

export function needsTagNote(count: number): string {
  const one = count === 1;
  return `${count} strength session${one ? ' has' : 's have'} no muscle tag, so ${one ? 'it is' : 'they are'} not counted.`;
}

// Check-in
export const CHECKIN_PROMPT = 'How does it feel today?';
export const CHECKIN_NOT_TODAY = 'Check-ins are for today. Slide back to Now.';
export const CHECKIN_LABELS: Record<CheckInLevel, string> = {
  0: 'None',
  1: 'Mild',
  2: 'Moderate',
  3: 'Severe',
};

/** What a check-in did, in words. `before` and `after` are the muscle's sensitivity. */
export function checkInMessage(muscle: Muscle, before: number, after: number): string {
  const name = MUSCLE_LABELS[muscle].toLowerCase();
  if (after > before) return `Noted. Predictions for ${name} will lean a little higher.`;
  if (after < before) return `Noted. Predictions for ${name} will lean a little lower.`;
  return `Noted. Predictions for ${name} will stay about the same.`;
}

// Comfort and mobility ideas
export const EVIDENCE_LABELS: Record<EvidenceTag, string> = {
  ROM: 'Range of motion',
  COMFORT: 'Comfort',
};
export const EVIDENCE_NOTES: Record<EvidenceTag, string> = {
  ROM: 'Done regularly, stretching improves range of motion. It has not been shown to reduce soreness.',
  COMFORT: 'Some people find this eases stiffness. Evidence is mixed.',
};
export const COMFORT_HEADING = 'Comfort ideas';
export const ROM_HEADING = 'For range of motion (regular practice, not a soreness fix)';
export const NOTHING_NEEDED_TEXT = 'Nothing needed for this muscle right now.';
export const SAVE_STRETCHING_TEXT = 'Save stretching for when soreness eases.';
export const STRETCH_HONESTY = "Stretching hasn't been shown to reduce soreness.";
export const SAFETY_LINE =
  "Sharp pain, swelling, numbness or dark urine isn't normal soreness. Stop and see a clinician.";

// Tagging strength sessions
export const TAG_HEADING = 'Tag your strength sessions';
export const TAG_PROMPT = 'Which muscles did each session work?';
export const TAG_LABELS: Record<StrengthTag, string> = {
  lower: 'Lower body',
  upper: 'Upper body',
  push: 'Push',
  pull: 'Pull',
  full: 'Full body',
};
```

Create `app/tagging.ts`:

```ts
import type { StrengthTag, TaggedWorkout } from '../engine';

export const TAG_OPTIONS: readonly StrengthTag[] = ['lower', 'upper', 'push', 'pull', 'full'];

/** User-chosen session tags, by workout id. */
export type Tags = Record<string, StrengthTag>;

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const;
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'] as const;

/** A copy of the workouts with the chosen tags applied. Inputs are never mutated. */
export function applyTags(workouts: TaggedWorkout[], tags: Tags): TaggedWorkout[] {
  return workouts.map((w) => (tags[w.id] ? { ...w, session_tag: tags[w.id] } : w));
}

function sportLabel(sportName: string): string {
  const text = sportName.replace(/[-_]+/g, ' ').trim();
  return text.charAt(0).toUpperCase() + text.slice(1);
}

/** "Wed Sep 16 · Weightlifting", in UTC so it is the same on every device. */
export function describeWorkout(workout: Pick<TaggedWorkout, 'start' | 'sport_name'>): string {
  const d = new Date(workout.start);
  return `${WEEKDAYS[d.getUTCDay()]} ${MONTHS[d.getUTCMonth()]} ${d.getUTCDate()} · ${sportLabel(workout.sport_name)}`;
}
```

Replace `data/replay.synthetic.ts` with:

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

export const syntheticReplay: ReplayFile = {
  synthetic: true,
  workouts: [...history, ...demoWeek],
};
```

- [ ] **Step 4: Run the tests and typecheck to verify they pass**

Run: `npm test && npm run typecheck`
Expected: 17 test files, 117 tests pass (102 plus 3 new copy tests, 8 tagging, 3 honesty and 1 more synthetic-data test); typecheck prints no errors.

- [ ] **Step 5: Prove the honesty scan can fail**

Temporarily plant a violation, run the scan, then revert:
```bash
sed -i "s/Walk on flat ground at a pace where you could hold a conversation./Walk on flat ground to reduce soreness./" app/mobility/library.ts
npx vitest run app/honesty.test.ts
git checkout app/mobility/library.ts
npx vitest run app/honesty.test.ts
```
Expected: the first run FAILS on "only mentions reducing or relieving soreness in a line that says it has not been shown" naming `mobility/library.ts`; after `git checkout`, the second run passes. Confirm `git status --short` shows `app/mobility/library.ts` clean. Paste both outputs.

- [ ] **Step 6: Commit**

```bash
git add app data engine
git commit -m "$(cat <<'EOF'
Add check-in and tagging copy, tagging helpers, honesty scan and untagged demo session

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 3: Components and screen

**Files:**
- Create: `app/components/CheckInPicker.tsx`, `app/components/MoveList.tsx`, `app/components/TagPrompt.tsx`
- Replace (whole file): `app/components/MuscleSheet.tsx`, `app/BodyMapScreen.tsx`
- Modify: `docs/superpowers/specs/2026-09-20-checkin-mobility-design.md` (append Amendments)

**Interfaces:**
- Consumes: everything from Tasks 1 and 2; the B1 modules (`BodyMap`, `DayScrubber`, `zones`, `colors`, `scrubber`, `config`); `computeForecast`, `defaultSensitivity`, `Muscle`, `StrengthTag` from `engine/index.ts`; `loadReplay` from `data/index.ts`.
- Produces: the running app. `BodyMapScreen` computes `tagged = applyTags(...)`, `base` (default sensitivity), `sensitivity = sensitivityFromCheckIns(checkIns, base.byDay[0])` and `forecast` (with that sensitivity); the sheet gains a check-in picker (Now only), a recommendation list, and an inner `ScrollView` capped at 65% of the body height.

The components are verified by typecheck, the web export, and (by the controller, in Step 6) a scripted browser drive plus the user's phone. Vitest does not cover them because they need React Native. `BodyMap.tsx` and `DayScrubber.tsx` are unchanged. The `accessible` prop must not be added to body zones: react-native-web turns them into HTML buttons and they disappear (found in the B1 review).

- [ ] **Step 1: Write the new components**

Create `app/components/CheckInPicker.tsx`:

```tsx
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { CHECKIN_LEVELS, type CheckInLevel } from '../checkin';
import { CHECKIN_LABELS, CHECKIN_NOT_TODAY, CHECKIN_PROMPT } from '../copy';

interface Props {
  /** Check-ins describe today, so the picker is only active on Now. */
  enabled: boolean;
  level?: CheckInLevel;
  /** What the last check-in did, in words. */
  message?: string;
  onChange: (level: CheckInLevel) => void;
}

export default function CheckInPicker({ enabled, level, message, onChange }: Props) {
  if (!enabled) return <Text style={styles.hint}>{CHECKIN_NOT_TODAY}</Text>;
  return (
    <View style={styles.wrap}>
      <Text style={styles.prompt}>{CHECKIN_PROMPT}</Text>
      <View style={styles.row}>
        {CHECKIN_LEVELS.map((l) => (
          <Pressable
            key={l}
            onPress={() => onChange(l)}
            hitSlop={4}
            accessibilityRole="button"
            accessibilityState={{ selected: level === l }}
            style={[styles.chip, level === l && styles.chipOn]}
          >
            <Text style={[styles.chipText, level === l && styles.chipTextOn]}>
              {CHECKIN_LABELS[l]}
            </Text>
          </Pressable>
        ))}
      </View>
      {message ? <Text style={styles.message}>{message}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 8 },
  prompt: { fontSize: 14, fontWeight: '600', color: '#16211F' },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { paddingVertical: 8, paddingHorizontal: 14, borderRadius: 16, backgroundColor: '#EEF1F2' },
  chipOn: { backgroundColor: '#1E7A6C' },
  chipText: { fontSize: 13, fontWeight: '600', color: '#26312F' },
  chipTextOn: { color: '#FFFFFF' },
  message: { fontSize: 13, color: '#26312F' },
  hint: { fontSize: 13, color: '#5C6866' },
});
```

Create `app/components/MoveList.tsx`:

```tsx
import { StyleSheet, Text, View } from 'react-native';
import {
  COMFORT_HEADING,
  EVIDENCE_LABELS,
  EVIDENCE_NOTES,
  NOTHING_NEEDED_TEXT,
  ROM_HEADING,
  SAFETY_LINE,
  SAVE_STRETCHING_TEXT,
  STRETCH_HONESTY,
} from '../copy';
import { evidenceFor, type EvidenceTag, type Move } from '../mobility/library';
import type { Recommendation } from '../mobility/recommend';

interface SectionProps {
  heading: string;
  evidence: EvidenceTag;
  moves: Move[];
}

function Section({ heading, evidence, moves }: SectionProps) {
  return (
    <View style={styles.section}>
      <Text style={styles.heading}>{heading}</Text>
      <Text style={styles.evidenceNote}>{EVIDENCE_NOTES[evidence]}</Text>
      {moves.map((move) => (
        <View key={move.id} style={styles.move}>
          <View style={styles.moveHeader}>
            <Text style={styles.moveName}>{move.name}</Text>
            <Text style={styles.tag}>{EVIDENCE_LABELS[evidenceFor(move.kind)]}</Text>
          </View>
          <Text style={styles.how}>{move.how}</Text>
          <Text style={styles.dose}>{move.dose}</Text>
        </View>
      ))}
    </View>
  );
}

export default function MoveList({ recommendation }: { recommendation: Recommendation }) {
  const { comfort, rom, note } = recommendation;
  return (
    <View style={styles.wrap}>
      {note === 'nothing-needed' && <Text style={styles.note}>{NOTHING_NEEDED_TEXT}</Text>}
      {comfort.length > 0 && <Section heading={COMFORT_HEADING} evidence="COMFORT" moves={comfort} />}
      {note === 'save-stretching' && <Text style={styles.note}>{SAVE_STRETCHING_TEXT}</Text>}
      {rom.length > 0 && <Section heading={ROM_HEADING} evidence="ROM" moves={rom} />}
      <Text style={styles.small}>{STRETCH_HONESTY}</Text>
      <Text style={styles.safety}>{SAFETY_LINE}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 12 },
  section: { gap: 6 },
  heading: { fontSize: 14, fontWeight: '700', color: '#16211F' },
  evidenceNote: { fontSize: 12, color: '#5C6866' },
  move: { gap: 2, paddingVertical: 4 },
  moveHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  moveName: { flex: 1, fontSize: 14, fontWeight: '600', color: '#26312F' },
  tag: {
    fontSize: 11,
    fontWeight: '600',
    color: '#1E5F55',
    backgroundColor: '#E3EEEC',
    paddingVertical: 2,
    paddingHorizontal: 8,
    borderRadius: 10,
    overflow: 'hidden',
  },
  how: { fontSize: 13, color: '#26312F' },
  dose: { fontSize: 12, color: '#5C6866' },
  note: { fontSize: 13, color: '#26312F' },
  small: { fontSize: 12, color: '#5C6866' },
  safety: { fontSize: 12, fontWeight: '600', color: '#7A3B00' },
});
```

Create `app/components/TagPrompt.tsx`:

```tsx
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { StrengthTag } from '../../engine';
import { TAG_HEADING, TAG_LABELS, TAG_PROMPT } from '../copy';
import { TAG_OPTIONS } from '../tagging';

export interface UntaggedSession {
  id: string;
  label: string;
}

interface Props {
  sessions: UntaggedSession[];
  onTag: (id: string, tag: StrengthTag) => void;
}

/** Strength sessions carry no muscle data, so the member says which muscles each one worked. */
export default function TagPrompt({ sessions, onTag }: Props) {
  if (sessions.length === 0) return null;
  return (
    <View style={styles.wrap}>
      <Text style={styles.heading}>{TAG_HEADING}</Text>
      <Text style={styles.prompt}>{TAG_PROMPT}</Text>
      {sessions.map((session) => (
        <View key={session.id} style={styles.session}>
          <Text style={styles.label}>{session.label}</Text>
          <View style={styles.row}>
            {TAG_OPTIONS.map((tag) => (
              <Pressable
                key={tag}
                onPress={() => onTag(session.id, tag)}
                hitSlop={4}
                accessibilityRole="button"
                accessibilityLabel={`${session.label}: ${TAG_LABELS[tag]}`}
                style={styles.chip}
              >
                <Text style={styles.chipText}>{TAG_LABELS[tag]}</Text>
              </Pressable>
            ))}
          </View>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 6, padding: 12, borderRadius: 12, backgroundColor: '#F6F8F8', borderWidth: 1, borderColor: '#E3EAE8' },
  heading: { fontSize: 14, fontWeight: '700', color: '#16211F' },
  prompt: { fontSize: 12, color: '#5C6866' },
  session: { gap: 6, marginTop: 6 },
  label: { fontSize: 13, fontWeight: '600', color: '#26312F' },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { paddingVertical: 8, paddingHorizontal: 12, borderRadius: 16, backgroundColor: '#E3EEEC' },
  chipText: { fontSize: 13, fontWeight: '600', color: '#1E5F55' },
});
```

- [ ] **Step 2: Replace the sheet and the screen**

Replace `app/components/MuscleSheet.tsx` with:

```tsx
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import type { Muscle, MuscleState } from '../../engine';
import { BAND_LABELS, MUSCLE_LABELS, bandPhrase, reasonsFor } from '../copy';
import { bandColor } from '../body/colors';
import type { CheckInLevel } from '../checkin';
import type { Recommendation } from '../mobility/recommend';
import CheckInPicker from './CheckInPicker';
import MoveList from './MoveList';

interface Props {
  muscle: Muscle;
  state: MuscleState;
  /** e.g. "Now" or "+2d (Mon)". */
  dayText: string;
  /** Check-ins describe today, so they are only offered on Now. */
  checkInEnabled: boolean;
  checkIn?: CheckInLevel;
  checkInMessage?: string;
  onCheckIn: (level: CheckInLevel) => void;
  recommendation: Recommendation;
  onClose: () => void;
}

/**
 * Explains one muscle's prediction and offers a check-in and comfort ideas. Follows the scrubber,
 * so dragging shows how it fades. The header stays put; the rest scrolls.
 */
export default function MuscleSheet({
  muscle,
  state,
  dayText,
  checkInEnabled,
  checkIn,
  checkInMessage,
  onCheckIn,
  recommendation,
  onClose,
}: Props) {
  return (
    <View style={styles.sheet}>
      <View style={styles.header}>
        <View style={[styles.swatch, { backgroundColor: bandColor(state.band) }]} />
        <View style={styles.headerText}>
          <Text style={styles.title}>{MUSCLE_LABELS[muscle]}</Text>
          <Text style={styles.subtitle}>
            {bandPhrase(state.band)} · {dayText}
          </Text>
        </View>
        <Pressable
          onPress={onClose}
          hitSlop={12}
          accessibilityRole="button"
          accessibilityLabel="Close details"
        >
          <Text style={styles.close}>Close</Text>
        </Pressable>
      </View>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {reasonsFor(state).map((reason) => (
          <Text key={reason} style={styles.reason}>
            {`• ${reason}`}
          </Text>
        ))}
        <Text style={styles.band}>{`Band: ${BAND_LABELS[state.band]}`}</Text>
        <CheckInPicker
          enabled={checkInEnabled}
          level={checkIn}
          message={checkInMessage}
          onChange={onCheckIn}
        />
        <MoveList recommendation={recommendation} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  sheet: {
    position: 'absolute',
    left: 12,
    right: 12,
    bottom: 12,
    maxHeight: '65%',
    padding: 16,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#D5DDDB',
    gap: 8,
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  swatch: { width: 22, height: 22, borderRadius: 11, borderWidth: 1, borderColor: '#B7C4C1' },
  headerText: { flex: 1 },
  title: { fontSize: 17, fontWeight: '700', color: '#16211F' },
  subtitle: { fontSize: 13, color: '#4B5856' },
  close: { fontSize: 14, fontWeight: '600', color: '#1E7A6C', padding: 4 },
  scrollContent: { gap: 12, paddingBottom: 4 },
  reason: { fontSize: 14, color: '#26312F' },
  band: { fontSize: 12, color: '#5C6866' },
});
```

Replace `app/BodyMapScreen.tsx` with:

```tsx
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { loadReplay } from '../data';
import { computeForecast, defaultSensitivity, type Muscle, type StrengthTag } from '../engine';
import { DEMO_AS_OF } from './config';
import { BAND_ORDER, bandColor } from './body/colors';
import { hasMuscle, type BodySide } from './body/zones';
import { sensitivityFromCheckIns, type CheckInLevel, type CheckIns } from './checkin';
import BodyMap from './components/BodyMap';
import DayScrubber from './components/DayScrubber';
import MuscleSheet from './components/MuscleSheet';
import TagPrompt from './components/TagPrompt';
import {
  BAND_LABELS,
  DISCLAIMER,
  SYNTHETIC_BANNER,
  checkInMessage,
  needsTagNote,
  unmappedNote,
} from './copy';
import { recommend } from './mobility/recommend';
import { dayLabel, weekdayLabel } from './scrubber';
import { applyTags, describeWorkout, type Tags } from './tagging';

const SIDES: readonly BodySide[] = ['front', 'back'];

export default function BodyMapScreen() {
  const { width: screenWidth } = useWindowDimensions();
  const replay = useMemo(() => loadReplay(), []);

  const [side, setSide] = useState<BodySide>('front');
  const [day, setDay] = useState(0);
  const [selected, setSelected] = useState<Muscle | null>(null);
  const [checkIns, setCheckIns] = useState<CheckIns>({});
  const [tags, setTags] = useState<Tags>({});

  // Tags change which muscles a session loads. Check-ins are then rebuilt from the default
  // sensitivity and the default forecast for Now, so they never stack.
  const tagged = useMemo(() => applyTags(replay.workouts, tags), [replay, tags]);
  const base = useMemo(
    () => computeForecast(tagged, DEMO_AS_OF, defaultSensitivity()),
    [tagged],
  );
  const sensitivity = useMemo(
    () => sensitivityFromCheckIns(checkIns, base.byDay[0]),
    [checkIns, base],
  );
  const forecast = useMemo(
    () => computeForecast(tagged, DEMO_AS_OF, sensitivity),
    [tagged, sensitivity],
  );

  const untagged = useMemo(
    () =>
      tagged
        .filter((w) => forecast.needsTag.includes(w.id))
        .map((w) => ({ id: w.id, label: describeWorkout(w) })),
    [tagged, forecast],
  );

  const mapWidth = Math.min(screenWidth - 48, 260);
  const dayForecast = forecast.byDay[day];
  const dayText = `${dayLabel(day)} (${weekdayLabel(DEMO_AS_OF, day)})`;

  const select = (muscle: Muscle) => setSelected((cur) => (cur === muscle ? null : muscle));
  // Keep the open sheet only if its muscle is drawn in the view we are switching to.
  const chooseSide = (next: BodySide) => {
    setSide(next);
    setSelected((cur) => (cur && hasMuscle(next, cur) ? cur : null));
  };
  const checkIn = (muscle: Muscle, level: CheckInLevel) =>
    setCheckIns((cur) => ({ ...cur, [muscle]: level }));
  const tagSession = (id: string, tag: StrengthTag) => setTags((cur) => ({ ...cur, [id]: tag }));

  return (
    <View style={styles.root}>
      {/* Header and footer sit outside the ScrollView so the label and the disclaimer are always visible. */}
      <View style={styles.header}>
        <Text style={styles.title}>Sore Spot</Text>
        {replay.synthetic && <Text style={styles.banner}>{SYNTHETIC_BANNER}</Text>}
      </View>

      <View style={styles.body}>
        <ScrollView contentContainerStyle={styles.content}>
          <Text style={styles.asOf}>
            {`Forecast from ${DEMO_AS_OF.toISOString().slice(0, 16).replace('T', ' ')} UTC`}
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

          <DayScrubber asOf={DEMO_AS_OF} day={day} onChange={setDay} />

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

          <TagPrompt sessions={untagged} onTag={tagSession} />
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
            checkIn={checkIns[selected]}
            checkInMessage={
              checkIns[selected] === undefined
                ? undefined
                : checkInMessage(selected, 1, sensitivity[selected])
            }
            onCheckIn={(level) => checkIn(selected, level)}
            recommendation={recommend(selected, dayForecast[selected].band, checkIns[selected])}
            onClose={() => setSelected(null)}
          />
        )}
      </View>

      <View style={styles.footer}>
        <Text style={styles.note}>{DISCLAIMER}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#FFFFFF' },
  header: { paddingTop: 56, paddingHorizontal: 16, paddingBottom: 8, gap: 4 },
  body: { flex: 1 },
  content: { padding: 16, paddingTop: 8, gap: 12 },
  footer: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: '#E3EAE8',
    backgroundColor: '#FFFFFF',
  },
  title: { fontSize: 24, fontWeight: '700', color: '#16211F' },
  banner: { color: '#B45309', fontWeight: '700' },
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

- [ ] **Step 3: Typecheck, test and build the web bundle**

Run:
```bash
npm run typecheck
npm test
npx expo export --platform web --output-dir "C:/Users/priya/AppData/Local/Temp/b2check-dist"
```
Expected: typecheck prints no errors; 17 test files, 117 tests pass; the export ends with an `Exported:` line. Do not create a `dist` folder inside the project. Paste the real output.

- [ ] **Step 4: Record the build-time changes in the spec**

Append this section to the end of `docs/superpowers/specs/2026-09-20-checkin-mobility-design.md`:

```markdown

## Amendments (2026-09-20, found while building)

These change the spec above; where they conflict, this section wins.

- **Comfort ideas:** at most one move of each comfort kind, in the order light movement, self-massage, mobility (so at most 3, and fewer for a muscle without a kind, for example core has no self-massage: "Easy walk" then "Cat-cow"). The library has 37 moves.
- **Stretches:** at most 2 range-of-motion stretches, shown for Low and Moderate and hidden for High. For Low the sheet says "Nothing needed for this muscle right now." and still offers a stretch.
- **Check-in message:** derived from the muscle's current sensitivity against the default of 1.0 (`checkInMessage(muscle, 1, sensitivity)`), so it is always consistent with the forecast and needs no extra state.
- **Sheet:** gained an inner `ScrollView` with the header fixed; maximum height 65% of the body area.
- **Tagging:** `TagPrompt` sits between the legend and the notes; the "no muscle tag" note stays visible until every session is tagged.
- **Honesty scan:** a new test (`app/honesty.test.ts`) reads every non-test file under `app/` and applies the banned-word rule and the soreness-claim rule, in addition to the string-level checks in `app/copy.test.ts`. A "hasn't been shown" or "not been shown" wording satisfies the soreness-claim rule.
- **Tests:** 39 new tests (check-in 10, library 5, recommend 9, tagging 8, honesty 3, copy 3, synthetic data 1). The suite is 117 tests in 17 files.
- **Deferred:** persistence of check-ins and tags across launches; the full red-flag screen and guardrails (C1); the evidence panel (C2); VoiceOver support for zones and the scrubber; a taller-than-screen sheet on very small phones still hides part of the map.
```

- [ ] **Step 5: Commit, then hand the browser and phone check to the controller**

```bash
git add -A
git commit -m "$(cat <<'EOF'
Add check-in, comfort ideas and session tagging to the body map

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

Expected: the commit contains the three new components, the reworked sheet and screen, and the spec. **Stop here.** The controller then drives the web build in a browser at two phone sizes, and the user confirms on the iPhone (the spec's definition of done). Do not start a dev server.

---

## Self-Review

**Spec coverage:**
- Check-in (picker on Now only, replace-not-stack semantics, forecast recompute, plain-language result): Tasks 1, 2 (copy), 3.
- Library of about 37 moves with evidence derived from kind, no soreness or vascular tag, coverage of all 12 muscles: Task 1 (with tests).
- Recommendations (order, at-most counts, High hides stretches, severe check-in counts as High, honesty and safety lines): Task 1 (logic), Task 3 (rendering).
- Tagging flow and the untagged demo session, with the engine still refusing to guess: Task 2 (helpers, data), Task 3 (prompt).
- Sheet scrolls, capped at 65%: Task 3.
- Honesty (all text in `copy.ts`, source scan over `app/`, banned words, soreness-claim rule): Task 2.
- Data flow (`applyTags` -> base forecast -> `sensitivityFromCheckIns` -> forecast): Tasks 1-3.
- Non-goals respected: no persistence, no plan, no red-flag screen, `/engine` source untouched.
- Definition of done (quads: reasons, check-in, comfort ideas, no stretches, "lean a little lower" after Moderate; Wed session tag turns the upper body non-low): matches the scripted drive.

**Type consistency:** all names (`CheckInLevel`, `CheckIns`, `sensitivityFromCheckIns`, `effectiveBand`, `MOVES`, `evidenceFor`, `recommend`, `Recommendation`, `applyTags`, `describeWorkout`, `TAG_OPTIONS`, `Tags`, and the copy exports) are defined once (Tasks 1-2) and used with the same signatures in Task 3, because every block comes from one verified copy.

**Known limits, stated plainly:** components have no unit tests (they need React Native); they are verified by typecheck, the web build, a scripted browser drive and the user's phone. The library is hand-written and needs a trainer or PT review. A single check-in moves a band only near a threshold, because the engine's step is small. Very small phones lose part of the map while the sheet is open.
