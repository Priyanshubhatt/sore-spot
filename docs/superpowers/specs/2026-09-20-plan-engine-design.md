# Sore Spot: Plan Engine and Guardrails (Sub-project C1a)

**Date:** 2026-09-20
**Status:** Defaults approved in chat; written spec and plan pending review
**Builds on:** the engine (`2026-09-19-engine-foundation-design.md`), B1 and B2 (unmerged, on `feat/body-map` and `feat/checkin-mobility`; C1a is stacked on B2).
**Roadmap:** B1, B2 (done) -> **C1a (this spec: pure plan engine + guardrails, no UI)** -> C1b (Plan screen, red-flag and eligibility screens, navigation, shared state) -> C2 (evidence panel, polish, README) -> D (WHOOP export script).

## Goal

Turn the soreness forecast, today's recovery and the member's goals into a safe 7-day training plan with exercises, sets, reps and a plain-language "why" for every choice, and put hard guardrails in front of it. Everything is deterministic TypeScript with tests. **The model proposes, rules decide**: there is no LLM and no backend in C1a.

## Non-goals

Any UI, navigation or persistence (C1b); an LLM or free-text input; nutrition, diet, supplements, weight-loss goals; set or rep logging (WHOOP's Strength Trainer does that); writing plans back to WHOOP; medical advice of any kind.

## Behavior

### Inputs and outputs
- **Request:** `goal` (`muscle` | `strength`), `daysPerWeek` (3 | 4 | 5), `equipment` (`bodyweight` | `dumbbells` | `gym`; each level includes the ones below it).
- **Context:** the soreness `Forecast` (with the member's check-ins and tags already applied), `workouts` (for training history), and `recovery` records (WHOOP v2 recovery shape) up to `asOf`.
- **Output:** a `Plan` with one entry per day for days 1 to 7 after `asOf` (day 1 is tomorrow). Each day is a `training`, `easy` or `rest` entry with a title, `why` bullets and, for training days, exercises (`name`, `sets`, `reps`, `effort`, optional `note`). `Plan.notes` lists week-level decisions (ramp cap, lighter week).

### Schedule and sessions
- Training days from day 1: 3 days -> days 1, 3, 5; 4 days -> 1, 2, 4, 5; 5 days -> 1, 2, 3, 5, 6. Other days are rest days ("Rest days are when your body adapts.").
- Focus per session uses the engine's `StrengthTag` names so a planned session can later be logged with the same tag: 3 days = full, full, full; 4 days = upper, lower, upper, lower; 5 days = push, pull, lower, upper, lower.
- Each focus has five slots by movement pattern: lower = squat, hinge, lunge, calf, core; upper = push-h, pull-h, push-v, pull-v, triceps; push = push-h, push-v, delt, triceps, core; pull = pull-v, pull-h, biceps, delt, core; full = squat, push-h, pull-h, hinge, core. A slot takes the first library exercise for its pattern that fits the equipment and the soreness rules (higher equipment tiers first), avoiding repeats within the week where an alternative exists.

### Exercise library
- 78 exercises (the test allows 60 to 80) in `engine/exercises.ts`, each with `id`, `name`, `pattern`, `primary` muscles (from the engine's 12), `equipment`, an `eccentric` demand (`low` | `moderate` | `high`: how much loaded lengthening the movement involves) and a `hold` flag for timed holds.
- Every equipment level has at least one exercise for every slot pattern, and (except calves) at least one `low`-eccentric option, so a sore member can always get a gentle version.

### Soreness-aware rules (the rules layer decides)
For a session on day `d`, look at `forecast.byDay[d]` for each candidate exercise's primary muscles:
1. **Band Low:** anything is allowed.
2. **Band Moderate:** exercises with `high` eccentric demand are not allowed; others get one set fewer (minimum 2).
3. **Band High:** only `low` eccentric exercises are allowed, one set fewer, effort easier.
4. A slot filled by a gentler substitute (because the preferred exercise was not allowed) counts as **half a slot**; an unfilled slot counts as zero. If the filled share of a session's slots is under 60%, try swapping the focus (lower -> upper; upper -> lower; push -> lower, pull; pull -> lower, push; full -> upper, lower), taking the first alternate with at least 60% of its slots allowed **that is not the same focus as the previous day's session**. If none works, the day becomes an `easy` day (no exercises; comfort ideas live in the app) with a `why` naming the sore muscles.
5. Every applied change is reported in that day's `why` in plain words, naming the muscles.

### Recovery and load rules
- **Recovery level** from the recovery score: `low` 0 to 33, `medium` 34 to 66, `high` 67 to 100 (hand-set constants that follow WHOOP's public recovery zones; the API docs do not define zones, so these are unverified and uncalibrated).
- **Carry-over:** if the most recent scored recovery is `low`, the first training day is an `easy` day.
- **Lighter week:** if 3 or more of the last 7 recoveries are `low`, every set count drops by one (minimum 2), effort is easier, and `Plan.notes` says why.
- **Novelty:** an exercise whose primary muscles have no training load in the last 28 days starts one set lighter (minimum 2) with the note "New for you: start light".
- **Progressive cap:** the number of training days is capped at `max(3, ceil(recent strength sessions per week) + 2)`; if capped, `Plan.notes` says so.
- Base prescription: `muscle` = 3 sets of 8 to 12 (accessories 10 to 15); `strength` = 4 sets of 4 to 6 for compound patterns with a barbell or dumbbells (accessories 8 to 12); bodyweight keeps the muscle prescription; core and holds use timed holds. Effort is "Stop 2 to 3 reps before failure" normally and "Keep it easy" when eased. **Known deviation:** the 4 x 4-6 strength prescription applies to every compound at dumbbell tier or above, including gym machines and cables, not only barbell and dumbbell work; flagged for the trainer or PT review.
- **No back-to-back focus:** a session never has the same focus as the previous day's session. When a swap yesterday leaves today's scheduled focus equal to yesterday's, today takes the first alternate that works (with a "so the same muscles are not trained two days in a row" reason) or becomes an easy day.
- **Loading hamstrings:** high-eccentric lunge-pattern exercises (walking lunge, split squat, rear-foot split squat, step-down) list the hamstrings as primary muscles, so a sore hamstring blocks them.
- **Incomplete history:** when the forecast has untagged strength sessions or unrecognized sports, `Plan.notes` says some workouts are not counted, so "new for you" notes and the number of training days may be off.
- **Forecast length:** `buildPlan` needs a forecast of at least 7 days and throws a named error otherwise.

### Guardrails (in front of the plan)
- **Red-flag screen:** six checks: sharp or localized pain, swelling, marked weakness, dark urine, pain that keeps getting worse or lasts well beyond a week, numbness. Any one selected means **no plan** and a message to stop and see a clinician. Never presented as normal soreness.
- **Eligibility:** someone under 18, or with a medical condition, gets "talk to a clinician or trainer" and **no plan**.
- **Fail closed:** the screens can be *unanswered* (`null`), which is different from "no". A red-flag screen that was never answered, or an eligibility answer that is not an explicit `false`, returns a `blocked` result with reason `unanswered` ("Please answer the health questions first. A plan needs an answer to every one.") and no plan. A missing answer is never described as an age or a medical condition; an explicit `true` still names its real reason. The screens (C1b) must start every answer at `null`, never `false`.
- **Request validation:** only the three goals, 3 to 5 days and the three equipment levels are accepted. Anything else (for example 6 or 7 days a week, or a weight-loss goal) is declined with a short reason (recovery matters; this app does not do weight goals).
- `planOrGuardrail(...)` runs these in order (red flags, eligibility, request) and only then builds the plan.
- No supplements, no diet, no medical claims anywhere. All user-facing text lives in `engine/planText.ts` and is scanned by a test for banned words (`diagnos`, `accura`, `clinical`, `prevent`, `cure`, `validated`, `treat`, `boost`, `oxygen`, `blood flow`) and for the "reduce soreness" rule.

## Structure

All pure TypeScript under `/engine`, no React or Expo imports, no `Date.now()` (`asOf` is an argument). The existing engine purity test covers the new files.

```
engine/types.ts          + Recovery, RecoveryScore; ReplayFile gains optional recovery (existing file, extended)
engine/replay.ts         + validates recovery when present (existing file, extended)
engine/recovery.ts       RecoveryLevel, recoveryLevel(score), recentRecoveryLevels(recovery, asOf), shouldDeload(levels)
engine/exercises.ts      EXERCISES (78), Goal, Pattern, Equipment, Eccentric, tierOf, fitsEquipment
engine/planText.ts       every user-facing plan and guardrail string, muscle names
engine/guardrails.ts     RED_FLAGS, screenRedFlags, checkEligibility, validateRequest, planOrGuardrail
engine/plan.ts           buildPlan(...)
engine/index.ts          + re-exports (existing file, extended)
data/replay.synthetic.ts + synthetic recovery records for the demo week (existing file, extended)
```

## Data: synthetic recovery

WHOOP v2 recovery shape (`cycle_id`, `sleep_id`, `user_id`, `created_at`, `updated_at`, `score_state`, `score` with `user_calibrating`, `recovery_score`, `resting_heart_rate`, `hrv_rmssd_milli`, optional `spo2_percentage` and `skin_temp_celsius`; checked against developer.whoop.com/api on 2026-09-20). The demo week gets one clearly synthetic record per day, Mon Sep 14 to Sat Sep 19, ending with a **medium** recovery so the demo plan is not trivially easy: 82, 71, 58, 66, 31, 47.

## Testing and verification

1. `recovery`: level boundaries (33/34, 66/67), the latest-scored selection up to `asOf`, deload at 3 low of 7 and not at 2.
2. `exercises`: 60 to 80 exercises, unique ids, valid muscles, every template slot pattern has a candidate at every equipment level, eccentric tags present.
3. `guardrails`: each red flag blocks; under 18 and medical condition block; validation declines 6 days, unknown goal and unknown equipment; `planOrGuardrail` order and messages.
4. `plan` scenarios: on the synthetic week a 4-day gym plan reads Sun upper, Mon an easy day (legs predicted sore and yesterday was upper), Tue rest, Wed upper, Thu lower with the back squat kept and the Romanian deadlift and lunge swapped for a hip thrust and a reverse lunge, Fri and Sat rest; a focus swap (Lower for Upper) when the legs are sore and yesterday was not upper; an invariant test over all 18 goal, days and equipment combinations: for every planned exercise, a moderate band means eccentric is not high and a high band means eccentric is low; an everything-High forecast plans only low-eccentric exercises; recovery carry-over, lighter week, novelty and the days cap each have a test; bodyweight and dumbbell plans respect the equipment; strength versus muscle prescriptions; deterministic and non-mutating.
5. `planText`: banned-word scan over every string the engine can emit.
6. Recovery parsing and synthetic data: recovery records validate through `parseReplay` (bad dates, unknown states and scores outside 0 to 100 are rejected with the cycle named); the synthetic recovery round-trips and ends with a medium recovery. The existing replay test that used `recovery: [{}]` as its example of an ignored extra key now uses `sleep: [{}]`, because recovery is validated.
7. Final-review fixes each have a test that fails without the fix (checked by removing the fix): swap-then-repeat focus, easy-day fallback, High-band effort and set reduction, short forecast, history-incomplete note, unanswered red flags and eligibility (null, `{}`, non-boolean), the real reason surviving a missing partner answer, the lunges listing hamstrings, and `recentRecoveryLevels(..., 0)`.
8. Suite: 204 tests in 23 files.

Non-test: `npm run typecheck`, `npm test`, `npx expo export --platform web` (the bundle must still build).

## Risks

- **The exercise library and rules are hand-written training guidance.** Mitigation: general, conservative rules; eccentric tags and the soreness rules follow the spec's evidence table; every prescription is reported with its reason; a trainer or PT review is required before any demo (handoff open item 4).
- **Recovery zones are unverified.** Mitigation: named hand-set constants, documented as such, one place to change.
- **The plan starts tomorrow, so today's recovery only influences it through carry-over and the lighter-week rule.** Documented behavior; a live version would re-plan each morning.
- **No LLM means the "why" is templated.** Deliberate: safety-critical text stays deterministic.

## Deferred and open items

- **Trainer or PT review** of the library, eccentric tags, default exercise order (Romanian deadlift and walking lunge lead their patterns; the novelty and soreness rules soften them), the strength prescription on machines, and the rest-day wording.
- **Recovery zones** (0-33, 34-66, 67-100) are hand-set and unverified against WHOOP.
- **Honesty scan** lists its engine files by hand; a new engine file must be added to it. It is line-based and will not catch a claim split across lines.
- **C1b requirements** carried from review: gate the plan behind the tagging prompt when `needsTag` is non-empty; show `PLAN_DISCLAIMER` with a test; start every screening answer at `null`; frame `RED_FLAG_QUESTIONS` with `RED_FLAG_PROMPT`; use `recovery ?? []`; lift the forecast pipeline into shared state.
- Minor, not fixed: `daysPerWeek` given as a string gets the too-many-days message by coercion; `recentStrengthPerWeek` counts unscored workouts.

## Definition of done

Typecheck clean, all tests pass, the web bundle builds. For the demo week and a 4-day gym muscle request, the plan reads: Sun upper body (upper-body exercises start a set lighter because those muscles are new to the member); Mon an easy day ("quads, glutes, hamstrings and calves predicted sore"); Tue rest; Wed upper body; Thu lower body with the back squat at fewer sets, a hip thrust instead of the Romanian deadlift and a reverse lunge instead of the walking lunge, each with its reason; Fri and Sat rest. Tagging the Wed strength session "Upper body" changes Sunday's upper day from "new for you" to "fewer sets: predicted sore". A red flag, an under-18 flag or a medical condition returns a clinician message and no plan. A request for 6 days a week or a weight-loss goal is declined with a reason.
