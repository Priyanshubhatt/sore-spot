# Sore Spot: WHOOP Export Script and Real-Data Mode (Sub-project D)

**Date:** 2026-09-22
**Status:** Built and reviewed on `feat/whoop-export`; 401 tests; the first run against a real account is the member's
**Builds on:** everything merged to `main` (engine, body map, check-ins, plan, evidence, docs, restyle).
**Roadmap:** B1, B2, C1a, C1b, C2, UI (done, merged) -> **D (this spec: WHOOP export and real-data mode)**.

## Goal

Let the member see their own WHOOP history in the app. A one-time command signs in through WHOOP, reads the last 60 days of workouts and recovery, and writes the replay file the app already knows how to read. The app then forecasts from the moment of the export instead of the fixed demo time and says plainly that the data is real.

## Non-goals

Running against the member's real account (only the member can; see Risks); a server, accounts, or any hosted component; webhooks or live updates; writing anything back to WHOOP; profile, sleep, cycle or body-measurement data; changing the sport-to-muscle map (that follows what the first real export shows); a UI for the export (it is a terminal command); multi-user.

## Behavior

### The command
`npm run export-whoop` (`tsx scripts/export-whoop.ts`, with `--days N` from 1 to 365, default 60).

1. Reads `WHOOP_CLIENT_ID`, `WHOOP_CLIENT_SECRET` and `WHOOP_REDIRECT_URI` from `.env`. A missing name is reported by name; a value is never echoed. The redirect must be an `http://localhost` address (the member registered `http://localhost:3000/callback`).
2. **Refuses to go on unless `.env`, `data/replay.json` and `whoop.token.json` are all git-ignored** (asked of git itself; any doubt counts as not ignored). This runs before anything is read or sent.
3. Uses saved tokens if fresh; otherwise renews them with the refresh token (WHOOP **rotates** the refresh token, so the new one is saved before anything else can fail); otherwise signs in. Only a 400 or 401 on refresh means "sign in again"; a dropped connection, a server error or a rate limit is reported, not turned into a browser sign-in. A saved token that has not expired but that WHOOP rejects with a 401 is renewed once (refresh, else sign in) instead of failing on every run; a 401 right after a fresh sign-in is an error, never a loop.
4. **Sign-in:** opens WHOOP's authorization page in the browser (and prints the address in case it cannot), with an unguessable 16-character `state`. A tiny server catches the one redirect. It binds only the address the redirect names (`localhost` or `127.0.0.1`), serves only that path, **ignores any request whose `state` differs** (a stray page cannot end or hijack the sign-in), rejects a denied sign-in or a missing code (printing only a short plain reason, never text from the request), never puts anything from a request into the page it returns, times out after 5 minutes, and frees the port. The code is exchanged at WHOOP's token endpoint with the client credentials in the form body.
5. **Scopes: only `read:workout`, `read:recovery` and `offline`** (the last gives a refresh token). No profile, so no name or email.
6. Reads `GET /developer/v2/activity/workout` and `GET /developer/v2/recovery` for the window, 25 records per page, following `next_token` to the end; waits and retries on HTTP 429 (honouring `Retry-After`); explains 401 (sign in again) and 403 (scope); stops if paging never ends.
7. Builds the replay file: `synthetic: false`, `asOf` set to the export time, records de-duplicated (a page boundary can repeat one) and sorted, then **validated by the same `parseReplay` the app uses**, so a file the script writes is one the app accepts. A record that would not validate is named and nothing is written.
8. Refuses to write an export with **no workouts** (the app would show a blank map) and says to try a longer `--days`. Otherwise writes `data/replay.json` (owner-only permissions where the system supports them) and prints counts only: workouts and date range, recovery records, sports found, **which sports the model has no muscle map for** (they add no soreness), and how many strength sessions will need a tag. Nothing personal (no ids) is printed, so the summary can be pasted back for review.

### Privacy
- Nothing sensitive is printed. Error text from WHOOP is scrubbed of the client secret, client id, code, access token and refresh token before it is shown, **in each form a server could echo it (as sent, URL-encoded, form-encoded, JSON-escaped)**, and every data read scrubs the client id, secret and refresh token as well as the access token; the top-level handler scrubs the secret again. Source-level tests forbid logging those names.
- The git-ignore check runs before the credentials file is even read. The real `fetch` never follows a redirect (a form body could otherwise be replayed elsewhere) and gives up after 30 seconds. `Retry-After` is honoured up to a minute; a page that repeats its own paging token stops the export.
- Only WHOOP's own https endpoints are used (`api.prod.whoop.com`); the redirect server listens on `localhost` only.
- The token file and replay file are written under their git-ignored names and nowhere else, owner-only where the system supports it (not atomic: a temporary file would not match the `.gitignore` patterns; deferred).

### App
- `ReplayFile` gains an optional `asOf` (ISO date). `parseReplay` validates it and keeps it; the synthetic week has none.
- `replayAsOf(replay)` gives the app's "now": the replay's `asOf` for a real export, the fixed demo time for the synthetic week. `useSoreSpot` uses it, so the forecast, scrubber labels, plan days and recovery window all start from the export time.
- The header shows **`REAL DATA · YOUR OWN EXPORT`** instead of `SYNTHETIC DATA` when the replay is real, so it is always clear whose data is on screen.
- Strength sessions arrive untagged, so the existing tag prompt and the plan's "some workouts are not counted" note work unchanged; unmapped sports show the existing "not mapped" note.

### Documentation
- README: a "Using your own WHOOP data" section (the sign-in opens the first time only; `--clear` if Expo shows old data; a web build bundles `data/replay.json` when it exists, so keep such a build private) (register the redirect, the three variables, the command and its flags, what it asks for, what it refuses, how to go back), a warning to use a private network rather than a public tunnel with real data (Expo serves `data/replay.json` to whichever device opens the app), and the status line updated.
- Runbook: a section saying its numbers are those of the synthetic week, to rehearse first, and to redact personal details from screenshots.
- Tests tie the README to the script's real variable names, scopes and npm command.

## Structure

```
engine/types.ts, engine/replay.ts             + optional asOf on the replay file            (Task 1)
scripts/whoop/env.ts                          .env reading, redirect target, redaction       (Task 1)
scripts/whoop/http.ts                         fetch type, endpoints, the three scopes        (Task 1)
scripts/whoop/auth.ts                         state, sign-in URL, code exchange, refresh     (Task 1)
scripts/whoop/api.ts                          paged v2 reads, 429/401/403 handling            (Task 1)
scripts/whoop/build.ts                        replay file builder, summary                    (Task 1)
scripts/whoop/safety.ts                       the git-ignore guard                            (Task 1)
scripts/whoop/tokenStore.ts, fakes.ts         token file, test fakes                          (Task 1)
scripts/whoop/callback.ts, files.ts               the localhost redirect catcher, owner-only file writes   (Task 2)
scripts/whoop/run.ts                          sign-in or refresh, read, build, write          (Task 2)
scripts/export-whoop.ts                       the command                                     (Task 2)
package.json, vitest.config.ts                the npm script, tsx as a dev dependency, scripts/ tests
app/config.ts, useSoreSpot.ts, planCopy.ts, App.tsx   export time as "now", the real-data banner   (Task 3)
README.md, docs/DEMO.md                       how to use it                                   (Task 3)
```

## Testing and verification

1. **Task 1 (61 tests):** the replay `asOf` (kept when valid, rejected otherwise, absent for the synthetic week); `.env` parsing and the missing-variable message; the redirect target; redaction; the sign-in URL (only the three scopes, no profile, no secret, unguessable state); token parsing and freshness; the code exchange and refresh as form posts to the token endpoint; refusals reported without any secret; paging over several pages, the v2 paths and query, 429 retry with `Retry-After`, 401 and 403 messages, error bodies scrubbed, non-JSON and missing-records pages, a paging loop guard; the builder (real, stamped, sorted, de-duplicated, validated, named on failure); the summary and its lines; the git-ignore guard against a real temporary git repository; the token file.
2. **Task 2 (42 tests, one skipped on Windows):** the redirect catcher against a real `localhost` port (right state resolves; other paths ignored; wrong or missing state, denial and a missing code rejected; timeout frees the port; a busy port explained); **end-to-end runs against a fake WHOOP that pages results and rotates refresh tokens, with a fake browser that completes the real redirect** (first sign-in; the window; no secret, token or code in any output; a forged state ignored with no exchange; saved fresh tokens skip the browser; expired tokens are renewed and the rotated one saved; a refused refresh falls back to sign-in; tokens kept when the data read fails; nothing written on failure; a rejected token explained); source-level checks that the git-ignore guard runs first, the secret is scrubbed, only the two private files are written, no secret is logged, no profile scope, and only WHOOP https endpoints are used.
3. **Task 3 (8 more tests):** the replay time as "now" (2); the app uses it and the real banner exists; the README's variable names, redirect, scopes, refusal and privacy statements and the runbook's synthetic-week note match the code (4).
4. Suite: 401 tests in 42 files (290 in 30 before; on Windows 400 pass and 1 file-permission test is skipped). `npm run typecheck` clean. `npx expo export --platform web` builds; the 214-check browser drive passes unchanged.
5. **Smoke test of the real command** in temporary folders, never contacting WHOOP: no `.env`; `.env` in a folder that is not a git repository; a repository whose `.gitignore` lacks the replay and token entries; missing variables; a bad `--days`. Each stops with a clear message and the secret never appears in any output.
6. **Mutation checks:** 49 safety-critical lines broken on purpose and caught in three passes (the first 23 are listed here; the review-driven fixes were checked the same way: encoded-secret scrubbing, a refresh that keeps the old refresh token, the Retry-After cap, the repeated-token stop, inherited object names, the export-time format, an unreadable token file, the scrubbed data reads, no redirect following, the ignored stray state, the sanitised denial reason, the malformed request target, the one renewal of a rejected sign-in and its not looping, refusal only on 400/401, the freshness bypass, owner-only writes, the request timeout, the guard before the credentials file, and the redirect host) — (scrubbing in three places, the scope list, the state check and the path check, the state length and presence, saving rotated tokens and new tokens, token freshness, paging, 429 retry, the synthetic flag and de-duplication, the git-ignore guard and its file list and its failure default, the replay `asOf`, the app taking its time from the replay, the banner).

## Risks

- **Not exercised against the real WHOOP API.** The endpoints, parameters, OAuth details and record shapes follow WHOOP's published docs (checked on the day), and everything is tested against a faithful stand-in, but only the member can sign in. **The first real run is the real test**; the error messages are written to be pasted back without leaking anything.
- **The sport-to-muscle map is unverified against the member's real sport names.** The summary lists unmapped sports so the map can be extended from real evidence, then reviewed by a trainer or physical therapist.
- **Expo serves the replay file to whichever device opens the app.** On the home network that is the member's own phone; over a public tunnel it would pass through a third party. The README says to avoid the tunnel with real data.
- **WHOOP rotates refresh tokens.** If a run is interrupted after WHOOP issues a new one but before it is saved, the saved token is stale; the script then signs in again.
- **Port 3000 must be free** during sign-in; a busy port is explained.
- **Real health data on screen in a pitch.** The banner says so; the runbook says to rehearse and redact.

## Definition of done

Typecheck clean, all tests pass, the web bundle builds, the drive passes, the smoke test's five cases stop safely. The member runs `npm run export-whoop`, signs in, sees the summary lines, restarts Expo, and the app shows `REAL DATA · YOUR OWN EXPORT` and a forecast from the export time; deleting `data/replay.json` returns the synthetic week.
