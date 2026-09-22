import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import type { Muscle } from '../engine';
import { BAND_ORDER, bandColor } from './body/colors';
import { hasMuscle, type BodySide } from './body/zones';
import ActivityHistory from './components/ActivityHistory';
import BodyMap from './components/BodyMap';
import DayScrubber from './components/DayScrubber';
import MuscleSheet from './components/MuscleSheet';
import SummaryStrip from './components/SummaryStrip';
import TagPrompt from './components/TagPrompt';
import { BAND_LABELS, HISTORY_HEADING, HISTORY_SUBTEXT, REST_DAY_TEXT, checkInFeedback, needsTagNote, unmappedNote } from './copy';
import { recentHistory } from './history';
import { recommend } from './mobility/recommend';
import { dateLabel, weekdayLabel } from './scrubber';
import { colors, radius, space, type } from './theme';
import type { SoreSpot } from './useSoreSpot';

const SIDES: readonly BodySide[] = ['front', 'back'];

interface Props {
  spot: SoreSpot;
}

/** The body map tab. The title, banner and disclaimer live in the app shell so they show on every tab. */
export default function BodyMapScreen({ spot }: Props) {
  const { width: screenWidth } = useWindowDimensions();
  const { forecast, sensitivity, tagged, untagged, checkIns, asOf } = spot;

  const [side, setSide] = useState<BodySide>('front');
  const [day, setDay] = useState(0);
  const [selected, setSelected] = useState<Muscle | null>(null);

  const mapWidth = Math.min(screenWidth - 48, 260);
  const dayForecast = forecast.byDay[day];
  const dayText = `${dateLabel(asOf, day)} (${weekdayLabel(asOf, day)})`;
  const selectedCheckIn = selected ? checkIns[selected] : undefined;
  const history = useMemo(() => recentHistory(tagged, asOf, sensitivity), [tagged, asOf, sensitivity]);

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

        <SummaryStrip day={dayForecast} dayText={dayText} />

        <View accessibilityRole="radiogroup" accessibilityLabel="Body view" style={styles.toggle}>
          {SIDES.map((s) => (
            <Pressable
              key={s}
              onPress={() => chooseSide(s)}
              accessibilityRole="radio"
              aria-checked={side === s}
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

        <View style={styles.historyBlock}>
          <Text style={styles.historyHeading}>{HISTORY_HEADING}</Text>
          <Text style={styles.historySubtext}>{HISTORY_SUBTEXT}</Text>
          <ActivityHistory asOf={asOf} days={history} restText={REST_DAY_TEXT} />
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
  content: { padding: space.lg, paddingTop: space.sm, gap: space.md },
  asOf: { ...type.label },
  toggle: {
    flexDirection: 'row',
    padding: 3,
    borderRadius: radius.pill,
    backgroundColor: colors.raised,
    alignSelf: 'flex-start',
  },
  toggleButton: { paddingVertical: space.sm, paddingHorizontal: 22, borderRadius: radius.pill },
  toggleButtonOn: { backgroundColor: colors.accent },
  toggleText: { fontWeight: '700', color: colors.dim },
  toggleTextOn: { color: colors.onAccent },
  mapWrap: { alignItems: 'center' },
  historyBlock: { gap: 6 },
  historyHeading: { ...type.heading },
  historySubtext: { ...type.small, marginBottom: 2 },
  legend: { flexDirection: 'row', alignItems: 'center', gap: 14, flexWrap: 'wrap' },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendSwatch: { width: 14, height: 14, borderRadius: 7 },
  legendText: { ...type.small },
  note: { ...type.small },
  spacer: { height: 220 },
});
