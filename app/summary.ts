import { MUSCLES, type DayForecast, type Muscle } from '../engine';
import { BAND_LABELS } from './copy';

export interface DaySummary {
  high: Muscle[];
  moderate: Muscle[];
  low: Muscle[];
}

/** Which muscles sit in each band on one forecast day, in the engine's muscle order. */
export function summarize(day: DayForecast): DaySummary {
  return {
    high: MUSCLES.filter((m) => day[m].band === 'high'),
    moderate: MUSCLES.filter((m) => day[m].band === 'moderate'),
    low: MUSCLES.filter((m) => day[m].band === 'low'),
  };
}

const plural = (n: number) => `${n} ${n === 1 ? 'muscle' : 'muscles'}`;

/** The strip read aloud: "Now: 4 muscles High, 1 muscle Moderate, 7 muscles Low." */
export function summaryLabel(summary: DaySummary, dayText: string): string {
  return `${dayText}: ${plural(summary.high.length)} ${BAND_LABELS.high}, ${plural(summary.moderate.length)} ${BAND_LABELS.moderate}, ${plural(summary.low.length)} ${BAND_LABELS.low}.`;
}
