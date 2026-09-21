import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import type { Muscle } from '../engine';
import { BAND_ORDER, bandColor } from './body/colors';
import { hasMuscle, type BodySide } from './body/zones';
import BodyMap from './components/BodyMap';
import DayScrubber from './components/DayScrubber';
import MuscleSheet from './components/MuscleSheet';
import TagPrompt from './components/TagPrompt';
import { BAND_LABELS, checkInFeedback, needsTagNote, unmappedNote } from './copy';
import { recommend } from './mobility/recommend';
import { dayLabel, weekdayLabel } from './scrubber';
import type { SoreSpot } from './useSoreSpot';

const SIDES: readonly BodySide[] = ['front', 'back'];

interface Props {
  spot: SoreSpot;
}

/** The body map tab. The title, banner and disclaimer live in the app shell so they show on every tab. */
export default function BodyMapScreen({ spot }: Props) {
  const { width: screenWidth } = useWindowDimensions();
  const { forecast, sensitivity, untagged, checkIns, asOf } = spot;

  const [side, setSide] = useState<BodySide>('front');
  const [day, setDay] = useState(0);
  const [selected, setSelected] = useState<Muscle | null>(null);

  const mapWidth = Math.min(screenWidth - 48, 260);
  const dayForecast = forecast.byDay[day];
  const dayText = `${dayLabel(day)} (${weekdayLabel(asOf, day)})`;
  const selectedCheckIn = selected ? checkIns[selected] : undefined;

  const select = (muscle: Muscle) => setSelected((cur) => (cur === muscle ? null : muscle));
  // Keep the open sheet only if its muscle is drawn in the view we are switching to.
  const chooseSide = (next: BodySide) => {
    setSide(next);
    setSelected((cur) => (cur && hasMuscle(next, cur) ? cur : null));
  };

  return (
    <View style={styles.body}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.asOf}>
          {`Forecast from ${asOf.toISOString().slice(0, 16).replace('T', ' ')} UTC`}
        </Text>

        <View style={styles.toggle}>
          {SIDES.map((s) => (
            <Pressable
              key={s}
              onPress={() => chooseSide(s)}
              accessibilityRole="button"
              accessibilityState={{ selected: side === s }}
              style={[styles.toggleButton, side === s && styles.toggleButtonOn]}
            >
              <Text style={[styles.toggleText, side === s && styles.toggleTextOn]}>
                {s === 'front' ? 'Front' : 'Back'}
              </Text>
            </Pressable>
          ))}
        </View>

        <DayScrubber asOf={asOf} day={day} onChange={setDay} />

        <View style={styles.mapWrap}>
          <BodyMap
            side={side}
            forecast={dayForecast}
            selected={selected}
            onSelect={select}
            width={mapWidth}
          />
        </View>

        <View style={styles.legend}>
          {BAND_ORDER.map((band) => (
            <View key={band} style={styles.legendItem}>
              <View style={[styles.legendSwatch, { backgroundColor: bandColor(band) }]} />
              <Text style={styles.legendText}>{BAND_LABELS[band]}</Text>
            </View>
          ))}
          <Text style={styles.legendText}>predicted soreness</Text>
        </View>

        <TagPrompt sessions={untagged} onTag={spot.tagSession} />
        {forecast.needsTag.length > 0 && (
          <Text style={styles.note}>{needsTagNote(forecast.needsTag.length)}</Text>
        )}
        {forecast.unmappedSports.length > 0 && (
          <Text style={styles.note}>{unmappedNote(forecast.unmappedSports)}</Text>
        )}
        {/* Room for a typical sheet, so it does not hide the last lines. */}
        <View style={styles.spacer} />
      </ScrollView>

      {selected && (
        <MuscleSheet
          muscle={selected}
          state={dayForecast[selected]}
          dayText={dayText}
          checkInEnabled={day === 0}
          checkIn={selectedCheckIn}
          checkInMessage={
            selectedCheckIn === undefined
              ? undefined
              : checkInFeedback(selected, selectedCheckIn, 1, sensitivity[selected])
          }
          onCheckIn={(level) => spot.checkIn(selected, level)}
          // A check-in describes today, so it only shapes the advice on Now.
          recommendation={recommend(
            selected,
            dayForecast[selected].band,
            day === 0 ? selectedCheckIn : undefined,
          )}
          onClose={() => setSelected(null)}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  body: { flex: 1 },
  content: { padding: 16, paddingTop: 8, gap: 12 },
  asOf: { fontSize: 13, color: '#4B5856' },
  toggle: { flexDirection: 'row', gap: 8 },
  toggleButton: {
    paddingVertical: 8,
    paddingHorizontal: 18,
    borderRadius: 18,
    backgroundColor: '#EEF1F2',
  },
  toggleButtonOn: { backgroundColor: '#1E7A6C' },
  toggleText: { fontWeight: '600', color: '#26312F' },
  toggleTextOn: { color: '#FFFFFF' },
  mapWrap: { alignItems: 'center' },
  legend: { flexDirection: 'row', alignItems: 'center', gap: 14, flexWrap: 'wrap' },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendSwatch: { width: 16, height: 16, borderRadius: 8, borderWidth: 1, borderColor: '#B7C4C1' },
  legendText: { fontSize: 13, color: '#26312F' },
  note: { fontSize: 12, color: '#5C6866' },
  spacer: { height: 220 },
});
