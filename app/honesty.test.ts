import { readdirSync, readFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { describe, expect, it } from 'vitest';

// Scans every non-test source file under app/, so text added to a component later is covered too.
const BANNED = /diagnos|accura|clinical|prevent|cure|validated|treat|boost|oxygen|blood flow/i;
const SORENESS_CLAIM = /(reduce|relieve) soreness/i;
const NEGATED = /(not|n't) been shown/i;

function sourceFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) return sourceFiles(full);
    return /\.(ts|tsx)$/.test(entry.name) && !/\.test\.(ts|tsx)$/.test(entry.name) ? [full] : [];
  });
}

const files = sourceFiles(__dirname).map((f) => ({
  rel: relative(__dirname, f).replace(/\\/g, '/'),
  text: readFileSync(f, 'utf8'),
}));

const text = (rel: string) => files.find((f) => f.rel === rel)?.text ?? '';

describe('required lines stay wired into the sheet', () => {
  it('shows the clinician safety line in the sheet itself, outside the scrolling move list', () => {
    expect(text('components/MuscleSheet.tsx')).toMatch(/{SAFETY_LINE}/);
    expect(text('components/MoveList.tsx')).not.toMatch(/SAFETY_LINE/);
  });

  it('shows the stretching honesty line and the ease-off cue in the move list', () => {
    expect(text('components/MoveList.tsx')).toMatch(/{STRETCH_HONESTY}/);
    expect(text('components/MoveList.tsx')).toMatch(/{MOVE_CUE}/);
  });
});

describe('honesty scan over the app source', () => {
  it('found the app source files', () => {
    expect(files.length).toBeGreaterThanOrEqual(12);
    expect(files.map((f) => f.rel)).toEqual(expect.arrayContaining(['copy.ts', 'BodyMapScreen.tsx']));
  });

  it('never uses a banned word in any source file', () => {
    for (const f of files) expect(f.text, f.rel).not.toMatch(BANNED);
  });

  it('only mentions reducing or relieving soreness in a line that says it has not been shown', () => {
    for (const f of files) {
      for (const line of f.text.split('\n')) {
        if (SORENESS_CLAIM.test(line)) expect(line, `${f.rel}: ${line.trim()}`).toMatch(NEGATED);
      }
    }
  });
});
