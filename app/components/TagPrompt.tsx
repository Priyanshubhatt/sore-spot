import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { StrengthTag } from '../../engine';
import { TAG_HEADING, TAG_LABELS, TAG_PROMPT } from '../copy';
import { TAG_OPTIONS } from '../tagging';
import { colors, radius, space, type } from '../theme';

export interface UntaggedSession {
  id: string;
  label: string;
}

interface Props {
  sessions: UntaggedSession[];
  onTag: (id: string, tag: StrengthTag) => void;
}

/** Strength sessions carry no muscle data, so the member says which muscles each one worked. */
export default function TagPrompt({ sessions, onTag }: Props) {
  if (sessions.length === 0) return null;
  return (
    <View style={styles.wrap}>
      <Text style={styles.heading}>{TAG_HEADING}</Text>
      <Text style={styles.prompt}>{TAG_PROMPT}</Text>
      {sessions.map((session) => (
        <View key={session.id} style={styles.session}>
          <Text style={styles.label}>{session.label}</Text>
          <View style={styles.row}>
            {TAG_OPTIONS.map((tag) => (
              <Pressable
                key={tag}
                onPress={() => onTag(session.id, tag)}
                hitSlop={4}
                accessibilityRole="button"
                accessibilityLabel={`${session.label}: ${TAG_LABELS[tag]}`}
                style={styles.chip}
              >
                <Text style={styles.chipText}>{TAG_LABELS[tag]}</Text>
              </Pressable>
            ))}
          </View>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: 6,
    padding: space.lg,
    borderRadius: radius.md,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
  },
  heading: { ...type.heading },
  prompt: { ...type.small },
  session: { gap: 6, marginTop: 6 },
  label: { ...type.strong },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  chip: { paddingVertical: space.sm, paddingHorizontal: space.md, borderRadius: radius.pill, backgroundColor: colors.accentSoft },
  chipText: { fontSize: 13, fontWeight: '700', color: colors.accent },
});
