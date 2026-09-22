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

/** Sent on every request, so WHOOP sees what this is instead of the bare `node` agent string. */
export const USER_AGENT = 'sore-spot-export/1.0 (independent prototype; not affiliated with WHOOP)';

/** Only these are ever requested: the workouts and recovery the app uses, and a refresh token. */
export const SCOPES = ['read:workout', 'read:recovery', 'offline'] as const;
