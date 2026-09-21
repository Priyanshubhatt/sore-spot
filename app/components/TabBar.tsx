import { Pressable, StyleSheet, Text, View } from 'react-native';
import { TAB_LABELS } from '../planCopy';

export type Tab = keyof typeof TAB_LABELS;
export const TABS: readonly Tab[] = ['body', 'plan', 'evidence'];

interface Props {
  tab: Tab;
  onChange: (tab: Tab) => void;
}

export default function TabBar({ tab, onChange }: Props) {
  return (
    <View accessibilityRole="tablist" style={styles.bar}>
      {TABS.map((t) => (
        <Pressable
          key={t}
          onPress={() => onChange(t)}
          accessibilityRole="tab"
          aria-selected={tab === t}
          style={[styles.tab, tab === t && styles.tabOn]}
        >
          <Text style={[styles.tabText, tab === t && styles.tabTextOn]}>{TAB_LABELS[t]}</Text>
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: { flexDirection: 'row', borderTopWidth: 1, borderTopColor: '#E3EAE8', backgroundColor: '#FFFFFF', paddingBottom: 12 },
  tab: { flex: 1, alignItems: 'center', paddingVertical: 12 },
  tabOn: { borderTopWidth: 3, borderTopColor: '#1E7A6C', marginTop: -1 },
  tabText: { fontSize: 15, fontWeight: '600', color: '#5C6866' },
  tabTextOn: { color: '#1E7A6C' },
});
