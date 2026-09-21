import { StyleSheet, Text, View } from 'react-native';
import { PLAN_DISCLAIMER, type PlanResult } from '../../engine';
import { BLOCKED_HEADING, NOTES_HEADING, PLAN_HEADING, WHY_HEADING } from '../planCopy';
import { planDayHeading, setsAndReps } from '../planFlow';

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
  wrap: { gap: 12 },
  heading: { fontSize: 18, fontWeight: '700', color: '#16211F' },
  notes: { gap: 4, padding: 12, borderRadius: 12, backgroundColor: '#FFF7ED', borderWidth: 1, borderColor: '#F3D9B5' },
  notesHeading: { fontSize: 13, fontWeight: '700', color: '#7A3E08' },
  noteText: { fontSize: 13, color: '#5B3A12' },
  card: { gap: 6, padding: 12, borderRadius: 12, backgroundColor: '#F6F8F8', borderWidth: 1, borderColor: '#E3EAE8' },
  cardRest: { backgroundColor: '#FFFFFF' },
  cardDay: { fontSize: 12, fontWeight: '700', color: '#1E5F55' },
  cardTitle: { fontSize: 16, fontWeight: '700', color: '#16211F' },
  exercise: { gap: 2, marginTop: 4 },
  exerciseName: { fontSize: 14, fontWeight: '600', color: '#26312F' },
  exerciseLine: { fontSize: 13, color: '#4B5856' },
  exerciseNote: { fontSize: 12, color: '#7A3E08' },
  why: { gap: 2, marginTop: 6 },
  whyHeading: { fontSize: 12, fontWeight: '700', color: '#4B5856' },
  whyText: { fontSize: 12, color: '#5C6866' },
  disclaimer: { fontSize: 12, color: '#5C6866' },
  blocked: { gap: 6, padding: 14, borderRadius: 12, backgroundColor: '#FFF7ED', borderWidth: 1, borderColor: '#F3D9B5' },
  blockedHeading: { fontSize: 16, fontWeight: '700', color: '#7A3E08' },
  blockedText: { fontSize: 14, color: '#5B3A12' },
});
