import { createServer } from 'node:http';

export interface CallbackOptions {
  port: number;
  /** The address the redirect names: `localhost` or `127.0.0.1`. The server binds exactly that, and only that. */
  host?: string;
  path: string;
  /** The state sent with the sign-in request: only a redirect that brings the same one back is used. */
  expectedState: string;
  timeoutMs: number;
}

// Every page is fixed text: nothing from the request is ever put in it.
const page = (message: string) =>
  `<!doctype html><meta charset="utf-8"><title>Sore Spot export</title><body style="font:16px system-ui;padding:2rem"><p>${message}</p>`;

/** Short and plain, so nothing from a redirect can put control codes in the terminal. */
const cleanReason = (raw: string) => raw.replace(/[^A-Za-z0-9_.-]/g, '').slice(0, 40) || 'unknown';

/**
 * Listens on localhost for the one redirect WHOOP sends after sign-in and resolves with the
 * authorization code. A request without the right state is answered and ignored, so a stray page
 * cannot end or hijack a sign-in. Rejects on a denied sign-in, a missing code, or a timeout.
 */
export function waitForCallback(opts: CallbackOptions): Promise<string> {
  return new Promise((resolve, reject) => {
    let settled = false;
    const settle = (finish: () => void) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      server.close();
      finish();
    };
    const server = createServer((req, res) => {
      const reply = (status: number, body: string, type = 'text/html; charset=utf-8') => res.writeHead(status, { 'content-type': type }).end(body);
      let url: URL;
      try {
        url = new URL(req.url ?? '/', `http://localhost:${opts.port}`);
      } catch {
        reply(400, 'Bad request', 'text/plain');
        return;
      }
      if (url.pathname !== opts.path) {
        reply(404, 'Not found', 'text/plain');
        return;
      }
      if (url.searchParams.get('state') !== opts.expectedState) {
        reply(400, page('That request did not match this export, so it was ignored. You can close this tab.'));
        return;
      }
      const denied = url.searchParams.get('error');
      const code = url.searchParams.get('code');
      if (denied) {
        reply(400, page('WHOOP did not authorize the export. You can close this tab.'));
        settle(() => reject(new Error(`WHOOP sign-in was not completed (${cleanReason(denied)}).`)));
      } else if (!code) {
        reply(400, page('No code came back. You can close this tab.'));
        settle(() => reject(new Error('The sign-in redirect had no code.')));
      } else {
        reply(200, page('Signed in. You can close this tab and return to the terminal.'));
        settle(() => resolve(code));
      }
    });
    const timer = setTimeout(() => {
      settle(() => reject(new Error(`No sign-in arrived within ${Math.round(opts.timeoutMs / 1000)} seconds. Run the export again.`)));
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
    server.listen({ port: opts.port, host: opts.host ?? 'localhost' });
  });
}
