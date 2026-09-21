import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import ChipRow from './components/ChipRow';
import HealthQuestions from './components/HealthQuestions';
import PlanResultView from './components/PlanResultView';
import TagPrompt from './components/TagPrompt';
import {
  BUILD_HINT,
  BUILD_PLAN,
  CHANGE_ANSWERS,
  DAYS_LABEL,
  EQUIPMENT_LABEL,
  GOAL_LABEL,
  PLAN_SKIP_TAGS,
  PLAN_TAG_GATE_HEADING,
  PLAN_TAG_GATE_TEXT,
  REQUEST_HEADING,
} from './planCopy';
import {
  DAYS_OPTIONS,
  DEFAULT_CHOICE,
  EQUIPMENT_OPTIONS,
  GOAL_OPTIONS,
  computePlan,
  type PlanChoice,
} from './planFlow';
import { initialScreening, isAnswered, type Screening } from './screening';
import type { SoreSpot } from './useSoreSpot';

interface Props {
  spot: SoreSpot;
}

/** Tag gate (when needed), then health questions and the request, then the plan or the reason there is none. */
export default function PlanScreen({ spot }: Props) {
  const [screening, setScreening] = useState<Screening>(initialScreening);
  const [choice, setChoice] = useState<PlanChoice>(DEFAULT_CHOICE);
  const [skippedTags, setSkippedTags] = useState(false);
  const [built, setBuilt] = useState(false);

  const gated = spot.untagged.length > 0 && !skippedTags;
  const setField = <K extends keyof PlanChoice>(key: K, value: PlanChoice[K]) =>
    setChoice((cur) => ({ ...cur, [key]: value }));

  if (gated) {
    return (
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.gate}>
          <Text style={styles.gateHeading}>{PLAN_TAG_GATE_HEADING}</Text>
          <Text style={styles.gateText}>{PLAN_TAG_GATE_TEXT}</Text>
        </View>
        <TagPrompt sessions={spot.untagged} onTag={spot.tagSession} />
        <Pressable onPress={() => setSkippedTags(true)} accessibilityRole="button" style={styles.secondary}>
          <Text style={styles.secondaryText}>{PLAN_SKIP_TAGS}</Text>
        </Pressable>
      </ScrollView>
    );
  }

  // Derived on every render, so a tag or check-in made after building can never leave an old plan on screen.
  const result = built
    ? computePlan({
        forecast: spot.forecast,
        workouts: spot.tagged,
        recovery: spot.replay.recovery ?? [],
        asOf: spot.asOf,
        screening,
        choice,
      })
    : null;

  return (
    // A different key for the form and the result gives each a fresh scroll view, so each opens at the top.
    <ScrollView key={result ? 'result' : 'form'} contentContainerStyle={styles.content}>
      {result ? (
        <>
          <PlanResultView result={result} asOf={spot.asOf} />
          <Pressable onPress={() => setBuilt(false)} accessibilityRole="button" style={styles.secondary}>
            <Text style={styles.secondaryText}>{CHANGE_ANSWERS}</Text>
          </Pressable>
        </>
      ) : (
        <>
          <HealthQuestions screening={screening} onChange={setScreening} />
          <View style={styles.request}>
            <Text style={styles.requestHeading}>{REQUEST_HEADING}</Text>
            <ChipRow label={GOAL_LABEL} options={GOAL_OPTIONS} value={choice.goal} onChange={(v) => setField('goal', v)} />
            <ChipRow label={DAYS_LABEL} options={DAYS_OPTIONS} value={choice.daysPerWeek} onChange={(v) => setField('daysPerWeek', v)} />
            <ChipRow label={EQUIPMENT_LABEL} options={EQUIPMENT_OPTIONS} value={choice.equipment} onChange={(v) => setField('equipment', v)} />
          </View>
          <Pressable
            onPress={() => setBuilt(true)}
            disabled={!isAnswered(screening)}
            accessibilityRole="button"
            accessibilityState={{ disabled: !isAnswered(screening) }}
            style={[styles.primary, !isAnswered(screening) && styles.primaryOff]}
          >
            <Text style={styles.primaryText}>{BUILD_PLAN}</Text>
          </Pressable>
          {!isAnswered(screening) && <Text style={styles.hint}>{BUILD_HINT}</Text>}
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, paddingTop: 8, gap: 12, paddingBottom: 32 },
  gate: { gap: 4 },
  gateHeading: { fontSize: 18, fontWeight: '700', color: '#16211F' },
  gateText: { fontSize: 13, color: '#4B5856' },
  request: { gap: 12, padding: 12, borderRadius: 12, backgroundColor: '#F6F8F8', borderWidth: 1, borderColor: '#E3EAE8' },
  requestHeading: { fontSize: 16, fontWeight: '700', color: '#16211F' },
  primary: { alignItems: 'center', paddingVertical: 14, borderRadius: 24, backgroundColor: '#1E7A6C' },
  primaryOff: { backgroundColor: '#B7C4C1' },
  primaryText: { fontSize: 16, fontWeight: '700', color: '#FFFFFF' },
  secondary: { alignItems: 'center', paddingVertical: 12, borderRadius: 24, backgroundColor: '#EEF1F2' },
  secondaryText: { fontSize: 15, fontWeight: '600', color: '#26312F' },
  hint: { fontSize: 12, color: '#5C6866', textAlign: 'center' },
});
