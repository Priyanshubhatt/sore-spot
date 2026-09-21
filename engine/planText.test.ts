import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { EXERCISES } from './exercises';
import {
  EASY_RECOVERY_WHY,
  LIGHTER_WEEK_NOTE,
  MUSCLE_NAMES,
  easyDaySoreWhy,
  listMuscles,
  rampNote,
  swapWhy,
} from './planText';
import { MUSCLES } from './types';

// Every user-facing plan and guardrail string lives in these files. Scan them the way the app source is scanned.
const BANNED = /diagnos|accura|clinical|prevent|cure|validated|treat|boost|oxygen|blood flow/i;
const SORENESS_CLAIM = /(reduce|relieve) soreness/i;
const NEGATED = /(not|n't) been shown/i;
const FILES = ['planText.ts', 'guardrails.ts', 'plan.ts', 'exercises.ts', 'recovery.ts'];

const sources = FILES.map((f) => ({ f, text: readFileSync(join(__dirname, f), 'utf8') }));

describe('plan text honesty scan', () => {
  it('reads all the plan engine source files', () => {
    for (const s of sources) expect(s.text.length, s.f).toBeGreaterThan(200);
  });

  it('never uses a banned word', () => {
    for (const s of sources) expect(s.text, s.f).not.toMatch(BANNED);
  });

  it('only mentions reducing or relieving soreness in a line that says it has not been shown', () => {
    for (const s of sources) {
      for (const line of s.text.split('\n')) {
        if (SORENESS_CLAIM.test(line)) expect(line, `${s.f}: ${line.trim()}`).toMatch(NEGATED);
      }
    }
  });

  it('keeps exercise names free of claims too', () => {
    for (const e of EXERCISES) expect(e.name, e.id).not.toMatch(BANNED);
  });
});

describe('plan text helpers', () => {
  it('names every muscle', () => {
    for (const m of MUSCLES) expect(MUSCLE_NAMES[m].length, m).toBeGreaterThan(0);
  });

  it('lists muscles in plain words', () => {
    expect(listMuscles([])).toBe('');
    expect(listMuscles(['quads'])).toBe('quads');
    expect(listMuscles(['quads', 'glutes'])).toBe('quads and glutes');
    expect(listMuscles(['quads', 'glutes', 'adductors'])).toBe('quads, glutes and inner thighs');
  });

  it('words swaps, easy days and notes without advice or claims', () => {
    expect(swapWhy('lower', 'upper', ['quads', 'glutes'])).toBe(
      'Swapped Lower body for Upper body: quads and glutes predicted sore that day.',
    );
    expect(easyDaySoreWhy(['calves'])).toBe(
      'Easy day: calves predicted sore, so this day is for gentle movement instead of training.',
    );
    expect(rampNote(3, 5)).toMatch(/3 training days instead of 5/);
    expect(EASY_RECOVERY_WHY).toMatch(/latest recovery was low/);
    expect(LIGHTER_WEEK_NOTE).toMatch(/one set fewer/);
  });
});
