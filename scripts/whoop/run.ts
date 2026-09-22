import { fetchRecovery, fetchWorkouts } from './api';
import { buildAuthUrl, exchangeCode, isFresh, makeState, refreshTokens, type Tokens } from './auth';
import { buildReplay, formatSummary, screenRecords, summarize, type ExportSummary } from './build';
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

interface Signed {
  tokens: Tokens;
  /** True when these came from the saved file, so a rejection may only mean they went stale. */
  fromSaved: boolean;
}

/** Only these mean "the refresh token is no good": a server error or a rate limit is not a reason to sign in again. */
const isRefusal = (err: unknown): boolean => err instanceof WhoopHttpError && (err.status === 400 || err.status === 401);

/**
 * Fresh saved tokens, a refreshed set, or a new sign-in: whichever the situation needs.
 * `force` skips the freshness check, for a saved token that WHOOP has just rejected.
 */
async function getTokens(deps: RunDeps, force: boolean): Promise<Signed> {
  const endpoints = deps.endpoints ?? DEFAULT_ENDPOINTS;
  const saved = loadTokens(deps.tokenFile);
  if (!force && saved && isFresh(saved, deps.now())) {
    deps.log('Using the saved sign-in.');
    return { tokens: saved, fromSaved: true };
  }
  if (saved?.refresh_token) {
    try {
      const refreshed = await refreshTokens(deps.env, saved.refresh_token, deps.fetchFn, deps.now(), endpoints);
      // WHOOP rotates the refresh token, so the new one is saved before anything else can fail.
      saveTokens(deps.tokenFile, refreshed);
      deps.log('Renewed the saved sign-in.');
      return { tokens: refreshed, fromSaved: true };
    } catch (err) {
      if (!isRefusal(err)) throw err;
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
  return { tokens, fromSaved: false };
}

async function readData(deps: RunDeps, tokens: Tokens, start: Date, end: Date) {
  const ctx = {
    fetchFn: deps.fetchFn,
    accessToken: tokens.access_token,
    endpoints: deps.endpoints,
    sleep: deps.sleep,
    secrets: [deps.env.clientSecret, deps.env.clientId, tokens.refresh_token ?? ''],
  };
  const workouts = await fetchWorkouts({ start, end }, ctx);
  const recovery = await fetchRecovery({ start, end }, ctx);
  return { workouts, recovery };
}

/** Signs in if needed, pulls the workouts and recovery for the window, and writes the replay file. */
export async function runExport(deps: RunDeps): Promise<ExportSummary> {
  const signed = await getTokens(deps, false);
  const end = new Date(deps.now());
  const start = new Date(end.getTime() - deps.days * 86_400_000);
  deps.log(`Reading the last ${deps.days} days of workouts and recovery.`);
  let data;
  try {
    data = await readData(deps, signed.tokens, start, end);
  } catch (err) {
    // A saved token that has not expired can still have been revoked: renew it once, instead of failing on every run.
    if (!(err instanceof WhoopHttpError && err.status === 401 && signed.fromSaved)) throw err;
    deps.log('WHOOP rejected the saved sign-in, so renewing it.');
    data = await readData(deps, (await getTokens(deps, true)).tokens, start, end);
  }
  if (data.workouts.length === 0) {
    throw new Error(`WHOOP returned no workouts for the last ${deps.days} days, so nothing was written. Try a longer span with --days, or check that the sign-in was for the right account.`);
  }
  const { input, skipped } = screenRecords({ ...data, exportedAt: end });
  const because = skipped.reasons.length > 0 ? ` (${skipped.reasons.join('; ')})` : '';
  if (skipped.workouts + skipped.recovery > 0) {
    deps.log(`Skipped records that were not in the shape this script expects: ${skipped.workouts} workout, ${skipped.recovery} recovery${because}. The rest were kept.`);
  }
  if (input.workouts.length === 0) {
    throw new Error(`None of the ${data.workouts.length} workout records were in a shape this script recognises${because}, so nothing was written. Paste this message back so the script can be fixed.`);
  }
  const replay = buildReplay(input);
  deps.writeReplay(JSON.stringify(replay, null, 2));
  const summary = summarize(replay);
  for (const line of formatSummary(summary)) deps.log(line);
  return summary;
}
