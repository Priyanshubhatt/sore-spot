import { createServer } from 'node:http';

export interface CallbackOptions {
  port: number;
  path: string;
  /** The state sent with the sign-in request: the redirect must bring the same one back. */
  expectedState: string;
  timeoutMs: number;
}

const page = (message: string) =>
  `<!doctype html><meta charset="utf-8"><title>Sore Spot export</title><body style="font:16px system-ui;padding:2rem"><p>${message}</p>`;

/**
 * Listens on localhost for the one redirect WHOOP sends after sign-in and resolves with the
 * authorization code. Rejects on a denied sign-in, a state that does not match, or a timeout.
 */
export function waitForCallback(opts: CallbackOptions): Promise<string> {
  return new Promise((resolve, reject) => {
    let settled = false;
    const server = createServer((req, res) => {
      const url = new URL(req.url ?? '/', `http://localhost:${opts.port}`);
      if (url.pathname !== opts.path) {
        res.writeHead(404, { 'content-type': 'text/plain' }).end('Not found');
        return;
      }
      const finish = (status: number, message: string, error?: Error, code?: string) => {
        res.writeHead(status, { 'content-type': 'text/html; charset=utf-8' }).end(page(message));
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        server.close();
        if (error) reject(error);
        else resolve(code as string);
      };
      const denied = url.searchParams.get('error');
      if (denied) {
        finish(400, 'WHOOP did not authorize the export. You can close this tab.', new Error(`WHOOP sign-in was not completed (${denied}).`));
      } else if (url.searchParams.get('state') !== opts.expectedState) {
        finish(400, 'That sign-in did not match this export. You can close this tab.', new Error('The sign-in redirect had a different state than the one sent, so it was ignored. Run the export again.'));
      } else if (!url.searchParams.get('code')) {
        finish(400, 'No code came back. You can close this tab.', new Error('The sign-in redirect had no code.'));
      } else {
        finish(200, 'Signed in. You can close this tab and return to the terminal.', undefined, url.searchParams.get('code') as string);
      }
    });
    const timer = setTimeout(() => {
      if (settled) return;
      settled = true;
      server.close();
      reject(new Error(`No sign-in arrived within ${Math.round(opts.timeoutMs / 1000)} seconds. Run the export again.`));
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
    server.listen({ port: opts.port, host: 'localhost' });
  });
}
