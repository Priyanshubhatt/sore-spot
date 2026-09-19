import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const dir = __dirname;
const sources = readdirSync(dir)
  .filter((f) => f.endsWith('.ts') && !f.endsWith('.test.ts'))
  .map((f) => ({ file: f, text: readFileSync(join(dir, f), 'utf8') }));

describe('engine purity', () => {
  it('found engine source files to check', () => {
    expect(sources.length).toBeGreaterThanOrEqual(7);
  });

  it('imports nothing from React or Expo', () => {
    const banned = /(from\s+|require\()\s*['"](react|react-native|expo)([/'"])/;
    for (const s of sources) expect(s.text, s.file).not.toMatch(banned);
  });

  it('never reads the clock (asOf is always passed in)', () => {
    for (const s of sources) expect(s.text, s.file).not.toMatch(/Date\.now\(|new Date\(\)/);
  });
});
