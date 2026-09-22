import { computeForecast, type RiskBand, type Sensitivity, type TaggedWorkout } from '../engine';
import { dominantBand } from './body/colors';
import { TAG_LABELS } from './copy';
import { sportLabel, workoutLocalDate } from './tagging';

/** "Lower body" for a tagged strength session, else the plain sport name: whichever says more about what was done. */
function activityLabel(w: TaggedWorkout): string {
  return w.session_tag ? TAG_LABELS[w.session_tag] : sportLabel(w.sport_name);
}

const MS_PER_DAY = 86_400_000;

export interface HistoryDay {
  /** 0 is today ("Now"), 7 is a week ago. */
  daysAgo: number;
  /** Sport names that happened on this day, prettified, deduplicated, in the order first seen. Empty is a rest day. */
  activities: string[];
  /** The worst predicted band, across every muscle, as of that day. */
  band: RiskBand;
}

/**
 * The last `span` days up to and including "Now" (oldest first): what happened, and how sore the
 * engine would have predicted you to be, computed the same way as the live forecast, just aimed at
 * an earlier moment. A workout counts on the day it happened where it happened (its own time zone).
 */
export function recentHistory(
  workouts: TaggedWorkout[],
  asOf: Date,
  sensitivity: Sensitivity,
  span: number = 7,
): HistoryDay[] {
  const days: HistoryDay[] = [];
  for (let daysAgo = span; daysAgo >= 0; daysAgo--) {
    const at = new Date(asOf.getTime() - daysAgo * MS_PER_DAY);
    const dayKey = at.toISOString().slice(0, 10);
    const activities: string[] = [];
    for (const w of workouts) {
      if (workoutLocalDate(w).toISOString().slice(0, 10) !== dayKey) continue;
      const label = activityLabel(w);
      if (!activities.includes(label)) activities.push(label);
    }
    const band = dominantBand(computeForecast(workouts, at, sensitivity).byDay[0]);
    days.push({ daysAgo, activities, band });
  }
  return days;
}
