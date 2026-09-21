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

describe('required lines stay wired into the plan screens', () => {
  it('shows the plan disclaimer with every plan, and the engine message for every blocked result', () => {
    expect(text('components/PlanResultView.tsx')).toMatch(/{PLAN_DISCLAIMER}/);
    expect(text('components/PlanResultView.tsx')).toMatch(/{result\.message}/);
  });

  it('frames the health screen with the engine prompt and asks every engine question', () => {
    const health = text('components/HealthQuestions.tsx');
    expect(health).toMatch(/{RED_FLAG_PROMPT}/);
    expect(health).toMatch(/accessibilityLabel={RED_FLAG_QUESTIONS\[flag\]}/);
    expect(health).toMatch(/\$\{RED_FLAG_QUESTIONS\[flag\]\}/); // the visible text, not only the label
    expect(health).toMatch(/question={UNDER_18_QUESTION}/);
    expect(health).toMatch(/question={MEDICAL_CONDITION_QUESTION}/);
  });

  it('starts every health answer unanswered and never pre-answers one', () => {
    expect(text('PlanScreen.tsx')).toMatch(/useState<Screening>\(initialScreening\)/);
    for (const rel of ['PlanScreen.tsx', 'components/HealthQuestions.tsx']) {
      expect(text(rel), rel).not.toMatch(/under18:\s*false|medicalCondition:\s*false|redFlags:\s*\[\]/);
    }
  });

  it('keeps Build my plan disabled until every health question is answered', () => {
    expect(text('PlanScreen.tsx')).toMatch(/disabled={!isAnswered\(screening\)}/);
  });

  it('asks every red flag, shows the disclaimer only with a plan and the message only when blocked', () => {
    expect(text('components/HealthQuestions.tsx')).toMatch(/RED_FLAGS\.map\(/);
    const view = text('components/PlanResultView.tsx');
    const planBranch = view.indexOf('const { plan } = result');
    expect(planBranch).toBeGreaterThan(-1);
    expect(view.indexOf('{result.message}')).toBeLessThan(planBranch);
    expect(view.indexOf('{PLAN_DISCLAIMER}')).toBeGreaterThan(planBranch);
  });

  it('derives the plan on every render, so a later tag or check-in can never leave a stale plan on screen', () => {
    const screen = text('PlanScreen.tsx');
    expect(screen).toMatch(/const result = built\s*\?/);
    expect(screen).not.toMatch(/useState<[^>]*PlanResult/);
  });

  it('runs the plan through the engine guardrails, never around them', () => {
    expect(text('planFlow.ts')).toMatch(/planOrGuardrail\(/);
    for (const f of files) expect(f.text, f.rel).not.toMatch(/buildPlan/);
  });

  it('keeps the synthetic banner and the disclaimer in the shell, outside the tabs', () => {
    const shell = readFileSync(join(__dirname, '..', 'App.tsx'), 'utf8');
    expect(shell).toMatch(/{SYNTHETIC_BANNER}/);
    expect(shell).toMatch(/{DISCLAIMER}/);
    expect(shell).toMatch(/<TabBar /);
    // Both tabs stay mounted so switching does not lose the day, side or answers.
    expect(shell).toMatch(/<BodyMapScreen spot={spot} \/>/);
    expect(shell).toMatch(/<PlanScreen spot={spot} \/>/);
    expect(shell).toMatch(/tab !== 'body' && styles\.hidden/);
    expect(shell).toMatch(/tab !== 'plan' && styles\.hidden/);
    expect(shell).toMatch(/<EvidenceScreen \/>/);
    expect(shell).toMatch(/tab !== 'evidence' && styles\.hidden/);
    expect(shell).toMatch(/hidden: { display: 'none' }/);
    expect(shell).not.toMatch(BANNED);
    expect(shell).not.toMatch(/buildPlan/);
  });
});

describe('the evidence tab and the accessibility state stay wired', () => {
  it('draws the engine curve, not a hand-drawn one', () => {
    expect(text('components/TimeCurveChart.tsx')).toMatch(/curveSeries\(\)/);
    expect(text('evidence.ts')).toMatch(/timecurve\(hours\)/);
  });

  it('shows every text card, the label lines, the limits card and the footnote on the evidence screen', () => {
    const screen = text('EvidenceScreen.tsx');
    expect(screen).toMatch(/TEXT_CARDS\.map\(/);
    expect(screen).toMatch(/LABEL_LINES\.map\(/);
    expect(screen).toMatch(/{LIMITS_HEADING}/);
    expect(screen).toMatch(/LIMITS\.map\(/);
    expect(screen).toMatch(/{EVIDENCE_FOOTNOTE}/);
    expect(screen).toMatch(/<TimeCurveChart /);
  });

  it('reports selected and checked with aria props, because react-native-web ignores accessibilityState for them', () => {
    for (const f of files) expect(f.text, f.rel).not.toMatch(/accessibilityState=\{\{\s*(selected|checked)/);
    expect(text('components/TabBar.tsx')).toMatch(/aria-selected={tab === t}/);
    expect(text('components/TabBar.tsx')).toMatch(/accessibilityRole="tab"/);
    expect(text('components/ChipRow.tsx')).toMatch(/aria-checked={on}/);
    expect(text('components/HealthQuestions.tsx')).toMatch(/aria-checked={none}/);
    expect(text('components/HealthQuestions.tsx')).toMatch(/aria-checked={value === answer}/);
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
