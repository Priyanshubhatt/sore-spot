// Hand-tuned, UNCALIBRATED constants. Chosen so scenario tests reproduce the
// literature's ordering (novel and eccentric work is sorer). Not validated.

/** Weight per WHOOP HR zone 0..5 applied to minutes spent in that zone. */
export const ZONE_WEIGHTS = [0, 0.5, 1, 1.5, 2, 2.5] as const;

export const NOVELTY_WINDOW_DAYS = 28;
export const NOVELTY_CAP = 3;

/** Descent per km at which the running/hiking eccentric factor maxes out. */
export const DESCENT_M_PER_KM_AT_MAX = 50;
export const MAX_DESCENT_ECCENTRIC_BONUS = 1;

/** Summed contribution score at which a muscle moves up a band. */
export const BAND_THRESHOLDS = { moderate: 60, high: 150 } as const;

/** Driver tags shown in the "why" text. */
export const DRIVER_NOVELTY_MIN = 2;
export const DRIVER_ECCENTRIC_MIN = 1.3;
export const DRIVER_HIGH_LOAD_MIN = 90;

export const FORECAST_DAYS = 8;
export const HOURS_PER_DAY = 24;

export const SENSITIVITY_MIN = 0.5;
export const SENSITIVITY_MAX = 1.5;
export const SENSITIVITY_STEP = 0.1;
