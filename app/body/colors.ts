import type { RiskBand } from '../../engine';
import { colors } from '../theme';

// Traffic-light order: a dim green, amber and red. The legend and the sheet always name the band in
// words too, and the three are kept apart by lightness as well as hue (see app/theme.test.ts).
export const BAND_COLORS: Record<RiskBand, string> = {
  low: colors.low,
  moderate: colors.moderate,
  high: colors.high,
};

export const BAND_ORDER: readonly RiskBand[] = ['low', 'moderate', 'high'];

export function bandColor(band: RiskBand): string {
  return BAND_COLORS[band];
}
