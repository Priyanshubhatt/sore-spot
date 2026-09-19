import { describe, expect, it } from 'vitest';
import { timecurve } from './timecurve';

describe('timecurve', () => {
  it('is zero right at the end of the session', () => {
    expect(timecurve(0)).toBe(0);
  });

  it('peaks inside the 24-72h window', () => {
    let peakHour = 0;
    let peak = -1;
    for (let h = 0; h <= 200; h++) {
      if (timecurve(h) > peak) {
        peak = timecurve(h);
        peakHour = h;
      }
    }
    expect(peakHour).toBeGreaterThanOrEqual(24);
    expect(peakHour).toBeLessThanOrEqual(72);
    expect(peak).toBe(1);
  });

  it('has onset by 12-24h', () => {
    expect(timecurve(12)).toBeGreaterThan(0.2);
    expect(timecurve(24)).toBeGreaterThan(0.7);
  });

  it('has faded by about day 7 and is zero afterwards', () => {
    expect(timecurve(168)).toBeLessThan(0.1);
    expect(timecurve(200)).toBe(0);
    expect(timecurve(-5)).toBe(0);
  });
});
