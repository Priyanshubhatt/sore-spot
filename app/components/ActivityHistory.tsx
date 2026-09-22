import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { bandColor } from '../body/colors';
import { bandPhrase } from '../copy';
import type { HistoryDay } from '../history';
import { dateLabel, weekdayLabel } from '../scrubber';
import { colors, radius, space, type } from '../theme';

interface Props {
  asOf: Date;
  days: readonly HistoryDay[];
  restText: string;
}

/** The last several days, oldest first: what you did, and how sore it predicted you'd be. Scrolls
 * sideways instead of squeezing every card to fit, so a word like "Weightlifting" has room to sit
 * on two lines cleanly rather than breaking wherever it runs out of space. */
export default function ActivityHistory({ asOf, days, restText }: Props) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
      {days.map((d) => {
        const activity = d.activities.length > 0 ? d.activities.join(', ') : restText;
        return (
          <View
            key={d.daysAgo}
            accessible
            accessibilityLabel={`${weekdayLabel(asOf, -d.daysAgo)}, ${dateLabel(asOf, -d.daysAgo)}: ${activity}. ${bandPhrase(d.band)}.`}
            style={styles.card}
          >
            <Text style={styles.day}>{dateLabel(asOf, -d.daysAgo)}</Text>
            <Text style={styles.weekday}>{weekdayLabel(asOf, -d.daysAgo)}</Text>
            <View style={[styles.dot, { backgroundColor: bandColor(d.band) }]} />
            <Text style={styles.activity} numberOfLines={2}>
              {activity}
            </Text>
          </View>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 6 },
  card: {
    width: 72,
    alignItems: 'center',
    gap: 4,
    paddingVertical: space.sm,
    paddingHorizontal: 4,
    borderRadius: radius.sm,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
  },
  day: { ...type.small, fontWeight: '700', color: colors.dim },
  weekday: { ...type.small, fontSize: 10 },
  dot: { width: 8, height: 8, borderRadius: 4, marginVertical: 2 },
  activity: { ...type.small, fontSize: 10.5, lineHeight: 13, textAlign: 'center' },
});
