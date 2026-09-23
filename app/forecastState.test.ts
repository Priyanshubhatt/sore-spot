import { describe, expect, it } from 'vitest';
import { syntheticReplay } from '../data/replay.synthetic';
import { buildForecastState } from './forecastState';
import { DEMO_AS_OF } from './config';

const build = (tags = {}, checkIns = {}) =>
  buildForecastState(syntheticReplay.workouts, tags, checkIns, DEMO_AS_OF);

describe('buildForecastState', () => {
  it('lists the untagged demo session with a label the member can recognize', () => {
    const state = build();
    expect(state.forecast.needsTag).toEqual(['d-wed-strength']);
    expect(state.untagged).toEqual([{ id: 'd-wed-strength', label: 'Sun Sep 20 · Weightlifting' }]);
  });

  it('stops asking about a session once it is tagged, and the tag changes the forecast', () => {
    const before = build();
    const after = build({ 'd-wed-strength': 'upper' });
    expect(after.untagged).toEqual([]);
    expect(after.forecast.needsTag).toEqual([]);
    expect(JSON.stringify(after.forecast.byDay)).not.toBe(JSON.stringify(before.forecast.byDay));
  });

  it('does not change the workouts it was given', () => {
    const snapshot = JSON.stringify(syntheticReplay.workouts);
    build({ 'd-wed-strength': 'upper' });
    expect(JSON.stringify(syntheticReplay.workouts)).toBe(snapshot);
  });

  it('check-ins nudge sensitivity from the default, so repeating one never stacks', () => {
    const once = build({}, { chest: 3 });
    expect(once.sensitivity.chest).toBeCloseTo(1.1, 10);
    // Rebuilt from the default each time: the same check-in after a tag change is still one nudge, not two.
    expect(build({ 'd-wed-strength': 'upper' }, { chest: 3 }).sensitivity.chest).toBeLessThanOrEqual(1.1 + 1e-9);
    expect(build().sensitivity.chest).toBe(1);
  });
});
