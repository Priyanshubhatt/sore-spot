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
