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
