import { describe, expect, it } from 'vitest';
import { syntheticReplay } from '../../data/replay.synthetic';
import { parseReplay } from '../../engine/replay';
import { buildReplay, formatSummary, summarize } from './build';

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

  it('counts the strength sessions the member will be asked to tag', () => {
    const s = summarize(replay);
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
