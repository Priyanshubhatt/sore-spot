import type { Muscle, RiskBand } from '../../engine';
import { effectiveBand, type CheckInLevel } from '../checkin';
import { MOVES, type Move, type MoveKind } from './library';

export type RecommendationNote = 'nothing-needed' | 'save-stretching' | null;

export interface Recommendation {
  /** The band the advice is based on: the predicted band, raised by a check-in. */
  band: RiskBand;
  /** Up to one move of each comfort kind, in this order. */
  comfort: Move[];
  /** Stretches for range of motion. Empty while soreness is high. */
  rom: Move[];
  note: RecommendationNote;
}

const COMFORT_ORDER: readonly MoveKind[] = ['light-movement', 'self-massage', 'mobility'];
const MAX_ROM = 2;

export function recommend(
  muscle: Muscle,
  predicted: RiskBand,
  reported?: CheckInLevel,
): Recommendation {
  const band = effectiveBand(predicted, reported);
  const forMuscle = MOVES.filter((m) => m.muscles.includes(muscle));

  const comfort =
    band === 'low'
      ? []
      : COMFORT_ORDER.flatMap((kind) => {
          const first = forMuscle.find((m) => m.kind === kind);
          return first ? [first] : [];
        });
  const rom = band === 'high' ? [] : forMuscle.filter((m) => m.kind === 'stretch').slice(0, MAX_ROM);
  const note: RecommendationNote =
    band === 'low' ? 'nothing-needed' : band === 'high' ? 'save-stretching' : null;

  return { band, comfort, rom, note };
}
