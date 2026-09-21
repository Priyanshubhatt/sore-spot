import { useMemo, useRef } from 'react';
import { LayoutChangeEvent, PanResponder, StyleSheet, Text, View } from 'react-native';
import { FORECAST_DAYS } from '../../engine/constants';
import { dayIndexFromX, dayLabel, weekdayLabel } from '../scrubber';
import { colors, radius } from '../theme';

interface Props {
  asOf: Date;
  day: number;
  onChange: (day: number) => void;
}

/** Eight day segments. Tap one, or drag across the track. */
export default function DayScrubber({ asOf, day, onChange }: Props) {
  const widthRef = useRef(0);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  const pan = useMemo(() => {
    const pick = (x: number) => onChangeRef.current(dayIndexFromX(x, widthRef.current));
    return PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (e) => pick(e.nativeEvent.locationX),
      onPanResponderMove: (e) => pick(e.nativeEvent.locationX),
    });
  }, []);

  const onLayout = (e: LayoutChangeEvent) => {
    widthRef.current = e.nativeEvent.layout.width;
  };

  return (
    <View
      style={styles.track}
      onLayout={onLayout}
      accessibilityRole="adjustable"
      accessibilityLabel="Forecast day"
      accessibilityValue={{ text: dayLabel(day) }}
      {...pan.panHandlers}
    >
      {Array.from({ length: FORECAST_DAYS }, (_, d) => (
        // pointerEvents none: touches land on the track, so locationX is relative to it.
        <View key={d} pointerEvents="none" style={[styles.cell, d === day && styles.cellSelected]}>
          <Text style={[styles.label, d === day && styles.labelSelected]}>{dayLabel(d)}</Text>
          <Text style={[styles.weekday, d === day && styles.labelSelected]}>
            {weekdayLabel(asOf, d)}
          </Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    flexDirection: 'row',
    borderRadius: radius.sm,
    backgroundColor: colors.raised,
    overflow: 'hidden',
    // On web a drag would otherwise start a text selection, which cancels the pan.
    userSelect: 'none',
  },
  cell: { flex: 1, alignItems: 'center', paddingVertical: 9 },
  cellSelected: { backgroundColor: colors.accent },
  label: { fontSize: 13, fontWeight: '700', color: colors.text },
  weekday: { fontSize: 11, color: colors.muted },
  labelSelected: { color: colors.onAccent },
});
