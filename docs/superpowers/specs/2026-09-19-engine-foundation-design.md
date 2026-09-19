# Sore Spot: Engine Foundation (Sub-project A)

**Date:** 2026-09-19
**Status:** Design approved in chat, pending written-spec review
**Context:** `handoff.md` (WHOOP pitch project, meeting Wed 2026-09-23). This spec covers only sub-project A. B (body map/scrubber/check-in UI/mobility library), C (plan engine and guardrails) and D (WHOOP export script) each get their own spec, plan and build cycle.

## Goal

A scaffolded Expo + TypeScript project whose deterministic soreness engine turns workout history into per-muscle, per-day risk bands, proven by tests and running inside Expo Go and in a browser. Data is **synthetic first**; real WHOOP data swaps in later with no adapter.

## Non-goals (for A)

UI beyond a hello/debug screen, mobility library, plan generation, guardrails/red-flag screen, WHOOP OAuth/export, LLM text, notifications, haptics.

## 1. Structure and data flow

```
/engine    pure TypeScript, no React or Expo imports (enforced by a test)
  types.ts           WHOOP v2 shapes (Workout, Recovery, Sleep, Cycle) + domain types
  sportMuscleMap.ts  sport_name -> muscle weights + eccentric cues
  timecurve.ts       onset ~12-24h, peak ~24-72h, decay to ~day 7
  soreness.ts        computeForecast(workouts, asOf, sensitivity)
/data
  replay.synthetic.json   committed, labeled synthetic
  replay.json             real export, gitignored, optional
  scenarios/              hand-authored fixtures for tests
  index.ts                loads replay.json if present, else replay.synthetic.json
/app       Expo screens (A: hello/debug screen only)
```

Flow: `replay file -> loader -> computeForecast(workouts, asOf, sensitivity) -> per-muscle band for days 0..7`.

- **Pure and deterministic:** `asOf` is an argument; the engine never calls `Date.now()`. The scrubber later moves through time by changing `asOf`.
- **Real-data-compatible fixtures:** fixture types are the WHOOP v2 types. The synthetic file has the same shape as the real export.
- **Honest data labeling:** replay files carry `synthetic: boolean`. B shows a visible "Synthetic data" banner when true.
- **Bands only:** `low | moderate | high`. No false-precision numbers.

## 2. Soreness model

**Muscle zones (12):** chest, shoulders, biceps, triceps, forearms, upper back/lats, core (abs and obliques), glutes, quads, hamstrings, calves, adductors. (Lower back omitted: no sport in the starter map uses it. Changeable.)

**Interface:** `computeForecast(workouts, asOf, sensitivity) -> { byDay: DayForecast[8] }`, where `DayForecast = Record<Muscle, { band, drivers[] }>` and `drivers` is a subset of `novel | eccentric | high-load` (feeds the later "why" text). Only workouts that ended at or before `asOf` count.

**Per-session contribution to muscle `m`:**
`load(m) x novelty(m) x eccentric(sport) x sensitivity(m) x timecurve(hours elapsed)`, summed over sessions, then mapped to a band.

- `load(m)` = sum over HR zones of (minutes in zone x zone weight, a hand-picked ramp 0 to 2.5) x sport-to-muscle weight.
- `novelty(m)` = session load / mean per-session load for `m` over the prior 28 days, capped at 3. No history in the window gets the cap.
- `eccentric` = 1.0 default. Running and hiking scale with inferred descent per km (`altitude_gain_meter - altitude_change_meter`; **assumption, unverified**, marked in code). Court sports get a fixed deceleration bump.
- `timecurve`: onset 12-24h, peak 24-72h, decay to ~day 7.
- **Thresholds and constants are hand-tuned** so scenario tests reproduce the literature's ordering. They are uncalibrated and not validated; code and docs say so. No accuracy claims.

**Strength sessions:** the API has no muscle data. The engine accepts a session tag (for example `lower`, `push`) alongside the workout. Untagged strength returns `needsTag` and adds no soreness. The engine never guesses.

**Check-ins:** pure `applyCheckIn(sensitivity, muscle, predictedBand, reported0to3)` nudges sensitivity by a small step, clamped to [0.5, 1.5]. UI is B.

## 3. Fixtures, tests, gate

**Fixtures:** `data/scenarios/` (small hand-authored workout sets as WHOOP v2 `Workout` records) and `data/replay.synthetic.json` (one demo week, `synthetic: true`: easy runs, one long hilly run, a tagged lower-body strength day, a soccer match, a rest day).

**Tests** (Vitest on `/engine` only, unless the fresh Expo template already ships Jest, in which case use that):

1. Downhill run rates quads and calves higher than a flat run.
2. First-ever soccer match rates higher than for a regular player (novelty).
3. Day-2 quads after back-to-back leg days are at least as high as day-1.
4. Time curve: peak in the 24-72h window, low band right after the session, faded by ~day 7.
5. Untagged strength returns `needsTag` with no soreness; tagged strength loads the right muscles.
6. `applyCheckIn` keeps sensitivity in [0.5, 1.5].
7. Engine imports nothing from React or Expo; identical inputs give identical outputs.
8. Synthetic replay validates against the types and has `synthetic: true`.

**Scaffold:** `npx create-expo-app@latest`; `git init` (done); `.gitignore` includes `.env`, `data/replay.json`, `*.token.json`. No remote is linked; the user does that.

**Saturday gate (A is done when):**
- All tests pass, verified by running them.
- The web build shows a hello screen printing the engine's forecast for the synthetic week.
- The same screen opens in Expo Go on the user's iPhone (the user scans the QR and reports any error text; Claude cannot run the phone).
- If Expo Go won't connect, try `--tunnel`; if that fails, browser-only becomes primary and work continues. The code is shared, so nothing else changes.

## Risks and notes

- `create-expo-app` may object to a non-empty target folder (`docs/`, `.git`). The plan must handle this (for example scaffold into a temp folder and move, or confirm the tool accepts it) and keep this spec.
- `altitude_change_meter` semantics and whether `sport_id` still appears are unverified until real data is exported (sub-project D). Synthetic fixtures follow the API sample in the handoff.
- Sport-to-muscle map and eccentric constants are hand-built; a trainer or PT should review before the meeting (handoff open item 4).

## Amendments (2026-09-19, found while planning)

These change the spec above; where they conflict, this section wins.

- **Forecast result** also carries `needsTag: string[]` (ids of untagged strength workouts) and `unmappedSports: string[]`, so callers can prompt the user instead of guessing.
- **Extra engine files:** `constants.ts` (all tuning constants), `sensitivity.ts` (`defaultSensitivity`, `applyCheckIn`), `replay.ts` (`parseReplay`), `index.ts` (barrel).
- **Numeric scores:** `evaluateMuscles` exposes raw scores for tests and calibration only. UI-facing output stays bands.
- **Types:** only the WHOOP v2 `Workout` is typed for now. Recovery, sleep and cycle types come with the sub-project that first uses them.
- **Synthetic replay** is `data/replay.synthetic.ts` (built with the scenario `workout()` builder), not a JSON file. It is validated by `parseReplay` after a JSON round trip, so it matches a real export's shape.
- **Scenario fixtures** are TypeScript (`data/scenarios/builders.ts`, `scenarios.ts`), not JSON.
- **Scaffold:** `create-expo-app@latest --template blank-typescript` (Expo SDK 57 at time of writing) in a temp folder, copied in, because the target folder was not empty. Web builds need `react-dom` and `react-native-web`, installed with `npx expo install`.
- **Loader:** `data/index.ts` `loadReplay()` reads `data/replay.json` through an optional `require` in `try/catch` and falls back to the synthetic replay.
- **Strength eccentric factor:** tagged strength sessions use a fixed eccentric factor of 1.2 (lowering phases), a third exception beyond the two named in Section 2 (descent-scaled runs/hikes and court sports). Hand-tuned and uncalibrated like the other constants.
