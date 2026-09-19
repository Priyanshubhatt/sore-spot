import type { TaggedWorkout } from '../../engine/types';
import { workout } from './builders';

// Each scenario is hand-authored, WHOOP-v2-shaped, and synthetic.

type Zones = [number, number, number, number, number, number];

/** A regular runner: four weekly flat 10 km runs (Aug 13 to Sep 3). */
const runZones: Zones = [0, 10, 40, 10, 0, 0];
const priorRuns: TaggedWorkout[] = ['2026-08-13', '2026-08-20', '2026-08-27', '2026-09-03'].map(
  (d, i) =>
    workout({
      id: `prior-run-${i}`, sport: 'running', start: `${d}T07:00:00Z`, zoneMinutes: runZones,
      distanceKm: 10, altitudeGainM: 20, altitudeChangeM: 0,
    }),
);

/** The regular runner's Sep 10 run, flat. */
export const flatRun: TaggedWorkout[] = [
  ...priorRuns,
  workout({
    id: 'run', sport: 'running', start: '2026-09-10T07:00:00Z', zoneMinutes: runZones,
    distanceKm: 10, altitudeGainM: 20, altitudeChangeM: 0,
  }),
];

/** The same runner and same effort on Sep 10, but ending 550 m below the start. */
export const downhillRun: TaggedWorkout[] = [
  ...priorRuns,
  workout({
    id: 'run', sport: 'running', start: '2026-09-10T07:00:00Z', zoneMinutes: runZones,
    distanceKm: 10, altitudeGainM: 50, altitudeChangeM: -550,
  }),
];

const matchZones: Zones = [0, 10, 20, 20, 10, 0];

/** A first-ever soccer match: no prior history. */
export const firstSoccer: TaggedWorkout[] = [
  workout({ id: 'match', sport: 'soccer', start: '2026-09-10T18:00:00Z', zoneMinutes: matchZones }),
];

/** A regular player: weekly matches for the prior four weeks, then the same match. */
export const regularSoccer: TaggedWorkout[] = [
  ...['2026-08-13', '2026-08-20', '2026-08-27', '2026-09-03'].map((d, i) =>
    workout({ id: `prior-${i}`, sport: 'soccer', start: `${d}T18:00:00Z`, zoneMinutes: matchZones }),
  ),
  workout({ id: 'match', sport: 'soccer', start: '2026-09-10T18:00:00Z', zoneMinutes: matchZones }),
];

const legZones: Zones = [0, 10, 30, 15, 5, 0];

/** Leg day on Sep 10 only. */
export const legDayOne: TaggedWorkout[] = [
  workout({ id: 'legs-1', sport: 'weightlifting', tag: 'lower', start: '2026-09-10T17:00:00Z', zoneMinutes: legZones }),
];

/** Leg day on Sep 10 and again on Sep 11. */
export const legDaysBackToBack: TaggedWorkout[] = [
  ...legDayOne,
  workout({ id: 'legs-2', sport: 'weightlifting', tag: 'lower', start: '2026-09-11T17:00:00Z', zoneMinutes: legZones }),
];

/** A strength session with no session_tag: the engine must not guess muscles. */
export const untaggedStrength: TaggedWorkout[] = [
  workout({ id: 'untagged', sport: 'weightlifting', start: '2026-09-10T17:00:00Z', zoneMinutes: legZones }),
];

/** A sport that is not in the sport-to-muscle map. */
export const unknownSport: TaggedWorkout[] = [
  workout({ id: 'curling', sport: 'curling', start: '2026-09-10T17:00:00Z', zoneMinutes: [0, 30, 10, 0, 0, 0] }),
];
