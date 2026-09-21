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

  it('counts a token as fresh only while more than a minute is left', () => {
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

  it('keeps the old refresh token when a refresh response does not bring a new one', async () => {
    const { refresh_token: _dropped, ...withoutRefresh } = tokenJson;
    const { fetchFn } = scriptedFetch([respond(200, withoutRefresh)]);
    expect((await refreshTokens(ENV, 'ref-222222', fetchFn, NOW)).refresh_token).toBe('ref-222222');
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
