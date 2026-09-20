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

/** "Wed Sep 16 · Weightlifting", in UTC so it is the same on every device. */
export function describeWorkout(workout: Pick<TaggedWorkout, 'start' | 'sport_name'>): string {
  const d = new Date(workout.start);
  return `${WEEKDAYS[d.getUTCDay()]} ${MONTHS[d.getUTCMonth()]} ${d.getUTCDate()} · ${sportLabel(workout.sport_name)}`;
}
