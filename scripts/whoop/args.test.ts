import { describe, expect, it } from 'vitest';
import { parseDays } from './args';

describe('parseDays', () => {
  it('defaults to 60 days', () => {
    expect(parseDays([])).toBe(60);
  });

  it('reads --days N', () => {
    expect(parseDays(['--days', '90'])).toBe(90);
    expect(parseDays(['--days', '1'])).toBe(1);
    expect(parseDays(['--days', '365'])).toBe(365);
  });

  it('rejects a span outside 1 to 365 or that is not a whole number', () => {
    for (const bad of ['0', '366', '2.5', 'abc', '-3']) {
      expect(() => parseDays(['--days', bad])).toThrow(/whole number from 1 to 365/);
    }
    expect(() => parseDays(['--days'])).toThrow(/whole number from 1 to 365/);
  });

  it('rejects anything it does not understand, and says how to type the flag through npm', () => {
    // `npm run export-whoop --days 90` leaves a bare "90" behind, because npm keeps --days for itself.
    expect(() => parseDays(['90'])).toThrow(/Unexpected argument "90".*npm run export-whoop -- --days 90/);
    expect(() => parseDays(['--day', '90'])).toThrow(/Unexpected argument "--day"/);
    expect(() => parseDays(['--days', '90', 'extra'])).toThrow(/Unexpected argument "extra"/);
  });

  it('cuts a long stray argument short before printing it', () => {
    let message = '';
    try {
      parseDays(['x'.repeat(500)]);
    } catch (e) {
      message = (e as Error).message;
    }
    expect(message.length).toBeLessThan(300);
  });
});
