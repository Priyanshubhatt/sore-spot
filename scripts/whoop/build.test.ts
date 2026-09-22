import { describe, expect, it } from 'vitest';
import { syntheticReplay } from '../../data/replay.synthetic';
import { parseReplay } from '../../engine/replay';
import { buildReplay, formatSummary, screenRecords, summarize } from './build';

const EXPORTED_AT = new Date('2026-09-22T08:00:00Z');
const workouts = syntheticReplay.workouts as unknown[];
const recovery = (syntheticReplay.recovery ?? []) as unknown[];

describe('buildReplay', () => {
  it('produces a real (not synthetic) replay stamped with the export time, that the app accepts', () => {
    const replay = buildReplay({ workouts, recovery, exportedAt: EXPORTED_AT });
    expect(replay.synthetic).toBe(false);
    expect(replay.asOf).toBe('2026-09-22T08:00:00.000Z');
    expect(replay.workouts).toHaveLength(workouts.length);
    expect(() => parseReplay(JSON.parse(JSON.stringify(replay)))).not.toThrow();
  });

  it('sorts workouts by start and recovery by creation, whatever order the API gave', () => {
    const replay = buildReplay({ workouts: [...workouts].reverse(), recovery: [...recovery].reverse(), exportedAt: EXPORTED_AT });
    const starts = replay.workouts.map((w) => Date.parse(w.start));
    expect(starts).toEqual([...starts].sort((a, b) => a - b));
    const created = (replay.recovery ?? []).map((r) => Date.parse(r.created_at));
    expect(created).toEqual([...created].sort((a, b) => a - b));
  });

  it('drops a record repeated across a page boundary, keeping the first', () => {
    const first = workouts[0] as { id: string };
    const replay = buildReplay({ workouts: [...workouts, { ...first }], recovery: [...recovery, recovery[0]], exportedAt: EXPORTED_AT });
    expect(replay.workouts).toHaveLength(workouts.length);
    expect(replay.recovery).toHaveLength(recovery.length);
  });

  it('keeps the records as the API gave them, not a reduced copy', () => {
    const replay = buildReplay({ workouts, recovery, exportedAt: EXPORTED_AT });
    expect(replay.workouts[0]).toMatchObject({ user_id: expect.anything(), timezone_offset: expect.any(String) });
  });

  it('names the workout that would not validate, instead of writing a file the app would reject', () => {
    const bad = { ...(workouts[0] as object), id: 'bad-one', score_state: 'SCORED', score: { strain: 1 } };
    expect(() => buildReplay({ workouts: [bad], recovery: [], exportedAt: EXPORTED_AT })).toThrow(/workout bad-one/);
  });

  it('works with no records at all', () => {
    const replay = buildReplay({ workouts: [], recovery: [], exportedAt: EXPORTED_AT });
    expect(replay.workouts).toEqual([]);
    expect(replay.recovery).toEqual([]);
  });
});

describe('summarize and formatSummary', () => {
  const kayak = { ...(workouts[0] as object), id: 'k1', sport_name: 'kayaking' };
  const replay = buildReplay({ workouts: [...workouts, kayak], recovery, exportedAt: EXPORTED_AT });

  it('counts workouts and recovery and the date range', () => {
    const s = summarize(replay);
    expect(s.workouts).toBe(workouts.length + 1);
    expect(s.recovery).toBe(recovery.length);
    expect(s.from).toBe('2026-08-18');
    expect(s.to).toBe('2026-09-19');
  });

  it('counts sports, most frequent first, and says which the model has no muscle map for', () => {
    const s = summarize(replay);
    expect(s.sports[0].name).toBe('running');
    expect(s.sports.find((x) => x.name === 'kayaking')).toMatchObject({ count: 1, known: false });
    expect(s.sports.find((x) => x.name === 'running')).toMatchObject({ known: true, strength: false });
    expect(s.sports.find((x) => x.name === 'weightlifting')).toMatchObject({ known: true, strength: true });
  });

  it('does not take an inherited object name such as "constructor" for a sport the model knows', () => {
    const odd = { ...(workouts[0] as object), id: 'odd-1', sport_name: 'constructor' };
    const s = summarize(buildReplay({ workouts: [odd], recovery: [], exportedAt: EXPORTED_AT }));
    expect(s.sports[0]).toMatchObject({ name: 'constructor', known: false });
  });

  it('counts only the strength sessions the member will be asked to tag: scored ones inside the last 37 days', () => {
    const lift = (id: string, end: string) => ({ ...(workouts.find((w) => (w as { sport_name: string }).sport_name === 'weightlifting') as object), id, start: end, end });
    const r = buildReplay({
      workouts: [
        lift('recent', '2026-09-20T18:00:00Z'),
        lift('edge', '2026-08-16T09:00:00Z'), // 36.9 days before the export
        lift('old', '2026-08-15T07:00:00Z'),
        lift('older', '2026-07-01T07:00:00Z'),
        { ...lift('pending', '2026-09-21T07:00:00Z'), score_state: 'PENDING_SCORE', score: undefined },
      ],
      recovery: [],
      exportedAt: EXPORTED_AT,
    });
    const s = summarize(r);
    expect(s.strengthSessions).toBe(2);
    // Every strength session is still listed among the sports found.
    expect(s.sports.find((x) => x.name === 'weightlifting')!.count).toBe(5);
    expect(formatSummary(s).join('\n')).toMatch(/Strength sessions to tag in the app: 2 \(older than 37 days no longer change the forecast, so they are not asked about\)/);
  });

  it('counts every strength session when the replay has no export time', () => {
    const s = summarize({ ...replay, asOf: undefined });
    expect(s.strengthSessions).toBe(s.sports.find((x) => x.name === 'weightlifting')!.count);
  });

  it('prints plain lines with counts only, and lists what is not mapped', () => {
    const lines = formatSummary(summarize(replay));
    expect(lines[0]).toMatch(/^Workouts: \d+ \(2026-08-18 to 2026-09-19\)$/);
    expect(lines.join('\n')).toMatch(/Not mapped to muscles yet, so they add no soreness: kayaking \(1\)/);
    expect(lines.join('\n')).toMatch(/Strength sessions to tag in the app: \d+/);
    expect(lines.join('\n')).not.toMatch(/[0-9a-f]{8}-[0-9a-f]{4}/); // no ids
  });

  it('says so when every sport is mapped', () => {
    const clean = buildReplay({ workouts, recovery, exportedAt: EXPORTED_AT });
    expect(formatSummary(summarize(clean)).join('\n')).toMatch(/Every sport found has a muscle map/);
  });

  it('handles an empty export', () => {
    const empty = buildReplay({ workouts: [], recovery: [], exportedAt: EXPORTED_AT });
    const lines = formatSummary(summarize(empty));
    expect(lines[0]).toBe('Workouts: 0');
    expect(lines.join('\n')).toMatch(/Sports found: none/);
    expect(lines.join('\n')).toMatch(/No strength sessions to tag/);
  });
});

describe('screenRecords', () => {
  const good = workouts[0] as object;
  const oddWorkout = (id: string, extra: object) => ({ ...good, id, ...extra });

  it('keeps every record that is fine and reports nothing', () => {
    const { input, skipped } = screenRecords({ workouts, recovery, exportedAt: EXPORTED_AT });
    expect(input.workouts).toHaveLength(workouts.length);
    expect(input.recovery).toHaveLength(recovery.length);
    expect(skipped).toEqual({ workouts: 0, recovery: 0, reasons: [] });
  });

  it('drops a workout or recovery record the app could not read, and counts it, instead of failing the whole export', () => {
    const badWorkout = oddWorkout('11111111-2222-3333-4444-555555555555', { start: 'not a date' });
    const badRecovery = { cycle_id: 987654, created_at: 'nope', score_state: 'SCORED' };
    const { input, skipped } = screenRecords({ workouts: [good, badWorkout], recovery: [...recovery, badRecovery], exportedAt: EXPORTED_AT });
    expect(input.workouts).toEqual([good]);
    expect(input.recovery).toHaveLength(recovery.length);
    expect(skipped.workouts).toBe(1);
    expect(skipped.recovery).toBe(1);
    // What is kept is what buildReplay accepts.
    expect(() => buildReplay(input)).not.toThrow();
  });

  it('removes the record\'s own id however it is spelled, not only when it looks like a UUID', () => {
    const { skipped } = screenRecords({
      workouts: [oddWorkout('id with spaces: and colon', { start: 'x' })],
      recovery: [{ cycle_id: -5.5, created_at: 'x', score_state: 'SCORED' }],
      exportedAt: EXPORTED_AT,
    });
    expect(skipped.reasons.join('|')).not.toMatch(/id with spaces|colon|5\.5/);
    expect(skipped.reasons.join('|')).toMatch(/start must be an ISO date string/);
  });

  it('gives reasons that name the field but never an id, so the line is safe to paste back', () => {
    const { skipped } = screenRecords({
      workouts: [oddWorkout('11111111-2222-3333-4444-555555555555', { start: 'x' })],
      recovery: [{ cycle_id: 987654, created_at: 'x', score_state: 'SCORED' }],
      exportedAt: EXPORTED_AT,
    });
    expect(skipped.reasons.join('|')).toMatch(/workout: start must be an ISO date string/);
    expect(skipped.reasons.join('|')).toMatch(/recovery: created_at must be an ISO date string/);
    expect(skipped.reasons.join('|')).not.toMatch(/11111111|987654/);
  });

  it('lists each reason once and at most three', () => {
    const many = ['a', 'b', 'c', 'd', 'e'].map((id, i) => oddWorkout(id, i < 2 ? { start: 'x' } : i === 2 ? { end: 'x' } : i === 3 ? { score_state: 'ODD' } : { sport_name: 5 }));
    const { skipped } = screenRecords({ workouts: many, recovery: [], exportedAt: EXPORTED_AT });
    expect(skipped.workouts).toBe(5);
    expect(skipped.reasons).toHaveLength(3);
    expect(new Set(skipped.reasons).size).toBe(3);
  });

  it('does not change the records it was given', () => {
    const before = JSON.stringify({ workouts, recovery });
    screenRecords({ workouts: [...workouts, { junk: true }], recovery, exportedAt: EXPORTED_AT });
    expect(JSON.stringify({ workouts, recovery })).toBe(before);
  });
});
