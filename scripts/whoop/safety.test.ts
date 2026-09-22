import { execFileSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { PRIVATE_FILES, assertGitIgnored, findUnignored, gitCheckIgnore } from './safety';

describe('the private files', () => {
  it('are the secrets file, the health data and the token file', () => {
    expect([...PRIVATE_FILES]).toEqual(['.env', 'data/replay.json', 'whoop.token.json']);
  });
});

describe('assertGitIgnored', () => {
  it('lets a run go ahead only when every private file is ignored', () => {
    expect(() => assertGitIgnored(PRIVATE_FILES, () => true)).not.toThrow();
  });

  it('names each file that is not ignored, and says how to fix it', () => {
    const ignored = new Set(['.env']);
    expect(findUnignored(PRIVATE_FILES, (p) => ignored.has(p))).toEqual(['data/replay.json', 'whoop.token.json']);
    expect(() => assertGitIgnored(PRIVATE_FILES, (p) => ignored.has(p))).toThrow(/data\/replay\.json, whoop\.token\.json.*\.gitignore/);
  });
});

describe('gitCheckIgnore, asked of a real git repository', () => {
  const git = (cwd: string, ...args: string[]) => execFileSync('git', args, { cwd, stdio: 'ignore' });

  it('says yes for ignored paths, no for others, and no when it is not a repository at all', () => {
    const repo = mkdtempSync(join(tmpdir(), 'sore-spot-git-'));
    const notRepo = mkdtempSync(join(tmpdir(), 'sore-spot-plain-'));
    try {
      git(repo, 'init', '-q');
      writeFileSync(join(repo, '.gitignore'), '.env\ndata/replay.json\n*.token.json\n');
      const ignored = gitCheckIgnore(repo);
      for (const p of PRIVATE_FILES) expect(ignored(p), p).toBe(true);
      expect(ignored('App.tsx')).toBe(false);
      expect(ignored('data/replay.synthetic.ts')).toBe(false);
      expect(gitCheckIgnore(notRepo)('.env')).toBe(false);
    } finally {
      rmSync(repo, { recursive: true, force: true });
      rmSync(notRepo, { recursive: true, force: true });
    }
  });

  it('stops a run in a repository whose .gitignore is missing an entry', () => {
    const repo = mkdtempSync(join(tmpdir(), 'sore-spot-git-'));
    try {
      git(repo, 'init', '-q');
      writeFileSync(join(repo, '.gitignore'), '.env\n');
      expect(() => assertGitIgnored(PRIVATE_FILES, gitCheckIgnore(repo))).toThrow(/data\/replay\.json/);
    } finally {
      rmSync(repo, { recursive: true, force: true });
    }
  });
});
