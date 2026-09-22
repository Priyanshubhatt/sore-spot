export const MUSCLES = [
  'chest',
  'shoulders',
  'biceps',
  'triceps',
  'forearms',
  'upperBack',
  'core',
  'glutes',
  'quads',
  'hamstrings',
  'calves',
  'adductors',
] as const;

export type Muscle = (typeof MUSCLES)[number];
export type RiskBand = 'low' | 'moderate' | 'high';
export type Driver = 'novel' | 'eccentric' | 'high-load';
export type StrengthTag = 'lower' | 'upper' | 'push' | 'pull' | 'full';

/** WHOOP API v2 workout shapes (developer.whoop.com/api, checked 2026-09-19). */
export interface ZoneDurations {
  zone_zero_milli: number;
  zone_one_milli: number;
  zone_two_milli: number;
  zone_three_milli: number;
  zone_four_milli: number;
  zone_five_milli: number;
}

export interface WorkoutScore {
  strain: number;
  average_heart_rate: number;
  max_heart_rate: number;
  kilojoule: number;
  percent_recorded: number;
  distance_meter?: number;
  altitude_gain_meter?: number;
  altitude_change_meter?: number;
  zone_durations: ZoneDurations;
}

export interface Workout {
  id: string;
  v1_id?: number;
  user_id: number;
  created_at: string;
  updated_at: string;
  start: string;
  end: string;
  timezone_offset: string;
  sport_name: string;
  sport_id?: number;
  score_state: 'SCORED' | 'PENDING_SCORE' | 'UNSCORABLE';
  score?: WorkoutScore;
}

/** The API has no muscle data for strength work, so a session tag rides alongside. */
export interface TaggedWorkout extends Workout {
  session_tag?: StrengthTag;
}

/** WHOOP API v2 recovery shapes (developer.whoop.com/api, checked 2026-09-20). */
export interface RecoveryScore {
  user_calibrating: boolean;
  recovery_score: number;
  resting_heart_rate: number;
  hrv_rmssd_milli: number;
  spo2_percentage?: number;
  skin_temp_celsius?: number;
}

export interface Recovery {
  cycle_id: number;
  sleep_id: string;
  user_id: number;
  created_at: string;
  updated_at: string;
  score_state: 'SCORED' | 'PENDING_SCORE' | 'UNSCORABLE';
  score?: RecoveryScore;
}

export interface ReplayFile {
  synthetic: boolean;
  workouts: TaggedWorkout[];
  /** Optional: a real export adds it, and so does the synthetic week. */
  recovery?: Recovery[];
  /** When a real export was made (an ISO date): the app's "now". Absent for the synthetic week, which uses a fixed demo time. */
  asOf?: string;
}

export type Sensitivity = Record<Muscle, number>;

export interface MuscleState {
  band: RiskBand;
  drivers: Driver[];
}

export type DayForecast = Record<Muscle, MuscleState>;

export interface Forecast {
  /** byDay[d] is the state at asOf + d days. Day 0 is right now. */
  byDay: DayForecast[];
  /** Ids of strength workouts skipped because they have no session_tag. */
  needsTag: string[];
  /** sport_name values with no entry in the sport-to-muscle map. */
  unmappedSports: string[];
}
