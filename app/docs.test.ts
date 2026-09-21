import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { syntheticReplay } from '../data/replay.synthetic';
import { MUSCLES, RED_FLAG_QUESTIONS, UNDER_18_QUESTION, type Muscle } from '../engine';
import { HISTORY_INCOMPLETE_NOTE } from '../engine/planText';
import { DEMO_AS_OF } from './config';
import { CHECKIN_LABELS, SAVE_STRETCHING_TEXT } from './copy';
import { buildForecastState } from './forecastState';
import { recommend } from './mobility/recommend';
import { BUILD_PLAN, CHANGE_ANSWERS, NONE_OF_THESE, PLAN_SKIP_TAGS, TAB_LABELS } from './planCopy';
import { DEFAULT_CHOICE, GOAL_OPTIONS, computePlan } from './planFlow';
import { answerMedicalCondition, answerNoRedFlags, answerUnder18, initialScreening } from './screening';
import { REQUIRED_VARS } from '../scripts/whoop/env';
import { SCOPES } from '../scripts/whoop/http';

const read = (rel: string) => readFileSync(join(__dirname, '..', rel), 'utf8').replace(/\r\n/g, '\n');
const readme = read('README.md');
const demo = read('docs/DEMO.md');

const BANNED = /diagnos|accura|clinical|prevent|cure|validated|treat|boost|oxygen|blood flow/i;
const SORENESS_CLAIM = /(reduc(e|es|ed|ing)|relie(ve|ves|ved|ving)|eas(e|es|ed|ing)) (the |your )?soreness/i;
const NEGATED = /(not|n't) been shown to (reduce|relieve|ease) soreness/i;

// The "say this, not that" table quotes the banned claims on purpose, so it is the one part left out of the scan.
const DO_NOT_SAY = /## Say this, not that[\s\S]*?(?=\n## )/;
const demoScanned = demo.replace(DO_NOT_SAY, '');

const FOUR: Muscle[] = ['calves', 'glutes', 'hamstrings', 'quads'];
const answered = answerMedicalCondition(answerUnder18(answerNoRedFlags(initialScreening()), false), false);

const stateOf = (tags: Record<string, 'upper' | 'lower'> = {}) =>
  buildForecastState(syntheticReplay.workouts, tags, {}, DEMO_AS_OF);
const planFor = (tags: Record<string, 'upper' | 'lower'> = {}) => {
  const s = stateOf(tags);
  const r = computePlan({ forecast: s.forecast, workouts: s.tagged, recovery: syntheticReplay.recovery ?? [], asOf: DEMO_AS_OF, screening: answered, choice: DEFAULT_CHOICE });
  if (r.kind !== 'plan') throw new Error('expected a plan');
  return r.plan;
};
const bandsOn = (day: number) => stateOf().forecast.byDay[day];
const inBand = (day: number, band: string) => MUSCLES.filter((m) => bandsOn(day)[m].band === band).sort();

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

  it('keeps real data and credentials out of the repository, and the .gitignore really does', () => {
    expect(readme).toMatch(/data\/replay\.json/);
    expect(readme).toMatch(/\.env/);
    expect(readme).toMatch(/never commit real health data or WHOOP credentials/i);
    const ignore = read('.gitignore').split('\n').map((l) => l.trim());
    for (const entry of ['.env', 'data/replay.json', '*.token.json']) expect(ignore, entry).toContain(entry);
  });

  it('names the three tabs', () => {
    for (const label of Object.values(TAB_LABELS)) expect(readme, label).toContain(`**${label}**`);
  });

  it('does not call the plan safe or the comfort ideas honest: it says what they rest on', () => {
    expect(readme).not.toMatch(/\bsafe\b/i);
    expect(readme).not.toMatch(/\bhonest comfort/i);
    expect(readme).toMatch(/labelled by how strong the evidence is/);
  });
});

describe('the README section on using your own WHOOP data', () => {
  it('names the three variables the script reads, the redirect URL and the npm command that exists', () => {
    for (const name of REQUIRED_VARS) expect(readme, name).toContain(name);
    expect(readme).toContain('http://localhost:3000/callback');
    expect(readme).toContain('npm run export-whoop');
    const pkg = JSON.parse(read('package.json'));
    expect(pkg.scripts['export-whoop']).toContain('export-whoop.ts');
  });

  it('says which permissions are asked for, and that the script refuses to run unless the private files are git-ignored', () => {
    expect(readme).toMatch(/only for the workout and recovery read permissions/);
    expect([...SCOPES]).toEqual(['read:workout', 'read:recovery', 'offline']);
    expect(readme).toMatch(/refuses to run unless `\.env`, `data\/replay\.json` and `whoop\.token\.json` are all git-ignored/);
    expect(readme).toMatch(/never prints a secret or a token/);
  });

  it('warns to use a private network rather than a public tunnel with real data', () => {
    expect(readme).toMatch(/rather than a public tunnel/);
  });

  it('tells the presenter the runbook numbers are those of the synthetic week', () => {
    expect(demo).toMatch(/describes the synthetic week/);
    expect(demo).toMatch(/redact anything personal/);
  });
});

describe('the files the README points at', () => {
  it('ships the MIT licence and the privacy policy it names', () => {
    expect(readme).toMatch(/MIT\. See `LICENSE`/);
    expect(read('LICENSE')).toMatch(/^MIT License/);
    expect(read('PRIVACY.md')).toMatch(/not affiliated with, endorsed by, or sponsored by WHOOP/);
  });
});

describe('demo runbook: structure', () => {
  it('covers the fallback ladder and every tab by name', () => {
    for (const step of ['Primary', 'Fallback 1', 'Fallback 2', 'Always']) expect(demo, step).toContain(step);
    for (const label of Object.values(TAB_LABELS)) expect(demo, label).toContain(`**${label}**`);
  });

  it('tells the presenter to say it is synthetic and independent', () => {
    expect(demo).toMatch(/independent prototype on synthetic data/);
    expect(demo).toMatch(/not affiliated with WHOOP/);
  });

  it('never calls the model a follower of the published time course: the curve is hand-tuned to its shape', () => {
    expect(demo).not.toMatch(/follows the published/);
    expect(demo).toMatch(/hand-tuned to the published shape of soreness over time/);
  });

  it('names the controls the presenter taps by the labels the app shows', () => {
    for (const label of Object.values(CHECKIN_LABELS)) expect(demo, label).toContain(`**${label}**`);
    for (const label of [BUILD_PLAN, CHANGE_ANSWERS, NONE_OF_THESE, PLAN_SKIP_TAGS]) expect(demo, label).toContain(`**${label}**`);
    expect(demo).toContain(`**${RED_FLAG_QUESTIONS['sharp-pain'].split(',')[0]}**`);
    expect(demo).toContain(`**${UNDER_18_QUESTION}**`);
    expect(demo).toContain(`**${GOAL_OPTIONS.find((o) => o.value === 'lose-weight')!.label}**`);
    expect(demo).toContain('**6**');
  });
});

describe('demo runbook: facts match the engine and the app', () => {
  it('quotes the forecast time the way the app shows it', () => {
    const shown = `${DEMO_AS_OF.toISOString().slice(0, 16).replace('T', ' ')} UTC`;
    expect(shown).toBe('2026-09-19 20:00 UTC');
    expect(demo).toContain(shown);
  });

  it('gets the scrubber right: High through +3d, easing from +4d, gone by +6d', () => {
    for (const d of [0, 1, 2, 3]) expect(inBand(d, 'high'), `+${d}d`).toEqual(FOUR);
    expect(inBand(4, 'high')).toEqual(['quads']);
    expect(inBand(4, 'moderate')).toEqual(['adductors', 'calves', 'glutes', 'hamstrings']);
    expect(inBand(5, 'high')).toEqual([]);
    expect(inBand(5, 'moderate')).toEqual(FOUR);
    for (const d of [6, 7]) expect([...inBand(d, 'high'), ...inBand(d, 'moderate')], `+${d}d`).toEqual([]);
    expect(demo).toMatch(/glutes, quads, hamstrings and calves are \*\*High\*\*/);
    expect(demo).toMatch(/High through \*\*\+3d\*\*, ease to Moderate from \*\*\+4d\*\* \(the quads a day later, at \*\*\+5d\*\*\), and are gone by \*\*\+6d\*\*/);
  });

  it('gets the comfort ideas and the range-of-motion stretch right', () => {
    const high = recommend('quads', 'high');
    expect(high.rom).toEqual([]);
    expect(high.note).toBe('save-stretching');
    for (const move of high.comfort) expect(demo, move.name).toContain(move.name);
    expect(demo).toContain(SAVE_STRETCHING_TEXT.replace('Save', 'save').replace('.', ''));

    const moderateChest = recommend('chest', 'low', 2);
    expect(moderateChest.band).toBe('moderate');
    expect(moderateChest.rom.map((m) => m.name)).toEqual(['Doorway chest stretch']);
    expect(moderateChest.comfort.length).toBeGreaterThan(0);
    expect(demo).toContain('Doorway chest stretch');
    expect(bandsOn(0).chest.band).toBe('low');
  });

  it('gets the plan and its reaction to tagging right', () => {
    const untagged = planFor();
    expect(untagged.notes).toContain(HISTORY_INCOMPLETE_NOTE);
    expect(untagged.days.map((d) => d.title)).toEqual(['Upper body', 'Easy day', 'Rest day', 'Upper body', 'Lower body', 'Rest day', 'Rest day']);
    const newForYou = untagged.days[0].exercises[0].note!;
    expect(newForYou).toMatch(/^New for you/);
    expect(untagged.days[1].kind).toBe('easy');
    // One literal, checked against both the engine and the runbook, so neither can drift without this test failing.
    const sore = 'quads, glutes, hamstrings and calves predicted sore';
    expect(untagged.days[1].why[0]).toContain(sore);
    expect(demo).toContain(sore);

    const upper = planFor({ 'd-wed-strength': 'upper' });
    expect(upper.notes).not.toContain(HISTORY_INCOMPLETE_NOTE);
    const fewerSets = upper.days[0].exercises[0].note!;
    expect(fewerSets).toMatch(/^Fewer sets: chest, triceps and shoulders/);
    expect(upper.days[0].exercises[0].sets).toBe(untagged.days[0].exercises[0].sets);

    const thursday = upper.days[4].exercises.map((e) => e.name);
    expect(thursday).toEqual(expect.arrayContaining(['Barbell back squat', 'Barbell hip thrust', 'Reverse lunge']));

    expect(demo).toContain('a note that some workouts are not counted');
    // The runbook quotes the app's own notes, minus the full stop.
    expect(demo).toContain(`*${newForYou.replace(/\.$/, '')}*`);
    expect(demo).toContain(`*${fewerSets.replace(/\.$/, '')}*`);
    expect(demo).toMatch(/back squat at fewer sets, a hip thrust and a reverse lunge/);
    expect(demo).toContain('the not-counted note is gone');
    // Tags cannot be changed once given, so the runbook must not tell the presenter to re-tag.
    expect(demo).not.toMatch(/tag the session \*\*Lower body\*\* instead/i);
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

  it('only mentions reducing, relieving or easing soreness in a line that says it has not been shown', () => {
    for (const [name, doc] of [['README.md', readme], ['docs/DEMO.md', demoScanned]] as const) {
      for (const line of doc.split('\n')) {
        if (SORENESS_CLAIM.test(line)) expect(line, `${name}: ${line.trim()}`).toMatch(NEGATED);
      }
    }
  });

  it('catches every inflection of the claim, and only excuses a line that says it has not been shown', () => {
    for (const bad of ['Stretching reduces soreness.', 'It relieves soreness fast.', 'Foam rolling eases soreness.', 'to ease your soreness']) {
      expect(SORENESS_CLAIM.test(bad), bad).toBe(true);
      expect(NEGATED.test(bad), bad).toBe(false);
    }
    expect(NEGATED.test("Stretching hasn't been shown to reduce soreness.")).toBe(true);
    expect(SORENESS_CLAIM.test('Save stretching for when soreness eases.')).toBe(false);
  });
});
