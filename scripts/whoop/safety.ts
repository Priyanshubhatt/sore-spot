import { execFileSync } from 'node:child_process';

/** Everything this script creates or reads that must never reach git. */
export const PRIVATE_FILES = ['.env', 'data/replay.json', 'whoop.token.json'] as const;

export function findUnignored(paths: readonly string[], isIgnored: (path: string) => boolean): string[] {
  return paths.filter((p) => !isIgnored(p));
}

/** Refuses to go on unless every private file is git-ignored, so a secret or health data cannot be committed by accident. */
export function assertGitIgnored(paths: readonly string[], isIgnored: (path: string) => boolean): void {
  const missing = findUnignored(paths, isIgnored);
  if (missing.length > 0) {
    throw new Error(
      `Refusing to run: not git-ignored: ${missing.join(', ')}. Add each to .gitignore first, so it can never be committed.`,
    );
  }
}

/** Asks git itself. Any doubt (git missing, not a repository) counts as "not ignored", so the script stops. */
export function gitCheckIgnore(cwd: string): (path: string) => boolean {
  return (path) => {
    try {
      execFileSync('git', ['check-ignore', '-q', '--', path], { cwd, stdio: 'ignore' });
      return true;
    } catch {
      return false;
    }
  };
}
