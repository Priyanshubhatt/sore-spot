import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { syntheticReplay } from '../data/replay.synthetic';
import { DEMO_AS_OF } from './config';
import { CHECKIN_LABELS } from './copy';
import { buildForecastState } from './forecastState';
import { DEFAULT_CHOICE, computePlan } from './planFlow';
import { TAB_LABELS } from './planCopy';
import { answerMedicalCondition, answerNoRedFlags, answerUnder18, initialScreening } from './screening';

const read = (rel: string) => readFileSync(join(__dirname, '..', rel), 'utf8').replace(/\r\n/g, '\n');
const readme = read('README.md');
const demo = read('docs/DEMO.md');

const BANNED = /diagnos|accura|clinical|prevent|cure|validated|treat|boost|oxygen|blood flow/i;
const SORENESS_CLAIM = /(reduce|relieve) soreness/i;
const NEGATED = /(not|n't) been shown/i;

// The "say this, not that" table quotes the banned claims on purpose, so it is the one part left out of the scan.
const DO_NOT_SAY = /## Say this, not that[\s\S]*?(?=\n## )/;
const demoScanned = demo.replace(DO_NOT_SAY, '');

describe('README', () => {
  it('says what it is and what it is not, on its first lines', () => {
    const top = readme.split('\n').slice(0, 5).join(' ');
    expect(top).toMatch(/independent prototype/);
    expect(top).toMatch(/not affiliated with, endorsed by, or sponsored by WHOOP/);
    expect(top).toMatch(/not medical advice/);
  });

  it('labels the demo data as synthetic and owns up to the limits', () => {
    expect(readme).toMatch(/SYNTHETIC DATA/);
    expect(readme).toMatch(/have not been checked against real soreness logs/);
    expect(readme).toMatch(/still need review by a trainer or physical therapist/);
    expect(readme).toMatch(/primary papers are still being checked/);
  });

  it('keeps real data and credentials out of the repository', () => {
    expect(readme).toMatch(/data\/replay\.json/);
    expect(readme).toMatch(/\.env/);
    expect(readme).toMatch(/never commit real health data or WHOOP credentials/i);
  });

  it('names the three tabs', () => {
    for (const label of Object.values(TAB_LABELS)) expect(readme, label).toContain(`**${label}**`);
  });
});

describe('demo runbook', () => {
  it('covers the fallback ladder and every tab', () => {
    for (const step of ['Primary', 'Fallback 1', 'Fallback 2', 'Always']) expect(demo, step).toContain(step);
    for (const label of Object.values(TAB_LABELS)) expect(demo, label).toContain(label);
  });

  it('tells the presenter to say it is synthetic and independent', () => {
    expect(demo).toMatch(/independent prototype on synthetic data/);
    expect(demo).toMatch(/not affiliated with WHOOP/);
  });

  it('quotes the check-in labels the app really shows', () => {
    for (const label of Object.values(CHECKIN_LABELS)) expect(demo, label).toContain(`**${label}**`);
  });

  it('matches what the engine really produces on the demo data', () => {
    expect(demo).toContain('Sat Sep 19 2026, 20:00 UTC');
    expect(DEMO_AS_OF.toISOString()).toBe('2026-09-19T20:00:00.000Z');

    const answered = answerMedicalCondition(answerUnder18(answerNoRedFlags(initialScreening()), false), false);
    const planFor = (tags: Record<string, 'upper' | 'lower'>) => {
      const s = buildForecastState(syntheticReplay.workouts, tags, {}, DEMO_AS_OF);
      const r = computePlan({ forecast: s.forecast, workouts: s.tagged, recovery: syntheticReplay.recovery ?? [], asOf: DEMO_AS_OF, screening: answered, choice: DEFAULT_CHOICE });
      if (r.kind !== 'plan') throw new Error('expected a plan');
      return { plan: r.plan, state: s };
    };

    // Now: glutes, quads, hamstrings and calves are High, and nothing else is.
    const now = planFor({}).state.forecast.byDay[0];
    const high = Object.entries(now).filter(([, m]) => m.band === 'high').map(([k]) => k).sort();
    expect(high).toEqual(['calves', 'glutes', 'hamstrings', 'quads']);
    expect(demo).toMatch(/glutes, quads, hamstrings and calves are \*\*High\*\*/);

    // Tagging Wednesday "Upper body": Sunday's upper day gets fewer sets, for the muscles the runbook names.
    const upper = planFor({ 'd-wed-strength': 'upper' }).plan;
    expect(upper.days.map((d) => d.title)).toEqual(['Upper body', 'Easy day', 'Rest day', 'Upper body', 'Lower body', 'Rest day', 'Rest day']);
    expect(upper.days[0].exercises[0].note).toBe('Fewer sets: chest, triceps and shoulders predicted sore.');
    expect(demo).toContain('fewer sets: chest, triceps and shoulders predicted sore');

    // Tagging it "Lower body" instead: Sunday goes back to "new for you".
    const lower = planFor({ 'd-wed-strength': 'lower' }).plan;
    expect(lower.days[0].exercises[0].note).toBe('New for you: start light.');
    expect(demo).toContain('new for you, start light');

    // Thursday: back squat at fewer sets, a hip thrust and a reverse lunge, each easing off the sore muscles.
    const thursday = upper.days[4].exercises.map((e) => e.name);
    expect(thursday).toEqual(expect.arrayContaining(['Barbell back squat', 'Barbell hip thrust', 'Reverse lunge']));
    expect(demo).toMatch(/back squat at fewer sets, a hip thrust and a reverse lunge/);
  });
});

describe('honesty scan over the docs', () => {
  it('has the do-not-say table (so the scan below is skipping something real)', () => {
    expect(DO_NOT_SAY.test(demo)).toBe(true);
  });

  it('uses no banned word in the README or the runbook, outside the do-not-say table', () => {
    expect(readme).not.toMatch(BANNED);
    expect(demoScanned).not.toMatch(BANNED);
  });

  it('only mentions reducing or relieving soreness in a line that says it has not been shown', () => {
    for (const [name, doc] of [['README.md', readme], ['docs/DEMO.md', demoScanned]] as const) {
      for (const line of doc.split('\n')) {
        if (SORENESS_CLAIM.test(line)) expect(line, `${name}: ${line.trim()}`).toMatch(NEGATED);
      }
    }
  });
});
