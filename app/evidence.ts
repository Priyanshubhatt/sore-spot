import { timecurve } from '../engine';
import { FORECAST_DAYS, HOURS_PER_DAY } from '../engine/constants';

export interface CurvePoint {
  hours: number;
  level: number;
}

/** The curve is drawn over the same span the forecast covers. */
export const CURVE_END_HOURS = FORECAST_DAYS * HOURS_PER_DAY;
export const CURVE_STEP_HOURS = 6;

/** The engine's own soreness curve, sampled: this is what the model uses, not a redrawn picture of it. */
export function curveSeries(): CurvePoint[] {
  const points: CurvePoint[] = [];
  for (let hours = 0; hours <= CURVE_END_HOURS; hours += CURVE_STEP_HOURS) {
    points.push({ hours, level: timecurve(hours) });
  }
  return points;
}

/** The first point with the highest level. */
export function peakOf(series: CurvePoint[]): CurvePoint {
  return series.reduce((best, p) => (p.level > best.level ? p : best), series[0]);
}

export interface ChartBox {
  width: number;
  height: number;
  /** Room for the axis labels. */
  left: number;
  right: number;
  top: number;
  bottom: number;
}

export function xOf(hours: number, box: ChartBox): number {
  return box.left + (hours / CURVE_END_HOURS) * (box.width - box.left - box.right);
}

export function yOf(level: number, box: ChartBox): number {
  return box.height - box.bottom - level * (box.height - box.top - box.bottom);
}

/** An SVG path through the series ("M x y L x y ..."), rounded to one decimal. */
export function linePath(series: CurvePoint[], box: ChartBox): string {
  return series
    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${xOf(p.hours, box).toFixed(1)} ${yOf(p.level, box).toFixed(1)}`)
    .join(' ');
}

/** The same line closed down to the axis, for a soft fill under the curve. */
export function areaPath(series: CurvePoint[], box: ChartBox): string {
  const last = series[series.length - 1];
  const base = yOf(0, box).toFixed(1);
  return `${linePath(series, box)} L ${xOf(last.hours, box).toFixed(1)} ${base} L ${xOf(series[0].hours, box).toFixed(1)} ${base} Z`;
}

/** Whole days shown on the horizontal axis: 0 to 8. */
export function dayTicks(): number[] {
  return Array.from({ length: FORECAST_DAYS + 1 }, (_, d) => d);
}
