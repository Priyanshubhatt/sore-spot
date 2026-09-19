# Body Map and Time Scrubber Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the hello screen with the app's first real screen: a front/back body map whose 12 muscle zones are colored by predicted soreness band, a scrubber over the 8-day forecast, and a tap-a-zone sheet that explains the prediction in plain language.

**Architecture:** Pure logic (copy, colors, scrubber math, zone path data) lives in plain TypeScript with Vitest tests and no React Native imports. Thin React Native components (`BodyMap` on `react-native-svg`, `DayScrubber` on `PanResponder`, `MuscleSheet`) render it. One screen owns the state and calls the existing engine once.

**Tech Stack:** Expo SDK 57, React Native 0.86, `react-native-svg` (installed with `npx expo install`), TypeScript strict, Vitest, Git Bash on Windows.

**Spec:** `docs/superpowers/specs/2026-09-19-body-map-scrubber-design.md` (approved 2026-09-19). Builds on the engine from `docs/superpowers/specs/2026-09-19-engine-foundation-design.md`.

## Global Constraints

Every task's requirements include these, copied from the spec:

- **Do not edit `/engine` or `/data`.** B1 only adds under `/app`, plus `App.tsx`, `vitest.config.ts`, `package.json` and the spec file.
- Bands only: "Low", "Moderate", "High" predicted soreness. **No scores, percentages or accuracy claims. Never "diagnosis".** The copy test enforces the banned words (`diagnos`, `accura`, `clinical`, `prevent`, `cure`, `validated`, `treat`).
- A `SYNTHETIC DATA` banner is visible whenever `replay.synthetic` is true.
- Always-visible note: "Predicted from your workouts, not measured. General wellness guidance, not medical advice."
- One sequential teal ramp so the map does not read as an alarm: low `#E3EEEC`, moderate `#7DBDB2`, high `#1E7A6C`. Color is never the only signal: legend, zone accessibility labels ("Quads, moderate predicted soreness") and the sheet states the band in words. A selected zone gets a dark outline.
- `DEMO_AS_OF = 2026-09-19T20:00:00Z`; `byDay[d]` is the state at `DEMO_AS_OF + d days`; weekday labels are UTC.
- If `forecast.needsTag.length > 0`, show "N strength session(s) have no muscle tag, so they are not counted."
- `react-native-svg` is installed with `npx expo install react-native-svg` so Expo picks the SDK 57 compatible version.
- **Do not link a git remote.** The user does that.
- Commit messages end with the line `Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>`.

**Working directory for every command:** `C:\Users\priya\Desktop\Sore Spot` (Git Bash path `/c/Users/priya/Desktop/Sore Spot`). Baseline: branch `master`, 48 tests in 8 files passing, `npm run typecheck` clean. The SDD controller creates the working branch (`feat/body-map`) before Task 1.

**How these files were produced:** every code block below was first run in a scratch copy of the project: 74 Vitest tests passing, `tsc --strict` clean, `expo export --platform web` building, and the screen driven in headless Edge (tap a zone, open the sheet, drag the scrubber, switch to Back) with screenshots inspected. Copy the blocks exactly.

## File Structure

```
vitest.config.ts                  include app/**/*.test.ts                        (Task 1)
app/config.ts                     DEMO_AS_OF                                       (Task 1)
app/copy.ts                       labels, driver text, disclaimer, reasonsFor      (Task 1)
app/scrubber.ts                   dayLabel, weekdayLabel, dayIndexFromX            (Task 1)
app/body/colors.ts                the teal ramp, bandColor                         (Task 1)
app/body/zones.ts                 silhouette + per-view zone paths, mirrorPath     (Task 2)
app/components/BodyMap.tsx        react-native-svg body, tap handling              (Task 3)
app/components/DayScrubber.tsx    8-segment track, tap + drag                      (Task 3)
app/components/MuscleSheet.tsx    explanation panel                                (Task 3)
app/BodyMapScreen.tsx             state, layout, banner, legend, notes             (Task 3)
App.tsx                           renders BodyMapScreen                            (Task 3)
app/HelloScreen.tsx               deleted (superseded)                             (Task 3)
*.test.ts next to each pure module                                                 (Tasks 1-2)
```

---

### Task 1: Pure copy, scrubber and color logic

**Files:**
- Modify: `vitest.config.ts`
- Create: `app/config.ts`, `app/copy.ts`, `app/scrubber.ts`, `app/body/colors.ts`
- Test: `app/copy.test.ts`, `app/scrubber.test.ts`, `app/body/colors.test.ts`

**Interfaces:**
- Consumes: `MUSCLES`, `Muscle`, `RiskBand`, `Driver`, `MuscleState` from `engine/index.ts`; `FORECAST_DAYS` from `engine/constants.ts`.
- Produces (used by Task 3):
  - `app/config.ts`: `DEMO_AS_OF: Date`.
  - `app/copy.ts`: `MUSCLE_LABELS`, `BAND_LABELS`, `DRIVER_TEXT`, `NO_SORENESS_TEXT`, `GENERIC_REASON_TEXT`, `DISCLAIMER`, `SYNTHETIC_BANNER`, `bandPhrase(band)`, `zoneA11yLabel(muscle, band)`, `reasonsFor(state: MuscleState): string[]`, `needsTagNote(count: number): string`.
  - `app/scrubber.ts`: `dayLabel(day: number): string`, `weekdayLabel(asOf: Date, day: number): string`, `dayIndexFromX(x: number, width: number, days?: number): number`.
  - `app/body/colors.ts`: `BAND_COLORS`, `BAND_ORDER`, `bandColor(band)`.

- [ ] **Step 1: Widen the Vitest scope and write the failing tests**

Replace `vitest.config.ts` with:

```ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: { environment: 'node', include: ['engine/**/*.test.ts', 'data/**/*.test.ts', 'app/**/*.test.ts'] },
});
```

Create `app/copy.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { MUSCLES, type Driver, type RiskBand } from '../engine';
import {
  BAND_LABELS,
  DISCLAIMER,
  DRIVER_TEXT,
  GENERIC_REASON_TEXT,
  MUSCLE_LABELS,
  NO_SORENESS_TEXT,
  SYNTHETIC_BANNER,
  bandPhrase,
  needsTagNote,
  reasonsFor,
  zoneA11yLabel,
} from './copy';

const BANDS: RiskBand[] = ['low', 'moderate', 'high'];
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
});

describe('honesty rule', () => {
  it('never claims diagnosis, accuracy, validation, clinical benefit, prevention or cure', () => {
    const banned = /diagnos|accura|clinical|prevent|cure|validated|treat/i;
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
      ...BANDS.map(bandPhrase),
      ...MUSCLES.flatMap((m) => BANDS.map((b) => zoneA11yLabel(m, b))),
    ];
    for (const s of strings) expect(s).not.toMatch(banned);
  });

  it('keeps the wellness disclaimer and the synthetic label', () => {
    expect(DISCLAIMER).toContain('not medical advice');
    expect(DISCLAIMER).toContain('not measured');
    expect(SYNTHETIC_BANNER).toBe('SYNTHETIC DATA');
  });
});
```

Create `app/scrubber.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { dayIndexFromX, dayLabel, weekdayLabel } from './scrubber';

describe('dayLabel', () => {
  it('says Now for day 0 and +Nd after that', () => {
    expect(dayLabel(0)).toBe('Now');
    expect(dayLabel(1)).toBe('+1d');
    expect(dayLabel(7)).toBe('+7d');
  });
});

describe('weekdayLabel', () => {
  const asOf = new Date('2026-09-19T20:00:00Z'); // a Saturday in UTC

  it('gives the UTC weekday of asOf plus the day offset', () => {
    expect(weekdayLabel(asOf, 0)).toBe('Sat');
    expect(weekdayLabel(asOf, 1)).toBe('Sun');
    expect(weekdayLabel(asOf, 2)).toBe('Mon');
    expect(weekdayLabel(asOf, 7)).toBe('Sat');
  });

  it('rolls over to the next UTC day even late in the evening', () => {
    expect(weekdayLabel(new Date('2026-09-19T23:59:00Z'), 1)).toBe('Sun');
  });
});

describe('dayIndexFromX', () => {
  it('maps the left edge to day 0 and the right edge to day 7', () => {
    expect(dayIndexFromX(0, 800)).toBe(0);
    expect(dayIndexFromX(800, 800)).toBe(7);
  });

  it('puts positions inside the right segment (800px / 8 days = 100px each)', () => {
    expect(dayIndexFromX(99, 800)).toBe(0);
    expect(dayIndexFromX(100, 800)).toBe(1);
    expect(dayIndexFromX(450, 800)).toBe(4);
    expect(dayIndexFromX(799, 800)).toBe(7);
  });

  it('clamps outside the track', () => {
    expect(dayIndexFromX(-40, 800)).toBe(0);
    expect(dayIndexFromX(900, 800)).toBe(7);
  });

  it('returns day 0 before the track has been measured', () => {
    expect(dayIndexFromX(50, 0)).toBe(0);
  });
});
```

Create `app/body/colors.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { BAND_COLORS, BAND_ORDER, bandColor } from './colors';

/** WCAG relative luminance of a #RRGGBB color. */
function luminance(hex: string): number {
  const [r, g, b] = [1, 3, 5]
    .map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
    .map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

describe('band colors', () => {
  it('orders bands low, moderate, high', () => {
    expect(BAND_ORDER).toEqual(['low', 'moderate', 'high']);
  });

  it('gives every band its own hex color', () => {
    const colors = BAND_ORDER.map(bandColor);
    for (const c of colors) expect(c).toMatch(/^#[0-9A-F]{6}$/);
    expect(new Set(colors).size).toBe(3);
    expect(bandColor('high')).toBe(BAND_COLORS.high);
  });

  it('gets darker as the band rises, so the map reads without a legend', () => {
    const [low, moderate, high] = BAND_ORDER.map((b) => luminance(bandColor(b)));
    expect(low).toBeGreaterThan(moderate);
    expect(moderate).toBeGreaterThan(high);
  });

  it('keeps the low band clearly lighter than the high band', () => {
    expect(luminance(bandColor('low')) / luminance(bandColor('high'))).toBeGreaterThan(4);
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run app`
Expected: FAIL, with errors that `./copy`, `./scrubber` and `./colors` cannot be resolved.

- [ ] **Step 3: Write the implementation**

Create `app/config.ts`:

```ts
/** Fixed on purpose: the synthetic demo week is Sep 14-20 2026, so a live clock would eventually render an all-low map. */
export const DEMO_AS_OF = new Date('2026-09-19T20:00:00Z');
```

Create `app/copy.ts`:

```ts
import type { Driver, Muscle, MuscleState, RiskBand } from '../engine';

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

export function needsTagNote(count: number): string {
  const one = count === 1;
  return `${count} strength session${one ? ' has' : 's have'} no muscle tag, so ${one ? 'it is' : 'they are'} not counted.`;
}
```

Create `app/scrubber.ts`:

```ts
import { FORECAST_DAYS } from '../engine/constants';

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const;
const MS_PER_DAY = 86_400_000;

/** "Now" for day 0, then "+1d" ... "+7d". */
export function dayLabel(day: number): string {
  return day === 0 ? 'Now' : `+${day}d`;
}

/** UTC weekday of asOf + day. UTC keeps labels deterministic across time zones. */
export function weekdayLabel(asOf: Date, day: number): string {
  return WEEKDAYS[new Date(asOf.getTime() + day * MS_PER_DAY).getUTCDay()];
}

/** Which of the evenly sized day segments an x position falls in. Clamped to the track. */
export function dayIndexFromX(x: number, width: number, days: number = FORECAST_DAYS): number {
  if (width <= 0) return 0;
  return Math.min(days - 1, Math.max(0, Math.floor((x / width) * days)));
}
```

Create `app/body/colors.ts`:

```ts
import type { RiskBand } from '../../engine';

// One sequential teal ramp so the map does not read as an alarm.
export const BAND_COLORS: Record<RiskBand, string> = {
  low: '#E3EEEC',
  moderate: '#7DBDB2',
  high: '#1E7A6C',
};

export const BAND_ORDER: readonly RiskBand[] = ['low', 'moderate', 'high'];

export function bandColor(band: RiskBand): string {
  return BAND_COLORS[band];
}
```

- [ ] **Step 4: Run the tests and typecheck to verify they pass**

Run: `npm test && npm run typecheck`
Expected: 11 test files, 67 tests pass (the 48 existing plus 8 copy, 7 scrubber and 4 color tests); typecheck prints no errors.

- [ ] **Step 5: Commit**

```bash
git add vitest.config.ts app
git commit -m "$(cat <<'EOF'
Add pure copy, scrubber and color logic for the body map

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 2: Body zone art

**Files:**
- Create: `app/body/zones.ts`
- Test: `app/body/zones.test.ts`

**Interfaces:**
- Consumes: `Muscle` from `engine/index.ts`.
- Produces (used by Task 3):
  - `BodySide` (`'front' | 'back'`), `VIEWBOX` (`{ width: 200, height: 420 }`), `SilhouetteShape` (`{ d: string; kind: 'fill' | 'stroke'; strokeWidth?: number }`), `SILHOUETTE: readonly SilhouetteShape[]`, `ZONES: Record<BodySide, Partial<Record<Muscle, string[]>>>`, `mirrorPath(d: string): string`, `musclesInView(side: BodySide): Muscle[]`.

The zone shapes are hand-drawn on a 200 by 420 canvas: each paired zone is authored as the left-side path and mirrored automatically for the right. Front view: shoulders, chest, biceps, forearms, core, inner thighs (adductors), quads, calves. Back view: shoulders, upper back, triceps, forearms, glutes, hamstrings, calves. Together they cover all 12 muscles. The art was rendered to an image and inspected before this plan was written; it is a simple mannequin, and it is data in one file, so it can change without touching logic. `mirrorPath` supports only absolute `M`, `L`, `Q`, `C` and `Z` commands, and a test enforces that.

- [ ] **Step 1: Write the failing test**

Create `app/body/zones.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { MUSCLES } from '../../engine';
import { SILHOUETTE, VIEWBOX, ZONES, mirrorPath, musclesInView, type BodySide } from './zones';

const SIDES: BodySide[] = ['front', 'back'];

describe('mirrorPath', () => {
  it('mirrors x across the centre line and keeps y', () => {
    expect(mirrorPath('M 10 20 L 30 40 Z')).toBe('M 190 20 L 170 40 Z');
  });

  it('handles curves and decimals, and mirroring twice gives the original', () => {
    const d = 'M 44 78.5 Q 44 64 58 64 Q 72 66 74 82 Z';
    expect(mirrorPath(d)).toBe('M 156 78.5 Q 156 64 142 64 Q 128 66 126 82 Z');
    expect(mirrorPath(mirrorPath(d))).toBe(d);
  });
});

describe('zones', () => {
  it('draws every one of the 12 muscles in at least one view', () => {
    const drawn = new Set(SIDES.flatMap((s) => musclesInView(s)));
    for (const m of MUSCLES) expect(drawn.has(m), m).toBe(true);
    expect(drawn.size).toBe(12);
  });

  it('has non-empty front and back views and a non-empty silhouette', () => {
    for (const s of SIDES) expect(musclesInView(s).length).toBeGreaterThan(0);
    expect(SILHOUETTE.length).toBeGreaterThan(0);
  });

  it('uses only absolute M, L, Q, C and Z commands, starting with M and closed with Z', () => {
    for (const s of SIDES) {
      for (const [muscle, paths] of Object.entries(ZONES[s])) {
        for (const d of paths ?? []) {
          expect(d, `${s}/${muscle}`).toMatch(/^M [MLQCZ\d\s.-]+ Z$/);
        }
      }
    }
  });

  it('keeps every coordinate inside the canvas', () => {
    for (const s of SIDES) {
      for (const [muscle, paths] of Object.entries(ZONES[s])) {
        for (const d of paths ?? []) {
          const nums = (d.match(/-?\d+(?:\.\d+)?/g) ?? []).map(Number);
          nums.forEach((n, i) => {
            const max = i % 2 === 0 ? VIEWBOX.width : VIEWBOX.height;
            expect(n, `${s}/${muscle}`).toBeGreaterThanOrEqual(0);
            expect(n, `${s}/${muscle}`).toBeLessThanOrEqual(max);
          });
        }
      }
    }
  });

  it('gives paired zones a left shape and a distinct mirrored right shape', () => {
    for (const s of SIDES) {
      for (const [muscle, paths] of Object.entries(ZONES[s])) {
        if (muscle === 'core' || muscle === 'upperBack') {
          expect(paths, `${s}/${muscle}`).toHaveLength(1);
        } else {
          expect(paths, `${s}/${muscle}`).toHaveLength(2);
          expect(mirrorPath(paths![0]), `${s}/${muscle}`).toBe(paths![1]);
        }
      }
    }
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run app/body/zones.test.ts`
Expected: FAIL, with an error that `./zones` cannot be resolved.

- [ ] **Step 3: Write the implementation**

Create `app/body/zones.ts`:

```ts
import type { Muscle } from '../../engine';

export type BodySide = 'front' | 'back';

export const VIEWBOX = { width: 200, height: 420 } as const;

/**
 * Mirror an absolute-coordinate path across the vertical centre line (x -> 200 - x).
 * Only M, L, Q, C and Z with absolute coordinates are supported; the zones test enforces that.
 */
export function mirrorPath(d: string): string {
  const tokens = d.match(/[A-Za-z]|-?\d+(?:\.\d+)?/g) ?? [];
  const out: string[] = [];
  let isX = true;
  for (const t of tokens) {
    if (/[A-Za-z]/.test(t)) {
      out.push(t);
      isX = true;
    } else {
      out.push(isX ? String(VIEWBOX.width - Number(t)) : t);
      isX = !isX;
    }
  }
  return out.join(' ');
}

/** A left-side shape plus its mirror image. */
const pair = (leftPath: string): string[] => [leftPath, mirrorPath(leftPath)];

export interface SilhouetteShape {
  d: string;
  kind: 'fill' | 'stroke';
  strokeWidth?: number;
}

// Neutral body outline, drawn under the zones. Not interactive.
export const SILHOUETTE: readonly SilhouetteShape[] = [
  { kind: 'fill', d: 'M 80 32 A 20 20 0 1 1 120 32 A 20 20 0 1 1 80 32 Z' },
  { kind: 'fill', d: 'M 90 50 L 110 50 L 110 66 L 90 66 Z' },
  { kind: 'fill', d: 'M 62 66 Q 100 56 138 66 L 134 178 Q 100 194 66 178 Z' },
  { kind: 'stroke', strokeWidth: 20, d: 'M 52 80 L 44 140 L 40 200' },
  { kind: 'stroke', strokeWidth: 20, d: 'M 148 80 L 156 140 L 160 200' },
  { kind: 'stroke', strokeWidth: 34, d: 'M 82 192 L 78 290 L 76 388' },
  { kind: 'stroke', strokeWidth: 34, d: 'M 118 192 L 122 290 L 124 388' },
];

// Zone shapes, hand-drawn on a 200x420 canvas. Each muscle can appear in either view.
const SHOULDER = 'M 44 78 Q 44 64 58 64 Q 72 66 74 82 Q 68 94 52 96 Q 44 90 44 78 Z';
const FOREARM = 'M 36 140 Q 46 136 56 140 L 50 198 Q 42 204 32 198 Q 32 166 36 140 Z';
const CALF = 'M 66 302 Q 82 296 90 306 Q 88 344 84 376 Q 74 382 66 374 Q 60 338 66 302 Z';

export const ZONES: Record<BodySide, Partial<Record<Muscle, string[]>>> = {
  front: {
    shoulders: pair(SHOULDER),
    chest: pair('M 76 78 Q 98 72 99 80 L 99 108 Q 84 118 72 106 Q 68 92 76 78 Z'),
    biceps: pair('M 42 98 Q 52 96 58 100 L 56 132 Q 46 136 40 132 Q 38 114 42 98 Z'),
    forearms: pair(FOREARM),
    core: ['M 76 116 Q 100 124 124 116 L 122 170 Q 100 180 78 170 Z'],
    adductors: pair('M 92 198 L 99 198 L 99 252 Q 94 264 88 254 Q 86 224 92 198 Z'),
    quads: pair('M 66 192 Q 82 186 90 198 Q 86 232 86 264 Q 80 286 68 288 Q 60 242 66 192 Z'),
    calves: pair(CALF),
  },
  back: {
    shoulders: pair(SHOULDER),
    upperBack: ['M 74 68 Q 100 60 126 68 L 132 104 Q 124 134 100 138 Q 76 134 68 104 Z'],
    triceps: pair('M 42 98 Q 52 96 58 100 L 56 132 Q 46 136 40 132 Q 38 114 42 98 Z'),
    forearms: pair(FOREARM),
    glutes: pair('M 68 178 Q 90 172 99 182 L 99 216 Q 82 228 70 210 Q 62 194 68 178 Z'),
    hamstrings: pair('M 66 222 Q 84 218 92 228 L 90 282 Q 78 294 68 288 Q 60 252 66 222 Z'),
    calves: pair(CALF),
  },
};

/** The muscles drawn in a view, in a stable order. */
export function musclesInView(side: BodySide): Muscle[] {
  return Object.keys(ZONES[side]) as Muscle[];
}
```

- [ ] **Step 4: Run the tests and typecheck to verify they pass**

Run: `npm test && npm run typecheck`
Expected: 12 test files, 74 tests pass (7 new zone tests); typecheck prints no errors.

- [ ] **Step 5: Commit**

```bash
git add app
git commit -m "$(cat <<'EOF'
Add body silhouette and per-muscle zone paths

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 3: Components, screen and app entry

**Files:**
- Modify: `package.json`, `package-lock.json` (via `expo install`), `App.tsx`, `docs/superpowers/specs/2026-09-19-body-map-scrubber-design.md`
- Create: `app/components/BodyMap.tsx`, `app/components/DayScrubber.tsx`, `app/components/MuscleSheet.tsx`, `app/BodyMapScreen.tsx`
- Delete: `app/HelloScreen.tsx`

**Interfaces:**
- Consumes: everything from Tasks 1 and 2; `loadReplay` from `data/index.ts`; `computeForecast`, `defaultSensitivity`, `Muscle`, `DayForecast`, `MuscleState` from `engine/index.ts`.
- Produces: the running app. `BodyMapScreen` (default export) is what `App.tsx` renders.

The components are verified by typecheck, the web export, and (by the controller, in Step 7) a real browser. Vitest does not cover them because they need React Native. Two behaviors were found only by driving the screen in a browser and are already in the code below: the scrubber track sets `userSelect: 'none'` (otherwise a mouse drag on web starts a text selection, which cancels the pan), and its cells set `pointerEvents="none"` so `locationX` is relative to the track. The sheet has no backdrop (deviation from the spec, recorded in Step 6): it closes with its Close button or by tapping the selected zone again, and it follows the scrubber.

- [ ] **Step 1: Install `react-native-svg`**

Run: `npx expo install react-native-svg`
Expected: it finishes and `package.json` lists `"react-native-svg"` (the SDK 57 build was `15.15.4`). `npm audit` warnings are fine.

- [ ] **Step 2: Write the components**

Create `app/components/BodyMap.tsx`:

```tsx
import Svg, { Path } from 'react-native-svg';
import type { DayForecast, Muscle } from '../../engine';
import { zoneA11yLabel } from '../copy';
import { bandColor } from '../body/colors';
import { BodySide, SILHOUETTE, VIEWBOX, ZONES, musclesInView } from '../body/zones';

const BODY_FILL = '#EEF1F2';
const OUTLINE = '#FFFFFF';
const SELECTED_OUTLINE = '#0B2F2A';

interface Props {
  side: BodySide;
  forecast: DayForecast;
  selected: Muscle | null;
  onSelect: (muscle: Muscle) => void;
  width: number;
}

export default function BodyMap({ side, forecast, selected, onSelect, width }: Props) {
  // Draw the selected zone last so its outline sits on top of its neighbours.
  const muscles = musclesInView(side).sort((a, b) => Number(a === selected) - Number(b === selected));
  return (
    <Svg
      width={width}
      height={(width * VIEWBOX.height) / VIEWBOX.width}
      viewBox={`0 0 ${VIEWBOX.width} ${VIEWBOX.height}`}
    >
      {SILHOUETTE.map((s, i) =>
        s.kind === 'fill' ? (
          <Path key={`body-${i}`} d={s.d} fill={BODY_FILL} />
        ) : (
          <Path
            key={`body-${i}`}
            d={s.d}
            fill="none"
            stroke={BODY_FILL}
            strokeWidth={s.strokeWidth}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        ),
      )}
      {muscles.flatMap((muscle) =>
        (ZONES[side][muscle] ?? []).map((d, i) => (
          <Path
            key={`${muscle}-${i}`}
            d={d}
            fill={bandColor(forecast[muscle].band)}
            stroke={selected === muscle ? SELECTED_OUTLINE : OUTLINE}
            strokeWidth={selected === muscle ? 2.5 : 1}
            onPress={() => onSelect(muscle)}
            accessibilityLabel={zoneA11yLabel(muscle, forecast[muscle].band)}
          />
        )),
      )}
    </Svg>
  );
}
```

Create `app/components/DayScrubber.tsx`:

```tsx
import { useMemo, useRef } from 'react';
import { LayoutChangeEvent, PanResponder, StyleSheet, Text, View } from 'react-native';
import { FORECAST_DAYS } from '../../engine/constants';
import { dayIndexFromX, dayLabel, weekdayLabel } from '../scrubber';

interface Props {
  asOf: Date;
  day: number;
  onChange: (day: number) => void;
}

/** Eight day segments. Tap one, or drag across the track. */
export default function DayScrubber({ asOf, day, onChange }: Props) {
  const widthRef = useRef(0);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  const pan = useMemo(() => {
    const pick = (x: number) => onChangeRef.current(dayIndexFromX(x, widthRef.current));
    return PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (e) => pick(e.nativeEvent.locationX),
      onPanResponderMove: (e) => pick(e.nativeEvent.locationX),
    });
  }, []);

  const onLayout = (e: LayoutChangeEvent) => {
    widthRef.current = e.nativeEvent.layout.width;
  };

  return (
    <View
      style={styles.track}
      onLayout={onLayout}
      accessibilityRole="adjustable"
      accessibilityLabel="Forecast day"
      accessibilityValue={{ text: dayLabel(day) }}
      {...pan.panHandlers}
    >
      {Array.from({ length: FORECAST_DAYS }, (_, d) => (
        // pointerEvents none: touches land on the track, so locationX is relative to it.
        <View key={d} pointerEvents="none" style={[styles.cell, d === day && styles.cellSelected]}>
          <Text style={[styles.label, d === day && styles.labelSelected]}>{dayLabel(d)}</Text>
          <Text style={[styles.weekday, d === day && styles.labelSelected]}>
            {weekdayLabel(asOf, d)}
          </Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    flexDirection: 'row',
    borderRadius: 10,
    backgroundColor: '#EEF1F2',
    overflow: 'hidden',
    // On web a drag would otherwise start a text selection, which cancels the pan.
    userSelect: 'none',
  },
  cell: { flex: 1, alignItems: 'center', paddingVertical: 8 },
  cellSelected: { backgroundColor: '#1E7A6C' },
  label: { fontSize: 13, fontWeight: '600', color: '#26312F' },
  weekday: { fontSize: 11, color: '#5C6866' },
  labelSelected: { color: '#FFFFFF' },
});
```

Create `app/components/MuscleSheet.tsx`:

```tsx
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { Muscle, MuscleState } from '../../engine';
import { BAND_LABELS, MUSCLE_LABELS, bandPhrase, reasonsFor } from '../copy';
import { bandColor } from '../body/colors';

interface Props {
  muscle: Muscle;
  state: MuscleState;
  /** e.g. "Now" or "+2d (Mon)". */
  dayText: string;
  onClose: () => void;
}

/** Explains one muscle's prediction. Follows the scrubber, so dragging shows how it fades. */
export default function MuscleSheet({ muscle, state, dayText, onClose }: Props) {
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
        <Pressable onPress={onClose} accessibilityRole="button" accessibilityLabel="Close details">
          <Text style={styles.close}>Close</Text>
        </Pressable>
      </View>
      {reasonsFor(state).map((reason) => (
        <Text key={reason} style={styles.reason}>
          {`• ${reason}`}
        </Text>
      ))}
      <Text style={styles.band}>{`Band: ${BAND_LABELS[state.band]}`}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  sheet: {
    position: 'absolute',
    left: 12,
    right: 12,
    bottom: 12,
    padding: 16,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#D5DDDB',
    gap: 6,
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
  reason: { fontSize: 14, color: '#26312F' },
  band: { fontSize: 12, color: '#5C6866', marginTop: 2 },
});
```

- [ ] **Step 3: Write the screen and the app entry**

Create `app/BodyMapScreen.tsx`:

```tsx
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { loadReplay } from '../data';
import { computeForecast, defaultSensitivity, type Muscle } from '../engine';
import { DEMO_AS_OF } from './config';
import { BAND_ORDER, bandColor } from './body/colors';
import type { BodySide } from './body/zones';
import BodyMap from './components/BodyMap';
import DayScrubber from './components/DayScrubber';
import MuscleSheet from './components/MuscleSheet';
import { BAND_LABELS, DISCLAIMER, SYNTHETIC_BANNER, needsTagNote } from './copy';
import { dayLabel, weekdayLabel } from './scrubber';

const SIDES: readonly BodySide[] = ['front', 'back'];

export default function BodyMapScreen() {
  const { width: screenWidth } = useWindowDimensions();
  const replay = useMemo(() => loadReplay(), []);
  const forecast = useMemo(
    () => computeForecast(replay.workouts, DEMO_AS_OF, defaultSensitivity()),
    [replay],
  );

  const [side, setSide] = useState<BodySide>('front');
  const [day, setDay] = useState(0);
  const [selected, setSelected] = useState<Muscle | null>(null);

  const mapWidth = Math.min(screenWidth - 48, 260);
  const dayForecast = forecast.byDay[day];
  const dayText = `${dayLabel(day)} (${weekdayLabel(DEMO_AS_OF, day)})`;

  const select = (muscle: Muscle) => setSelected((cur) => (cur === muscle ? null : muscle));

  return (
    <View style={styles.root}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>Sore Spot</Text>
        {replay.synthetic && <Text style={styles.banner}>{SYNTHETIC_BANNER}</Text>}
        <Text style={styles.asOf}>
          {`Forecast from ${DEMO_AS_OF.toISOString().slice(0, 16).replace('T', ' ')} UTC`}
        </Text>

        <View style={styles.toggle}>
          {SIDES.map((s) => (
            <Pressable
              key={s}
              onPress={() => setSide(s)}
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

        {forecast.needsTag.length > 0 && (
          <Text style={styles.note}>{needsTagNote(forecast.needsTag.length)}</Text>
        )}
        <Text style={styles.note}>{DISCLAIMER}</Text>
        {/* Room so the sheet never covers the last lines. */}
        <View style={styles.spacer} />
      </ScrollView>

      {selected && (
        <MuscleSheet
          muscle={selected}
          state={dayForecast[selected]}
          dayText={dayText}
          onClose={() => setSelected(null)}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#FFFFFF' },
  content: { padding: 16, paddingTop: 56, gap: 12 },
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
  spacer: { height: 150 },
});
```

Replace `App.tsx` with:

```tsx
import { StatusBar } from 'expo-status-bar';
import BodyMapScreen from './app/BodyMapScreen';

export default function App() {
  return (
    <>
      <BodyMapScreen />
      <StatusBar style="auto" />
    </>
  );
}
```

- [ ] **Step 4: Remove the superseded hello screen**

Run: `git rm app/HelloScreen.tsx`
Expected: `rm 'app/HelloScreen.tsx'`. Nothing else imports it after Step 3.

- [ ] **Step 5: Typecheck, test and build the web bundle**

Run:
```bash
npm run typecheck
npm test
npx expo export --platform web
rm -rf dist
```
Expected: typecheck prints no errors; 12 test files, 74 tests pass; the export ends with `Exported: dist` (about 251 modules).

- [ ] **Step 6: Record the plan-time changes in the spec**

Append this section to the end of `docs/superpowers/specs/2026-09-19-body-map-scrubber-design.md`:

```markdown

## Amendments (2026-09-19, found while building)

These change the spec above; where they conflict, this section wins.

- **Sheet:** no backdrop. It closes with its Close button or by tapping the selected zone again, and it follows the scrubber, so dragging with the sheet open shows how that muscle fades. This keeps the scrubber usable while the sheet is open.
- **Layout order:** title, synthetic banner, forecast time, Front/Back toggle, scrubber, map, legend, notes. The sheet overlays the bottom of the screen.
- **Scrubber on web:** the track sets `userSelect: 'none'`, because otherwise a mouse drag starts a text selection and react-native-web cancels the pan. Cells use `pointerEvents="none"` so `locationX` is relative to the track.
- **Extra pure helpers:** `mirrorPath` builds each right-side zone from its left-side path; `musclesInView` lists a view's zones; `BAND_ORDER` orders the legend.
- **Tests:** 26 new (copy 8, scrubber 7, colors 4, zones 7). The suite is 74 tests in 12 files.
```

- [ ] **Step 7: Commit, then hand the browser and phone check to the controller**

```bash
git add -A
git commit -m "$(cat <<'EOF'
Add body map screen with day scrubber and muscle sheet

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

Expected: the commit contains `App.tsx`, `package.json`, `package-lock.json`, the three components, the screen, the deleted hello screen and the spec. **Stop here.** The controller then drives the web build in a browser and the user confirms on the iPhone (definition of done in the spec). Do not start a dev server.

---

## Self-Review

**Spec coverage:**
- Screen, data flow (`loadReplay` -> `computeForecast` once, `DEMO_AS_OF`), Front/Back, recoloring by day, calves on both views: Tasks 2 and 3.
- Scrubber with 8 stops, Now/+Nd and UTC weekday labels, tap and drag: Tasks 1 and 3.
- Sheet with the three driver texts, the low-band text, close behavior (amended): Tasks 1 and 3.
- Honest labeling (banner, disclaimer, band names only, banned-words test, needsTag note): Tasks 1 and 3.
- Teal ramp, legend, accessibility labels, selection outline, color not the only signal: Tasks 1 and 3.
- Structure, `react-native-svg` via `expo install`, HelloScreen deleted, Vitest scope: Tasks 1 to 3.
- The four spec tests (zones, colors, scrubber, copy): Tasks 1 and 2. The scratch art render check was done before writing this plan.
- Definition of done (legs high at Now, adductors moderate at +1d, upper body low, fade by +7d, quads sheet with novel and eccentric): checked against the engine's real output and in the browser drive; the phone confirmation is the controller's.

**Type consistency:** all names (`DEMO_AS_OF`, `reasonsFor`, `dayIndexFromX`, `bandColor`, `ZONES`, `musclesInView`, `mirrorPath`, `SILHOUETTE`, `VIEWBOX`, `BodySide`) are defined once (Tasks 1-2) and used with the same signatures in Task 3, because every block comes from one verified copy.

**Known limits, stated plainly:** components have no unit tests (they need React Native); they are verified by typecheck, the web build, a scripted browser drive, and the user's phone. The body art is a simple mannequin. The band thresholds behind the colors are the engine's hand-tuned, uncalibrated constants, so no accuracy claim is made anywhere.
