import { StyleSheet, Text, View } from 'react-native';
import type { DayForecast, RiskBand } from '../../engine';
import { bandColor } from '../body/colors';
import { BAND_LABELS } from '../copy';
import { SUMMARY_CAPTION, summarize, summaryLabel } from '../summary';
import { colors, radius, space, type } from '../theme';

const ORDER: readonly RiskBand[] = ['high', 'moderate', 'low'];

interface Props {
  day: DayForecast;
  /** e.g. "Now" or "Sep 21 (Mon)". */
  dayText: string;
}

/** How many muscles sit in each band on the day being viewed: big numerals, a colour bar, a word. */
export default function SummaryStrip({ day, dayText }: Props) {
  const summary = summarize(day);
  return (
    <View accessible accessibilityLabel={summaryLabel(summary, dayText)} style={styles.card}>
      <Text style={styles.caption}>{SUMMARY_CAPTION}</Text>
      <View style={styles.stats}>
        {ORDER.map((band) => (
          <View key={band} style={styles.stat}>
            <Text style={styles.number}>{String(summary[band].length)}</Text>
            <View style={[styles.bar, { backgroundColor: bandColor(band) }]} />
            <Text style={styles.label}>{BAND_LABELS[band]}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: space.sm,
    paddingVertical: space.md,
    paddingHorizontal: space.lg,
    borderRadius: radius.md,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
  },
  caption: { ...type.label, textAlign: 'center' },
  stats: { flexDirection: 'row', gap: space.md },
  stat: { flex: 1, alignItems: 'center', gap: 6 },
  number: { ...type.display, fontSize: 30, lineHeight: 34 },
  bar: { width: 36, height: 4, borderRadius: 2 },
  label: { ...type.label },
});
