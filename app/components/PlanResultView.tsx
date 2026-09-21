import { StyleSheet, Text, View } from 'react-native';
import { PLAN_DISCLAIMER, type PlanResult } from '../../engine';
import { BLOCKED_HEADING, NOTES_HEADING, PLAN_HEADING, WHY_HEADING } from '../planCopy';
import { planDayHeading, setsAndReps } from '../planFlow';
import { colors, radius, space, type } from '../theme';

interface Props {
  result: PlanResult;
  asOf: Date;
}

/** Either the reason there is no plan, or the 7-day plan with the reason for every choice. */
export default function PlanResultView({ result, asOf }: Props) {
  if (result.kind === 'blocked') {
    return (
      <View style={styles.blocked}>
        <Text style={styles.blockedHeading}>{BLOCKED_HEADING}</Text>
        <Text style={styles.blockedText}>{result.message}</Text>
      </View>
    );
  }
  const { plan } = result;
  return (
    <View style={styles.wrap}>
      <Text style={styles.heading}>{PLAN_HEADING}</Text>
      {plan.notes.length > 0 && (
        <View style={styles.notes}>
          <Text style={styles.notesHeading}>{NOTES_HEADING}</Text>
          {plan.notes.map((note) => (
            <Text key={note} style={styles.noteText}>{`• ${note}`}</Text>
          ))}
        </View>
      )}
      {plan.days.map((session) => (
        <View key={session.day} style={[styles.card, session.kind === 'rest' && styles.cardRest]}>
          <Text style={styles.cardDay}>{planDayHeading(asOf, session.day)}</Text>
          <Text style={styles.cardTitle}>{session.title}</Text>
          {session.exercises.map((exercise) => (
            <View key={exercise.id} style={styles.exercise}>
              <Text style={styles.exerciseName}>{exercise.name}</Text>
              <Text style={styles.exerciseLine}>{`${setsAndReps(exercise)} · ${exercise.effort}`}</Text>
              {exercise.note !== undefined && <Text style={styles.exerciseNote}>{exercise.note}</Text>}
            </View>
          ))}
          {session.why.length > 0 && (
            <View style={styles.why}>
              <Text style={styles.whyHeading}>{WHY_HEADING}</Text>
              {session.why.map((line) => (
                <Text key={line} style={styles.whyText}>{`• ${line}`}</Text>
              ))}
            </View>
          )}
        </View>
      ))}
      <Text style={styles.disclaimer}>{PLAN_DISCLAIMER}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: space.md },
  heading: { ...type.title },
  notes: {
    gap: space.xs,
    padding: space.lg,
    borderRadius: radius.md,
    backgroundColor: colors.warnBg,
    borderWidth: 1,
    borderColor: colors.warnBorder,
  },
  notesHeading: { ...type.label, color: colors.warnText },
  noteText: { fontSize: 13, lineHeight: 19, color: colors.warnText },
  card: {
    gap: 6,
    padding: space.lg,
    borderRadius: radius.md,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardRest: { backgroundColor: colors.bg },
  cardDay: { ...type.label, color: colors.accent },
  cardTitle: { ...type.heading, fontSize: 18 },
  exercise: { gap: 2, marginTop: space.xs },
  exerciseName: { ...type.strong },
  exerciseLine: { ...type.body },
  exerciseNote: { fontSize: 12, color: colors.warnText },
  why: { gap: 2, marginTop: 6 },
  whyHeading: { ...type.label },
  whyText: { ...type.small },
  disclaimer: { ...type.small },
  blocked: {
    gap: 6,
    padding: space.lg,
    borderRadius: radius.md,
    backgroundColor: colors.warnBg,
    borderWidth: 1,
    borderColor: colors.warnBorder,
  },
  blockedHeading: { ...type.heading, fontSize: 18, color: colors.warnText },
  blockedText: { fontSize: 14, lineHeight: 20, color: colors.warnText },
});
