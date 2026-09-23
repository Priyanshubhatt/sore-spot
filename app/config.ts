import type { ReplayFile } from '../engine';

/** Fixed on purpose: the synthetic demo week is Sep 18-24 2026, so a live clock would eventually render an all-low map. */
export const DEMO_AS_OF = new Date('2026-09-23T20:00:00Z');

/** A real export carries the moment it was made, which is "now" for the app; the synthetic week uses the fixed demo time. */
export function replayAsOf(replay: Pick<ReplayFile, 'asOf'>): Date {
  return replay.asOf ? new Date(replay.asOf) : DEMO_AS_OF;
}
