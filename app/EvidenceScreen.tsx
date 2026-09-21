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
  content: { padding: 16, paddingTop: 8, gap: 12, paddingBottom: 32 },
  heading: { fontSize: 20, fontWeight: '700', color: '#16211F' },
  intro: { fontSize: 13, color: '#4B5856' },
  card: { gap: 8, padding: 12, borderRadius: 12, backgroundColor: '#F6F8F8', borderWidth: 1, borderColor: '#E3EAE8' },
  cardHeading: { fontSize: 16, fontWeight: '700', color: '#16211F' },
  body: { fontSize: 14, lineHeight: 20, color: '#26312F' },
  limits: { backgroundColor: '#FFF7ED', borderColor: '#F3D9B5' },
  limitsHeading: { fontSize: 16, fontWeight: '700', color: '#7A3E08' },
  limitText: { fontSize: 14, lineHeight: 20, color: '#5B3A12' },
  footnote: { fontSize: 12, color: '#5C6866' },
});
