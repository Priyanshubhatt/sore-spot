import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { loadReplay } from '../data';
import { computeForecast, defaultSensitivity, type Muscle, type StrengthTag } from '../engine';
import { DEMO_AS_OF } from './config';
import { BAND_ORDER, bandColor } from './body/colors';
import { hasMuscle, type BodySide } from './body/zones';
import { sensitivityFromCheckIns, type CheckInLevel, type CheckIns } from './checkin';
import BodyMap from './components/BodyMap';
import DayScrubber from './components/DayScrubber';
import MuscleSheet from './components/MuscleSheet';
import TagPrompt from './components/TagPrompt';
import {
  BAND_LABELS,
  DISCLAIMER,
  SYNTHETIC_BANNER,
  checkInFeedback,
  needsTagNote,
  unmappedNote,
} from './copy';
import { recommend } from './mobility/recommend';
import { dayLabel, weekdayLabel } from './scrubber';
import { applyTags, describeWorkout, type Tags } from './tagging';

const SIDES: readonly BodySide[] = ['front', 'back'];

export default function BodyMapScreen() {
  const { width: screenWidth } = useWindowDimensions();
  const replay = useMemo(() => loadReplay(), []);

  const [side, setSide] = useState<BodySide>('front');
  const [day, setDay] = useState(0);
  const [selected, setSelected] = useState<Muscle | null>(null);
  const [checkIns, setCheckIns] = useState<CheckIns>({});
  const [tags, setTags] = useState<Tags>({});

  // Tags change which muscles a session loads. Check-ins are then rebuilt from the default
  // sensitivity and the default forecast for Now, so they never stack.
  const tagged = useMemo(() => applyTags(replay.workouts, tags), [replay, tags]);
  const base = useMemo(
    () => computeForecast(tagged, DEMO_AS_OF, defaultSensitivity()),
    [tagged],
  );
  const sensitivity = useMemo(
    () => sensitivityFromCheckIns(checkIns, base.byDay[0]),
    [checkIns, base],
  );
  const forecast = useMemo(
    () => computeForecast(tagged, DEMO_AS_OF, sensitivity),
    [tagged, sensitivity],
  );

  const untagged = useMemo(
    () =>
      tagged
        .filter((w) => forecast.needsTag.includes(w.id))
        .map((w) => ({ id: w.id, label: describeWorkout(w) })),
    [tagged, forecast],
  );

  const mapWidth = Math.min(screenWidth - 48, 260);
  const dayForecast = forecast.byDay[day];
  const dayText = `${dayLabel(day)} (${weekdayLabel(DEMO_AS_OF, day)})`;
  const selectedCheckIn = selected ? checkIns[selected] : undefined;

  const select = (muscle: Muscle) => setSelected((cur) => (cur === muscle ? null : muscle));
  // Keep the open sheet only if its muscle is drawn in the view we are switching to.
  const chooseSide = (next: BodySide) => {
    setSide(next);
    setSelected((cur) => (cur && hasMuscle(next, cur) ? cur : null));
  };
  const checkIn = (muscle: Muscle, level: CheckInLevel) =>
    setCheckIns((cur) => ({ ...cur, [muscle]: level }));
  const tagSession = (id: string, tag: StrengthTag) => setTags((cur) => ({ ...cur, [id]: tag }));

  return (
    <View style={styles.root}>
      {/* Header and footer sit outside the ScrollView so the label and the disclaimer are always visible. */}
      <View style={styles.header}>
        <Text style={styles.title}>Sore Spot</Text>
        {replay.synthetic && <Text style={styles.banner}>{SYNTHETIC_BANNER}</Text>}
      </View>

      <View style={styles.body}>
        <ScrollView contentContainerStyle={styles.content}>
          <Text style={styles.asOf}>
            {`Forecast from ${DEMO_AS_OF.toISOString().slice(0, 16).replace('T', ' ')} UTC`}
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

          <DayScrubber asOf={DEMO_AS_OF} day={day} onChange={setDay} />

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

          <TagPrompt sessions={untagged} onTag={tagSession} />
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
            onCheckIn={(level) => checkIn(selected, level)}
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

      <View style={styles.footer}>
        <Text style={styles.note}>{DISCLAIMER}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#FFFFFF' },
  header: { paddingTop: 56, paddingHorizontal: 16, paddingBottom: 8, gap: 4 },
  body: { flex: 1 },
  content: { padding: 16, paddingTop: 8, gap: 12 },
  footer: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: '#E3EAE8',
    backgroundColor: '#FFFFFF',
  },
  title: { fontSize: 24, fontWeight: '700', color: '#16211F' },
  banner: { color: '#B45309', fontWeight: '700' },
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
