import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { Muscle, MuscleState } from '../../engine';
import { BAND_LABELS, MUSCLE_LABELS, bandPhrase, reasonsFor } from '../copy';
import { bandColor } from '../body/colors';

interface Props {
  muscle: Muscle;
  state: MuscleState;
  /** e.g. "Now" or "+2d (Mon)". */
  dayText: string;
  onClose: () => void;
}

/** Explains one muscle's prediction. Follows the scrubber, so dragging shows how it fades. */
export default function MuscleSheet({ muscle, state, dayText, onClose }: Props) {
  return (
    <View style={styles.sheet}>
      <View style={styles.header}>
        <View style={[styles.swatch, { backgroundColor: bandColor(state.band) }]} />
        <View style={styles.headerText}>
          <Text style={styles.title}>{MUSCLE_LABELS[muscle]}</Text>
          <Text style={styles.subtitle}>
            {bandPhrase(state.band)} · {dayText}
          </Text>
        </View>
        <Pressable
          onPress={onClose}
          hitSlop={12}
          accessibilityRole="button"
          accessibilityLabel="Close details"
        >
          <Text style={styles.close}>Close</Text>
        </Pressable>
      </View>
      {reasonsFor(state).map((reason) => (
        <Text key={reason} style={styles.reason}>
          {`• ${reason}`}
        </Text>
      ))}
      <Text style={styles.band}>{`Band: ${BAND_LABELS[state.band]}`}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  sheet: {
    position: 'absolute',
    left: 12,
    right: 12,
    bottom: 12,
    padding: 16,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#D5DDDB',
    gap: 6,
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  swatch: { width: 22, height: 22, borderRadius: 11, borderWidth: 1, borderColor: '#B7C4C1' },
  headerText: { flex: 1 },
  title: { fontSize: 17, fontWeight: '700', color: '#16211F' },
  subtitle: { fontSize: 13, color: '#4B5856' },
  close: { fontSize: 14, fontWeight: '600', color: '#1E7A6C', padding: 4 },
  reason: { fontSize: 14, color: '#26312F' },
  band: { fontSize: 12, color: '#5C6866', marginTop: 2 },
});
