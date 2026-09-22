import { MUSCLES, type DayForecast, type Muscle, type RiskBand } from '../../engine';
import { colors } from '../theme';

// Traffic-light order: a dim green, amber and red. The legend and the sheet always name the band in
// words too, and the three are kept apart by lightness as well as hue (see app/theme.test.ts).
export const BAND_COLORS: Record<RiskBand, string> = {
  low: colors.low,
  moderate: colors.moderate,
  high: colors.high,
};

export const BAND_ORDER: readonly RiskBand[] = ['low', 'moderate', 'high'];
const BAND_PRIORITY: Record<RiskBand, number> = { low: 0, moderate: 1, high: 2 };

export function bandColor(band: RiskBand): string {
  return BAND_COLORS[band];
}

/** The worst band among the given muscles (every muscle by default) on one day's forecast. */
export function dominantBand(day: DayForecast, muscles: readonly Muscle[] = MUSCLES): RiskBand {
  return muscles.reduce<RiskBand>(
    (worst, m) => (BAND_PRIORITY[day[m].band] > BAND_PRIORITY[worst] ? day[m].band : worst),
    'low',
  );
}
