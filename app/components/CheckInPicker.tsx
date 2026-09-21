import { Pressable, StyleSheet, Text, View } from 'react-native';
import { CHECKIN_LEVELS, type CheckInLevel } from '../checkin';
import { CHECKIN_LABELS, CHECKIN_NOT_TODAY, CHECKIN_PROMPT } from '../copy';
import { colors, radius, space, type } from '../theme';

interface Props {
  /** Check-ins describe today, so the picker is only active on Now. */
  enabled: boolean;
  level?: CheckInLevel;
  /** What the last check-in did, in words. */
  message?: string;
  onChange: (level: CheckInLevel) => void;
}

export default function CheckInPicker({ enabled, level, message, onChange }: Props) {
  if (!enabled) return <Text style={styles.hint}>{CHECKIN_NOT_TODAY}</Text>;
  return (
    <View style={styles.wrap}>
      <Text style={styles.prompt}>{CHECKIN_PROMPT}</Text>
      <View accessibilityRole="radiogroup" accessibilityLabel={CHECKIN_PROMPT} style={styles.row}>
        {CHECKIN_LEVELS.map((l) => (
          <Pressable
            key={l}
            onPress={() => onChange(l)}
            hitSlop={4}
            accessibilityRole="radio"
            aria-checked={level === l}
            style={[styles.chip, level === l && styles.chipOn]}
          >
            <Text style={[styles.chipText, level === l && styles.chipTextOn]}>
              {CHECKIN_LABELS[l]}
            </Text>
          </Pressable>
        ))}
      </View>
      {message ? <Text style={styles.message}>{message}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: space.sm },
  prompt: { ...type.label, color: colors.dim },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  chip: { paddingVertical: space.sm, paddingHorizontal: 14, borderRadius: radius.pill, backgroundColor: colors.card },
  chipOn: { backgroundColor: colors.accent },
  chipText: { fontSize: 13, fontWeight: '700', color: colors.dim },
  chipTextOn: { color: colors.onAccent },
  message: { ...type.body },
  hint: { ...type.small },
});
