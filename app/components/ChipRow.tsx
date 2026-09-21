import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { Option } from '../planFlow';

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
  label: { fontSize: 13, fontWeight: '600', color: '#26312F' },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { paddingVertical: 8, paddingHorizontal: 14, borderRadius: 18, backgroundColor: '#EEF1F2' },
  chipOn: { backgroundColor: '#1E7A6C' },
  chipText: { fontSize: 14, fontWeight: '600', color: '#26312F' },
  chipTextOn: { color: '#FFFFFF' },
});
