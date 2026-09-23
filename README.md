# Sore Spot

Sore Spot is an **independent prototype**. It is **not affiliated with, endorsed by, or sponsored by WHOOP, Inc.** It is a general wellness tool and **not medical advice**.

It predicts which muscles are likely to be sore after your workouts, shows that on a body map, offers comfort and mobility ideas labelled by how strong the evidence is, and builds an explained training week around your predicted soreness and recovery, behind guardrails.

> The demo runs on **synthetic** workouts and recoveries (the app shows a `SYNTHETIC DATA` banner). Nothing in the repository is anyone's real health data.

## What you can do in the app

| Tab | What it does |
|---|---|
| **Body map** | Front and back body with 12 muscle zones, coloured by predicted soreness (low, moderate, high). A time scrubber moves from now to a week ahead. Tap a zone to see why it is predicted sore, check in how it feels (none, mild, moderate, severe), and get comfort ideas labelled by how strong the evidence is. Untagged strength sessions ask which muscles they worked. |
| **Plan** | If a strength session is untagged it asks which muscles it worked first, then health questions (every answer starts empty), then a goal, days per week and equipment. Builds a 7-day plan with exercises, sets and reps, and a plain-language reason for every choice, or explains why there is no plan. |
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

## Using your own WHOOP data

By default the app shows the synthetic week. To see your own history instead, on your own laptop:

1. In the WHOOP developer dashboard, register an app whose redirect URL is `http://localhost:3000/callback`.
2. Put its credentials in a `.env` file in the project root, one per line, with no quotes:
   ```
   WHOOP_CLIENT_ID=...
   WHOOP_CLIENT_SECRET=...
   WHOOP_REDIRECT_URI=http://localhost:3000/callback
   ```
3. Run `npm run export-whoop`. The first time it opens WHOOP sign-in in your browser (after that it reuses and renews the saved sign-in), then reads the last 60 days of workouts and recovery (for another span, 1 to 365 days, type `npm run export-whoop -- --days 90`: the `--` before the flag is needed, or npm keeps the flag for itself; the script refuses any argument it does not recognise) and writes `data/replay.json`. It asks only for the workout and recovery read permissions, plus a refresh token.
4. Restart Expo (add `--clear` if the old data still shows). The header now says `REAL DATA` instead of `SYNTHETIC DATA`, and the forecast starts from the moment you exported.

The script prints how many workouts it found, which sports it saw, and which of them the model has no muscle map for yet (those add no soreness). Strength sessions arrive untagged, so the app asks which muscles each one worked, but only for the last 37 days: an older session can no longer change the forecast (its own soreness is over, and it is outside the 28 days a later session is compared with). If some records are not in the shape the app expects, the script skips them, says how many and why (never including an id), and keeps the rest.

It refuses to run unless `.env`, `data/replay.json` and `whoop.token.json` are all git-ignored, and it never prints a secret or a token. To go back to the synthetic week, delete `data/replay.json`.

## Data and privacy

- The app runs on `data/replay.synthetic.ts` unless a local `data/replay.json` exists. That file, `.env` and `*.token.json` are git-ignored: **never commit real health data or WHOOP credentials.**
- Health answers stay in memory and are asked again each launch. Nothing is stored or sent anywhere.
- Web builds (`npx expo export`) bundle `data/replay.json` into their output when it exists, so keep such a build private or delete `data/replay.json` before making one you will share.
- Your export stays on your laptop. The app loads it from `data/replay.json`, and Expo serves it to whichever device you open the app on, so use your own network rather than a public tunnel when running with real data.
- See `PRIVACY.md` for the prototype's privacy policy. It lists everything the app could ever be given permission to read; the export itself asks only for workouts, recovery and a refresh token.

## Status

Built so far: the soreness engine, the body map and scrubber, check-ins with comfort ideas and session tagging, the plan engine with guardrails, the Plan tab, and the Evidence tab. The one-time export of your own WHOOP history (`npm run export-whoop`) is built and tested against a stand-in for WHOOP; the first run against your real account is yours to do.

## License

MIT. See `LICENSE`.
