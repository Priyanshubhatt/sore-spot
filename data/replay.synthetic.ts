import type { ReplayFile, TaggedWorkout } from '../engine/types';
import { workout } from './scenarios/builders';

// SYNTHETIC demo data. Not from a real WHOOP account. Same shape as the real export.

type Zones = [number, number, number, number, number, number];
const easyRun: Zones = [0, 5, 20, 5, 0, 0]; // 30 min
const lowerDay: Zones = [0, 10, 30, 15, 5, 0]; // 60 min
const hillyRun: Zones = [0, 10, 50, 20, 5, 0]; // 85 min
const match: Zones = [0, 10, 20, 20, 10, 0]; // 60 min

const easy = (id: string, date: string): TaggedWorkout =>
  workout({
    id, sport: 'running', start: `${date}T07:00:00Z`, zoneMinutes: easyRun,
    distanceKm: 5, altitudeGainM: 15, altitudeChangeM: 0,
  });

const legs = (id: string, date: string): TaggedWorkout =>
  workout({ id, sport: 'weightlifting', tag: 'lower', start: `${date}T17:00:00Z`, zoneMinutes: lowerDay });

// Four weeks of routine: easy runs Tue and Thu, leg day Tue. Gives novelty a baseline.
const history: TaggedWorkout[] = [
  easy('h-run-01', '2026-08-18'), legs('h-legs-01', '2026-08-18'), easy('h-run-02', '2026-08-20'),
  easy('h-run-03', '2026-08-25'), legs('h-legs-02', '2026-08-25'), easy('h-run-04', '2026-08-27'),
  easy('h-run-05', '2026-09-01'), legs('h-legs-03', '2026-09-01'), easy('h-run-06', '2026-09-03'),
  easy('h-run-07', '2026-09-08'), legs('h-legs-04', '2026-09-08'), easy('h-run-08', '2026-09-10'),
];

// Demo week, Mon Sep 14 to Sun Sep 20. Wed and Sun are rest days.
const demoWeek: TaggedWorkout[] = [
  easy('d-mon-run', '2026-09-14'),
  legs('d-tue-legs', '2026-09-15'),
  easy('d-thu-run', '2026-09-17'),
  workout({
    id: 'd-fri-hilly-run', sport: 'running', start: '2026-09-18T07:00:00Z', zoneMinutes: hillyRun,
    distanceKm: 14, altitudeGainM: 700, altitudeChangeM: 0,
  }),
  workout({ id: 'd-sat-soccer', sport: 'soccer', start: '2026-09-19T18:00:00Z', zoneMinutes: match }),
];

export const syntheticReplay: ReplayFile = {
  synthetic: true,
  workouts: [...history, ...demoWeek],
};
