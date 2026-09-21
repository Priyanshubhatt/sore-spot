import { execFile } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { waitForCallback } from './whoop/callback';
import { callbackTarget, parseEnvFile, readWhoopEnv, redact } from './whoop/env';
import { runExport } from './whoop/run';
import { PRIVATE_FILES, assertGitIgnored, gitCheckIgnore } from './whoop/safety';

// One-time export of your own WHOOP history to data/replay.json. Run: npm run export-whoop
// It reads .env, signs you in through WHOOP in your browser, and never prints a secret or a token.

const DEFAULT_DAYS = 60;

function parseDays(argv: string[]): number {
  const i = argv.indexOf('--days');
  if (i === -1) return DEFAULT_DAYS;
  const n = Number(argv[i + 1]);
  if (!Number.isInteger(n) || n < 1 || n > 365) throw new Error('--days must be a whole number from 1 to 365.');
  return n;
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
  const env = readWhoopEnv(parseEnvFile(readFileSync(envPath, 'utf8')));
  assertGitIgnored(PRIVATE_FILES, gitCheckIgnore(root));

  const tokenPath = join(root, 'whoop.token.json');
  const replayPath = join(root, 'data', 'replay.json');
  const target = callbackTarget(env.redirectUri);
  const secrets = [env.clientSecret];

  try {
    await runExport({
      env,
      days,
      now: () => Date.now(),
      fetchFn: (url, init) => fetch(url, init),
      tokenFile: {
        read: () => (existsSync(tokenPath) ? readFileSync(tokenPath, 'utf8') : null),
        write: (text) => writeFileSync(tokenPath, text),
      },
      writeReplay: (text) => {
        mkdirSync(dirname(replayPath), { recursive: true });
        writeFileSync(replayPath, text);
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
