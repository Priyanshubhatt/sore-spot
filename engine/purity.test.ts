import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const dir = __dirname;
const sources = readdirSync(dir)
  .filter((f) => f.endsWith('.ts') && !f.endsWith('.test.ts'))
  .map((f) => ({ file: f, text: readFileSync(join(dir, f), 'utf8') }));

describe('engine purity', () => {
  const banned = /(?:from\s*|import\s*\(?\s*|require\(\s*)['"](?:react(?:-[\w-]+)?|expo(?:-[\w-]+)?|@expo\/[\w-]+|@react-native\/[\w-]+)(?:\/[^'"]*)?['"]/;

  it('found engine source files to check', () => {
    expect(sources.length).toBeGreaterThanOrEqual(7);
  });

  it('imports nothing from React or Expo', () => {
    for (const s of sources) expect(s.text, s.file).not.toMatch(banned);
  });

  it('flags every React and Expo import form', () => {
    const shouldMatch = [
      "import x from 'react'",
      'import x from "expo-status-bar"',
      "import x from 'react-native-web'",
      "import x from 'react-dom'",
      "import x from '@expo/vector-icons'",
      "import x from 'expo/foo'",
      "import 'react'",
      "const m = await import('react')",
      "const r = require('react-native')",
    ];
    for (const line of shouldMatch) expect(banned.test(line), line).toBe(true);

    const shouldNotMatch = [
      "import x from './types'",
      "import x from './timecurve'",
      "import type { Muscle } from './types'",
      'const reactive = 1',
      "import x from 'node:fs'",
    ];
    for (const line of shouldNotMatch) expect(banned.test(line), line).toBe(false);
  });

  it('never reads the clock (asOf is always passed in)', () => {
    for (const s of sources) expect(s.text, s.file).not.toMatch(/Date\.now\(|new Date\(\)/);
  });
});
