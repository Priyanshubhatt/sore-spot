import { StyleSheet, Text, View } from 'react-native';
import type { DayForecast, RiskBand } from '../../engine';
import { bandColor } from '../body/colors';
import { BAND_LABELS } from '../copy';
import { summarize, summaryLabel } from '../summary';
import { colors, radius, space, type } from '../theme';

const ORDER: readonly RiskBand[] = ['high', 'moderate', 'low'];

interface Props {
  day: DayForecast;
  /** e.g. "Now" or "+2d (Mon)". */
  dayText: string;
}

/** How many muscles sit in each band on the day being viewed: big numerals, a colour bar, a word. */
export default function SummaryStrip({ day, dayText }: Props) {
  const summary = summarize(day);
  return (
    <View accessible accessibilityLabel={summaryLabel(summary, dayText)} style={styles.card}>
      {ORDER.map((band) => (
        <View key={band} style={styles.stat}>
          <Text style={styles.number}>{String(summary[band].length)}</Text>
          <View style={[styles.bar, { backgroundColor: bandColor(band) }]} />
          <Text style={styles.label}>{BAND_LABELS[band]}</Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    gap: space.md,
    paddingVertical: space.md,
    paddingHorizontal: space.lg,
    borderRadius: radius.md,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
  },
  stat: { flex: 1, alignItems: 'center', gap: 6 },
  number: { ...type.display, fontSize: 30, lineHeight: 34 },
  bar: { width: 36, height: 4, borderRadius: 2 },
  label: { ...type.label },
});
