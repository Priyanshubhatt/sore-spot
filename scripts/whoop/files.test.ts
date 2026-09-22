import { mkdtempSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { writePrivate } from './files';

describe('writePrivate', () => {
  const withDir = (run: (dir: string) => void) => {
    const dir = mkdtempSync(join(tmpdir(), 'sore-spot-private-'));
    try {
      run(dir);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  };

  it('writes the text, replacing what was there', () => {
    withDir((dir) => {
      const path = join(dir, 'whoop.token.json');
      writePrivate(path, 'first');
      writePrivate(path, 'second');
      expect(readFileSync(path, 'utf8')).toBe('second');
    });
  });

  it.skipIf(process.platform === 'win32')('leaves the file readable only by its owner, even if it already existed with wider permissions', () => {
    withDir((dir) => {
      const path = join(dir, 'replay.json');
      writeFileSync(path, 'old', { mode: 0o644 });
      writePrivate(path, 'new');
      expect(statSync(path).mode & 0o777).toBe(0o600);
    });
  });
});
