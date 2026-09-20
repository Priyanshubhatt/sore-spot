import type { Recovery, ReplayFile, TaggedWorkout } from '../engine/types';
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

// Demo week, Mon Sep 14 to Sun Sep 20. Sun is a rest day. The Wed strength session has no tag on purpose:
// the engine will not guess which muscles it worked, so the app asks.
const demoWeek: TaggedWorkout[] = [
  easy('d-mon-run', '2026-09-14'),
  legs('d-tue-legs', '2026-09-15'),
  workout({ id: 'd-wed-strength', sport: 'weightlifting', start: '2026-09-16T17:00:00Z', zoneMinutes: lowerDay }),
  easy('d-thu-run', '2026-09-17'),
  workout({
    id: 'd-fri-hilly-run', sport: 'running', start: '2026-09-18T07:00:00Z', zoneMinutes: hillyRun,
    distanceKm: 14, altitudeGainM: 700, altitudeChangeM: 0,
  }),
  workout({ id: 'd-sat-soccer', sport: 'soccer', start: '2026-09-19T18:00:00Z', zoneMinutes: match }),
];

// One synthetic recovery per morning, Mon Sep 14 to Sat Sep 19. Not from a real WHOOP account.
const morning = (date: string, cycleId: number, score: number): Recovery => ({
  cycle_id: cycleId,
  sleep_id: `synthetic-sleep-${cycleId}`,
  user_id: 0,
  created_at: `${date}T06:00:00Z`,
  updated_at: `${date}T06:00:00Z`,
  score_state: 'SCORED',
  score: {
    user_calibrating: false,
    recovery_score: score,
    resting_heart_rate: 52 + Math.round((100 - score) / 10),
    hrv_rmssd_milli: 40 + Math.round(score / 2),
  },
});

const demoRecovery: Recovery[] = [
  morning('2026-09-14', 900001, 82),
  morning('2026-09-15', 900002, 71),
  morning('2026-09-16', 900003, 58),
  morning('2026-09-17', 900004, 66),
  morning('2026-09-18', 900005, 31),
  morning('2026-09-19', 900006, 47),
];

export const syntheticReplay: ReplayFile = {
  synthetic: true,
  workouts: [...history, ...demoWeek],
  recovery: demoRecovery,
};
