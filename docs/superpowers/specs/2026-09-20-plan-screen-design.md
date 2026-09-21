# Sore Spot: Plan Screen, Health Screens, Navigation and Shared State (Sub-project C1b)

**Date:** 2026-09-20
**Status:** Built and reviewed on `feat/plan-screen`; 231 tests, final review clean (no Critical)
**Builds on:** the plan engine and guardrails (`2026-09-20-plan-engine-design.md`, branch `feat/plan-engine`), B1 and B2 (unmerged; C1b is stacked on C1a).
**Roadmap:** B1, B2, C1a (done) -> **C1b (this spec: the Plan tab, health screens, navigation, shared state)** -> C2 (evidence panel, polish, README) -> D (WHOOP export script).

## Goal

Put the plan engine in front of the member. A second tab shows the health questions, the plan request and the resulting 7-day plan, or the reason there is none. The body map tab keeps working exactly as before, and both tabs read the same tags, check-ins and forecast. No engine change.

## Non-goals

The evidence panel, README and visual polish (C2); persistence of any kind; an LLM or free text; VoiceOver work; safe-area insets; a navigation library.

## Behavior

### Shell and navigation
- Two tabs, **Body map** and **Plan**, in a bottom bar driven by plain state. No navigation library.
- The title, the "SYNTHETIC DATA" banner (when the replay is synthetic) and the disclaimer footer live in the app shell, outside the tabs, so they are always visible.
- Both tabs stay mounted; the inactive one is hidden. Switching tabs keeps the body map's day and side, and the Plan tab's answers and result.

### Shared state
- The forecast pipeline (tags -> default forecast -> check-in sensitivity -> forecast, plus the list of still-untagged sessions) is a pure function, `buildForecastState`. Check-ins are rebuilt from the default sensitivity each time, so they never stack. A hook, `useSoreSpot`, holds the replay, tags and check-ins and exposes the derived state to both tabs.
- `BodyMapScreen` takes that state as a prop instead of owning it. Its behavior does not change.

### Plan tab flow
1. **Tag gate.** If any strength session is untagged, the tab first shows why and the tag prompt. The member can tag the sessions (the gate lifts when none are left) or choose **Plan without these**. Skipping is allowed because the engine already tells the member that some workouts are not counted.
2. **Health screen.** The six red-flag checks are shown as tick boxes under the engine's own prompt (`RED_FLAG_PROMPT`) with the engine's wording (`RED_FLAG_QUESTIONS`), plus **None of these apply**, then "Are you under 18?" and "Do you have a medical condition...?" as Yes/No, all with the engine's wording. **Every answer starts unanswered** (`null`), never "no". Ticking a flag clears "None of these apply" and the reverse; unticking the last flag returns to unanswered, not to "none".
3. **Request.** Goal (Build muscle, Get stronger, Lose weight), training days (3 to 7) and equipment (Bodyweight, Dumbbells, Gym), defaulting to muscle, 4 days, gym. "Lose weight" and 6 or 7 days are offered on purpose: the guardrails decline them with their reason, so the boundary is visible.
4. **Build my plan** is disabled until all three health questions are answered, with a hint saying why. Pressing it runs `planOrGuardrail` and nothing else; the screen never calls `buildPlan` directly.
5. **Result.** Either a "No plan for now" card with the engine's message (red flag, under 18, medical condition, or the decline reason), or **Your next 7 days**: week-level notes, then one card per day (weekday and "tomorrow"/"in N days", title, each exercise with "N sets of X reps" (or seconds) and its effort and note, and the "why" bullets), then `PLAN_DISCLAIMER`. **Change answers** returns to the form with the answers kept. The form and the result each open at the top.
6. The result is derived on every render from the current state, so a tag or check-in made later can never leave a stale plan on screen.

### Copy and honesty
- Every string in the new screens comes from the engine text files or from `app/planCopy.ts`. The existing app honesty scan (banned words, "reduce/relieve soreness") covers all new files automatically.
- Wiring tests pin the required lines: `PLAN_DISCLAIMER` and `result.message` in the result view; `RED_FLAG_PROMPT`, `RED_FLAG_QUESTIONS`, `UNDER_18_QUESTION` and `MEDICAL_CONDITION_QUESTION` in the health screen; `initialScreening` as the starting state and no pre-answered "no" literal in the screens; `planOrGuardrail` and no `buildPlan` in the plan flow; the banner, disclaimer, tab bar and both mounted tabs in `App.tsx`.

## Structure

```
app/forecastState.ts     buildForecastState(workouts, tags, checkIns, asOf) -> { tagged, forecast, sensitivity, untagged }
app/screening.ts         Screening (null = unanswered), initialScreening, toggleRedFlag, answerNoRedFlags, answerUnder18,
                         answerMedicalCondition, eligibilityOf, isAnswered
app/planFlow.ts          options, DEFAULT_CHOICE, computePlan (-> planOrGuardrail), planDayHeading, setsAndReps
app/planCopy.ts          the screen strings that are not in the engine
app/useSoreSpot.ts       shared state hook and SoreSpot type
app/components/          ChipRow, HealthQuestions, PlanResultView, TabBar (new)
app/PlanScreen.tsx       gate -> form -> result
app/BodyMapScreen.tsx    now takes { spot } (existing file, refactored)
App.tsx                  shell: header, both tabs, footer, tab bar (existing file, rewritten)
app/honesty.test.ts      + wiring tests (existing file, extended)
```

## Testing and verification

1. `forecastState`: the untagged demo session is listed with a recognizable label; tagging it clears the prompt and changes the forecast; inputs are not mutated; a check-in nudges sensitivity from the default and repeating it never stacks (4 tests).
2. `screening`: starts fully unanswered; finished only when all three are answered; red-flag order and mutual exclusion with "none"; unticking the last flag is unanswered; no mutation; eligibility passed to the engine exactly as answered (6 tests).
3. `planFlow`: the demo-week plan on "no" answers (with the history note, and without it once tagged); never a plan while any of the three answers is missing (each tested alone); each red flag, under 18 and medical condition stop; a weight goal and 6 or 7 days are declined; every goal, 3 to 5 days and equipment the engine accepts builds a plan; day headings and sets wording (9 tests).
4. Wiring tests in the honesty scan (8 tests), including that Build stays disabled until answered, that every red flag is rendered, that the disclaimer sits only in the plan branch and the message only in the blocked branch, that both tabs are hidden rather than unmounted, and that `buildPlan` appears nowhere in the app.
5. Suite: 231 tests in 26 files (204 before). `npm run typecheck` clean. `npx expo export --platform web` builds.
6. Browser drive (headless Edge, 390x844 and 375x667, 132 checks, including: build a plan, tag a session on the body map, return, and the plan has updated): tabs and hidden body map; the gate and skipping it; nothing pre-answered; Build disabled until all three answered (also when two of three are); the demo plan (Sun tomorrow, easy day, rest day, back squat, why bullets, incomplete-history note, disclaimer); Change answers keeps answers; under 18, a red flag, a medical condition, 6 days and a weight goal each give no plan and their message; unticking the last flag is unanswered; strength with bodyweight builds; tabs keep state; tagging from the gate lifts it and drops the note; the form and result open at the top; the banner, footer and tab bar stay in view; the body map sheet still opens; no console errors.
7. Mutation checks: each of 25 wiring and logic lines was broken on purpose and caught (unanswered start state, unticking to "none", finished-check, red-flag order, red flags defaulting to none, eligibility defaulting to no, timed-hold wording, check-ins ignored, disclaimer, blocked message, health prompt, pre-answered start state in the screen, shell disclaimer). One first survived (a null red-flag screen quietly becoming "none" was hidden by the empty eligibility answers) and got its own test.

## Risks

- **A member could skip the tag gate and get a plan built on partial history.** Mitigation: the plan carries the engine's "some workouts are not counted" note.
- **Health answers are in memory only.** Deliberate: each launch asks again. A later persistence decision needs its own review.
- **The plan starts tomorrow relative to the fixed demo time.** Documented behavior of the engine; a live version would re-plan each morning.
- **Accessibility is basic** (roles, labels, selected and checked states) and untested with VoiceOver. Deferred to C2.

## Definition of done

Typecheck clean, all tests pass, the web bundle builds, the browser drive passes at both sizes. On the phone: the Plan tab asks about the untagged session, then the health questions (all empty), builds the demo plan on "no" answers (Sun upper, Mon easy, Tue rest, Wed upper, Thu lower, Fri and Sat rest), and shows a clinician message and no plan for any red flag, under 18 or a medical condition. Tags and check-ins made on either tab show on the other.
