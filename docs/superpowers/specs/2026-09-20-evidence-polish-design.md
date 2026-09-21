# Sore Spot: Evidence Tab, Accessibility Polish, README and Demo Runbook (Sub-project C2)

**Date:** 2026-09-20
**Status:** Defaults approved in chat; written spec and plan pending review
**Builds on:** the plan screen (`2026-09-20-plan-screen-design.md`, branch `feat/plan-screen`), and through it the plan engine, B1 and B2.
**Roadmap:** B1, B2, C1a, C1b (done) -> **C2 (this spec: Evidence tab, accessibility polish, README, demo runbook)** -> D (WHOOP export script).

## Goal

Make the third proof of the pitch ("it is grounded in the research, with honest limits") visible in the app, tidy the accessibility state so it actually reaches screen readers, and give the repository a README and a rehearsable demo runbook. No engine change, no new feature beyond the tab.

## Non-goals

Any new data source or real WHOOP data (D); persistence; an LLM; a safe-area package; VoiceOver testing on a device; the `/brag` video; new engine behavior.

## Behavior

### Evidence tab
A third tab, **Evidence**, in the shell next to **Body map** and **Plan**. Like the others it stays mounted and is hidden when inactive. It shows, in order:
1. A heading and one-paragraph intro.
2. **Soreness has a timeline:** the published pattern in words (builds within about a day, peaks around 1 to 3 days, fades by about a week) and a chart. **The chart is drawn from the engine's own `timecurve` function**, sampled every 6 hours over 8 days, with a marker at the peak, day ticks 0 to 8 and axis labels. The text says the curve is a hand-tuned approximation, not a measurement.
3. **New work hurts more:** the repeated bout effect and how the model uses it. The numbers in the text (the 28-day window and the cap of 3) are interpolated from the engine's constants so they cannot drift.
4. **Lowering and braking work:** why lengthening work is weighted higher and heavy lengthening work is kept off sore muscles.
5. **Stretching is not a soreness fix:** the finding, with the two reviews the handoff names (Herbert and colleagues, 2011; Dupuy and colleagues, 2018), and the app's own honesty line. Stretches are labelled range-of-motion work; foam rolling and light movement are comfort ideas with mixed evidence.
6. **Easing in is the main lever:** why the plan, not a stretch, is the main tool.
7. **How comfort ideas are labelled:** the existing two evidence labels and notes, reused from `app/copy.ts` (one source).
8. **Where this stops:** seven limits, in an amber card. Not checked against real soreness logs (and no claim about how often the app is right); hand-set numbers; `SYNTHETIC DATA` is made up; recovery cutoffs unchecked against WHOOP's zones; the libraries still need a trainer or physical therapist; independent prototype not affiliated with WHOOP; wellness guidance, not medical advice.
9. A footnote: "Summarised from published reviews. The primary papers are still being checked." It is one constant (`EVIDENCE_FOOTNOTE`) to delete once the primary papers are confirmed.

**No invented numbers or citations.** Every claim is taken from the handoff's evidence table; only the two named reviews are cited.

### Accessibility polish
- The tab bar uses `tablist` and `tab` roles with `aria-selected`.
- Single-choice groups become `radiogroup` and `radio` with `aria-checked`: the Front/Back toggle, the check-in levels, the plan request chips (goal, days, equipment) and the two Yes/No health questions. "None of these apply" becomes a `checkbox` with `aria-checked`, like the six red-flag rows it excludes.
- **Selected and checked state uses `aria-*` props, not `accessibilityState`.** The browser drive found that react-native-web 0.86 ignores `accessibilityState` for selected and checked, so the state never reached the DOM (only `disabled` did). The `aria-*` props work on the web and on iOS. A wiring test forbids `accessibilityState={{ selected|checked`.
- The chart text uses the app's sans-serif font on web (SVG text otherwise falls back to a serif face) and the peak label is placed clear of the axis title; a drive check asserts both.

### README and demo runbook
- `README.md` replaces the one-line README on the remote `main` when the branches are reconciled: what it is, the independent-prototype and not-affiliated statement, the three tabs, how it works (rules decide), the guardrails, how to run it, layout, data and privacy, honest limits, status, MIT license. It says the export of real WHOOP history is not built yet.
- `docs/DEMO.md` maps the handoff's 3-minute beat sheet to exact taps, with the fallback ladder, the say-this-not-that table, and pre-meeting to-dos. Its quoted facts are checked against the real engine output by a test: which muscles are High Now, the plan's day titles, the Sunday note when Wednesday is tagged Upper body (and its return to "new for you" when tagged Lower body), and Thursday's exercises. The do-not-say table quotes banned claims on purpose, so that one section is excluded from the docs' banned-word scan.

## Structure

```
app/evidence.ts                     curve series from the engine, peak, chart geometry (pure)
app/evidenceCopy.ts                 every Evidence string; novelty numbers from engine constants
app/evidence.test.ts
app/components/TimeCurveChart.tsx   the chart (react-native-svg)
app/EvidenceScreen.tsx              the screen
app/components/TabBar.tsx           three tabs, tab roles (existing, rewritten)
app/planCopy.ts                     + the Evidence tab label (existing, rewritten)
App.tsx                             mounts the third tab (existing, rewritten)
app/components/ChipRow.tsx, HealthQuestions.tsx, CheckInPicker.tsx, app/BodyMapScreen.tsx   aria roles and state (existing, rewritten)
app/honesty.test.ts                 + Evidence and aria wiring tests (existing, rewritten)
README.md, docs/DEMO.md, app/docs.test.ts
```

## Testing and verification

1. `evidence`: the series is the engine curve (0 to 192 hours, every 6), builds, peaks at 48 hours and ends at 0; axis ticks 0 to 8; chart geometry (padding, level 1 at the top, level 0 on the axis, one point per sample, the fill closes to the axis) (6 tests). Copy: unique non-empty cards; novelty numbers come from the engine constants; the stretching card says it is not a soreness fix and never that stretching reduces or relieves soreness; the label lines are the move list's own; every limit the pitch must own up to is present; the footnote is present (6 tests).
2. Wiring tests in the honesty scan (3 more): the chart uses `curveSeries()` and the series uses `timecurve`; the screen renders every card, the label lines, the limits card and the footnote; selected and checked state uses `aria-*` and never `accessibilityState`. The shell test also requires the third tab mounted and hidden like the others.
3. `docs`: the README's first lines carry the not-affiliated and not-medical-advice statements, and it names the synthetic data, the limits, the data-handling rule and the three tabs; the runbook covers the ladder, every tab and the check-in labels, and its engine facts match the real output; banned-word and "reduce soreness" scans over both documents (11 tests).
4. Suite: 257 tests in 28 files (231 before). `npm run typecheck` clean. `npx expo export --platform web` builds.
5. Browser drive (headless Edge, 390x844 and 375x667, 210 checks): everything the plan screen drive covers, updated for the new roles, plus: the Evidence tab and its hidden siblings; the chart is drawn, fits the width, labels its axes and peak, does not overlap labels and uses the sans-serif font; every card, the novelty numbers, the stretching card, all seven limits and the footnote are present; the banner, footer and tab bar stay in view (also scrolled); state attributes render (`None of these apply` and the chosen No report `aria-checked`, a ticked flag reports checked, tabs report selected, no button carries `aria-selected`, six radiogroups, seven checkboxes); no console errors.
6. Mutation checks: each of 14 guards was broken on purpose and caught (the curve, the stretching honesty line, a limit, the footnote, the novelty numbers, the limits heading and list, the hidden third tab, the tab, chip and "none" aria props, the README statement and two runbook facts).

## Risks

- **Summaries of published research from secondary sources.** Mitigation: no numbers beyond the handoff's, two named reviews only, the footnote says the primary papers are still being checked, and the pre-meeting checklist says to read them and delete the footnote.
- **The runbook can drift from the app.** Mitigation: the test that checks its quoted facts against the engine.
- **The remote `main` has its own one-line README.** This README replaces it when the branches are reconciled; LICENSE and PRIVACY.md stay.
- **Accessibility is improved but untested with VoiceOver.** Deferred.

## Definition of done

Typecheck clean, all tests pass, the web bundle builds, the browser drive passes at both sizes. On the phone: a third **Evidence** tab shows the curve chart, the cards and the amber "Where this stops" card; the plan form and check-in controls behave as before. `README.md` and `docs/DEMO.md` exist and their tests pass.
