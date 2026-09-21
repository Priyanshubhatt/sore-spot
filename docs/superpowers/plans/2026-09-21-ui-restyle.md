# Dark, WHOOP-Inspired Restyle Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give every screen one dark, high-contrast theme in the spirit of modern fitness apps, add a body-map summary strip, and keep every behavior, role, copy line and safety guard exactly as it is.

**Architecture:** A theme module and a contrast helper (both tested), a pure summary function, then every screen and component restyled onto the theme tokens with no change to props, handlers, roles or logic. No engine change, no new dependency.

**Tech Stack:** Expo SDK 57 (React Native 0.86, react-native-web, react-native-svg), TypeScript strict, Vitest. No new dependencies.

**Spec:** `docs/superpowers/specs/2026-09-21-ui-restyle-design.md` (look approved in chat from before/after screenshots).

## Global Constraints

Every task's requirements include these, copied from the spec:

- **No behavior, engine, data or copy change.** Nothing under `engine/` or `data/` is edited. Props, handlers, `accessibilityRole` / `aria-*` state, labels and every user-facing string stay as they are; the only new text is `INDEPENDENT_LINE`. The plan screen's fail-closed behavior is untouched.
- **Nothing that belongs to WHOOP is used**: no logo, wordmark, typeface, icon or copied layout. The system font only.
- **"Independent prototype · not affiliated with WHOOP" is rendered under the title in the shell**, alongside the `SYNTHETIC DATA` banner and the disclaimer footer, and a test pins it.
- **Screens and components use theme tokens, never a hex colour** (only `app/theme.ts` holds hex codes); a test scans for it.
- **Contrast is tested**: text pairings meet 4.5:1; the three soreness bands are at least 1.5:1 apart and each shows against the silhouette; the band's word (High, Moderate, Low) always sits beside its colour.
- The existing app honesty scan applies to every new file: banned words `diagnos`, `accura`, `clinical`, `prevent`, `cure`, `validated`, `treat`, `boost`, `oxygen`, `blood flow`, and "reduce / relieve / ease soreness" only in a line saying it has "not been shown". Do not use those words in new code or comments.
- All three tabs stay mounted with the inactive ones hidden; the title, banner and disclaimer footer stay in the shell outside the tabs.
- No persistence, no new dependencies, no LLM. **Do not link a git remote or push.** The user does that.
- Commit messages end with the line `Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>`.

**Working directory for every command:** `C:\Users\priya\Desktop\Sore Spot` (Git Bash path `/c/Users/priya/Desktop/Sore Spot`). Baseline: branch `feat/ui-restyle` (from `master`, tip a7e71a4), 265 tests in 28 files passing, `npm run typecheck` clean. The SDD controller creates the branch.

**Line endings:** this repo's working tree has Windows line endings. For every file below marked "replace whole file", overwrite the entire file with the block shown using the file-writing tool. Do not use search-and-replace edits: multi-line matches silently fail on Windows line endings.

**How these files were produced:** every block was first run in a scratch copy: 288 Vitest tests passing, `tsc --strict` clean, `expo export --platform web` building, and the existing 210-check headless-browser drive at 390x844 and 375x667 passing on the restyled app (214 checks with two added for the icons and the chart width). Twenty-two guards were mutation-checked (each broken on purpose and caught). Copy the blocks exactly, including any non-ASCII characters.

## File Structure

```
app/contrast.ts, app/theme.ts, app/theme.test.ts      the theme and its contrast tests             (Task 1)
app/summary.ts, app/summary.test.ts                   summarize a day's bands, the spoken label    (Task 1)
app/body/colors.ts, app/body/colors.test.ts (whole)   bands take their colours from the theme      (Task 1)
app/planCopy.ts (whole file)                          + INDEPENDENT_LINE                           (Task 1)
app/components/SummaryStrip.tsx, TabIcon.tsx          new                                          (Task 2)
app/components/TabBar.tsx, BodyMap.tsx, DayScrubber.tsx, MuscleSheet.tsx, MoveList.tsx, CheckInPicker.tsx,
  TagPrompt.tsx, ChipRow.tsx, HealthQuestions.tsx, PlanResultView.tsx, TimeCurveChart.tsx (whole files)      (Task 2)
app/BodyMapScreen.tsx, app/PlanScreen.tsx, app/EvidenceScreen.tsx, App.tsx, app.json (whole files)          (Task 2)
app/honesty.test.ts (whole file)                      + look wiring tests                          (Task 2)
```

---

### Task 1: Theme, contrast, summary and band colours (pure)

**Files:**
- Create: `app/contrast.ts`, `app/theme.ts`, `app/summary.ts`
- Replace (whole file): `app/body/colors.ts`, `app/body/colors.test.ts`, `app/planCopy.ts`
- Test: `app/theme.test.ts`, `app/summary.test.ts`

**Interfaces:**
- Consumes: `MUSCLES`, `DayForecast`, `Muscle`, `RiskBand` from `engine/index.ts`; `BAND_LABELS` from `app/copy.ts`; the type `TextStyle` from `react-native` (type-only).
- Produces (used by Task 2):
  - `app/contrast.ts`: `luminance(hex)`, `contrastRatio(a, b)`.
  - `app/theme.ts`: `colors` (see the spec's palette table), `space`, `radius`, `type` (`display`, `title`, `heading`, `body`, `strong`, `small`, `label`).
  - `app/summary.ts`: `DaySummary { high, moderate, low }`, `summarize(day)`, `summaryLabel(summary, dayText)`.
  - `app/body/colors.ts`: `BAND_COLORS`, `BAND_ORDER`, `bandColor(band)` (same exports as before, now backed by the theme).
  - `app/planCopy.ts`: gains `INDEPENDENT_LINE`; everything else unchanged.

`app/body/colors.test.ts` replaces the old "gets darker as the band rises" tests, which encoded the previous calm-teal design. Band contrast is now tested in `app/theme.test.ts`.

- [ ] **Step 1: Confirm the branch and write the failing tests**

You are on branch `feat/ui-restyle` (created by the controller). Confirm with `git branch --show-current`.

Create `app/theme.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { contrastRatio, luminance } from './contrast';
import { colors, radius, space, type } from './theme';

const HEX = /^#[0-9A-F]{6}$/;

describe('contrast helper', () => {
  it('measures black on white as 21 and a color against itself as 1', () => {
    expect(contrastRatio('#000000', '#FFFFFF')).toBeCloseTo(21, 5);
    expect(contrastRatio('#3BB4F2', '#3BB4F2')).toBeCloseTo(1, 5);
    expect(luminance('#000000')).toBe(0);
  });

  it('gets a mid-tone right, so wrong luminance weights or gamma would fail (#777777 on white is about 4.48)', () => {
    expect(contrastRatio('#777777', '#FFFFFF')).toBeCloseTo(4.48, 1);
    expect(contrastRatio('#FF0000', '#000000')).toBeCloseTo(5.25, 1);
  });

  it('is symmetric', () => {
    expect(contrastRatio('#123456', '#ABCDEF')).toBeCloseTo(contrastRatio('#ABCDEF', '#123456'), 10);
  });
});

describe('theme tokens', () => {
  it('are all six-digit hex colors', () => {
    for (const [name, value] of Object.entries(colors)) expect(value, name).toMatch(HEX);
  });

  it('gives a dark theme: the background is darker than every surface, which is darker than the text', () => {
    expect(luminance(colors.bg)).toBeLessThan(luminance(colors.card));
    expect(luminance(colors.card)).toBeLessThan(luminance(colors.raised));
    expect(luminance(colors.raised)).toBeLessThan(luminance(colors.muted));
    expect(luminance(colors.muted)).toBeLessThan(luminance(colors.text));
  });

  it('keeps the spacing and radius scales increasing', () => {
    const scale = Object.values(space);
    expect([...scale].sort((a, b) => a - b)).toEqual(scale);
    expect(radius.sm).toBeLessThan(radius.md);
    expect(radius.md).toBeLessThan(radius.pill);
  });

  it('uses only tokens for the text colors in the type presets', () => {
    const allowed = new Set<string>([colors.text, colors.dim, colors.muted]);
    for (const [name, preset] of Object.entries(type)) expect(allowed.has(preset.color), name).toBe(true);
  });
});

describe('contrast of every pairing that carries text (WCAG AA, 4.5:1)', () => {
  const surfaces = [colors.bg, colors.card, colors.raised] as const;

  it('reads all three text colors on every surface', () => {
    for (const surface of surfaces) {
      for (const [name, fg] of [['text', colors.text], ['dim', colors.dim], ['muted', colors.muted]] as const) {
        expect(contrastRatio(fg, surface), `${name} on ${surface}`).toBeGreaterThanOrEqual(4.5);
      }
    }
  });

  it('reads the accent as text on every surface and dark text on the accent', () => {
    for (const surface of [...surfaces, colors.accentSoft]) {
      expect(contrastRatio(colors.accent, surface), `accent on ${surface}`).toBeGreaterThanOrEqual(4.5);
    }
    expect(contrastRatio(colors.onAccent, colors.accent)).toBeGreaterThanOrEqual(4.5);
  });

  it('reads the warning and banner text on the warning surface and on the page', () => {
    expect(contrastRatio(colors.warnText, colors.warnBg)).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio(colors.banner, colors.bg)).toBeGreaterThanOrEqual(4.5);
  });

  it('reads the text colours on the tinted surfaces they are drawn on', () => {
    expect(contrastRatio(colors.muted, colors.accentSoft)).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio(colors.dim, colors.accentFill)).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio(colors.text, colors.accentFill)).toBeGreaterThanOrEqual(4.5);
    for (const surface of [colors.card, colors.raised, colors.warnBg]) {
      expect(contrastRatio(colors.warnText, surface), `warn text on ${surface}`).toBeGreaterThanOrEqual(4.5);
    }
  });

  it('draws the day scrubber label on the accent and the chart fill legibly', () => {
    expect(contrastRatio(colors.onAccent, colors.accent)).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio(colors.accent, colors.accentFill)).toBeGreaterThanOrEqual(3);
  });
});

describe('contrast of the graphics (3:1 for controls, 1.5:1 to tell bands apart)', () => {
  it('lets the accent stand out on every surface', () => {
    for (const surface of [colors.bg, colors.card, colors.raised]) {
      expect(contrastRatio(colors.accent, surface)).toBeGreaterThanOrEqual(3);
    }
  });

  it('shows every soreness band against the body silhouette', () => {
    for (const band of [colors.low, colors.moderate, colors.high]) {
      expect(contrastRatio(band, colors.bodyFill)).toBeGreaterThanOrEqual(2.5);
    }
  });

  it('keeps the three bands apart by lightness, not just by hue, so they survive colour blindness', () => {
    expect(contrastRatio(colors.low, colors.moderate)).toBeGreaterThanOrEqual(1.5);
    expect(contrastRatio(colors.moderate, colors.high)).toBeGreaterThanOrEqual(1.5);
    expect(contrastRatio(colors.low, colors.high)).toBeGreaterThanOrEqual(1.5);
  });

  it('outlines the selected zone so it stands out from the body around it and from each band inside it', () => {
    // The outline sits between the zone and the dark body, so it must beat the body by a wide margin
    // and still be told apart from every band colour.
    expect(contrastRatio(colors.selectedOutline, colors.bodyFill)).toBeGreaterThanOrEqual(7);
    for (const band of [colors.low, colors.moderate, colors.high]) {
      expect(contrastRatio(colors.selectedOutline, band)).toBeGreaterThanOrEqual(1.5);
    }
  });
});
```

Create `app/summary.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { syntheticReplay } from '../data/replay.synthetic';
import { MUSCLES, type DayForecast, type RiskBand } from '../engine';
import { DEMO_AS_OF } from './config';
import { buildForecastState } from './forecastState';
import { summarize, summaryLabel } from './summary';

const day = (bands: Partial<Record<string, RiskBand>>): DayForecast =>
  Object.fromEntries(MUSCLES.map((m) => [m, { band: bands[m] ?? 'low', drivers: [] }])) as unknown as DayForecast;

describe('summarize', () => {
  it('sorts the muscles into their bands in engine order, and every muscle lands in exactly one', () => {
    const s = summarize(day({ quads: 'high', glutes: 'high', calves: 'moderate' }));
    expect(s.high).toEqual(MUSCLES.filter((m) => m === 'glutes' || m === 'quads'));
    expect(s.moderate).toEqual(['calves']);
    expect(s.high.length + s.moderate.length + s.low.length).toBe(MUSCLES.length);
    expect(new Set([...s.high, ...s.moderate, ...s.low]).size).toBe(MUSCLES.length);
  });

  it('counts the demo week: four High now, an extra Moderate tomorrow, all quiet by +6d', () => {
    const state = buildForecastState(syntheticReplay.workouts, {}, {}, DEMO_AS_OF);
    const counts = (d: number) => {
      const s = summarize(state.forecast.byDay[d]);
      return [s.high.length, s.moderate.length, s.low.length];
    };
    expect(counts(0)).toEqual([4, 0, 8]);
    expect(counts(1)).toEqual([4, 1, 7]);
    expect(counts(4)).toEqual([1, 4, 7]);
    expect(counts(6)).toEqual([0, 0, 12]);
  });

  it('does not change the forecast it was given', () => {
    const d = day({ quads: 'high' });
    const before = JSON.stringify(d);
    summarize(d);
    expect(JSON.stringify(d)).toBe(before);
  });
});

describe('summaryLabel', () => {
  it('reads each count with its band name and pluralizes correctly', () => {
    expect(summaryLabel(summarize(day({ quads: 'high', glutes: 'high', calves: 'moderate' })), 'Now')).toBe(
      'Now: 2 muscles High, 1 muscle Moderate, 9 muscles Low.',
    );
    expect(summaryLabel(summarize(day({})), '+6d (Fri)')).toBe('+6d (Fri): 0 muscles High, 0 muscles Moderate, 12 muscles Low.');
  });
});
```

Replace `app/body/colors.test.ts` with:

```ts
import { describe, expect, it } from 'vitest';
import { colors } from '../theme';
import { BAND_COLORS, BAND_ORDER, bandColor } from './colors';

describe('band colors', () => {
  it('orders bands low, moderate, high', () => {
    expect(BAND_ORDER).toEqual(['low', 'moderate', 'high']);
  });

  it('gives every band its own hex color', () => {
    const shown = BAND_ORDER.map(bandColor);
    for (const c of shown) expect(c).toMatch(/^#[0-9A-F]{6}$/);
    expect(new Set(shown).size).toBe(3);
    expect(bandColor('high')).toBe(BAND_COLORS.high);
  });

  it('takes the colors from the theme, so contrast is checked in one place', () => {
    expect(BAND_COLORS).toEqual({ low: colors.low, moderate: colors.moderate, high: colors.high });
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run app/theme.test.ts app/summary.test.ts app/body/colors.test.ts`
Expected: FAIL. `theme.test.ts` cannot resolve `./contrast` and `./theme`, `summary.test.ts` cannot resolve `./summary`, and `colors.test.ts` cannot resolve `../theme`. Paste the real output.

- [ ] **Step 3: Write the implementation**

Create `app/contrast.ts`:

```ts
/** WCAG relative luminance of a #RRGGBB color. */
export function luminance(hex: string): number {
  const [r, g, b] = [1, 3, 5]
    .map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
    .map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** WCAG contrast ratio between two #RRGGBB colors, from 1 (identical) to 21 (black on white). */
export function contrastRatio(a: string, b: string): number {
  const [lighter, darker] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (lighter + 0.05) / (darker + 0.05);
}
```

Create `app/theme.ts`:

```ts
import type { TextStyle } from 'react-native';

/**
 * The one place the look is defined: a dark, high-contrast theme in the spirit of modern fitness
 * apps. It borrows no brand assets: no logo, wordmark or typeface. Screens use these tokens, not
 * hex codes, and app/theme.test.ts checks the contrast of every pairing that carries text.
 */
export const colors = {
  bg: '#0A0B0D',
  card: '#14171A',
  raised: '#1D2126',
  border: '#2C3238',

  text: '#F5F6F7',
  dim: '#B9C0C7',
  muted: '#8E97A0',

  accent: '#3BB4F2',
  onAccent: '#04141D',
  accentSoft: '#0F2A38',
  accentFill: '#123245',

  // Soreness bands. The text next to every color always names the band too.
  low: '#1F7A63',
  moderate: '#F2B233',
  high: '#FF5B4D',

  bodyFill: '#262B31',
  selectedOutline: '#FFFFFF',
  shadow: '#000000',

  warnBg: '#2A1D0B',
  warnBorder: '#5A3B0F',
  warnText: '#F6C77A',
  banner: '#F6C77A',
} as const;

export const space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24 } as const;
export const radius = { sm: 10, md: 16, pill: 999 } as const;

/** Text presets: bold numerals, small spaced-out uppercase labels, the system font. */
export const type = {
  display: { fontSize: 34, fontWeight: '800', letterSpacing: -0.5, color: colors.text },
  title: { fontSize: 22, fontWeight: '800', letterSpacing: -0.2, color: colors.text },
  heading: { fontSize: 16, fontWeight: '700', color: colors.text },
  body: { fontSize: 14, lineHeight: 20, color: colors.dim },
  strong: { fontSize: 14, lineHeight: 20, fontWeight: '600', color: colors.text },
  small: { fontSize: 12, lineHeight: 17, color: colors.muted },
  label: { fontSize: 11, fontWeight: '700', letterSpacing: 1.2, textTransform: 'uppercase', color: colors.muted },
} satisfies Record<string, TextStyle>;
```

Create `app/summary.ts`:

```ts
import { MUSCLES, type DayForecast, type Muscle } from '../engine';
import { BAND_LABELS } from './copy';

export interface DaySummary {
  high: Muscle[];
  moderate: Muscle[];
  low: Muscle[];
}

/** Which muscles sit in each band on one forecast day, in the engine's muscle order. */
export function summarize(day: DayForecast): DaySummary {
  return {
    high: MUSCLES.filter((m) => day[m].band === 'high'),
    moderate: MUSCLES.filter((m) => day[m].band === 'moderate'),
    low: MUSCLES.filter((m) => day[m].band === 'low'),
  };
}

const plural = (n: number) => `${n} ${n === 1 ? 'muscle' : 'muscles'}`;

/** The strip read aloud: "Now: 4 muscles High, 1 muscle Moderate, 7 muscles Low." */
export function summaryLabel(summary: DaySummary, dayText: string): string {
  return `${dayText}: ${plural(summary.high.length)} ${BAND_LABELS.high}, ${plural(summary.moderate.length)} ${BAND_LABELS.moderate}, ${plural(summary.low.length)} ${BAND_LABELS.low}.`;
}
```

Replace `app/body/colors.ts` with:

```ts
import type { RiskBand } from '../../engine';
import { colors } from '../theme';

// Traffic-light order: a dim green, amber and red. The legend and the sheet always name the band in
// words too, and the three are kept apart by lightness as well as hue (see app/theme.test.ts).
export const BAND_COLORS: Record<RiskBand, string> = {
  low: colors.low,
  moderate: colors.moderate,
  high: colors.high,
};

export const BAND_ORDER: readonly RiskBand[] = ['low', 'moderate', 'high'];

export function bandColor(band: RiskBand): string {
  return BAND_COLORS[band];
}
```

Replace `app/planCopy.ts` with:

```ts
export const TAB_LABELS = { body: 'Body map', plan: 'Plan', evidence: 'Evidence' } as const;

/** Shown under the title on every screen. A modern look must never read as an official app. */
export const INDEPENDENT_LINE = 'Independent prototype · not affiliated with WHOOP';

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
Expected: 30 test files, 284 tests pass (the 265 existing, minus the 4 old colour tests, plus 16 theme, 4 summary and 3 colour tests); typecheck prints no errors. The screens still use their old hex colours at this point, which is fine.

- [ ] **Step 5: Prove the guards can fail**

Break each line on purpose, run the file's tests, and restore from a backup:
```bash
cp app/theme.ts /tmp/theme.bak
sed -i "s/muted: '#8E97A0'/muted: '#4A5057'/" app/theme.ts
npx vitest run app/theme.test.ts
cp /tmp/theme.bak app/theme.ts
cp app/summary.ts /tmp/summary.bak
sed -i "s/band === 'moderate'/band === 'high'/" app/summary.ts
npx vitest run app/summary.test.ts
cp /tmp/summary.bak app/summary.ts
cp app/body/colors.ts /tmp/colors.bak
sed -i 's/low: colors.low,/low: colors.moderate,/' app/body/colors.ts
npx vitest run app/body/colors.test.ts app/theme.test.ts
cp /tmp/colors.bak app/body/colors.ts
npx vitest run app/theme.test.ts app/summary.test.ts app/body/colors.test.ts
```
Expected: the first run FAILS (the muted text colour is unreadable on the surfaces); the second FAILS (the demo-week counts and the bucket test); the third FAILS (the low band would take the moderate colour); the fourth passes. Confirm `git diff --stat` shows no change to the three source files. Paste all four outputs.

- [ ] **Step 6: Commit**

```bash
git add app
git commit -m "$(cat <<'EOF'
Add the dark theme with tested contrast, the day summary and theme-backed band colours

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 2: Restyle every screen and component onto the theme

**Files:**
- Create: `app/components/SummaryStrip.tsx`, `app/components/TabIcon.tsx`
- Replace (whole file): `app/components/TabBar.tsx`, `app/components/BodyMap.tsx`, `app/components/DayScrubber.tsx`, `app/components/MuscleSheet.tsx`, `app/components/MoveList.tsx`, `app/components/CheckInPicker.tsx`, `app/components/TagPrompt.tsx`, `app/components/ChipRow.tsx`, `app/components/HealthQuestions.tsx`, `app/components/PlanResultView.tsx`, `app/components/TimeCurveChart.tsx`, `app/BodyMapScreen.tsx`, `app/PlanScreen.tsx`, `app/EvidenceScreen.tsx`, `App.tsx`, `app.json`, `app/honesty.test.ts`

**Interfaces:**
- Consumes: everything Task 1 produces; `bandColor`, `BAND_ORDER` from `app/body/colors.ts`; `summarize`, `summaryLabel` from `app/summary.ts`; `BAND_LABELS` from `app/copy.ts`; `INDEPENDENT_LINE` from `app/planCopy.ts`; `react-native-svg` as already used.
- Produces: `SummaryStrip({ day, dayText })`; `TabIcon({ name, color, size? })` with `IconName = 'body' | 'plan' | 'evidence'`; every other component keeps the props it had.

Each replaced file keeps the props, handlers, `accessibilityRole` / `aria-*` state, labels and copy it had; only styles change (plus the two new components, the strip on the Body map, the independent line in the shell, and the light status bar). `app.json` changes one value: `userInterfaceStyle` is now `"dark"`.

- [ ] **Step 1: Write the failing wiring tests**

Replace `app/honesty.test.ts` with:

```ts
import { readdirSync, readFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { describe, expect, it } from 'vitest';

// Scans every non-test source file under app/, so text added to a component later is covered too.
const BANNED = /diagnos|accura|clinical|prevent|cure|validated|treat|boost|oxygen|blood flow/i;
const SORENESS_CLAIM = /(reduc(e|es|ed|ing)|relie(ve|ves|ved|ving)|eas(e|es|ed|ing)) (the |your )?soreness/i;
const NEGATED = /(not|n't) been shown to (reduce|relieve|ease) soreness/i;

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
    // All three tabs stay mounted so switching does not lose the day, side or answers.
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

describe('the look stays on the theme', () => {
  it('uses theme tokens and never a hex or rgb colour in any screen, component or the shell', () => {
    const shell = { rel: '../App.tsx', text: readFileSync(join(__dirname, '..', 'App.tsx'), 'utf8') };
    for (const f of [...files, shell]) {
      if (f.rel === 'theme.ts') continue;
      expect(f.text, f.rel).not.toMatch(/#[0-9A-Fa-f]{3,8}\b|rgba?\(/);
    }
  });

  it('hides the decorative tab icons from screen readers on every platform, and keeps the tab label', () => {
    expect(text('components/TabIcon.tsx')).toMatch(/<View aria-hidden>/);
    expect(text('components/TabBar.tsx')).toMatch(/{TAB_LABELS\[t\]}/);
  });

  it('shows the independent-prototype line under the title, so a modern look never reads as an official app', () => {
    const shell = readFileSync(join(__dirname, '..', 'App.tsx'), 'utf8');
    expect(shell).toMatch(/{INDEPENDENT_LINE}/);
    expect(shell).toMatch(/<StatusBar style="light" \/>/);
    expect(text('planCopy.ts')).toMatch(/not affiliated with WHOOP/);
  });

  it('shows the summary strip on the body map, and names the band in words beside every colour', () => {
    expect(text('BodyMapScreen.tsx')).toMatch(/<SummaryStrip day={dayForecast} dayText={dayText} \/>/);
    expect(text('BodyMapScreen.tsx')).toMatch(/{BAND_LABELS\[band\]}/);
    expect(text('components/SummaryStrip.tsx')).toMatch(/{BAND_LABELS\[band\]}/);
    expect(text('components/SummaryStrip.tsx')).toMatch(/accessibilityLabel={summaryLabel\(summary, dayText\)}/);
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
Expected: FAIL. The new "the look stays on the theme" tests fail: the screens still contain hex or rgb colours, the shell has no `{INDEPENDENT_LINE}` and no light status bar, the body map has no summary strip, and there is no tab icon to hide. The older honesty tests still pass. Paste the real output.

- [ ] **Step 3: Write the implementation**

Create `app/components/SummaryStrip.tsx`:

```tsx
import { StyleSheet, Text, View } from 'react-native';
import type { DayForecast, RiskBand } from '../../engine';
import { bandColor } from '../body/colors';
import { BAND_LABELS } from '../copy';
import { summarize, summaryLabel } from '../summary';
import { colors, radius, space, type } from '../theme';

const ORDER: readonly RiskBand[] = ['high', 'moderate', 'low'];

interface Props {
  day: DayForecast;
  /** e.g. "Now" or "+2d (Mon)". */
  dayText: string;
}

/** How many muscles sit in each band on the day being viewed: big numerals, a colour bar, a word. */
export default function SummaryStrip({ day, dayText }: Props) {
  const summary = summarize(day);
  return (
    <View accessible accessibilityLabel={summaryLabel(summary, dayText)} style={styles.card}>
      {ORDER.map((band) => (
        <View key={band} style={styles.stat}>
          <Text style={styles.number}>{String(summary[band].length)}</Text>
          <View style={[styles.bar, { backgroundColor: bandColor(band) }]} />
          <Text style={styles.label}>{BAND_LABELS[band]}</Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    gap: space.md,
    paddingVertical: space.md,
    paddingHorizontal: space.lg,
    borderRadius: radius.md,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
  },
  stat: { flex: 1, alignItems: 'center', gap: 6 },
  number: { ...type.display, fontSize: 30, lineHeight: 34 },
  bar: { width: 36, height: 4, borderRadius: 2 },
  label: { ...type.label },
});
```

Create `app/components/TabIcon.tsx`:

```tsx
import { View } from 'react-native';
import Svg, { Circle, Path, Rect } from 'react-native-svg';

export type IconName = 'body' | 'plan' | 'evidence';

interface Props {
  name: IconName;
  color: string;
  size?: number;
}

/** Simple line icons drawn with SVG, so no icon package is needed. The tab's text label carries the meaning. */
export default function TabIcon({ name, color, size = 22 }: Props) {
  return (
    <View aria-hidden>
      <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
        {name === 'body' && (
          <>
            <Circle cx={12} cy={5} r={2.5} />
            <Path d="M8 21v-7l-2-4.5 3-1.5h6l3 1.5-2 4.5v7" />
          </>
        )}
        {name === 'plan' && (
          <>
            <Rect x={4} y={5} width={16} height={15} rx={3} />
            <Path d="M4 10h16M9 3v4M15 3v4" />
          </>
        )}
        {name === 'evidence' && <Path d="M3 19c3-1 4-12 9-12s5 9 9 12" />}
      </Svg>
    </View>
  );
}
```

Replace `app/components/TabBar.tsx` with:

```tsx
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { TAB_LABELS } from '../planCopy';
import { colors, space } from '../theme';
import TabIcon from './TabIcon';

export type Tab = keyof typeof TAB_LABELS;
export const TABS: readonly Tab[] = ['body', 'plan', 'evidence'];

interface Props {
  tab: Tab;
  onChange: (tab: Tab) => void;
}

export default function TabBar({ tab, onChange }: Props) {
  return (
    <View accessibilityRole="tablist" style={styles.bar}>
      {TABS.map((t) => {
        const on = tab === t;
        return (
          <Pressable
            key={t}
            onPress={() => onChange(t)}
            accessibilityRole="tab"
            aria-selected={tab === t}
            style={[styles.tab, on && styles.tabOn]}
          >
            <TabIcon name={t} color={on ? colors.accent : colors.muted} />
            <Text style={[styles.tabText, on && styles.tabTextOn]}>{TAB_LABELS[t]}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.card,
    paddingBottom: space.md,
  },
  tab: { flex: 1, alignItems: 'center', gap: space.xs, paddingTop: space.md, paddingBottom: space.xs },
  tabOn: { borderTopWidth: 2, borderTopColor: colors.accent, marginTop: -1 },
  tabText: { fontSize: 11, fontWeight: '700', letterSpacing: 0.6, textTransform: 'uppercase', color: colors.muted },
  tabTextOn: { color: colors.accent },
});
```

Replace `app/components/BodyMap.tsx` with:

```tsx
import Svg, { Path } from 'react-native-svg';
import type { DayForecast, Muscle } from '../../engine';
import { zoneA11yLabel } from '../copy';
import { bandColor } from '../body/colors';
import { colors } from '../theme';
import { BodySide, SILHOUETTE, VIEWBOX, ZONES, musclesInView } from '../body/zones';

const BODY_FILL = colors.bodyFill;
// Zone outlines match the page, so neighbouring zones read as separate; the selected one is outlined in white.
const OUTLINE = colors.bg;
const SELECTED_OUTLINE = colors.selectedOutline;

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

Replace `app/components/DayScrubber.tsx` with:

```tsx
import { useMemo, useRef } from 'react';
import { LayoutChangeEvent, PanResponder, StyleSheet, Text, View } from 'react-native';
import { FORECAST_DAYS } from '../../engine/constants';
import { dayIndexFromX, dayLabel, weekdayLabel } from '../scrubber';
import { colors, radius } from '../theme';

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
    borderRadius: radius.sm,
    backgroundColor: colors.raised,
    overflow: 'hidden',
    // On web a drag would otherwise start a text selection, which cancels the pan.
    userSelect: 'none',
  },
  cell: { flex: 1, alignItems: 'center', paddingVertical: 9 },
  cellSelected: { backgroundColor: colors.accent },
  label: { fontSize: 13, fontWeight: '700', color: colors.text },
  weekday: { fontSize: 11, color: colors.muted },
  labelSelected: { color: colors.onAccent },
});
```

Replace `app/components/MuscleSheet.tsx` with:

```tsx
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import type { Muscle, MuscleState } from '../../engine';
import { BAND_LABELS, MUSCLE_LABELS, SAFETY_LINE, bandPhrase, reasonsFor } from '../copy';
import { bandColor } from '../body/colors';
import type { CheckInLevel } from '../checkin';
import type { Recommendation } from '../mobility/recommend';
import { colors, radius, space, type } from '../theme';
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
      <Text style={styles.safety}>{SAFETY_LINE}</Text>
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
    left: space.md,
    right: space.md,
    bottom: space.md,
    maxHeight: '65%',
    padding: space.lg,
    borderRadius: radius.md,
    backgroundColor: colors.raised,
    borderWidth: 1,
    borderColor: colors.border,
    gap: space.sm,
    shadowColor: colors.shadow,
    shadowOpacity: 0.5,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
  },
  header: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  swatch: { width: 22, height: 22, borderRadius: 11 },
  headerText: { flex: 1 },
  title: { ...type.heading, fontSize: 18 },
  subtitle: { ...type.small },
  close: { fontSize: 14, fontWeight: '700', color: colors.accent, padding: space.xs },
  scrollContent: { gap: space.md, paddingBottom: space.xs },
  reason: { ...type.body },
  band: { ...type.small },
  safety: { fontSize: 12, fontWeight: '600', color: colors.warnText },
});
```

Replace `app/components/MoveList.tsx` with:

```tsx
import { StyleSheet, Text, View } from 'react-native';
import {
  COMFORT_HEADING,
  EVIDENCE_LABELS,
  EVIDENCE_NOTES,
  NOTHING_NEEDED_TEXT,
  MOVE_CUE,
  ROM_HEADING,
  SAVE_STRETCHING_TEXT,
  STRETCH_HONESTY,
} from '../copy';
import { evidenceFor, type EvidenceTag, type Move } from '../mobility/library';
import type { Recommendation } from '../mobility/recommend';
import { colors, space, type } from '../theme';

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
      {(comfort.length > 0 || rom.length > 0) && <Text style={styles.small}>{MOVE_CUE}</Text>}
      <Text style={styles.small}>{STRETCH_HONESTY}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: space.md },
  section: { gap: 6 },
  heading: { ...type.label, color: colors.dim },
  evidenceNote: { ...type.small },
  move: { gap: 2, paddingVertical: space.xs },
  moveHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: space.sm },
  moveName: { flex: 1, ...type.strong },
  tag: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.accent,
    backgroundColor: colors.accentSoft,
    paddingVertical: 2,
    paddingHorizontal: space.sm,
    borderRadius: 10,
    overflow: 'hidden',
  },
  how: { ...type.body },
  dose: { ...type.small },
  note: { ...type.body },
  small: { ...type.small },
});
```

Replace `app/components/CheckInPicker.tsx` with:

```tsx
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { CHECKIN_LEVELS, type CheckInLevel } from '../checkin';
import { CHECKIN_LABELS, CHECKIN_NOT_TODAY, CHECKIN_PROMPT } from '../copy';
import { colors, radius, space, type } from '../theme';

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
  wrap: { gap: space.sm },
  prompt: { ...type.label, color: colors.dim },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  chip: { paddingVertical: space.sm, paddingHorizontal: 14, borderRadius: radius.pill, backgroundColor: colors.card },
  chipOn: { backgroundColor: colors.accent },
  chipText: { fontSize: 13, fontWeight: '700', color: colors.dim },
  chipTextOn: { color: colors.onAccent },
  message: { ...type.body },
  hint: { ...type.small },
});
```

Replace `app/components/TagPrompt.tsx` with:

```tsx
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { StrengthTag } from '../../engine';
import { TAG_HEADING, TAG_LABELS, TAG_PROMPT } from '../copy';
import { TAG_OPTIONS } from '../tagging';
import { colors, radius, space, type } from '../theme';

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
  wrap: {
    gap: 6,
    padding: space.lg,
    borderRadius: radius.md,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
  },
  heading: { ...type.heading },
  prompt: { ...type.small },
  session: { gap: 6, marginTop: 6 },
  label: { ...type.strong },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  chip: { paddingVertical: space.sm, paddingHorizontal: space.md, borderRadius: radius.pill, backgroundColor: colors.accentSoft },
  chipText: { fontSize: 13, fontWeight: '700', color: colors.accent },
});
```

Replace `app/components/ChipRow.tsx` with:

```tsx
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { Option } from '../planFlow';
import { colors, radius, space, type } from '../theme';

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
  label: { ...type.label, color: colors.dim },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  chip: { paddingVertical: space.sm, paddingHorizontal: space.lg, borderRadius: radius.pill, backgroundColor: colors.raised },
  chipOn: { backgroundColor: colors.accent },
  chipText: { fontSize: 14, fontWeight: '700', color: colors.dim },
  chipTextOn: { color: colors.onAccent },
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
import { colors, radius, space, type } from '../theme';

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
              <Text style={[styles.flagText, on && styles.flagTextOn]}>{`${on ? '☑' : '☐'}  ${RED_FLAG_QUESTIONS[flag]}`}</Text>
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
  wrap: {
    gap: space.lg,
    padding: space.lg,
    borderRadius: radius.md,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
  },
  heading: { ...type.heading, fontSize: 18 },
  intro: { ...type.small },
  block: { gap: space.sm },
  question: { ...type.strong },
  row: { flexDirection: 'row', gap: space.sm },
  flag: {
    paddingVertical: space.sm,
    paddingHorizontal: 10,
    borderRadius: radius.sm,
    backgroundColor: colors.raised,
    borderWidth: 1,
    borderColor: colors.border,
  },
  flagOn: { borderColor: colors.warnText, backgroundColor: colors.warnBg },
  flagText: { ...type.body },
  flagTextOn: { color: colors.warnText },
  chip: { alignSelf: 'flex-start', paddingVertical: space.sm, paddingHorizontal: space.lg, borderRadius: radius.pill, backgroundColor: colors.raised },
  chipOn: { backgroundColor: colors.accent },
  chipText: { fontSize: 14, fontWeight: '700', color: colors.dim },
  chipTextOn: { color: colors.onAccent },
});
```

Replace `app/components/PlanResultView.tsx` with:

```tsx
import { StyleSheet, Text, View } from 'react-native';
import { PLAN_DISCLAIMER, type PlanResult } from '../../engine';
import { BLOCKED_HEADING, NOTES_HEADING, PLAN_HEADING, WHY_HEADING } from '../planCopy';
import { planDayHeading, setsAndReps } from '../planFlow';
import { colors, radius, space, type } from '../theme';

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
  wrap: { gap: space.md },
  heading: { ...type.title },
  notes: {
    gap: space.xs,
    padding: space.lg,
    borderRadius: radius.md,
    backgroundColor: colors.warnBg,
    borderWidth: 1,
    borderColor: colors.warnBorder,
  },
  notesHeading: { ...type.label, color: colors.warnText },
  noteText: { fontSize: 13, lineHeight: 19, color: colors.warnText },
  card: {
    gap: 6,
    padding: space.lg,
    borderRadius: radius.md,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardRest: { backgroundColor: colors.bg },
  cardDay: { ...type.label, color: colors.accent },
  cardTitle: { ...type.heading, fontSize: 18 },
  exercise: { gap: 2, marginTop: space.xs },
  exerciseName: { ...type.strong },
  exerciseLine: { ...type.body },
  exerciseNote: { fontSize: 12, color: colors.warnText },
  why: { gap: 2, marginTop: 6 },
  whyHeading: { ...type.label },
  whyText: { ...type.small },
  disclaimer: { ...type.small },
  blocked: {
    gap: 6,
    padding: space.lg,
    borderRadius: radius.md,
    backgroundColor: colors.warnBg,
    borderWidth: 1,
    borderColor: colors.warnBorder,
  },
  blockedHeading: { ...type.heading, fontSize: 18, color: colors.warnText },
  blockedText: { fontSize: 14, lineHeight: 20, color: colors.warnText },
});
```

Replace `app/components/TimeCurveChart.tsx` with:

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
import { colors } from '../theme';

const LINE = colors.accent;
const FILL = colors.accentFill;
const AXIS = colors.border;
const TEXT = colors.muted;
const HEIGHT = 194;
// SVG text does not inherit the app font on web, where it would fall back to a serif face.
const FONT = Platform.select({ web: 'system-ui, -apple-system, Segoe UI, Roboto, sans-serif', default: undefined });

interface Props {
  width: number;
}

/** The engine's soreness curve, drawn as it is used: rising over the first day, peaking, then fading. */
export default function TimeCurveChart({ width }: Props) {
  const box: ChartBox = { width, height: HEIGHT, left: 12, right: 12, top: 46, bottom: 40 };
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
        <SvgText x={xOf(peak.hours, box)} y={yOf(peak.level, box) - 10} fontFamily={FONT} fontSize={11} fill={TEXT} textAnchor="middle">
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
import SummaryStrip from './components/SummaryStrip';
import TagPrompt from './components/TagPrompt';
import { BAND_LABELS, checkInFeedback, needsTagNote, unmappedNote } from './copy';
import { recommend } from './mobility/recommend';
import { dayLabel, weekdayLabel } from './scrubber';
import { colors, radius, space, type } from './theme';
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

  const mapWidth = Math.min(screenWidth - 48, 236);
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

        <SummaryStrip day={dayForecast} dayText={dayText} />

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
  content: { padding: space.lg, paddingTop: space.sm, gap: space.md },
  asOf: { ...type.label },
  toggle: {
    flexDirection: 'row',
    padding: 3,
    borderRadius: radius.pill,
    backgroundColor: colors.raised,
    alignSelf: 'flex-start',
  },
  toggleButton: { paddingVertical: space.sm, paddingHorizontal: 22, borderRadius: radius.pill },
  toggleButtonOn: { backgroundColor: colors.accent },
  toggleText: { fontWeight: '700', color: colors.dim },
  toggleTextOn: { color: colors.onAccent },
  mapWrap: { alignItems: 'center' },
  legend: { flexDirection: 'row', alignItems: 'center', gap: 14, flexWrap: 'wrap' },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendSwatch: { width: 14, height: 14, borderRadius: 7 },
  legendText: { ...type.small },
  note: { ...type.small },
  spacer: { height: 220 },
});
```

Replace `app/PlanScreen.tsx` with:

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
import { colors, radius, space, type } from './theme';
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
            <Text style={[styles.primaryText, !isAnswered(screening) && styles.primaryTextOff]}>{BUILD_PLAN}</Text>
          </Pressable>
          {!isAnswered(screening) && <Text style={styles.hint}>{BUILD_HINT}</Text>}
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: space.lg, paddingTop: space.sm, gap: space.md, paddingBottom: 32 },
  gate: { gap: space.xs },
  gateHeading: { ...type.title },
  gateText: { ...type.body },
  request: {
    gap: space.lg,
    padding: space.lg,
    borderRadius: radius.md,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
  },
  requestHeading: { ...type.heading, fontSize: 18 },
  primary: { alignItems: 'center', paddingVertical: 15, borderRadius: radius.pill, backgroundColor: colors.accent },
  primaryOff: { backgroundColor: colors.raised },
  primaryText: { fontSize: 16, fontWeight: '800', letterSpacing: 0.4, color: colors.onAccent },
  primaryTextOff: { color: colors.muted },
  secondary: { alignItems: 'center', paddingVertical: 13, borderRadius: radius.pill, backgroundColor: colors.raised },
  secondaryText: { fontSize: 15, fontWeight: '700', color: colors.text },
  hint: { ...type.small, textAlign: 'center' },
});
```

Replace `app/EvidenceScreen.tsx` with:

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
import { colors, radius, space, type } from './theme';

/** What the model rests on, and where it stops. The limits card is part of the screen, not an extra. */
export default function EvidenceScreen() {
  const { width } = useWindowDimensions();
  // Page padding (16) and the card's border (1) and padding (16), on each side.
  const chartWidth = Math.min(width - 66, 360);
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
  content: { padding: space.lg, paddingTop: space.sm, gap: space.md, paddingBottom: 32 },
  heading: { ...type.title },
  intro: { ...type.body },
  card: {
    gap: space.sm,
    padding: space.lg,
    borderRadius: radius.md,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardHeading: { ...type.heading, fontSize: 17 },
  body: { ...type.body },
  limits: { backgroundColor: colors.warnBg, borderColor: colors.warnBorder },
  limitsHeading: { ...type.heading, fontSize: 17, color: colors.warnText },
  limitText: { fontSize: 14, lineHeight: 20, color: colors.warnText },
  footnote: { ...type.small },
});
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
import { INDEPENDENT_LINE } from './app/planCopy';
import { colors, space, type } from './app/theme';
import { useSoreSpot } from './app/useSoreSpot';

export default function App() {
  const spot = useSoreSpot();
  const [tab, setTab] = useState<Tab>('body');

  return (
    <View style={styles.root}>
      {/* The label and the disclaimer sit outside the tabs, so they are always visible. */}
      <View style={styles.header}>
        <Text style={styles.title}>Sore Spot</Text>
        <Text style={styles.independent}>{INDEPENDENT_LINE}</Text>
        {spot.replay.synthetic && <Text style={styles.banner}>{SYNTHETIC_BANNER}</Text>}
      </View>

      {/* All three tabs stay mounted, so switching keeps the day, side and plan answers. */}
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
      <StatusBar style="light" />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  header: { paddingTop: 56, paddingHorizontal: space.lg, paddingBottom: space.sm, gap: space.xs },
  tab: { flex: 1 },
  hidden: { display: 'none' },
  footer: {
    paddingHorizontal: space.lg,
    paddingVertical: space.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.card,
  },
  title: { ...type.title },
  independent: { ...type.small },
  banner: { fontSize: 11, fontWeight: '800', letterSpacing: 1.2, color: colors.banner },
  note: { ...type.small },
});
```

Replace `app.json` with:

```json
{
  "expo": {
    "name": "sore-spot",
    "slug": "sore-spot",
    "version": "1.0.0",
    "orientation": "portrait",
    "icon": "./assets/icon.png",
    "userInterfaceStyle": "dark",
    "ios": {
      "supportsTablet": true
    },
    "android": {
      "adaptiveIcon": {
        "backgroundColor": "#E6F4FE",
        "foregroundImage": "./assets/android-icon-foreground.png",
        "backgroundImage": "./assets/android-icon-background.png",
        "monochromeImage": "./assets/android-icon-monochrome.png"
      },
      "predictiveBackGestureEnabled": false
    },
    "web": {
      "favicon": "./assets/favicon.png"
    }
  }
}
```

- [ ] **Step 4: Run the whole suite, typecheck and the web export**

Run: `npm test && npm run typecheck && npx expo export --platform web --output-dir /tmp/ui-export`
Expected: 30 test files, 288 tests pass (the 284 after Task 1 plus 4 wiring tests); typecheck prints no errors; the export ends with `Exported: ...`. Then `rm -rf /tmp/ui-export` and confirm `git status --short` shows only the nineteen files of this task (2 new, 17 replaced) and no `dist/` folder.

- [ ] **Step 5: Prove the wiring tests can fail**

Break each line on purpose, run `npx vitest run app/honesty.test.ts`, and restore from a backup:
```bash
cp app/components/TabBar.tsx /tmp/tabbar.bak
sed -i "s/letterSpacing: 0.6, textTransform: 'uppercase', color: colors.muted/letterSpacing: 0.6, textTransform: 'uppercase', color: '#FFFFFF'/" app/components/TabBar.tsx
npx vitest run app/honesty.test.ts
cp /tmp/tabbar.bak app/components/TabBar.tsx
cp App.tsx /tmp/app.bak
sed -i 's/<StatusBar style="light" \/>/<StatusBar style="dark" \/>/' App.tsx
npx vitest run app/honesty.test.ts
cp /tmp/app.bak App.tsx
cp app/BodyMapScreen.tsx /tmp/bodymap.bak
sed -i 's/<SummaryStrip day={dayForecast} dayText={dayText} \/>//' app/BodyMapScreen.tsx
npx vitest run app/honesty.test.ts
cp /tmp/bodymap.bak app/BodyMapScreen.tsx
npx vitest run app/honesty.test.ts
```
Expected: the first, second and third runs FAIL (the no-hex-colour test; the shell test; the summary strip test); the fourth passes. Confirm `git diff --stat` shows no change to those three files. Paste all four outputs.

- [ ] **Step 6: Commit**

```bash
git add app App.tsx app.json
git commit -m "$(cat <<'EOF'
Restyle every screen onto the dark theme and add the body map summary strip

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

## Self-Review

**Spec coverage:**
- Theme tokens, spacing, radii and type presets; band colours from the theme: Task 1.
- Contrast tests (text 4.5:1, bands apart, bands against the silhouette, the selection outline): Task 1.
- Summary strip logic and spoken label: Task 1; the strip on the Body map: Task 2.
- Every screen and component restyled with no change to props, roles, handlers or copy: Task 2 (whole-file replacements; the wiring tests, the existing suite and the controller's browser drive guard behavior).
- Tab icons, light status bar, `app.json` dark: Task 2.
- The independent-prototype line under the title and its test: Tasks 1 (the constant) and 2 (the shell and its wiring test).
- No hex colours in screens or components: Task 2 (wiring test).
- Non-goals respected: no engine, data, copy or dependency change; no light theme; no brand assets.
- The browser drive, the before/after screenshots and the phone check are controller and user steps after the tasks, as in earlier sub-projects.

**Type consistency:** every name is defined once (Task 1, then Task 2) and used with the same signature, because all blocks come from one verified copy.

**Known limits, stated plainly:** contrast is computed and reviewed in screenshots, not checked on a device; the traffic-light colours replace the earlier calm teal ramp by design; the restyle is dark only.
