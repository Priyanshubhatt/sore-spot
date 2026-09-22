export const DEFAULT_DAYS = 60;

const USAGE = 'Usage: npm run export-whoop -- --days 90   (the "--" before the flag is needed; --days is optional, 1 to 365, default 60)';

/**
 * Reads the command line. Only `--days N` is understood: anything else is an error, because npm swallows a flag typed
 * without `--` and leaves its value behind, which would otherwise quietly export the default 60 days.
 */
export function parseDays(argv: readonly string[]): number {
  let days = DEFAULT_DAYS;
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] !== '--days') throw new Error(`Unexpected argument "${argv[i].slice(0, 40)}". ${USAGE}`);
    const n = Number(argv[i + 1]);
    if (!Number.isInteger(n) || n < 1 || n > 365) throw new Error(`--days must be a whole number from 1 to 365. ${USAGE}`);
    days = n;
    i++;
  }
  return days;
}
