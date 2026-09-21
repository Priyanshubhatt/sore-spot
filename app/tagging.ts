import type { StrengthTag, TaggedWorkout } from '../engine';

export const TAG_OPTIONS: readonly StrengthTag[] = ['lower', 'upper', 'push', 'pull', 'full'];

/** User-chosen session tags, by workout id. */
export type Tags = Record<string, StrengthTag>;

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const;
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'] as const;

/** A copy of the workouts with the chosen tags applied. Inputs are never mutated. */
export function applyTags(workouts: TaggedWorkout[], tags: Tags): TaggedWorkout[] {
  return workouts.map((w) => (tags[w.id] ? { ...w, session_tag: tags[w.id] } : w));
}

function sportLabel(sportName: string): string {
  const text = sportName.replace(/[-_]+/g, ' ').trim();
  return text.charAt(0).toUpperCase() + text.slice(1);
}

/** Minutes east of UTC for an offset like "-05:00" or "+0530"; 0 (UTC) when it is missing or unreadable. */
function offsetMinutes(offset: string | undefined): number {
  const m = /^([+-])(\d{2}):?(\d{2})$/.exec(offset ?? '');
  if (!m) return 0;
  return (m[1] === '-' ? -1 : 1) * (Number(m[2]) * 60 + Number(m[3]));
}

/** "Wed Sep 16 · Weightlifting", on the day it happened where the workout was, and the same on every device. */
export function describeWorkout(workout: Pick<TaggedWorkout, 'start' | 'sport_name'> & Partial<Pick<TaggedWorkout, 'timezone_offset'>>): string {
  const d = new Date(Date.parse(workout.start) + offsetMinutes(workout.timezone_offset) * 60_000);
  return `${WEEKDAYS[d.getUTCDay()]} ${MONTHS[d.getUTCMonth()]} ${d.getUTCDate()} · ${sportLabel(workout.sport_name)}`;
}
