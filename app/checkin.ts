import {
  applyCheckIn,
  defaultSensitivity,
  type DayForecast,
  type Muscle,
  type RiskBand,
  type Sensitivity,
} from '../engine';

/** 0 none, 1 mild, 2 moderate, 3 severe. */
export type CheckInLevel = 0 | 1 | 2 | 3;
export type CheckIns = Partial<Record<Muscle, CheckInLevel>>;

export const CHECKIN_LEVELS: readonly CheckInLevel[] = [0, 1, 2, 3];

/**
 * Sensitivity implied by the current check-ins. Always rebuilt from the default sensitivity and
 * the default-sensitivity forecast for Now, so changing or repeating a choice never stacks nudges.
 */
export function sensitivityFromCheckIns(checkIns: CheckIns, baseNow: DayForecast): Sensitivity {
  let sensitivity = defaultSensitivity();
  for (const muscle of Object.keys(checkIns) as Muscle[]) {
    const reported = checkIns[muscle];
    if (reported === undefined) continue;
    sensitivity = applyCheckIn(sensitivity, muscle, baseNow[muscle].band, reported);
  }
  return sensitivity;
}

const BAND_RANK: Record<RiskBand, number> = { low: 0, moderate: 1, high: 2 };

/** The band advice is based on: a severe check-in counts as High, a moderate one as at least Moderate. */
export function effectiveBand(predicted: RiskBand, reported?: CheckInLevel): RiskBand {
  if (reported === 3) return 'high';
  if (reported === 2 && BAND_RANK[predicted] < BAND_RANK.moderate) return 'moderate';
  return predicted;
}
