import { ScrollView, StyleSheet, Text } from 'react-native';
import { loadReplay } from '../data';
import { computeForecast, defaultSensitivity, MUSCLES } from '../engine';

const AS_OF = new Date('2026-09-19T20:00:00Z');

export default function HelloScreen() {
  const replay = loadReplay();
  const forecast = computeForecast(replay.workouts, AS_OF, defaultSensitivity());
  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Sore Spot: engine check</Text>
      {replay.synthetic && <Text style={styles.banner}>SYNTHETIC DATA</Text>}
      <Text>{`As of ${AS_OF.toISOString()}`}</Text>
      {MUSCLES.map((m) => (
        <Text key={m} style={styles.row}>
          {m.padEnd(10)} {forecast.byDay.map((d) => d[m].band[0].toUpperCase()).join(' ')}
        </Text>
      ))}
      <Text>{`Needs tag: ${forecast.needsTag.length}, unmapped sports: ${forecast.unmappedSports.length}`}</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 24, paddingTop: 64, gap: 8 },
  title: { fontSize: 20, fontWeight: '600' },
  banner: { color: '#b45309', fontWeight: '700' },
  row: { fontFamily: 'Courier', fontSize: 14 },
});
