import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { Option } from '../planFlow';
import { colors, radius, space, type } from '../theme';

interface Props<T> {
  label: string;
  options: Option<T>[];
  value: T;
  onChange: (value: T) => void;
}

/** A labelled row of single-choice chips. */
export default function ChipRow<T extends string | number>({ label, options, value, onChange }: Props<T>) {
  return (
    <View style={styles.wrap}>
      <Text style={styles.label}>{label}</Text>
      <View accessibilityRole="radiogroup" accessibilityLabel={label} style={styles.row}>
        {options.map((option) => {
          const on = option.value === value;
          return (
            <Pressable
              key={String(option.value)}
              onPress={() => onChange(option.value)}
              hitSlop={4}
              accessibilityRole="radio"
              accessibilityLabel={`${label}: ${option.label}`}
              aria-checked={on}
              style={[styles.chip, on && styles.chipOn]}
            >
              <Text style={[styles.chipText, on && styles.chipTextOn]}>{option.label}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 6 },
  label: { ...type.label, color: colors.dim },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  chip: { paddingVertical: space.sm, paddingHorizontal: space.lg, borderRadius: radius.pill, backgroundColor: colors.raised },
  chipOn: { backgroundColor: colors.accent },
  chipText: { fontSize: 14, fontWeight: '700', color: colors.dim },
  chipTextOn: { color: colors.onAccent },
});
