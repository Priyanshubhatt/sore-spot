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
- Each focus has five slots by movement pattern: lower = squat, hinge, lunge, calf, core; upper = push-h, pull-h, push-v, pull-v, triceps; push = push-h, push-v, delt, triceps, core; pull = pull-v, pull-h, biceps, core, upper-back... (exact slots in the code); full = squat, push-h, pull-h, hinge, core. A slot takes the first library exercise for its pattern that fits the equipment and the soreness rules, avoiding repeats within the week where an alternative exists.

### Exercise library
- 60 to 80 exercises in `engine/exercises.ts`, each with `id`, `name`, `pattern`, `primary` muscles (from the engine's 12), `equipment`, an `eccentric` demand (`low` | `moderate` | `high`: how much loaded lengthening the movement involves) and a `hold` flag for timed holds.
- Every equipment level has at least one exercise for every slot pattern used by a template.

### Soreness-aware rules (the rules layer decides)
For a session on day `d`, look at `forecast.byDay[d]` for each candidate exercise's primary muscles:
1. **Band Low:** anything is allowed.
2. **Band Moderate:** exercises with `high` eccentric demand are not allowed; others get one set fewer (minimum 2).
3. **Band High:** only `low` eccentric exercises are allowed, one set fewer, effort easier.
4. If fewer than 60% of a session's slots have an allowed exercise, try swapping the focus (lower -> upper; upper -> lower; push -> lower, pull; pull -> lower, push; full -> upper, lower), taking the first alternate with at least 60% of its slots allowed **that is not the same focus as the previous day's session**. If none works, the day becomes an `easy` day (no exercises; comfort ideas live in the app) with a `why` naming the sore muscles.
5. Every applied change is reported in that day's `why` in plain words, naming the muscles.

### Recovery and load rules
- **Recovery level** from the recovery score: `low` 0 to 33, `medium` 34 to 66, `high` 67 to 100 (hand-set constants that follow WHOOP's public recovery zones; the API docs do not define zones, so these are unverified and uncalibrated).
- **Carry-over:** if the most recent scored recovery is `low`, the first training day is an `easy` day.
- **Lighter week:** if 3 or more of the last 7 recoveries are `low`, every set count drops by one (minimum 2), effort is easier, and `Plan.notes` says why.
- **Novelty:** an exercise whose primary muscles have no training load in the last 28 days starts one set lighter (minimum 2) with the note "New for you: start light".
- **Progressive cap:** the number of training days is capped at `max(3, ceil(recent strength sessions per week) + 2)`; if capped, `Plan.notes` says so.
- Base prescription: `muscle` = 3 sets of 8 to 12 (accessories 10 to 15); `strength` = 4 sets of 4 to 6 for compound patterns with a barbell or dumbbells (accessories 8 to 12); bodyweight keeps the muscle prescription; core and holds use timed holds. Effort is "Stop 2 to 3 reps before failure" normally and "Keep it easy" when eased.

### Guardrails (in front of the plan)
- **Red-flag screen:** six checks: sharp or localized pain, swelling, marked weakness, dark urine, pain that keeps getting worse or lasts well beyond a week, numbness. Any one selected means **no plan** and a message to stop and see a clinician. Never presented as normal soreness.
- **Eligibility:** someone under 18, or with a medical condition, gets "talk to a clinician or trainer" and **no plan**.
- **Request validation:** only the three goals, 3 to 5 days and the three equipment levels are accepted. Anything else (for example 6 or 7 days a week, or a weight-loss goal) is declined with a short reason (recovery matters; this app does not do weight goals).
- `planOrGuardrail(...)` runs these in order (red flags, eligibility, request) and only then builds the plan.
- No supplements, no diet, no medical claims anywhere. All user-facing text lives in `engine/planText.ts` and is scanned by a test for banned words (`diagnos`, `accura`, `clinical`, `prevent`, `cure`, `validated`, `treat`, `boost`, `oxygen`, `blood flow`) and for the "reduce soreness" rule.

## Structure

All pure TypeScript under `/engine`, no React or Expo imports, no `Date.now()` (`asOf` is an argument). The existing engine purity test covers the new files.

```
engine/types.ts          + Recovery, RecoveryScore; ReplayFile gains optional recovery (existing file, extended)
engine/replay.ts         + validates recovery when present (existing file, extended)
engine/recovery.ts       RecoveryLevel, recoveryLevel(score), recentRecoveryLevels(recovery, asOf), shouldDeload(levels)
engine/exercises.ts      EXERCISES (about 70), Pattern, Equipment, Eccentric, exercise lookup helpers
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
4. `plan` scenarios on the synthetic week: the rules above produce the expected days (for a 4-day gym plan, Sun upper, Mon an easy day because legs are sore and yesterday was upper, Wed upper by swap, Thu lower with no high-eccentric exercise for moderately sore muscles); an invariant test over many requests: for every planned exercise, moderate band means eccentric is not high and high band means eccentric is low; everything-sore forecast gives no exercises; recovery carry-over, lighter week, novelty and the days cap each have a test; bodyweight plans contain only bodyweight exercises; deterministic and non-mutating.
5. `planText`: banned-word scan over every string the engine can emit.
6. Synthetic data: recovery records validate through `parseReplay`, are labeled synthetic via the replay flag, and end with a medium recovery.

Non-test: `npm run typecheck`, `npm test`, `npx expo export --platform web` (the bundle must still build).

## Risks

- **The exercise library and rules are hand-written training guidance.** Mitigation: general, conservative rules; eccentric tags and the soreness rules follow the spec's evidence table; every prescription is reported with its reason; a trainer or PT review is required before any demo (handoff open item 4).
- **Recovery zones are unverified.** Mitigation: named hand-set constants, documented as such, one place to change.
- **The plan starts tomorrow, so today's recovery only influences it through carry-over and the lighter-week rule.** Documented behavior; a live version would re-plan each morning.
- **No LLM means the "why" is templated.** Deliberate: safety-critical text stays deterministic.

## Definition of done

Typecheck clean, all tests pass, the web bundle builds. For the demo week and a 4-day gym request, the plan reads: Sun upper body; Mon an easy day ("thigh and calf muscles are predicted sore"); Wed upper body (swapped from lower); Thu lower body with hip thrusts instead of Romanian deadlifts and fewer sets because the legs are still moderately sore; Tue, Fri and Sat rest. A red flag, an under-18 flag or a medical condition returns a clinician message and no plan.
