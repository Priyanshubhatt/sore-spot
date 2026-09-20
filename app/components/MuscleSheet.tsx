import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import type { Muscle, MuscleState } from '../../engine';
import { BAND_LABELS, MUSCLE_LABELS, bandPhrase, reasonsFor } from '../copy';
import { bandColor } from '../body/colors';
import type { CheckInLevel } from '../checkin';
import type { Recommendation } from '../mobility/recommend';
import CheckInPicker from './CheckInPicker';
import MoveList from './MoveList';

interface Props {
  muscle: Muscle;
  state: MuscleState;
  /** e.g. "Now" or "+2d (Mon)". */
  dayText: string;
  /** Check-ins describe today, so they are only offered on Now. */
  checkInEnabled: boolean;
  checkIn?: CheckInLevel;
  checkInMessage?: string;
  onCheckIn: (level: CheckInLevel) => void;
  recommendation: Recommendation;
  onClose: () => void;
}

/**
 * Explains one muscle's prediction and offers a check-in and comfort ideas. Follows the scrubber,
 * so dragging shows how it fades. The header stays put; the rest scrolls.
 */
export default function MuscleSheet({
  muscle,
  state,
  dayText,
  checkInEnabled,
  checkIn,
  checkInMessage,
  onCheckIn,
  recommendation,
  onClose,
}: Props) {
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
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {reasonsFor(state).map((reason) => (
          <Text key={reason} style={styles.reason}>
            {`• ${reason}`}
          </Text>
        ))}
        <Text style={styles.band}>{`Band: ${BAND_LABELS[state.band]}`}</Text>
        <CheckInPicker
          enabled={checkInEnabled}
          level={checkIn}
          message={checkInMessage}
          onChange={onCheckIn}
        />
        <MoveList recommendation={recommendation} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  sheet: {
    position: 'absolute',
    left: 12,
    right: 12,
    bottom: 12,
    maxHeight: '65%',
    padding: 16,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#D5DDDB',
    gap: 8,
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
  scrollContent: { gap: 12, paddingBottom: 4 },
  reason: { fontSize: 14, color: '#26312F' },
  band: { fontSize: 12, color: '#5C6866' },
});
