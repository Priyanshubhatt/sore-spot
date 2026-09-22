import { NOVELTY_CAP, NOVELTY_WINDOW_DAYS } from '../engine/constants';
import { EVIDENCE_LABELS, EVIDENCE_NOTES, STRETCH_HONESTY } from './copy';
import type { EvidenceTag } from './mobility/library';

export const EVIDENCE_HEADING = 'What this is built on';
export const EVIDENCE_INTRO =
  'Sore Spot predicts soreness from published patterns, then uses your plan to ease into new work. Here is what each piece rests on, and where it stops.';

export const CURVE_HEADING = 'Soreness has a timeline';
export const CURVE_TEXT =
  'Published reviews describe soreness building within about a day, peaking around 1 to 3 days after a session and fading by about a week. The chart is the curve this app uses. It is a hand-tuned approximation of that shape, not a measurement.';
export const CURVE_X_LABEL = 'Days after a session';
export const CURVE_Y_LABEL = 'Predicted soreness';
export const CURVE_PEAK_LABEL = 'peak';
export const CURVE_A11Y =
  'Chart of predicted soreness after a session: it rises over the first day, peaks around two days, and fades to nothing by day eight.';

export interface TextCard {
  id: string;
  heading: string;
  body: string;
}

/** The cards that are only text, in reading order. */
export const TEXT_CARDS: TextCard[] = [
  {
    id: 'novelty',
    heading: 'New work hurts more',
    body: `A second round of the same unfamiliar exercise causes much less soreness (the repeated bout effect). So the model compares each session with your last ${NOVELTY_WINDOW_DAYS} days and counts new work for more, up to ${NOVELTY_CAP} times as much. The plan also starts movements that are new to you a set lighter.`,
  },
  {
    id: 'eccentric',
    heading: 'Lowering and braking work',
    body: 'Lengthening work, such as running downhill, slowing down or lowering a weight, causes more soreness than lifting or pushing. The model weights it higher, and the plan keeps heavy lengthening work off muscles predicted to be sore.',
  },
  {
    id: 'stretching',
    heading: 'Stretching is not a soreness fix',
    body: `A review of stretching before and after exercise (Herbert and colleagues, 2011) and a wider review of recovery methods (Dupuy and colleagues, 2018) found no meaningful effect of stretching on soreness. ${STRETCH_HONESTY} So stretches here are labelled as range-of-motion work, and foam rolling and light movement are offered as comfort ideas, with mixed evidence.`,
  },
  {
    id: 'easing-in',
    heading: 'Easing in is the main lever',
    body: 'In the research, building up gradually and easing into new exercise lessened soreness, and no recovery method reliably removed it once it set in. That is why the plan, not a stretch, is the main tool in this app.',
  },
];

export const LABELS_HEADING = 'How comfort ideas are labelled';
const LABEL_TAGS: readonly EvidenceTag[] = ['ROM', 'COMFORT'];
export const LABEL_LINES: string[] = LABEL_TAGS.map((tag) => `${EVIDENCE_LABELS[tag]}: ${EVIDENCE_NOTES[tag]}`);

export const LIMITS_HEADING = 'Where this stops';
export const LIMITS: string[] = [
  'The predictions have not been checked against real soreness logs. This app makes no claim about how often it is right.',
  'The numbers behind the model (weights, thresholds and the curve above) are set by hand, not fitted to data.',
  'Anything marked SYNTHETIC DATA is made up for the demo.',
  'The low, medium and high recovery cutoffs are set by hand and have not been checked against WHOOP\'s own zones.',
  'The exercise and comfort libraries are general guidance and still need review by a trainer or physical therapist.',
  'This is an independent prototype. It is not affiliated with, endorsed by, or sponsored by WHOOP.',
  'General wellness guidance, not medical advice. A red flag stops the plan and points to a clinician.',
];
