// Hand-tuned, uncalibrated approximation of the DOMS time course. Only the shape follows the spec: onset ~12-24h, peak ~24-72h, gone by ~day 7.
const POINTS: ReadonlyArray<readonly [hours: number, level: number]> = [
  [0, 0],
  [12, 0.25],
  [24, 0.8],
  [48, 1],
  [72, 0.85],
  [120, 0.35],
  [168, 0.05],
  [192, 0],
];

/** Soreness level 0..1 at `hoursElapsed` after a session ends. Piecewise linear. */
export function timecurve(hoursElapsed: number): number {
  if (hoursElapsed <= POINTS[0][0]) return 0;
  const last = POINTS[POINTS.length - 1];
  if (hoursElapsed >= last[0]) return 0;
  for (let i = 1; i < POINTS.length; i++) {
    const [h1, l1] = POINTS[i];
    if (hoursElapsed <= h1) {
      const [h0, l0] = POINTS[i - 1];
      return l0 + ((l1 - l0) * (hoursElapsed - h0)) / (h1 - h0);
    }
  }
  return 0;
}
