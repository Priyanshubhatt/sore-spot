import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { StrengthTag } from '../../engine';
import { TAG_HEADING, TAG_LABELS, TAG_PROMPT } from '../copy';
import { TAG_OPTIONS } from '../tagging';

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
  wrap: { gap: 6, padding: 12, borderRadius: 12, backgroundColor: '#F6F8F8', borderWidth: 1, borderColor: '#E3EAE8' },
  heading: { fontSize: 14, fontWeight: '700', color: '#16211F' },
  prompt: { fontSize: 12, color: '#5C6866' },
  session: { gap: 6, marginTop: 6 },
  label: { fontSize: 13, fontWeight: '600', color: '#26312F' },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { paddingVertical: 8, paddingHorizontal: 12, borderRadius: 16, backgroundColor: '#E3EEEC' },
  chipText: { fontSize: 13, fontWeight: '600', color: '#1E5F55' },
});
