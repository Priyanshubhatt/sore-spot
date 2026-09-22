# Sore Spot: 3-minute demo runbook

Independent prototype, not affiliated with WHOOP. Everything on screen is synthetic (the `SYNTHETIC DATA` banner says so). Say that out loud in the first ten seconds.

## Before you start

1. On the laptop, in PowerShell: `npx.cmd expo start`. Scan the QR code with the iPhone Camera; Expo Go opens the app. Laptop and phone on the same Wi-Fi, or use a phone hotspot.
2. Open the app once and check all three tabs load. The app starts on **Body map**, day **Now**, with **Front** selected. Kill and reopen it for a clean run: check-ins, tags and health answers are not saved between launches.
3. Have the browser version ready too: `npx expo start --web` on the laptop.
4. Make the offline copies now: `npx expo export --platform web` writes a static web build to `dist/` (git-ignored), and record the phone screen for the fallback recording. Make them with the synthetic week: if `data/replay.json` exists, the web build bundles your real data.

## Fallback ladder (never depend on one path)

1. **Primary:** Expo Go on the iPhone, running from the laptop.
2. **Fallback 1:** the same app in the browser on the laptop.
3. **Fallback 2:** the pre-recorded 3-minute screen recording of the phone.
4. **Always:** offline copies of the recording and the web build on the laptop.

## Beat sheet

The forecast is fixed at **2026-09-19 20:00 UTC** (Saturday evening, after the soccer match; the app shows this in its "Forecast from" line), so the demo behaves the same every time.

| Time | Beat | What you do in the app | What to say |
|---|---|---|---|
| 0:00 | The gap | Nothing on screen | Members ask for structured programs and less tedious strength tracking. Say this is an independent prototype on synthetic data. |
| 0:25 | Replay a workout | Show the **Body map** tab. Point at `SYNTHETIC DATA` and the "Forecast from" line | It replays a week of workouts (runs, a hilly run, a soccer match, two strength sessions) so the demo never depends on a live connection. |
| 0:50 | The heatmap and the why | On **Now** the glutes, quads, hamstrings and calves are **High**. Tap **Quads** and read the reasons (new for you, lengthening work). Toggle **Back** to see the hamstrings and calves. Drag the scrubber: they stay High through **Sep 22**, ease to Moderate from **Sep 23** (the quads a day later, at **Sep 24**), and are gone by **Sep 25** | The picture is a prediction, not a measurement. The curve behind it is hand-tuned to the published shape of soreness over time, and the model counts new work and lengthening work for more. |
| 1:20 | Check in and comfort ideas | Back on **Now**, tap **Quads** (High): the comfort ideas are Easy walk, Foam roll quads and Small leg swings, and the sheet says to save stretching for when soreness eases. Close it, tap **Chest** (Low) and check in **Moderate**: comfort ideas appear, and now a range-of-motion stretch (Doorway chest stretch). Read the line that stretching has not been shown to reduce soreness. The other check-in options are **None**, **Mild** and **Severe** | Recommendations are labelled by strength of evidence: **Range of motion** for stretches, **Comfort** for the rest. Stretching helps range of motion, not soreness, so we say so. A severe report is acknowledged, with a line to stop and see a clinician if it is sharp, swollen or numb. |
| 1:50 | The plan, and it reacts | Go to the **Plan** tab. It asks about the untagged **Wed Sep 16 · Weightlifting** session: tap **Plan without these**. Tick **None of these apply**, tap **No** under **Are you under 18?** and **No** under the medical-condition question. Leave the defaults (Build muscle, 4 days, Gym) and tap **Build my plan**. Then go to **Body map**, tag that session **Upper body**, and come back to **Plan** | Read the days: a note that some workouts are not counted; Sunday upper body (*New for you: start light*); Monday an easy day (quads, glutes, hamstrings and calves predicted sore); Wednesday upper body; Thursday lower body with the back squat at fewer sets, a hip thrust and a reverse lunge chosen to go easy on the sore muscles. Every choice has its reason. After tagging, the plan has changed by itself: Sunday now says *Fewer sets: chest, triceps and shoulders predicted sore*, and the not-counted note is gone. This is the longest beat, so practise it. |
| 2:20 | The guardrails | Tap **Change answers**, tick **Sharp or localized pain**, tap **Build my plan**: no plan, and a message to stop and see a clinician. Change answers, untick it, choose **None of these apply**, pick **6** days (or **Lose weight**): declined with a reason | Red flags stop the plan and are never presented as normal soreness. Requests outside the guardrails are declined and say why. Nothing builds until every question is answered. |
| 2:40 | The evidence | Go to the **Evidence** tab. Show the soreness curve, then the stretching card, then **Where this stops** | The chart is the curve the model actually uses. The limits are on screen because they matter: not checked against real soreness logs, hand-set numbers, a trainer or physical therapist still to review the library. |
| 2:55 | The ask | Nothing on screen | The data I would want: Strength Trainer sets, a soreness signal, Journal. |

## Say this, not that

| Safe to say | Do not say |
|---|---|
| "The curve is hand-tuned to the published shape of soreness over time, and the model uses the novelty effect." | Any accuracy figure. There is no data behind one. |
| "Recommendations are labelled by strength of evidence." | That stretching prevents or relieves soreness. |
| "I would check this against real soreness logs." | That it is clinically proven, or anything that implies diagnosis. |
| "This is a wellness tool, not medical advice." | Any claim about blood flow or oxygen. |

## Using your own data in the demo

Everything above describes the synthetic week: the counts, days and plans in the beat sheet are those of the synthetic data, and tests keep them true. With `data/replay.json` in place (see the README) the numbers will be yours and different. Rehearse the synthetic run first; if you show your own data, run through it once beforehand and redact anything personal from screenshots. Delete `data/replay.json` to return to the synthetic week.

## Before the meeting

- Read the primary papers behind the Evidence tab, then delete the footnote line (`EVIDENCE_FOOTNOTE` in `app/evidenceCopy.ts`).
- Get a trainer or physical therapist to look at the exercise and comfort libraries, and say so in the pitch.
- Run this whole sheet three times, on the phone and in the browser.
