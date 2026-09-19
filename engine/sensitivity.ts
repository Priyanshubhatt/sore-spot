import { SENSITIVITY_MAX, SENSITIVITY_MIN, SENSITIVITY_STEP } from './constants';
import { MUSCLES, Muscle, RiskBand, Sensitivity } from './types';

const BAND_LEVEL: Record<RiskBand, number> = { low: 0, moderate: 1, high: 2 };

export function defaultSensitivity(): Sensitivity {
  return Object.fromEntries(MUSCLES.map((m) => [m, 1])) as Sensitivity;
}

/**
 * Nudge one muscle's sensitivity toward what the user reported.
 * reported is 0 none, 1 mild, 2 moderate, 3 severe. Returns a new object.
 */
export function applyCheckIn(
  sensitivity: Sensitivity,
  muscle: Muscle,
  predicted: RiskBand,
  reported: 0 | 1 | 2 | 3,
): Sensitivity {
  const reportedLevel = (reported * 2) / 3; // scale 0..3 onto the 0..2 band levels
  const diff = reportedLevel - BAND_LEVEL[predicted];
  let next = sensitivity[muscle];
  if (diff >= 0.5) next += SENSITIVITY_STEP;
  else if (diff <= -0.5) next -= SENSITIVITY_STEP;
  next = Math.min(SENSITIVITY_MAX, Math.max(SENSITIVITY_MIN, next));
  return { ...sensitivity, [muscle]: Math.round(next * 100) / 100 };
}
