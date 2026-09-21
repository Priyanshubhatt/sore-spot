import { execFile } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { parseDays } from './whoop/args';
import { waitForCallback } from './whoop/callback';
import { callbackTarget, parseEnvFile, readWhoopEnv, redact } from './whoop/env';
import { writePrivate } from './whoop/files';
import { runExport } from './whoop/run';
import { PRIVATE_FILES, assertGitIgnored, gitCheckIgnore } from './whoop/safety';

// One-time export of your own WHOOP history to data/replay.json. Run: npm run export-whoop
// It reads .env, signs you in through WHOOP in your browser, and never prints a secret or a token.

/** A dropped connection, a timeout or a refused redirect would otherwise all read as "fetch failed". */
function explainNetworkError(err: unknown): Error {
  const e = err as { name?: string; message?: string; cause?: { code?: string; message?: string } };
  if (e?.name === 'TimeoutError') return new Error('WHOOP did not answer within 30 seconds. Check the connection and run the export again.');
  const why = e?.cause?.code ?? e?.cause?.message ?? e?.message ?? 'unknown';
  return new Error(`Could not reach WHOOP (${String(why).slice(0, 80)}). Check the connection, and that nothing (a proxy or VPN) is redirecting the request.`);
}

function openBrowser(url: string): void {
  const [cmd, args] =
    process.platform === 'win32'
      ? ['rundll32', ['url.dll,FileProtocolHandler', url]]
      : process.platform === 'darwin'
        ? ['open', [url]]
        : ['xdg-open', [url]];
  // If it fails, the address was printed, so the person can open it by hand.
  execFile(cmd, args as string[], () => undefined);
}

async function main(): Promise<void> {
  const root = process.cwd();
  const days = parseDays(process.argv.slice(2));

  const envPath = join(root, '.env');
  if (!existsSync(envPath)) throw new Error('No .env file here. Create it with WHOOP_CLIENT_ID, WHOOP_CLIENT_SECRET and WHOOP_REDIRECT_URI.');
  // Before the credentials file is even read: everything private must already be git-ignored.
  assertGitIgnored(PRIVATE_FILES, gitCheckIgnore(root));
  const env = readWhoopEnv(parseEnvFile(readFileSync(envPath, 'utf8')));

  const tokenPath = join(root, 'whoop.token.json');
  const replayPath = join(root, 'data', 'replay.json');
  const target = callbackTarget(env.redirectUri);
  const secrets = [env.clientSecret];

  try {
    await runExport({
      env,
      days,
      now: () => Date.now(),
      // No redirects (a form body must never be replayed to another address) and no request waits forever.
      fetchFn: (url, init) => fetch(url, { ...init, redirect: 'error', signal: AbortSignal.timeout(30_000) }).catch((err) => {
        throw explainNetworkError(err);
      }),
      tokenFile: {
        read: () => (existsSync(tokenPath) ? readFileSync(tokenPath, 'utf8') : null),
        write: (text) => writePrivate(tokenPath, text),
      },
      writeReplay: (text) => {
        mkdirSync(dirname(replayPath), { recursive: true });
        writePrivate(replayPath, text);
      },
      openBrowser,
      waitForCode: (state) => waitForCallback({ ...target, expectedState: state, timeoutMs: 5 * 60_000 }),
      log: (line) => console.log(line),
    });
    console.log('Wrote data/replay.json (git-ignored). Restart Expo to load it.');
  } catch (err) {
    console.error(redact(err instanceof Error ? err.message : String(err), secrets));
    process.exitCode = 1;
  }
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : String(err));
  process.exitCode = 1;
});
