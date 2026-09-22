import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

// The command-line script is a thin shell over tested parts. These checks pin the wiring that keeps a
// secret or health data from leaking, which the unit tests of the parts cannot see.
const scriptsDir = join(__dirname, '..');
const cli = readFileSync(join(scriptsDir, 'export-whoop.ts'), 'utf8');
const sources = [
  { rel: 'export-whoop.ts', text: cli },
  ...readdirSync(__dirname)
    .filter((f) => f.endsWith('.ts') && !f.endsWith('.test.ts') && f !== 'fakes.ts')
    .map((f) => ({ rel: `whoop/${f}`, text: readFileSync(join(__dirname, f), 'utf8') })),
];

describe('the export command', () => {
  it('checks that every private file is git-ignored before it reads a credential or calls WHOOP', () => {
    const guard = cli.indexOf('assertGitIgnored(PRIVATE_FILES, gitCheckIgnore(root))');
    expect(guard).toBeGreaterThan(-1);
    expect(guard).toBeLessThan(cli.indexOf('runExport('));
    // Before the credentials file is even read or parsed.
    expect(guard).toBeLessThan(cli.indexOf('readFileSync(envPath'));
    expect(guard).toBeLessThan(cli.indexOf('readWhoopEnv('));
    // The guard runs before any network call, and the only network call is inside runExport.
    expect(cli).not.toMatch(/fetch\(\s*['"`]http/);
  });

  it('never follows a redirect and never waits forever, so a request body cannot be replayed elsewhere or hang', () => {
    expect(cli).toContain("redirect: 'error'");
    expect(cli).toContain('signal: AbortSignal.timeout(30_000)');
  });

  it('scrubs the client secret from any error before printing it', () => {
    expect(cli).toMatch(/console\.error\(redact\(err instanceof Error \? err\.message : String\(err\), secrets\)\)/);
    expect(cli).toMatch(/const secrets = \[env\.clientSecret\]/);
  });

  it('writes only the two private files it is allowed to, and only under the git-ignored names', () => {
    expect(cli).toContain("join(root, 'whoop.token.json')");
    expect(cli).toContain("join(root, 'data', 'replay.json')");
    const writes = cli.match(/writePrivate\(([^,]+),/g) ?? [];
    expect(writes.map((w) => w.replace(/writePrivate\(|,/g, ''))).toEqual(['tokenPath', 'replayPath']);
    // Nothing writes a private file any other way.
    expect(cli).not.toMatch(/writeFileSync|createWriteStream|appendFileSync/);
  });

  it('is reachable as `npm run export-whoop`, and the runner is a dev dependency', () => {
    const pkg = JSON.parse(readFileSync(join(scriptsDir, '..', 'package.json'), 'utf8'));
    expect(pkg.scripts['export-whoop']).toBe('tsx scripts/export-whoop.ts');
    expect(pkg.devDependencies.tsx).toBeTruthy();
    expect(pkg.dependencies?.tsx).toBeUndefined();
  });
});

describe('what the scripts never do', () => {
  it('never print a secret, a token or a code', () => {
    for (const { rel, text } of sources) {
      for (const line of text.split('\n')) {
        if (/\b(log|console\.(log|error|warn|info))\(/.test(line)) {
          expect(line, `${rel}: ${line.trim()}`).not.toMatch(/clientSecret|access_token|refresh_token|\bcode\b\s*[,)]|accessToken/);
        }
      }
    }
  });

  it('never ask for profile access', () => {
    for (const { rel, text } of sources) expect(text, rel).not.toMatch(/read:profile|read:body_measurement|read:sleep|read:cycles/);
  });

  it('use only WHOOP endpoints over https', () => {
    for (const { rel, text } of sources) {
      for (const url of text.match(/https?:\/\/[^\s'"`)]+/g) ?? []) {
        if (rel.endsWith('env.ts') || url.startsWith('http://localhost') || url.startsWith('http://127.0.0.1')) continue;
        expect(url, `${rel}: ${url}`).toMatch(/^https:\/\/api\.prod\.whoop\.com\//);
      }
    }
  });
});

describe('the export command line', () => {
  it('reads its arguments with the shared parser, so a stray or mistyped argument stops it', () => {
    expect(cli).toContain("import { parseDays } from './whoop/args'");
    expect(cli).toContain('parseDays(process.argv.slice(2))');
  });

  it('turns a dropped connection, a timeout or a refused redirect into a sentence, not "fetch failed"', () => {
    expect(cli).toContain("import { explainNetworkError } from './whoop/network'");
    expect(cli).toContain('throw explainNetworkError(err);');
  });
});
