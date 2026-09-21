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

## Data and privacy

- The app runs on `data/replay.synthetic.ts` unless a local `data/replay.json` exists. That file, `.env` and `*.token.json` are git-ignored: **never commit real health data or WHOOP credentials.**
- Health answers stay in memory and are asked again each launch. Nothing is stored or sent anywhere.
- See `PRIVACY.md` for the prototype's privacy policy. It also covers the planned WHOOP export, which is not built yet.

## Honest limits

- The predictions have not been checked against real soreness logs, and the app makes no claim about how often it is right.
- The weights, thresholds and time curve are set by hand, not fitted to data. The low, medium and high recovery cutoffs are hand-set and have not been checked against WHOOP's own zones.
- The exercise and comfort libraries are general guidance and still need review by a trainer or physical therapist.
- The evidence summaries come from published reviews; the primary papers are still being checked.
- Stretching has not been shown to reduce soreness. The app labels stretches as range-of-motion work and puts the training plan first.

## Status

Built so far: the soreness engine, the body map and scrubber, check-ins with comfort ideas and session tagging, the plan engine with guardrails, the Plan tab, and the Evidence tab. Not built yet: the one-time export of real WHOOP history (the app currently reads the synthetic week).

## License

MIT. See `LICENSE`.
