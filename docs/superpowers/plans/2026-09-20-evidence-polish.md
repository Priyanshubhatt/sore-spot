# Evidence Tab, Accessibility Polish, README and Demo Runbook Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Show the research foundation and its limits in the app (a third Evidence tab with a chart drawn from the engine's own soreness curve), make selected and checked state reach screen readers, and add a README and a demo runbook whose quoted facts are tested against the engine.

**Architecture:** Two pure modules under `/app` (chart data and geometry; all Evidence copy) with tests, then the chart, the screen, a three-tab shell and `aria-*` state on the existing controls, then documentation with a test that pins the runbook to real engine output. No engine change.

**Tech Stack:** Expo SDK 57 (React Native 0.86, react-native-web, react-native-svg), TypeScript strict, Vitest. No new dependencies.

**Spec:** `docs/superpowers/specs/2026-09-20-evidence-polish-design.md`. Builds on `docs/superpowers/specs/2026-09-20-plan-screen-design.md`.

## Global Constraints

Every task's requirements include these, copied from the spec:

- **No engine or data change.** Nothing under `engine/` or `data/` is edited. The chart is drawn from the engine's `timecurve`; the novelty numbers in the text come from `engine/constants.ts`.
- **No invented numbers or citations.** Evidence text uses only the handoff's claims and cites only Herbert and colleagues (2011) and Dupuy and colleagues (2018). The footnote says the primary papers are still being checked.
- **Stretching is never presented as a soreness fix.** The existing app honesty scan applies to every new source file: banned words `diagnos`, `accura`, `clinical`, `prevent`, `cure`, `validated`, `treat`, `boost`, `oxygen`, `blood flow`, and "reduce soreness" / "relieve soreness" only in a line saying it has "not been shown".
- **The limits card is part of the Evidence screen** and cannot be removed without a test failing.
- **Selected and checked state uses `aria-selected` / `aria-checked`**, never `accessibilityState={{ selected|checked }}`: react-native-web 0.86 ignores that for those two states.
- The title, the "SYNTHETIC DATA" banner and the disclaimer footer stay in the shell outside the tabs; all three tabs stay mounted and the inactive ones are hidden.
- The README and runbook state "independent prototype" and "not affiliated with WHOOP", and are scanned for banned words (the runbook's say-this-not-that table is the one excluded section).
- No persistence, no new dependencies, no LLM. **Do not link a git remote or push.** The user does that.
- Commit messages end with the line `Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>`.

**Working directory for every command:** `C:\Users\priya\Desktop\Sore Spot` (Git Bash path `/c/Users/priya/Desktop/Sore Spot`). Baseline: branch `feat/evidence-polish` (from `feat/plan-screen`, tip 13162f6), 231 tests in 26 files passing, `npm run typecheck` clean. The SDD controller creates the branch.

**Line endings:** this repo's working tree has Windows line endings. For every file below marked "replace whole file", overwrite the entire file with the block shown using the file-writing tool. Do not use search-and-replace edits: multi-line matches silently fail on Windows line endings.

**How these files were produced:** every block was first run in a scratch copy: 258 Vitest tests passing, `tsc --strict` clean, `expo export --platform web` building, and a 210-check headless-browser drive at 390x844 and 375x667 passing. Twenty-two guards were mutation-checked (each broken on purpose and caught). Copy the blocks exactly.

## File Structure

```
app/evidence.ts, app/evidence.test.ts        curve series from the engine, peak, chart geometry (pure)   (Task 1)
app/evidenceCopy.ts                          every Evidence string                                        (Task 1)
app/components/TimeCurveChart.tsx            the chart                                                     (Task 2)
app/EvidenceScreen.tsx                       the screen                                                    (Task 2)
app/components/TabBar.tsx (whole file)       three tabs, tab roles                                         (Task 2)
app/planCopy.ts (whole file)                 + the Evidence tab label                                      (Task 2)
App.tsx (whole file)                         mounts the third tab                                          (Task 2)
app/components/ChipRow.tsx, HealthQuestions.tsx, CheckInPicker.tsx, app/BodyMapScreen.tsx (whole files)   aria roles and state   (Task 2)
app/honesty.test.ts (whole file)             + Evidence and aria wiring tests                              (Task 2)
README.md, docs/DEMO.md, app/docs.test.ts                                                                  (Task 3)
```

---

### Task 1: Evidence data, geometry and copy (pure)

**Files:**
- Create: `app/evidence.ts`, `app/evidenceCopy.ts`
- Test: `app/evidence.test.ts`

**Interfaces:**
- Consumes: `timecurve` from `engine/index.ts`; `FORECAST_DAYS`, `HOURS_PER_DAY`, `NOVELTY_CAP`, `NOVELTY_WINDOW_DAYS` from `engine/constants.ts`; `EVIDENCE_LABELS`, `EVIDENCE_NOTES`, `STRETCH_HONESTY` from `app/copy.ts`; the type `EvidenceTag` from `app/mobility/library.ts`.
- Produces (used by Task 2):
  - `app/evidence.ts`: `CurvePoint { hours, level }`, `CURVE_END_HOURS` (192), `CURVE_STEP_HOURS` (6), `curveSeries()`, `peakOf(series)`, `ChartBox { width, height, left, right, top, bottom }`, `xOf`, `yOf`, `linePath`, `areaPath`, `dayTicks()`.
  - `app/evidenceCopy.ts`: `EVIDENCE_HEADING`, `EVIDENCE_INTRO`, `CURVE_HEADING`, `CURVE_TEXT`, `CURVE_X_LABEL`, `CURVE_Y_LABEL`, `CURVE_PEAK_LABEL`, `CURVE_A11Y`, `TextCard { id, heading, body }`, `TEXT_CARDS`, `LABELS_HEADING`, `LABEL_LINES`, `LIMITS_HEADING`, `LIMITS`, `EVIDENCE_FOOTNOTE`.

- [ ] **Step 1: Confirm the branch and write the failing tests**

You are on branch `feat/evidence-polish` (created by the controller). Confirm with `git branch --show-current`.

Create `app/evidence.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { timecurve } from '../engine';
import { NOVELTY_CAP, NOVELTY_WINDOW_DAYS } from '../engine/constants';
import {
  CURVE_END_HOURS,
  CURVE_STEP_HOURS,
  areaPath,
  curveSeries,
  dayTicks,
  linePath,
  peakOf,
  xOf,
  yOf,
  type ChartBox,
} from './evidence';
import {
  EVIDENCE_FOOTNOTE,
  LABEL_LINES,
  LIMITS,
  TEXT_CARDS,
} from './evidenceCopy';

const box: ChartBox = { width: 300, height: 160, left: 30, right: 10, top: 10, bottom: 24 };

describe('the soreness curve series', () => {
  it('is the engine curve itself, sampled every 6 hours from 0 to 8 days', () => {
    const series = curveSeries();
    expect(series[0]).toEqual({ hours: 0, level: 0 });
    expect(series[series.length - 1].hours).toBe(CURVE_END_HOURS);
    expect(CURVE_END_HOURS).toBe(192);
    expect(series).toHaveLength(CURVE_END_HOURS / CURVE_STEP_HOURS + 1);
    for (const p of series) expect(p.level).toBe(timecurve(p.hours));
  });

  it('builds, peaks at 48 hours and is gone by the end', () => {
    const series = curveSeries();
    expect(peakOf(series)).toEqual({ hours: 48, level: 1 });
    expect(series[series.length - 1].level).toBe(0);
    expect(series.find((p) => p.hours === 24)!.level).toBeGreaterThan(series.find((p) => p.hours === 6)!.level);
  });

  it('shows 0 to 8 days on the axis', () => {
    expect(dayTicks()).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8]);
  });
});

describe('chart geometry', () => {
  it('maps hours and levels into the padded box, with level 1 at the top and 0 on the axis', () => {
    expect(xOf(0, box)).toBe(30);
    expect(xOf(CURVE_END_HOURS, box)).toBe(290);
    expect(yOf(0, box)).toBe(136);
    expect(yOf(1, box)).toBe(10);
  });

  it('draws one point per sample, starting on the axis', () => {
    const series = curveSeries();
    const path = linePath(series, box);
    expect(path.startsWith('M 30.0 136.0')).toBe(true);
    expect(path.match(/[ML]/g)).toHaveLength(series.length);
  });

  it('closes the fill down to the axis', () => {
    const path = areaPath(curveSeries(), box);
    expect(path.endsWith('Z')).toBe(true);
    expect(path).toContain('L 290.0 136.0 L 30.0 136.0 Z');
  });
});

describe('evidence copy', () => {
  it('has unique, non-empty text cards', () => {
    expect(new Set(TEXT_CARDS.map((c) => c.id)).size).toBe(TEXT_CARDS.length);
    for (const c of TEXT_CARDS) {
      expect(c.heading.trim().length, c.id).toBeGreaterThan(0);
      expect(c.body.trim().length, c.id).toBeGreaterThan(0);
    }
  });

  it('states the novelty numbers from the engine, so they cannot drift', () => {
    const novelty = TEXT_CARDS.find((c) => c.id === 'novelty')!;
    expect(novelty.body).toContain(`last ${NOVELTY_WINDOW_DAYS} days`);
    expect(novelty.body).toContain(`up to ${NOVELTY_CAP} times as much`);
  });

  it('never says stretching reduces or relieves soreness, and says it does not', () => {
    const stretching = TEXT_CARDS.find((c) => c.id === 'stretching')!;
    expect(stretching.heading).toMatch(/not a soreness fix/i);
    expect(stretching.body).toMatch(/no meaningful effect of stretching on soreness/);
    expect(stretching.body).toMatch(/hasn't been shown to reduce soreness/);
    for (const c of TEXT_CARDS) expect(c.body, c.id).not.toMatch(/(stretch\w*) (reduces|relieves|cures|eases) soreness/i);
  });

  it('labels comfort ideas from the same lines the move list uses', () => {
    expect(LABEL_LINES).toHaveLength(2);
    expect(LABEL_LINES[0]).toMatch(/^Range of motion: .*not been shown to reduce soreness/);
    expect(LABEL_LINES[1]).toMatch(/^Comfort: .*Evidence is mixed/);
  });

  it('lists every limit the pitch has to own up to', () => {
    const all = LIMITS.join(' ');
    expect(all).toMatch(/not been checked against real soreness logs/);
    expect(all).toMatch(/set by hand/);
    expect(all).toMatch(/SYNTHETIC DATA/);
    expect(all).toMatch(/recovery cutoffs/);
    expect(all).toMatch(/trainer or physical therapist/);
    expect(all).toMatch(/not affiliated with, endorsed by, or sponsored by WHOOP/);
    expect(all).toMatch(/not medical advice/);
  });

  it('carries a footnote saying the primary papers are still being checked', () => {
    expect(EVIDENCE_FOOTNOTE).toMatch(/primary papers are still being checked/);
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run app/evidence.test.ts`
Expected: FAIL. The file cannot resolve `./evidence` or `./evidenceCopy`. Paste the real output.

- [ ] **Step 3: Write the implementation**

Create `app/evidence.ts`:

```ts
import { timecurve } from '../engine';
import { FORECAST_DAYS, HOURS_PER_DAY } from '../engine/constants';

export interface CurvePoint {
  hours: number;
  level: number;
}

/** The curve is drawn over the same span the forecast covers. */
export const CURVE_END_HOURS = FORECAST_DAYS * HOURS_PER_DAY;
export const CURVE_STEP_HOURS = 6;

/** The engine's own soreness curve, sampled: this is what the model uses, not a redrawn picture of it. */
export function curveSeries(): CurvePoint[] {
  const points: CurvePoint[] = [];
  for (let hours = 0; hours <= CURVE_END_HOURS; hours += CURVE_STEP_HOURS) {
    points.push({ hours, level: timecurve(hours) });
  }
  return points;
}

/** The first point with the highest level. */
export function peakOf(series: CurvePoint[]): CurvePoint {
  return series.reduce((best, p) => (p.level > best.level ? p : best), series[0]);
}

export interface ChartBox {
  width: number;
  height: number;
  /** Room for the axis labels. */
  left: number;
  right: number;
  top: number;
  bottom: number;
}

export function xOf(hours: number, box: ChartBox): number {
  return box.left + (hours / CURVE_END_HOURS) * (box.width - box.left - box.right);
}

export function yOf(level: number, box: ChartBox): number {
  return box.height - box.bottom - level * (box.height - box.top - box.bottom);
}

/** An SVG path through the series ("M x y L x y ..."), rounded to one decimal. */
export function linePath(series: CurvePoint[], box: ChartBox): string {
  return series
    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${xOf(p.hours, box).toFixed(1)} ${yOf(p.level, box).toFixed(1)}`)
    .join(' ');
}

/** The same line closed down to the axis, for a soft fill under the curve. */
export function areaPath(series: CurvePoint[], box: ChartBox): string {
  const last = series[series.length - 1];
  const base = yOf(0, box).toFixed(1);
  return `${linePath(series, box)} L ${xOf(last.hours, box).toFixed(1)} ${base} L ${xOf(series[0].hours, box).toFixed(1)} ${base} Z`;
}

/** Whole days shown on the horizontal axis: 0 to 8. */
export function dayTicks(): number[] {
  return Array.from({ length: FORECAST_DAYS + 1 }, (_, d) => d);
}
```

Create `app/evidenceCopy.ts`:

```ts
import { NOVELTY_CAP, NOVELTY_WINDOW_DAYS } from '../engine/constants';
import { EVIDENCE_LABELS, EVIDENCE_NOTES, STRETCH_HONESTY } from './copy';
import type { EvidenceTag } from './mobility/library';

export const EVIDENCE_HEADING = 'What this is built on';
export const EVIDENCE_INTRO =
  'Sore Spot predicts soreness from published patterns, then uses your plan to ease into new work. Here is what each piece rests on, and where it stops.';

export const CURVE_HEADING = 'Soreness has a timeline';
export const CURVE_TEXT =
  'Published reviews describe soreness building within about a day, peaking around 1 to 3 days after a session and fading by about a week. The chart is the curve this app uses. It is a hand-tuned approximation of that shape, not a measurement.';
export const CURVE_X_LABEL = 'Days after a session';
export const CURVE_Y_LABEL = 'Predicted soreness';
export const CURVE_PEAK_LABEL = 'peak';
export const CURVE_A11Y =
  'Chart of predicted soreness after a session: it rises over the first day, peaks around two days, and fades to nothing by day eight.';

export interface TextCard {
  id: string;
  heading: string;
  body: string;
}

/** The cards that are only text, in reading order. */
export const TEXT_CARDS: TextCard[] = [
  {
    id: 'novelty',
    heading: 'New work hurts more',
    body: `A second round of the same unfamiliar exercise causes much less soreness (the repeated bout effect). So the model compares each session with your last ${NOVELTY_WINDOW_DAYS} days and counts new work for more, up to ${NOVELTY_CAP} times as much. The plan also starts movements that are new to you a set lighter.`,
  },
  {
    id: 'eccentric',
    heading: 'Lowering and braking work',
    body: 'Lengthening work, such as running downhill, slowing down or lowering a weight, causes more soreness than lifting or pushing. The model weights it higher, and the plan keeps heavy lengthening work off muscles predicted to be sore.',
  },
  {
    id: 'stretching',
    heading: 'Stretching is not a soreness fix',
    body: `A review of stretching before and after exercise (Herbert and colleagues, 2011) and a wider review of recovery methods (Dupuy and colleagues, 2018) found no meaningful effect of stretching on soreness. ${STRETCH_HONESTY} So stretches here are labelled as range-of-motion work, and foam rolling and light movement are offered as comfort ideas, with mixed evidence.`,
  },
  {
    id: 'easing-in',
    heading: 'Easing in is the main lever',
    body: 'In the research, building up gradually and easing into new exercise lessened soreness, and no recovery method reliably removed it once it set in. That is why the plan, not a stretch, is the main tool in this app.',
  },
];

export const LABELS_HEADING = 'How comfort ideas are labelled';
const LABEL_TAGS: readonly EvidenceTag[] = ['ROM', 'COMFORT'];
export const LABEL_LINES: string[] = LABEL_TAGS.map((tag) => `${EVIDENCE_LABELS[tag]}: ${EVIDENCE_NOTES[tag]}`);

export const LIMITS_HEADING = 'Where this stops';
export const LIMITS: string[] = [
  'The predictions have not been checked against real soreness logs. This app makes no claim about how often it is right.',
  'The numbers behind the model (weights, thresholds and the curve above) are set by hand, not fitted to data.',
  'Anything marked SYNTHETIC DATA is made up for the demo.',
  'The low, medium and high recovery cutoffs are set by hand and have not been checked against WHOOP\'s own zones.',
  'The exercise and comfort libraries are general guidance and still need review by a trainer or physical therapist.',
  'This is an independent prototype. It is not affiliated with, endorsed by, or sponsored by WHOOP.',
  'General wellness guidance, not medical advice. A red flag stops the plan and points to a clinician.',
];

/** Delete this line once the primary papers have been read and the summaries confirmed. */
export const EVIDENCE_FOOTNOTE =
  'Summarised from published reviews. The primary papers are still being checked.';
```

- [ ] **Step 4: Run the whole suite and typecheck**

Run: `npm test && npm run typecheck`
Expected: 27 test files, 243 tests pass (the 231 existing plus 12); typecheck prints no errors.

- [ ] **Step 5: Prove the guards can fail**

Break each line on purpose, run the file's tests, and restore from a backup:
```bash
cp app/evidence.ts /tmp/evidence.bak
sed -i 's/level: timecurve(hours)/level: hours \/ 192/' app/evidence.ts
npx vitest run app/evidence.test.ts
cp /tmp/evidence.bak app/evidence.ts
cp app/evidenceCopy.ts /tmp/evidenceCopy.bak
sed -i 's/\${STRETCH_HONESTY} So stretches/So stretches/' app/evidenceCopy.ts
npx vitest run app/evidence.test.ts
cp /tmp/evidenceCopy.bak app/evidenceCopy.ts
npx vitest run app/evidence.test.ts
```
Expected: the first run FAILS (the series is the engine curve; peaks at 48 hours); the second FAILS (the stretching card must carry the honesty line); the third passes. Confirm `git diff --stat` shows no change to either source file. Paste all three outputs.

- [ ] **Step 6: Commit**

```bash
git add app
git commit -m "$(cat <<'EOF'
Add the evidence curve data, chart geometry and copy as pure modules

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 2: Evidence tab, three-tab shell and accessibility state

**Files:**
- Create: `app/components/TimeCurveChart.tsx`, `app/EvidenceScreen.tsx`
- Replace (whole file): `app/components/TabBar.tsx`, `app/planCopy.ts`, `App.tsx`, `app/components/ChipRow.tsx`, `app/components/HealthQuestions.tsx`, `app/components/CheckInPicker.tsx`, `app/BodyMapScreen.tsx`, `app/honesty.test.ts`

**Interfaces:**
- Consumes: everything Task 1 produces; `react-native-svg` (`Svg`, `Path`, `Line`, `Circle`, `Text`) as already used by `app/components/BodyMap.tsx`; the C1b shell (`useSoreSpot`, `PlanScreen`, `BodyMapScreen`, `TabBar`).
- Produces: `TimeCurveChart({ width })`; `EvidenceScreen()`; `TabBar` now offers `'body' | 'plan' | 'evidence'` (`TABS`, `Tab`); `TAB_LABELS` gains `evidence: 'Evidence'`; selected and checked state on the tab bar, chips, Yes/No questions, "None of these apply", the Front/Back toggle and the check-in levels via `aria-selected` / `aria-checked`.

The four component files (`ChipRow`, `HealthQuestions`, `CheckInPicker`, `BodyMapScreen`) change only their roles and state props: single-choice groups get `accessibilityRole="radiogroup"` with a label, their options `accessibilityRole="radio"` and `aria-checked`; "None of these apply" becomes `accessibilityRole="checkbox"` with a label and `aria-checked`. Behavior does not change.

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
    expect(health).toMatch(/accessibilityLabel={RED_FLAG_QUESTIONS\[flag\]}/);
    expect(health).toMatch(/\$\{RED_FLAG_QUESTIONS\[flag\]\}/); // the visible text, not only the label
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

  it('derives the plan on every render, so a later tag or check-in can never leave a stale plan on screen', () => {
    const screen = text('PlanScreen.tsx');
    expect(screen).toMatch(/const result = built\s*\?/);
    expect(screen).not.toMatch(/useState<[^>]*PlanResult/);
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
    expect(shell).toMatch(/<EvidenceScreen \/>/);
    expect(shell).toMatch(/tab !== 'evidence' && styles\.hidden/);
    expect(shell).toMatch(/hidden: { display: 'none' }/);
    expect(shell).not.toMatch(BANNED);
    expect(shell).not.toMatch(/buildPlan/);
  });
});

describe('the evidence tab and the accessibility state stay wired', () => {
  it('draws the engine curve, not a hand-drawn one', () => {
    expect(text('components/TimeCurveChart.tsx')).toMatch(/curveSeries\(\)/);
    expect(text('evidence.ts')).toMatch(/timecurve\(hours\)/);
  });

  it('shows every text card, the label lines, the limits card and the footnote on the evidence screen', () => {
    const screen = text('EvidenceScreen.tsx');
    expect(screen).toMatch(/TEXT_CARDS\.map\(/);
    expect(screen).toMatch(/LABEL_LINES\.map\(/);
    expect(screen).toMatch(/{LIMITS_HEADING}/);
    expect(screen).toMatch(/LIMITS\.map\(/);
    expect(screen).toMatch(/{EVIDENCE_FOOTNOTE}/);
    expect(screen).toMatch(/<TimeCurveChart /);
  });

  it('gives every single-choice group and checkbox its role and its checked state', () => {
    const count = (rel: string, re: RegExp) => (text(rel).match(re) ?? []).length;
    for (const rel of ['components/ChipRow.tsx', 'components/CheckInPicker.tsx', 'BodyMapScreen.tsx']) {
      expect(count(rel, /accessibilityRole="radiogroup"/g), rel).toBe(1);
      expect(count(rel, /accessibilityRole="radio"/g), rel).toBe(1);
    }
    expect(text('components/CheckInPicker.tsx')).toMatch(/aria-checked={level === l}/);
    expect(text('BodyMapScreen.tsx')).toMatch(/aria-checked={side === s}/);
    const health = 'components/HealthQuestions.tsx';
    expect(count(health, /accessibilityRole="radiogroup"/g)).toBe(1);
    expect(count(health, /accessibilityRole="radio"/g)).toBe(1);
    expect(count(health, /accessibilityRole="checkbox"/g)).toBe(2); // the six flags and "None of these apply"
    expect(text(health)).toMatch(/aria-checked={on}/);
  });

  it('reports selected and checked with aria props, because react-native-web ignores accessibilityState for them', () => {
    for (const f of files) expect(f.text, f.rel).not.toMatch(/accessibilityState=\{\{[^}]*\b(selected|checked)\b/);
    expect(text('components/TabBar.tsx')).toMatch(/aria-selected={tab === t}/);
    expect(text('components/TabBar.tsx')).toMatch(/accessibilityRole="tab"/);
    expect(text('components/ChipRow.tsx')).toMatch(/aria-checked={on}/);
    expect(text('components/HealthQuestions.tsx')).toMatch(/aria-checked={none}/);
    expect(text('components/HealthQuestions.tsx')).toMatch(/aria-checked={value === answer}/);
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
Expected: FAIL. The new "evidence tab and the accessibility state stay wired" tests fail (no chart, no evidence screen, state still on `accessibilityState`), and the shell test fails on the missing `<EvidenceScreen />`. The older honesty tests still pass. Paste the real output.

- [ ] **Step 3: Write the implementation**

Create `app/components/TimeCurveChart.tsx`:

```tsx
import { Platform, StyleSheet, View } from 'react-native';
import Svg, { Circle, Line, Path, Text as SvgText } from 'react-native-svg';
import {
  areaPath,
  curveSeries,
  dayTicks,
  linePath,
  peakOf,
  xOf,
  yOf,
  type ChartBox,
} from '../evidence';
import { CURVE_A11Y, CURVE_PEAK_LABEL, CURVE_X_LABEL, CURVE_Y_LABEL } from '../evidenceCopy';

const LINE = '#1E7A6C';
const FILL = '#D7EBE7';
const AXIS = '#B7C4C1';
const TEXT = '#4B5856';
const HEIGHT = 182;
// SVG text does not inherit the app font on web, where it would fall back to a serif face.
const FONT = Platform.select({ web: 'system-ui, -apple-system, Segoe UI, Roboto, sans-serif', default: undefined });

interface Props {
  width: number;
}

/** The engine's soreness curve, drawn as it is used: rising over the first day, peaking, then fading. */
export default function TimeCurveChart({ width }: Props) {
  const box: ChartBox = { width, height: HEIGHT, left: 12, right: 12, top: 34, bottom: 40 };
  const series = curveSeries();
  const peak = peakOf(series);
  const baseline = yOf(0, box);
  return (
    <View accessible accessibilityRole="image" accessibilityLabel={CURVE_A11Y} style={styles.wrap}>
      <Svg width={width} height={HEIGHT}>
        <Path d={areaPath(series, box)} fill={FILL} />
        <Path d={linePath(series, box)} fill="none" stroke={LINE} strokeWidth={2.5} />
        <Line x1={box.left} y1={baseline} x2={width - box.right} y2={baseline} stroke={AXIS} strokeWidth={1} />
        {dayTicks().map((day) => (
          <SvgText key={day} x={xOf(day * 24, box)} y={baseline + 14} fontFamily={FONT} fontSize={11} fill={TEXT} textAnchor="middle">
            {String(day)}
          </SvgText>
        ))}
        <SvgText x={width / 2} y={HEIGHT - 6} fontFamily={FONT} fontSize={11} fill={TEXT} textAnchor="middle">
          {CURVE_X_LABEL}
        </SvgText>
        <Circle cx={xOf(peak.hours, box)} cy={yOf(peak.level, box)} r={4.5} fill={LINE} />
        <SvgText x={xOf(peak.hours, box) + 9} y={yOf(peak.level, box) + 4} fontFamily={FONT} fontSize={11} fill={TEXT}>
          {CURVE_PEAK_LABEL}
        </SvgText>
        <SvgText x={box.left} y={12} fontFamily={FONT} fontSize={11} fill={TEXT}>
          {CURVE_Y_LABEL}
        </SvgText>
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center' },
});
```

Create `app/EvidenceScreen.tsx`:

```tsx
import { ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import TimeCurveChart from './components/TimeCurveChart';
import {
  CURVE_HEADING,
  CURVE_TEXT,
  EVIDENCE_FOOTNOTE,
  EVIDENCE_HEADING,
  EVIDENCE_INTRO,
  LABELS_HEADING,
  LABEL_LINES,
  LIMITS,
  LIMITS_HEADING,
  TEXT_CARDS,
} from './evidenceCopy';

/** What the model rests on, and where it stops. The limits card is part of the screen, not an extra. */
export default function EvidenceScreen() {
  const { width } = useWindowDimensions();
  const chartWidth = Math.min(width - 32 - 24, 360);
  return (
    <ScrollView contentContainerStyle={styles.content}>
      <Text style={styles.heading}>{EVIDENCE_HEADING}</Text>
      <Text style={styles.intro}>{EVIDENCE_INTRO}</Text>

      <View style={styles.card}>
        <Text style={styles.cardHeading}>{CURVE_HEADING}</Text>
        <Text style={styles.body}>{CURVE_TEXT}</Text>
        <TimeCurveChart width={chartWidth} />
      </View>

      {TEXT_CARDS.map((card) => (
        <View key={card.id} style={styles.card}>
          <Text style={styles.cardHeading}>{card.heading}</Text>
          <Text style={styles.body}>{card.body}</Text>
        </View>
      ))}

      <View style={styles.card}>
        <Text style={styles.cardHeading}>{LABELS_HEADING}</Text>
        {LABEL_LINES.map((line) => (
          <Text key={line} style={styles.body}>{`• ${line}`}</Text>
        ))}
      </View>

      <View style={[styles.card, styles.limits]}>
        <Text style={styles.limitsHeading}>{LIMITS_HEADING}</Text>
        {LIMITS.map((limit) => (
          <Text key={limit} style={styles.limitText}>{`• ${limit}`}</Text>
        ))}
      </View>

      <Text style={styles.footnote}>{EVIDENCE_FOOTNOTE}</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, paddingTop: 8, gap: 12, paddingBottom: 32 },
  heading: { fontSize: 20, fontWeight: '700', color: '#16211F' },
  intro: { fontSize: 13, color: '#4B5856' },
  card: { gap: 8, padding: 12, borderRadius: 12, backgroundColor: '#F6F8F8', borderWidth: 1, borderColor: '#E3EAE8' },
  cardHeading: { fontSize: 16, fontWeight: '700', color: '#16211F' },
  body: { fontSize: 14, lineHeight: 20, color: '#26312F' },
  limits: { backgroundColor: '#FFF7ED', borderColor: '#F3D9B5' },
  limitsHeading: { fontSize: 16, fontWeight: '700', color: '#7A3E08' },
  limitText: { fontSize: 14, lineHeight: 20, color: '#5B3A12' },
  footnote: { fontSize: 12, color: '#5C6866' },
});
```

Replace `app/components/TabBar.tsx` with:

```tsx
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { TAB_LABELS } from '../planCopy';

export type Tab = keyof typeof TAB_LABELS;
export const TABS: readonly Tab[] = ['body', 'plan', 'evidence'];

interface Props {
  tab: Tab;
  onChange: (tab: Tab) => void;
}

export default function TabBar({ tab, onChange }: Props) {
  return (
    <View accessibilityRole="tablist" style={styles.bar}>
      {TABS.map((t) => (
        <Pressable
          key={t}
          onPress={() => onChange(t)}
          accessibilityRole="tab"
          aria-selected={tab === t}
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

Replace `app/planCopy.ts` with:

```ts
export const TAB_LABELS = { body: 'Body map', plan: 'Plan', evidence: 'Evidence' } as const;

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

Replace `App.tsx` with:

```tsx
import { StatusBar } from 'expo-status-bar';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import BodyMapScreen from './app/BodyMapScreen';
import EvidenceScreen from './app/EvidenceScreen';
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
      <View style={[styles.tab, tab !== 'evidence' && styles.hidden]}>
        <EvidenceScreen />
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

Replace `app/components/ChipRow.tsx` with:

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
      <View accessibilityRole="radiogroup" accessibilityLabel={label} style={styles.row}>
        {options.map((option) => {
          const on = option.value === value;
          return (
            <Pressable
              key={String(option.value)}
              onPress={() => onChange(option.value)}
              hitSlop={4}
              accessibilityRole="radio"
              accessibilityLabel={`${label}: ${option.label}`}
              aria-checked={on}
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

Replace `app/components/HealthQuestions.tsx` with:

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
      <View accessibilityRole="radiogroup" accessibilityLabel={question} style={styles.row}>
        {[true, false].map((answer) => (
          <Pressable
            key={String(answer)}
            onPress={() => onAnswer(answer)}
            hitSlop={4}
            accessibilityRole="radio"
            accessibilityLabel={`${question} ${answer ? YES : NO}`}
            aria-checked={value === answer}
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
              aria-checked={on}
              style={[styles.flag, on && styles.flagOn]}
            >
              <Text style={styles.flagText}>{`${on ? '☑' : '☐'}  ${RED_FLAG_QUESTIONS[flag]}`}</Text>
            </Pressable>
          );
        })}
        <Pressable
          onPress={() => onChange(answerNoRedFlags(screening))}
          hitSlop={4}
          accessibilityRole="checkbox"
          accessibilityLabel={NONE_OF_THESE}
          aria-checked={none}
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

Replace `app/components/CheckInPicker.tsx` with:

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
      <View accessibilityRole="radiogroup" accessibilityLabel={CHECKIN_PROMPT} style={styles.row}>
        {CHECKIN_LEVELS.map((l) => (
          <Pressable
            key={l}
            onPress={() => onChange(l)}
            hitSlop={4}
            accessibilityRole="radio"
            aria-checked={level === l}
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

        <View accessibilityRole="radiogroup" accessibilityLabel="Body view" style={styles.toggle}>
          {SIDES.map((s) => (
            <Pressable
              key={s}
              onPress={() => chooseSide(s)}
              accessibilityRole="radio"
              aria-checked={side === s}
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

- [ ] **Step 4: Run the whole suite, typecheck and the web export**

Run: `npm test && npm run typecheck && npx expo export --platform web --output-dir /tmp/c2-export`
Expected: 27 test files, 247 tests pass (the 243 after Task 1 plus 4 wiring tests); typecheck prints no errors; the export ends with `Exported: ...`. Then `rm -rf /tmp/c2-export` and confirm `git status --short` shows only the ten files of this task.

- [ ] **Step 5: Prove the wiring tests can fail**

Break each line on purpose, run `npx vitest run app/honesty.test.ts`, and restore from a backup:
```bash
cp app/components/TabBar.tsx /tmp/tabbar.bak
sed -i 's/aria-selected={tab === t}/accessibilityState={{ selected: tab === t }}/' app/components/TabBar.tsx
npx vitest run app/honesty.test.ts
cp /tmp/tabbar.bak app/components/TabBar.tsx
cp App.tsx /tmp/app.bak
sed -i "s/tab !== 'evidence' \&\& styles.hidden/false/" App.tsx
npx vitest run app/honesty.test.ts
cp /tmp/app.bak App.tsx
cp app/EvidenceScreen.tsx /tmp/evidencescreen.bak
sed -i 's/<Text style={styles.limitsHeading}>{LIMITS_HEADING}<\/Text>//' app/EvidenceScreen.tsx
npx vitest run app/honesty.test.ts
cp /tmp/evidencescreen.bak app/EvidenceScreen.tsx
npx vitest run app/honesty.test.ts
```
Expected: the first, second and third runs FAIL (the aria wiring test; the shell test; the evidence screen test); the fourth passes. Confirm `git diff --stat` shows no change to those three files. Paste all four outputs.

- [ ] **Step 6: Commit**

```bash
git add app App.tsx
git commit -m "$(cat <<'EOF'
Add the Evidence tab and report selected and checked state with aria props

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 3: README, demo runbook and their tests

**Files:**
- Create: `README.md`, `docs/DEMO.md`
- Test: `app/docs.test.ts`

**Interfaces:**
- Consumes: `syntheticReplay`, `DEMO_AS_OF`, `CHECKIN_LABELS`, `TAB_LABELS`, `buildForecastState`, `DEFAULT_CHOICE`, `computePlan` and the screening helpers, all unchanged.
- Produces: the two documents and a test tying the runbook's quoted facts to the engine's real output. No later task depends on them.

The runbook's "Say this, not that" table quotes banned claims on purpose (it tells the presenter what not to say), so `app/docs.test.ts` removes that one section before its banned-word scan.

- [ ] **Step 1: Write the failing tests**

Create `app/docs.test.ts`:

```ts
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { syntheticReplay } from '../data/replay.synthetic';
import { DEMO_AS_OF } from './config';
import { CHECKIN_LABELS } from './copy';
import { buildForecastState } from './forecastState';
import { DEFAULT_CHOICE, computePlan } from './planFlow';
import { TAB_LABELS } from './planCopy';
import { answerMedicalCondition, answerNoRedFlags, answerUnder18, initialScreening } from './screening';

const read = (rel: string) => readFileSync(join(__dirname, '..', rel), 'utf8').replace(/\r\n/g, '\n');
const readme = read('README.md');
const demo = read('docs/DEMO.md');

const BANNED = /diagnos|accura|clinical|prevent|cure|validated|treat|boost|oxygen|blood flow/i;
const SORENESS_CLAIM = /(reduce|relieve) soreness/i;
const NEGATED = /(not|n't) been shown/i;

// The "say this, not that" table quotes the banned claims on purpose, so it is the one part left out of the scan.
const DO_NOT_SAY = /## Say this, not that[\s\S]*?(?=\n## )/;
const demoScanned = demo.replace(DO_NOT_SAY, '');

describe('README', () => {
  it('says what it is and what it is not, on its first lines', () => {
    const top = readme.split('\n').slice(0, 5).join(' ');
    expect(top).toMatch(/independent prototype/);
    expect(top).toMatch(/not affiliated with, endorsed by, or sponsored by WHOOP/);
    expect(top).toMatch(/not medical advice/);
  });

  it('labels the demo data as synthetic and owns up to the limits', () => {
    expect(readme).toMatch(/SYNTHETIC DATA/);
    expect(readme).toMatch(/have not been checked against real soreness logs/);
    expect(readme).toMatch(/still need review by a trainer or physical therapist/);
    expect(readme).toMatch(/primary papers are still being checked/);
  });

  it('keeps real data and credentials out of the repository', () => {
    expect(readme).toMatch(/data\/replay\.json/);
    expect(readme).toMatch(/\.env/);
    expect(readme).toMatch(/never commit real health data or WHOOP credentials/i);
  });

  it('names the three tabs', () => {
    for (const label of Object.values(TAB_LABELS)) expect(readme, label).toContain(`**${label}**`);
  });
});

describe('demo runbook', () => {
  it('covers the fallback ladder and every tab', () => {
    for (const step of ['Primary', 'Fallback 1', 'Fallback 2', 'Always']) expect(demo, step).toContain(step);
    for (const label of Object.values(TAB_LABELS)) expect(demo, label).toContain(label);
  });

  it('tells the presenter to say it is synthetic and independent', () => {
    expect(demo).toMatch(/independent prototype on synthetic data/);
    expect(demo).toMatch(/not affiliated with WHOOP/);
  });

  it('quotes the check-in labels the app really shows', () => {
    for (const label of Object.values(CHECKIN_LABELS)) expect(demo, label).toContain(`**${label}**`);
  });

  it('matches what the engine really produces on the demo data', () => {
    expect(demo).toContain('Sat Sep 19 2026, 20:00 UTC');
    expect(DEMO_AS_OF.toISOString()).toBe('2026-09-19T20:00:00.000Z');

    const answered = answerMedicalCondition(answerUnder18(answerNoRedFlags(initialScreening()), false), false);
    const planFor = (tags: Record<string, 'upper' | 'lower'>) => {
      const s = buildForecastState(syntheticReplay.workouts, tags, {}, DEMO_AS_OF);
      const r = computePlan({ forecast: s.forecast, workouts: s.tagged, recovery: syntheticReplay.recovery ?? [], asOf: DEMO_AS_OF, screening: answered, choice: DEFAULT_CHOICE });
      if (r.kind !== 'plan') throw new Error('expected a plan');
      return { plan: r.plan, state: s };
    };

    // Now: glutes, quads, hamstrings and calves are High, and nothing else is.
    const now = planFor({}).state.forecast.byDay[0];
    const high = Object.entries(now).filter(([, m]) => m.band === 'high').map(([k]) => k).sort();
    expect(high).toEqual(['calves', 'glutes', 'hamstrings', 'quads']);
    expect(demo).toMatch(/glutes, quads, hamstrings and calves are \*\*High\*\*/);

    // Tagging Wednesday "Upper body": Sunday's upper day gets fewer sets, for the muscles the runbook names.
    const upper = planFor({ 'd-wed-strength': 'upper' }).plan;
    expect(upper.days.map((d) => d.title)).toEqual(['Upper body', 'Easy day', 'Rest day', 'Upper body', 'Lower body', 'Rest day', 'Rest day']);
    expect(upper.days[0].exercises[0].note).toBe('Fewer sets: chest, triceps and shoulders predicted sore.');
    expect(demo).toContain('fewer sets: chest, triceps and shoulders predicted sore');

    // Tagging it "Lower body" instead: Sunday goes back to "new for you".
    const lower = planFor({ 'd-wed-strength': 'lower' }).plan;
    expect(lower.days[0].exercises[0].note).toBe('New for you: start light.');
    expect(demo).toContain('new for you, start light');

    // Thursday: back squat at fewer sets, a hip thrust and a reverse lunge, each easing off the sore muscles.
    const thursday = upper.days[4].exercises.map((e) => e.name);
    expect(thursday).toEqual(expect.arrayContaining(['Barbell back squat', 'Barbell hip thrust', 'Reverse lunge']));
    expect(demo).toMatch(/back squat at fewer sets, a hip thrust and a reverse lunge/);
  });
});

describe('honesty scan over the docs', () => {
  it('has the do-not-say table (so the scan below is skipping something real)', () => {
    expect(DO_NOT_SAY.test(demo)).toBe(true);
  });

  it('uses no banned word in the README or the runbook, outside the do-not-say table', () => {
    expect(readme).not.toMatch(BANNED);
    expect(demoScanned).not.toMatch(BANNED);
  });

  it('only mentions reducing or relieving soreness in a line that says it has not been shown', () => {
    for (const [name, doc] of [['README.md', readme], ['docs/DEMO.md', demoScanned]] as const) {
      for (const line of doc.split('\n')) {
        if (SORENESS_CLAIM.test(line)) expect(line, `${name}: ${line.trim()}`).toMatch(NEGATED);
      }
    }
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run app/docs.test.ts`
Expected: FAIL. The file cannot read `README.md` and `docs/DEMO.md` (no such file). Paste the real output.

- [ ] **Step 3: Write the documents**

Create `README.md`:

````md
# Sore Spot

Sore Spot is an **independent prototype**. It is **not affiliated with, endorsed by, or sponsored by WHOOP, Inc.** It is a general wellness tool and **not medical advice**.

It predicts which muscles are likely to be sore after your workouts, shows that on a body map, offers honest comfort and mobility ideas, and builds a safe, explained training week around your predicted soreness and recovery.

> The demo runs on **synthetic** workouts and recoveries (the app shows a `SYNTHETIC DATA` banner). Nothing in the repository is anyone's real health data.

## What you can do in the app

| Tab | What it does |
|---|---|
| **Body map** | Front and back body with 12 muscle zones, coloured by predicted soreness (low, moderate, high). A time scrubber moves from now to a week ahead. Tap a zone to see why it is predicted sore, check in how it feels (none, mild, moderate, severe), and get comfort ideas labelled by how strong the evidence is. Untagged strength sessions ask which muscles they worked. |
| **Plan** | Health questions first (every answer starts empty), then a goal, days per week and equipment. Builds a 7-day plan with exercises, sets and reps, and a plain-language reason for every choice, or explains why there is no plan. |
| **Evidence** | What the model rests on and where it stops: the soreness time curve (drawn from the model's own curve), the novelty effect, lengthening work, the stretching finding, and a plain list of limits. |

## How it works

**The model proposes, the rules decide.** There is no LLM and no backend. Everything is deterministic TypeScript with tests.

- **Soreness prediction** (`engine/`): for each muscle, load × novelty (compared with your last 28 days, capped) × how much lengthening work the session involved × your sensitivity × a hand-tuned soreness time curve. Check-ins nudge your sensitivity in small steps. A strength session with no tag adds nothing rather than guessing.
- **Plan builder** (`engine/plan.ts`): soreness bands gate what is allowed. Moderate soreness blocks heavy lengthening exercises and takes a set off; high soreness allows only gentle ones. A session that would be mostly substitutes is swapped for another focus or becomes an easy day. A low recovery starts the week easy, several low recoveries make it a lighter week, and new movements start a set lighter.
- **Guardrails** (`engine/guardrails.ts`): a red-flag screen (sharp or localized pain, swelling, marked weakness, dark urine, worsening pain, numbness), an eligibility check (under 18, a medical condition), and request validation. Any red flag, under 18 or a medical condition means **no plan**, with a message to see a clinician. Unanswered questions block too: the checks fail closed.
- **Honesty by test**: tests scan every user-facing string for banned claims, require the disclaimers to be on screen, and fail if a screen could show a plan without every health answer.

## Run it

Requires Node and the Expo Go app on an iPhone (the project uses Expo SDK 57).

```bash
npm install
npx expo start          # scan the QR code with the iPhone Camera; Expo Go opens the app
npx expo start --web    # or open it in a browser
npm test                # unit and wiring tests
npm run typecheck       # TypeScript strict
```

On Windows PowerShell use `npx.cmd`. The phone and the laptop must be on the same network.

## Layout

```
engine/   pure TypeScript: soreness model, sensitivity, recovery, exercise library, plan builder, guardrails
data/     the replay loader and the synthetic demo week
app/      screens, components and their pure helpers (Body map, Plan, Evidence)
docs/     design specs and implementation plans; DEMO.md is the 3-minute demo runbook
```

## Data and privacy

- The app runs on `data/replay.synthetic.ts` unless a local `data/replay.json` exists. That file, `.env` and `*.token.json` are git-ignored: **never commit real health data or WHOOP credentials.**
- Health answers stay in memory and are asked again each launch. Nothing is stored or sent anywhere.
- See `PRIVACY.md` for the prototype's privacy policy.

## Honest limits

- The predictions have not been checked against real soreness logs, and the app makes no claim about how often it is right.
- The weights, thresholds and time curve are set by hand, not fitted to data. The low, medium and high recovery cutoffs are hand-set and have not been checked against WHOOP's own zones.
- The exercise and comfort libraries are general guidance and still need review by a trainer or physical therapist.
- The evidence summaries come from published reviews; the primary papers are still being checked.
- Stretching has not been shown to reduce soreness. The app labels stretches as range-of-motion work and puts the training plan first.

## Status

Built so far: the soreness engine, the body map and scrubber, check-ins with comfort ideas and session tagging, the plan engine with guardrails, the Plan tab, and the Evidence tab. Not built yet: the one-time export of real WHOOP history (the app currently reads the synthetic week).

## License

MIT. See `LICENSE`.
````

Create `docs/DEMO.md`:

````md
# Sore Spot: 3-minute demo runbook

Independent prototype, not affiliated with WHOOP. Everything on screen is synthetic (the `SYNTHETIC DATA` banner says so). Say that out loud in the first ten seconds.

## Before you start

1. On the laptop, in PowerShell: `npx.cmd expo start`. Scan the QR code with the iPhone Camera; Expo Go opens the app. Laptop and phone on the same Wi-Fi, or use a phone hotspot.
2. Open the app once and check all three tabs load. The app starts on **Body map**, day **Now**, with **Front** selected. Kill and reopen it for a clean run: check-ins, tags and health answers are not saved between launches.
3. Have the web build ready too: `npx expo start --web` on the laptop.

## Fallback ladder (never depend on one path)

1. **Primary:** Expo Go on the iPhone, running from the laptop.
2. **Fallback 1:** the same app in the browser on the laptop.
3. **Fallback 2:** the pre-recorded 3-minute screen recording of the phone.
4. **Always:** offline copies of the recording and the web build on the laptop.

## Beat sheet

The forecast is fixed at **Sat Sep 19 2026, 20:00 UTC** (after the Saturday soccer match), so the demo behaves the same every time.

| Time | Beat | What you do in the app | What to say |
|---|---|---|---|
| 0:00 | The gap | Nothing on screen | Members ask for structured programs and less tedious strength tracking. Say this is an independent prototype on synthetic data. |
| 0:25 | Replay a workout | Show the **Body map** tab. Point at `SYNTHETIC DATA` and the "Forecast from" line | It replays a week of workouts (runs, a hilly run, a soccer match, two strength sessions) so the demo never depends on a live connection. |
| 0:50 | The heatmap and the why | On **Now** the glutes, quads, hamstrings and calves are **High**. Tap **Quads** and read the reasons (new for you, lengthening work). Toggle **Back** to see the hamstrings and calves. Drag the scrubber to **+1d**, **+3d**, **+5d** to watch it fade to moderate | The model follows the published soreness timeline and the novelty effect. The picture is a prediction, not a measurement. |
| 1:20 | Check in and comfort ideas | On **Now**, open a sore muscle and tap a check-in: **None**, **Mild**, **Moderate** or **Severe**. Read the comfort ideas and their labels (**Range of motion**, **Comfort**) and the line that stretching has not been shown to reduce soreness | Recommendations are labelled by strength of evidence. Stretching helps range of motion, not soreness, so we say so. A severe report is acknowledged, with a line to stop and see a clinician if it is sharp, swollen or numb. |
| 1:50 | The plan adapts | Go to the **Plan** tab. It asks about the untagged **Wed Sep 16 · Weightlifting** session. Tap **Upper body**. Answer the health questions: **None of these apply**, **Under 18: No**, **Medical condition: No**. Leave the defaults (Build muscle, 4 days, Gym) and tap **Build my plan** | Read the days: Sunday upper body with *fewer sets: chest, triceps and shoulders predicted sore*; Monday an easy day (legs predicted sore); Wednesday upper body; Thursday lower body with the back squat at fewer sets, a hip thrust and a reverse lunge chosen to go easy on the sore muscles. Every choice has its reason. To show the plan reacting, tag the session **Lower body** instead: Sunday's sets go back to "new for you, start light". |
| 2:20 | The guardrails | Tap **Change answers**, tick **Sharp or localized pain**, tap **Build my plan**: no plan, and a message to stop and see a clinician. Change answers, untick it, choose **None of these apply**, pick **6** days (or **Lose weight**): declined with a reason | Red flags stop the plan and are never presented as normal soreness. Requests outside the guardrails are declined and say why. Nothing builds until every question is answered. |
| 2:40 | The evidence | Go to the **Evidence** tab. Show the soreness curve, then the stretching card, then **Where this stops** | The chart is the curve the model actually uses. The limits are on screen because they matter: not checked against real soreness logs, hand-set numbers, a trainer or physical therapist still to review the library. |
| 2:55 | The ask | Nothing on screen | The data I would want: Strength Trainer sets, a soreness signal, Journal. |

## Say this, not that

| Safe to say | Do not say |
|---|---|
| "The model follows the published soreness time course and the novelty effect." | Any accuracy figure. There is no data behind one. |
| "Recommendations are labelled by strength of evidence." | That stretching prevents or relieves soreness. |
| "I would check this against real soreness logs." | That it is clinically proven, or anything that implies diagnosis. |
| "This is a wellness tool, not medical advice." | Any claim about blood flow or oxygen. |

## Before the meeting

- Read the primary papers behind the Evidence tab, then delete the footnote line (`EVIDENCE_FOOTNOTE` in `app/evidenceCopy.ts`).
- Get a trainer or physical therapist to look at the exercise and comfort libraries, and say so in the pitch.
- Run this whole sheet three times, on the phone and in the browser.
````

- [ ] **Step 4: Run the whole suite and typecheck**

Run: `npm test && npm run typecheck`
Expected: 28 test files, 258 tests pass (the 247 after Task 2 plus 11); typecheck prints no errors.

- [ ] **Step 5: Prove the documentation tests can fail**

Break each line on purpose, run `npx vitest run app/docs.test.ts`, and restore from a backup:
```bash
cp README.md /tmp/readme.bak
sed -i 's/It is \*\*not affiliated with, endorsed by, or sponsored by WHOOP, Inc.\*\*/It is unofficial./' README.md
npx vitest run app/docs.test.ts
cp /tmp/readme.bak README.md
cp docs/DEMO.md /tmp/demo.bak
sed -i 's/fewer sets: chest, triceps and shoulders predicted sore/fewer sets: legs predicted sore/' docs/DEMO.md
npx vitest run app/docs.test.ts
cp /tmp/demo.bak docs/DEMO.md
npx vitest run app/docs.test.ts
```
Expected: the first run FAILS (the README's first lines); the second FAILS ("matches what the engine really produces"); the third passes. Confirm `git diff --stat` shows no change to either document. Paste all three outputs.

- [ ] **Step 6: Commit**

```bash
git add README.md docs/DEMO.md app/docs.test.ts
git commit -m "$(cat <<'EOF'
Add the README and the demo runbook, with tests tying the runbook to the engine

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

## Self-Review

**Spec coverage:**
- Evidence tab: timeline card with the engine-drawn chart, novelty (numbers from engine constants), lengthening work, stretching, easing in, comfort labels, limits card, footnote: Tasks 1 and 2.
- No invented numbers; only two named reviews: Task 1 copy and its tests.
- Three-tab shell, third tab mounted and hidden: Task 2 (`App.tsx`, wiring test).
- Accessibility roles and `aria-*` state on the tab bar, chips, Yes/No, "None of these apply", side toggle and check-in levels; the rule against `accessibilityState` for selected and checked: Task 2 (wiring test).
- Chart font and label placement: Task 2 (`TimeCurveChart`), verified by the controller's browser drive.
- README and runbook, with the runbook's facts checked against the engine: Task 3.
- Non-goals respected: no engine or data change, no new dependency, no persistence, no safe-area package.
- The browser drive and the phone check are controller and user steps after the tasks, as in earlier sub-projects.

**Type consistency:** every name is defined once (Task 1, then Task 2, then Task 3) and used with the same signature, because all blocks come from one verified copy.

**Known limits, stated plainly:** the research summaries come from secondary sources and say so; accessibility is improved but untested with VoiceOver; the README replaces the remote `main` README only when the branches are reconciled.
