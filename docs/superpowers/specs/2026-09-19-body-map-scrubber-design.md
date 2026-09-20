# Sore Spot: Body Map and Time Scrubber (Sub-project B1)

**Date:** 2026-09-19
**Status:** Defaults approved in chat; written spec pending review
**Builds on:** `2026-09-19-engine-foundation-design.md` (engine, replay loader, synthetic demo week; merged to `master` at `ac4c1f7`)
**Roadmap:** B1 (this spec) -> B2 (check-in + mobility library) -> C1 (plan engine + guardrails) -> C2 (evidence panel, polish, README) -> D (WHOOP export script). Each gets its own spec, plan and reviewed build.

## Goal

Replace the hello screen with the app's first real screen: a front/back body map whose 12 muscle zones are colored by predicted soreness band, a scrubber that moves through the 8-day forecast so the heatmap visibly rises and fades, and a tap-a-zone sheet that explains the prediction in plain language. Works in Expo Go on an iPhone and in a browser.

## Non-goals

Soreness check-in and sensitivity nudges, mobility/comfort recommendations, strength-session tagging UI, plan generation, guardrails/red-flag screen, evidence panel, haptics, animations, notifications, persistence, navigation between screens. (B2, C1, C2, or cut first.)

## Behavior

- **Screen:** a single screen, `BodyMapScreen`, replaces `HelloScreen`.
- **Data:** `loadReplay()` -> `computeForecast(workouts, DEMO_AS_OF, defaultSensitivity())`, computed once. `DEMO_AS_OF = 2026-09-19T20:00:00Z` (as in the hello screen). `byDay[d]` is the state at `DEMO_AS_OF + d days`.
- **Body map:** Front/Back toggle. Each zone colors by the band of the selected day. A muscle that appears on both views (calves) shows the same color on both.
- **Scrubber:** 8 stops, Now and +1d to +7d, each labeled with its UTC weekday. Tap a stop or drag across the track to choose it. The map recolors immediately.
- **Tap a zone:** opens a sheet (a plain absolutely positioned panel, no library) with the muscle name, its band, and the reasons. Reasons come from the forecast's `drivers`:
  - `novel`: "New or bigger than your recent routine."
  - `eccentric`: "Includes lengthening work (downhill, decelerating, lowering), which drives soreness most."
  - `high-load`: "A lot of total work for this muscle."
  - Low band, no drivers: "No notable soreness predicted."
  The sheet closes via a close button or by tapping the backdrop.
- **Honest labeling, always visible:**
  - A `SYNTHETIC DATA` banner whenever `replay.synthetic` is true.
  - A one-line note: "Predicted from your workouts, not measured. General wellness guidance, not medical advice."
  - Band names only: "Low", "Moderate", "High" predicted soreness. No scores, percentages or accuracy claims. Never "diagnosis".
- **Untagged strength:** if `forecast.needsTag.length > 0`, show "N strength session(s) have no muscle tag, so they are not counted." (The tagging UI is B2.)
- **Colors:** one sequential teal ramp so the map does not read as an alarm: low `#E3EEEC`, moderate `#7DBDB2`, high `#1E7A6C`. Color is never the only signal: a legend shows the three bands, zones carry accessibility labels ("Quads, moderate predicted soreness"), and the sheet states the band in words. A selected zone gets a dark outline.

## Structure

Pure logic (unit-tested with Vitest, no React Native imports) is separated from components (verified by typecheck, web export and the user's phone).

```
app/config.ts               DEMO_AS_OF
app/copy.ts                 muscle labels, band labels, driver explanations, disclaimer text (pure)
app/scrubber.ts             dayLabel(asOf, d), dayIndexFromX(x, width, days) (pure)
app/body/colors.ts          bandColor(band), the ramp and legend entries (pure)
app/body/zones.ts           SVG path data per view (front/back) for each Muscle (pure data)
app/components/BodyMap.tsx      react-native-svg: draws zones, handles taps, selection outline
app/components/DayScrubber.tsx  track of 8 stops; tap + drag (PanResponder) -> day index
app/components/MuscleSheet.tsx  the explanation panel
app/BodyMapScreen.tsx       state (view, day, selected muscle), layout, banner, notes, legend
App.tsx                     renders BodyMapScreen (HelloScreen is deleted; this replaces it)
```

Dependency: `react-native-svg`, installed with `npx expo install react-native-svg` so Expo picks the SDK 57 compatible version (it ships in Expo Go).

## Testing and verification

Vitest include widens to `app/**/*.test.ts` (pure logic only). Tests:

1. `zones`: every one of the 12 `Muscle` values has a path in at least one view; front and back path sets are non-empty; every path string is well-formed (starts with `M`, contains only path commands and numbers).
2. `colors`: three distinct colors, one per band; `bandColor` covers every `RiskBand`.
3. `scrubber`: `dayIndexFromX` maps the left edge to 0, the right edge to 7, clamps outside the track, and rounds mid-points to the nearest stop; `dayLabel` gives "Now" for 0 and the UTC weekday for the rest, deterministically.
4. `copy`: every `Muscle`, `RiskBand` and `Driver` has text; no text contains banned claims ("diagnos", "accura", "clinically", "prevent"), so the honesty rule is enforced by a test.

Non-test verification, in order: `npm run typecheck`; `npm test`; `npx expo export --platform web`; a scratch render of the zone paths to an image (a dev-time check outside the project, using a rasterizer installed in a scratch folder) so the body art is inspected before the phone; then the user opens it in Expo Go and confirms the map, the scrubber and the sheet.

## Risks

- **Hand-drawn body art may look crude.** Mitigation: draw simple geometric zones, render them to an image and iterate before the phone check. Fallback: a schematic of rounded blocks. The art is data in one file, so it can change without touching logic.
- **Drag on the scrubber differs between iOS and web.** Mitigation: tap works alone as a fallback; drag is built on `PanResponder`, which react-native-web supports.
- **`onPress` on SVG paths.** Supported by react-native-svg on native and web; if a platform misbehaves, wrap zones in transparent `Rect` hit areas.
- **UTC weekday labels** can differ from a phone's local weekday near midnight. Chosen for determinism; noted, not a bug.

## Definition of done

Typecheck clean, all tests pass, web export builds, and the user confirms on the phone that the map shows the expected pattern: at Now, the legs (quads, glutes, hamstrings, calves) are already colored from the recent sessions; adductors turn moderate from day 1 (the soccer match); upper-body zones stay low; dragging to +7d fades the legs; tapping quads opens the sheet with "novel" and "eccentric" reasons.

## Amendments (2026-09-19, found while building)

These change the spec above; where they conflict, this section wins.

- **Sheet:** no backdrop. It closes with its Close button or by tapping the selected zone again, and it follows the scrubber, so dragging with the sheet open shows how that muscle fades. This keeps the scrubber usable while the sheet is open.
- **Layout order:** title, synthetic banner, forecast time, Front/Back toggle, scrubber, map, legend, notes. The sheet overlays the bottom of the screen.
- **Scrubber on web:** the track sets `userSelect: 'none'`, because otherwise a mouse drag starts a text selection and react-native-web cancels the pan. Cells use `pointerEvents="none"` so `locationX` is relative to the track.
- **Extra pure helpers:** `mirrorPath` builds each right-side zone from its left-side path; `musclesInView` lists a view's zones; `BAND_ORDER` orders the legend.
- **Tests:** 26 new (copy 8, scrubber 7, colors 4, zones 7). The suite is 74 tests in 12 files.
- **Fixed header and footer (from the final review):** the title and the SYNTHETIC DATA banner sit in a fixed header, and the disclaimer in a fixed footer, both outside the ScrollView, so both stay visible at every scroll position on phone-sized screens (checked at 390x844 and 375x667). The sheet is anchored above the footer.
- **Unmapped sports:** the screen also shows a note when `forecast.unmappedSports` is not empty (`unmappedNote` in `copy.ts`), so sports the engine cannot map are reported instead of silently dropped.
- **Front/Back and the sheet:** switching views closes the sheet unless its muscle is drawn in the new view (`hasMuscle` in `zones.ts`).
- **Close button:** `hitSlop` of 12 for a larger touch target.
- **Deferred:** VoiceOver support for zones and the scrubber (adding an `accessible` prop makes react-native-web render zones as HTML buttons, which hides them, so it needs a device test); PanResponder hardening against the parent ScrollView on iOS, pending the phone check; safe-area insets; and on very small screens the open sheet can cover the selected zone.
- **Tests:** 4 more (hasMuscle 3, unmappedNote 1). The suite is 78 tests in 12 files.
