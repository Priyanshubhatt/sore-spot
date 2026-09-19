import type { Driver, Muscle, MuscleState, RiskBand } from '../engine';

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

export function needsTagNote(count: number): string {
  const one = count === 1;
  return `${count} strength session${one ? ' has' : 's have'} no muscle tag, so ${one ? 'it is' : 'they are'} not counted.`;
}
