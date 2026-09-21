# Sore Spot: Dark, WHOOP-Inspired Restyle (Sub-project UI)

**Date:** 2026-09-21
**Status:** Built and reviewed on `feat/ui-restyle`; 288 tests
**Builds on:** everything merged to `master` (engine, body map, check-ins, plan, evidence, docs).
**Roadmap:** B1, B2, C1a, C1b, C2 (done, merged) -> **UI (this spec: restyle)** -> D (WHOOP export script).

## Goal

Make the app look like a modern, dark, high-contrast fitness app in the spirit of WHOOP's, without changing any behavior. Every screen gets one shared theme instead of scattered colors. A small summary strip on the body map gives the day's numbers at a glance.

## Non-goals

Any behavior, engine, copy or data change (except the one new line and the strip below); a light theme; a new dependency; custom fonts; onboarding, animation or haptics; anything from WHOOP's brand.

## Brand guardrails

The look is inspired by dark fitness apps in general and **borrows nothing that belongs to WHOOP**: no logo, wordmark, typeface, icon or screen layout copied. The system font is used. Because a WHOOP-like look can read as an official app, **"Independent prototype · not affiliated with WHOOP" sits under the title on every screen**, next to the `SYNTHETIC DATA` banner and above the wellness/not-medical footer. A test requires the line to be rendered in the shell.

## Behavior

### Theme (`app/theme.ts`)
The one place the look is defined. Screens use tokens, never hex codes; a test scans every screen, component and the shell for a hex or rgb(a) colour (three-digit hex included).

| Token | Value | Use |
|---|---|---|
| `bg` | `#0A0B0D` | page |
| `card` | `#14171A` | cards, footer, tab bar |
| `raised` | `#1D2126` | sheets, tracks, idle chips |
| `border` | `#2C3238` | card outlines |
| `text` / `dim` / `muted` | `#F5F6F7` / `#B9C0C7` / `#8E97A0` | text, strongest to quietest |
| `accent` / `onAccent` | `#3BB4F2` / `#04141D` | selected controls, links, and dark text on them |
| `accentSoft` / `accentFill` | `#0F2A38` / `#123245` | evidence tags, chart fill |
| `low` / `moderate` / `high` | `#1F7A63` / `#F2B233` / `#FF5B4D` | soreness bands: a dim green, amber and red |
| `bodyFill` / `selectedOutline` | `#262B31` / `#FFFFFF` | the silhouette and the selected zone |
| `warnBg` / `warnBorder` / `warnText` / `banner` | `#2A1D0B` / `#5A3B0F` / `#F6C77A` / `#F6C77A` | notes, limits, blocked results, the synthetic banner |

Spacing (4, 8, 12, 16, 24), radii (10, 16, pill) and type presets (display, title, heading, body, strong, small, and a small uppercase spaced label) live beside the colors.

### Contrast, tested (`app/contrast.ts`, `app/theme.test.ts`)
Every pairing that carries text meets WCAG AA (4.5:1): the three text colors on all three surfaces, the accent as text on every surface, dark text on the accent, the warning and banner text. Graphics: the accent stands out (3:1) on every surface; each band shows against the body silhouette (2.5:1); **the three bands are at least 1.5:1 apart from each other, so they differ by lightness as well as hue** (colour-blind safe); the selected outline stands out from the body (7:1) and is told apart from every band. The words for each band (High, Moderate, Low) always sit beside its color.

### Screens and components
Restyled onto the theme, with **no change to props, handlers, roles, copy or logic**: the shell (`App.tsx`), Body map, Plan, Evidence, tab bar, day scrubber, muscle sheet, move list, check-in picker, tag prompt, chip rows, health questions, plan result, soreness chart, body map colors. The status bar is light. `app.json` sets the UI style to dark.

- **Tab bar:** three drawn line icons (body, calendar, curve) with the tab label; the selected tab is accent-coloured with a bar on top. Icons are decorative and hidden from screen readers; the label carries the meaning.
- **Body map summary strip (new):** for the day being viewed, three big numerals with a colour bar and the band name (High, Moderate, Low), computed from the forecast already on screen by a pure `summarize`. It reads aloud as "Now: 4 muscles High, 0 muscles Moderate, 8 muscles Low."
- **Traffic-light bands replace the calm teal ramp.** B1 chose a sequential teal ramp so the map would not read as an alarm; this restyle deliberately reverses that (approved), and a test that soreness gets darker as it rises is replaced by the contrast tests above.

## Structure

```
app/contrast.ts, app/theme.ts, app/theme.test.ts      the theme and its contrast tests            (Task 1)
app/summary.ts, app/summary.test.ts                   summarize a day's bands, the spoken label   (Task 1)
app/body/colors.ts, app/body/colors.test.ts           bands take their colors from the theme      (Task 1)
app/planCopy.ts                                       + INDEPENDENT_LINE                          (Task 1)
app/components/SummaryStrip.tsx, TabIcon.tsx          new                                         (Task 2)
app/components/TabBar, BodyMap, DayScrubber, MuscleSheet, MoveList, CheckInPicker, TagPrompt, ChipRow, HealthQuestions, PlanResultView, TimeCurveChart   restyled   (Task 2)
app/BodyMapScreen, PlanScreen, EvidenceScreen, App.tsx, app.json      restyled                    (Task 2)
app/honesty.test.ts                                   + look wiring tests                          (Task 2)
```

## Testing and verification

1. `theme`: the contrast helper (21:1 for black on white, symmetric); every token is a six-digit hex; a mid-tone value pins the WCAG luminance and gamma maths; the theme is dark (bg < card < raised < muted < text in luminance); scales increase; type presets use only text tokens; every contrast pairing above, including the text on the tinted surfaces (16 tests).
2. `summary`: bands sorted into buckets in engine order, every muscle in exactly one bucket; the demo week's counts (4-0-8 now, 4-1-7 tomorrow, 1-4-7 at +4d, 0-0-12 at +6d); no mutation; the spoken label with correct plurals (4 tests). `colors`: order, distinct hex, taken from the theme (3 tests).
3. Wiring in the honesty scan (4 more): no hex or rgb colour in any screen, component or the shell; the decorative tab icons are `aria-hidden` on every platform and the label stays; the shell renders `{INDEPENDENT_LINE}` and a light status bar, and the line says "not affiliated with WHOOP"; the body map renders the summary strip with its `day` and `dayText` props and the band named in words beside each colour, and the strip carries its spoken label. The existing scans (banned words, "reduce/relieve/ease soreness") cover every new file.
4. Suite: 288 tests in 30 files (265 before). `npm run typecheck` clean. `npx expo export --platform web` builds.
5. Browser drive (headless Edge, 390x844 and 375x667, 214 checks): the whole existing drive passes unchanged on the restyled app (behavior, roles, aria state, footer and tab bar in view, chart labels and font, the evidence cards and limits, no console errors).
6. Screenshots: the same 19 screens captured from the old and the new build, for review.
7. Mutation checks: 22 guards broken on purpose and caught (a hex literal in a component, the independent line, the light status bar, the summary strip and its spoken label and band words, an unreadable muted colour, two bands made alike, unreadable dark-on-accent text, an invisible selection outline, the copy of the independent line, a swapped band in `summarize`, a band taking the wrong colour).

## Risks

- **A WHOOP-like look may imply affiliation.** Mitigation: no brand assets, the independent line under the title on every screen, the banner and footer stay, and a test pins the line.
- **Contrast is computed, not seen on a phone.** Mitigation: screenshots reviewed; the user checks it on the iPhone in Expo Go, including outdoors-bright screen.
- **Traffic-light colours can be read as alarm or as good and bad.** Mitigation: the band words sit beside every colour, and the plan's guidance stays in plain wording.
- **Dark only.** A light theme is not offered.

## Definition of done

Typecheck clean, all tests pass, the web bundle builds, the drive passes at both sizes, the before/after screenshots are approved. On the phone the app is dark on every tab, the body map shows the summary strip and the traffic-light zones, and "Independent prototype · not affiliated with WHOOP" is visible under the title.
