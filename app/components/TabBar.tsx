import { Pressable, StyleSheet, Text, View } from 'react-native';
import { TAB_LABELS } from '../planCopy';
import { colors, space } from '../theme';
import TabIcon from './TabIcon';

export type Tab = keyof typeof TAB_LABELS;
export const TABS: readonly Tab[] = ['body', 'plan', 'evidence'];

interface Props {
  tab: Tab;
  onChange: (tab: Tab) => void;
}

export default function TabBar({ tab, onChange }: Props) {
  return (
    <View accessibilityRole="tablist" style={styles.bar}>
      {TABS.map((t) => {
        const on = tab === t;
        return (
          <Pressable
            key={t}
            onPress={() => onChange(t)}
            accessibilityRole="tab"
            aria-selected={tab === t}
            style={[styles.tab, on && styles.tabOn]}
          >
            <TabIcon name={t} color={on ? colors.accent : colors.muted} />
            <Text style={[styles.tabText, on && styles.tabTextOn]}>{TAB_LABELS[t]}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.card,
    paddingBottom: space.md,
  },
  tab: { flex: 1, alignItems: 'center', gap: space.xs, paddingTop: space.md, paddingBottom: space.xs },
  tabOn: { borderTopWidth: 2, borderTopColor: colors.accent, marginTop: -1 },
  tabText: { fontSize: 11, fontWeight: '700', letterSpacing: 0.6, textTransform: 'uppercase', color: colors.muted },
  tabTextOn: { color: colors.accent },
});
