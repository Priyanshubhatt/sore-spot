import { StyleSheet, Text, View } from 'react-native';
import {
  COMFORT_HEADING,
  EVIDENCE_LABELS,
  EVIDENCE_NOTES,
  NOTHING_NEEDED_TEXT,
  MOVE_CUE,
  ROM_HEADING,
  SAVE_STRETCHING_TEXT,
  STRETCH_HONESTY,
} from '../copy';
import { evidenceFor, type EvidenceTag, type Move } from '../mobility/library';
import type { Recommendation } from '../mobility/recommend';
import { colors, space, type } from '../theme';

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
      {(comfort.length > 0 || rom.length > 0) && <Text style={styles.small}>{MOVE_CUE}</Text>}
      <Text style={styles.small}>{STRETCH_HONESTY}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: space.md },
  section: { gap: 6 },
  heading: { ...type.strong },
  evidenceNote: { ...type.small },
  move: { gap: 2, paddingVertical: space.xs },
  moveHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: space.sm },
  moveName: { flex: 1, ...type.strong },
  tag: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.accent,
    backgroundColor: colors.accentSoft,
    paddingVertical: 2,
    paddingHorizontal: space.sm,
    borderRadius: 10,
    overflow: 'hidden',
  },
  how: { ...type.body },
  dose: { ...type.small },
  note: { ...type.body },
  small: { ...type.small },
});
