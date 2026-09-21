import { ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import TimeCurveChart from './components/TimeCurveChart';
import {
  CURVE_HEADING,
  CURVE_TEXT,
  EVIDENCE_FOOTNOTE,
  EVIDENCE_HEADING,
  EVIDENCE_INTRO,
  LABELS_HEADING,
  LABEL_LINES,
  LIMITS,
  LIMITS_HEADING,
  TEXT_CARDS,
} from './evidenceCopy';
import { colors, radius, space, type } from './theme';

/** What the model rests on, and where it stops. The limits card is part of the screen, not an extra. */
export default function EvidenceScreen() {
  const { width } = useWindowDimensions();
  const chartWidth = Math.min(width - 32 - 24, 360);
  return (
    <ScrollView contentContainerStyle={styles.content}>
      <Text style={styles.heading}>{EVIDENCE_HEADING}</Text>
      <Text style={styles.intro}>{EVIDENCE_INTRO}</Text>

      <View style={styles.card}>
        <Text style={styles.cardHeading}>{CURVE_HEADING}</Text>
        <Text style={styles.body}>{CURVE_TEXT}</Text>
        <TimeCurveChart width={chartWidth} />
      </View>

      {TEXT_CARDS.map((card) => (
        <View key={card.id} style={styles.card}>
          <Text style={styles.cardHeading}>{card.heading}</Text>
          <Text style={styles.body}>{card.body}</Text>
        </View>
      ))}

      <View style={styles.card}>
        <Text style={styles.cardHeading}>{LABELS_HEADING}</Text>
        {LABEL_LINES.map((line) => (
          <Text key={line} style={styles.body}>{`• ${line}`}</Text>
        ))}
      </View>

      <View style={[styles.card, styles.limits]}>
        <Text style={styles.limitsHeading}>{LIMITS_HEADING}</Text>
        {LIMITS.map((limit) => (
          <Text key={limit} style={styles.limitText}>{`• ${limit}`}</Text>
        ))}
      </View>

      <Text style={styles.footnote}>{EVIDENCE_FOOTNOTE}</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: space.lg, paddingTop: space.sm, gap: space.md, paddingBottom: 32 },
  heading: { ...type.title },
  intro: { ...type.body },
  card: {
    gap: space.sm,
    padding: space.lg,
    borderRadius: radius.md,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardHeading: { ...type.heading, fontSize: 17 },
  body: { ...type.body },
  limits: { backgroundColor: colors.warnBg, borderColor: colors.warnBorder },
  limitsHeading: { ...type.heading, fontSize: 17, color: colors.warnText },
  limitText: { fontSize: 14, lineHeight: 20, color: colors.warnText },
  footnote: { ...type.small },
});
