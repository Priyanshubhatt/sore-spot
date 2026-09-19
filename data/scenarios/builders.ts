import type { StrengthTag, TaggedWorkout } from '../../engine/types';

export interface WorkoutSpec {
  id: string;
  sport: string;
  /** ISO start time. */
  start: string;
  /** Minutes spent in HR zones 0..5. Session length is their sum. */
  zoneMinutes: [number, number, number, number, number, number];
  distanceKm?: number;
  altitudeGainM?: number;
  altitudeChangeM?: number;
  tag?: StrengthTag;
}

/** Build a WHOOP-v2-shaped workout. Non-engine fields are plausible filler. */
export function workout(spec: WorkoutSpec): TaggedWorkout {
  const totalMin = spec.zoneMinutes.reduce((a, b) => a + b, 0);
  const startMs = Date.parse(spec.start);
  const end = new Date(startMs + totalMin * 60_000).toISOString();
  const [z0, z1, z2, z3, z4, z5] = spec.zoneMinutes.map((m) => m * 60_000);
  return {
    id: spec.id,
    user_id: 0,
    created_at: end,
    updated_at: end,
    start: new Date(startMs).toISOString(),
    end,
    timezone_offset: '+00:00',
    sport_name: spec.sport,
    score_state: 'SCORED',
    score: {
      strain: 10,
      average_heart_rate: 140,
      max_heart_rate: 175,
      kilojoule: totalMin * 30,
      percent_recorded: 100,
      distance_meter: spec.distanceKm === undefined ? undefined : spec.distanceKm * 1000,
      altitude_gain_meter: spec.altitudeGainM,
      altitude_change_meter: spec.altitudeChangeM,
      zone_durations: {
        zone_zero_milli: z0,
        zone_one_milli: z1,
        zone_two_milli: z2,
        zone_three_milli: z3,
        zone_four_milli: z4,
        zone_five_milli: z5,
      },
    },
    ...(spec.tag ? { session_tag: spec.tag } : {}),
  };
}
