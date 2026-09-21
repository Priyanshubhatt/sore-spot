import { useCallback, useMemo, useState } from 'react';
import { loadReplay } from '../data';
import type { Muscle, StrengthTag } from '../engine';
import type { CheckInLevel, CheckIns } from './checkin';
import { DEMO_AS_OF } from './config';
import { buildForecastState } from './forecastState';
import type { Tags } from './tagging';

/** The state both tabs share: the workouts, the member's tags and check-ins, and the forecast they produce. */
export function useSoreSpot() {
  const replay = useMemo(() => loadReplay(), []);
  const [checkIns, setCheckIns] = useState<CheckIns>({});
  const [tags, setTags] = useState<Tags>({});

  const state = useMemo(
    () => buildForecastState(replay.workouts, tags, checkIns, DEMO_AS_OF),
    [replay, tags, checkIns],
  );

  const checkIn = useCallback(
    (muscle: Muscle, level: CheckInLevel) => setCheckIns((cur) => ({ ...cur, [muscle]: level })),
    [],
  );
  const tagSession = useCallback(
    (id: string, tag: StrengthTag) => setTags((cur) => ({ ...cur, [id]: tag })),
    [],
  );

  return { replay, asOf: DEMO_AS_OF, checkIns, checkIn, tagSession, ...state };
}

export type SoreSpot = ReturnType<typeof useSoreSpot>;
