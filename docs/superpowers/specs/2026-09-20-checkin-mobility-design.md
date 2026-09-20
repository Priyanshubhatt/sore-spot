# Sore Spot: Check-in, Mobility Library and Session Tagging (Sub-project B2)

**Date:** 2026-09-20
**Status:** Defaults approved in chat; written spec pending review
**Builds on:** `2026-09-19-body-map-scrubber-design.md` (B1, on branch `feat/body-map`, not yet merged to `master`; B2 is stacked on it) and the engine (`2026-09-19-engine-foundation-design.md`).
**Roadmap:** B1 -> **B2 (this spec)** -> C1 (plan engine + guardrails + red-flag screen) -> C2 (evidence panel, polish, README) -> D (WHOOP export script).

## Goal

Let a member tell the app how a muscle actually feels, get honest comfort and mobility ideas for it, and resolve strength sessions the engine cannot place. Three features on the existing screen: a soreness **check-in** that nudges the prediction, a curated **mobility and comfort library** with evidence tags, and a **tagging flow** for untagged strength sessions.

## Non-goals

Plan generation, the full red-flag screen and guardrail rules (C1), the evidence panel (C2), persistence across launches, notifications, haptics, WHOOP export (D), accessibility actions for the scrubber, a new navigation structure.

## Behavior

### 1. Check-in
- The muscle sheet gets a section "How does it feel today?" with four choices: None, Mild, Moderate, Severe (reported 0 to 3). It is shown only when the scrubber is on **Now**; on other days the sheet says "Check-ins are for today. Slide back to Now."
- A check-in replaces that muscle's previous check-in (in-memory only). The effective sensitivity for a muscle is `applyCheckIn(defaultSensitivity, muscle, predictedBandNow, reported)`, always computed from the **default** sensitivity and the **default-sensitivity** forecast for Now, so re-tapping or changing a choice never stacks nudges. `predictedBandNow` is `byDay[0][muscle].band` from the forecast computed with default sensitivity.
- The forecast is recomputed with the resulting sensitivity, so the map and sheet update. The sheet states what changed in plain words: "Noted. Predictions for quads will lean a little higher / lower." or "...will stay about the same." The step is the engine's 0.1 (clamped 0.5 to 1.5), so one check-in moves a band only near a threshold. The copy says "a little".
- The logged choice is shown selected in the sheet.

### 2. Mobility and comfort library
- About 37 moves in `app/mobility/library.ts`. Each move has `id`, `name`, `kind` (`light-movement` | `self-massage` | `mobility` | `stretch`), target `muscles`, a short `how`, and a `dose`.
- **Evidence tags are derived from the kind, so the app is honest by construction:**
  - `light-movement`, `self-massage`, `mobility` -> `COMFORT` ("Some people find this eases stiffness. Evidence is mixed.")
  - `stretch` -> `ROM` ("Done regularly, stretching improves range of motion. It has not been shown to reduce soreness.")
  - There is no soreness tag and no vascular tag. Blood-flow and oxygen language is deliberately absent (wellness-versus-medical caution); it belongs in C2's evidence panel as "worth testing".
- Coverage: every one of the 12 muscles has at least one COMFORT move and one stretch. The library has between 30 and 40 moves.

### 3. Recommendations in the sheet
- `recommend(muscle, band, reported?)` is pure and deterministic.
  - Effective band: `reported` 3 -> High; `reported` 2 -> at least Moderate; otherwise the predicted band for the day shown.
  - **Comfort ideas:** up to 3 COMFORT moves for the muscle, ordered light movement, then self-massage, then mobility. Shown for Moderate and High. For Low: "Nothing needed for this muscle right now."
  - **For range of motion (regular practice, not a soreness fix):** up to 2 stretches. **Hidden when the effective band is High**, replaced by "Save stretching for when soreness eases."
- Always shown with recommendations: "Stretching hasn't been shown to reduce soreness." and the safety line: "Sharp pain, swelling, numbness or dark urine isn't normal soreness. Stop and see a clinician." (The full red-flag screen is C1.)
- The sheet becomes scrollable with a maximum height of 65% of the body area, so it does not swallow small screens.

### 4. Tagging untagged strength sessions
- When `forecast.needsTag` is not empty, below the legend the screen lists each untagged session ("Wed Sep 16 · Weightlifting") with five choices: Lower body, Upper body, Push, Pull, Full body. Choosing one sets that session's `session_tag` in memory and recomputes both forecasts. Until tagged, the session adds no soreness, and the existing "no muscle tag, so not counted" note stays visible.
- The synthetic demo week gains one **untagged** strength session, `d-wed-strength` (Wed Sep 16, 17:00Z, weightlifting, 60 minutes, same zone minutes as the Tue leg day). Wed is therefore no longer a rest day; only Sun Sep 20 is. Tagging it "Upper body" makes chest, shoulders, upper back and arms turn moderate or higher at Now.

## Structure

Pure logic (Vitest) and components are separated, as in B1.

```
app/copy.ts                       + check-in, evidence, safety, tagging, recommendation text (existing file, extended)
app/checkin.ts                    CHECKIN_LEVELS, sensitivityFromCheckIns(checkIns, baseNow), effectiveBand(predicted, reported?)   (pure)
app/tagging.ts                    TAG_OPTIONS, applyTags(workouts, tags), describeWorkout(workout)                                  (pure)
app/mobility/library.ts           MOVES, evidenceFor(kind)                                                                          (pure data)
app/mobility/recommend.ts         recommend(muscle, band, reported?) -> { comfort, rom, note }                                      (pure)
app/components/CheckInPicker.tsx  four choices, selected state, result message
app/components/MoveList.tsx       renders comfort ideas, range-of-motion ideas, notes, evidence text
app/components/TagPrompt.tsx      untagged session list with five tag choices
app/components/MuscleSheet.tsx    composes reasons + check-in + recommendations; scrollable, max height 65%
app/BodyMapScreen.tsx             state: checkIns, tags; base and effective forecasts; passes props
data/replay.synthetic.ts          + d-wed-strength (untagged)
```

No new dependencies. `/engine` is unchanged.

## Data flow

`replay.workouts` -> `applyTags(workouts, tags)` -> `computeForecast(..., defaultSensitivity())` = **base** -> `sensitivityFromCheckIns(checkIns, base.byDay[0])` = **sensitivity** -> `computeForecast(..., sensitivity)` = **forecast** (what the map shows). Both forecasts are memoized on `[tagged, checkIns]`.

## Copy and honesty

- All new user-facing strings live in `app/copy.ts`, so the honesty test scans them. The banned-word test also gains a **source scan**: it reads `app/**/*.tsx` and `app/**/*.ts` (excluding tests) and asserts no banned word appears anywhere in the app source. This closes the gap noted in the B1 final review.
- Banned words: `diagnos`, `accura`, `clinical`, `prevent`, `cure`, `validated`, `treat` (as in B1), plus `boost`, `oxygen` and `blood flow`.
- The phrase "reduce soreness" (or "relieve soreness") may appear only in a sentence that also says "not been shown", so no string can claim a soreness benefit. The test enforces this over every user-facing string and over the app source scan.

## Testing and verification

Vitest (pure logic):
1. `checkin`: `sensitivityFromCheckIns` is idempotent and does not stack (same input twice = same output), nudges the right muscle only, respects the 0.5 to 1.5 clamp, and matches `applyCheckIn` for one muscle; `effectiveBand` follows the rules above.
2. `tagging`: `applyTags` sets tags without mutating the input and leaves other workouts alone; `describeWorkout` gives a UTC "Wed Sep 16 · Weightlifting" string.
3. `library`: 30 to 40 moves, unique ids, all fields non-empty, every muscle has a COMFORT move and a stretch, evidence derived from kind, no soreness/vascular tag can exist.
4. `recommend`: ordering by kind, at most 3 comfort and 2 range-of-motion moves, stretches hidden and the note shown for High and for reported Severe, "nothing needed" for Low, deterministic.
5. `copy`: new strings pass the banned-word scan; source scan over `app/**` passes; check-in message strings for higher, lower and same.
6. Synthetic data: `d-wed-strength` exists, has no tag, is weightlifting; Sun Sep 20 is the only rest day; the engine reports it in `needsTag`.

Non-test: `npm run typecheck`, `npm test`, `npx expo export --platform web`, then a scripted browser drive at 390x844 and 375x667 (open quads sheet, see comfort ideas and no stretches because Quads is High at Now; choose a check-in and see the message; tag the Wed session "Upper body" and see chest turn non-low; banner and disclaimer still visible; sheet scrolls), then the user's iPhone.

## Risks

- **Library content is wellness advice, hand-written.** Mitigation: general, gentle instructions with "stop if sharp pain", no medical or soreness claims, evidence tags from kind, a trainer or PT review flagged before any demo (handoff open item 4).
- **A single check-in barely moves a band.** Mitigation: honest message ("a little"); the mechanism is in place for repeated use; the engine step is not changed.
- **A tall sheet on small phones.** Mitigation: `maxHeight` 65% and an inner scroll. Very small screens still lose part of the map while it is open (already noted in B1).
- **Changing the synthetic data** touches existing tests (rest-day assertion). They are updated in the same task.

## Definition of done

Typecheck clean, all tests pass, web export builds, the scripted drive passes, and the user confirms on the phone: tapping quads at Now shows reasons, a check-in row, comfort ideas (an easy walk, foam rolling, small leg swings) with the "not shown to reduce soreness" and safety lines, and no stretches; choosing Moderate for quads shows "Noted. Predictions for quads will lean a little lower."; the "1 strength session has no muscle tag" note has a Wed Sep 16 entry, and tagging it Upper body turns chest, shoulders and upper back non-low.

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

## Amendments (2026-09-20, from the final review)

- **Advice follows the day:** a check-in shapes the recommendation band only on Now. On other days the advice uses the predicted band for the day shown, so the sheet header and the list never contradict each other.
- **Safety line placement:** the clinician safety line now sits in the sheet's fixed area above the scrolling content, so it is visible as soon as a sheet opens (checked at 375x667). A Severe check-in also shows a short acknowledgement (`CHECKIN_SEVERE_ACK`, via `checkInFeedback`): thanks, severe soreness is worth taking seriously, and if it is sharp, swollen or numb, stop and see a clinician. It is acknowledgement, not advice. `MoveList` no longer repeats the safety line.
- **Ease-off cue:** one line per move list ("Ease off if a move hurts or pinches.", `MOVE_CUE`) instead of a cue on all 37 cards, plus explicit boundaries in four library moves: the hamstring roll stops above the back of the knee, the upper-back roll supports the head, and the doorway chest stretch and wall biceps stretch carry a pinch cue.
- **Tests:** 6 more (copy 3, library 1, honesty 2). The suite is 123 tests in 17 files. The wiring tests require the rendered `{SAFETY_LINE}`, `{STRETCH_HONESTY}` and `{MOVE_CUE}` usage, not just the import (a mutation check showed an import-only check passed with the line removed).
- **Deferred to C1:** extract the forecast pipeline into a pure, tested function; guard `sensitivityFromCheckIns` against unknown muscles and decide whether an old check-in still applies when persistence arrives; per-move equipment and caution fields in the library; lifting check-in and tag state when a second screen appears. A trainer or PT review of the library is still required before any demo.
