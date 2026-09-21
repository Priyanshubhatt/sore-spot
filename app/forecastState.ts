import {
  computeForecast,
  defaultSensitivity,
  type Forecast,
  type Sensitivity,
  type TaggedWorkout,
} from '../engine';
import { sensitivityFromCheckIns, type CheckIns } from './checkin';
import type { UntaggedSession } from './components/TagPrompt';
import { applyTags, describeWorkout, type Tags } from './tagging';

export interface ForecastState {
  /** The workouts with the member's tags applied. */
  tagged: TaggedWorkout[];
  forecast: Forecast;
  sensitivity: Sensitivity;
  /** Strength sessions that still need a tag, with a label the member can recognize. */
  untagged: UntaggedSession[];
}

/**
 * Tags change which muscles a session loads. Check-ins are then rebuilt from the default sensitivity
 * and the default forecast for Now, so they never stack.
 */
export function buildForecastState(
  workouts: TaggedWorkout[],
  tags: Tags,
  checkIns: CheckIns,
  asOf: Date,
): ForecastState {
  const tagged = applyTags(workouts, tags);
  const base = computeForecast(tagged, asOf, defaultSensitivity());
  const sensitivity = sensitivityFromCheckIns(checkIns, base.byDay[0]);
  const forecast = computeForecast(tagged, asOf, sensitivity);
  const untagged = tagged
    .filter((w) => forecast.needsTag.includes(w.id))
    .map((w) => ({ id: w.id, label: describeWorkout(w) }));
  return { tagged, forecast, sensitivity, untagged };
}
