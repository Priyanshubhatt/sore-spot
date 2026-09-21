import { parseReplay } from '../../engine/replay';
import { SPORT_MUSCLE_MAP, STRENGTH_SPORTS, normalizeSport } from '../../engine/sportMuscleMap';
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
  // Round-trip through JSON so what is validated is exactly what will be written.
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
  strengthSessions: number;
}

/** Counts only: no ids, no dates beyond the range, nothing personal. Safe to paste back for review. */
export function summarize(replay: ReplayFile): ExportSummary {
  const counts = new Map<string, number>();
  for (const w of replay.workouts) counts.set(w.sport_name, (counts.get(w.sport_name) ?? 0) + 1);
  const sports = [...counts.entries()]
    .map(([name, count]) => {
      const key = normalizeSport(name);
      const strength = STRENGTH_SPORTS.has(key);
      return { name, count, known: strength || key in SPORT_MUSCLE_MAP, strength };
    })
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
  const starts = replay.workouts.map((w) => w.start).sort();
  return {
    workouts: replay.workouts.length,
    recovery: replay.recovery?.length ?? 0,
    from: starts[0]?.slice(0, 10),
    to: starts[starts.length - 1]?.slice(0, 10),
    sports,
    strengthSessions: sports.filter((s) => s.strength).reduce((n, s) => n + s.count, 0),
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
      ? `Strength sessions to tag in the app: ${s.strengthSessions}`
      : 'No strength sessions to tag.',
  );
  return lines;
}
