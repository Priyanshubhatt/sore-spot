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

  it('never waits longer than a minute on a Retry-After, however large', async () => {
    const waits: number[] = [];
    const { fetchFn } = scriptedFetch([respond(429, 'x', { 'Retry-After': '86400' }), respond(200, { records: [] })]);
    await fetchAllPages('/v2/recovery', window, ctx(fetchFn, { sleep: async (ms: number) => void waits.push(ms) }));
    expect(waits).toEqual([60_000]);
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

  it('stops at once when a page repeats the token it was fetched with', async () => {
    const { fetchFn, calls } = scriptedFetch([
      respond(200, { records: [{ id: 'a' }], next_token: 'same' }),
      respond(200, { records: [{ id: 'b' }], next_token: 'same' }),
    ]);
    await expect(fetchAllPages('/v2/recovery', window, ctx(fetchFn))).rejects.toThrow(/same page token/);
    expect(calls).toHaveLength(2);
  });

  it('stops if the paging never ends, instead of looping forever', async () => {
    let n = 0;
    const fetchFn = async () => respond(200, { records: [], next_token: `t${n++}` });
    await expect(fetchAllPages('/v2/recovery', window, ctx(fetchFn))).rejects.toThrow(/Stopped after/);
  });
});
