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
