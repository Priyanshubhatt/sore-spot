import { describe, expect, it } from 'vitest';
import { workout } from '../data/scenarios/builders';
import { computeForecast, defaultSensitivity } from '../engine';
import { dominantBand } from './body/colors';
import { recentHistory } from './history';

const S = defaultSensitivity();
const asOf = new Date('2026-09-19T20:00:00Z'); // a Saturday

describe('recentHistory', () => {
  it('defaults to the last 7 days plus Now, oldest first', () => {
    const days = recentHistory([], asOf, S);
    expect(days.map((d) => d.daysAgo)).toEqual([7, 6, 5, 4, 3, 2, 1, 0]);
  });

  it('honours a custom span', () => {
    expect(recentHistory([], asOf, S, 2).map((d) => d.daysAgo)).toEqual([2, 1, 0]);
    expect(recentHistory([], asOf, S, 0).map((d) => d.daysAgo)).toEqual([0]);
  });

  it('calls a day with no workouts a rest day', () => {
    const days = recentHistory([], asOf, S);
    for (const d of days) expect(d.activities).toEqual([]);
  });

  it('puts a workout on the day it happened, prettified, and leaves the rest empty', () => {
    const w = workout({ id: 'w1', sport: 'running', start: '2026-09-17T07:00:00Z', zoneMinutes: [0, 5, 20, 5, 0, 0] });
    const days = recentHistory([w], asOf, S);
    const byDaysAgo = new Map(days.map((d) => [d.daysAgo, d]));
    expect(byDaysAgo.get(2)!.activities).toEqual(['Running']); // Sep 17 is 2 days before Sep 19
    expect(byDaysAgo.get(3)!.activities).toEqual([]);
    expect(byDaysAgo.get(1)!.activities).toEqual([]);
  });

  it('uses the workout\'s own time zone to decide which day it lands on', () => {
    // 23:30 UTC on the 17th is already the 18th at UTC+2.
    const w = workout({ id: 'w1', sport: 'cycling', start: '2026-09-17T23:30:00Z', zoneMinutes: [0, 5, 20, 5, 0, 0] });
    const withOffset = { ...w, timezone_offset: '+02:00' };
    const days = recentHistory([withOffset], asOf, S);
    const byDaysAgo = new Map(days.map((d) => [d.daysAgo, d]));
    expect(byDaysAgo.get(1)!.activities).toEqual(['Cycling']); // Sep 18
    expect(byDaysAgo.get(2)!.activities).toEqual([]);
  });

  it('deduplicates the same sport twice in one day, keeps two different sports', () => {
    const a = workout({ id: 'a', sport: 'running', start: '2026-09-17T07:00:00Z', zoneMinutes: [0, 5, 20, 5, 0, 0] });
    const b = workout({ id: 'b', sport: 'running', start: '2026-09-17T18:00:00Z', zoneMinutes: [0, 5, 20, 5, 0, 0] });
    const c = workout({ id: 'c', sport: 'weightlifting', start: '2026-09-17T12:00:00Z', zoneMinutes: [0, 10, 30, 15, 5, 0] });
    const days = recentHistory([a, b, c], asOf, S);
    expect(days.find((d) => d.daysAgo === 2)!.activities).toEqual(['Running', 'Weightlifting']);
  });

  it('shows a tagged strength session by its tag, not the generic sport name', () => {
    const legs = workout({ id: 'legs', sport: 'weightlifting', tag: 'lower', start: '2026-09-17T12:00:00Z', zoneMinutes: [0, 10, 30, 15, 5, 0] });
    const push = workout({ id: 'push', sport: 'weightlifting', tag: 'push', start: '2026-09-15T12:00:00Z', zoneMinutes: [0, 10, 30, 15, 5, 0] });
    const untagged = workout({ id: 'untagged', sport: 'weightlifting', start: '2026-09-14T12:00:00Z', zoneMinutes: [0, 10, 30, 15, 5, 0] });
    const days = recentHistory([legs, push, untagged], asOf, S);
    expect(days.find((d) => d.daysAgo === 2)!.activities).toEqual(['Lower body']);
    expect(days.find((d) => d.daysAgo === 4)!.activities).toEqual(['Push']);
    // No tag yet: falls back to the plain sport name rather than guessing.
    expect(days.find((d) => d.daysAgo === 5)!.activities).toEqual(['Weightlifting']);
  });

  it('matches the same band the live forecast would give for that day', () => {
    // Two days before asOf, so by "Now" (about 49h later) it sits in the DOMS peak window.
    const w = workout({ id: 'w1', sport: 'soccer', start: '2026-09-17T18:00:00Z', zoneMinutes: [0, 10, 20, 20, 10, 0] });
    const days = recentHistory([w], asOf, S);
    const now = days.find((d) => d.daysAgo === 0)!;
    const direct = dominantBand(computeForecast([w], asOf, S).byDay[0]);
    expect(now.band).toBe(direct);
    expect(now.band).not.toBe('low'); // a soccer match two days before should still show up
  });

  it('evaluates each day at its own moment, not always at "Now"', () => {
    // Ends 5 days before asOf: near its DOMS peak 2 days ago (daysAgo 3), long faded by Now.
    const w = workout({ id: 'w1', sport: 'soccer', start: '2026-09-14T18:00:00Z', zoneMinutes: [0, 10, 20, 20, 10, 0] });
    const days = recentHistory([w], asOf, S);
    const byDaysAgo = new Map(days.map((d) => [d.daysAgo, d.band]));
    expect(byDaysAgo.get(3)).not.toBe(byDaysAgo.get(0));
  });

  it('does not mutate its input workouts', () => {
    const w = workout({ id: 'w1', sport: 'running', start: '2026-09-17T07:00:00Z', zoneMinutes: [0, 5, 20, 5, 0, 0] });
    const before = JSON.stringify(w);
    recentHistory([w], asOf, S);
    expect(JSON.stringify(w)).toBe(before);
  });
});
