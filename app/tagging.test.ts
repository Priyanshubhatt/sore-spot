import { describe, expect, it } from 'vitest';
import { syntheticReplay } from '../data/replay.synthetic';
import { workout } from '../data/scenarios/builders';
import { computeForecast, defaultSensitivity } from '../engine';
import { TAG_OPTIONS, applyTags, describeWorkout, sportLabel, workoutLocalDate } from './tagging';

const wed = workout({
  id: 'w1',
  sport: 'weightlifting',
  start: '2026-09-16T17:00:00Z',
  zoneMinutes: [0, 10, 30, 15, 5, 0],
});
const run = workout({
  id: 'w2',
  sport: 'running',
  start: '2026-09-17T07:00:00Z',
  zoneMinutes: [0, 5, 20, 5, 0, 0],
});

describe('TAG_OPTIONS', () => {
  it('lists the five session tags the engine understands', () => {
    expect([...TAG_OPTIONS]).toEqual(['lower', 'upper', 'push', 'pull', 'full']);
  });
});

describe('describeWorkout in the time zone of the workout', () => {
  const at = (start: string, timezone_offset?: string) => describeWorkout({ start, sport_name: 'weightlifting', ...(timezone_offset ? { timezone_offset } : {}) });

  it('shows the day it happened where the workout was, not the UTC day', () => {
    // 7:30 pm on Wed Sep 16 in New York (UTC-4) is already Thu Sep 17 in UTC.
    expect(at('2026-09-16T23:30:00Z', '-04:00')).toBe('Wed Sep 16 · Weightlifting');
    // 7:30 am on Thu Sep 17 in Sydney (UTC+10) is still Wed Sep 16 in UTC.
    expect(at('2026-09-16T21:30:00Z', '+10:00')).toBe('Thu Sep 17 · Weightlifting');
    expect(at('2026-09-16T21:30:00Z', '+0530')).toBe('Thu Sep 17 · Weightlifting');
  });

  it('falls back to UTC when the offset is missing or unreadable', () => {
    expect(at('2026-09-16T23:30:00Z')).toBe('Wed Sep 16 · Weightlifting');
    expect(at('2026-09-16T23:30:00Z', 'EST')).toBe('Wed Sep 16 · Weightlifting');
  });
});

describe('sportLabel', () => {
  it('capitalizes and turns dashes and underscores into spaces', () => {
    expect(sportLabel('weightlifting')).toBe('Weightlifting');
    expect(sportLabel('functional-fitness')).toBe('Functional fitness');
    expect(sportLabel('functional_fitness')).toBe('Functional fitness');
  });
});

describe('workoutLocalDate', () => {
  it('shifts the start by the workout\'s own offset, same as describeWorkout uses internally', () => {
    const d = workoutLocalDate({ start: '2026-09-16T23:30:00Z', timezone_offset: '-04:00' });
    expect(d.toISOString()).toBe('2026-09-16T19:30:00.000Z');
  });
});

describe('applyTags', () => {
  it('sets the chosen tag on the matching workout and leaves the others alone', () => {
    const out = applyTags([wed, run], { w1: 'upper' });
    expect(out[0].session_tag).toBe('upper');
    expect(out[1]).toBe(run);
  });

  it('does not mutate its inputs', () => {
    const before = JSON.stringify([wed, run]);
    applyTags([wed, run], { w1: 'lower' });
    expect(JSON.stringify([wed, run])).toBe(before);
    expect(wed.session_tag).toBeUndefined();
  });

  it('returns the same workouts when there are no tags', () => {
    expect(applyTags([wed, run], {})).toEqual([wed, run]);
  });

  it('turns an untagged demo session from unknown into counted', () => {
    const asOf = new Date('2026-09-23T20:00:00Z');
    const s = defaultSensitivity();
    const untagged = computeForecast(syntheticReplay.workouts, asOf, s);
    expect(untagged.needsTag).toEqual(['d-wed-strength']);
    expect(untagged.byDay[0].chest.band).toBe('low');

    const tagged = computeForecast(applyTags(syntheticReplay.workouts, { 'd-wed-strength': 'upper' }), asOf, s);
    expect(tagged.needsTag).toEqual([]);
    expect(tagged.byDay[0].chest.band).not.toBe('low');
  });
});

describe('describeWorkout', () => {
  it('gives a UTC weekday, date and a readable sport', () => {
    expect(describeWorkout(wed)).toBe('Wed Sep 16 · Weightlifting');
  });

  it('spaces hyphenated sport names', () => {
    expect(describeWorkout({ start: '2026-09-18T07:00:00Z', sport_name: 'functional-fitness' })).toBe(
      'Fri Sep 18 · Functional fitness',
    );
  });

  it('uses UTC, so late evening stays on the same day', () => {
    expect(describeWorkout({ start: '2026-09-16T23:30:00Z', sport_name: 'weightlifting' })).toBe(
      'Wed Sep 16 · Weightlifting',
    );
  });
});
