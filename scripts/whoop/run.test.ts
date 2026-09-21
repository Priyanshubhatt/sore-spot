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
function fakeWhoop(options: { workoutsStatus?: number; recoveryStatus?: number; workoutsBody?: string; refreshStatus?: number; tokenNetworkError?: boolean; emptyWorkouts?: boolean } = {}) {
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
      if (options.tokenNetworkError) throw new Error('ECONNRESET talking to the token endpoint');
      if (options.refreshStatus && form.get('grant_type') === 'refresh_token') return respond(options.refreshStatus, 'token trouble');
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
      if (options.emptyWorkouts) return respond(200, { records: [] });
      return options.workoutsStatus ? respond(options.workoutsStatus, options.workoutsBody ?? 'server trouble') : respond(200, pages(syntheticReplay.workouts, url));
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

async function setup(whoopOptions = {}, tokenText: string | null = null, browser: 'good' | 'wrong-state' = 'good', timeoutMs = 3000) {
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
    waitForCode: (state) => waitForCallback({ ...callbackTarget(redirectUri), expectedState: state, timeoutMs }),
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
    const { deps, whoop, tokenFile, written } = await setup({}, null, 'wrong-state', 300);
    const err = await failure(runExport(deps));
    expect(err.message).toMatch(/No sign-in arrived/);
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

describe('runExport: the refresh path', () => {
  it('saves the rotated refresh token before any data is read, so a failed read cannot lose it', async () => {
    const { deps, whoop, tokenFile, written } = await setup({ workoutsStatus: 500 }, savedTokens({ expiresAt: NOW - 1000 }));
    await failure(runExport(deps));
    const saved = loadTokens(tokenFile)!;
    expect(saved.refresh_token).toBe(whoop.current().refresh);
    expect(saved.refresh_token).not.toBe('refresh-1');
    expect(written).toHaveLength(0);
  });

  it('does not sign in again when refreshing fails for a reason that is not a refusal (a dropped connection)', async () => {
    const { deps, opened } = await setup({ tokenNetworkError: true }, savedTokens({ expiresAt: NOW - 1000 }));
    const err = await failure(runExport(deps));
    expect(err.message).toMatch(/ECONNRESET/);
    expect(opened).toHaveLength(0);
  });

  it('does not sign in again when refreshing hits a server error or a rate limit', async () => {
    for (const status of [500, 429]) {
      const { deps, opened } = await setup({ refreshStatus: status }, savedTokens({ expiresAt: NOW - 1000 }));
      const err = await failure(runExport(deps));
      expect(err.message, String(status)).toMatch(new RegExp(`HTTP ${status}`));
      expect(opened, String(status)).toHaveLength(0);
    }
  });

  it('prints and writes no secret, token or code on the refresh path either', async () => {
    const { deps, logs, written } = await setup({}, savedTokens({ expiresAt: NOW - 1000 }));
    await runExport(deps);
    const everything = [...logs, ...written].join('\n');
    for (const secret of [...PRIVATE, 'refresh-3']) expect(everything, secret).not.toContain(secret);
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

  it('scrubs the client secret, client id and refresh token from an error body echoed by the data endpoints', async () => {
    const echo = `oops ${SECRET} ${CLIENT_ID} refresh-1 access-1`;
    const { deps, written } = await setup({ workoutsStatus: 500, workoutsBody: echo });
    const err = await failure(runExport(deps));
    expect(err.message).toMatch(/HTTP 500/);
    for (const secret of [SECRET, CLIENT_ID, 'refresh-1', 'access-1']) expect(err.message, secret).not.toContain(secret);
    expect(written).toHaveLength(0);
  });

  it('refuses to write an export with no workouts, and says what to try', async () => {
    const { deps, written } = await setup({ emptyWorkouts: true });
    const err = await failure(runExport(deps));
    expect(err.message).toMatch(/no workouts for the last 60 days.*--days/);
    expect(written).toHaveLength(0);
  });

  it('writes nothing when recovery fails after workouts succeeded', async () => {
    const { deps, written } = await setup({ recoveryStatus: 500 });
    await failure(runExport(deps));
    expect(written).toHaveLength(0);
  });

  it('renews a saved token that has not expired but was rejected, instead of failing on every run', async () => {
    const { deps, whoop, tokenFile, opened, written, logs } = await setup({}, savedTokens({ access: 'access-not-current' }));
    await runExport(deps);
    expect(opened).toHaveLength(0);
    expect(written).toHaveLength(1);
    expect(logs.join('\n')).toMatch(/rejected the saved sign-in, so renewing/);
    expect(loadTokens(tokenFile)?.refresh_token).toBe(whoop.current().refresh);
  });

  it('signs in again when the rejected saved token cannot be renewed either', async () => {
    const { deps, opened, written } = await setup({}, savedTokens({ access: 'access-not-current', refresh: 'stale-refresh' }));
    await runExport(deps);
    expect(opened).toHaveLength(1);
    expect(written).toHaveLength(1);
  });

  it('does not loop: a token rejected right after a fresh sign-in is an error, with no second sign-in', async () => {
    const { deps, whoop, opened, written } = await setup({ workoutsStatus: 401 });
    const err = await failure(runExport(deps));
    expect(err.message).toMatch(/sign in/i);
    expect(opened).toHaveLength(1);
    // The only token request was the code exchange: nothing tried to renew a sign-in that had just been made.
    expect(whoop.requests.filter((r) => r.url.includes('oauth2/token'))).toHaveLength(1);
    expect(written).toHaveLength(0);
  });

  it('gives up after one renewal when WHOOP keeps rejecting a saved sign-in', async () => {
    const { deps, opened, written } = await setup({ workoutsStatus: 401 }, savedTokens());
    const err = await failure(runExport(deps));
    expect(err.message).toMatch(/sign in/i);
    expect(opened).toHaveLength(0);
    expect(written).toHaveLength(0);
  });
});
