import type { RiskBand } from '../../engine';

// One sequential teal ramp so the map does not read as an alarm.
export const BAND_COLORS: Record<RiskBand, string> = {
  low: '#E3EEEC',
  moderate: '#7DBDB2',
  high: '#1E7A6C',
};

export const BAND_ORDER: readonly RiskBand[] = ['low', 'moderate', 'high'];

export function bandColor(band: RiskBand): string {
  return BAND_COLORS[band];
}
