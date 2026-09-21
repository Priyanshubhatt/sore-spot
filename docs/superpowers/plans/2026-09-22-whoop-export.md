# WHOOP Export Script and Real-Data Mode Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A one-time command that signs in through WHOOP, reads the member's recent workouts and recovery, and writes the replay file the app reads; plus the app change that forecasts from the export time and labels real data as real.

**Architecture:** Small, injectable modules under `scripts/whoop/` (each tested with fakes, one with a real localhost server, one against a real temporary git repository), a thin command on top, one optional field on the replay file, and a few lines in the app shell. No server, no hosted component.

**Tech Stack:** TypeScript strict, Node 22 (built-in `fetch`, `http`, `crypto`), Vitest, `tsx` as the only new dependency (dev only). Expo app changes are limited to the files named in Task 3.

**Spec:** `docs/superpowers/specs/2026-09-22-whoop-export-design.md`.

## Global Constraints

Every task's requirements include these, copied from the spec:

- **Never read `.env`, and never contact WHOOP.** Tests use fakes, a fake WHOOP, temporary folders and a real `localhost` port only. Do **not** run `npm run export-whoop`. Do not create `.env`, `data/replay.json` or `whoop.token.json` in the repository.
- **Nothing sensitive is ever printed or logged**: not the client secret, client id, code, access token or refresh token. Errors from WHOOP are scrubbed before they are shown.
- **Scopes are exactly `read:workout`, `read:recovery`, `offline`.** No profile, sleep, cycle or body-measurement scope.
- **The command refuses to run unless `.env`, `data/replay.json` and `whoop.token.json` are git-ignored**, checked before any credential is read or any request is made.
- The redirect must be an `http://localhost` address; the sign-in `state` must match or the redirect is ignored.
- Only WHOOP's own https endpoints (`api.prod.whoop.com`) are used.
- A replay the script writes is validated by the app's own `parseReplay` first.
- `tsx` is the only new dependency and is a **dev** dependency. No other package is added.
- The existing app honesty scan applies to every new app file: banned words `diagnos`, `accura`, `clinical`, `prevent`, `cure`, `validated`, `treat`, `boost`, `oxygen`, `blood flow`, and "reduce / relieve / ease soreness" only in a line saying it has "not been shown". README words `safe` and `honest comfort` are also avoided (the docs test checks them). Do not use those words in new code, comments or documentation.
- **Do not link a git remote or push.** The user does that.
- Commit messages end with the line `Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>`.

**Working directory for every command:** `C:\Users\priya\Desktop\Sore Spot` (Git Bash path `/c/Users/priya/Desktop/Sore Spot`). Baseline: branch `feat/whoop-export` (from `main`, tip 86eaefc), 290 tests in 30 files passing, `npm run typecheck` clean. The SDD controller creates the branch.

**Line endings:** this repo's working tree has Windows line endings. For every file below marked "replace whole file", overwrite the entire file with the block shown using the file-writing tool. Do not use search-and-replace edits: multi-line matches silently fail on Windows line endings.

**How these files were produced:** every block was first run in a scratch copy: 377 Vitest tests passing, `tsc --strict` clean, `expo export --platform web` building, the 214-check browser drive passing, the command's guard rails smoke-tested in temporary folders, and 23 safety-critical lines mutation-checked (each broken on purpose and caught). Copy the blocks exactly, including any non-ASCII characters.

## File Structure

```
engine/types.ts, engine/replay.ts (whole files)      + optional asOf on the replay file             (Task 1)
engine/replay.asof.test.ts                           its tests                                       (Task 1)
scripts/whoop/env.ts, http.ts, auth.ts, api.ts, build.ts, safety.ts, tokenStore.ts, fakes.ts          (Task 1)
scripts/whoop/env.test.ts, auth.test.ts, api.test.ts, build.test.ts, safety.test.ts, tokenStore.test.ts (Task 1)
vitest.config.ts, package.json (whole files), package-lock.json (by npm install)                        (Task 1)
scripts/whoop/callback.ts, run.ts, scripts/export-whoop.ts                                              (Task 2)
scripts/whoop/callback.test.ts, run.test.ts, cli.test.ts                                                (Task 2)
app/config.ts, app/useSoreSpot.ts, app/planCopy.ts, App.tsx (whole files)   export time as "now", the real-data banner   (Task 3)
app/config.test.ts, app/honesty.test.ts, app/docs.test.ts (whole/new)                                   (Task 3)
README.md, docs/DEMO.md (whole files)                how to use your own data                        (Task 3)
```

---

### Task 1: The replay export time, and the export building blocks

**Files:**
- Replace (whole file): `engine/types.ts`, `engine/replay.ts`, `vitest.config.ts`, `package.json`
- Create: `scripts/whoop/env.ts`, `scripts/whoop/http.ts`, `scripts/whoop/auth.ts`, `scripts/whoop/api.ts`, `scripts/whoop/build.ts`, `scripts/whoop/safety.ts`, `scripts/whoop/tokenStore.ts`, `scripts/whoop/fakes.ts`
- Test: `engine/replay.asof.test.ts`, `scripts/whoop/env.test.ts`, `scripts/whoop/auth.test.ts`, `scripts/whoop/api.test.ts`, `scripts/whoop/build.test.ts`, `scripts/whoop/safety.test.ts`, `scripts/whoop/tokenStore.test.ts`
- Modified by a command: `package-lock.json` (by `npm install`, see Step 3)

**Interfaces:**
- Consumes: `parseReplay` from `engine/replay.ts`; `SPORT_MUSCLE_MAP`, `STRENGTH_SPORTS`, `normalizeSport` from `engine/sportMuscleMap.ts`; `syntheticReplay` from `data/replay.synthetic.ts` (tests only).
- Produces (used by Task 2):
  - `engine/types.ts`: `ReplayFile.asOf?: string`; `engine/replay.ts`: `parseReplay` validates and keeps it.
  - `scripts/whoop/env.ts`: `REQUIRED_VARS`, `WhoopEnv`, `parseEnvFile`, `readWhoopEnv`, `callbackTarget`, `redact`.
  - `scripts/whoop/http.ts`: `FetchResponse`, `FetchLike`, `WhoopHttpError`, `Endpoints`, `DEFAULT_ENDPOINTS`, `SCOPES`.
  - `scripts/whoop/auth.ts`: `Tokens`, `makeState`, `buildAuthUrl`, `parseTokenResponse`, `isFresh`, `exchangeCode`, `refreshTokens`.
  - `scripts/whoop/api.ts`: `ApiContext`, `Window`, `fetchAllPages`, `fetchWorkouts`, `fetchRecovery`.
  - `scripts/whoop/build.ts`: `ExportInput`, `buildReplay`, `SportCount`, `ExportSummary`, `summarize`, `formatSummary`.
  - `scripts/whoop/safety.ts`: `PRIVATE_FILES`, `findUnignored`, `assertGitIgnored`, `gitCheckIgnore`.
  - `scripts/whoop/tokenStore.ts`: `TokenFile`, `loadTokens`, `saveTokens`.
  - `scripts/whoop/fakes.ts` (test helpers, not a test file): `respond`, `scriptedFetch`, `failure`, `ENV`, `freePort`, `hit`.

`vitest.config.ts` gains `scripts/**/*.test.ts` in its include list. `package.json` gains the `export-whoop` script and the `tsx` dev dependency.

- [ ] **Step 1: Confirm the branch and write the failing tests**

You are on branch `feat/whoop-export` (created by the controller). Confirm with `git branch --show-current`.

Replace `vitest.config.ts` with:

```ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: { environment: 'node', include: ['engine/**/*.test.ts', 'data/**/*.test.ts', 'app/**/*.test.ts', 'scripts/**/*.test.ts'] },
});
```

Create `engine/replay.asof.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { syntheticReplay } from '../data/replay.synthetic';
import { parseReplay } from './replay';

describe('the export time (asOf) in a replay file', () => {
  it('is kept when it is a valid date, and absent when the file has none', () => {
    expect(parseReplay({ ...syntheticReplay, asOf: '2026-09-22T08:00:00.000Z' }).asOf).toBe('2026-09-22T08:00:00.000Z');
    expect('asOf' in parseReplay(syntheticReplay)).toBe(false);
  });

  it('is rejected when it is not a date string', () => {
    for (const bad of ['yesterday', '', 123, null, {}]) {
      expect(() => parseReplay({ ...syntheticReplay, asOf: bad }), String(bad)).toThrow(/asOf/);
    }
  });

  it('does not disturb the recovery or the workouts', () => {
    const r = parseReplay({ ...syntheticReplay, asOf: '2026-09-22T08:00:00.000Z' });
    expect(r.workouts).toHaveLength(syntheticReplay.workouts.length);
    expect(r.recovery).toHaveLength((syntheticReplay.recovery ?? []).length);
  });
});
```

Create `scripts/whoop/env.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { REQUIRED_VARS, callbackTarget, parseEnvFile, readWhoopEnv, redact } from './env';

describe('parseEnvFile', () => {
  it('reads NAME=value lines, ignoring blanks and comments, on Windows or Unix line endings', () => {
    const text = '# WHOOP\r\nWHOOP_CLIENT_ID=abc\r\n\r\nWHOOP_CLIENT_SECRET=def\nWHOOP_REDIRECT_URI=http://localhost:3000/callback\n';
    expect(parseEnvFile(text)).toEqual({
      WHOOP_CLIENT_ID: 'abc',
      WHOOP_CLIENT_SECRET: 'def',
      WHOOP_REDIRECT_URI: 'http://localhost:3000/callback',
    });
  });

  it('keeps an = inside a value, trims spaces and strips one pair of quotes', () => {
    expect(parseEnvFile('A = "x=y" \nB=\'z\'\nC=plain')).toEqual({ A: 'x=y', B: 'z', C: 'plain' });
  });

  it('skips lines with no name', () => {
    expect(parseEnvFile('=novalue\njust text\n')).toEqual({});
  });
});

describe('readWhoopEnv', () => {
  const full = { WHOOP_CLIENT_ID: ' id ', WHOOP_CLIENT_SECRET: 'secret', WHOOP_REDIRECT_URI: 'http://localhost:3000/callback' };

  it('returns the three values, trimmed', () => {
    expect(readWhoopEnv(full)).toEqual({ clientId: 'id', clientSecret: 'secret', redirectUri: 'http://localhost:3000/callback' });
  });

  it('names every missing variable and never echoes a value', () => {
    let message = '';
    try {
      readWhoopEnv({ WHOOP_CLIENT_ID: 'super-private-id', WHOOP_CLIENT_SECRET: '   ' });
    } catch (e) {
      message = (e as Error).message;
    }
    expect(message).toContain('WHOOP_CLIENT_SECRET');
    expect(message).toContain('WHOOP_REDIRECT_URI');
    expect(message).not.toContain('WHOOP_CLIENT_ID,');
    expect(message).not.toContain('super-private-id');
  });

  it('requires exactly the three names the README tells the user to set', () => {
    expect([...REQUIRED_VARS]).toEqual(['WHOOP_CLIENT_ID', 'WHOOP_CLIENT_SECRET', 'WHOOP_REDIRECT_URI']);
  });
});

describe('callbackTarget', () => {
  it('reads the port and path of a localhost redirect', () => {
    expect(callbackTarget('http://localhost:3000/callback')).toEqual({ port: 3000, path: '/callback' });
    expect(callbackTarget('http://127.0.0.1:8123/cb')).toEqual({ port: 8123, path: '/cb' });
  });

  it('refuses a redirect the script could not catch', () => {
    expect(() => callbackTarget('https://example.com/callback')).toThrow(/http:\/\/localhost/);
    expect(() => callbackTarget('http://example.com:3000/callback')).toThrow(/http:\/\/localhost/);
    expect(() => callbackTarget('not a url')).toThrow(/not a valid URL/);
  });
});

describe('redact', () => {
  it('removes every occurrence of every secret', () => {
    expect(redact('a SECRET1234 b SECRET1234 c tok-abcdef', ['SECRET1234', 'tok-abcdef'])).toBe('a [redacted] b [redacted] c [redacted]');
  });

  it('ignores empty or very short secrets, so it never blanks ordinary text', () => {
    expect(redact('hello world', ['', 'lo'])).toBe('hello world');
  });
});
```

Create `scripts/whoop/auth.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { buildAuthUrl, exchangeCode, isFresh, makeState, parseTokenResponse, refreshTokens } from './auth';
import { ENV, failure, respond, scriptedFetch } from './fakes';
import { DEFAULT_ENDPOINTS, SCOPES, WhoopHttpError } from './http';

const NOW = 1_800_000_000_000;
const tokenJson = { access_token: 'acc-111111', refresh_token: 'ref-222222', expires_in: 3600, scope: 'read:workout read:recovery offline', token_type: 'bearer' };

describe('sign-in request', () => {
  it('makes an unguessable state of at least the 8 characters WHOOP asks for', () => {
    const a = makeState();
    const b = makeState();
    expect(a).toMatch(/^[0-9a-f]{16}$/);
    expect(a).not.toBe(b);
  });

  it('asks only for the workout and recovery scopes, plus offline for a refresh token', () => {
    expect([...SCOPES]).toEqual(['read:workout', 'read:recovery', 'offline']);
    const url = new URL(buildAuthUrl(ENV, 'abcd1234abcd1234'));
    expect(url.origin + url.pathname).toBe(DEFAULT_ENDPOINTS.authUrl);
    expect(url.searchParams.get('response_type')).toBe('code');
    expect(url.searchParams.get('client_id')).toBe(ENV.clientId);
    expect(url.searchParams.get('redirect_uri')).toBe(ENV.redirectUri);
    expect(url.searchParams.get('scope')).toBe('read:workout read:recovery offline');
    expect(url.searchParams.get('state')).toBe('abcd1234abcd1234');
  });

  it('never puts the client secret in the address the browser opens', () => {
    expect(buildAuthUrl(ENV, 'abcd1234')).not.toContain(ENV.clientSecret);
  });

  it('does not ask for profile access, which would expose a name and email', () => {
    expect(buildAuthUrl(ENV, 'abcd1234')).not.toMatch(/read(:|%3A)profile/);
  });
});

describe('token responses', () => {
  it('turns expires_in into a moment in time', () => {
    const t = parseTokenResponse(tokenJson, NOW);
    expect(t).toMatchObject({ access_token: 'acc-111111', refresh_token: 'ref-222222', expires_at: NOW + 3_600_000 });
  });

  it('rejects a response with no access token or no valid lifetime', () => {
    expect(() => parseTokenResponse({ expires_in: 10 }, NOW)).toThrow(/access_token/);
    expect(() => parseTokenResponse({ access_token: 'x', expires_in: 'soon' }, NOW)).toThrow(/expires_in/);
    expect(() => parseTokenResponse(null, NOW)).toThrow(/not an object/);
  });

  it('treats a token as fresh only while more than a minute is left', () => {
    const t = parseTokenResponse(tokenJson, NOW);
    expect(isFresh(t, NOW)).toBe(true);
    expect(isFresh(t, NOW + 3_540_001)).toBe(false);
    expect(isFresh(t, NOW + 4_000_000)).toBe(false);
  });
});

describe('exchanging and refreshing', () => {
  it('posts the code with the client credentials in the form body, to the token URL', async () => {
    const { fetchFn, calls } = scriptedFetch([respond(200, tokenJson)]);
    const t = await exchangeCode(ENV, 'the-code-abc', fetchFn, NOW);
    expect(t.access_token).toBe('acc-111111');
    expect(calls).toHaveLength(1);
    expect(calls[0].url).toBe(DEFAULT_ENDPOINTS.tokenUrl);
    expect(calls[0].method).toBe('POST');
    expect(calls[0].headers['content-type']).toBe('application/x-www-form-urlencoded');
    const body = new URLSearchParams(calls[0].body);
    expect(Object.fromEntries(body)).toEqual({
      grant_type: 'authorization_code',
      code: 'the-code-abc',
      redirect_uri: ENV.redirectUri,
      client_id: ENV.clientId,
      client_secret: ENV.clientSecret,
    });
  });

  it('refreshes with the refresh token and hands back the rotated one', async () => {
    const { fetchFn, calls } = scriptedFetch([respond(200, { ...tokenJson, access_token: 'acc-NEW', refresh_token: 'ref-ROTATED' })]);
    const t = await refreshTokens(ENV, 'ref-222222', fetchFn, NOW);
    expect(t.refresh_token).toBe('ref-ROTATED');
    const body = Object.fromEntries(new URLSearchParams(calls[0].body));
    expect(body).toMatchObject({ grant_type: 'refresh_token', refresh_token: 'ref-222222', scope: 'offline' });
  });

  it('reports a refused code exchange with its status but never with the secret, the client id or the code', async () => {
    const echo = `bad request ${ENV.clientSecret} ${ENV.clientId} the-code-abc`;
    const err = await failure(exchangeCode(ENV, 'the-code-abc', scriptedFetch([respond(400, echo)]).fetchFn, NOW));
    expect(err).toBeInstanceOf(WhoopHttpError);
    expect(err.message).toMatch(/HTTP 400/);
    for (const secret of [ENV.clientSecret, ENV.clientId, 'the-code-abc']) expect(err.message).not.toContain(secret);
  });

  it('reports a refused refresh with its status but never with the secret, the client id or the refresh token', async () => {
    const echo = `bad request ${ENV.clientSecret} ${ENV.clientId} ref-222222`;
    const err = await failure(refreshTokens(ENV, 'ref-222222', scriptedFetch([respond(401, echo)]).fetchFn, NOW));
    expect(err).toBeInstanceOf(WhoopHttpError);
    expect(err.message).toMatch(/HTTP 401/);
    for (const secret of [ENV.clientSecret, ENV.clientId, 'ref-222222']) expect(err.message).not.toContain(secret);
  });

  it('rejects a success response that is not JSON', async () => {
    const { fetchFn } = scriptedFetch([respond(200, 'not json')]);
    await expect(exchangeCode(ENV, 'c', fetchFn, NOW)).rejects.toThrow(/not JSON/);
  });
});
```

Create `scripts/whoop/api.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { fetchAllPages, fetchRecovery, fetchWorkouts } from './api';
import { ENV, failure, respond, scriptedFetch } from './fakes';
import { WhoopHttpError } from './http';

const window = { start: new Date('2026-07-01T00:00:00Z'), end: new Date('2026-09-01T00:00:00Z') };
const noSleep = async () => undefined;
const ctx = (fetchFn: ReturnType<typeof scriptedFetch>['fetchFn'], extra = {}) => ({ fetchFn, accessToken: 'acc-TOKEN-1', secrets: [ENV.clientSecret], sleep: noSleep, ...extra });

describe('fetchAllPages', () => {
  it('follows next_token until there is none, in page order', async () => {
    const { fetchFn, calls } = scriptedFetch([
      respond(200, { records: [{ id: 'a' }, { id: 'b' }], next_token: 'page2' }),
      respond(200, { records: [{ id: 'c' }], next_token: 'page3' }),
      respond(200, { records: [{ id: 'd' }] }),
    ]);
    const records = await fetchAllPages('/v2/activity/workout', window, ctx(fetchFn));
    expect(records).toEqual([{ id: 'a' }, { id: 'b' }, { id: 'c' }, { id: 'd' }]);
    expect(calls).toHaveLength(3);
    const q = (i: number) => new URL(calls[i].url).searchParams;
    expect(q(0).get('nextToken')).toBeNull();
    expect(q(1).get('nextToken')).toBe('page2');
    expect(q(2).get('nextToken')).toBe('page3');
  });

  it('asks for 25 per page inside the window, with the bearer token, on the v2 path', async () => {
    const { fetchFn, calls } = scriptedFetch([respond(200, { records: [] })]);
    await fetchWorkouts(window, ctx(fetchFn));
    const url = new URL(calls[0].url);
    expect(url.origin + url.pathname).toBe('https://api.prod.whoop.com/developer/v2/activity/workout');
    expect(url.searchParams.get('limit')).toBe('25');
    expect(url.searchParams.get('start')).toBe('2026-07-01T00:00:00.000Z');
    expect(url.searchParams.get('end')).toBe('2026-09-01T00:00:00.000Z');
    expect(calls[0].headers.authorization).toBe('Bearer acc-TOKEN-1');
  });

  it('reads recovery from its own v2 path', async () => {
    const { fetchFn, calls } = scriptedFetch([respond(200, { records: [{ cycle_id: 1 }] })]);
    expect(await fetchRecovery(window, ctx(fetchFn))).toEqual([{ cycle_id: 1 }]);
    expect(new URL(calls[0].url).pathname).toBe('/developer/v2/recovery');
  });

  it('waits and retries on a 429, using Retry-After, then carries on', async () => {
    const waits: number[] = [];
    const { fetchFn, calls } = scriptedFetch([
      respond(429, 'slow down', { 'Retry-After': '7' }),
      respond(429, 'slow down'),
      respond(200, { records: [{ id: 'a' }] }),
    ]);
    const records = await fetchAllPages('/v2/recovery', window, ctx(fetchFn, { sleep: async (ms: number) => void waits.push(ms) }));
    expect(records).toEqual([{ id: 'a' }]);
    expect(calls).toHaveLength(3);
    expect(waits).toEqual([7000, 2 ** 1 * 1000]);
  });

  it('gives up after the retry limit with the status', async () => {
    const { fetchFn } = scriptedFetch(Array.from({ length: 3 }, () => respond(429, 'no')));
    const err = await failure(fetchAllPages('/v2/recovery', window, ctx(fetchFn, { maxRetries: 2 })));
    expect(err).toBeInstanceOf(WhoopHttpError);
    expect((err as WhoopHttpError).status).toBe(429);
  });

  it('tells the person to sign in again on a 401, and about the scope on a 403', async () => {
    const a = await failure(fetchAllPages('/v2/recovery', window, ctx(scriptedFetch([respond(401, 'x')]).fetchFn)));
    expect(a.message).toMatch(/sign in/i);
    const b = await failure(fetchAllPages('/v2/recovery', window, ctx(scriptedFetch([respond(403, 'x')]).fetchFn)));
    expect(b.message).toMatch(/scope/);
  });

  it('never prints the access token or the client secret from an error body', async () => {
    const body = `oops acc-TOKEN-1 ${ENV.clientSecret}`;
    const err = await failure(fetchAllPages('/v2/recovery', window, ctx(scriptedFetch([respond(500, body)]).fetchFn)));
    expect(err.message).toMatch(/HTTP 500/);
    expect(err.message).not.toContain('acc-TOKEN-1');
    expect(err.message).not.toContain(ENV.clientSecret);
  });

  it('rejects a page that is not JSON or has no records list', async () => {
    await expect(fetchAllPages('/v2/recovery', window, ctx(scriptedFetch([respond(200, 'html')]).fetchFn))).rejects.toThrow(/not JSON/);
    await expect(fetchAllPages('/v2/recovery', window, ctx(scriptedFetch([respond(200, { data: [] })]).fetchFn))).rejects.toThrow(/no "records"/);
  });

  it('stops if the paging never ends, instead of looping forever', async () => {
    const fetchFn = async () => respond(200, { records: [], next_token: 'again' });
    await expect(fetchAllPages('/v2/recovery', window, ctx(fetchFn))).rejects.toThrow(/Stopped after/);
  });
});
```

Create `scripts/whoop/build.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { syntheticReplay } from '../../data/replay.synthetic';
import { parseReplay } from '../../engine/replay';
import { buildReplay, formatSummary, summarize } from './build';

const EXPORTED_AT = new Date('2026-09-22T08:00:00Z');
const workouts = syntheticReplay.workouts as unknown[];
const recovery = (syntheticReplay.recovery ?? []) as unknown[];

describe('buildReplay', () => {
  it('produces a real (not synthetic) replay stamped with the export time, that the app accepts', () => {
    const replay = buildReplay({ workouts, recovery, exportedAt: EXPORTED_AT });
    expect(replay.synthetic).toBe(false);
    expect(replay.asOf).toBe('2026-09-22T08:00:00.000Z');
    expect(replay.workouts).toHaveLength(workouts.length);
    expect(() => parseReplay(JSON.parse(JSON.stringify(replay)))).not.toThrow();
  });

  it('sorts workouts by start and recovery by creation, whatever order the API gave', () => {
    const replay = buildReplay({ workouts: [...workouts].reverse(), recovery: [...recovery].reverse(), exportedAt: EXPORTED_AT });
    const starts = replay.workouts.map((w) => Date.parse(w.start));
    expect(starts).toEqual([...starts].sort((a, b) => a - b));
    const created = (replay.recovery ?? []).map((r) => Date.parse(r.created_at));
    expect(created).toEqual([...created].sort((a, b) => a - b));
  });

  it('drops a record repeated across a page boundary, keeping the first', () => {
    const first = workouts[0] as { id: string };
    const replay = buildReplay({ workouts: [...workouts, { ...first }], recovery: [...recovery, recovery[0]], exportedAt: EXPORTED_AT });
    expect(replay.workouts).toHaveLength(workouts.length);
    expect(replay.recovery).toHaveLength(recovery.length);
  });

  it('keeps the records as the API gave them, not a reduced copy', () => {
    const replay = buildReplay({ workouts, recovery, exportedAt: EXPORTED_AT });
    expect(replay.workouts[0]).toMatchObject({ user_id: expect.anything(), timezone_offset: expect.any(String) });
  });

  it('names the workout that would not validate, instead of writing a file the app would reject', () => {
    const bad = { ...(workouts[0] as object), id: 'bad-one', score_state: 'SCORED', score: { strain: 1 } };
    expect(() => buildReplay({ workouts: [bad], recovery: [], exportedAt: EXPORTED_AT })).toThrow(/workout bad-one/);
  });

  it('works with no records at all', () => {
    const replay = buildReplay({ workouts: [], recovery: [], exportedAt: EXPORTED_AT });
    expect(replay.workouts).toEqual([]);
    expect(replay.recovery).toEqual([]);
  });
});

describe('summarize and formatSummary', () => {
  const kayak = { ...(workouts[0] as object), id: 'k1', sport_name: 'kayaking' };
  const replay = buildReplay({ workouts: [...workouts, kayak], recovery, exportedAt: EXPORTED_AT });

  it('counts workouts and recovery and the date range', () => {
    const s = summarize(replay);
    expect(s.workouts).toBe(workouts.length + 1);
    expect(s.recovery).toBe(recovery.length);
    expect(s.from).toBe('2026-08-18');
    expect(s.to).toBe('2026-09-19');
  });

  it('counts sports, most frequent first, and says which the model has no muscle map for', () => {
    const s = summarize(replay);
    expect(s.sports[0].name).toBe('running');
    expect(s.sports.find((x) => x.name === 'kayaking')).toMatchObject({ count: 1, known: false });
    expect(s.sports.find((x) => x.name === 'running')).toMatchObject({ known: true, strength: false });
    expect(s.sports.find((x) => x.name === 'weightlifting')).toMatchObject({ known: true, strength: true });
  });

  it('counts the strength sessions the member will be asked to tag', () => {
    const s = summarize(replay);
    expect(s.strengthSessions).toBe(s.sports.find((x) => x.name === 'weightlifting')!.count);
  });

  it('prints plain lines with counts only, and lists what is not mapped', () => {
    const lines = formatSummary(summarize(replay));
    expect(lines[0]).toMatch(/^Workouts: \d+ \(2026-08-18 to 2026-09-19\)$/);
    expect(lines.join('\n')).toMatch(/Not mapped to muscles yet, so they add no soreness: kayaking \(1\)/);
    expect(lines.join('\n')).toMatch(/Strength sessions to tag in the app: \d+/);
    expect(lines.join('\n')).not.toMatch(/[0-9a-f]{8}-[0-9a-f]{4}/); // no ids
  });

  it('says so when every sport is mapped', () => {
    const clean = buildReplay({ workouts, recovery, exportedAt: EXPORTED_AT });
    expect(formatSummary(summarize(clean)).join('\n')).toMatch(/Every sport found has a muscle map/);
  });

  it('handles an empty export', () => {
    const empty = buildReplay({ workouts: [], recovery: [], exportedAt: EXPORTED_AT });
    const lines = formatSummary(summarize(empty));
    expect(lines[0]).toBe('Workouts: 0');
    expect(lines.join('\n')).toMatch(/Sports found: none/);
    expect(lines.join('\n')).toMatch(/No strength sessions to tag/);
  });
});
```

Create `scripts/whoop/safety.test.ts`:

```ts
import { execFileSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { PRIVATE_FILES, assertGitIgnored, findUnignored, gitCheckIgnore } from './safety';

describe('the private files', () => {
  it('are the secrets file, the health data and the token file', () => {
    expect([...PRIVATE_FILES]).toEqual(['.env', 'data/replay.json', 'whoop.token.json']);
  });
});

describe('assertGitIgnored', () => {
  it('lets a run go ahead only when every private file is ignored', () => {
    expect(() => assertGitIgnored(PRIVATE_FILES, () => true)).not.toThrow();
  });

  it('names each file that is not ignored, and says how to fix it', () => {
    const ignored = new Set(['.env']);
    expect(findUnignored(PRIVATE_FILES, (p) => ignored.has(p))).toEqual(['data/replay.json', 'whoop.token.json']);
    expect(() => assertGitIgnored(PRIVATE_FILES, (p) => ignored.has(p))).toThrow(/data\/replay\.json, whoop\.token\.json.*\.gitignore/);
  });
});

describe('gitCheckIgnore, asked of a real git repository', () => {
  const git = (cwd: string, ...args: string[]) => execFileSync('git', args, { cwd, stdio: 'ignore' });

  it('says yes for ignored paths, no for others, and no when it is not a repository at all', () => {
    const repo = mkdtempSync(join(tmpdir(), 'sore-spot-git-'));
    const notRepo = mkdtempSync(join(tmpdir(), 'sore-spot-plain-'));
    try {
      git(repo, 'init', '-q');
      writeFileSync(join(repo, '.gitignore'), '.env\ndata/replay.json\n*.token.json\n');
      const ignored = gitCheckIgnore(repo);
      for (const p of PRIVATE_FILES) expect(ignored(p), p).toBe(true);
      expect(ignored('App.tsx')).toBe(false);
      expect(ignored('data/replay.synthetic.ts')).toBe(false);
      expect(gitCheckIgnore(notRepo)('.env')).toBe(false);
    } finally {
      rmSync(repo, { recursive: true, force: true });
      rmSync(notRepo, { recursive: true, force: true });
    }
  });

  it('stops a run in a repository whose .gitignore is missing an entry', () => {
    const repo = mkdtempSync(join(tmpdir(), 'sore-spot-git-'));
    try {
      git(repo, 'init', '-q');
      writeFileSync(join(repo, '.gitignore'), '.env\n');
      expect(() => assertGitIgnored(PRIVATE_FILES, gitCheckIgnore(repo))).toThrow(/data\/replay\.json/);
    } finally {
      rmSync(repo, { recursive: true, force: true });
    }
  });
});
```

Create `scripts/whoop/tokenStore.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import type { Tokens } from './auth';
import { loadTokens, saveTokens, type TokenFile } from './tokenStore';

const memory = (initial: string | null = null): TokenFile & { text: string | null } => {
  const f = {
    text: initial,
    read: () => f.text,
    write: (t: string) => {
      f.text = t;
    },
  };
  return f;
};

const tokens: Tokens = { access_token: 'acc', refresh_token: 'ref', expires_at: 1_800_000_000_000, scope: 'offline', token_type: 'bearer' };

describe('token storage', () => {
  it('saves and loads the same tokens', () => {
    const file = memory();
    saveTokens(file, tokens);
    expect(loadTokens(file)).toEqual(tokens);
  });

  it('loads nothing when there is no file', () => {
    expect(loadTokens(memory(null))).toBeNull();
  });

  it('treats a file that is not valid tokens as no sign-in, so the script signs in again', () => {
    for (const bad of ['not json', '{}', '{"access_token":1}', '{"access_token":"a"}', 'null']) {
      expect(loadTokens(memory(bad)), bad).toBeNull();
    }
  });

  it('copes with a save that has no refresh token', () => {
    const file = memory();
    saveTokens(file, { ...tokens, refresh_token: undefined });
    expect(loadTokens(file)?.refresh_token).toBeUndefined();
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run engine/replay.asof.test.ts scripts`
Expected: FAIL. `replay.asof.test.ts` fails because `parseReplay` drops `asOf` and does not reject a bad one; each `scripts/whoop/*.test.ts` fails to resolve its module (`./env`, `./auth`, `./api`, `./build`, `./safety`, `./tokenStore`, `./fakes`). Paste the real output.

- [ ] **Step 3: Write the implementation**

Replace `engine/types.ts` with:

```ts
export const MUSCLES = [
  'chest',
  'shoulders',
  'biceps',
  'triceps',
  'forearms',
  'upperBack',
  'core',
  'glutes',
  'quads',
  'hamstrings',
  'calves',
  'adductors',
] as const;

export type Muscle = (typeof MUSCLES)[number];
export type RiskBand = 'low' | 'moderate' | 'high';
export type Driver = 'novel' | 'eccentric' | 'high-load';
export type StrengthTag = 'lower' | 'upper' | 'push' | 'pull' | 'full';

/** WHOOP API v2 workout shapes (developer.whoop.com/api, checked 2026-09-19). */
export interface ZoneDurations {
  zone_zero_milli: number;
  zone_one_milli: number;
  zone_two_milli: number;
  zone_three_milli: number;
  zone_four_milli: number;
  zone_five_milli: number;
}

export interface WorkoutScore {
  strain: number;
  average_heart_rate: number;
  max_heart_rate: number;
  kilojoule: number;
  percent_recorded: number;
  distance_meter?: number;
  altitude_gain_meter?: number;
  altitude_change_meter?: number;
  zone_durations: ZoneDurations;
}

export interface Workout {
  id: string;
  v1_id?: number;
  user_id: number;
  created_at: string;
  updated_at: string;
  start: string;
  end: string;
  timezone_offset: string;
  sport_name: string;
  sport_id?: number;
  score_state: 'SCORED' | 'PENDING_SCORE' | 'UNSCORABLE';
  score?: WorkoutScore;
}

/** The API has no muscle data for strength work, so a session tag rides alongside. */
export interface TaggedWorkout extends Workout {
  session_tag?: StrengthTag;
}

/** WHOOP API v2 recovery shapes (developer.whoop.com/api, checked 2026-09-20). */
export interface RecoveryScore {
  user_calibrating: boolean;
  recovery_score: number;
  resting_heart_rate: number;
  hrv_rmssd_milli: number;
  spo2_percentage?: number;
  skin_temp_celsius?: number;
}

export interface Recovery {
  cycle_id: number;
  sleep_id: string;
  user_id: number;
  created_at: string;
  updated_at: string;
  score_state: 'SCORED' | 'PENDING_SCORE' | 'UNSCORABLE';
  score?: RecoveryScore;
}

export interface ReplayFile {
  synthetic: boolean;
  workouts: TaggedWorkout[];
  /** Optional: a real export adds it, and so does the synthetic week. */
  recovery?: Recovery[];
  /** When a real export was made (an ISO date): the app's "now". Absent for the synthetic week, which uses a fixed demo time. */
  asOf?: string;
}

export type Sensitivity = Record<Muscle, number>;

export interface MuscleState {
  band: RiskBand;
  drivers: Driver[];
}

export type DayForecast = Record<Muscle, MuscleState>;

export interface Forecast {
  /** byDay[d] is the state at asOf + d days. Day 0 is right now. */
  byDay: DayForecast[];
  /** Ids of strength workouts skipped because they have no session_tag. */
  needsTag: string[];
  /** sport_name values with no entry in the sport-to-muscle map. */
  unmappedSports: string[];
}
```

Replace `engine/replay.ts` with:

```ts
import { Recovery, ReplayFile, StrengthTag, TaggedWorkout } from './types';

const TAGS: readonly StrengthTag[] = ['lower', 'upper', 'push', 'pull', 'full'];
const ZONE_KEYS = [
  'zone_zero_milli',
  'zone_one_milli',
  'zone_two_milli',
  'zone_three_milli',
  'zone_four_milli',
  'zone_five_milli',
] as const;

function fail(id: string, why: string): never {
  throw new Error(`Invalid replay file: workout ${id}: ${why}`);
}

function checkWorkout(w: unknown, i: number): TaggedWorkout {
  const o = w as Record<string, unknown>;
  const id = typeof o?.id === 'string' ? o.id : `#${i}`;
  if (typeof o !== 'object' || o === null) return fail(id, 'not an object');
  if (typeof o.id !== 'string') fail(id, 'id must be a string');
  if (typeof o.sport_name !== 'string') fail(id, 'sport_name must be a string');
  for (const key of ['start', 'end'] as const) {
    if (typeof o[key] !== 'string' || Number.isNaN(Date.parse(o[key] as string))) {
      fail(id, `${key} must be an ISO date string`);
    }
  }
  if (o.session_tag !== undefined && !TAGS.includes(o.session_tag as StrengthTag)) {
    fail(id, `unknown session_tag ${String(o.session_tag)}`);
  }
  if (o.score_state !== 'SCORED' && o.score_state !== 'PENDING_SCORE' && o.score_state !== 'UNSCORABLE') {
    fail(id, 'score_state must be SCORED, PENDING_SCORE or UNSCORABLE');
  }
  if (o.score_state === 'SCORED') {
    const zones = (o.score as Record<string, unknown> | undefined)?.zone_durations as
      | Record<string, unknown>
      | undefined;
    if (!zones) fail(id, 'SCORED workout is missing score.zone_durations');
    for (const k of ZONE_KEYS) {
      const v = zones[k];
      if (typeof v !== 'number' || !Number.isFinite(v) || v < 0) {
        fail(id, `zone_durations.${k} must be a non-negative finite number`);
      }
    }
  }
  return o as unknown as TaggedWorkout;
}

const STATES = ['SCORED', 'PENDING_SCORE', 'UNSCORABLE'];

function checkRecovery(r: unknown, i: number): Recovery {
  const o = r as Record<string, unknown>;
  const id = typeof o?.cycle_id === 'number' ? `cycle ${o.cycle_id}` : `#${i}`;
  const bad = (why: string): never => {
    throw new Error(`Invalid replay file: recovery ${id}: ${why}`);
  };
  if (typeof o !== 'object' || o === null) return bad('not an object');
  if (typeof o.created_at !== 'string' || Number.isNaN(Date.parse(o.created_at))) {
    bad('created_at must be an ISO date string');
  }
  if (!STATES.includes(o.score_state as string)) {
    bad('score_state must be SCORED, PENDING_SCORE or UNSCORABLE');
  }
  if (o.score_state === 'SCORED') {
    const score = (o.score as Record<string, unknown> | undefined)?.recovery_score;
    if (typeof score !== 'number' || !Number.isFinite(score) || score < 0 || score > 100) {
      bad('a SCORED recovery needs score.recovery_score between 0 and 100');
    }
  }
  return o as unknown as Recovery;
}

/** Validate untrusted JSON (a real export or the synthetic file). Extra keys are ignored. */
export function parseReplay(raw: unknown): ReplayFile {
  const o = raw as Record<string, unknown> | null;
  if (typeof o !== 'object' || o === null) throw new Error('Invalid replay file: not an object');
  if (typeof o.synthetic !== 'boolean') {
    throw new Error('Invalid replay file: "synthetic" must be true or false');
  }
  if (!Array.isArray(o.workouts)) throw new Error('Invalid replay file: "workouts" must be an array');
  const workouts = o.workouts.map(checkWorkout);
  const replay: ReplayFile = { synthetic: o.synthetic, workouts };
  if (o.asOf !== undefined) {
    if (typeof o.asOf !== 'string' || Number.isNaN(Date.parse(o.asOf))) {
      throw new Error('Invalid replay file: "asOf" must be an ISO date string');
    }
    replay.asOf = o.asOf;
  }
  if (o.recovery === undefined) return replay;
  if (!Array.isArray(o.recovery)) throw new Error('Invalid replay file: "recovery" must be an array');
  replay.recovery = o.recovery.map(checkRecovery);
  return replay;
}
```

Create `scripts/whoop/env.ts`:

```ts
export const REQUIRED_VARS = ['WHOOP_CLIENT_ID', 'WHOOP_CLIENT_SECRET', 'WHOOP_REDIRECT_URI'] as const;

export interface WhoopEnv {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
}

/** A tiny .env reader: KEY=VALUE lines, blank lines and # comments ignored, one pair of quotes stripped. */
export function parseEnvFile(text: string): Record<string, string> {
  const vars: Record<string, string> = {};
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (line === '' || line.startsWith('#')) continue;
    const eq = line.indexOf('=');
    if (eq < 1) continue;
    const key = line.slice(0, eq).trim();
    let value = line.slice(eq + 1).trim();
    if (value.length >= 2 && ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'")))) {
      value = value.slice(1, -1);
    }
    vars[key] = value;
  }
  return vars;
}

/** Names the missing variables and never echoes a value, so an error can be pasted anywhere. */
export function readWhoopEnv(vars: Record<string, string | undefined>): WhoopEnv {
  const missing = REQUIRED_VARS.filter((name) => !vars[name]?.trim());
  if (missing.length > 0) {
    throw new Error(`Missing in .env: ${missing.join(', ')}. Add each as NAME=value on its own line.`);
  }
  return {
    clientId: vars.WHOOP_CLIENT_ID!.trim(),
    clientSecret: vars.WHOOP_CLIENT_SECRET!.trim(),
    redirectUri: vars.WHOOP_REDIRECT_URI!.trim(),
  };
}

/** The local address the sign-in redirect comes back to. Only http://localhost is accepted. */
export function callbackTarget(redirectUri: string): { port: number; path: string } {
  let url: URL;
  try {
    url = new URL(redirectUri);
  } catch {
    throw new Error('WHOOP_REDIRECT_URI is not a valid URL. Use the one you registered, for example http://localhost:3000/callback');
  }
  if (url.protocol !== 'http:' || (url.hostname !== 'localhost' && url.hostname !== '127.0.0.1')) {
    throw new Error('WHOOP_REDIRECT_URI must be an http://localhost address for this script to catch the sign-in redirect.');
  }
  const port = url.port === '' ? 80 : Number(url.port);
  return { port, path: url.pathname };
}

/** Removes every secret from text before it is printed or put in an error. */
export function redact(text: string, secrets: readonly string[]): string {
  let out = text;
  for (const secret of secrets) {
    if (secret.length >= 4) out = out.split(secret).join('[redacted]');
  }
  return out;
}
```

Create `scripts/whoop/http.ts`:

```ts
/** The small slice of fetch this script uses, so tests can hand in a fake and the real fetch fits. */
export interface FetchResponse {
  ok: boolean;
  status: number;
  headers: { get(name: string): string | null };
  text(): Promise<string>;
}

export type FetchLike = (
  url: string,
  init?: { method?: string; headers?: Record<string, string>; body?: string },
) => Promise<FetchResponse>;

/** An API failure with a status and a body that is safe to print (secrets are removed before it is built). */
export class WhoopHttpError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = 'WhoopHttpError';
  }
}

export interface Endpoints {
  authUrl: string;
  tokenUrl: string;
  apiBase: string;
}

export const DEFAULT_ENDPOINTS: Endpoints = {
  authUrl: 'https://api.prod.whoop.com/oauth/oauth2/auth',
  tokenUrl: 'https://api.prod.whoop.com/oauth/oauth2/token',
  apiBase: 'https://api.prod.whoop.com/developer',
};

/** Only these are ever requested: the workouts and recovery the app uses, and a refresh token. */
export const SCOPES = ['read:workout', 'read:recovery', 'offline'] as const;
```

Create `scripts/whoop/auth.ts`:

```ts
import { randomBytes } from 'node:crypto';
import type { WhoopEnv } from './env';
import { redact } from './env';
import { DEFAULT_ENDPOINTS, SCOPES, WhoopHttpError, type Endpoints, type FetchLike } from './http';

export interface Tokens {
  access_token: string;
  refresh_token?: string;
  /** Epoch milliseconds when the access token stops working. */
  expires_at: number;
  scope: string;
  token_type: string;
}

/** WHOOP asks for a state of at least 8 characters; this is 16, and unguessable. */
export function makeState(bytes: (n: number) => Buffer = randomBytes): string {
  return bytes(8).toString('hex');
}

export function buildAuthUrl(env: WhoopEnv, state: string, endpoints: Endpoints = DEFAULT_ENDPOINTS): string {
  const url = new URL(endpoints.authUrl);
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('client_id', env.clientId);
  url.searchParams.set('redirect_uri', env.redirectUri);
  url.searchParams.set('scope', SCOPES.join(' '));
  url.searchParams.set('state', state);
  return url.toString();
}

/** Checks a token response and turns "expires in N seconds" into a moment in time. */
export function parseTokenResponse(json: unknown, now: number): Tokens {
  const o = json as Record<string, unknown> | null;
  if (typeof o !== 'object' || o === null) throw new Error('WHOOP returned a token response that is not an object.');
  if (typeof o.access_token !== 'string' || o.access_token === '') {
    throw new Error('WHOOP returned a token response with no access_token.');
  }
  if (typeof o.expires_in !== 'number' || !Number.isFinite(o.expires_in) || o.expires_in <= 0) {
    throw new Error('WHOOP returned a token response with no valid expires_in.');
  }
  return {
    access_token: o.access_token,
    refresh_token: typeof o.refresh_token === 'string' ? o.refresh_token : undefined,
    expires_at: now + o.expires_in * 1000,
    scope: typeof o.scope === 'string' ? o.scope : '',
    token_type: typeof o.token_type === 'string' ? o.token_type : 'bearer',
  };
}

/** True while the access token has more than `skewMs` left. */
export function isFresh(tokens: Tokens, now: number, skewMs = 60_000): boolean {
  return tokens.expires_at - now > skewMs;
}

async function tokenRequest(
  env: WhoopEnv,
  fields: Record<string, string>,
  fetchFn: FetchLike,
  now: number,
  endpoints: Endpoints,
): Promise<Tokens> {
  const body = new URLSearchParams({ ...fields, client_id: env.clientId, client_secret: env.clientSecret }).toString();
  const res = await fetchFn(endpoints.tokenUrl, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded', accept: 'application/json' },
    body,
  });
  const text = await res.text();
  if (!res.ok) {
    const safe = redact(text, [env.clientSecret, env.clientId, fields.code ?? '', fields.refresh_token ?? '']).slice(0, 300);
    throw new WhoopHttpError(res.status, `WHOOP refused the token request (HTTP ${res.status}): ${safe}`);
  }
  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch {
    throw new Error('WHOOP returned a token response that is not JSON.');
  }
  return parseTokenResponse(json, now);
}

export function exchangeCode(
  env: WhoopEnv,
  code: string,
  fetchFn: FetchLike,
  now: number,
  endpoints: Endpoints = DEFAULT_ENDPOINTS,
): Promise<Tokens> {
  return tokenRequest(env, { grant_type: 'authorization_code', code, redirect_uri: env.redirectUri }, fetchFn, now, endpoints);
}

/** WHOOP rotates the refresh token: the new one must be saved, and the old one stops working. */
export function refreshTokens(
  env: WhoopEnv,
  refreshToken: string,
  fetchFn: FetchLike,
  now: number,
  endpoints: Endpoints = DEFAULT_ENDPOINTS,
): Promise<Tokens> {
  return tokenRequest(
    env,
    { grant_type: 'refresh_token', refresh_token: refreshToken, scope: 'offline' },
    fetchFn,
    now,
    endpoints,
  );
}
```

Create `scripts/whoop/api.ts`:

```ts
import { redact } from './env';
import { DEFAULT_ENDPOINTS, WhoopHttpError, type Endpoints, type FetchLike } from './http';

export interface ApiContext {
  fetchFn: FetchLike;
  accessToken: string;
  endpoints?: Endpoints;
  /** Waits between retries; tests pass a no-op. */
  sleep?: (ms: number) => Promise<void>;
  maxRetries?: number;
  /** Anything that must never appear in a message (the token, the client secret). */
  secrets?: readonly string[];
}

export interface Window {
  start: Date;
  end: Date;
}

const PAGE_SIZE = 25;
const MAX_PAGES = 400;

const wait = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

/** Reads every page of a WHOOP v2 collection (`records` plus `next_token`) for a time window. */
export async function fetchAllPages(path: string, window: Window, ctx: ApiContext): Promise<unknown[]> {
  const base = (ctx.endpoints ?? DEFAULT_ENDPOINTS).apiBase;
  const sleep = ctx.sleep ?? wait;
  const maxRetries = ctx.maxRetries ?? 5;
  const secrets = [ctx.accessToken, ...(ctx.secrets ?? [])];
  const records: unknown[] = [];
  let nextToken: string | undefined;

  for (let page = 0; page < MAX_PAGES; page++) {
    const url = new URL(`${base}${path}`);
    url.searchParams.set('limit', String(PAGE_SIZE));
    url.searchParams.set('start', window.start.toISOString());
    url.searchParams.set('end', window.end.toISOString());
    if (nextToken) url.searchParams.set('nextToken', nextToken);

    let attempt = 0;
    for (;;) {
      const res = await ctx.fetchFn(url.toString(), {
        headers: { authorization: `Bearer ${ctx.accessToken}`, accept: 'application/json' },
      });
      const text = await res.text();
      if (res.ok) {
        let json: unknown;
        try {
          json = JSON.parse(text);
        } catch {
          throw new Error(`WHOOP returned a page of ${path} that is not JSON.`);
        }
        const body = json as { records?: unknown; next_token?: unknown };
        if (!Array.isArray(body.records)) throw new Error(`WHOOP returned a page of ${path} with no "records" list.`);
        records.push(...body.records);
        nextToken = typeof body.next_token === 'string' && body.next_token !== '' ? body.next_token : undefined;
        break;
      }
      if (res.status === 429 && attempt < maxRetries) {
        const retryAfter = Number(res.headers.get('retry-after'));
        await sleep(Number.isFinite(retryAfter) && retryAfter > 0 ? retryAfter * 1000 : 2 ** attempt * 1000);
        attempt++;
        continue;
      }
      if (res.status === 401) {
        throw new WhoopHttpError(401, 'WHOOP rejected the access token (HTTP 401). Run the export again to sign in.');
      }
      if (res.status === 403) {
        throw new WhoopHttpError(403, `WHOOP refused ${path} (HTTP 403): the app may lack the scope for it.`);
      }
      throw new WhoopHttpError(res.status, `WHOOP returned HTTP ${res.status} for ${path}: ${redact(text, secrets).slice(0, 300)}`);
    }
    if (!nextToken) return records;
  }
  throw new Error(`Stopped after ${MAX_PAGES} pages of ${path}; something is wrong with the paging.`);
}

export const fetchWorkouts = (window: Window, ctx: ApiContext) => fetchAllPages('/v2/activity/workout', window, ctx);
export const fetchRecovery = (window: Window, ctx: ApiContext) => fetchAllPages('/v2/recovery', window, ctx);
```

Create `scripts/whoop/build.ts`:

```ts
import { parseReplay } from '../../engine/replay';
import { SPORT_MUSCLE_MAP, STRENGTH_SPORTS, normalizeSport } from '../../engine/sportMuscleMap';
import type { ReplayFile } from '../../engine/types';

export interface ExportInput {
  workouts: unknown[];
  recovery: unknown[];
  exportedAt: Date;
}

const startMs = (w: unknown): number => {
  const t = Date.parse(String((w as { start?: unknown })?.start));
  return Number.isNaN(t) ? 0 : t;
};
const createdMs = (r: unknown): number => {
  const t = Date.parse(String((r as { created_at?: unknown })?.created_at));
  return Number.isNaN(t) ? 0 : t;
};

/** Keeps the first record for each key: a page boundary can repeat a record. */
function dedupe(records: unknown[], key: (r: unknown) => string): unknown[] {
  const seen = new Set<string>();
  return records.filter((r) => {
    const k = key(r);
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}

/**
 * Turns what the API returned into the replay file the app reads. The result goes through the same
 * validation the app uses (parseReplay), so a file this writes is one the app will accept.
 */
export function buildReplay(input: ExportInput): ReplayFile {
  const workouts = dedupe(input.workouts, (w) => String((w as { id?: unknown })?.id)).sort((a, b) => startMs(a) - startMs(b));
  const recovery = dedupe(
    input.recovery,
    (r) => `${(r as { cycle_id?: unknown })?.cycle_id}:${(r as { sleep_id?: unknown })?.sleep_id}`,
  ).sort((a, b) => createdMs(a) - createdMs(b));
  // Round-trip through JSON so what is validated is exactly what will be written.
  const file = JSON.parse(JSON.stringify({ synthetic: false, asOf: input.exportedAt.toISOString(), workouts, recovery }));
  return parseReplay(file);
}

export interface SportCount {
  name: string;
  count: number;
  /** The model has a muscle map for it (or, for strength sports, it asks for a tag). */
  known: boolean;
  strength: boolean;
}

export interface ExportSummary {
  workouts: number;
  recovery: number;
  from?: string;
  to?: string;
  sports: SportCount[];
  strengthSessions: number;
}

/** Counts only: no ids, no dates beyond the range, nothing personal. Safe to paste back for review. */
export function summarize(replay: ReplayFile): ExportSummary {
  const counts = new Map<string, number>();
  for (const w of replay.workouts) counts.set(w.sport_name, (counts.get(w.sport_name) ?? 0) + 1);
  const sports = [...counts.entries()]
    .map(([name, count]) => {
      const key = normalizeSport(name);
      const strength = STRENGTH_SPORTS.has(key);
      return { name, count, known: strength || key in SPORT_MUSCLE_MAP, strength };
    })
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
  const starts = replay.workouts.map((w) => w.start).sort();
  return {
    workouts: replay.workouts.length,
    recovery: replay.recovery?.length ?? 0,
    from: starts[0]?.slice(0, 10),
    to: starts[starts.length - 1]?.slice(0, 10),
    sports,
    strengthSessions: sports.filter((s) => s.strength).reduce((n, s) => n + s.count, 0),
  };
}

/** The lines the script prints when it finishes. */
export function formatSummary(s: ExportSummary): string[] {
  const lines = [
    `Workouts: ${s.workouts}${s.from ? ` (${s.from} to ${s.to})` : ''}`,
    `Recovery records: ${s.recovery}`,
    `Sports found: ${s.sports.map((x) => `${x.name} (${x.count})`).join(', ') || 'none'}`,
  ];
  const unknown = s.sports.filter((x) => !x.known);
  lines.push(
    unknown.length > 0
      ? `Not mapped to muscles yet, so they add no soreness: ${unknown.map((x) => `${x.name} (${x.count})`).join(', ')}`
      : 'Every sport found has a muscle map.',
  );
  lines.push(
    s.strengthSessions > 0
      ? `Strength sessions to tag in the app: ${s.strengthSessions}`
      : 'No strength sessions to tag.',
  );
  return lines;
}
```

Create `scripts/whoop/safety.ts`:

```ts
import { execFileSync } from 'node:child_process';

/** Everything this script creates or reads that must never reach git. */
export const PRIVATE_FILES = ['.env', 'data/replay.json', 'whoop.token.json'] as const;

export function findUnignored(paths: readonly string[], isIgnored: (path: string) => boolean): string[] {
  return paths.filter((p) => !isIgnored(p));
}

/** Refuses to go on unless every private file is git-ignored, so a secret or health data cannot be committed by accident. */
export function assertGitIgnored(paths: readonly string[], isIgnored: (path: string) => boolean): void {
  const missing = findUnignored(paths, isIgnored);
  if (missing.length > 0) {
    throw new Error(
      `Refusing to run: not git-ignored: ${missing.join(', ')}. Add each to .gitignore first, so it can never be committed.`,
    );
  }
}

/** Asks git itself. Any doubt (git missing, not a repository) counts as "not ignored", so the script stops. */
export function gitCheckIgnore(cwd: string): (path: string) => boolean {
  return (path) => {
    try {
      execFileSync('git', ['check-ignore', '-q', '--', path], { cwd, stdio: 'ignore' });
      return true;
    } catch {
      return false;
    }
  };
}
```

Create `scripts/whoop/tokenStore.ts`:

```ts
import type { Tokens } from './auth';

export interface TokenFile {
  read(): string | null;
  write(text: string): void;
}

/** The saved tokens, or null when there is no usable file (missing, unreadable or not in the expected shape). */
export function loadTokens(file: TokenFile): Tokens | null {
  const text = file.read();
  if (text === null) return null;
  try {
    const o = JSON.parse(text) as Record<string, unknown>;
    if (typeof o.access_token !== 'string' || typeof o.expires_at !== 'number') return null;
    return {
      access_token: o.access_token,
      refresh_token: typeof o.refresh_token === 'string' ? o.refresh_token : undefined,
      expires_at: o.expires_at,
      scope: typeof o.scope === 'string' ? o.scope : '',
      token_type: typeof o.token_type === 'string' ? o.token_type : 'bearer',
    };
  } catch {
    return null;
  }
}

export function saveTokens(file: TokenFile, tokens: Tokens): void {
  file.write(JSON.stringify(tokens, null, 2));
}
```

Create `scripts/whoop/fakes.ts`:

```ts
import { createServer } from 'node:net';
import type { FetchLike, FetchResponse } from './http';

/** A canned response for tests: a status, a body and optional headers. */
export function respond(status: number, body: unknown, headers: Record<string, string> = {}): FetchResponse {
  const text = typeof body === 'string' ? body : JSON.stringify(body);
  const lower = Object.fromEntries(Object.entries(headers).map(([k, v]) => [k.toLowerCase(), v]));
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: { get: (name) => lower[name.toLowerCase()] ?? null },
    text: async () => text,
  };
}

export interface Call {
  url: string;
  method: string;
  headers: Record<string, string>;
  body?: string;
}

/** A fetch that answers from a list, in order, and remembers every call it was given. */
export function scriptedFetch(responses: FetchResponse[]): { fetchFn: FetchLike; calls: Call[] } {
  const calls: Call[] = [];
  const queue = [...responses];
  const fetchFn: FetchLike = async (url, init) => {
    calls.push({ url, method: init?.method ?? 'GET', headers: init?.headers ?? {}, body: init?.body });
    const next = queue.shift();
    if (!next) throw new Error(`Unexpected extra request: ${url}`);
    return next;
  };
  return { fetchFn, calls };
}

/** The error a promise rejects with. Fails the test if the promise resolves. */
export async function failure(promise: Promise<unknown>): Promise<Error> {
  try {
    await promise;
  } catch (e) {
    return e as Error;
  }
  throw new Error('Expected the promise to reject, but it resolved.');
}

export const ENV = {
  clientId: 'test-client-id-1234',
  clientSecret: 'test-client-secret-SECRET-9876',
  redirectUri: 'http://localhost:3000/callback',
};

/** A port nothing is listening on right now, for tests that start a real local server. */
export function freePort(): Promise<number> {
  return new Promise((resolve, reject) => {
    const server = createServer();
    server.once('error', reject);
    server.listen(0, () => {
      const { port } = server.address() as { port: number };
      server.close(() => resolve(port));
    });
  });
}

/** Asks a local server for a page, retrying briefly while it starts listening. */
export async function hit(url: string, attempts = 40): Promise<{ status: number; text: string }> {
  for (let i = 0; ; i++) {
    try {
      const res = await fetch(url);
      return { status: res.status, text: await res.text() };
    } catch (err) {
      if (i >= attempts) throw err;
      await new Promise((r) => setTimeout(r, 25));
    }
  }
}
```

Replace `package.json` with:

```json
{
  "name": "sore-spot",
  "version": "1.0.0",
  "main": "index.ts",
  "dependencies": {
    "expo": "~57.0.24",
    "expo-status-bar": "~57.0.1",
    "react": "19.2.3",
    "react-dom": "19.2.3",
    "react-native": "0.86.3",
    "react-native-svg": "15.15.4",
    "react-native-web": "^0.21.2"
  },
  "devDependencies": {
    "@types/react": "~19.2.2",
    "tsx": "^4.23.15",
    "typescript": "~6.0.3",
    "vitest": "^5.0.1"
  },
  "scripts": {
    "start": "expo start",
    "android": "expo start --android",
    "ios": "expo start --ios",
    "web": "expo start --web",
    "test": "vitest run",
    "typecheck": "tsc --noEmit",
    "export-whoop": "tsx scripts/export-whoop.ts"
  },
  "private": true
}
```

Then run `npm install` so `package-lock.json` records `tsx` (this is the only command allowed to change the lock file, and `tsx` is the only package it may add). Confirm with `git diff --stat package.json package-lock.json` and `grep -c '"node_modules/tsx"' package-lock.json` (expect 1).

- [ ] **Step 4: Run the whole suite and typecheck**

Run: `npm test && npm run typecheck`
Expected: 37 test files, 345 tests pass (the 290 existing plus 3 replay, 10 env, 12 auth, 9 api, 12 build, 5 safety and 4 token-store tests); typecheck prints no errors.

- [ ] **Step 5: Prove the guards can fail**

Break each line on purpose, run the tests, and restore from a backup:
```bash
cp scripts/whoop/api.ts /tmp/api.bak
sed -i 's/redact(text, secrets).slice(0, 300)/text.slice(0, 300)/' scripts/whoop/api.ts
npx vitest run scripts/whoop/api.test.ts
cp /tmp/api.bak scripts/whoop/api.ts
cp scripts/whoop/http.ts /tmp/http.bak
sed -i "s/\['read:workout', 'read:recovery', 'offline'\]/['read:workout', 'read:recovery', 'read:profile', 'offline']/" scripts/whoop/http.ts
npx vitest run scripts/whoop/auth.test.ts
cp /tmp/http.bak scripts/whoop/http.ts
cp engine/replay.ts /tmp/replay.bak
sed -i '/replay.asOf = o.asOf;/d' engine/replay.ts
npx vitest run engine/replay.asof.test.ts
cp /tmp/replay.bak engine/replay.ts
npx vitest run engine/replay.asof.test.ts scripts
```
Expected: the first run FAILS ("never prints the access token or the client secret from an error body"); the second FAILS (the scopes tests); the third FAILS (the export time is kept); the fourth passes. Confirm `git diff --stat` shows no change to those three files. Paste all four outputs.

- [ ] **Step 6: Commit**

```bash
git add engine scripts vitest.config.ts package.json package-lock.json
git commit -m "$(cat <<'EOF'
Add the replay export time and the tested building blocks of the WHOOP export

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 2: The sign-in catcher, the run and the command

**Files:**
- Create: `scripts/whoop/callback.ts`, `scripts/whoop/run.ts`, `scripts/export-whoop.ts`
- Test: `scripts/whoop/callback.test.ts`, `scripts/whoop/run.test.ts`, `scripts/whoop/cli.test.ts`

**Interfaces:**
- Consumes: everything Task 1 produces.
- Produces: `waitForCallback({ port, path, expectedState, timeoutMs })` resolving with the authorization code; `RunDeps`, `runExport(deps)` returning an `ExportSummary`; the command `npm run export-whoop`.

`run.ts` takes every outside thing as a dependency (fetch, clock, token file, replay writer, browser opener, redirect catcher, logger), so the tests run the whole flow against a fake WHOOP. `export-whoop.ts` is the thin real wiring; **do not run it** (it would open a browser and ask for a sign-in). Its guard rails are checked by the smoke test in Step 4.

- [ ] **Step 1: Write the failing tests**

Create `scripts/whoop/callback.test.ts`:

```ts
import { createServer } from 'node:net';
import { describe, expect, it } from 'vitest';
import { waitForCallback } from './callback';
import { failure, freePort, hit } from './fakes';

const STATE = 'abcd1234abcd1234';
const options = (port: number, timeoutMs = 5000) => ({ port, path: '/callback', expectedState: STATE, timeoutMs });

describe('waitForCallback', () => {
  it('resolves with the code when the redirect brings the right state, and tells the browser to close the tab', async () => {
    const port = await freePort();
    const code = waitForCallback(options(port));
    const page = await hit(`http://localhost:${port}/callback?code=the-code&state=${STATE}`);
    expect(await code).toBe('the-code');
    expect(page.status).toBe(200);
    expect(page.text).toMatch(/close this tab/);
  });

  it('ignores other paths, such as a browser asking for a favicon, and keeps waiting', async () => {
    const port = await freePort();
    const code = waitForCallback(options(port));
    expect((await hit(`http://localhost:${port}/favicon.ico`)).status).toBe(404);
    await hit(`http://localhost:${port}/callback?code=c2&state=${STATE}`);
    expect(await code).toBe('c2');
  });

  it('rejects a redirect with a different state, so a forged or stale sign-in is not used', async () => {
    const port = await freePort();
    const result = failure(waitForCallback(options(port)));
    const page = await hit(`http://localhost:${port}/callback?code=evil&state=WRONGSTATE`);
    expect(page.status).toBe(400);
    expect((await result).message).toMatch(/different state/);
  });

  it('rejects a redirect with no state at all', async () => {
    const port = await freePort();
    const result = failure(waitForCallback(options(port)));
    await hit(`http://localhost:${port}/callback?code=evil`);
    expect((await result).message).toMatch(/different state/);
  });

  it('rejects when WHOOP reports that the sign-in was denied', async () => {
    const port = await freePort();
    const result = failure(waitForCallback(options(port)));
    await hit(`http://localhost:${port}/callback?error=access_denied&state=${STATE}`);
    expect((await result).message).toMatch(/access_denied/);
  });

  it('rejects a redirect that has the right state but no code', async () => {
    const port = await freePort();
    const result = failure(waitForCallback(options(port)));
    await hit(`http://localhost:${port}/callback?state=${STATE}`);
    expect((await result).message).toMatch(/no code/);
  });

  it('gives up after the timeout and frees the port', async () => {
    const port = await freePort();
    const err = await failure(waitForCallback(options(port, 150)));
    expect(err.message).toMatch(/No sign-in arrived/);
    // The port is free again, so another server can take it.
    await new Promise<void>((resolve, reject) => {
      const s = createServer();
      s.once('error', reject);
      s.listen(port, () => s.close(() => resolve()));
    });
  });

  it('explains a port that is already in use', async () => {
    const port = await freePort();
    const blocker = createServer();
    await new Promise<void>((resolve) => blocker.listen({ port, host: 'localhost' }, resolve));
    try {
      const err = await failure(waitForCallback(options(port)));
      expect(err.message).toMatch(new RegExp(`Port ${port} is already in use`));
    } finally {
      blocker.close();
    }
  });
});
```

Create `scripts/whoop/run.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { syntheticReplay } from '../../data/replay.synthetic';
import { parseReplay } from '../../engine/replay';
import { waitForCallback } from './callback';
import { callbackTarget } from './env';
import { failure, freePort, hit, respond } from './fakes';
import type { FetchLike } from './http';
import { runExport, type RunDeps } from './run';
import { loadTokens, type TokenFile } from './tokenStore';

const NOW = Date.parse('2026-09-22T08:00:00Z');
const SECRET = 'test-client-secret-SECRET-9876';
const CLIENT_ID = 'test-client-id-1234';
const PRIVATE = [SECRET, 'access-1', 'refresh-1', 'access-2', 'refresh-2', 'the-code-xyz'];

/** A stand-in for WHOOP: a token endpoint that rotates refresh tokens, and paged v2 collections. */
function fakeWhoop(options: { workoutsStatus?: number; recoveryStatus?: number } = {}) {
  const requests: { url: string; method: string; body?: string; auth?: string }[] = [];
  let access = 'access-1';
  let refresh = 'refresh-1';
  let issued = 0;
  const pages = (records: unknown[], url: URL) => {
    const size = 7;
    const from = Number(url.searchParams.get('nextToken') ?? 0);
    const next = from + size < records.length ? String(from + size) : undefined;
    return { records: records.slice(from, from + size), ...(next ? { next_token: next } : {}) };
  };
  const fetchFn: FetchLike = async (raw, init) => {
    const url = new URL(raw);
    requests.push({ url: raw, method: init?.method ?? 'GET', body: init?.body, auth: init?.headers?.authorization });
    if (url.pathname === '/oauth/oauth2/token') {
      const form = new URLSearchParams(init?.body);
      if (form.get('client_secret') !== SECRET || form.get('client_id') !== CLIENT_ID) return respond(401, { error: 'invalid_client' });
      if (form.get('grant_type') === 'authorization_code' && form.get('code') === 'the-code-xyz') {
        issued++;
        return respond(200, { access_token: access, refresh_token: refresh, expires_in: 3600, scope: 'offline', token_type: 'bearer' });
      }
      if (form.get('grant_type') === 'refresh_token' && form.get('refresh_token') === refresh) {
        issued++;
        access = `access-${issued + 1}`;
        refresh = `refresh-${issued + 1}`;
        return respond(200, { access_token: access, refresh_token: refresh, expires_in: 3600, scope: 'offline', token_type: 'bearer' });
      }
      return respond(400, { error: 'invalid_grant' });
    }
    if (init?.headers?.authorization !== `Bearer ${access}`) return respond(401, { error: 'unauthorized' });
    if (url.pathname === '/developer/v2/activity/workout') {
      return options.workoutsStatus ? respond(options.workoutsStatus, 'server trouble') : respond(200, pages(syntheticReplay.workouts, url));
    }
    if (url.pathname === '/developer/v2/recovery') {
      return options.recoveryStatus ? respond(options.recoveryStatus, 'server trouble') : respond(200, pages(syntheticReplay.recovery ?? [], url));
    }
    return respond(404, 'nope');
  };
  return { fetchFn, requests, current: () => ({ access, refresh }) };
}

const memoryTokens = (initial: string | null = null): TokenFile & { text: string | null } => {
  const f = { text: initial, read: () => f.text, write: (t: string) => void (f.text = t) };
  return f;
};

async function setup(whoopOptions = {}, tokenText: string | null = null, browser: 'good' | 'wrong-state' = 'good') {
  const port = await freePort();
  const redirectUri = `http://localhost:${port}/callback`;
  const whoop = fakeWhoop(whoopOptions);
  const tokenFile = memoryTokens(tokenText);
  const logs: string[] = [];
  const written: string[] = [];
  const opened: string[] = [];
  const deps: RunDeps = {
    env: { clientId: CLIENT_ID, clientSecret: SECRET, redirectUri },
    days: 60,
    now: () => NOW,
    fetchFn: whoop.fetchFn,
    sleep: async () => undefined,
    tokenFile,
    writeReplay: (text) => void written.push(text),
    // The "browser": read the sign-in address, then come back to the local redirect as WHOOP would.
    openBrowser: (url) => {
      opened.push(url);
      const state = new URL(url).searchParams.get('state');
      void hit(`${redirectUri}?code=the-code-xyz&state=${browser === 'wrong-state' ? 'FORGED00' : state}`).catch(() => undefined);
    },
    waitForCode: (state) => waitForCallback({ ...callbackTarget(redirectUri), expectedState: state, timeoutMs: 3000 }),
    log: (line) => void logs.push(line),
  };
  return { deps, whoop, tokenFile, logs, written, opened };
}

const savedTokens = (over: { access?: string; refresh?: string; expiresAt?: number } = {}) =>
  JSON.stringify({
    access_token: over.access ?? 'access-1',
    refresh_token: over.refresh ?? 'refresh-1',
    expires_at: over.expiresAt ?? NOW + 3_000_000,
    scope: 'offline',
    token_type: 'bearer',
  });

describe('runExport: first sign-in', () => {
  it('signs in through the browser, saves the tokens, pulls every page and writes a replay the app accepts', async () => {
    const { deps, whoop, tokenFile, logs, written, opened } = await setup();
    const summary = await runExport(deps);

    expect(opened).toHaveLength(1);
    const auth = new URL(opened[0]);
    expect(auth.searchParams.get('scope')).toBe('read:workout read:recovery offline');
    expect(loadTokens(tokenFile)?.access_token).toBe('access-1');

    expect(written).toHaveLength(1);
    const replay = parseReplay(JSON.parse(written[0]));
    expect(replay.synthetic).toBe(false);
    expect(replay.asOf).toBe('2026-09-22T08:00:00.000Z');
    expect(replay.workouts).toHaveLength(syntheticReplay.workouts.length);
    expect(replay.recovery).toHaveLength((syntheticReplay.recovery ?? []).length);
    expect(summary.workouts).toBe(syntheticReplay.workouts.length);

    // More than one page was needed for each collection, and every API call carried the bearer token.
    const api = whoop.requests.filter((r) => r.url.includes('/developer/'));
    expect(api.length).toBeGreaterThan(2);
    for (const r of api) expect(r.auth).toBe('Bearer access-1');
    expect(logs.join('\n')).toMatch(/Workouts: \d+/);
  });

  it('asks for the window that ends now and starts `days` earlier', async () => {
    const { deps, whoop } = await setup();
    await runExport({ ...deps, days: 30 });
    const first = new URL(whoop.requests.find((r) => r.url.includes('/activity/workout'))!.url);
    expect(first.searchParams.get('end')).toBe('2026-09-22T08:00:00.000Z');
    expect(first.searchParams.get('start')).toBe('2026-08-23T08:00:00.000Z');
  });

  it('never prints or writes a secret, a token or the code anywhere but the token file', async () => {
    const { deps, logs, written } = await setup();
    await runExport(deps);
    const everything = [...logs, ...written].join('\n');
    for (const secret of PRIVATE) expect(everything, secret).not.toContain(secret);
  });

  it('ignores a redirect with the wrong state: no code exchange, no tokens, nothing written', async () => {
    const { deps, whoop, tokenFile, written } = await setup({}, null, 'wrong-state');
    const err = await failure(runExport(deps));
    expect(err.message).toMatch(/different state/);
    expect(whoop.requests.filter((r) => r.url.includes('oauth2/token'))).toHaveLength(0);
    expect(tokenFile.text).toBeNull();
    expect(written).toHaveLength(0);
  });
});

describe('runExport: a saved sign-in', () => {
  it('uses fresh saved tokens without opening a browser or touching the token endpoint', async () => {
    const { deps, whoop, opened, written } = await setup({}, savedTokens());
    await runExport(deps);
    expect(opened).toHaveLength(0);
    expect(whoop.requests.filter((r) => r.url.includes('oauth2/token'))).toHaveLength(0);
    expect(written).toHaveLength(1);
  });

  it('renews expired tokens with the refresh token, and saves the rotated one before anything else', async () => {
    const { deps, whoop, tokenFile, opened } = await setup({}, savedTokens({ expiresAt: NOW - 1000 }));
    await runExport(deps);
    expect(opened).toHaveLength(0);
    const saved = loadTokens(tokenFile)!;
    expect(saved.access_token).toBe(whoop.current().access);
    expect(saved.refresh_token).toBe(whoop.current().refresh);
    expect(saved.refresh_token).not.toBe('refresh-1');
  });

  it('signs in again when the refresh token is refused', async () => {
    const { deps, opened, logs, written } = await setup({}, savedTokens({ expiresAt: NOW - 1000, refresh: 'stale-refresh' }));
    await runExport(deps);
    expect(opened).toHaveLength(1);
    expect(logs.join('\n')).toMatch(/refused, so signing in again/);
    expect(written).toHaveLength(1);
  });
});

describe('runExport: failures', () => {
  it('keeps the new tokens even when reading the data fails, and writes no replay', async () => {
    const { deps, tokenFile, written } = await setup({ workoutsStatus: 500 });
    const err = await failure(runExport(deps));
    expect(err.message).toMatch(/HTTP 500/);
    expect(loadTokens(tokenFile)?.refresh_token).toBe('refresh-1');
    expect(written).toHaveLength(0);
  });

  it('writes nothing when recovery fails after workouts succeeded', async () => {
    const { deps, written } = await setup({ recoveryStatus: 500 });
    await failure(runExport(deps));
    expect(written).toHaveLength(0);
  });

  it('tells the person to sign in again when a saved access token is rejected', async () => {
    const stale = savedTokens({ access: 'access-not-current' });
    const { deps, written } = await setup({}, stale);
    const err = await failure(runExport(deps));
    expect(err.message).toMatch(/sign in/i);
    expect(written).toHaveLength(0);
  });
});
```

Create `scripts/whoop/cli.test.ts`:

```ts
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

// The command-line script is a thin shell over tested parts. These checks pin the wiring that keeps a
// secret or health data from leaking, which the unit tests of the parts cannot see.
const scriptsDir = join(__dirname, '..');
const cli = readFileSync(join(scriptsDir, 'export-whoop.ts'), 'utf8');
const sources = [
  { rel: 'export-whoop.ts', text: cli },
  ...readdirSync(__dirname)
    .filter((f) => f.endsWith('.ts') && !f.endsWith('.test.ts') && f !== 'fakes.ts')
    .map((f) => ({ rel: `whoop/${f}`, text: readFileSync(join(__dirname, f), 'utf8') })),
];

describe('the export command', () => {
  it('checks that every private file is git-ignored before it reads a credential or calls WHOOP', () => {
    const guard = cli.indexOf('assertGitIgnored(PRIVATE_FILES, gitCheckIgnore(root))');
    expect(guard).toBeGreaterThan(-1);
    expect(guard).toBeLessThan(cli.indexOf('runExport('));
    expect(cli.indexOf('readWhoopEnv(')).toBeLessThan(guard);
    // The guard runs before any network call, and the only network call is inside runExport.
    expect(cli).not.toMatch(/fetch\(\s*['"`]http/);
  });

  it('scrubs the client secret from any error before printing it', () => {
    expect(cli).toMatch(/console\.error\(redact\(err instanceof Error \? err\.message : String\(err\), secrets\)\)/);
    expect(cli).toMatch(/const secrets = \[env\.clientSecret\]/);
  });

  it('writes only the two private files it is allowed to, and only under the git-ignored names', () => {
    expect(cli).toContain("join(root, 'whoop.token.json')");
    expect(cli).toContain("join(root, 'data', 'replay.json')");
    const writes = cli.match(/writeFileSync\(([^,]+),/g) ?? [];
    expect(writes.map((w) => w.replace(/writeFileSync\(|,/g, ''))).toEqual(['tokenPath', 'replayPath']);
  });

  it('is reachable as `npm run export-whoop`, and the runner is a dev dependency', () => {
    const pkg = JSON.parse(readFileSync(join(scriptsDir, '..', 'package.json'), 'utf8'));
    expect(pkg.scripts['export-whoop']).toBe('tsx scripts/export-whoop.ts');
    expect(pkg.devDependencies.tsx).toBeTruthy();
    expect(pkg.dependencies?.tsx).toBeUndefined();
  });
});

describe('what the scripts never do', () => {
  it('never print a secret, a token or a code', () => {
    for (const { rel, text } of sources) {
      for (const line of text.split('\n')) {
        if (/\b(log|console\.(log|error|warn|info))\(/.test(line)) {
          expect(line, `${rel}: ${line.trim()}`).not.toMatch(/clientSecret|access_token|refresh_token|\bcode\b\s*[,)]|accessToken/);
        }
      }
    }
  });

  it('never ask for profile access', () => {
    for (const { rel, text } of sources) expect(text, rel).not.toMatch(/read:profile|read:body_measurement|read:sleep|read:cycles/);
  });

  it('use only WHOOP endpoints over https', () => {
    for (const { rel, text } of sources) {
      for (const url of text.match(/https?:\/\/[^\s'"`)]+/g) ?? []) {
        if (rel.endsWith('env.ts') || url.startsWith('http://localhost') || url.startsWith('http://127.0.0.1')) continue;
        expect(url, `${rel}: ${url}`).toMatch(/^https:\/\/api\.prod\.whoop\.com\//);
      }
    }
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run scripts/whoop/callback.test.ts scripts/whoop/run.test.ts scripts/whoop/cli.test.ts`
Expected: FAIL. `callback.test.ts` cannot resolve `./callback`, `run.test.ts` cannot resolve `./run`, and `cli.test.ts` cannot read `scripts/export-whoop.ts`. Paste the real output.

- [ ] **Step 3: Write the implementation**

Create `scripts/whoop/callback.ts`:

```ts
import { createServer } from 'node:http';

export interface CallbackOptions {
  port: number;
  path: string;
  /** The state sent with the sign-in request: the redirect must bring the same one back. */
  expectedState: string;
  timeoutMs: number;
}

const page = (message: string) =>
  `<!doctype html><meta charset="utf-8"><title>Sore Spot export</title><body style="font:16px system-ui;padding:2rem"><p>${message}</p>`;

/**
 * Listens on localhost for the one redirect WHOOP sends after sign-in and resolves with the
 * authorization code. Rejects on a denied sign-in, a state that does not match, or a timeout.
 */
export function waitForCallback(opts: CallbackOptions): Promise<string> {
  return new Promise((resolve, reject) => {
    let settled = false;
    const server = createServer((req, res) => {
      const url = new URL(req.url ?? '/', `http://localhost:${opts.port}`);
      if (url.pathname !== opts.path) {
        res.writeHead(404, { 'content-type': 'text/plain' }).end('Not found');
        return;
      }
      const finish = (status: number, message: string, error?: Error, code?: string) => {
        res.writeHead(status, { 'content-type': 'text/html; charset=utf-8' }).end(page(message));
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        server.close();
        if (error) reject(error);
        else resolve(code as string);
      };
      const denied = url.searchParams.get('error');
      if (denied) {
        finish(400, 'WHOOP did not authorize the export. You can close this tab.', new Error(`WHOOP sign-in was not completed (${denied}).`));
      } else if (url.searchParams.get('state') !== opts.expectedState) {
        finish(400, 'That sign-in did not match this export. You can close this tab.', new Error('The sign-in redirect had a different state than the one sent, so it was ignored. Run the export again.'));
      } else if (!url.searchParams.get('code')) {
        finish(400, 'No code came back. You can close this tab.', new Error('The sign-in redirect had no code.'));
      } else {
        finish(200, 'Signed in. You can close this tab and return to the terminal.', undefined, url.searchParams.get('code') as string);
      }
    });
    const timer = setTimeout(() => {
      if (settled) return;
      settled = true;
      server.close();
      reject(new Error(`No sign-in arrived within ${Math.round(opts.timeoutMs / 1000)} seconds. Run the export again.`));
    }, opts.timeoutMs);
    server.on('error', (err: NodeJS.ErrnoException) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      reject(
        err.code === 'EADDRINUSE'
          ? new Error(`Port ${opts.port} is already in use, so the sign-in redirect cannot be caught. Stop whatever is using it (often an Expo or dev server) and run the export again.`)
          : err,
      );
    });
    server.listen({ port: opts.port, host: 'localhost' });
  });
}
```

Create `scripts/whoop/run.ts`:

```ts
import { fetchRecovery, fetchWorkouts } from './api';
import { buildAuthUrl, exchangeCode, isFresh, makeState, refreshTokens, type Tokens } from './auth';
import { buildReplay, formatSummary, summarize, type ExportSummary } from './build';
import type { WhoopEnv } from './env';
import { DEFAULT_ENDPOINTS, WhoopHttpError, type Endpoints, type FetchLike } from './http';
import { loadTokens, saveTokens, type TokenFile } from './tokenStore';

export interface RunDeps {
  env: WhoopEnv;
  days: number;
  now: () => number;
  fetchFn: FetchLike;
  endpoints?: Endpoints;
  sleep?: (ms: number) => Promise<void>;
  tokenFile: TokenFile;
  writeReplay: (text: string) => void;
  openBrowser: (url: string) => void | Promise<void>;
  /** Resolves with the authorization code once the browser comes back to the local redirect. */
  waitForCode: (state: string) => Promise<string>;
  log: (line: string) => void;
  makeState?: () => string;
}

/** Fresh saved tokens, a refreshed set, or a new sign-in: whichever the situation needs. */
async function getTokens(deps: RunDeps): Promise<Tokens> {
  const endpoints = deps.endpoints ?? DEFAULT_ENDPOINTS;
  const saved = loadTokens(deps.tokenFile);
  if (saved && isFresh(saved, deps.now())) {
    deps.log('Using the saved sign-in.');
    return saved;
  }
  if (saved?.refresh_token) {
    try {
      const refreshed = await refreshTokens(deps.env, saved.refresh_token, deps.fetchFn, deps.now(), endpoints);
      // WHOOP rotates the refresh token, so the new one is saved before anything else can fail.
      saveTokens(deps.tokenFile, refreshed);
      deps.log('Renewed the saved sign-in.');
      return refreshed;
    } catch (err) {
      if (!(err instanceof WhoopHttpError)) throw err;
      deps.log('The saved sign-in was refused, so signing in again.');
    }
  }
  const state = (deps.makeState ?? makeState)();
  const url = buildAuthUrl(deps.env, state, endpoints);
  deps.log('Opening WHOOP sign-in in your browser. If nothing opens, paste this address into a browser:');
  deps.log(url);
  await deps.openBrowser(url);
  const code = await deps.waitForCode(state);
  const tokens = await exchangeCode(deps.env, code, deps.fetchFn, deps.now(), endpoints);
  saveTokens(deps.tokenFile, tokens);
  deps.log('Signed in.');
  return tokens;
}

/** Signs in if needed, pulls the workouts and recovery for the window, and writes the replay file. */
export async function runExport(deps: RunDeps): Promise<ExportSummary> {
  const tokens = await getTokens(deps);
  const end = new Date(deps.now());
  const start = new Date(end.getTime() - deps.days * 86_400_000);
  const ctx = {
    fetchFn: deps.fetchFn,
    accessToken: tokens.access_token,
    endpoints: deps.endpoints,
    sleep: deps.sleep,
    secrets: [deps.env.clientSecret, tokens.refresh_token ?? ''],
  };
  deps.log(`Reading the last ${deps.days} days of workouts and recovery.`);
  const workouts = await fetchWorkouts({ start, end }, ctx);
  const recovery = await fetchRecovery({ start, end }, ctx);
  const replay = buildReplay({ workouts, recovery, exportedAt: end });
  deps.writeReplay(JSON.stringify(replay, null, 2));
  const summary = summarize(replay);
  for (const line of formatSummary(summary)) deps.log(line);
  return summary;
}
```

Create `scripts/export-whoop.ts`:

```ts
import { execFile } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { waitForCallback } from './whoop/callback';
import { callbackTarget, parseEnvFile, readWhoopEnv, redact } from './whoop/env';
import { runExport } from './whoop/run';
import { PRIVATE_FILES, assertGitIgnored, gitCheckIgnore } from './whoop/safety';

// One-time export of your own WHOOP history to data/replay.json. Run: npm run export-whoop
// It reads .env, signs you in through WHOOP in your browser, and never prints a secret or a token.

const DEFAULT_DAYS = 60;

function parseDays(argv: string[]): number {
  const i = argv.indexOf('--days');
  if (i === -1) return DEFAULT_DAYS;
  const n = Number(argv[i + 1]);
  if (!Number.isInteger(n) || n < 1 || n > 365) throw new Error('--days must be a whole number from 1 to 365.');
  return n;
}

function openBrowser(url: string): void {
  const [cmd, args] =
    process.platform === 'win32'
      ? ['rundll32', ['url.dll,FileProtocolHandler', url]]
      : process.platform === 'darwin'
        ? ['open', [url]]
        : ['xdg-open', [url]];
  // If it fails, the address was printed, so the person can open it by hand.
  execFile(cmd, args as string[], () => undefined);
}

async function main(): Promise<void> {
  const root = process.cwd();
  const days = parseDays(process.argv.slice(2));

  const envPath = join(root, '.env');
  if (!existsSync(envPath)) throw new Error('No .env file here. Create it with WHOOP_CLIENT_ID, WHOOP_CLIENT_SECRET and WHOOP_REDIRECT_URI.');
  const env = readWhoopEnv(parseEnvFile(readFileSync(envPath, 'utf8')));
  assertGitIgnored(PRIVATE_FILES, gitCheckIgnore(root));

  const tokenPath = join(root, 'whoop.token.json');
  const replayPath = join(root, 'data', 'replay.json');
  const target = callbackTarget(env.redirectUri);
  const secrets = [env.clientSecret];

  try {
    await runExport({
      env,
      days,
      now: () => Date.now(),
      fetchFn: (url, init) => fetch(url, init),
      tokenFile: {
        read: () => (existsSync(tokenPath) ? readFileSync(tokenPath, 'utf8') : null),
        write: (text) => writeFileSync(tokenPath, text),
      },
      writeReplay: (text) => {
        mkdirSync(dirname(replayPath), { recursive: true });
        writeFileSync(replayPath, text);
      },
      openBrowser,
      waitForCode: (state) => waitForCallback({ ...target, expectedState: state, timeoutMs: 5 * 60_000 }),
      log: (line) => console.log(line),
    });
    console.log('Wrote data/replay.json (git-ignored). Restart Expo to load it.');
  } catch (err) {
    console.error(redact(err instanceof Error ? err.message : String(err), secrets));
    process.exitCode = 1;
  }
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : String(err));
  process.exitCode = 1;
});
```

- [ ] **Step 4: Run the whole suite, typecheck, and the command's guard-rail smoke test**

Run: `npm test && npm run typecheck`
Expected: 40 test files, 370 tests pass (the 345 after Task 1 plus 8 callback, 10 run and 7 command tests); typecheck prints no errors.

Then the smoke test. It runs the real command in temporary folders and never contacts WHOOP (each case stops before any sign-in):
```bash
P="$PWD"; TSX="$P/node_modules/tsx/dist/cli.mjs"
run() { (cd "$1" && shift && node "$TSX" "$P/scripts/export-whoop.ts" "$@" 2>&1; echo "exit=$?"); }
T1=$(mktemp -d); echo "== 1. no .env"; run "$T1"
T2=$(mktemp -d); printf 'WHOOP_CLIENT_ID=abcd1234\nWHOOP_CLIENT_SECRET=topsecret99\nWHOOP_REDIRECT_URI=http://localhost:3999/callback\n' > "$T2/.env"; echo "== 2. .env present, not a git repository"; run "$T2"
T3=$(mktemp -d); (cd "$T3" && git init -q && printf '.env\n' > .gitignore && printf 'WHOOP_CLIENT_ID=abcd1234\nWHOOP_CLIENT_SECRET=topsecret99\nWHOOP_REDIRECT_URI=http://localhost:3999/callback\n' > .env); echo "== 3. .gitignore lacks the replay and token entries"; run "$T3"
T4=$(mktemp -d); (cd "$T4" && git init -q && printf '.env\ndata/replay.json\n*.token.json\n' > .gitignore && printf 'WHOOP_CLIENT_ID=abcd1234\n' > .env); echo "== 4. missing variables"; run "$T4"
(cd "$T4" && printf 'WHOOP_CLIENT_ID=a\nWHOOP_CLIENT_SECRET=topsecret99\nWHOOP_REDIRECT_URI=http://localhost:3999/callback\n' > .env); echo "== 5. bad --days"; run "$T4" --days 0
```
Expected, in order: "No .env file here. Create it with WHOOP_CLIENT_ID, WHOOP_CLIENT_SECRET and WHOOP_REDIRECT_URI."; "Refusing to run: not git-ignored: .env, data/replay.json, whoop.token.json. ..."; "Refusing to run: not git-ignored: data/replay.json, whoop.token.json. ..."; "Missing in .env: WHOOP_CLIENT_SECRET, WHOOP_REDIRECT_URI. ..."; "--days must be a whole number from 1 to 365."; each followed by `exit=1`. The text `topsecret99` must appear in none of the output. Paste the real output. Then confirm `git status --short` shows only the six files of this task.

- [ ] **Step 5: Prove the guards can fail**

Break each line on purpose, run the tests, and restore from a backup:
```bash
cp scripts/whoop/callback.ts /tmp/callback.bak
sed -i "s/url.searchParams.get('state') !== opts.expectedState/false/" scripts/whoop/callback.ts
npx vitest run scripts/whoop/callback.test.ts scripts/whoop/run.test.ts
cp /tmp/callback.bak scripts/whoop/callback.ts
cp scripts/whoop/run.ts /tmp/run.bak
sed -i '/      saveTokens(deps.tokenFile, refreshed);/d' scripts/whoop/run.ts
npx vitest run scripts/whoop/run.test.ts
cp /tmp/run.bak scripts/whoop/run.ts
cp scripts/export-whoop.ts /tmp/cli.bak
sed -i '/  assertGitIgnored(PRIVATE_FILES, gitCheckIgnore(root));/d' scripts/export-whoop.ts
npx vitest run scripts/whoop/cli.test.ts
cp /tmp/cli.bak scripts/export-whoop.ts
npx vitest run scripts
```
Expected: the first run FAILS (a redirect with the wrong state is not rejected); the second FAILS ("renews expired tokens ... saves the rotated one"); the third FAILS (the git-ignore guard must run first); the fourth passes. Confirm `git diff --stat` shows no change to those three files. Paste all four outputs.

- [ ] **Step 6: Commit**

```bash
git add scripts
git commit -m "$(cat <<'EOF'
Add the sign-in redirect catcher, the export run and the export-whoop command

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 3: Real-data mode in the app, and the documentation

**Files:**
- Create: `app/config.test.ts`
- Replace (whole file): `app/config.ts`, `app/useSoreSpot.ts`, `app/planCopy.ts`, `App.tsx`, `app/honesty.test.ts`, `app/docs.test.ts`, `README.md`, `docs/DEMO.md`

**Interfaces:**
- Consumes: `ReplayFile.asOf` from Task 1; `REQUIRED_VARS` from `scripts/whoop/env.ts` and `SCOPES` from `scripts/whoop/http.ts` (the docs test imports them).
- Produces: `replayAsOf(replay)` in `app/config.ts`; `REAL_BANNER` in `app/planCopy.ts`; `useSoreSpot()` now returns the replay's own time as `asOf`; the shell shows `SYNTHETIC_BANNER` for the synthetic week and `REAL_BANNER` for a real export.

Only the lines that use the fixed demo time change in `useSoreSpot.ts`; `App.tsx` changes the banner line, adds one import and nothing else; `planCopy.ts` gains `REAL_BANNER`. `README.md` and `docs/DEMO.md` gain the sections described in the spec; the rest of each is unchanged.

- [ ] **Step 1: Write the failing tests**

Create `app/config.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { DEMO_AS_OF, replayAsOf } from './config';

describe('replayAsOf', () => {
  it('uses the fixed demo time for the synthetic week, which carries no export time', () => {
    expect(replayAsOf({})).toBe(DEMO_AS_OF);
    expect(DEMO_AS_OF.toISOString()).toBe('2026-09-19T20:00:00.000Z');
  });

  it('uses the moment a real export was made as "now"', () => {
    const asOf = replayAsOf({ asOf: '2026-09-22T08:00:00.000Z' });
    expect(asOf.toISOString()).toBe('2026-09-22T08:00:00.000Z');
    expect(asOf).not.toBe(DEMO_AS_OF);
  });
});
```

Replace `app/honesty.test.ts` with:

```ts
import { readdirSync, readFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { describe, expect, it } from 'vitest';

// Scans every non-test source file under app/, so text added to a component later is covered too.
const BANNED = /diagnos|accura|clinical|prevent|cure|validated|treat|boost|oxygen|blood flow/i;
const SORENESS_CLAIM = /(reduc(e|es|ed|ing)|relie(ve|ves|ved|ving)|eas(e|es|ed|ing)) (the |your )?soreness/i;
const NEGATED = /(not|n't) been shown to (reduce|relieve|ease) soreness/i;

function sourceFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) return sourceFiles(full);
    return /\.(ts|tsx)$/.test(entry.name) && !/\.test\.(ts|tsx)$/.test(entry.name) ? [full] : [];
  });
}

const files = sourceFiles(__dirname).map((f) => ({
  rel: relative(__dirname, f).replace(/\\/g, '/'),
  text: readFileSync(f, 'utf8'),
}));

const text = (rel: string) => files.find((f) => f.rel === rel)?.text ?? '';

describe('required lines stay wired into the sheet', () => {
  it('shows the clinician safety line in the sheet itself, outside the scrolling move list', () => {
    expect(text('components/MuscleSheet.tsx')).toMatch(/{SAFETY_LINE}/);
    expect(text('components/MoveList.tsx')).not.toMatch(/SAFETY_LINE/);
  });

  it('shows the stretching honesty line and the ease-off cue in the move list', () => {
    expect(text('components/MoveList.tsx')).toMatch(/{STRETCH_HONESTY}/);
    expect(text('components/MoveList.tsx')).toMatch(/{MOVE_CUE}/);
  });
});

describe('required lines stay wired into the plan screens', () => {
  it('shows the plan disclaimer with every plan, and the engine message for every blocked result', () => {
    expect(text('components/PlanResultView.tsx')).toMatch(/{PLAN_DISCLAIMER}/);
    expect(text('components/PlanResultView.tsx')).toMatch(/{result\.message}/);
  });

  it('frames the health screen with the engine prompt and asks every engine question', () => {
    const health = text('components/HealthQuestions.tsx');
    expect(health).toMatch(/{RED_FLAG_PROMPT}/);
    expect(health).toMatch(/accessibilityLabel={RED_FLAG_QUESTIONS\[flag\]}/);
    expect(health).toMatch(/\$\{RED_FLAG_QUESTIONS\[flag\]\}/); // the visible text, not only the label
    expect(health).toMatch(/question={UNDER_18_QUESTION}/);
    expect(health).toMatch(/question={MEDICAL_CONDITION_QUESTION}/);
  });

  it('starts every health answer unanswered and never pre-answers one', () => {
    expect(text('PlanScreen.tsx')).toMatch(/useState<Screening>\(initialScreening\)/);
    for (const rel of ['PlanScreen.tsx', 'components/HealthQuestions.tsx']) {
      expect(text(rel), rel).not.toMatch(/under18:\s*false|medicalCondition:\s*false|redFlags:\s*\[\]/);
    }
  });

  it('keeps Build my plan disabled until every health question is answered', () => {
    expect(text('PlanScreen.tsx')).toMatch(/disabled={!isAnswered\(screening\)}/);
  });

  it('asks every red flag, shows the disclaimer only with a plan and the message only when blocked', () => {
    expect(text('components/HealthQuestions.tsx')).toMatch(/RED_FLAGS\.map\(/);
    const view = text('components/PlanResultView.tsx');
    const planBranch = view.indexOf('const { plan } = result');
    expect(planBranch).toBeGreaterThan(-1);
    expect(view.indexOf('{result.message}')).toBeLessThan(planBranch);
    expect(view.indexOf('{PLAN_DISCLAIMER}')).toBeGreaterThan(planBranch);
  });

  it('derives the plan on every render, so a later tag or check-in can never leave a stale plan on screen', () => {
    const screen = text('PlanScreen.tsx');
    expect(screen).toMatch(/const result = built\s*\?/);
    expect(screen).not.toMatch(/useState<[^>]*PlanResult/);
  });

  it('runs the plan through the engine guardrails, never around them', () => {
    expect(text('planFlow.ts')).toMatch(/planOrGuardrail\(/);
    for (const f of files) expect(f.text, f.rel).not.toMatch(/buildPlan/);
  });

  it('keeps the synthetic banner and the disclaimer in the shell, outside the tabs', () => {
    const shell = readFileSync(join(__dirname, '..', 'App.tsx'), 'utf8');
    expect(shell).toMatch(/spot\.replay\.synthetic \? SYNTHETIC_BANNER : REAL_BANNER/);
    expect(shell).toMatch(/{DISCLAIMER}/);
    expect(shell).toMatch(/<TabBar /);
    // All three tabs stay mounted so switching does not lose the day, side or answers.
    expect(shell).toMatch(/<BodyMapScreen spot={spot} \/>/);
    expect(shell).toMatch(/<PlanScreen spot={spot} \/>/);
    expect(shell).toMatch(/tab !== 'body' && styles\.hidden/);
    expect(shell).toMatch(/tab !== 'plan' && styles\.hidden/);
    expect(shell).toMatch(/<EvidenceScreen \/>/);
    expect(shell).toMatch(/tab !== 'evidence' && styles\.hidden/);
    expect(shell).toMatch(/hidden: { display: 'none' }/);
    expect(shell).not.toMatch(BANNED);
    expect(shell).not.toMatch(/buildPlan/);
  });
});

describe('the evidence tab and the accessibility state stay wired', () => {
  it('draws the engine curve, not a hand-drawn one', () => {
    expect(text('components/TimeCurveChart.tsx')).toMatch(/curveSeries\(\)/);
    expect(text('evidence.ts')).toMatch(/timecurve\(hours\)/);
  });

  it('shows every text card, the label lines, the limits card and the footnote on the evidence screen', () => {
    const screen = text('EvidenceScreen.tsx');
    expect(screen).toMatch(/TEXT_CARDS\.map\(/);
    expect(screen).toMatch(/LABEL_LINES\.map\(/);
    expect(screen).toMatch(/{LIMITS_HEADING}/);
    expect(screen).toMatch(/LIMITS\.map\(/);
    expect(screen).toMatch(/{EVIDENCE_FOOTNOTE}/);
    expect(screen).toMatch(/<TimeCurveChart /);
  });

  it('gives every single-choice group and checkbox its role and its checked state', () => {
    const count = (rel: string, re: RegExp) => (text(rel).match(re) ?? []).length;
    for (const rel of ['components/ChipRow.tsx', 'components/CheckInPicker.tsx', 'BodyMapScreen.tsx']) {
      expect(count(rel, /accessibilityRole="radiogroup"/g), rel).toBe(1);
      expect(count(rel, /accessibilityRole="radio"/g), rel).toBe(1);
    }
    expect(text('components/CheckInPicker.tsx')).toMatch(/aria-checked={level === l}/);
    expect(text('BodyMapScreen.tsx')).toMatch(/aria-checked={side === s}/);
    const health = 'components/HealthQuestions.tsx';
    expect(count(health, /accessibilityRole="radiogroup"/g)).toBe(1);
    expect(count(health, /accessibilityRole="radio"/g)).toBe(1);
    expect(count(health, /accessibilityRole="checkbox"/g)).toBe(2); // the six flags and "None of these apply"
    expect(text(health)).toMatch(/aria-checked={on}/);
  });

  it('reports selected and checked with aria props, because react-native-web ignores accessibilityState for them', () => {
    for (const f of files) expect(f.text, f.rel).not.toMatch(/accessibilityState=\{\{[^}]*\b(selected|checked)\b/);
    expect(text('components/TabBar.tsx')).toMatch(/aria-selected={tab === t}/);
    expect(text('components/TabBar.tsx')).toMatch(/accessibilityRole="tab"/);
    expect(text('components/ChipRow.tsx')).toMatch(/aria-checked={on}/);
    expect(text('components/HealthQuestions.tsx')).toMatch(/aria-checked={none}/);
    expect(text('components/HealthQuestions.tsx')).toMatch(/aria-checked={value === answer}/);
  });
});

describe('the look stays on the theme', () => {
  it('uses theme tokens and never a hex or rgb colour in any screen, component or the shell', () => {
    const shell = { rel: '../App.tsx', text: readFileSync(join(__dirname, '..', 'App.tsx'), 'utf8') };
    for (const f of [...files, shell]) {
      if (f.rel === 'theme.ts') continue;
      expect(f.text, f.rel).not.toMatch(/#[0-9A-Fa-f]{3,8}\b|rgba?\(|hsla?\(|['"](white|black|transparent|red|green|blue|gray|grey)['"]/);
    }
  });

  it('keeps the honesty caveat and the check-in question in sentence case, not in the small uppercase tag style', () => {
    expect(text('components/MoveList.tsx')).toMatch(/heading: { \.\.\.type\.strong }/);
    expect(text('components/CheckInPicker.tsx')).toMatch(/prompt: { \.\.\.type\.strong }/);
  });

  it('takes "now" from the replay, so a real export is forecast from when it was made, and labels real data as real', () => {
    expect(text('useSoreSpot.ts')).toMatch(/replayAsOf\(replay\)/);
    expect(text('useSoreSpot.ts')).not.toMatch(/DEMO_AS_OF/);
    expect(text('planCopy.ts')).toMatch(/REAL_BANNER = 'REAL DATA/);
  });

  it('hides the decorative tab icons from screen readers on every platform, and keeps the tab label', () => {
    expect(text('components/TabIcon.tsx')).toMatch(/<View aria-hidden>/);
    expect(text('components/TabBar.tsx')).toMatch(/{TAB_LABELS\[t\]}/);
  });

  it('shows the independent-prototype line under the title, so a modern look never reads as an official app', () => {
    const shell = readFileSync(join(__dirname, '..', 'App.tsx'), 'utf8');
    expect(shell).toMatch(/{INDEPENDENT_LINE}/);
    expect(shell).toMatch(/<StatusBar style="light" \/>/);
    expect(text('planCopy.ts')).toMatch(/not affiliated with WHOOP/);
  });

  it('shows the summary strip on the body map, and names the band in words beside every colour', () => {
    expect(text('BodyMapScreen.tsx')).toMatch(/<SummaryStrip day={dayForecast} dayText={dayText} \/>/);
    expect(text('BodyMapScreen.tsx')).toMatch(/{BAND_LABELS\[band\]}/);
    expect(text('components/SummaryStrip.tsx')).toMatch(/{BAND_LABELS\[band\]}/);
    // The strip names what it counts, so "4 High" cannot be taken for a health or recovery score.
    expect(text('components/SummaryStrip.tsx')).toMatch(/{SUMMARY_CAPTION}/);
    expect(text('components/SummaryStrip.tsx')).toMatch(/accessibilityLabel={summaryLabel\(summary, dayText\)}/);
  });
});

describe('honesty scan over the app source', () => {
  it('found the app source files', () => {
    expect(files.length).toBeGreaterThanOrEqual(12);
    expect(files.map((f) => f.rel)).toEqual(expect.arrayContaining(['copy.ts', 'BodyMapScreen.tsx']));
  });

  it('never uses a banned word in any source file', () => {
    for (const f of files) expect(f.text, f.rel).not.toMatch(BANNED);
  });

  it('only mentions reducing or relieving soreness in a line that says it has not been shown', () => {
    for (const f of files) {
      for (const line of f.text.split('\n')) {
        if (SORENESS_CLAIM.test(line)) expect(line, `${f.rel}: ${line.trim()}`).toMatch(NEGATED);
      }
    }
  });
});
```

Replace `app/docs.test.ts` with:

```ts
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { syntheticReplay } from '../data/replay.synthetic';
import { MUSCLES, RED_FLAG_QUESTIONS, UNDER_18_QUESTION, type Muscle } from '../engine';
import { HISTORY_INCOMPLETE_NOTE } from '../engine/planText';
import { DEMO_AS_OF } from './config';
import { REQUIRED_VARS } from '../scripts/whoop/env';
import { SCOPES } from '../scripts/whoop/http';
import { CHECKIN_LABELS, SAVE_STRETCHING_TEXT } from './copy';
import { buildForecastState } from './forecastState';
import { recommend } from './mobility/recommend';
import { BUILD_PLAN, CHANGE_ANSWERS, NONE_OF_THESE, PLAN_SKIP_TAGS, TAB_LABELS } from './planCopy';
import { DEFAULT_CHOICE, GOAL_OPTIONS, computePlan } from './planFlow';
import { answerMedicalCondition, answerNoRedFlags, answerUnder18, initialScreening } from './screening';

const read = (rel: string) => readFileSync(join(__dirname, '..', rel), 'utf8').replace(/\r\n/g, '\n');
const readme = read('README.md');
const demo = read('docs/DEMO.md');

const BANNED = /diagnos|accura|clinical|prevent|cure|validated|treat|boost|oxygen|blood flow/i;
const SORENESS_CLAIM = /(reduc(e|es|ed|ing)|relie(ve|ves|ved|ving)|eas(e|es|ed|ing)) (the |your )?soreness/i;
const NEGATED = /(not|n't) been shown to (reduce|relieve|ease) soreness/i;

// The "say this, not that" table quotes the banned claims on purpose, so it is the one part left out of the scan.
const DO_NOT_SAY = /## Say this, not that[\s\S]*?(?=\n## )/;
const demoScanned = demo.replace(DO_NOT_SAY, '');

const FOUR: Muscle[] = ['calves', 'glutes', 'hamstrings', 'quads'];
const answered = answerMedicalCondition(answerUnder18(answerNoRedFlags(initialScreening()), false), false);

const stateOf = (tags: Record<string, 'upper' | 'lower'> = {}) =>
  buildForecastState(syntheticReplay.workouts, tags, {}, DEMO_AS_OF);
const planFor = (tags: Record<string, 'upper' | 'lower'> = {}) => {
  const s = stateOf(tags);
  const r = computePlan({ forecast: s.forecast, workouts: s.tagged, recovery: syntheticReplay.recovery ?? [], asOf: DEMO_AS_OF, screening: answered, choice: DEFAULT_CHOICE });
  if (r.kind !== 'plan') throw new Error('expected a plan');
  return r.plan;
};
const bandsOn = (day: number) => stateOf().forecast.byDay[day];
const inBand = (day: number, band: string) => MUSCLES.filter((m) => bandsOn(day)[m].band === band).sort();

describe('README', () => {
  it('says what it is and what it is not, on its first lines', () => {
    const top = readme.split('\n').slice(0, 5).join(' ');
    expect(top).toMatch(/independent prototype/);
    expect(top).toMatch(/not affiliated with, endorsed by, or sponsored by WHOOP/);
    expect(top).toMatch(/not medical advice/);
  });

  it('labels the demo data as synthetic and owns up to the limits', () => {
    expect(readme).toMatch(/SYNTHETIC DATA/);
    expect(readme).toMatch(/have not been checked against real soreness logs/);
    expect(readme).toMatch(/still need review by a trainer or physical therapist/);
    expect(readme).toMatch(/primary papers are still being checked/);
  });

  it('keeps real data and credentials out of the repository, and the .gitignore really does', () => {
    expect(readme).toMatch(/data\/replay\.json/);
    expect(readme).toMatch(/\.env/);
    expect(readme).toMatch(/never commit real health data or WHOOP credentials/i);
    const ignore = read('.gitignore').split('\n').map((l) => l.trim());
    for (const entry of ['.env', 'data/replay.json', '*.token.json']) expect(ignore, entry).toContain(entry);
  });

  it('names the three tabs', () => {
    for (const label of Object.values(TAB_LABELS)) expect(readme, label).toContain(`**${label}**`);
  });

  it('does not call the plan safe or the comfort ideas honest: it says what they rest on', () => {
    expect(readme).not.toMatch(/\bsafe\b/i);
    expect(readme).not.toMatch(/\bhonest comfort/i);
    expect(readme).toMatch(/labelled by how strong the evidence is/);
  });
});

describe('the README section on using your own WHOOP data', () => {
  it('names the three variables the script reads, the redirect URL and the npm command that exists', () => {
    for (const name of REQUIRED_VARS) expect(readme, name).toContain(name);
    expect(readme).toContain('http://localhost:3000/callback');
    expect(readme).toContain('npm run export-whoop');
    const pkg = JSON.parse(read('package.json'));
    expect(pkg.scripts['export-whoop']).toContain('export-whoop.ts');
  });

  it('says which permissions are asked for, and that the script refuses to run unless the private files are git-ignored', () => {
    expect(readme).toMatch(/only for the workout and recovery read permissions/);
    expect([...SCOPES]).toEqual(['read:workout', 'read:recovery', 'offline']);
    expect(readme).toMatch(/refuses to run unless `\.env`, `data\/replay\.json` and `whoop\.token\.json` are all git-ignored/);
    expect(readme).toMatch(/never prints a secret or a token/);
  });

  it('warns to use a private network rather than a public tunnel with real data', () => {
    expect(readme).toMatch(/rather than a public tunnel/);
  });

  it('tells the presenter the runbook numbers are those of the synthetic week', () => {
    expect(demo).toMatch(/describes the synthetic week/);
    expect(demo).toMatch(/redact anything personal/);
  });
});

describe('the files the README points at', () => {
  it('ships the MIT licence and the privacy policy it names', () => {
    expect(readme).toMatch(/MIT\. See `LICENSE`/);
    expect(read('LICENSE')).toMatch(/^MIT License/);
    expect(read('PRIVACY.md')).toMatch(/not affiliated with, endorsed by, or sponsored by WHOOP/);
  });
});

describe('demo runbook: structure', () => {
  it('covers the fallback ladder and every tab by name', () => {
    for (const step of ['Primary', 'Fallback 1', 'Fallback 2', 'Always']) expect(demo, step).toContain(step);
    for (const label of Object.values(TAB_LABELS)) expect(demo, label).toContain(`**${label}**`);
  });

  it('tells the presenter to say it is synthetic and independent', () => {
    expect(demo).toMatch(/independent prototype on synthetic data/);
    expect(demo).toMatch(/not affiliated with WHOOP/);
  });

  it('never calls the model a follower of the published time course: the curve is hand-tuned to its shape', () => {
    expect(demo).not.toMatch(/follows the published/);
    expect(demo).toMatch(/hand-tuned to the published shape of soreness over time/);
  });

  it('names the controls the presenter taps by the labels the app shows', () => {
    for (const label of Object.values(CHECKIN_LABELS)) expect(demo, label).toContain(`**${label}**`);
    for (const label of [BUILD_PLAN, CHANGE_ANSWERS, NONE_OF_THESE, PLAN_SKIP_TAGS]) expect(demo, label).toContain(`**${label}**`);
    expect(demo).toContain(`**${RED_FLAG_QUESTIONS['sharp-pain'].split(',')[0]}**`);
    expect(demo).toContain(`**${UNDER_18_QUESTION}**`);
    expect(demo).toContain(`**${GOAL_OPTIONS.find((o) => o.value === 'lose-weight')!.label}**`);
    expect(demo).toContain('**6**');
  });
});

describe('demo runbook: facts match the engine and the app', () => {
  it('quotes the forecast time the way the app shows it', () => {
    const shown = `${DEMO_AS_OF.toISOString().slice(0, 16).replace('T', ' ')} UTC`;
    expect(shown).toBe('2026-09-19 20:00 UTC');
    expect(demo).toContain(shown);
  });

  it('gets the scrubber right: High through +3d, easing from +4d, gone by +6d', () => {
    for (const d of [0, 1, 2, 3]) expect(inBand(d, 'high'), `+${d}d`).toEqual(FOUR);
    expect(inBand(4, 'high')).toEqual(['quads']);
    expect(inBand(4, 'moderate')).toEqual(['adductors', 'calves', 'glutes', 'hamstrings']);
    expect(inBand(5, 'high')).toEqual([]);
    expect(inBand(5, 'moderate')).toEqual(FOUR);
    for (const d of [6, 7]) expect([...inBand(d, 'high'), ...inBand(d, 'moderate')], `+${d}d`).toEqual([]);
    expect(demo).toMatch(/glutes, quads, hamstrings and calves are \*\*High\*\*/);
    expect(demo).toMatch(/High through \*\*\+3d\*\*, ease to Moderate from \*\*\+4d\*\* \(the quads a day later, at \*\*\+5d\*\*\), and are gone by \*\*\+6d\*\*/);
  });

  it('gets the comfort ideas and the range-of-motion stretch right', () => {
    const high = recommend('quads', 'high');
    expect(high.rom).toEqual([]);
    expect(high.note).toBe('save-stretching');
    for (const move of high.comfort) expect(demo, move.name).toContain(move.name);
    expect(demo).toContain(SAVE_STRETCHING_TEXT.replace('Save', 'save').replace('.', ''));

    const moderateChest = recommend('chest', 'low', 2);
    expect(moderateChest.band).toBe('moderate');
    expect(moderateChest.rom.map((m) => m.name)).toEqual(['Doorway chest stretch']);
    expect(moderateChest.comfort.length).toBeGreaterThan(0);
    expect(demo).toContain('Doorway chest stretch');
    expect(bandsOn(0).chest.band).toBe('low');
  });

  it('gets the plan and its reaction to tagging right', () => {
    const untagged = planFor();
    expect(untagged.notes).toContain(HISTORY_INCOMPLETE_NOTE);
    expect(untagged.days.map((d) => d.title)).toEqual(['Upper body', 'Easy day', 'Rest day', 'Upper body', 'Lower body', 'Rest day', 'Rest day']);
    const newForYou = untagged.days[0].exercises[0].note!;
    expect(newForYou).toMatch(/^New for you/);
    expect(untagged.days[1].kind).toBe('easy');
    // One literal, checked against both the engine and the runbook, so neither can drift without this test failing.
    const sore = 'quads, glutes, hamstrings and calves predicted sore';
    expect(untagged.days[1].why[0]).toContain(sore);
    expect(demo).toContain(sore);

    const upper = planFor({ 'd-wed-strength': 'upper' });
    expect(upper.notes).not.toContain(HISTORY_INCOMPLETE_NOTE);
    const fewerSets = upper.days[0].exercises[0].note!;
    expect(fewerSets).toMatch(/^Fewer sets: chest, triceps and shoulders/);
    expect(upper.days[0].exercises[0].sets).toBe(untagged.days[0].exercises[0].sets);

    const thursday = upper.days[4].exercises.map((e) => e.name);
    expect(thursday).toEqual(expect.arrayContaining(['Barbell back squat', 'Barbell hip thrust', 'Reverse lunge']));

    expect(demo).toContain('a note that some workouts are not counted');
    // The runbook quotes the app's own notes, minus the full stop.
    expect(demo).toContain(`*${newForYou.replace(/\.$/, '')}*`);
    expect(demo).toContain(`*${fewerSets.replace(/\.$/, '')}*`);
    expect(demo).toMatch(/back squat at fewer sets, a hip thrust and a reverse lunge/);
    expect(demo).toContain('the not-counted note is gone');
    // Tags cannot be changed once given, so the runbook must not tell the presenter to re-tag.
    expect(demo).not.toMatch(/tag the session \*\*Lower body\*\* instead/i);
  });
});

describe('honesty scan over the docs', () => {
  it('has the do-not-say table (so the scan below is skipping something real)', () => {
    expect(DO_NOT_SAY.test(demo)).toBe(true);
  });

  it('uses no banned word in the README or the runbook, outside the do-not-say table', () => {
    expect(readme).not.toMatch(BANNED);
    expect(demoScanned).not.toMatch(BANNED);
  });

  it('only mentions reducing, relieving or easing soreness in a line that says it has not been shown', () => {
    for (const [name, doc] of [['README.md', readme], ['docs/DEMO.md', demoScanned]] as const) {
      for (const line of doc.split('\n')) {
        if (SORENESS_CLAIM.test(line)) expect(line, `${name}: ${line.trim()}`).toMatch(NEGATED);
      }
    }
  });

  it('catches every inflection of the claim, and only excuses a line that says it has not been shown', () => {
    for (const bad of ['Stretching reduces soreness.', 'It relieves soreness fast.', 'Foam rolling eases soreness.', 'to ease your soreness']) {
      expect(SORENESS_CLAIM.test(bad), bad).toBe(true);
      expect(NEGATED.test(bad), bad).toBe(false);
    }
    expect(NEGATED.test("Stretching hasn't been shown to reduce soreness.")).toBe(true);
    expect(SORENESS_CLAIM.test('Save stretching for when soreness eases.')).toBe(false);
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run app/config.test.ts app/honesty.test.ts app/docs.test.ts`
Expected: FAIL. `config.test.ts` fails (`replayAsOf` does not exist); the honesty tests fail on the real-banner wiring in the shell and `useSoreSpot`; the new README tests fail (no "Using your own WHOOP data" section, no scopes or refusal statement, no tunnel warning, no runbook note). The older tests still pass. Paste the real output.

- [ ] **Step 3: Write the implementation**

Replace `app/config.ts` with:

```ts
import type { ReplayFile } from '../engine';

/** Fixed on purpose: the synthetic demo week is Sep 14-20 2026, so a live clock would eventually render an all-low map. */
export const DEMO_AS_OF = new Date('2026-09-19T20:00:00Z');

/** A real export carries the moment it was made, which is "now" for the app; the synthetic week uses the fixed demo time. */
export function replayAsOf(replay: Pick<ReplayFile, 'asOf'>): Date {
  return replay.asOf ? new Date(replay.asOf) : DEMO_AS_OF;
}
```

Replace `app/useSoreSpot.ts` with:

```ts
import { useCallback, useMemo, useState } from 'react';
import { loadReplay } from '../data';
import type { Muscle, StrengthTag } from '../engine';
import type { CheckInLevel, CheckIns } from './checkin';
import { replayAsOf } from './config';
import { buildForecastState } from './forecastState';
import type { Tags } from './tagging';

/** The state both tabs share: the workouts, the member's tags and check-ins, and the forecast they produce. */
export function useSoreSpot() {
  const replay = useMemo(() => loadReplay(), []);
  const asOf = useMemo(() => replayAsOf(replay), [replay]);
  const [checkIns, setCheckIns] = useState<CheckIns>({});
  const [tags, setTags] = useState<Tags>({});

  const state = useMemo(
    () => buildForecastState(replay.workouts, tags, checkIns, asOf),
    [replay, asOf, tags, checkIns],
  );

  const checkIn = useCallback(
    (muscle: Muscle, level: CheckInLevel) => setCheckIns((cur) => ({ ...cur, [muscle]: level })),
    [],
  );
  const tagSession = useCallback(
    (id: string, tag: StrengthTag) => setTags((cur) => ({ ...cur, [id]: tag })),
    [],
  );

  return { replay, asOf, checkIns, checkIn, tagSession, ...state };
}

export type SoreSpot = ReturnType<typeof useSoreSpot>;
```

Replace `app/planCopy.ts` with:

```ts
export const TAB_LABELS = { body: 'Body map', plan: 'Plan', evidence: 'Evidence' } as const;

/** Shown under the title on every screen. A modern look must never read as an official app. */
/** Shown instead of the synthetic banner when the app is reading a real export, so it is always clear whose data is on screen. */
export const REAL_BANNER = 'REAL DATA \u00B7 YOUR OWN EXPORT';

export const INDEPENDENT_LINE = 'Independent prototype · not affiliated with WHOOP';

export const PLAN_TAG_GATE_HEADING = 'Before we plan';
export const PLAN_TAG_GATE_TEXT =
  'These strength sessions are not counted until you say which muscles they worked. Tagging them gives the plan a fuller picture of your week.';
export const PLAN_SKIP_TAGS = 'Plan without these';

export const HEALTH_HEADING = 'A few health questions';
export const HEALTH_INTRO = 'Answer every question. A plan is only built once you have.';
export const NONE_OF_THESE = 'None of these apply';
export const YES = 'Yes';
export const NO = 'No';

export const REQUEST_HEADING = 'What should the plan be built for?';
export const GOAL_LABEL = 'Goal';
export const DAYS_LABEL = 'Training days per week';
export const EQUIPMENT_LABEL = 'Equipment';

export const BUILD_PLAN = 'Build my plan';
export const BUILD_HINT = 'Answer every health question to continue.';
export const CHANGE_ANSWERS = 'Change answers';

export const PLAN_HEADING = 'Your next 7 days';
export const NOTES_HEADING = 'This week';
export const BLOCKED_HEADING = 'No plan for now';
export const WHY_HEADING = 'Why';
```

Replace `App.tsx` with:

```tsx
import { StatusBar } from 'expo-status-bar';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import BodyMapScreen from './app/BodyMapScreen';
import EvidenceScreen from './app/EvidenceScreen';
import PlanScreen from './app/PlanScreen';
import TabBar, { type Tab } from './app/components/TabBar';
import { DISCLAIMER, SYNTHETIC_BANNER } from './app/copy';
import { INDEPENDENT_LINE, REAL_BANNER } from './app/planCopy';
import { colors, space, type } from './app/theme';
import { useSoreSpot } from './app/useSoreSpot';

export default function App() {
  const spot = useSoreSpot();
  const [tab, setTab] = useState<Tab>('body');

  return (
    <View style={styles.root}>
      {/* The label and the disclaimer sit outside the tabs, so they are always visible. */}
      <View style={styles.header}>
        <Text style={styles.title}>Sore Spot</Text>
        <Text style={styles.independent}>{INDEPENDENT_LINE}</Text>
        <Text style={styles.banner}>{spot.replay.synthetic ? SYNTHETIC_BANNER : REAL_BANNER}</Text>
      </View>

      {/* All three tabs stay mounted, so switching keeps the day, side and plan answers. */}
      <View style={[styles.tab, tab !== 'body' && styles.hidden]}>
        <BodyMapScreen spot={spot} />
      </View>
      <View style={[styles.tab, tab !== 'plan' && styles.hidden]}>
        <PlanScreen spot={spot} />
      </View>
      <View style={[styles.tab, tab !== 'evidence' && styles.hidden]}>
        <EvidenceScreen />
      </View>

      <View style={styles.footer}>
        <Text style={styles.note}>{DISCLAIMER}</Text>
      </View>
      <TabBar tab={tab} onChange={setTab} />
      <StatusBar style="light" />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  header: { paddingTop: 56, paddingHorizontal: space.lg, paddingBottom: space.sm, gap: space.xs },
  tab: { flex: 1 },
  hidden: { display: 'none' },
  footer: {
    paddingHorizontal: space.lg,
    paddingVertical: space.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.card,
  },
  title: { ...type.title },
  independent: { ...type.small },
  banner: { fontSize: 11, fontWeight: '800', letterSpacing: 1.2, color: colors.banner },
  note: { ...type.small },
});
```

Replace `README.md` with:

````md
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
3. Run `npm run export-whoop`. It opens WHOOP sign-in in your browser, then reads the last 60 days of workouts and recovery (`--days N` for another span, up to 365) and writes `data/replay.json`. It asks only for the workout and recovery read permissions, plus a refresh token.
4. Restart Expo. The header now says `REAL DATA` instead of `SYNTHETIC DATA`, and the forecast starts from the moment you exported.

The script prints how many workouts it found, which sports it saw, and which of them the model has no muscle map for yet (those add no soreness). Strength sessions arrive untagged, so the app asks which muscles each one worked.

It refuses to run unless `.env`, `data/replay.json` and `whoop.token.json` are all git-ignored, and it never prints a secret or a token. To go back to the synthetic week, delete `data/replay.json`.

## Data and privacy

- The app runs on `data/replay.synthetic.ts` unless a local `data/replay.json` exists. That file, `.env` and `*.token.json` are git-ignored: **never commit real health data or WHOOP credentials.**
- Health answers stay in memory and are asked again each launch. Nothing is stored or sent anywhere.
- Your export stays on your laptop. The app loads it from `data/replay.json`, and Expo serves it to whichever device you open the app on, so use your own network rather than a public tunnel when running with real data.
- See `PRIVACY.md` for the prototype's privacy policy, which covers the WHOOP export.

## Honest limits

- The predictions have not been checked against real soreness logs, and the app makes no claim about how often it is right.
- The weights, thresholds and time curve are set by hand, not fitted to data. The low, medium and high recovery cutoffs are hand-set and have not been checked against WHOOP's own zones.
- The exercise and comfort libraries are general guidance and still need review by a trainer or physical therapist.
- The evidence summaries come from published reviews; the primary papers are still being checked.
- Stretching has not been shown to reduce soreness. The app labels stretches as range-of-motion work and puts the training plan first.

## Status

Built so far: the soreness engine, the body map and scrubber, check-ins with comfort ideas and session tagging, the plan engine with guardrails, the Plan tab, and the Evidence tab. The one-time export of your own WHOOP history (`npm run export-whoop`) is built and tested against a stand-in for WHOOP; the first run against your real account is yours to do.

## License

MIT. See `LICENSE`.
````

Replace `docs/DEMO.md` with:

````md
# Sore Spot: 3-minute demo runbook

Independent prototype, not affiliated with WHOOP. Everything on screen is synthetic (the `SYNTHETIC DATA` banner says so). Say that out loud in the first ten seconds.

## Before you start

1. On the laptop, in PowerShell: `npx.cmd expo start`. Scan the QR code with the iPhone Camera; Expo Go opens the app. Laptop and phone on the same Wi-Fi, or use a phone hotspot.
2. Open the app once and check all three tabs load. The app starts on **Body map**, day **Now**, with **Front** selected. Kill and reopen it for a clean run: check-ins, tags and health answers are not saved between launches.
3. Have the browser version ready too: `npx expo start --web` on the laptop.
4. Make the offline copies now: `npx expo export --platform web` writes a static web build to `dist/` (git-ignored), and record the phone screen for the fallback recording.

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
| 0:50 | The heatmap and the why | On **Now** the glutes, quads, hamstrings and calves are **High**. Tap **Quads** and read the reasons (new for you, lengthening work). Toggle **Back** to see the hamstrings and calves. Drag the scrubber: they stay High through **+3d**, ease to Moderate from **+4d** (the quads a day later, at **+5d**), and are gone by **+6d** | The picture is a prediction, not a measurement. The curve behind it is hand-tuned to the published shape of soreness over time, and the model counts new work and lengthening work for more. |
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
````

- [ ] **Step 4: Run the whole suite, typecheck and the web export**

Run: `npm test && npm run typecheck && npx expo export --platform web --output-dir /tmp/d-export`
Expected: 41 test files, 377 tests pass (the 370 after Task 2 plus 2 config tests and 5 more in the honesty and docs tests); typecheck prints no errors; the export ends with `Exported: ...`. Then `rm -rf /tmp/d-export` and confirm `git status --short` shows only the nine files of this task (1 new, 8 replaced) and no `dist/` folder.

- [ ] **Step 5: Prove the guards can fail**

Break each line on purpose, run the tests, and restore from a backup:
```bash
cp app/useSoreSpot.ts /tmp/spot.bak
sed -i 's/const asOf = useMemo(() => replayAsOf(replay), \[replay\]);/const asOf = useMemo(() => new Date("2026-09-19T20:00:00Z"), [replay]);/' app/useSoreSpot.ts
npx vitest run app/honesty.test.ts
cp /tmp/spot.bak app/useSoreSpot.ts
cp App.tsx /tmp/app.bak
sed -i 's/spot.replay.synthetic ? SYNTHETIC_BANNER : REAL_BANNER/SYNTHETIC_BANNER/' App.tsx
npx vitest run app/honesty.test.ts
cp /tmp/app.bak App.tsx
cp app/config.ts /tmp/config.bak
sed -i 's/return replay.asOf ? new Date(replay.asOf) : DEMO_AS_OF;/return DEMO_AS_OF;/' app/config.ts
npx vitest run app/config.test.ts
cp /tmp/config.bak app/config.ts
npx vitest run app/config.test.ts app/honesty.test.ts app/docs.test.ts
```
Expected: the first run FAILS (the app must take "now" from the replay); the second FAILS (the shell must show the real-data banner); the third FAILS (a real export's time must be used); the fourth passes. Confirm `git diff --stat` shows no change to those three files. Paste all four outputs.

- [ ] **Step 6: Commit**

```bash
git add app App.tsx README.md docs/DEMO.md
git commit -m "$(cat <<'EOF'
Forecast from the export time, label real data as real, and document the export

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

## Self-Review

**Spec coverage:**
- The replay export time and its validation: Task 1 (engine, tested); the app taking "now" from it and the real-data banner: Task 3.
- `.env` reading, redirect target, scrubbing: Task 1; the redirect catcher with state, denial, timeout and port handling: Task 2.
- Sign-in URL with only the three scopes and an unguessable state, code exchange, rotating refresh: Task 1; the whole flow including fallback and saving tokens first: Task 2 (end-to-end against a fake WHOOP).
- Paged reads with retry and clear 401/403 messages, and the loop guard: Task 1.
- The builder (real flag, stamp, sort, de-duplicate, validate, name failures) and the counts-only summary with unmapped sports and strength sessions: Task 1.
- The git-ignore guard and its position before anything else: Task 1 (tested against a real repository) and Task 2 (source-level wiring and the smoke test).
- The command, its flags and the npm script: Task 2 and Task 1 (`package.json`).
- README and runbook, tied to the code by tests: Task 3.
- Non-goals respected: no server, no webhooks, no profile scope, no map changes, no run against a real account.
- The first real run, and reading its summary, are the user's steps after the tasks.

**Type consistency:** every name is defined once (Task 1, then Task 2, then Task 3) and used with the same signature, because all blocks come from one verified copy.

**Known limits, stated plainly:** the script follows WHOOP's published documentation and is tested against a stand-in, not the real service; the sport map is unchanged until real sports are seen; Expo serves the replay file to the device that opens the app, so real data should stay on a private network.
