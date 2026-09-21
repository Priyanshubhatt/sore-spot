import { StatusBar } from 'expo-status-bar';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import BodyMapScreen from './app/BodyMapScreen';
import EvidenceScreen from './app/EvidenceScreen';
import PlanScreen from './app/PlanScreen';
import TabBar, { type Tab } from './app/components/TabBar';
import { DISCLAIMER, SYNTHETIC_BANNER } from './app/copy';
import { INDEPENDENT_LINE } from './app/planCopy';
import { colors, space, type } from './app/theme';
import { useSoreSpot } from './app/useSoreSpot';

export default function App() {
  const spot = useSoreSpot();
  const [tab, setTab] = useState<Tab>('body');

  return (
    <View style={styles.root}>
      {/* The label and the disclaimer sit outside the tabs, so they are always visible. */}
      <View style={styles.header}>
        <Text style={styles.title}>Sore Spot</Text>
        <Text style={styles.independent}>{INDEPENDENT_LINE}</Text>
        {spot.replay.synthetic && <Text style={styles.banner}>{SYNTHETIC_BANNER}</Text>}
      </View>

      {/* All three tabs stay mounted, so switching keeps the day, side and plan answers. */}
      <View style={[styles.tab, tab !== 'body' && styles.hidden]}>
        <BodyMapScreen spot={spot} />
      </View>
      <View style={[styles.tab, tab !== 'plan' && styles.hidden]}>
        <PlanScreen spot={spot} />
      </View>
      <View style={[styles.tab, tab !== 'evidence' && styles.hidden]}>
        <EvidenceScreen />
      </View>

      <View style={styles.footer}>
        <Text style={styles.note}>{DISCLAIMER}</Text>
      </View>
      <TabBar tab={tab} onChange={setTab} />
      <StatusBar style="light" />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  header: { paddingTop: 56, paddingHorizontal: space.lg, paddingBottom: space.sm, gap: space.xs },
  tab: { flex: 1 },
  hidden: { display: 'none' },
  footer: {
    paddingHorizontal: space.lg,
    paddingVertical: space.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.card,
  },
  title: { ...type.title },
  independent: { ...type.small },
  banner: { fontSize: 11, fontWeight: '800', letterSpacing: 1.2, color: colors.banner },
  note: { ...type.small },
});
