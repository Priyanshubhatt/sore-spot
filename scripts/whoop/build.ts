import { parseReplay } from '../../engine/replay';
import { SPORT_MUSCLE_MAP, STRENGTH_SPORTS, normalizeSport } from '../../engine/sportMuscleMap';
import { TAG_RELEVANCE_HOURS } from '../../engine/soreness';
import type { ReplayFile } from '../../engine/types';

export interface ExportInput {
  workouts: unknown[];
  recovery: unknown[];
  exportedAt: Date;
}

const startMs = (w: unknown): number => {
  const t = Date.parse(String((w as { start?: unknown })?.start));
  return Number.isNaN(t) ? 0 : t;
};
const createdMs = (r: unknown): number => {
  const t = Date.parse(String((r as { created_at?: unknown })?.created_at));
  return Number.isNaN(t) ? 0 : t;
};

/** Keeps the first record for each key: a page boundary can repeat a record. */
function dedupe(records: unknown[], key: (r: unknown) => string): unknown[] {
  const seen = new Set<string>();
  return records.filter((r) => {
    const k = key(r);
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}

export interface Skipped {
  workouts: number;
  recovery: number;
  /** Up to three distinct reasons, with every id removed, so the line is safe to paste back. */
  reasons: string[];
}

/** "Invalid replay file: workout 4f2a-...: start must be..." becomes "workout: start must be...". */
const reasonOf = (err: unknown, record: unknown): string => {
  let text = err instanceof Error ? err.message : String(err);
  // The record is in hand, so its own id text is removed literally, whatever it looks like.
  const r = (record ?? {}) as { id?: unknown; cycle_id?: unknown; sleep_id?: unknown; session_tag?: unknown };
  for (const own of [r.id, r.cycle_id, r.sleep_id, r.session_tag]) {
    if (own !== undefined && own !== null && String(own).length > 0) text = text.split(String(own)).join('…');
  }
  return text.replace(/^Invalid replay file: (workout|recovery) \S+( \S+)?: /, '$1: ').slice(0, 120);
};

/**
 * Keeps the records the app can read and counts the rest. Real payloads are the one thing not checked against WHOOP
 * ahead of time, so one unrecognised record must not throw away a whole export.
 */
export function screenRecords(input: ExportInput): { input: ExportInput; skipped: Skipped } {
  const reasons = new Set<string>();
  const skipped: Skipped = { workouts: 0, recovery: 0, reasons: [] };
  const keep = (records: unknown[], kind: 'workouts' | 'recovery'): unknown[] =>
    records.filter((r) => {
      try {
        // Each record is checked alone, by the same parser the app uses.
        parseReplay(JSON.parse(JSON.stringify({ synthetic: false, workouts: kind === 'workouts' ? [r] : [], recovery: kind === 'recovery' ? [r] : [] })));
        return true;
      } catch (err) {
        skipped[kind]++;
        reasons.add(reasonOf(err, r));
        return false;
      }
    });
  const workouts = keep(input.workouts, 'workouts');
  const recovery = keep(input.recovery, 'recovery');
  skipped.reasons = [...reasons].slice(0, 3);
  return { input: { ...input, workouts, recovery }, skipped };
}

/**
 * Turns what the API returned into the replay file the app reads. The result goes through the same
 * validation the app uses (parseReplay), so a file this writes is one the app will accept.
 */
export function buildReplay(input: ExportInput): ReplayFile {
  const workouts = dedupe(input.workouts, (w) => String((w as { id?: unknown })?.id)).sort((a, b) => startMs(a) - startMs(b));
  const recovery = dedupe(
    input.recovery,
    (r) => `${(r as { cycle_id?: unknown })?.cycle_id}:${(r as { sleep_id?: unknown })?.sleep_id}`,
  ).sort((a, b) => createdMs(a) - createdMs(b));
  // Round-trip through JSON so what is checked is exactly what will be written.
  const file = JSON.parse(JSON.stringify({ synthetic: false, asOf: input.exportedAt.toISOString(), workouts, recovery }));
  return parseReplay(file);
}

export interface SportCount {
  name: string;
  count: number;
  /** The model has a muscle map for it (or, for strength sports, it asks for a tag). */
  known: boolean;
  strength: boolean;
}

export interface ExportSummary {
  workouts: number;
  recovery: number;
  from?: string;
  to?: string;
  sports: SportCount[];
  /** Strength sessions the app will ask about: scored ones that ended within {@link RECENT_HOURS} hours of the export. Older ones are never asked about. */
  strengthSessions: number;
}

/** A strength session older than this can no longer change the forecast (see the engine), so it is never asked about. */
export const RECENT_HOURS = TAG_RELEVANCE_HOURS;

/** Without an export time (the synthetic week) everything counts as recent. */
const isRecent = (end: string, asOf?: string): boolean => asOf === undefined || Date.parse(asOf) - Date.parse(end) <= RECENT_HOURS * 3_600_000;

/** Counts only: no ids, no dates beyond the range, nothing personal. Safe to paste back for review. */
export function summarize(replay: ReplayFile): ExportSummary {
  const counts = new Map<string, number>();
  for (const w of replay.workouts) counts.set(w.sport_name, (counts.get(w.sport_name) ?? 0) + 1);
  const sports = [...counts.entries()]
    .map(([name, count]) => {
      const key = normalizeSport(name);
      const strength = STRENGTH_SPORTS.has(key);
      return { name, count, known: strength || Object.hasOwn(SPORT_MUSCLE_MAP, key), strength };
    })
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
  const starts = replay.workouts.map((w) => w.start).sort();
  return {
    workouts: replay.workouts.length,
    recovery: replay.recovery?.length ?? 0,
    from: starts[0]?.slice(0, 10),
    to: starts[starts.length - 1]?.slice(0, 10),
    sports,
    strengthSessions: replay.workouts.filter(
      (w) => STRENGTH_SPORTS.has(normalizeSport(w.sport_name)) && w.score_state === 'SCORED' && w.score && isRecent(w.end, replay.asOf),
    ).length,
  };
}

/** The lines the script prints when it finishes. */
export function formatSummary(s: ExportSummary): string[] {
  const lines = [
    `Workouts: ${s.workouts}${s.from ? ` (${s.from} to ${s.to})` : ''}`,
    `Recovery records: ${s.recovery}`,
    `Sports found: ${s.sports.map((x) => `${x.name} (${x.count})`).join(', ') || 'none'}`,
  ];
  const unknown = s.sports.filter((x) => !x.known);
  lines.push(
    unknown.length > 0
      ? `Not mapped to muscles yet, so they add no soreness: ${unknown.map((x) => `${x.name} (${x.count})`).join(', ')}`
      : 'Every sport found has a muscle map.',
  );
  lines.push(
    s.strengthSessions > 0
      ? `Strength sessions to tag in the app: ${s.strengthSessions} (older than ${Math.floor(RECENT_HOURS / 24)} days no longer change the forecast, so they are not asked about)`
      : 'No strength sessions to tag.',
  );
  return lines;
}
