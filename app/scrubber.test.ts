import { describe, expect, it } from 'vitest';
import { dayIndexFromX, dayLabel, historyDayLabel, weekdayLabel } from './scrubber';

describe('dayLabel', () => {
  it('says Now for day 0 and +Nd after that', () => {
    expect(dayLabel(0)).toBe('Now');
    expect(dayLabel(1)).toBe('+1d');
    expect(dayLabel(7)).toBe('+7d');
  });
});

describe('historyDayLabel', () => {
  it('says Now for 0 days ago and -Nd before that, mirroring dayLabel', () => {
    expect(historyDayLabel(0)).toBe('Now');
    expect(historyDayLabel(1)).toBe('-1d');
    expect(historyDayLabel(7)).toBe('-7d');
  });
});

describe('weekdayLabel', () => {
  const asOf = new Date('2026-09-19T20:00:00Z'); // a Saturday in UTC

  it('gives the UTC weekday of asOf plus the day offset', () => {
    expect(weekdayLabel(asOf, 0)).toBe('Sat');
    expect(weekdayLabel(asOf, 1)).toBe('Sun');
    expect(weekdayLabel(asOf, 2)).toBe('Mon');
    expect(weekdayLabel(asOf, 7)).toBe('Sat');
  });

  it('rolls over to the next UTC day even late in the evening', () => {
    expect(weekdayLabel(new Date('2026-09-19T23:59:00Z'), 1)).toBe('Sun');
  });
});

describe('dayIndexFromX', () => {
  it('maps the left edge to day 0 and the right edge to day 7', () => {
    expect(dayIndexFromX(0, 800)).toBe(0);
    expect(dayIndexFromX(800, 800)).toBe(7);
  });

  it('puts positions inside the right segment (800px / 8 days = 100px each)', () => {
    expect(dayIndexFromX(99, 800)).toBe(0);
    expect(dayIndexFromX(100, 800)).toBe(1);
    expect(dayIndexFromX(450, 800)).toBe(4);
    expect(dayIndexFromX(799, 800)).toBe(7);
  });

  it('clamps outside the track', () => {
    expect(dayIndexFromX(-40, 800)).toBe(0);
    expect(dayIndexFromX(900, 800)).toBe(7);
  });

  it('returns day 0 before the track has been measured', () => {
    expect(dayIndexFromX(50, 0)).toBe(0);
  });
});
