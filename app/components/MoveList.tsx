import { StyleSheet, Text, View } from 'react-native';
import {
  COMFORT_HEADING,
  EVIDENCE_LABELS,
  EVIDENCE_NOTES,
  NOTHING_NEEDED_TEXT,
  ROM_HEADING,
  SAFETY_LINE,
  SAVE_STRETCHING_TEXT,
  STRETCH_HONESTY,
} from '../copy';
import { evidenceFor, type EvidenceTag, type Move } from '../mobility/library';
import type { Recommendation } from '../mobility/recommend';

interface SectionProps {
  heading: string;
  evidence: EvidenceTag;
  moves: Move[];
}

function Section({ heading, evidence, moves }: SectionProps) {
  return (
    <View style={styles.section}>
      <Text style={styles.heading}>{heading}</Text>
      <Text style={styles.evidenceNote}>{EVIDENCE_NOTES[evidence]}</Text>
      {moves.map((move) => (
        <View key={move.id} style={styles.move}>
          <View style={styles.moveHeader}>
            <Text style={styles.moveName}>{move.name}</Text>
            <Text style={styles.tag}>{EVIDENCE_LABELS[evidenceFor(move.kind)]}</Text>
          </View>
          <Text style={styles.how}>{move.how}</Text>
          <Text style={styles.dose}>{move.dose}</Text>
        </View>
      ))}
    </View>
  );
}

export default function MoveList({ recommendation }: { recommendation: Recommendation }) {
  const { comfort, rom, note } = recommendation;
  return (
    <View style={styles.wrap}>
      {note === 'nothing-needed' && <Text style={styles.note}>{NOTHING_NEEDED_TEXT}</Text>}
      {comfort.length > 0 && <Section heading={COMFORT_HEADING} evidence="COMFORT" moves={comfort} />}
      {note === 'save-stretching' && <Text style={styles.note}>{SAVE_STRETCHING_TEXT}</Text>}
      {rom.length > 0 && <Section heading={ROM_HEADING} evidence="ROM" moves={rom} />}
      <Text style={styles.small}>{STRETCH_HONESTY}</Text>
      <Text style={styles.safety}>{SAFETY_LINE}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 12 },
  section: { gap: 6 },
  heading: { fontSize: 14, fontWeight: '700', color: '#16211F' },
  evidenceNote: { fontSize: 12, color: '#5C6866' },
  move: { gap: 2, paddingVertical: 4 },
  moveHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  moveName: { flex: 1, fontSize: 14, fontWeight: '600', color: '#26312F' },
  tag: {
    fontSize: 11,
    fontWeight: '600',
    color: '#1E5F55',
    backgroundColor: '#E3EEEC',
    paddingVertical: 2,
    paddingHorizontal: 8,
    borderRadius: 10,
    overflow: 'hidden',
  },
  how: { fontSize: 13, color: '#26312F' },
  dose: { fontSize: 12, color: '#5C6866' },
  note: { fontSize: 13, color: '#26312F' },
  small: { fontSize: 12, color: '#5C6866' },
  safety: { fontSize: 12, fontWeight: '600', color: '#7A3B00' },
});
