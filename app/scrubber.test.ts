import { describe, expect, it } from 'vitest';
import { dateLabel, dayIndexFromX, weekdayLabel } from './scrubber';

describe('dateLabel', () => {
  const asOf = new Date('2026-09-19T20:00:00Z'); // a Saturday in UTC, Sep 19

  it('says Now for day 0', () => {
    expect(dateLabel(asOf, 0)).toBe('Now');
  });

  it('gives the UTC calendar date for a day after asOf', () => {
    expect(dateLabel(asOf, 1)).toBe('Sep 20');
    expect(dateLabel(asOf, 7)).toBe('Sep 26');
  });

  it('gives the UTC calendar date for a day before asOf, same grammar, negative offset', () => {
    expect(dateLabel(asOf, -1)).toBe('Sep 18');
    expect(dateLabel(asOf, -7)).toBe('Sep 12');
  });

  it('rolls over the month', () => {
    expect(dateLabel(asOf, 12)).toBe('Oct 1');
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
