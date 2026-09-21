import { redact } from './env';
import { DEFAULT_ENDPOINTS, USER_AGENT, WhoopHttpError, type Endpoints, type FetchLike } from './http';

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
/** A server asking for a long wait is not obeyed beyond this: the person would think the script had hung. */
const MAX_WAIT_MS = 60_000;

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
        headers: { authorization: `Bearer ${ctx.accessToken}`, accept: 'application/json', 'user-agent': USER_AGENT },
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
        const following = typeof body.next_token === 'string' && body.next_token !== '' ? body.next_token : undefined;
        if (following !== undefined && following === nextToken) {
          throw new Error(`WHOOP kept returning the same page token for ${path}; stopping instead of looping.`);
        }
        nextToken = following;
        break;
      }
      if (res.status === 429 && attempt < maxRetries) {
        const retryAfter = Number(res.headers.get('retry-after'));
        await sleep(Math.min(MAX_WAIT_MS, Number.isFinite(retryAfter) && retryAfter > 0 ? retryAfter * 1000 : 2 ** attempt * 1000));
        attempt++;
        continue;
      }
      const said = redact(text, secrets).slice(0, 300);
      if (res.status === 401) {
        throw new WhoopHttpError(401, `WHOOP rejected the access token (HTTP 401). Run the export again to sign in.${said ? ` WHOOP said: ${said}` : ''}`);
      }
      if (res.status === 403) {
        throw new WhoopHttpError(403, `WHOOP refused ${path} (HTTP 403). The app may lack the scope for it, or WHOOP may be blocking the request.${said ? ` WHOOP said: ${said}` : ''}`);
      }
      throw new WhoopHttpError(res.status, `WHOOP returned HTTP ${res.status} for ${path}: ${said}`);
    }
    if (!nextToken) return records;
  }
  throw new Error(`Stopped after ${MAX_PAGES} pages of ${path}; something is wrong with the paging.`);
}

export const fetchWorkouts = (window: Window, ctx: ApiContext) => fetchAllPages('/v2/activity/workout', window, ctx);
export const fetchRecovery = (window: Window, ctx: ApiContext) => fetchAllPages('/v2/recovery', window, ctx);
