import { Pressable, StyleSheet, Text, View } from 'react-native';
import {
  MEDICAL_CONDITION_QUESTION,
  RED_FLAGS,
  RED_FLAG_PROMPT,
  RED_FLAG_QUESTIONS,
  UNDER_18_QUESTION,
} from '../../engine';
import { HEALTH_HEADING, HEALTH_INTRO, NONE_OF_THESE, NO, YES } from '../planCopy';
import {
  answerMedicalCondition,
  answerNoRedFlags,
  answerUnder18,
  toggleRedFlag,
  type Screening,
} from '../screening';
import { colors, radius, space, type } from '../theme';

interface Props {
  screening: Screening;
  onChange: (next: Screening) => void;
}

function YesNo({ question, value, onAnswer }: { question: string; value: boolean | null; onAnswer: (v: boolean) => void }) {
  return (
    <View style={styles.block}>
      <Text style={styles.question}>{question}</Text>
      <View accessibilityRole="radiogroup" accessibilityLabel={question} style={styles.row}>
        {[true, false].map((answer) => (
          <Pressable
            key={String(answer)}
            onPress={() => onAnswer(answer)}
            hitSlop={4}
            accessibilityRole="radio"
            accessibilityLabel={`${question} ${answer ? YES : NO}`}
            aria-checked={value === answer}
            style={[styles.chip, value === answer && styles.chipOn]}
          >
            <Text style={[styles.chipText, value === answer && styles.chipTextOn]}>{answer ? YES : NO}</Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

/** Every answer starts empty. Nothing here is ever pre-answered "no". */
export default function HealthQuestions({ screening, onChange }: Props) {
  const none = screening.redFlags !== null && screening.redFlags.length === 0;
  return (
    <View style={styles.wrap}>
      <Text style={styles.heading}>{HEALTH_HEADING}</Text>
      <Text style={styles.intro}>{HEALTH_INTRO}</Text>

      <View style={styles.block}>
        <Text style={styles.question}>{RED_FLAG_PROMPT}</Text>
        {RED_FLAGS.map((flag) => {
          const on = screening.redFlags?.includes(flag) ?? false;
          return (
            <Pressable
              key={flag}
              onPress={() => onChange(toggleRedFlag(screening, flag))}
              accessibilityRole="checkbox"
              accessibilityLabel={RED_FLAG_QUESTIONS[flag]}
              aria-checked={on}
              style={[styles.flag, on && styles.flagOn]}
            >
              <Text style={[styles.flagText, on && styles.flagTextOn]}>{`${on ? '☑' : '☐'}  ${RED_FLAG_QUESTIONS[flag]}`}</Text>
            </Pressable>
          );
        })}
        <Pressable
          onPress={() => onChange(answerNoRedFlags(screening))}
          hitSlop={4}
          accessibilityRole="checkbox"
          accessibilityLabel={NONE_OF_THESE}
          aria-checked={none}
          style={[styles.chip, none && styles.chipOn]}
        >
          <Text style={[styles.chipText, none && styles.chipTextOn]}>{NONE_OF_THESE}</Text>
        </Pressable>
      </View>

      <YesNo
        question={UNDER_18_QUESTION}
        value={screening.under18}
        onAnswer={(v) => onChange(answerUnder18(screening, v))}
      />
      <YesNo
        question={MEDICAL_CONDITION_QUESTION}
        value={screening.medicalCondition}
        onAnswer={(v) => onChange(answerMedicalCondition(screening, v))}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: space.lg,
    padding: space.lg,
    borderRadius: radius.md,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
  },
  heading: { ...type.heading, fontSize: 18 },
  intro: { ...type.small },
  block: { gap: space.sm },
  question: { ...type.strong },
  row: { flexDirection: 'row', gap: space.sm },
  flag: {
    paddingVertical: space.sm,
    paddingHorizontal: 10,
    borderRadius: radius.sm,
    backgroundColor: colors.raised,
    borderWidth: 1,
    borderColor: colors.border,
  },
  flagOn: { borderColor: colors.warnText, backgroundColor: colors.warnBg },
  flagText: { ...type.body },
  flagTextOn: { color: colors.warnText },
  chip: { alignSelf: 'flex-start', paddingVertical: space.sm, paddingHorizontal: space.lg, borderRadius: radius.pill, backgroundColor: colors.raised },
  chipOn: { backgroundColor: colors.accent },
  chipText: { fontSize: 14, fontWeight: '700', color: colors.dim },
  chipTextOn: { color: colors.onAccent },
});
