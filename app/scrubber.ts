import { FORECAST_DAYS } from '../engine/constants';

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const;
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'] as const;
const MS_PER_DAY = 86_400_000;

/** "Now" for day 0, else the UTC calendar date of asOf + day ("Sep 22"). day may be negative, for a day before asOf. */
export function dateLabel(asOf: Date, day: number): string {
  if (day === 0) return 'Now';
  const d = new Date(asOf.getTime() + day * MS_PER_DAY);
  return `${MONTHS[d.getUTCMonth()]} ${d.getUTCDate()}`;
}

/** UTC weekday of asOf + day. UTC keeps labels deterministic across time zones. */
export function weekdayLabel(asOf: Date, day: number): string {
  return WEEKDAYS[new Date(asOf.getTime() + day * MS_PER_DAY).getUTCDay()];
}

/** Which of the evenly sized day segments an x position falls in. Clamped to the track. */
export function dayIndexFromX(x: number, width: number, days: number = FORECAST_DAYS): number {
  if (width <= 0) return 0;
  return Math.min(days - 1, Math.max(0, Math.floor((x / width) * days)));
}
