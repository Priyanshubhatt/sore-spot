# Sore Spot: 3-minute demo runbook

Independent prototype, not affiliated with WHOOP. Everything on screen is synthetic (the `SYNTHETIC DATA` banner says so). Say that out loud in the first ten seconds.

## Before you start

1. On the laptop, in PowerShell: `npx.cmd expo start`. Scan the QR code with the iPhone Camera; Expo Go opens the app. Laptop and phone on the same Wi-Fi, or use a phone hotspot.
2. Open the app once and check all three tabs load. The app starts on **Body map**, day **Now**, with **Front** selected. Kill and reopen it for a clean run: check-ins, tags and health answers are not saved between launches.
3. Have the web build ready too: `npx expo start --web` on the laptop.

## Fallback ladder (never depend on one path)

1. **Primary:** Expo Go on the iPhone, running from the laptop.
2. **Fallback 1:** the same app in the browser on the laptop.
3. **Fallback 2:** the pre-recorded 3-minute screen recording of the phone.
4. **Always:** offline copies of the recording and the web build on the laptop.

## Beat sheet

The forecast is fixed at **Sat Sep 19 2026, 20:00 UTC** (after the Saturday soccer match), so the demo behaves the same every time.

| Time | Beat | What you do in the app | What to say |
|---|---|---|---|
| 0:00 | The gap | Nothing on screen | Members ask for structured programs and less tedious strength tracking. Say this is an independent prototype on synthetic data. |
| 0:25 | Replay a workout | Show the **Body map** tab. Point at `SYNTHETIC DATA` and the "Forecast from" line | It replays a week of workouts (runs, a hilly run, a soccer match, two strength sessions) so the demo never depends on a live connection. |
| 0:50 | The heatmap and the why | On **Now** the glutes, quads, hamstrings and calves are **High**. Tap **Quads** and read the reasons (new for you, lengthening work). Toggle **Back** to see the hamstrings and calves. Drag the scrubber to **+1d**, **+3d**, **+5d** to watch it fade to moderate | The model follows the published soreness timeline and the novelty effect. The picture is a prediction, not a measurement. |
| 1:20 | Check in and comfort ideas | On **Now**, open a sore muscle and tap a check-in: **None**, **Mild**, **Moderate** or **Severe**. Read the comfort ideas and their labels (**Range of motion**, **Comfort**) and the line that stretching has not been shown to reduce soreness | Recommendations are labelled by strength of evidence. Stretching helps range of motion, not soreness, so we say so. A severe report is acknowledged, with a line to stop and see a clinician if it is sharp, swollen or numb. |
| 1:50 | The plan adapts | Go to the **Plan** tab. It asks about the untagged **Wed Sep 16 · Weightlifting** session. Tap **Upper body**. Answer the health questions: **None of these apply**, **Under 18: No**, **Medical condition: No**. Leave the defaults (Build muscle, 4 days, Gym) and tap **Build my plan** | Read the days: Sunday upper body with *fewer sets: chest, triceps and shoulders predicted sore*; Monday an easy day (legs predicted sore); Wednesday upper body; Thursday lower body with the back squat at fewer sets, a hip thrust and a reverse lunge chosen to go easy on the sore muscles. Every choice has its reason. To show the plan reacting, tag the session **Lower body** instead: Sunday's sets go back to "new for you, start light". |
| 2:20 | The guardrails | Tap **Change answers**, tick **Sharp or localized pain**, tap **Build my plan**: no plan, and a message to stop and see a clinician. Change answers, untick it, choose **None of these apply**, pick **6** days (or **Lose weight**): declined with a reason | Red flags stop the plan and are never presented as normal soreness. Requests outside the guardrails are declined and say why. Nothing builds until every question is answered. |
| 2:40 | The evidence | Go to the **Evidence** tab. Show the soreness curve, then the stretching card, then **Where this stops** | The chart is the curve the model actually uses. The limits are on screen because they matter: not checked against real soreness logs, hand-set numbers, a trainer or physical therapist still to review the library. |
| 2:55 | The ask | Nothing on screen | The data I would want: Strength Trainer sets, a soreness signal, Journal. |

## Say this, not that

| Safe to say | Do not say |
|---|---|
| "The model follows the published soreness time course and the novelty effect." | Any accuracy figure. There is no data behind one. |
| "Recommendations are labelled by strength of evidence." | That stretching prevents or relieves soreness. |
| "I would check this against real soreness logs." | That it is clinically proven, or anything that implies diagnosis. |
| "This is a wellness tool, not medical advice." | Any claim about blood flow or oxygen. |

## Before the meeting

- Read the primary papers behind the Evidence tab, then delete the footnote line (`EVIDENCE_FOOTNOTE` in `app/evidenceCopy.ts`).
- Get a trainer or physical therapist to look at the exercise and comfort libraries, and say so in the pitch.
- Run this whole sheet three times, on the phone and in the browser.
