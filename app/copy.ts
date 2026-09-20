import type { Driver, Muscle, MuscleState, RiskBand, StrengthTag } from '../engine';
import type { CheckInLevel } from './checkin';
import type { EvidenceTag } from './mobility/library';

export const MUSCLE_LABELS: Record<Muscle, string> = {
  chest: 'Chest',
  shoulders: 'Shoulders',
  biceps: 'Biceps',
  triceps: 'Triceps',
  forearms: 'Forearms',
  upperBack: 'Upper back',
  core: 'Core',
  glutes: 'Glutes',
  quads: 'Quads',
  hamstrings: 'Hamstrings',
  calves: 'Calves',
  adductors: 'Inner thighs',
};

export const BAND_LABELS: Record<RiskBand, string> = {
  low: 'Low',
  moderate: 'Moderate',
  high: 'High',
};

export const DRIVER_TEXT: Record<Driver, string> = {
  novel: 'New or bigger than your recent routine.',
  eccentric:
    'Includes lengthening work (downhill, decelerating, lowering), which drives soreness most.',
  'high-load': 'A lot of total work for this muscle.',
};

export const NO_SORENESS_TEXT = 'No notable soreness predicted.';
export const GENERIC_REASON_TEXT = 'Predicted from your recent workouts.';

export const DISCLAIMER =
  'Predicted from your workouts, not measured. General wellness guidance, not medical advice.';
export const SYNTHETIC_BANNER = 'SYNTHETIC DATA';

/** "Moderate predicted soreness" */
export function bandPhrase(band: RiskBand): string {
  return `${BAND_LABELS[band]} predicted soreness`;
}

/** Screen-reader label for a body zone. */
export function zoneA11yLabel(muscle: Muscle, band: RiskBand): string {
  return `${MUSCLE_LABELS[muscle]}, ${bandPhrase(band).toLowerCase()}`;
}

/** Plain-language reasons for one muscle on one day. */
export function reasonsFor(state: MuscleState): string[] {
  if (state.band === 'low') return [NO_SORENESS_TEXT];
  if (state.drivers.length === 0) return [GENERIC_REASON_TEXT];
  return state.drivers.map((d) => DRIVER_TEXT[d]);
}

/** Sports the engine has no muscle map for. They add no soreness, so say so instead of hiding them. */
export function unmappedNote(sports: string[]): string {
  const one = sports.length === 1;
  return `${sports.length} sport${one ? ' is' : 's are'} not mapped to muscles yet, so ${one ? 'it is' : 'they are'} not counted: ${sports.join(', ')}.`;
}

export function needsTagNote(count: number): string {
  const one = count === 1;
  return `${count} strength session${one ? ' has' : 's have'} no muscle tag, so ${one ? 'it is' : 'they are'} not counted.`;
}

// Check-in
export const CHECKIN_PROMPT = 'How does it feel today?';
export const CHECKIN_NOT_TODAY = 'Check-ins are for today. Slide back to Now.';
export const CHECKIN_LABELS: Record<CheckInLevel, string> = {
  0: 'None',
  1: 'Mild',
  2: 'Moderate',
  3: 'Severe',
};

/** What a check-in did, in words. `before` and `after` are the muscle's sensitivity. */
export function checkInMessage(muscle: Muscle, before: number, after: number): string {
  const name = MUSCLE_LABELS[muscle].toLowerCase();
  if (after > before) return `Noted. Predictions for ${name} will lean a little higher.`;
  if (after < before) return `Noted. Predictions for ${name} will lean a little lower.`;
  return `Noted. Predictions for ${name} will stay about the same.`;
}

/** Acknowledges a severe report and points at the clinician line, without giving advice. */
export const CHECKIN_SEVERE_ACK =
  'Thanks for telling us. Severe soreness is worth taking seriously. If it is sharp, swollen or numb, stop and see a clinician.';

/** The words shown after a check-in: what it did to the prediction, with an acknowledgement for Severe. */
export function checkInFeedback(
  muscle: Muscle,
  level: CheckInLevel,
  before: number,
  after: number,
): string {
  const message = checkInMessage(muscle, before, after);
  return level === 3 ? `${CHECKIN_SEVERE_ACK} ${message}` : message;
}

// Comfort and mobility ideas
export const EVIDENCE_LABELS: Record<EvidenceTag, string> = {
  ROM: 'Range of motion',
  COMFORT: 'Comfort',
};
export const EVIDENCE_NOTES: Record<EvidenceTag, string> = {
  ROM: 'Done regularly, stretching improves range of motion. It has not been shown to reduce soreness.',
  COMFORT: 'Some people find this eases stiffness. Evidence is mixed.',
};
export const MOVE_CUE = 'Ease off if a move hurts or pinches.';
export const COMFORT_HEADING = 'Comfort ideas';
export const ROM_HEADING = 'For range of motion (regular practice, not a soreness fix)';
export const NOTHING_NEEDED_TEXT = 'Nothing needed for this muscle right now.';
export const SAVE_STRETCHING_TEXT = 'Save stretching for when soreness eases.';
export const STRETCH_HONESTY = "Stretching hasn't been shown to reduce soreness.";
export const SAFETY_LINE =
  "Sharp pain, swelling, numbness or dark urine isn't normal soreness. Stop and see a clinician.";

// Tagging strength sessions
export const TAG_HEADING = 'Tag your strength sessions';
export const TAG_PROMPT = 'Which muscles did each session work?';
export const TAG_LABELS: Record<StrengthTag, string> = {
  lower: 'Lower body',
  upper: 'Upper body',
  push: 'Push',
  pull: 'Pull',
  full: 'Full body',
};
