import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import type { Muscle, MuscleState } from '../../engine';
import { BAND_LABELS, MUSCLE_LABELS, SAFETY_LINE, bandPhrase, reasonsFor } from '../copy';
import { bandColor } from '../body/colors';
import type { CheckInLevel } from '../checkin';
import type { Recommendation } from '../mobility/recommend';
import { colors, radius, space, type } from '../theme';
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
      <Text style={styles.safety}>{SAFETY_LINE}</Text>
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
    left: space.md,
    right: space.md,
    bottom: space.md,
    maxHeight: '65%',
    padding: space.lg,
    borderRadius: radius.md,
    backgroundColor: colors.raised,
    borderWidth: 1,
    borderColor: colors.border,
    gap: space.sm,
    shadowColor: colors.shadow,
    shadowOpacity: 0.5,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
  },
  header: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  swatch: { width: 22, height: 22, borderRadius: 11 },
  headerText: { flex: 1 },
  title: { ...type.heading, fontSize: 18 },
  subtitle: { ...type.small },
  close: { fontSize: 14, fontWeight: '700', color: colors.accent, padding: space.xs },
  scrollContent: { gap: space.md, paddingBottom: space.xs },
  reason: { ...type.body },
  band: { ...type.small },
  safety: { fontSize: 12, fontWeight: '600', color: colors.warnText },
});
